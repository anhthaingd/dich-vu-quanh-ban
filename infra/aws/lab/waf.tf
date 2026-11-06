resource "aws_wafv2_web_acl" "api" {

  provider = aws.edge
  name     = local.name
  scope    = "CLOUDFRONT"
  default_action {
    allow {

    }
  }
  rule {

    name     = "ip-rate"
    priority = 1
    action {
      block {

      }
    }
    statement {
      rate_based_statement {
        limit                 = 1000
        aggregate_key_type    = "IP"
        evaluation_window_sec = 300

      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-rate"
      sampled_requests_enabled   = false

    }

  }
  rule {

    name     = "auth-rate"
    priority = 2
    action {
      block {

      }
    }
    statement {
      rate_based_statement {

        limit                 = 100
        aggregate_key_type    = "IP"
        evaluation_window_sec = 300
        scope_down_statement {
          byte_match_statement {

            positional_constraint = "STARTS_WITH"
            search_string         = "/v1/auth/"
            field_to_match {
              uri_path {

              }
            }
            text_transformation {
              priority = 0
              type     = "NONE"

            }

          }
        }

      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-auth-rate"
      sampled_requests_enabled   = false

    }

  }
  rule {

    name     = "known-bad-inputs"
    priority = 3
    override_action {
      none {

      }
    }
    statement {
      managed_rule_group_statement {

        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"

      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-bad-inputs"
      sampled_requests_enabled   = false

    }

  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = local.name
    sampled_requests_enabled   = false

  }

}
