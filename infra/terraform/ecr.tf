# ── ECR Repositories ──────────────────────────────────────────────────────────

resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}/api"
  force_delete         = true
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.name}-api-ecr" }
}

resource "aws_ecr_repository" "web" {
  name                 = "${var.project_name}/web"
  force_delete         = true
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.name}-web-ecr" }
}

# ── Lifecycle Policies (keep only the 10 most recent images) ──────────────────

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
