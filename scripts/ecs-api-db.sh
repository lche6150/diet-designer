#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
ECS_CLUSTER="${ECS_CLUSTER:-diet-designer-prod-cluster}"
ECS_SERVICE="${ECS_SERVICE:-diet-designer-prod-api}"
ECS_CONTAINER="${ECS_CONTAINER:-api}"

usage() {
  cat <<EOF
Usage:
  scripts/ecs-api-db.sh shell
  scripts/ecs-api-db.sh users
  scripts/ecs-api-db.sh count
  scripts/ecs-api-db.sh exec '<remote-shell-command>'

Environment overrides:
  AWS_REGION    Default: ${AWS_REGION}
  ECS_CLUSTER   Default: ${ECS_CLUSTER}
  ECS_SERVICE   Default: ${ECS_SERVICE}
  ECS_CONTAINER Default: ${ECS_CONTAINER}
EOF
}

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required." >&2
  exit 1
fi

if ! command -v session-manager-plugin >/dev/null 2>&1; then
  echo "session-manager-plugin is required for ecs execute-command." >&2
  exit 1
fi

MODE="${1:-users}"

if [[ "${MODE}" == "--help" || "${MODE}" == "-h" ]]; then
  usage
  exit 0
fi

TASK_ARN="$(aws ecs list-tasks \
  --cluster "${ECS_CLUSTER}" \
  --service-name "${ECS_SERVICE}" \
  --query 'taskArns[0]' \
  --output text \
  --region "${AWS_REGION}")"

if [[ -z "${TASK_ARN}" || "${TASK_ARN}" == "None" ]]; then
  echo "No running task found for service ${ECS_SERVICE} in cluster ${ECS_CLUSTER}." >&2
  exit 1
fi

case "${MODE}" in
  shell)
    REMOTE_COMMAND="/bin/sh"
    ;;
  users)
    REMOTE_COMMAND="$(cat <<'EOF'
/bin/sh -lc 'node -e '\''const prisma=require("./apps/api/dist/prisma/client").default; prisma.user.findMany({select:{id:true,email:true,name:true,googleId:true,createdAt:true},orderBy:{createdAt:"desc"}}).then(rows=>console.log(JSON.stringify(rows,null,2))).catch(err=>{console.error(err);process.exit(1)}).finally(()=>prisma.$disconnect())'\'''
EOF
)"
    ;;
  count)
    REMOTE_COMMAND="$(cat <<'EOF'
/bin/sh -lc 'node -e '\''const prisma=require("./apps/api/dist/prisma/client").default; prisma.user.count().then(count=>console.log(count)).catch(err=>{console.error(err);process.exit(1)}).finally(()=>prisma.$disconnect())'\'''
EOF
)"
    ;;
  exec)
    if [[ $# -lt 2 ]]; then
      echo "The exec mode requires a remote shell command." >&2
      usage
      exit 1
    fi
    REMOTE_COMMAND="/bin/sh -lc '$2'"
    ;;
  *)
    echo "Unknown mode: ${MODE}" >&2
    usage
    exit 1
    ;;
esac

echo "Connecting to ${TASK_ARN} (${ECS_CONTAINER}) in ${ECS_CLUSTER}..."

aws ecs execute-command \
  --cluster "${ECS_CLUSTER}" \
  --task "${TASK_ARN}" \
  --container "${ECS_CONTAINER}" \
  --interactive \
  --command "${REMOTE_COMMAND}" \
  --region "${AWS_REGION}"
