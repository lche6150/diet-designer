# ── Application Load Balancer ─────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb"
    enabled = true
  }

  enable_deletion_protection = false # set to true before going fully live

  depends_on = [
    aws_s3_bucket_policy.alb_logs,
    aws_s3_bucket_public_access_block.alb_logs,
    aws_s3_bucket_server_side_encryption_configuration.alb_logs,
    aws_s3_bucket_versioning.alb_logs,
    aws_s3_bucket_lifecycle_configuration.alb_logs,
  ]

  tags = { Name = "${local.name}-alb" }
}

# ── Target Groups ─────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-api-tg"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # required for Fargate

  health_check {
    path                = "/health"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${local.name}-api-tg" }
}

resource "aws_lb_target_group" "web" {
  name        = "${local.name}-web-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200,307,308" # Next.js may redirect / to /dashboard etc.
  }

  tags = { Name = "${local.name}-web-tg" }
}

# ── HTTP Listener (port 80) with path-based routing ──────────────────────────
#
# Traffic flow:
#   /api/*  →  API service  (port 4000)
#   /*      →  Web service  (port 3000)   ← default
#
# This means NEXT_PUBLIC_API_BASE_URL can be the same ALB URL (no port suffix).

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default action: forward to web
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# ── Store the public base URL in SSM so CI/CD can read it ────────────────────

resource "aws_ssm_parameter" "api_base_url" {
  name  = "/${var.project_name}/${var.environment}/API_BASE_URL"
  type  = "String"
  value = "http://${aws_lb.main.dns_name}"

  tags = { Name = "${local.name}-api-base-url" }
}
