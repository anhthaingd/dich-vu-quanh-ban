variable "region" {
  type    = string
  default = "ap-southeast-1"
  validation {
    condition     = var.region == "ap-southeast-1"
    error_message = "This reviewed lab and its cleanup inventory support Singapore only."
  }
}
variable "expected_account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "Provide the exact twelve-digit AWS account ID."
  }
}
variable "lab_id" {
  type = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,12}$", var.lab_id))
    error_message = "Use a 2-13 character lowercase lab ID."
  }
}
variable "domain" {
  type    = string
  default = "iimissher.com"
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.domain))
    error_message = "Use a lowercase DNS domain without URL scheme or wildcard."
  }
}
variable "certificate_arn" {
  type        = string
  description = "Existing ISSUED ACM certificate covering app/admin/api domain names; created in us-east-1 outside disposable state."
  validation {
    condition     = can(regex("^arn:aws:acm:us-east-1:${var.expected_account_id}:certificate/[0-9a-f-]+$", var.certificate_arn))
    error_message = "Certificate must belong to this account in us-east-1."
  }
}
variable "email_from" {
  type = string
  validation {
    condition     = can(regex("^[^ ,@]+@[^ ,@]+\\.[^ ,@]+$", var.email_from))
    error_message = "Provide a verified email sender."
  }
}
variable "pilot_emails" {
  type = list(string)
  validation {
    condition     = length(var.pilot_emails) > 0 && alltrue([for e in var.pilot_emails : can(regex("^[^ ,@]+@[^ ,@]+\\.[^ ,@]+$", e))])
    error_message = "An explicit email allowlist is required."
  }
}
variable "alert_email" {
  type = string
  validation {
    condition     = can(regex("^[^ ,@]+@[^ ,@]+\\.[^ ,@]+$", var.alert_email))
    error_message = "Provide the owner email for alerts."
  }
}
variable "monthly_budget_usd" {
  type = number
  validation {
    condition     = var.monthly_budget_usd > 0 && var.monthly_budget_usd <= 1000
    error_message = "Choose an explicit positive monthly alert budget (at most 1000 USD); this is not a spending cap."
  }
}
variable "image_digest" {
  type    = string
  default = ""
  validation {
    condition     = var.image_digest == "" || can(regex("^sha256:[0-9a-f]{64}$", var.image_digest))
    error_message = "Use an immutable ECR digest."
  }
}
variable "migration_image_digest" {
  type    = string
  default = ""
  validation {
    condition     = var.migration_image_digest == "" || can(regex("^sha256:[0-9a-f]{64}$", var.migration_image_digest))
    error_message = "Use an immutable migration digest."
  }
}
variable "service_enabled" {
  type    = bool
  default = false
}

variable "email_provider" {
  type    = string
  default = "ses"
  validation {
    condition     = contains(["ses", "resend"], var.email_provider)
    error_message = "Use ses or resend."
  }
}

variable "realtime_enabled" {
  type    = bool
  default = false
}
variable "livekit_url" {
  type    = string
  default = ""
  validation {
    condition     = var.livekit_url == "" || (var.realtime_enabled && can(regex("^wss://[a-z0-9-]+[.]livekit[.]cloud/?$", var.livekit_url)))
    error_message = "Cloud media requires singleton realtime and a LiveKit Cloud WSS URL."
  }
}
variable "expo_push_enabled" {
  type    = bool
  default = false
  validation {
    condition     = !var.expo_push_enabled || var.realtime_enabled
    error_message = "Cloud push requires the singleton runtime."
  }
}

variable "finance_test_enabled" {
  type        = bool
  default     = false
  description = "Enable the database-backed test-money simulator in this disposable lab only; never sends real transfers."
}
