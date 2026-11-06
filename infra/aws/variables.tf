variable "region" {
  default = "ap-southeast-1"
}
variable "environment" {

  default = "pilot"
  validation {

    condition     = can(regex("^[a-z][a-z0-9-]{1,16}$", var.environment))
    error_message = "Use a short lowercase environment name."

  }

}
variable "zone_id" {
  type = string
}
variable "api_domain" {
  type = string
}
variable "ses_domain" {
  type = string
}
variable "ses_from" {
  type = string
}
variable "alert_email" {
  type = string
}
variable "pilot_emails" {

  type = list(string)
  validation {

    condition     = length(var.pilot_emails) > 0 && alltrue([for x in var.pilot_emails : can(regex("^[^ ,@]+@[^ ,@]+\\.[^ ,@]+$", x))])
    error_message = "Provide the explicit pilot email allowlist."

  }

}
variable "image_digest" {

  default = ""
  validation {

    condition     = var.image_digest == "" || can(regex("^sha256:[0-9a-f]{64}$", var.image_digest))
    error_message = "Use an immutable ECR sha256 digest."

  }

}
variable "service_enabled" {
  default = false
}
variable "task_cpu" {
  default = 256
}
variable "task_memory" {
  default = 1024
}
variable "min_tasks" {
  default = 1
}
variable "max_tasks" {
  default = 1
}
variable "db_class" {
  default = "db.t4g.micro"
}
variable "db_multi_az" {
  default = false
}
variable "monthly_budget_usd" {
  default = "100"
}
variable "github_repository" {
  default = "anhthaingd/dich-vu-quanh-ban"
}
variable "github_oidc_provider_arn" {

  description = "Existing GitHub OIDC provider in this account; blank disables the release role."
  default     = ""

}
variable "sms_enabled" {
  default = false
  validation {
    condition     = !var.sms_enabled || length(var.pilot_phones) > 0
    error_message = "Enabling SMS requires an explicit phone allowlist."
  }
}
variable "pilot_phones" {
  type    = list(string)
  default = []
  validation {
    condition     = alltrue([for x in var.pilot_phones : can(regex("^\\+[1-9][0-9]{7,14}$", x))])
    error_message = "Use explicit E164 destination numbers."
  }
}

variable "migration_image_digest" {
  description = "Stage a new ops image before changing image_digest on the running API."
  default     = ""
  validation {
    condition     = var.migration_image_digest == "" || can(regex("^sha256:[0-9a-f]{64}$", var.migration_image_digest))
    error_message = "Use an immutable migration image digest."
  }
}
