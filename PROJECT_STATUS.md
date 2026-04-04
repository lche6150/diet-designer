# Project Status

## Current State

The codebase is in a working state, but the AWS runtime is currently shut down.

- AWS infrastructure is not running right now
- The website is offline until the stack is recreated with `npm run aws:up`
- CI still runs automatically on pushes to `main`
- AWS deployment is now manual-only through GitHub Actions
- Local development can still run through Docker or workspace dev commands

Current deployment behavior:
- `CI` auto-runs on `main`
- `Deploy to AWS` only runs when started manually from GitHub Actions

Current AWS lifecycle modes:
- `npm run aws:pause` / `npm run aws:resume`
  Use for temporary stop/start while keeping infrastructure
- `npm run aws:down` / `npm run aws:up`
  Use for full shutdown and full recreation of the stack

Important effect of full shutdown:
- `npm run aws:down` destroys the current RDS instance
- Current database data is lost because Terraform uses `skip_final_snapshot = true`

## What Was Implemented

### 1. CI Pipeline

A GitHub Actions CI workflow is in place to validate the repo before deployment.

What it does:
- Checks Terraform formatting
- Runs Terraform validation
- Generates the Prisma client
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

### 2. Manual AWS Deployment Workflow

An AWS deployment workflow is implemented, but it is now manual-only.

What it does:
- Builds Docker images for API and web
- Pushes images to ECR
- Reads runtime and build configuration from AWS SSM
- Registers new ECS task definition revisions
- Deploys new revisions to ECS services

Main file:
- `.github/workflows/deploy.yml`

How to use:

1. Push code to `main` if needed
2. Open GitHub Actions
3. Open `Deploy to AWS`
4. Click `Run workflow`
5. Choose `main`

### 3. Terraform AWS Infrastructure

Terraform was set up for the full AWS stack.

Managed resources include:
- VPC and subnets
- Security groups
- ALB
- ECS cluster and services
- ECR repositories
- RDS PostgreSQL
- IAM roles and policies
- SSM parameters and parameter references
- S3 bucket for ALB access logs

Main directory:
- `infra/terraform/`

How to use:

```bash
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
terraform -chdir=infra/terraform output
```

### 4. AWS Lifecycle Scripts

The repo now includes scripts for stopping, resuming, destroying, and recreating the AWS environment.

What was added:
- `scripts/aws-pause.sh`
- `scripts/aws-resume.sh`
- `scripts/aws-down.sh`
- `scripts/aws-up.sh`

What they do:
- `aws:pause`
  Scales ECS services down and stops RDS, but keeps the infrastructure
- `aws:resume`
  Starts RDS, restores ECS desired counts, and waits for service recovery
- `aws:down`
  Fully destroys the stack
- `aws:up`
  Recreates the stack, builds and pushes images, then finishes Terraform apply

How to use:

```bash
npm run aws:pause
npm run aws:resume
npm run aws:down
npm run aws:up
```

### 5. Production Google Sign-In

Google sign-in was wired for the deployed frontend and backend.

What was addressed:
- Frontend Google Identity Services integration
- Backend Google token verification
- Production environment variable wiring
- Authorized JavaScript origin alignment in Google Cloud Console
- Popup compatibility header for the web app

Main files:
- `apps/web/src/components/google-auth-button.tsx`
- `apps/api/src/services/googleAuthService.ts`
- `apps/web/next.config.ts`

How to use:
- Add the correct origins in Google Cloud Console
- Deploy the app
- Use the Google sign-in button

### 6. Planner Access Control

The planner is now restricted to authenticated users.

What it does:
- Guests trying to access `/planner` are redirected to sign-in
- After sign-in, the user is returned to the planner
- Header navigation also respects the auth requirement

Main files:
- `apps/web/src/components/auth-required.tsx`
- `apps/web/src/app/planner/page.tsx`
- `apps/web/src/app/signin/page.tsx`
- `apps/web/src/app/signin/page-content.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/signup/page-content.tsx`
- `apps/web/src/lib/auth.ts`
- `apps/web/src/components/site-header.tsx`

### 7. Prisma / RDS Production Connection

The production database connection path was corrected so Prisma can connect reliably to RDS.

What was addressed:
- Generated `DATABASE_URL` handling for RDS
- Password encoding in the connection string
- SSL mode compatibility

Main file:
- `infra/terraform/rds.tf`

### 8. AWS-Native Request Logging

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

How to use when the stack is running:

```bash
terraform -chdir=infra/terraform output -raw alb_access_logs_bucket_name
```

### 9. ECS Exec for Private DB Access

ECS Exec was enabled on the API service so the private database can be inspected from inside the VPC.

What it provides:
- Shell access inside the running API container
- Database inspection through the same network path the API uses
- A reusable script for listing users or opening an interactive shell

Main files:
- `infra/terraform/ecs.tf`
- `infra/terraform/iam.tf`
- `scripts/ecs-api-db.sh`

How to use when the stack is running:

```bash
./scripts/ecs-api-db.sh shell
./scripts/ecs-api-db.sh users
./scripts/ecs-api-db.sh count
```

### 10. Ingredient Search Improvements

The ingredient search experience was cleaned up substantially.

What changed:
- Duplicate ingredient names from different brands are collapsed
- Generic USDA foods are preferred over branded packaged foods
- Brand names are no longer shown in the search result UI
- Upstream USDA request handling was fixed to avoid surfacing raw HTML errors
- Search results can be hidden and shown with a single animated toggle
- Selected ingredients are shown in a sticky side panel instead of below the result list

Main files:
- `apps/api/src/services/usdaService.ts`
- `apps/web/src/components/ingredient-search.tsx`

### 11. Planner UX Improvements

Planner interactions were improved so the page feels more directed and usable.

What changed:
- Step 1 `Continue` scrolls smoothly to step 2
- Step 2 is highlighted briefly after the scroll
- Search results expand and collapse with animation

Main file:
- `apps/web/src/app/planner/page.tsx`

### 12. Route and Navigation Fixes

Several frontend fixes were added to remove broken navigation and build issues.

What changed:
- Added a real `/recipes` page so header prefetching no longer hits a missing route
- Split sign-in and sign-up pages into Suspense-safe wrappers to satisfy Next.js build requirements

Main files:
- `apps/web/src/app/recipes/page.tsx`
- `apps/web/src/app/signin/page.tsx`
- `apps/web/src/app/signin/page-content.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/signup/page-content.tsx`

## What The Project Can Do Now

At the code level, the project currently supports:

- Next.js frontend and Express API in a monorepo
- Google sign-in
- Auth-gated planner access
- Nutrition target generation
- Ingredient search with cleaner generic-first results
- Meal-planning workflow
- Prisma with PostgreSQL
- Manual AWS deployment through GitHub Actions
- Full AWS shutdown and full AWS recreation through scripts
- Request logging through ALB access logs when AWS is running
- Private DB inspection through ECS Exec when AWS is running

## How To Operate The Project

### Run CI

```bash
git add .
git commit -m "Your change"
git push origin main
```

### Manually Deploy To AWS

1. Make sure the stack exists
2. Push code if needed
3. Open GitHub Actions
4. Open `Deploy to AWS`
5. Click `Run workflow`

If the stack was fully destroyed first:

```bash
npm run aws:up
```

### Fully Shut Down AWS

```bash
npm run aws:down
```

### Temporarily Pause AWS

```bash
npm run aws:pause
```

### Resume A Paused Stack

```bash
npm run aws:resume
```

### Run The App Locally

With Docker:

```bash
docker compose up --build
```

Without Docker:

```bash
npm run dev --workspace api
npm run dev --workspace web
```

## Current Status Summary

- AWS runtime is currently shut down
- No active deployed website is expected until `npm run aws:up`
- CI is active on pushes to `main`
- Deploy is manual-only
- Google sign-in flow is implemented
- Planner is login-protected
- Ingredient search and planner UX have been improved
- AWS lifecycle scripts are available for pause, resume, destroy, and recreate
- ECS Exec DB access is available when the stack is running

## Remaining Improvements

Recommended next improvements:

- Add HTTPS and a real domain to the ALB when AWS is running again
- Add Athena queries for easier ALB log analysis
- Tighten IAM policies toward least privilege
- Add automated tests for API and frontend
- Add backup and recovery documentation before using full destroy in a real environment
- Add a safer non-destructive low-cost environment mode if frequent stop/start is needed
