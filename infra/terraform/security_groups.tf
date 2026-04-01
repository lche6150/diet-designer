# ── ALB Security Group ────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "Allow HTTP from the internet to the ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-alb-sg" }
}

# ── API ECS Task Security Group ───────────────────────────────────────────────

resource "aws_security_group" "api" {
  name        = "${local.name}-api-sg"
  description = "Allow traffic from ALB to the API tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "API port from ALB"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound (DB access, external calls)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-api-sg" }
}

# ── Web ECS Task Security Group ───────────────────────────────────────────────

resource "aws_security_group" "web" {
  name        = "${local.name}-web-sg"
  description = "Allow traffic from ALB to the web tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Web port from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound (ALB for API calls, external)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-web-sg" }
}

# ── RDS Security Group ────────────────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "Allow PostgreSQL access from API tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from API tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-rds-sg" }
}
