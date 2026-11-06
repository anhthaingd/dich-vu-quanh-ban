locals {

  task_trust = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Principal = {
        Service = "ecs-tasks.amazonaws.com"
        }, Action = "sts:AssumeRole", Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }, ArnLike = {
          "aws:SourceArn" = "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:*"
        }
      }
    }]
  })
  runtime_keys = ["DATABASE_URL", "AUTH_SECRET", "CURSOR_SECRET", "MESSAGE_SECRET", "ADMIN_SECRET", "GEOAPIFY_API_KEY"]
  api_environment = {

    NODE_ENV         = "production", CLOUD_PILOT = "1", HOST = "0.0.0.0", PORT = "3100",
    DATABASE_CA_FILE = "/app/rds-ca.pem", PUBLIC_API_ORIGIN = "https://${var.api_domain}",
    CORS_ORIGIN      = join(",", [for d in aws_cloudfront_distribution.static : "https://${d.domain_name}"]),
    PILOT_EMAILS     = join(",", var.pilot_emails), ASSET_BUCKET = aws_s3_bucket.data["assets"].id,
    SMS_ENABLED      = var.sms_enabled ? "1" : "0", PILOT_PHONES = join(",", var.pilot_phones),
    SES_FROM         = var.ses_from, AWS_REGION = var.region, REALTIME_ENABLED = "0", EXPO_PUSH_ENABLED = "0"

  }
  ops_image = var.migration_image_digest == "" ? local.image : "${aws_ecr_repository.api.repository_url}@${var.migration_image_digest}"
  image     = var.image_digest == "" ? "${aws_ecr_repository.api.repository_url}:bootstrap-not-published" : "${aws_ecr_repository.api.repository_url}@${var.image_digest}"

}
resource "aws_iam_role" "execution" {

  for_each           = toset(["api", "ops"])
  name               = "${local.name}-${each.key}-execution"
  assume_role_policy = local.task_trust

}
resource "aws_iam_role_policy" "execution" {

  for_each = aws_iam_role.execution
  role     = each.value.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*"
      },
      {
        Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"], Resource = aws_ecr_repository.api.arn
      },
      {
        Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.api.arn}:*"
      },
      {
        Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = each.key == "api" ? aws_secretsmanager_secret.runtime.arn : aws_db_instance.main.master_user_secret[0].secret_arn
      }
    ]
  })

}
resource "aws_iam_role" "task" {

  for_each           = toset(["api", "ops"])
  name               = "${local.name}-${each.key}-task"
  assume_role_policy = local.task_trust

}
resource "aws_iam_role_policy" "api" {

  role = aws_iam_role.task["api"].id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${aws_s3_bucket.data["assets"].arn}/assets/*"
      },
      {
        Effect = "Allow", Action = ["ses:SendEmail"], Resource = aws_sesv2_email_identity.domain.arn, Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_from
          }
        }
      }
    ]
  })

}
resource "aws_iam_role_policy" "ops" {

  role = aws_iam_role.task["ops"].id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Effect = "Allow", Action = ["secretsmanager:GetSecretValue", "secretsmanager:PutSecretValue"], Resource = aws_secretsmanager_secret.runtime.arn
      }
    ]
  })

}
resource "aws_cloudwatch_log_group" "api" {

  name              = "/ecs/${local.name}"
  retention_in_days = 14

}
resource "aws_ecs_cluster" "main" {
  name = local.name
}
resource "aws_ecs_task_definition" "api" {

  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution["api"].arn
  task_role_arn            = aws_iam_role.task["api"].arn
  runtime_platform {
    cpu_architecture        = "X86_64"
    operating_system_family = "LINUX"

  }
  container_definitions = jsonencode([local.api_container])
}
resource "aws_ecs_task_definition" "ops" {

  family                   = "${local.name}-ops"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 1024
  execution_role_arn       = aws_iam_role.execution["ops"].arn
  task_role_arn            = aws_iam_role.task["ops"].arn
  runtime_platform {
    cpu_architecture        = "X86_64"
    operating_system_family = "LINUX"

  }
  container_definitions = jsonencode([{

    name = "ops", image = local.ops_image, essential = true, user = "1000:1000", readonlyRootFilesystem = true,
    linuxParameters = {
      initProcessEnabled = true, capabilities = {
        drop = ["ALL"]
      }
    },
    command = ["node", "scripts/aws/database.mjs", "migrate"],
    environment = [for k, v in {
      NODE_ENV = "production", DATABASE_CA_FILE = "/app/rds-ca.pem", DB_HOST = aws_db_instance.main.address, DB_NAME = aws_db_instance.main.db_name, RUNTIME_SECRET_ARN = aws_secretsmanager_secret.runtime.arn, AWS_REGION = var.region
      } : {
      name = k, value = v
    }],
    secrets = [for k, field in {
      DB_OWNER = "username", DB_PASSWORD = "password"
      } : {
      name = k, valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:${field}::"
    }],
    logConfiguration = {
      logDriver = "awslogs", options = {
        awslogs-group = aws_cloudwatch_log_group.api.name, awslogs-region = var.region, awslogs-stream-prefix = "ops"
      }
    }

  }])

}
resource "aws_ecs_service" "api" {

  name                               = "${local.name}-api"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.api.arn
  desired_count                      = var.service_enabled ? var.min_tasks : 0
  launch_type                        = "FARGATE"
  platform_version                   = "1.4.0"
  health_check_grace_period_seconds  = 60
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {
    enable   = true
    rollback = true

  }
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = true

  }
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3100

  }
  lifecycle {

    ignore_changes = [desired_count]
    precondition {

      condition     = !var.service_enabled || (var.image_digest != "" && var.min_tasks >= 1 && var.max_tasks >= var.min_tasks)
      error_message = "Enable only after publishing a digest; task bounds must be positive and ordered."

    }

  }
  depends_on = [aws_lb_listener.https, aws_iam_role_policy.execution, aws_iam_role_policy.api]

}
resource "aws_appautoscaling_target" "api" {

  min_capacity       = var.service_enabled ? var.min_tasks : 0
  max_capacity       = var.service_enabled ? var.max_tasks : 0
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

}
resource "aws_appautoscaling_policy" "cpu" {

  name               = "${local.name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace
  target_tracking_scaling_policy_configuration {

    target_value       = 60
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

  }

}
resource "aws_iam_role_policy" "sms" {
  count = var.sms_enabled ? 1 : 0
  role  = aws_iam_role.task["api"].id
  # Direct phone SMS has no resource ARN. Explicitly deny SNS topics/platform endpoints.
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["sns:Publish"], Resource = "*" },
    { Effect = "Deny", Action = ["sns:Publish"], Resource = "arn:aws:sns:*:*:*" }
  ] })
}

locals {
  api_container = {

    name = "api", image = local.image, essential = true, user = "1000:1000", readonlyRootFilesystem = true,
    linuxParameters = {
      initProcessEnabled = true, capabilities = {
        drop = ["ALL"]
      }
    },
    portMappings = [{
      containerPort = 3100, protocol = "tcp"
    }], stopTimeout = 60,
    environment = [for k, v in local.api_environment : {
      name = k, value = v
    }],
    secrets = [for k in local.runtime_keys : {
      name = k, valueFrom = "${aws_secretsmanager_secret.runtime.arn}:${k}::"
    }],
    healthCheck = {
      command = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:3100/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""], interval = 30, timeout = 5, retries = 3, startPeriod = 30
    },
    logConfiguration = {
      logDriver = "awslogs", options = {
        awslogs-group = aws_cloudwatch_log_group.api.name, awslogs-region = var.region, awslogs-stream-prefix = "api", mode = "non-blocking", max-buffer-size = "1m"
      }
    }

  }
}
