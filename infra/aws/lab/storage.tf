resource "aws_s3_bucket" "data" {

  for_each      = toset(["assets", "web", "admin"])
  bucket        = "${local.name}-${each.key}-${data.aws_caller_identity.current.account_id}-${var.region}"
  force_destroy = true

}
resource "aws_s3_bucket_public_access_block" "data" {

  for_each                = aws_s3_bucket.data
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

}
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {

  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }

}
resource "aws_s3_bucket_versioning" "data" {

  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  versioning_configuration {
    status = "Enabled"
  }

}
resource "aws_s3_bucket_lifecycle_configuration" "data" {

  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  rule {

    id     = "old-versions-and-incomplete-uploads"
    status = "Enabled"
    filter {
      prefix = ""
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }

  }

}
resource "aws_cloudfront_origin_access_control" "static" {

  name                              = local.name
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"

}
resource "aws_cloudfront_function" "spa" {

  name    = "${local.name}-spa"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = "function handler(event) { var r = event.request; if (r.uri.endsWith('/') || !r.uri.split('/').pop().includes('.')) r.uri = '/index.html'; return r; }"

}
resource "aws_cloudfront_response_headers_policy" "static" {

  name = local.name
  security_headers_config {

    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true

    }
    referrer_policy {
      referrer_policy = "no-referrer"
      override        = true

    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true

    }

  }

}
resource "aws_cloudfront_distribution" "static" {
  comment = "${local.name}-${each.key}"

  for_each            = toset(["web", "admin"])
  enabled             = true
  aliases             = [local.web_domains[each.key]]
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All" # Includes Singapore/Vietnam edge locations.
  origin {

    domain_name              = aws_s3_bucket.data[each.key].bucket_regional_domain_name
    origin_id                = "s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.static.id

  }
  default_cache_behavior {

    target_origin_id           = "s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed CachingOptimized
    response_headers_policy_id = aws_cloudfront_response_headers_policy.static.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa.arn

    }

  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

}
resource "aws_s3_bucket_policy" "data" {

  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = concat([
      {
        Sid = "DenyInsecureTransport", Effect = "Deny", Principal = "*", Action = "s3:*", Resource = [each.value.arn, "${each.value.arn}/*"], Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
      ], each.key == "assets" ? [] : [
      {
        Sid = "CloudFrontOnly", Effect = "Allow", Principal = {
          Service = "cloudfront.amazonaws.com"
          }, Action = "s3:GetObject", Resource = "${each.value.arn}/*", Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.static[each.key].arn
          }
        }
      }
    ])
  })

}
resource "aws_ecr_repository" "api" {

  name                 = "${local.name}-api"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true
  image_scanning_configuration {
    scan_on_push = true
  }
  encryption_configuration {
    encryption_type = "AES256"
  }

}
# Retain tagged releases for rollback; only remove untagged build debris.
resource "aws_ecr_lifecycle_policy" "api" {

  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1, description = "Expire untagged after 14 days", selection = {
        tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 14
        }, action = {
        type = "expire"
      }
    }]
  })

}
resource "aws_secretsmanager_secret" "runtime" {

  name                    = "${local.name}/runtime"
  recovery_window_in_days = 0


}
