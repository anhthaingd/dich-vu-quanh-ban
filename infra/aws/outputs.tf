output "deployment" {

  value = {

    region             = var.region, account_id = data.aws_caller_identity.current.account_id,
    cluster            = aws_ecs_cluster.main.name, service = aws_ecs_service.api.name,
    ops_task           = aws_ecs_task_definition.ops.arn,
    subnets            = aws_subnet.public[*].id, security_group = aws_security_group.api.id,
    api_origin         = "https://${var.api_domain}", repository_url = aws_ecr_repository.api.repository_url,
    repository_name    = aws_ecr_repository.api.name,
    runtime_secret_arn = aws_secretsmanager_secret.runtime.arn,
    database_id        = aws_db_instance.main.id,
    web = {
      for k, d in aws_cloudfront_distribution.static : k => {
        url = "https://${d.domain_name}", bucket = aws_s3_bucket.data[k].id, distribution_id = d.id
      }
    },
    build_role_arn = try(aws_iam_role.release[0].arn, null),
    log_group      = aws_cloudwatch_log_group.api.name

  }

}
