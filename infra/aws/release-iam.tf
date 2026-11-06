resource "aws_iam_role" "release" {

  count = var.github_oidc_provider_arn == "" ? 0 : 1
  name  = "${local.name}-github-build"
  assume_role_policy = jsonencode({
    Version = "2012-10-17", Statement = [{

      Effect = "Allow", Principal = {
        Federated = var.github_oidc_provider_arn
      }, Action   = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {

          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:aws-pilot"

        }
      }

    }]
  })

}
resource "aws_iam_role_policy" "release" {

  count = length(aws_iam_role.release)
  role  = aws_iam_role.release[0].id
  # Build role cannot mutate infrastructure, databases, secrets or ECS services.
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*"
      },
      {
        Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:DescribeImages"], Resource = aws_ecr_repository.api.arn
      }
    ]
  })

}
