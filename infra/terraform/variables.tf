variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used as a prefix for all resources"
  type        = string
  default     = "diet-designer"
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
  default     = "prod"
}

# ── Database ────────────────────────────────────────────────────────────────

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "diet_designer"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

# ── ECS ─────────────────────────────────────────────────────────────────────

variable "api_cpu" {
  description = "CPU units for the API Fargate task (1 vCPU = 1024)"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Memory (MB) for the API Fargate task"
  type        = number
  default     = 512
}

variable "web_cpu" {
  description = "CPU units for the web Fargate task"
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Memory (MB) for the web Fargate task"
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 1
}

variable "web_desired_count" {
  description = "Desired number of web tasks"
  type        = number
  default     = 1
}
