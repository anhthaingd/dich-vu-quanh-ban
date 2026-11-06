mock_provider "aws" {
  override_during = plan
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/mock" }
  }
  mock_resource "aws_lb" {
    defaults = { arn = "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:loadbalancer/app/mock/0000000000000000" }
  }
  mock_resource "aws_lb_target_group" {
    defaults = { arn = "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:targetgroup/mock/0000000000000000" }
  }
  mock_resource "aws_wafv2_web_acl" {
    defaults = { arn = "arn:aws:wafv2:ap-southeast-1:123456789012:regional/webacl/mock/00000000-0000-0000-0000-000000000000" }
  }
  mock_resource "aws_sns_topic" {
    defaults = { arn = "arn:aws:sns:ap-southeast-1:123456789012:mock" }
  }
  mock_resource "aws_cloudfront_function" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:function/mock" }
  }
  mock_resource "aws_ecs_task_definition" {
    defaults = { arn = "arn:aws:ecs:ap-southeast-1:123456789012:task-definition/mock:1" }
  }
  mock_resource "aws_ecs_cluster" {
    defaults = { arn = "arn:aws:ecs:ap-southeast-1:123456789012:cluster/mock" }
  }

  mock_resource "aws_security_group" {
    defaults = { ingress = [] }
  }
  mock_resource "aws_acm_certificate_validation" {
    defaults = { certificate_arn = "arn:aws:acm:ap-southeast-1:123456789012:certificate/00000000-0000-0000-0000-000000000000" }
  }
  mock_resource "aws_acm_certificate" {
    defaults = { arn = "arn:aws:acm:ap-southeast-1:123456789012:certificate/00000000-0000-0000-0000-000000000000", domain_validation_options = [{ domain_name = "api.example.com", resource_record_name = "_test.api.example.com", resource_record_type = "CNAME", resource_record_value = "_test.acm-validations.aws" }] }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012", arn = "arn:aws:iam::123456789012:root" }
  }
  mock_data "aws_availability_zones" {
    defaults = { names = ["ap-southeast-1a", "ap-southeast-1b"] }
  }
  mock_resource "aws_db_instance" {
    defaults = { master_user_secret = [{ secret_arn = "arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:master-abcdef", kms_key_id = "mock", secret_status = "active" }] }
  }
  mock_resource "aws_sesv2_email_identity" {
    defaults = { dkim_signing_attributes = { tokens = ["one", "two", "three"], signing_attributes_origin = "AWS_SES", status = "SUCCESS" } }
  }
}
variables {
  zone_id      = "Z123456"
  api_domain   = "api.example.com"
  ses_domain   = "example.com"
  ses_from     = "noreply@example.com"
  alert_email  = "owner@example.com"
  pilot_emails = ["owner@example.com"]
}
run "safe_bootstrap" {
  command = plan
  assert {
    condition     = aws_db_instance.main.publicly_accessible == false && aws_db_instance.main.storage_encrypted && aws_db_instance.main.backup_retention_period == 7 && aws_db_instance.main.deletion_protection
    error_message = "Database must be private, encrypted, backed up and protected."
  }
  assert {
    condition     = aws_ecs_service.api.desired_count == 0 && aws_appautoscaling_target.api.max_capacity == 0
    error_message = "Unconfigured deployment must never start an API task."
  }
  assert {
    condition     = length(aws_security_group.api.ingress) == 0 && aws_security_group_rule.api_from_alb.from_port == 3100
    error_message = "Direct internet access to API forbidden."
  }
  assert {
    condition     = alltrue([for b in aws_s3_bucket_public_access_block.data : b.block_public_policy && b.block_public_acls && b.restrict_public_buckets && b.ignore_public_acls])
    error_message = "Every bucket must block public access."
  }
  assert {
    condition     = local.api_container.readonlyRootFilesystem && local.api_container.user == "1000:1000"
    error_message = "API must run without root and without writable filesystem."
  }
}
run "scale_bounds" {
  command = plan
  variables {
    service_enabled = true
    image_digest    = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    min_tasks       = 2
    max_tasks       = 4
    db_multi_az     = true
  }
  assert {
    condition     = aws_appautoscaling_target.api.min_capacity == 2 && aws_appautoscaling_target.api.max_capacity == 4 && aws_db_instance.main.multi_az
    error_message = "Scaling must preserve explicit bounds and Multi-AZ choice."
  }
}
run "refuse_unpublished_image" {
  command = plan
  variables { service_enabled = true }
  expect_failures = [aws_ecs_service.api]
}
run "migration_before_rollout" {
  command = plan
  variables {
    image_digest           = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    migration_image_digest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    sms_enabled            = true
    pilot_phones           = ["+84900000001"]
  }
  assert {
    condition     = endswith(local.image, var.image_digest) && endswith(local.ops_image, var.migration_image_digest) && local.api_environment.SMS_ENABLED == "1" && local.api_environment.PILOT_PHONES == "+84900000001"
    error_message = "Migration staging must keep the API image unchanged; SMS config must reach the container."
  }
}

override_resource {
  target          = aws_ecr_repository.api
  override_during = plan
  values          = { repository_url = "123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/dvqb-pilot-api", arn = "arn:aws:ecr:ap-southeast-1:123456789012:repository/dvqb-pilot-api" }
}
