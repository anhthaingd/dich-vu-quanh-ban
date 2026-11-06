# Only this distribution can pass the private ALB listener. State contains the token.
resource "random_password" "origin" {
  length  = 32
  special = false
}
resource "aws_lb" "api" {
  name                       = local.name
  load_balancer_type         = "application"
  internal                   = true
  idle_timeout               = 60
  subnets                    = aws_subnet.database[*].id
  security_groups            = [aws_security_group.alb.id]
  drop_invalid_header_fields = true
  desync_mitigation_mode     = "strictest"
  enable_deletion_protection = false
  xff_header_processing_mode = "append"
  enable_xff_client_port     = false
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
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}
resource "aws_lb_listener_rule" "cloudfront" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
  condition {
    http_header {
      http_header_name = "X-Dvqb-Origin"
      values           = [random_password.origin.result]
    }
  }
}
resource "aws_cloudfront_vpc_origin" "api" {
  vpc_origin_endpoint_config {
    name                   = local.name
    arn                    = aws_lb.api.arn
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only"
    origin_ssl_protocols {
      items    = ["TLSv1.2"]
      quantity = 1
    }
  }
  # AWS requires the origin resource to be fully active first.
  depends_on = [aws_internet_gateway.main, aws_lb_listener_rule.cloudfront]
}
resource "aws_cloudfront_function" "api_headers" {
  name    = "${local.name}-api-headers"
  runtime = "cloudfront-js-2.0"
  publish = true
  # Do not write X-Forwarded-Proto: it is forbidden in CloudFront Functions.
  code = file("${path.module}/api-headers.js")
}
resource "aws_cloudfront_distribution" "api" {
  comment         = "${local.name}-api"
  enabled         = true
  is_ipv6_enabled = true
  aliases         = [local.api_domain]
  price_class     = "PriceClass_All"
  web_acl_id      = aws_wafv2_web_acl.api.arn
  origin {
    domain_name = aws_lb.api.dns_name
    origin_id   = "private-api"
    custom_header {
      name  = "X-Dvqb-Origin"
      value = random_password.origin.result
    }
    vpc_origin_config {
      vpc_origin_id            = aws_cloudfront_vpc_origin.api.id
      origin_keepalive_timeout = 5
      origin_read_timeout      = 30
    }
  }
  default_cache_behavior {
    target_origin_id       = "private-api"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    # Managed CachingDisabled and AllViewer forward Authorization, query, body/cookies.
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_headers.arn
    }
  }
  # Error responses must not be cached either (including authorization failures).
  dynamic "custom_error_response" {
    for_each = toset([400, 403, 404, 405, 414, 416, 500, 501, 502, 503, 504])
    content {
      error_code            = custom_error_response.value
      error_caching_min_ttl = 0
    }
  }
  restrictions {
    geo_restriction { restriction_type = "none" }
  }
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
