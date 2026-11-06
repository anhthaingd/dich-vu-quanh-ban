resource "aws_acm_certificate" "api" {

  domain_name       = var.api_domain
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }

}
resource "aws_route53_record" "certificate" {
  zone_id = var.zone_id
  name    = one(aws_acm_certificate.api.domain_validation_options).resource_record_name
  type    = one(aws_acm_certificate.api.domain_validation_options).resource_record_type
  records = [one(aws_acm_certificate.api.domain_validation_options).resource_record_value]
  ttl     = 300
}
resource "aws_acm_certificate_validation" "api" {

  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [aws_route53_record.certificate.fqdn]

}
resource "aws_lb" "api" {

  name                       = local.name
  load_balancer_type         = "application"
  internal                   = false
  subnets                    = aws_subnet.public[*].id
  security_groups            = [aws_security_group.alb.id]
  drop_invalid_header_fields = true
  desync_mitigation_mode     = "strictest"
  enable_deletion_protection = true

}
resource "aws_lb_target_group" "api" {

  name                 = local.name
  port                 = 3100
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 30
  health_check {
    path                = "/v1/ready"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3

  }

}
resource "aws_lb_listener" "https" {

  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn

  }

}
resource "aws_route53_record" "api" {

  zone_id = var.zone_id
  name    = var.api_domain
  type    = "A"
  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true

  }

}
resource "aws_wafv2_web_acl" "api" {

  name  = local.name
  scope = "REGIONAL"
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
resource "aws_wafv2_web_acl_association" "api" {

  resource_arn = aws_lb.api.arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn

}
resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.ses_domain
  dkim_signing_attributes {}
}
resource "aws_route53_record" "dkim" {

  count   = 3
  zone_id = var.zone_id
  name    = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.ses_domain}"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]

}
