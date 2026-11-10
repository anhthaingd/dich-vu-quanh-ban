# Đăng nhập CLI và quyền sử dụng region

[Mục lục](README.md) · Phần 03 · 09/11/2026

## Vì sao phải đăng nhập cả trình duyệt và terminal

Trình duyệt phục vụ thao tác Console. AWS CLI là chương trình để terminal gọi AWS; Terraform và runner cần danh tính để tạo/đọc/xóa tài nguyên. Một tab Console đang đăng nhập không có nghĩa terminal đang dùng đúng account.

`dvqb-learn` là tên **profile** đã dùng trong phiên này. Profile chỉ cách lấy credentials; **session** là phiên credentials tạm thời và có thể hết hạn. `aws login` yêu cầu CLI hỗ trợ tính năng này, tối thiểu 2.32.0 theo [hướng dẫn AWS](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html). Repo có ví dụ SSO tên `dvqb-lab`, nhưng không cần tạo lại profile chỉ để giống tên ví dụ.

## Đăng nhập và kiểm đúng account

Chạy từ terminal, chọn **Ctrl Shift Create** trong trình duyệt:

```sh
aws login --profile dvqb-learn --region ap-southeast-2
```

Sydney ở lệnh này là endpoint đăng nhập đã dùng. Lệnh thao tác tài nguyên sẽ ghi rõ Singapore hoặc N. Virginia. Không hiểu region đăng nhập là nơi bắt buộc đặt mọi tài nguyên.

Kiểm danh tính trước thao tác tạo/xóa:

```sh
aws sts get-caller-identity \
  --profile dvqb-learn \
  --query '{Account:Account,Arn:Arn}' \
  --output json \
  --no-cli-pager
```

`Account` phải là `857146995969`, `Arn` thuộc role vận hành của account này. Nếu hiện management account `215009180804`, đăng nhập chọn lại project. Cờ `--no-cli-pager` giúp kết quả in trực tiếp, không vào trình xem trang riêng.

**Lỗi đã gặp:** session hết hạn, bạn chạy `aws login` không có profile nên CLI hỏi region của profile mặc định. Cách sửa là Ctrl+C rồi chạy lại đúng lệnh phía trên. `c` không phải mã region. Không tạo access key root để né lỗi session.

## Account và region là hai trục khác nhau

| Region | Vai trò trong cấu hình hiện tại |
|---|---|
| `ap-southeast-2` — Sydney | Nơi onboarding và endpoint đăng nhập đã dùng |
| `ap-southeast-1` — Singapore | VPC, ECS, RDS, S3, ECR và phần chính của lab |
| `us-east-1` — N. Virginia | ACM cho CloudFront và provider `aws.edge` của WAF |

[variables.tf](../../../infra/aws/lab/variables.tf) hiện chỉ chấp nhận Singapore cho `region`; [versions.tf](../../../infra/aws/lab/versions.tf) đặt provider edge ở N. Virginia và chặn account không khớp. Đổi region trong config không tự chuyển dữ liệu/tài nguyên đã tạo ở region cũ.

## SCP và thay đổi RegionFloor đã hướng dẫn

SCP là chính sách đặt giới hạn quyền cho account trong tổ chức. Role quản trị trong member account vẫn có thể bị SCP từ chối. Cho phép ở SCP chỉ gỡ một giới hạn, không tự cấp mọi quyền IAM.

Đường đi đã mở: AWS Settings → Management Account → AWS Organizations → Policies → Service control policies → `AdvancedModeRegionRestrictionSecurityControlPolicy`.

JSON bạn gửi có `UsEast1Partitional`, `UsWest2Partitional`, `RegionFloor`. Phần cuối có `Effect: Deny` và `StringNotEquals`: các thao tác thuộc phạm vi statement bị từ chối nếu region nằm ngoài danh sách. Vì vậy hướng dẫn chỉ thêm Singapore vào **danh sách ngoại lệ của RegionFloor**:

```json
"aws:RequestedRegion": [
  "ap-southeast-1",
  "ap-southeast-2",
  "unspecified",
  "us-east-1",
  "us-west-2"
]
```

Đây là đoạn thay thế trong JSON hiện có, không phải policy đầy đủ để dán đè. Giữ các statement khác. Policy người dùng cung cấp đã có `acm:*`, `cloudfront:*`, `wafv2:*` trong ngoại lệ `UsEast1Partitional`. Không cần Disable service control policies hoặc xóa toàn bộ guardrail để làm bước này. [AWS yêu cầu điều chỉnh RegionFloor khi mở thêm region](https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html).

## Kết quả đã kiểm

```sh
aws ec2 describe-vpcs \
  --region ap-southeast-1 \
  --profile dvqb-learn \
  --query 'Vpcs[].{VpcId:VpcId,Default:IsDefault}' \
  --output table \
  --no-cli-pager
```

Kết quả bạn gửi ngày 09/11 có `Default=True`, `VpcId=vpc-0282e4da8e8663110`. Điều này chứng minh phiên CLI đó đọc được VPC tại Singapore. Nó chưa chứng minh quyền tạo ECS/RDS/WAF hoặc dọn toàn bộ lab. Terraform sẽ tạo VPC riêng trong `network.tf`, không lấy VPC mặc định vừa thấy làm bằng chứng lab đã tồn tại.

## Nếu CLI được nhưng Terraform chưa lấy được credentials

Chưa có bằng chứng lỗi này trong hành trình hiện tại. Nếu gặp, kiểm phiên bản provider/SDK và lỗi xác thực cụ thể trước. Không in credential cache hoặc `export-credentials` ra chat. Có thể cần profile `credential_process` tương thích với `aws login`; chỉ thiết lập khi xác nhận công cụ hiện tại cần nó, dùng profile phụ khác tên để tránh tự gọi lặp. Giữ account guard của Terraform.

Tiếp: [Domain, DNS và HTTPS](04-domain-https.md).
