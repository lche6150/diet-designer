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
  terraform -chdir="${TF_DIR}" output -raw "$1" 2>/dev/null || true
}

resource_in_state() {
  terraform -chdir="${TF_DIR}" state show "$1" >/dev/null 2>&1
}

empty_ecr_repository() {
  local repository_name="$1"

  if ! aws ecr describe-repositories \
    --repository-names "${repository_name}" \
    --region "${AWS_REGION}" \
    >/dev/null 2>&1; then
    return 0
  fi

  echo "Emptying ECR repository: ${repository_name}"

  while true; do
    local image_ids
    image_ids="$(
      aws ecr list-images \
        --repository-name "${repository_name}" \
        --region "${AWS_REGION}" \
        --query 'imageIds' \
        --output json
    )"

    if [[ "${image_ids}" == "[]" ]]; then
      break
    fi

    aws ecr batch-delete-image \
      --repository-name "${repository_name}" \
      --region "${AWS_REGION}" \
      --image-ids "${image_ids}" \
      >/dev/null
  done
}

empty_versioned_bucket() {
  local bucket_name="$1"

  if [[ -z "${bucket_name}" ]]; then
    return 0
  fi

  if ! aws s3api head-bucket --bucket "${bucket_name}" >/dev/null 2>&1; then
    return 0
  fi

  echo "Emptying S3 bucket: ${bucket_name}"

  python3 - "${bucket_name}" "${AWS_REGION}" <<'PY'
import json
import subprocess
import sys

bucket = sys.argv[1]
region = sys.argv[2]

def run_json(args):
    raw = subprocess.check_output(
        ["aws", *args, "--region", region, "--output", "json"],
        text=True,
    ).strip()
    if not raw or raw == "None":
        return {}
    return json.loads(raw)

def delete_version(key, version_id):
    subprocess.check_call(
        [
            "aws",
            "s3api",
            "delete-object",
            "--bucket",
            bucket,
            "--key",
            key,
            "--version-id",
            version_id,
            "--region",
            region,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

key_marker = None
version_id_marker = None

while True:
    cmd = ["s3api", "list-object-versions", "--bucket", bucket]
    if key_marker:
        cmd.extend(["--key-marker", key_marker])
    if version_id_marker:
        cmd.extend(["--version-id-marker", version_id_marker])

    payload = run_json(cmd)

    if not payload:
        break

    items = []
    for version in payload.get("Versions", []):
        items.append((version["Key"], version["VersionId"]))
    for marker in payload.get("DeleteMarkers", []):
        items.append((marker["Key"], marker["VersionId"]))

    for key, version_id in items:
        delete_version(key, version_id)

    if not payload.get("IsTruncated"):
        break

    key_marker = payload.get("NextKeyMarker")
    version_id_marker = payload.get("NextVersionIdMarker")
PY
}

destroy_alb_first() {
  local -a alb_resources=(
    aws_lb_listener_rule.api
    aws_lb_listener.http
    aws_lb_target_group.api
    aws_lb_target_group.web
    aws_ssm_parameter.api_base_url
    aws_lb.main
  )
  local -a target_args=()

  for resource in "${alb_resources[@]}"; do
    if resource_in_state "${resource}"; then
      target_args+=("-target=${resource}")
    fi
  done

  if [[ ${#target_args[@]} -eq 0 ]]; then
    return 0
  fi

  echo "Destroying ALB resources first to stop new log delivery..."
  terraform -chdir="${TF_DIR}" destroy -auto-approve -input=false "${target_args[@]}" || true
}

destroy_full_stack() {
  local max_attempts=3
  local attempt

  for attempt in $(seq 1 "${max_attempts}"); do
    echo "Destroy attempt ${attempt}/${max_attempts}..."

    empty_ecr_repository "${PROJECT_NAME}/api"
    empty_ecr_repository "${PROJECT_NAME}/web"
    empty_versioned_bucket "${ALB_LOGS_BUCKET}"

    if terraform -chdir="${TF_DIR}" destroy -auto-approve -input=false; then
      return 0
    fi

    if [[ "${attempt}" -eq "${max_attempts}" ]]; then
      return 1
    fi

    echo "Destroy did not complete. Waiting before retrying bucket cleanup..."
    sleep 20
  done

  return 1
}

require_command terraform
require_command aws
require_command python3

if [[ ! -f "${TF_DIR}/terraform.tfstate" ]]; then
  echo "No Terraform state found in ${TF_DIR}. Nothing to destroy."
  exit 0
fi

AWS_REGION="${AWS_REGION:-$(read_tfvar_value aws_region || true)}"
AWS_REGION="${AWS_REGION:-$(aws configure get region || true)}"
AWS_REGION="${AWS_REGION:-ap-southeast-2}"
PROJECT_NAME="${PROJECT_NAME:-$(read_tfvar_value project_name || true)}"
PROJECT_NAME="${PROJECT_NAME:-diet-designer}"
ENVIRONMENT="${ENVIRONMENT:-$(read_tfvar_value environment || true)}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ALB_LOGS_BUCKET="${PROJECT_NAME}-${ENVIRONMENT}-alb-logs-${ACCOUNT_ID}"

cat <<'EOF'
This will fully destroy the AWS deployment managed by Terraform.

Effects:
- ECS services, ALB, NAT Gateway, ECR repositories, and RDS will be destroyed
- The current PostgreSQL data will be lost
- The next cold start will create a new ALB URL and a fresh database

Type DESTROY to continue:
EOF

read -r CONFIRM

if [[ "${CONFIRM}" != "DESTROY" ]]; then
  echo "Aborted."
  exit 1
fi

terraform -chdir="${TF_DIR}" init -input=false >/dev/null

destroy_alb_first
sleep 20
empty_versioned_bucket "${ALB_LOGS_BUCKET}"

destroy_full_stack

echo
echo "AWS deployment fully destroyed."
echo "Run ./scripts/aws-up.sh or npm run aws:up to recreate it."
