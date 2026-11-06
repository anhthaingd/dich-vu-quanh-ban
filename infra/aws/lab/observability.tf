resource "aws_sns_topic" "alerts" {
  name = "${local.name}-alerts"
}
resource "aws_sns_topic_subscription" "email" {

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email

}
locals {

  alarms = {

    unhealthy = {
      namespace = "AWS/ApplicationELB", metric = "HealthyHostCount", statistic = "Minimum", threshold = 1, comparison = "LessThanThreshold", dimensions = {
        LoadBalancer = aws_lb.api.arn_suffix, TargetGroup = aws_lb_target_group.api.arn_suffix
      }
    },
    errors = {
      namespace = "AWS/ApplicationELB", metric = "HTTPCode_Target_5XX_Count", statistic = "Sum", threshold = 5, comparison = "GreaterThanThreshold", dimensions = {
        LoadBalancer = aws_lb.api.arn_suffix
      }
    },
    latency = {
      namespace = "AWS/ApplicationELB", metric = "TargetResponseTime", statistic = "Average", threshold = 2, comparison = "GreaterThanThreshold", dimensions = {
        LoadBalancer = aws_lb.api.arn_suffix
      }
    },
    db_cpu = {
      namespace = "AWS/RDS", metric = "CPUUtilization", statistic = "Average", threshold = 70, comparison = "GreaterThanThreshold", dimensions = {
        DBInstanceIdentifier = aws_db_instance.main.id
      }
    },
    db_storage = {
      namespace = "AWS/RDS", metric = "FreeStorageSpace", statistic = "Minimum", threshold = 5368709120, comparison = "LessThanThreshold", dimensions = {
        DBInstanceIdentifier = aws_db_instance.main.id
      }
    },
    db_memory = {
      namespace = "AWS/RDS", metric = "FreeableMemory", statistic = "Minimum", threshold = 134217728, comparison = "LessThanThreshold", dimensions = {
        DBInstanceIdentifier = aws_db_instance.main.id
      }
    },
    api_memory = {
      namespace = "AWS/ECS", metric = "MemoryUtilization", statistic = "Average", threshold = 75, comparison = "GreaterThanThreshold", dimensions = {
        ClusterName = aws_ecs_cluster.main.name, ServiceName = aws_ecs_service.api.name
      }
    }

  }

}
resource "aws_cloudwatch_metric_alarm" "main" {

  for_each            = local.alarms
  alarm_name          = "${local.name}-${each.key}"
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  comparison_operator = each.value.comparison
  dimensions          = each.value.dimensions
  period              = 60
  evaluation_periods  = 3
  treat_missing_data  = each.key == "unhealthy" && var.service_enabled ? "breaching" : "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

}
resource "aws_budgets_budget" "monthly" {

  name         = local.name
  budget_type  = "COST"
  limit_amount = var.monthly_budget_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  # Account-wide: includes shared/untagged charges which project tags can miss.
  notification {

    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]

  }
  notification {

    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]

  }

}
