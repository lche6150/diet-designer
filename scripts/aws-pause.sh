#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TF_DIR="${REPO_ROOT}/infra/terraform"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

read_tfvar_value() {
  local key="$1"

  if [[ ! -f "${TF_DIR}/terraform.tfvars" ]]; then
    return 1
  fi

  awk -F= -v key="${key}" '
    $1 ~ "^[[:space:]]*" key "[[:space:]]*$" {
      value = $2
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      gsub(/^"/, "", value)
      gsub(/"$/, "", value)
      print value
      exit
    }
  ' "${TF_DIR}/terraform.tfvars"
}

terraform_output() {
  terraform -chdir="${TF_DIR}" output -raw "$1"
}

require_command aws
require_command terraform

AWS_REGION="${AWS_REGION:-$(read_tfvar_value aws_region || true)}"
AWS_REGION="${AWS_REGION:-$(aws configure get region || true)}"
AWS_REGION="${AWS_REGION:-ap-southeast-2}"

CLUSTER_NAME="$(terraform_output ecs_cluster_name)"
API_SERVICE_NAME="$(terraform_output ecs_api_service_name)"
WEB_SERVICE_NAME="$(terraform_output ecs_web_service_name)"
RDS_ENDPOINT="$(terraform_output rds_endpoint)"

DB_IDENTIFIER="$(
  aws rds describe-db-instances \
    --region "${AWS_REGION}" \
    --query "DBInstances[?Endpoint.Address=='${RDS_ENDPOINT}'].DBInstanceIdentifier | [0]" \
    --output text
)"

if [[ -z "${DB_IDENTIFIER}" || "${DB_IDENTIFIER}" == "None" ]]; then
  echo "Could not resolve the RDS instance identifier from endpoint ${RDS_ENDPOINT}" >&2
  exit 1
fi

echo "Scaling ECS services down to zero..."
aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${API_SERVICE_NAME}" \
  --desired-count 0 \
  --region "${AWS_REGION}" \
  >/dev/null

aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${WEB_SERVICE_NAME}" \
  --desired-count 0 \
  --region "${AWS_REGION}" \
  >/dev/null

echo "Waiting for ECS services to stabilize..."
aws ecs wait services-stable \
  --cluster "${CLUSTER_NAME}" \
  --services "${API_SERVICE_NAME}" "${WEB_SERVICE_NAME}" \
  --region "${AWS_REGION}"

DB_STATUS="$(
  aws rds describe-db-instances \
    --db-instance-identifier "${DB_IDENTIFIER}" \
    --region "${AWS_REGION}" \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text
)"

case "${DB_STATUS}" in
  available)
    echo "Stopping RDS: ${DB_IDENTIFIER}"
    aws rds stop-db-instance \
      --db-instance-identifier "${DB_IDENTIFIER}" \
      --region "${AWS_REGION}" \
      >/dev/null
    ;;
  stopped)
    echo "RDS is already stopped: ${DB_IDENTIFIER}"
    ;;
  stopping)
    echo "RDS is already stopping: ${DB_IDENTIFIER}"
    ;;
  *)
    echo "RDS is in state ${DB_STATUS}; leaving it unchanged."
    ;;
esac

cat <<EOF

AWS service is paused.

Region: ${AWS_REGION}
Cluster: ${CLUSTER_NAME}
API service: ${API_SERVICE_NAME} (0)
Web service: ${WEB_SERVICE_NAME} (0)
RDS: ${DB_IDENTIFIER}

Important:
- This is a pause, not a full destroy.
- ALB, NAT Gateway, public IPv4, and other always-on infrastructure still cost money.
- RDS will auto-start again after up to 7 days if left stopped.
- Run ./scripts/aws-resume.sh to bring the website back online.
EOF
