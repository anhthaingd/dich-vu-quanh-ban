terraform {

  required_version = ">= 1.10, < 2.0"
  backend "s3" {

  }
  required_providers {

    aws = {
      source = "hashicorp/aws", version = "~> 6.0"
    }

  }

}
provider "aws" {

  region = var.region
  default_tags {
    tags = {
      Project = "dvqb", Environment = var.environment, ManagedBy = "terraform"
    }
  }

}
data "aws_caller_identity" "current" {

}
data "aws_availability_zones" "available" {
  state = "available"
}
locals {

  name = "dvqb-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)

}
