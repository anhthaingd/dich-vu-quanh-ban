terraform {
  required_version = ">= 1.10, < 2.0"
  # The lab runner supplies a private absolute path. Never use the pilot S3 state.
  backend "local" {}
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.7" }
  }
}
provider "aws" {
  region              = var.region
  allowed_account_ids = [var.expected_account_id]
  default_tags {
    tags = { Project = "dvqb", Environment = "lab", LabId = var.lab_id, ManagedBy = "terraform" }
  }
}
provider "aws" {
  alias               = "edge"
  region              = "us-east-1"
  allowed_account_ids = [var.expected_account_id]
  default_tags {
    tags = { Project = "dvqb", Environment = "lab", LabId = var.lab_id, ManagedBy = "terraform" }
  }
}
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }
locals {
  name        = "dvqb-lab-${var.lab_id}"
  azs         = slice(data.aws_availability_zones.available.names, 0, 2)
  api_domain  = "api.${var.domain}"
  web_domains = { web = "app.${var.domain}", admin = "admin.${var.domain}" }
}
