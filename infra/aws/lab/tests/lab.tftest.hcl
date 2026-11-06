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
    defaults = { arn = "arn:aws:wafv2:us-east-1:123456789012:global/webacl/mock/00000000-0000-0000-0000-000000000000" }
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

mock_provider "aws" {
  alias           = "edge"
  override_during = plan
  mock_resource "aws_wafv2_web_acl" {
    defaults = { arn = "arn:aws:wafv2:us-east-1:123456789012:global/webacl/mock/00000000-0000-0000-0000-000000000000" }
  }
}
mock_provider "random" {
  override_during = plan
  mock_resource "random_password" {
    defaults = { result = "TEST_ONLY_ORIGIN_TOKEN_01234567890" }
  }
}
variables {
  expected_account_id = "123456789012"
  lab_id              = "test"
  certificate_arn     = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
  email_from          = "owner@example.com"
  pilot_emails        = ["owner@example.com"]
  alert_email         = "owner@example.com"
  monthly_budget_usd  = 20
}
run "lab_private_bootstrap" {
  command = plan
  assert {
    condition     = one(aws_security_group.alb.ingress).from_port == 80 && one(aws_security_group.alb.ingress).to_port == 80 && length(coalesce(one(aws_security_group.alb.ingress).cidr_blocks, [])) == 0 && length(coalesce(one(aws_security_group.alb.ingress).ipv6_cidr_blocks, [])) == 0 && one(one(aws_security_group.alb.ingress).prefix_list_ids) == data.aws_ec2_managed_prefix_list.cloudfront.id && aws_security_group_rule.api_from_alb.source_security_group_id == aws_security_group.alb.id
    error_message = "Only CloudFront origin-facing traffic may reach the private ALB, and only ALB may reach API."
  }
  assert {
    condition     = aws_cloudfront_vpc_origin.api.vpc_origin_endpoint_config[0].origin_protocol_policy == "http-only" && toset(aws_lb.api.subnets) == toset(aws_subnet.database[*].id)
    error_message = "VPC origin must use the explicitly approved private HTTP hop and private subnets."
  }
  assert {
    condition     = aws_lb.api.internal && !aws_lb.api.enable_deletion_protection && aws_lb.api.xff_header_processing_mode == "append" && !aws_lb.api.enable_xff_client_port
    error_message = "Lab must use a private, disposable ALB with exactly the reviewed XFF chain."
  }
  assert {
    condition     = aws_ecs_service.api.desired_count == 0 && local.api_environment.CLOUD_PROXY_MODE == "cloudfront-alb"
    error_message = "No API task before bootstrap/migration and explicit enable."
  }
  assert {
    condition     = aws_cloudfront_distribution.api.default_cache_behavior[0].viewer_protocol_policy == "https-only" && aws_cloudfront_distribution.api.default_cache_behavior[0].cache_policy_id == "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" && aws_cloudfront_distribution.api.default_cache_behavior[0].origin_request_policy_id == "216adef6-5c7f-47e4-b989-5492eafa07d3"
    error_message = "API requires HTTPS, no cached account data and all viewer authorization headers."
  }
  assert {
    condition     = alltrue([for e in aws_cloudfront_distribution.api.custom_error_response : e.error_caching_min_ttl == 0]) && length(aws_cloudfront_distribution.api.default_cache_behavior[0].allowed_methods) == 7
    error_message = "No error caching and all API HTTP methods must pass."
  }
  assert {
    condition     = aws_wafv2_web_acl.api.scope == "CLOUDFRONT" && aws_lb_listener.http.default_action[0].type == "fixed-response" && one(aws_lb_listener_rule.cloudfront.condition).http_header[0].values == toset([random_password.origin.result])
    error_message = "WAF must be on CloudFront and ALB must reject requests without the distribution token."
  }
  assert {
    condition     = !aws_db_instance.main.publicly_accessible && aws_db_instance.main.storage_encrypted && aws_db_instance.main.backup_retention_period == 0 && !aws_db_instance.main.deletion_protection && aws_db_instance.main.skip_final_snapshot && aws_db_instance.main.delete_automated_backups
    error_message = "DB must stay private/encrypted but disposable without retained backups."
  }
  assert {
    condition     = alltrue([for b in aws_s3_bucket.data : b.force_destroy]) && aws_ecr_repository.api.force_delete && aws_secretsmanager_secret.runtime.recovery_window_in_days == 0
    error_message = "Lab cleanup must remove bucket versions, images and runtime secret."
  }
  assert {
    condition     = alltrue([for b in aws_s3_bucket_public_access_block.data : b.block_public_policy && b.block_public_acls && b.restrict_public_buckets && b.ignore_public_acls]) && local.api_container.readonlyRootFilesystem && local.api_container.user == "1000:1000"
    error_message = "Lab must retain pilot storage and container security."
  }
  assert {
    condition     = local.api_environment.CORS_ORIGIN == "https://admin.iimissher.com,https://app.iimissher.com" && aws_cloudfront_distribution.static["web"].aliases == toset(["app.iimissher.com"]) && aws_cloudfront_distribution.api.aliases == toset(["api.iimissher.com"])
    error_message = "Domain must reach web/API and the CORS allowlist."
  }
}
run "refuse_unpublished_image" {
  command = plan
  variables { service_enabled = true }
  expect_failures = [aws_ecs_service.api]
}
run "immutable_image_rollout" {
  command = plan
  variables {
    service_enabled        = true
    image_digest           = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    migration_image_digest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }
  assert {
    condition     = aws_ecs_service.api.desired_count == 1 && endswith(local.image, var.image_digest) && endswith(local.ops_image, var.migration_image_digest)
    error_message = "Use explicit immutable images and one lab API task."
  }
}
run "reject_wrong_certificate_account" {
  command = plan
  variables { certificate_arn = "arn:aws:acm:us-east-1:999999999999:certificate/00000000-0000-0000-0000-000000000000" }
  expect_failures = [var.certificate_arn]
}
run "reject_wrong_account" {
  command = plan
  variables {
    expected_account_id = "999999999999"
    certificate_arn     = "arn:aws:acm:us-east-1:999999999999:certificate/00000000-0000-0000-0000-000000000000"
  }
  expect_failures = [output.deployment]
}

override_resource {
  target          = aws_ecr_repository.api
  override_during = plan
  values          = { repository_url = "123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/dvqb-lab-test-api", arn = "arn:aws:ecr:ap-southeast-1:123456789012:repository/dvqb-lab-test-api" }
}

override_resource {
  target          = aws_subnet.database[0]
  override_during = plan
  values          = { id = "subnet-00000000000000001" }
}
override_resource {
  target          = aws_subnet.database[1]
  override_during = plan
  values          = { id = "subnet-00000000000000002" }
}
override_resource {
  target          = aws_security_group.alb
  override_during = plan
  values          = { id = "sg-00000000000000001" }
}

run "resend_email_lab" {
  command = plan
  variables { email_provider = "resend" }
  assert {
    condition     = contains(local.runtime_keys, "RESEND_API_KEY") && local.api_environment.LAB_EMAIL_VERIFICATION == "1" && local.api_environment.EMAIL_PROVIDER == "resend"
    error_message = "Lab must inject the Resend key privately and enable email verification."
  }
  assert {
    condition     = length(jsondecode(aws_iam_role_policy.api.policy).Statement) == 1
    error_message = "Resend API task must not have SES permissions."
  }
}

override_resource {
  target          = aws_s3_bucket.data["assets"]
  override_during = plan
  values          = { id = "dvqb-lab-test-assets", arn = "arn:aws:s3:::dvqb-lab-test-assets" }
}
run "communications_singleton" {
  command = plan
  variables {
    realtime_enabled  = true
    livekit_url       = "wss://owned.livekit.cloud"
    expo_push_enabled = true
  }
  assert {
    condition     = aws_ecs_service.api.deployment_minimum_healthy_percent == 0 && aws_ecs_service.api.deployment_maximum_percent == 100 && aws_ecs_service.api.desired_count <= 1
    error_message = "Realtime lab must stop old API before starting replacement."
  }
  assert {
    condition     = local.api_environment.LAB_REALTIME_SINGLETON == "1" && local.api_environment.REALTIME_ENABLED == "1" && local.api_environment.LIVEKIT_MODE == "cloud" && local.api_environment.EXPO_PUSH_ENABLED == "1" && contains(local.runtime_keys, "LIVEKIT_API_SECRET") && contains(local.runtime_keys, "EXPO_ACCESS_TOKEN")
    error_message = "Private runtime credentials and explicit capability guards are required."
  }
}

run "test_finance_only" {
  command = plan
  variables { finance_test_enabled = true }
  assert {
    condition     = local.api_environment.LAB_FINANCE_TEST == "1" && contains(local.runtime_keys, "FINANCE_TEST_SECRET") && !contains(local.runtime_keys, "FINANCE_LOCAL_SECRET")
    error_message = "Lab finance needs explicit mode and private test key, never the local adapter switch."
  }
  assert {
    condition     = local.ops_environment.LAB_FINANCE_TEST == "1"
    error_message = "The bootstrap task must provision the stable test key and initial finance reviewer grants."
  }
}
