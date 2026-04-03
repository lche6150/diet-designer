# Deployment Guide

This project runs on **AWS ECS Fargate** with a **PostgreSQL RDS** database.
Infrastructure is managed with **Terraform**; deploys happen via **GitHub Actions**.

---

## Architecture Overview

```
Internet
   │
   ▼
Application Load Balancer  (port 80)
   │
   ├─ /api/*  →  API service  (Fargate, port 4000)
   │               └─ RDS PostgreSQL  (private subnet)
   │
   └─ /*      →  Web service  (Fargate, port 3000)
```

Both services run in **private subnets**; only the ALB is public-facing.
`NEXT_PUBLIC_API_BASE_URL` is the ALB URL — `/api/*` requests are routed to the
API by the load balancer, so there are no cross-origin issues.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| AWS CLI | v2 | https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html |
| Terraform | ≥ 1.5 | https://developer.hashicorp.com/terraform/install |
| Docker | any | https://docs.docker.com/get-docker/ |
| GitHub CLI (`gh`) | any | https://cli.github.com |

---

## One-Time Setup

### Step 1 — AWS credentials

```bash
aws configure
# Enter your Access Key ID, Secret Access Key, and region (e.g. us-east-1)
```

Create a deployment IAM user (or role) with the following managed policies attached:
- `AmazonECS_FullAccess`
- `AmazonEC2ContainerRegistryFullAccess`
- `AmazonRDSFullAccess`
- `AmazonVPCFullAccess`
- `AmazonSSMFullAccess`
- `ElasticLoadBalancingFullAccess`
- `IAMFullAccess`
- `CloudWatchLogsFullAccess`

> For production, scope these down to least-privilege policies.

---

### Step 2 — Bootstrap a Terraform state backend (optional but recommended)

Local state is fine to start, but for team use create an S3 bucket + DynamoDB table:

```bash
# Replace <ACCOUNT_ID> with your 12-digit AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
BUCKET="diet-designer-tf-state-${ACCOUNT_ID}"

# Create S3 bucket
aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name diet-designer-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"
```

Then uncomment the `backend "s3"` block in `infra/terraform/main.tf` and fill
in the bucket name.

---

### Step 3 — Configure Terraform variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars for region, sizing, and naming
```

Before `terraform apply`, create these SSM parameters in AWS Parameter Store:
- `/${project_name}/${environment}/GOOGLE_CLIENT_ID`
- `/${project_name}/${environment}/JWT_SECRET`
- `/${project_name}/${environment}/SPOONACULAR_API_KEY`
- `/${project_name}/${environment}/USDA_API_KEY`

The repo expects those parameters to exist already; Terraform references them
from ECS task definitions and the deploy workflow reads `GOOGLE_CLIENT_ID`
directly from SSM during the web image build.

---

### Step 4 — Apply Terraform

```bash
cd infra/terraform
terraform init
terraform plan   # review what will be created
terraform apply  # type "yes" to confirm (~5 min for RDS to come up)
```

Note the outputs — especially **`alb_url`** and the ECR URLs.

---

### Step 5 — Create the GitHub repository and push

```bash
# From the project root
git init
git add .
git commit -m "Initial commit"

gh repo create diet-designer --private --source=. --remote=origin --push
```

---

### Step 6 — Add GitHub Actions secrets

Go to **GitHub → your repo → Settings → Secrets and variables → Actions** and
add the following repository secrets:

| Secret name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret access key |
| `AWS_REGION` | e.g. `us-east-1` |

> The deploy workflow reads `API_BASE_URL` and decrypts `GOOGLE_CLIENT_ID` from SSM
> during CI/CD, so they do not need to be duplicated in GitHub secrets.

---

### Step 7 — First deploy

Push any change to `main` (or re-run the workflow manually in the GitHub UI)
to trigger the CI/CD pipeline. The pipeline will:

1. Build the API Docker image and push it to ECR.
2. Read the ALB URL and Google client ID from SSM, bake them into the Next.js bundle, and push the web image.
3. Register new ECS task definition revisions with the new image tags.
4. Perform a rolling deploy of both services.

After the pipeline finishes (~5–8 min), your app is live at the **`alb_url`**
printed by `terraform output`.

---

## Day-to-Day Development

### Deploy a change

Just push to `main`:

```bash
git add .
git commit -m "Your change"
git push origin main
```

GitHub Actions handles the rest.

### Run database migrations

Migrations run automatically when the API container starts:
```
CMD npx prisma migrate deploy && npm run start
```

For manual migration (from your machine with VPN or bastion access):
```bash
DATABASE_URL="$(aws ssm get-parameter \
  --name /diet-designer/prod/DATABASE_URL \
  --with-decryption --query Parameter.Value --output text)" \
npx prisma migrate deploy
```

### View logs

```bash
# Tail API logs
aws logs tail /ecs/diet-designer-prod/api --follow

# Tail Web logs
aws logs tail /ecs/diet-designer-prod/web --follow
```

### Scale services

```bash
# Scale API to 2 tasks
aws ecs update-service \
  --cluster diet-designer-prod-cluster \
  --service diet-designer-prod-api \
  --desired-count 2
```

Or update `api_desired_count` in `terraform.tfvars` and re-apply.

---

## Cost Estimate (us-east-1, single AZ)

| Resource | ~$/month |
|---|---|
| Fargate (api, 0.25 vCPU / 0.5 GB, ~720 h) | ~$6 |
| Fargate (web, 0.25 vCPU / 0.5 GB, ~720 h) | ~$6 |
| RDS db.t3.micro (PostgreSQL) | ~$15 |
| NAT Gateway | ~$35 |
| ALB | ~$18 |
| **Total** | **~$80/month** |

> The NAT gateway is the biggest cost. For dev/staging you can remove it and
> assign public IPs to tasks (`assign_public_ip = true` in `ecs.tf`) to save ~$35/month.

---

## Before Going to Production

- [ ] Enable `deletion_protection = true` on the RDS instance
- [ ] Enable `enable_deletion_protection = true` on the ALB
- [ ] Set `skip_final_snapshot = false` on RDS
- [ ] Set `multi_az = true` on RDS for high availability
- [ ] Add a second NAT gateway (one per AZ) for HA
- [ ] Add HTTPS: provision an ACM certificate and add a port-443 listener to the ALB
- [ ] Scope down the IAM deploy user to least-privilege policies
- [ ] Set up CloudWatch alarms for ECS task failures and RDS storage
