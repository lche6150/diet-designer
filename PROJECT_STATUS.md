# Project Status

## Current State

The project is deployed and operational on AWS.

- App URL: `http://diet-designer-prod-alb-1451946939.ap-southeast-2.elb.amazonaws.com`
- ECS cluster: `diet-designer-prod-cluster`
- API service: `diet-designer-prod-api`
- Web service: `diet-designer-prod-web`
- API ECR: `206749730536.dkr.ecr.ap-southeast-2.amazonaws.com/diet-designer/api`
- Web ECR: `206749730536.dkr.ecr.ap-southeast-2.amazonaws.com/diet-designer/web`
- RDS endpoint: `diet-designer-prod-postgres.czqsa2qw6oic.ap-southeast-2.rds.amazonaws.com`
- ALB access log bucket: `diet-designer-prod-alb-logs-206749730536`

The Git worktree was clean when this report was generated.

## What Was Implemented

### 1. CI Pipeline

A GitHub Actions CI workflow was implemented to validate infrastructure and application builds before deployment.

What it does:
- Checks Terraform formatting
- Runs Terraform validation
- Builds the API
- Lints the frontend
- Builds the frontend

Main file:
- `.github/workflows/ci.yml`

How to use:

```bash
git push origin main
```

Then review the `CI` workflow in GitHub Actions.

### 2. CD / AWS Deployment Pipeline

A GitHub Actions deployment workflow was implemented for AWS ECS deployment.

What it does:
- Builds Docker images for API and web
- Pushes images to ECR
- Reads runtime/build config from AWS SSM
- Registers new ECS task definition revisions
- Deploys new revisions to ECS services

Main file:
- `.github/workflows/deploy.yml`

How to use:

```bash
git push origin main
```

Or run `Deploy to AWS` manually in GitHub Actions.

### 3. Terraform Infrastructure

Terraform infrastructure was set up and applied successfully.

Provisioned resources include:
- VPC and subnets
- Security groups
- ALB
- ECS cluster and services
- ECR repositories
- RDS PostgreSQL
- IAM roles/policies
- SSM parameters
- S3 bucket for ALB access logs

Main directory:
- `infra/terraform/`

How to use:

```bash
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
terraform -chdir=infra/terraform output
```

### 4. Production Google Sign-In

Google sign-in was configured and made to work in production.

What was addressed:
- Frontend Google Identity Services integration
- Backend Google token verification
- Production environment variable wiring
- Authorized JavaScript origin alignment in Google Cloud Console

Main files:
- `apps/web/src/components/google-auth-button.tsx`
- `apps/api/src/services/googleAuthService.ts`

How to use:
- Open the deployed app
- Use the Google sign-in button
- Ensure the deployed site origin is added to the Google OAuth client

### 5. Prisma / RDS Production Connection

The production database connection path was corrected so Prisma can connect reliably to RDS.

What was addressed:
- Generated `DATABASE_URL` handling for RDS
- Password encoding in the connection string
- SSL mode compatibility

Main file:
- `infra/terraform/rds.tf`

How to use:
- Re-apply Terraform after DB connection changes
- Force API redeploy if ECS needs to reload the updated secret

Example:

```bash
aws ecs update-service \
  --cluster diet-designer-prod-cluster \
  --service diet-designer-prod-api \
  --force-new-deployment \
  --region ap-southeast-2
```

### 6. AWS-Native Request Logging

Application Load Balancer access logging was enabled and routed to S3.

What it provides:
- Request timestamps
- Client IPs
- Request paths
- Status codes
- User agents

Main files:
- `infra/terraform/alb_logs.tf`
- `infra/terraform/alb.tf`
- `infra/terraform/outputs.tf`

How to use:

```bash
terraform -chdir=infra/terraform output -raw alb_access_logs_bucket_name
```

List log objects:

```bash
aws s3 ls "s3://diet-designer-prod-alb-logs-206749730536/alb/AWSLogs/206749730536/elasticloadbalancing/ap-southeast-2/" \
  --recursive \
  --region ap-southeast-2
```

Inspect one log file:

```bash
aws s3 cp "s3://FULL_LOG_PATH.log.gz" - --region ap-southeast-2 | gunzip -c
```

## What The Project Can Do Now

The current deployed project can:

- Serve a live Next.js frontend on AWS ECS/Fargate
- Serve an Express API on AWS ECS/Fargate
- Use PostgreSQL on AWS RDS via Prisma
- Authenticate users with Google sign-in
- Persist authenticated user data
- Generate nutrition targets
- Search ingredients
- Generate meal plans
- Build and deploy automatically from GitHub Actions
- Store runtime configuration and secrets in SSM
- Record request history through ALB access logs in S3

## How To Operate The Project

### Deploy a Code Change

```bash
git add .
git commit -m "Your change"
git push origin main
```

### Check Deployment Status

```bash
aws ecs describe-services \
  --cluster diet-designer-prod-cluster \
  --services diet-designer-prod-api diet-designer-prod-web \
  --region ap-southeast-2
```

Also review GitHub Actions for:
- `CI`
- `Deploy to AWS`

### Check Application Logs

```bash
aws logs tail /ecs/diet-designer-prod/api --follow --region ap-southeast-2
aws logs tail /ecs/diet-designer-prod/web --follow --region ap-southeast-2
```

### Check Visit / Request History

Visit history is currently available as raw ALB request logs in S3.

Notes:
- This is request-level logging, not session analytics
- One page load may create multiple log entries
- Logs are written with a delay, not instantly

## Current Status Summary

- Infrastructure deployed successfully
- Website live and accessible
- Google sign-in working
- Database connection working
- CI/CD working
- ALB access logs writing to S3
- Repository state aligned with deployed infrastructure

## Recent Relevant Commits

- `06a9331` Add ALB access logging
- `ddd96b1` Fix Linux CI dependency install
- `87f8f63` Set up AWS deploy and CI/CD
- `9a54623` ci: run prisma generate before api build

## Remaining Improvements

Recommended next improvements:

- Add HTTPS and a real domain to the ALB
- Add Athena queries for easier access-log analysis
- Tighten IAM policies toward least privilege
- Add automated tests for API and frontend
- Improve frontend metadata/title/description
- Add backup/operational documentation for production
