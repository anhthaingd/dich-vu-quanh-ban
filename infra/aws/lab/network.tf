resource "aws_vpc" "main" {

  cidr_block           = "10.42.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

}
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}
resource "aws_subnet" "public" {

  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false

}
resource "aws_subnet" "database" {

  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, 10 + count.index)
  availability_zone = local.azs[count.index]

}
resource "aws_route_table" "public" {

  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id

  }

}
resource "aws_route_table_association" "public" {

  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id

}
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id
}
resource "aws_route_table_association" "database" {

  count          = 2
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id

}
resource "aws_vpc_endpoint" "s3" {

  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${var.region}.s3"
  route_table_ids = [aws_route_table.public.id]

}
resource "aws_security_group" "alb" {

  name_prefix = "${local.name}-alb-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]

  }
  egress {
    from_port       = 3100
    to_port         = 3100
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]

  }

}
resource "aws_security_group" "api" {

  name_prefix = "${local.name}-api-"
  vpc_id      = aws_vpc.main.id
  # Public IP is outbound-only: no public ingress, no SSH, no ECS Exec.
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]

  }
  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [for s in aws_subnet.database : s.cidr_block]

  }

}
resource "aws_security_group_rule" "api_from_alb" {

  type                     = "ingress"
  from_port                = 3100
  to_port                  = 3100
  protocol                 = "tcp"
  security_group_id        = aws_security_group.api.id
  source_security_group_id = aws_security_group.alb.id

}
resource "aws_security_group" "database" {

  name_prefix = "${local.name}-db-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]

  }

}
resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.database[*].id

}
resource "aws_db_parameter_group" "main" {

  name_prefix = "${local.name}-"
  family      = "postgres17"
  parameter {
    name  = "rds.force_ssl"
    value = "1"

  }
  lifecycle {
    create_before_destroy = true
  }

}
resource "aws_db_instance" "main" {

  identifier                  = local.name
  engine                      = "postgres"
  engine_version              = "17"
  instance_class              = "db.t4g.micro"
  db_name                     = "dvqb"
  username                    = "dvqb_owner"
  manage_master_user_password = true
  allocated_storage           = 20
  max_allocated_storage       = 100
  storage_type                = "gp3"
  storage_encrypted           = true
  publicly_accessible         = false
  multi_az                    = false
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.database.id]
  parameter_group_name        = aws_db_parameter_group.main.name
  backup_retention_period     = 0
  backup_window               = "18:00-19:00"
  maintenance_window          = "sun:19:30-sun:20:30"
  auto_minor_version_upgrade  = true
  copy_tags_to_snapshot       = true
  deletion_protection         = false
  skip_final_snapshot         = true
  delete_automated_backups    = true
  # Avoid unmanaged /aws/rds log groups left behind after deleting the lab.


}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}
