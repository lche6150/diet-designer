output "alb_url" {
  description = "Public URL of the application (use this in your browser)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_api_url" {
  description = "ECR repository URL for the API image"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_url" {
  description = "ECR repository URL for the web image"
  value       = aws_ecr_repository.web.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (private; only reachable from within the VPC)"
  value       = aws_db_instance.main.address
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_api_service_name" {
  description = "ECS API service name"
  value       = aws_ecs_service.api.name
}

output "ecs_web_service_name" {
  description = "ECS web service name"
  value       = aws_ecs_service.web.name
}

output "ssm_database_url_path" {
  description = "SSM parameter path for DATABASE_URL (SecureString)"
  value       = aws_ssm_parameter.database_url.name
}

output "alb_access_logs_bucket_name" {
  description = "S3 bucket that stores ALB access logs"
  value       = aws_s3_bucket.alb_logs.bucket
}
