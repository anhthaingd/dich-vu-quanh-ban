locals {
  ops_environment = {
    LAB_FINANCE_TEST = var.finance_test_enabled ? "1" : "0", NODE_ENV = "production", DATABASE_CA_FILE = "/app/rds-ca.pem", DB_HOST = aws_db_instance.main.address, DB_NAME = aws_db_instance.main.db_name, RUNTIME_SECRET_ARN = aws_secretsmanager_secret.runtime.arn, AWS_REGION = var.region
  }

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
  runtime_keys = concat(["DATABASE_URL", "AUTH_SECRET", "CURSOR_SECRET", "MESSAGE_SECRET", "ADMIN_SECRET", "GEOAPIFY_API_KEY"], var.email_provider == "resend" ? ["RESEND_API_KEY"] : [], var.livekit_url != "" ? ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] : [], var.expo_push_enabled ? ["EXPO_ACCESS_TOKEN"] : [], var.finance_test_enabled ? ["FINANCE_TEST_SECRET"] : [])
  api_environment = merge({

    NODE_ENV                  = "production", CLOUD_PILOT = "1", HOST = "0.0.0.0", PORT = "3100",
    DATABASE_CA_FILE          = "/app/rds-ca.pem", PUBLIC_API_ORIGIN = "https://${local.api_domain}",
    CORS_ORIGIN               = join(",", [for d in local.web_domains : "https://${d}"]),
    PILOT_EMAILS              = join(",", var.pilot_emails), ASSET_BUCKET = aws_s3_bucket.data["assets"].id,
    PUBLIC_EMAIL_REGISTRATION = var.public_email_registration ? "1" : "0"
    SMS_ENABLED               = "0", PILOT_PHONES = "", CLOUD_PROXY_MODE = "cloudfront-alb",
    LAB_FINANCE_TEST          = var.finance_test_enabled ? "1" : "0", LAB_EMAIL_VERIFICATION = "1", EMAIL_PROVIDER = var.email_provider, EMAIL_FROM = var.email_from
    SES_FROM                  = var.email_from, AWS_REGION = var.region, REALTIME_ENABLED = var.realtime_enabled ? "1" : "0", LAB_REALTIME_SINGLETON = var.realtime_enabled ? "1" : "0", EXPO_PUSH_ENABLED = var.expo_push_enabled ? "1" : "0"

  }, var.livekit_url != "" ? { LIVEKIT_MODE = "cloud", LIVEKIT_URL = var.livekit_url, LIVEKIT_ROOM_PREFIX = "dvqb-lab-${var.expected_account_id}-${var.lab_id}-call-" } : {})
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
    Version = "2012-10-17", Statement = concat([
      {
        Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${aws_s3_bucket.data["assets"].arn}/assets/*"
      }
      ], var.email_provider == "ses" ? [
      {
        Effect = "Allow", Action = ["ses:SendEmail"], Resource = "arn:aws:ses:${var.region}:${var.expected_account_id}:identity/${var.email_from}", Condition = {
          StringEquals = {
            "ses:FromAddress" = var.email_from
          }
        }
      }
    ] : [])
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
# B00-32: API task uses 0.5 vCPU (owner approved 12/11/2026, about +9 USD/month). 0.25 vCPU starved
# image processing and the lease heartbeat during the 12/11 outage (B00-31).
resource "aws_ecs_task_definition" "api" {

  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
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
    environment = [for k, v in local.ops_environment : {
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
  desired_count                      = var.service_enabled ? 1 : 0
  launch_type                        = "FARGATE"
  platform_version                   = "1.4.0"
  health_check_grace_period_seconds  = 60
  deployment_minimum_healthy_percent = var.realtime_enabled ? 0 : 100
  deployment_maximum_percent         = var.realtime_enabled ? 100 : 200
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

    precondition {

      condition     = !var.service_enabled || var.image_digest != ""
      error_message = "Enable only after publishing and migrating an immutable image digest."

    }

  }
  depends_on = [aws_lb_listener_rule.cloudfront, aws_iam_role_policy.execution, aws_iam_role_policy.api]

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
