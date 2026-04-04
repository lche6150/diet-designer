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

API_DESIRED_COUNT="${API_DESIRED_COUNT:-$(read_tfvar_value api_desired_count || true)}"
WEB_DESIRED_COUNT="${WEB_DESIRED_COUNT:-$(read_tfvar_value web_desired_count || true)}"
API_DESIRED_COUNT="${API_DESIRED_COUNT:-1}"
WEB_DESIRED_COUNT="${WEB_DESIRED_COUNT:-1}"

CLUSTER_NAME="$(terraform_output ecs_cluster_name)"
API_SERVICE_NAME="$(terraform_output ecs_api_service_name)"
WEB_SERVICE_NAME="$(terraform_output ecs_web_service_name)"
ALB_URL="$(terraform_output alb_url)"
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

DB_STATUS="$(
  aws rds describe-db-instances \
    --db-instance-identifier "${DB_IDENTIFIER}" \
    --region "${AWS_REGION}" \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text
)"

case "${DB_STATUS}" in
  available)
    echo "RDS is already available: ${DB_IDENTIFIER}"
    ;;
  stopped)
    echo "Starting RDS: ${DB_IDENTIFIER}"
    aws rds start-db-instance \
      --db-instance-identifier "${DB_IDENTIFIER}" \
      --region "${AWS_REGION}" \
      >/dev/null
    echo "Waiting for RDS to become available..."
    aws rds wait db-instance-available \
      --db-instance-identifier "${DB_IDENTIFIER}" \
      --region "${AWS_REGION}"
    ;;
  starting | backing-up | modifying | configuring-enhanced-monitoring)
    echo "RDS is currently ${DB_STATUS}. Waiting for availability..."
    aws rds wait db-instance-available \
      --db-instance-identifier "${DB_IDENTIFIER}" \
      --region "${AWS_REGION}"
    ;;
  *)
    echo "RDS is in an unsupported state for resume: ${DB_STATUS}" >&2
    exit 1
    ;;
esac

echo "Scaling ECS services back up..."
aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${API_SERVICE_NAME}" \
  --desired-count "${API_DESIRED_COUNT}" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  >/dev/null

aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${WEB_SERVICE_NAME}" \
  --desired-count "${WEB_DESIRED_COUNT}" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  >/dev/null

echo "Waiting for ECS services to stabilize..."
aws ecs wait services-stable \
  --cluster "${CLUSTER_NAME}" \
  --services "${API_SERVICE_NAME}" "${WEB_SERVICE_NAME}" \
  --region "${AWS_REGION}"

cat <<EOF

AWS service is back online.

Region: ${AWS_REGION}
Cluster: ${CLUSTER_NAME}
API service: ${API_SERVICE_NAME} (${API_DESIRED_COUNT})
Web service: ${WEB_SERVICE_NAME} (${WEB_DESIRED_COUNT})
URL: ${ALB_URL}
EOF
