output "deployment" {
  value = {
    lab_id             = var.lab_id
    name               = local.name
    region             = var.region
    account_id         = data.aws_caller_identity.current.account_id
    cluster            = aws_ecs_cluster.main.name
    service            = aws_ecs_service.api.name
    ops_task           = aws_ecs_task_definition.ops.arn
    api_task           = aws_ecs_task_definition.api.arn
    subnets            = aws_subnet.public[*].id
    security_group     = aws_security_group.api.id
    api_origin         = "https://${local.api_domain}"
    repository_url     = aws_ecr_repository.api.repository_url
    repository_name    = aws_ecr_repository.api.name
    runtime_secret_arn = aws_secretsmanager_secret.runtime.arn
    database_id        = aws_db_instance.main.id
    log_group          = aws_cloudwatch_log_group.api.name
    web = {
      for k, d in aws_cloudfront_distribution.static : k => {
        url             = "https://${local.web_domains[k]}"
        bucket          = aws_s3_bucket.data[k].id
        distribution_id = d.id
      }
    }
    dns_records = {
      app   = aws_cloudfront_distribution.static["web"].domain_name
      admin = aws_cloudfront_distribution.static["admin"].domain_name
      api   = aws_cloudfront_distribution.api.domain_name
    }
    cleanup = {
      vpc_id            = aws_vpc.main.id
      buckets           = [for b in aws_s3_bucket.data : b.id]
      api_distribution  = aws_cloudfront_distribution.api.id
      vpc_origin_id     = aws_cloudfront_vpc_origin.api.id
      master_secret_arn = aws_db_instance.main.master_user_secret[0].secret_arn
    }
  }
  precondition {
    condition     = data.aws_caller_identity.current.account_id == var.expected_account_id
    error_message = "AWS account differs from the explicitly selected lab account."
  }
}
