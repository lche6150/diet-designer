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
require_command docker

AWS_REGION="${AWS_REGION:-$(read_tfvar_value aws_region || true)}"
AWS_REGION="${AWS_REGION:-$(aws configure get region || true)}"
AWS_REGION="${AWS_REGION:-ap-southeast-2}"
PROJECT_NAME="${PROJECT_NAME:-$(read_tfvar_value project_name || true)}"
PROJECT_NAME="${PROJECT_NAME:-diet-designer}"
ENVIRONMENT="${ENVIRONMENT:-$(read_tfvar_value environment || true)}"
ENVIRONMENT="${ENVIRONMENT:-prod}"

PHASE1_TARGETS=(
  random_password.db
  aws_vpc.main
  aws_internet_gateway.main
  aws_subnet.public
  aws_subnet.private
  aws_eip.nat
  aws_nat_gateway.main
  aws_route_table.public
  aws_route_table_association.public
  aws_route_table.private
  aws_route_table_association.private
  aws_security_group.alb
  aws_security_group.api
  aws_security_group.web
  aws_security_group.rds
  aws_s3_bucket.alb_logs
  aws_s3_bucket_public_access_block.alb_logs
  aws_s3_bucket_server_side_encryption_configuration.alb_logs
  aws_s3_bucket_versioning.alb_logs
  aws_s3_bucket_lifecycle_configuration.alb_logs
  aws_s3_bucket_policy.alb_logs
  aws_lb.main
  aws_lb_target_group.api
  aws_lb_target_group.web
  aws_lb_listener.http
  aws_lb_listener_rule.api
  aws_ssm_parameter.api_base_url
  aws_ecr_repository.api
  aws_ecr_repository.web
  aws_ecr_lifecycle_policy.api
  aws_ecr_lifecycle_policy.web
  aws_db_subnet_group.main
  aws_db_instance.main
  aws_ssm_parameter.database_url
  aws_cloudwatch_log_group.api
  aws_cloudwatch_log_group.web
  aws_iam_role.ecs_execution
  aws_iam_role_policy_attachment.ecs_execution_managed
  aws_iam_role_policy.ecs_execution_ssm
  aws_iam_role.ecs_task
  aws_iam_role_policy.ecs_task_exec
  aws_ecs_cluster.main
  aws_ecs_cluster_capacity_providers.main
  aws_ecs_task_definition.api
  aws_ecs_task_definition.web
)

terraform -chdir="${TF_DIR}" init -input=false >/dev/null

echo "Phase 1: creating shared AWS infrastructure and ECR repositories..."
TARGET_ARGS=()
for target in "${PHASE1_TARGETS[@]}"; do
  TARGET_ARGS+=("-target=${target}")
done

terraform -chdir="${TF_DIR}" apply -auto-approve -input=false "${TARGET_ARGS[@]}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_API_URL="$(terraform_output ecr_api_url)"
ECR_WEB_URL="$(terraform_output ecr_web_url)"
ALB_URL="$(terraform_output alb_url)"

GOOGLE_CLIENT_ID="$(
  aws ssm get-parameter \
    --name "/${PROJECT_NAME}/${ENVIRONMENT}/GOOGLE_CLIENT_ID" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text \
    --region "${AWS_REGION}"
)"

echo "Logging in to Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}" >/dev/null

echo "Building and pushing API image..."
docker build \
  -f "${REPO_ROOT}/apps/api/Dockerfile" \
  -t "${ECR_API_URL}:latest" \
  "${REPO_ROOT}"
docker push "${ECR_API_URL}:latest"

echo "Building and pushing Web image..."
docker build \
  -f "${REPO_ROOT}/apps/web/Dockerfile" \
  --build-arg NEXT_PUBLIC_API_BASE_URL="${ALB_URL}" \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
  -t "${ECR_WEB_URL}:latest" \
  "${REPO_ROOT}"
docker push "${ECR_WEB_URL}:latest"

echo "Phase 2: finishing full Terraform apply..."
terraform -chdir="${TF_DIR}" apply -auto-approve -input=false

CLUSTER_NAME="$(terraform_output ecs_cluster_name)"
API_SERVICE_NAME="$(terraform_output ecs_api_service_name)"
WEB_SERVICE_NAME="$(terraform_output ecs_web_service_name)"

echo "Waiting for ECS services to stabilize..."
aws ecs wait services-stable \
  --cluster "${CLUSTER_NAME}" \
  --services "${API_SERVICE_NAME}" "${WEB_SERVICE_NAME}" \
  --region "${AWS_REGION}"

cat <<EOF

AWS cold start complete.

Region: ${AWS_REGION}
Cluster: ${CLUSTER_NAME}
API service: ${API_SERVICE_NAME}
Web service: ${WEB_SERVICE_NAME}
URL: ${ALB_URL}

Notes:
- The web image was rebuilt against the new ALB URL.
- The database is a fresh instance if you previously destroyed the stack.
EOF
