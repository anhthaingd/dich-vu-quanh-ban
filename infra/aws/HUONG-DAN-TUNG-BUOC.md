# Đưa Dịch vụ quanh bạn lên AWS — hướng dẫn từng bước cho chủ dự án

> **Kế hoạch đã đổi ngày 29/10/2026:** dùng [AWS-02 — môi trường học tạo/xóa hoàn toàn](../../docs/ke-hoach-trien-khai/de-xuat/AWS-02-lab-khong-phi-khi-tat.md) để hướng tới không phát sinh phí mới sau khi dọn hết. Hướng dẫn bên dưới thuộc pilot cũ và được giữ để tra cứu; chưa có quy trình/lệnh lab đã triển khai. **Chưa mua domain, tạo hosted zone/bucket state hoặc apply bộ pilot theo các chặng cũ.**

Ngày soạn: **29/10/2026**. Áp dụng cho cấu hình pilot khoảng **10 người**, region **Singapore (`ap-southeast-1`)**. Đi cùng [runbook kỹ thuật](README.md), [báo cáo và sơ đồ hệ thống](../../docs/ke-hoach-trien-khai/bao-cao/B00-12-ha-tang-aws.md).

**Việc có thể chuẩn bị ngay cho lab:** tài khoản/MFA/SSO ở chặng 1–2 và công cụ local ở chặng 4. Đọc lưu ý Free plan/Organizations trước khi bật SSO. Các chặng tạo tài nguyên pilot và phiếu tiến độ cũ không phải checklist triển khai lab; chờ công cụ lab đạt tiêu chí trong AWS-02 rồi mới tạo tài nguyên có phí.

Kết quả đầu tiên là **một link web HTTPS**, mở được trên máy khác dù máy Mac của bạn đã tắt. Sau đó mới tạo bản Android để cài, hoặc bản iPhone theo điều kiện của Apple. AWS chạy máy chủ và lưu dữ liệu; Expo/EAS tạo file cài app, đây là hai việc riêng.

Tài liệu này là hướng dẫn để bạn thực hiện sau, **không phải bằng chứng đã triển khai**. Chưa có tài khoản/domain/key thật được cấu hình hoặc tài nguyên AWS được tạo trong đợt chuẩn bị repo.

## 0. Biết trước chi phí và những giá trị cần giữ

Dự toán cấu hình ban đầu là **80–95 USD/tháng**, chưa gồm thuế, mua domain và SMS; đây là ước tính trong [AWS-01](../../docs/ke-hoach-trien-khai/de-xuat/AWS-01-ha-tang-pilot.md), không phải báo giá cố định. Ngân sách cảnh báo mặc định là **100 USD/tháng**, không tự ngắt dịch vụ khi chạm mức này. Trước khi làm, kiểm lại giá/quota trong tài khoản của bạn.

**Nếu tài khoản mới đang ở Free plan:** tạo AWS Organizations để bật IAM Identity Center theo hướng dẫn này sẽ chuyển sang Paid plan và làm hết hiệu lực tín dụng Free Tier, theo [AWS](https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html). Đọc thông báo AWS trước khi xác nhận; không coi phần triển khai này là miễn phí. Tài khoản đã có Organizations/SSO thì dùng cấu hình hiện có, không tạo lại.

| Bạn cần chuẩn bị | Điền/lưu ở đâu | Ví dụ trong tài liệu |
|---|---|---|
| Email chủ tài khoản, nhận được thư | Trình quản lý mật khẩu/tài khoản AWS | Email thật của bạn |
| Thẻ thanh toán và thông tin thanh toán | Chỉ nhập trực tiếp trên AWS | Không gửi vào chat hoặc repo |
| Domain thuộc quyền quản lý của bạn | Nhà đăng ký domain và Route 53 | `example.com` phải thay bằng domain thật |
| Email người thử, gồm email của bạn | `pilot_emails` trong file cấu hình riêng | Thay mọi `owner@example.com`, `tester@example.com` |
| Email nhận cảnh báo | `alert_email` | Một hộp thư bạn kiểm tra thường xuyên |
| AWS account ID, SSO portal/region, hosted zone ID | Ghi chú quản trị riêng | Không phải mật khẩu, nhưng không cần công khai |
| Geoapify key phía server và key bản đồ public | Secrets Manager / cấu hình build | Hai key riêng, không hoán đổi |

Tên miền mẫu, email mẫu, `<...>` và `Z_REPLACE_ME` đều là **chỗ cần thay**, không sao chép nguyên để triển khai. Không gửi mật khẩu, OTP, QR MFA, recovery code, private key, access key hoặc nội dung runtime secret vào chat/Git.

Mua domain/hosted zone có phí từ chặng 3. Bucket state có thể có phí nhỏ từ chặng 6. **RDS/ALB/WAF bắt đầu tính phí đáng kể ngay khi apply chặng 7**, dù app còn tắt. Đừng tạo sớm rồi để đó nhiều ngày.

## 1. Tạo hoặc kiểm tra tài khoản AWS và bật MFA cho root

1. Mở [AWS Console](https://console.aws.amazon.com/). Nếu chưa có tài khoản, chọn **Create an AWS Account**, nhập email của bạn, tên tài khoản và hoàn tất xác minh email/điện thoại/thanh toán. Chọn gói hỗ trợ cơ bản nếu chỉ cần pilot này; xem lại gói tài khoản và điều kiện tính phí trước khi xác nhận.
2. Đăng nhập bằng **Root user** để làm thiết lập ban đầu. Root là tài khoản sở hữu toàn bộ AWS; không dùng cho công việc hàng ngày.
3. Góc phải trên → tên tài khoản → **Security credentials** → **Multi-factor authentication (MFA)** → **Assign MFA device**. Đặt tên dễ nhớ, chọn passkey/security key hoặc ứng dụng Authenticator, làm theo bước xác nhận trên màn hình. Lưu cách khôi phục ở nơi quản trị an toàn. [Hướng dẫn MFA của AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/enable-mfa-for-root.html).
4. Ghi account ID gồm 12 chữ số. Không tạo access key cho root.
5. Với dịch vụ theo vùng, chọn góc phải trên **Asia Pacific (Singapore)**. Route 53, IAM, CloudFront và Billing có phần quản lý toàn cầu, không phải dịch vụ nào cũng hiện bộ chọn region.

**Đạt:** đăng nhập root có MFA, tài khoản đã được kích hoạt và bạn biết account ID. Chưa tạo EC2, RDS, ECS hay database bằng tay.

## 2. Tạo tài khoản vận hành SSO, không dùng key dài hạn

SSO là cách đăng nhập AWS bằng tài khoản người vận hành, lấy quyền tạm thời thay vì chép AWS access key vào máy.

### 2.1. Bật IAM Identity Center

1. Ô tìm kiếm AWS Console → **IAM Identity Center**. Với tài khoản mới, chọn Singapore trước khi bật. Nếu đã có một organization instance ở vùng khác, dùng instance đó và ghi lại **SSO region thực tế**; vùng SSO không bắt buộc trùng vùng chạy app.
2. Chọn cấu hình **Organization instance**, giữ **Enable multi-account permissions** bật để cấp quyền vào AWS accounts. Chọn **Single-Region** nếu màn hình hỏi kiểu instance; không cần cấu hình multi-region/KMS riêng cho pilot. Nếu AWS yêu cầu tạo Organizations, đọc lại lưu ý Free plan ở mục 0 rồi mới xác nhận. Không chọn account instance chỉ dành cho đăng nhập ứng dụng. [Quy trình bật chính thức](https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html).
3. Với tài khoản mới, dùng nguồn người dùng mặc định **Identity Center directory**. Nếu tài khoản thuộc tổ chức đã có nhà cung cấp danh tính, dùng cơ chế của tổ chức, không thay nguồn đăng nhập.

### 2.2. Thêm người vận hành và cấp quyền setup

1. **Groups → Create group**: đặt `dvqb-operators`.
2. **Users → Add user**: Username `dvqb-owner`; Email là email thật của bạn, nhập họ/tên; chọn gửi email hướng dẫn tạo mật khẩu. Thêm user vào nhóm `dvqb-operators` và hoàn tất.
3. **Permission sets → Create permission set → Predefined permission set**: chọn **AdministratorAccess**. Dùng tên permission set mà console tạo, thường là `AdministratorAccess`, và ghi lại tên thật để chọn khi cấu hình CLI. Session duration đặt **1 hour** nếu có phần chỉnh sửa. Quyền này dành cho người setup vì Terraform phải tạo IAM và hạ tầng; đây là quyền rộng, không cấp cho API hay người dùng app.
4. **AWS accounts** → chọn đúng account ID → **Assign users or groups** → nhóm `dvqb-operators` → chọn permission set vừa tạo → hoàn tất. [Các bước tạo user/nhóm/quyền của AWS](https://docs.aws.amazon.com/singlesignon/latest/userguide/quick-start-default-idc.html).
5. **Settings → Authentication → Multi-factor authentication → Configure**: chọn **Every time they sign in**, và **Require them to register an MFA device at sign in** cho người chưa đăng ký MFA. Lưu. [Tần suất MFA](https://docs.aws.amazon.com/singlesignon/latest/userguide/mfa-getting-started.html), [bắt buộc đăng ký thiết bị](https://docs.aws.amazon.com/singlesignon/latest/userguide/how-to-configure-mfa-device-enforcement.html).
6. Mở thư mời, đặt mật khẩu và đăng ký MFA. Lấy **AWS access portal URL** ở IAM Identity Center Dashboard/Settings, dạng `https://...awsapps.com/start`.
7. Đăng xuất root, đăng nhập portal bằng `dvqb-owner`, chọn đúng AWS account và permission set, mở **Management console**.

**Đạt:** bạn vào được Console qua portal với MFA. Đã lưu portal URL, SSO region và tên permission set. Các chặng sau dùng tài khoản vận hành này. Sau ổn định, rà quyền vận hành theo nhu cầu; không bỏ quyền setup giữa quá trình apply.

## 3. Chuẩn bị domain và Route 53

Domain giúp API có địa chỉ HTTPS và email có danh tính gửi. Web/app quản trị ban đầu dùng URL CloudFront do AWS cấp, chưa cần mua thêm domain cho từng giao diện.

1. Nếu chưa có domain, mua một domain bạn có quyền quản lý DNS. Có thể dùng nhà đăng ký hiện tại hoặc Route 53; xem giá gia hạn trước khi mua. Không cần chuyển nhà đăng ký sang AWS.
2. Console → **Route 53 → Hosted zones**. Nếu domain mua qua Route 53 đã có public hosted zone tự tạo, dùng zone đó. Nếu chưa có: **Create hosted zone** → Domain name là domain thật, ví dụ `example.com` → **Public hosted zone** → Create.
3. Mở zone, lưu **Hosted zone ID** dạng `Z...`, và bốn nameserver ở record **NS**.
4. Tại trang quản lý domain của nhà đăng ký, đổi nameserver sang đúng bốn NS vừa lấy. **Nếu domain đang phục vụ web/email khác, chuyển đầy đủ record đang dùng, đặc biệt MX/TXT, sang zone mới trước khi đổi NS** để tránh mất dịch vụ. Chọn domain thử riêng nếu chưa muốn chuyển DNS đang chạy.
5. Terminal trên Mac, thay domain thật rồi chạy:

```sh
dig +short NS example.com
```

**Đạt:** kết quả khớp bốn NS của đúng hosted zone. Chờ DNS cập nhật nếu còn trả NS cũ; không apply chặng 7 khi zone chưa được ủy quyền. [Hướng dẫn Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-new-domain.html).

## 4. Kiểm công cụ trên Mac và đăng nhập AWS CLI

Mở **Terminal**. Các lệnh bên dưới chạy ở thư mục gốc repo, trừ khối EAS có `cd apps/mobile`.

```sh
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban
node --version
npm --version
aws --version
terraform version
docker version
```

Repo yêu cầu Node **24.22.1**, npm **11.5.1**. Bộ hạ tầng đã kiểm bằng Terraform **1.13.3** và AWS CLI v2; giữ file khóa provider hiện có. Docker Desktop phải đang chạy, `docker version` thấy cả Client và Server. Trên máy khác hãy thay đường dẫn repo. Nếu thiếu công cụ, dùng [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), [Terraform](https://developer.hashicorp.com/terraform/install), [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/) và phiên bản Node của repo trước khi đi tiếp.

```sh
aws configure sso --profile dvqb-setup
```

| CLI hỏi | Điền |
|---|---|
| SSO session name | `dvqb` |
| SSO start URL | Portal URL của chặng 2 |
| SSO region | Region của IAM Identity Center, tài khoản mới theo hướng dẫn này là `ap-southeast-1` |
| SSO registration scopes | Enter để giữ `sso:account:access` |
| Account / Role | Đúng account ID và permission set đã cấp ở chặng 2 |
| CLI default client Region | `ap-southeast-1` |
| CLI default output format | `json` |

Trình duyệt mở thì đăng nhập SSO và xác nhận yêu cầu của CLI. Sau đó:

```sh
aws sso login --profile dvqb-setup
export AWS_PROFILE=dvqb-setup
export AWS_REGION=ap-southeast-1
aws sts get-caller-identity
```

**Đạt:** trường `Account` đúng 12 chữ số đã ghi, `Arn` là role SSO, không phải root. Nếu sai, dừng trước mọi `apply`. Nếu hết phiên khi đang làm, chạy lại `aws sso login --profile dvqb-setup`. Mỗi cửa sổ Terminal mới cần đặt lại hai biến `export` ở trên. [AWS CLI SSO](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html).

## 5. Kiểm phiên bản code trước khi tạo tài nguyên tính phí

```sh
git status --short
```

**Tại thời điểm soạn hướng dẫn, phần AWS và bản sửa gần đây vẫn chưa commit/push.** Không lấy SHA của commit cũ để gắn nhãn image chứa code mới. Trước lúc build bản triển khai, cần chốt phạm vi code đã review/kiểm thử thành một commit được bạn cho phép; bạn có thể yêu cầu “chuẩn bị phiên bản triển khai và commit phần đã duyệt”. Hướng dẫn này không tự thực hiện commit/push.

Sau khi chốt phiên bản, working tree phục vụ triển khai phải sạch, ngoài các file cấu hình riêng đã bị ignore. Cài dependencies bằng `npm ci` khi checkout mới hoặc dependencies thay đổi. Chạy bộ kiểm local và container theo [runbook mục 2](README.md#2-kiểm-không-cần-aws); bộ hồi quy đầy đủ là:

```sh
docker compose -f infra/compose.yaml --profile test up -d --wait db-test
npm run sdd:check -- --change SDD-PROJECT --phase prepare
npm run sdd:run -- --change SDD-PROJECT
npm run sdd:check -- --change SDD-PROJECT --phase verify
```

**Đạt:** có phiên bản code rõ ràng, kiểm local/container đạt trên phiên bản đó. Kết quả local không thay cho kiểm AWS thật ở chặng 12. Không cần đưa Google Drive/ui-ux vào đợt triển khai này.

## 6. Tạo nơi lưu cấu hình Terraform

Terraform là công cụ tạo hạ tầng từ file trong repo. “State” là hồ sơ giúp nó biết tài nguyên nào đang quản lý; không xóa state khi gặp lỗi.

```sh
terraform -chdir=infra/aws/bootstrap init
terraform -chdir=infra/aws/bootstrap plan -out=bootstrap.tfplan
```

Đọc plan: account/region đúng, chỉ tạo bucket state và cơ chế bảo vệ đi kèm. Khi đồng ý tạo tài nguyên đó, chạy:

```sh
terraform -chdir=infra/aws/bootstrap apply bootstrap.tfplan
terraform -chdir=infra/aws/bootstrap output state_bucket
```

Lưu tên bucket được in. **Chỉ lần đầu**, khi hai file bên dưới chưa tồn tại, tạo bản cấu hình riêng:

```sh
cp infra/aws/backend.hcl.example infra/aws/backend.hcl
cp infra/aws/pilot.tfvars.example infra/aws/pilot.tfvars
```

Nếu đã có file từ lần trước, mở sửa file hiện có, không chạy `cp` ghi đè. Trong VS Code, mở `infra/aws/backend.hcl`:

```hcl
bucket = "TEN_BUCKET_VUA_NHAN"
key = "pilot/terraform.tfstate"
region = "ap-southeast-1"
encrypt = true
use_lockfile = true
```

Thay `TEN_BUCKET_VUA_NHAN` bằng output thật. Giữ bản sao mã hóa của `infra/aws/bootstrap/terraform.tfstate` trong nơi quản trị riêng; không commit state, plan hoặc file cấu hình cá nhân.

**Đạt:** bucket state có versioning, mã hóa, chặn public; `backend.hcl` trỏ đúng bucket. Nếu đã chạy một phần rồi bị lỗi, đăng nhập lại và `plan` để đối chiếu; không tạo bucket/DB thay thế bằng tay.

## 7. Điền cấu hình và tạo hạ tầng, app vẫn tắt

Mở `infra/aws/pilot.tfvars`, sửa theo bảng sau. Đây là file riêng, đã có quy tắc Git ignore.

| Trường | Giá trị cần điền |
|---|---|
| `region`, `environment` | Giữ `"ap-southeast-1"`, `"pilot"` |
| `zone_id` | Hosted zone ID của chặng 3 |
| `api_domain` | `"api.example.com"`, thay domain thật |
| `ses_domain` | `"example.com"`, cùng public hosted zone ở trên |
| `ses_from` | `"noreply@example.com"`, thay bằng địa chỉ gửi thuộc domain của bạn |
| `alert_email` | Email thật nhận cảnh báo |
| `pilot_emails` | Danh sách email thật, **bao gồm email chủ dự án**, trước mắt 1–2 người rồi tăng đến khoảng 10 |
| `monthly_budget_usd` | Giữ `"100"` nếu phù hợp ngân sách bạn chấp nhận |
| `service_enabled`, `image_digest` | Giữ `false`, `""` ở lần đầu |
| `min_tasks`, `max_tasks` | Giữ `1`, `1` |
| `sms_enabled`, `pilot_phones` | Giữ `false`, `[]` đến chặng SMS |

Không điền mật khẩu DB/AWS key/Geoapify key vào file này. Địa chỉ `ses_from` là danh tính gửi, không tự tạo hộp thư nhận email. `alert_email` và email người thử phải là hộp thư đang dùng được.

```sh
terraform -chdir=infra/aws init -reconfigure -backend-config=backend.hcl
terraform -chdir=infra/aws plan -var-file=pilot.tfvars -out=pilot.tfplan
```

**Dừng đọc plan trước apply:** đúng account và Singapore; không NAT Gateway; API desired count bằng 0; DB private, không mở cổng DB ra internet; chỉ ALB nhận HTTPS công khai. Không có xóa/thay DB hoặc bucket đang dùng ngoài dự định. Nếu khác kỳ vọng, giữ nguyên plan và kiểm lỗi trước, không dùng `-auto-approve`.

**Từ lệnh tiếp theo, hạ tầng chính bắt đầu có phí dù chưa có người dùng:**

```sh
terraform -chdir=infra/aws apply pilot.tfplan
terraform -chdir=infra/aws output -json deployment
```

Ghi các trường output vào ghi chú quản trị riêng:

| Output | Dùng vào việc gì |
|---|---|
| `api_origin` | URL API, ví dụ `https://api.domain-that` |
| `repository_url`, `repository_name` | Nơi lưu image API trên ECR |
| `cluster`, `service`, `log_group` | Xem ECS và log khi lỗi |
| `runtime_secret_arn` | Xác định đúng secret khi điền Geoapify |
| `web.web.url` | Link web gửi cho người dùng sau publish |
| `web.admin.url` | Link giao diện quản trị dành riêng người có quyền |

**Đạt:** apply thành công; ACM certificate **Issued**; RDS **Available**; ECS service có desired count 0. CloudFront chưa có nội dung nên trang lỗi lúc này là bình thường. Nếu ACM chờ lâu, kiểm NS và record xác minh, không tắt HTTPS để vượt bước.

Mở email `alert_email`, bấm **Confirm subscription** của SNS để nhận cảnh báo hệ thống. Console → **Billing and Cost Management → Budgets**: kiểm ngân sách do Terraform tạo, email và ngưỡng thực chi 80%/dự báo 100%. Kiểm yêu cầu xác minh email nếu AWS gửi. Đây là ngân sách toàn account, có thể gồm dịch vụ khác; không phải trần tự dừng. [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html).

## 8. Đưa bản API lên ECR và khởi tạo database

Image là gói chương trình để ECS chạy. Thay giá trị `<repository_url>` bên dưới bằng output chặng 7, bỏ cả dấu `< >`. Chỉ dùng SHA khi đã đạt chặng 5.

```sh
export DVQB_ECR_URL='<repository_url>'
export DVQB_RELEASE_TAG="$(git rev-parse HEAD)"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${DVQB_ECR_URL%%/*}"
docker build --platform linux/amd64 -f infra/aws/Dockerfile -t "$DVQB_ECR_URL:$DVQB_RELEASE_TAG" .
docker push "$DVQB_ECR_URL:$DVQB_RELEASE_TAG"
aws ecr describe-images --region "$AWS_REGION" --repository-name "${DVQB_ECR_URL#*/}" --image-ids "imageTag=$DVQB_RELEASE_TAG" --query 'imageDetails[0].imageDigest' --output text
```

Ghi lại kết quả `sha256:...`, không dùng tag `latest`. Console → **ECR → Repositories → repository vừa tạo → Images** → kiểm scan findings; giải quyết lỗ hổng nghiêm trọng trước khi bật service. Scan không tự chặn push. Nếu báo tag đã tồn tại, ECR đang chặn ghi đè đúng thiết kế: dùng digest của bản đã có hoặc chốt phiên bản code mới, không tắt bảo vệ tag.

Trong `pilot.tfvars`, đổi **chỉ** `image_digest` thành `"sha256:..."`, vẫn giữ `service_enabled=false`. Chạy:

```sh
terraform -chdir=infra/aws plan -var-file=pilot.tfvars -out=pilot.tfplan
terraform -chdir=infra/aws apply pilot.tfplan
node scripts/aws/operate.mjs ops bootstrap
```

Đọc plan trước apply như chặng 7. Script bootstrap tự chạy một task ECS ngắn hạn: tạo secret ngẫu nhiên, schema/danh mục nền và tài khoản DB giới hạn quyền cho API. Không nạp tài khoản DEMO hoặc admin có mật khẩu mặc định.

**Đạt:** script in `Ops completed successfully.`. Nếu lỗi/hết thời gian chờ, kiểm ECS task thực tế và log trước khi chạy lại. **CloudWatch → Log groups → `/ecs/dvqb-pilot` → stream ops** có log; ECS task có `Stopped reason`/exit code. Không bật API khi bootstrap chưa thành công, không xóa secret/DB để thử lại.

## 9. Chuẩn bị email, bản đồ và SMS theo phạm vi thử

### 9.1. Email SES — cần cho xác minh tài khoản

1. Console chọn Singapore → **Amazon SES → Configuration → Identities**. Domain của `ses_domain` đã được Terraform tạo, chờ trạng thái **Verified**, kiểm DKIM đạt. Không tạo thêm domain identity trùng bằng tay.
2. Nếu account còn **sandbox**: ở Identities → **Create identity → Email address**, nhập email thật của bạn → Create. Mở email xác minh của AWS và bấm liên kết. Làm tương tự cho từng email người thử ngoài domain đã xác minh.
3. Giữ danh sách người thử khớp `pilot_emails`. Hai lớp kiểm khác nhau: được AWS cho nhận email và được app cho đăng ký. Nếu cần gửi ngoài sandbox, **Account dashboard → Request production access**, khai đúng mục đích email giao dịch/xác minh và cách thu thập người nhận; chờ AWS duyệt, không coi gửi form là đã được duyệt.

**Đạt:** domain/DKIM Verified, email người thử đáp ứng điều kiện sandbox hoặc tài khoản đã được cấp production access. Xác minh identity và sandbox theo từng region; Nhật/Singapore không dùng chung trạng thái. [SES identities](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html), [sandbox và production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).

### 9.2. Geoapify — cần cho gợi ý địa chỉ và bản đồ

1. Đăng nhập [Geoapify MyProjects](https://myprojects.geoapify.com/), dùng gói/quota miễn phí phù hợp để thử, chưa bật billing tự động. **My projects → Create project**, đặt tên `dvqb-pilot`; project mới có key đầu tiên. Mở project → **API keys → Create a new API key (+)** để có **hai API key riêng**: server và public map. Đặt mô tả để phân biệt; hai key trong một project vẫn dùng chung quota. [Hướng dẫn key và giới hạn của Geoapify](https://myprojects.geoapify.com/help/api-keys/).
2. Console AWS → **Secrets Manager → Secrets → `dvqb-pilot/runtime`** (đối chiếu `runtime_secret_arn`) → **Retrieve secret value → Edit**. Chỉ thay giá trị `GEOAPIFY_API_KEY` bằng **server key**; giữ nguyên `DATABASE_URL`, `AUTH_SECRET`, `CURSOR_SECRET`, `MESSAGE_SECRET`, `ADMIN_SECRET` và mọi key khác. Save. Không chụp hoặc copy toàn bộ JSON vào chat.
3. Với **public map key**, giới hạn website/origin theo URL `web.web.url`, quota và ứng dụng thực tế theo cơ chế Geoapify. Native không gửi browser origin như web, nên kiểm điều kiện key trên thiết bị khi làm chặng 13. Không áp giới hạn khiến API từ ECS hoặc app thật bị chặn; kiểm log/lỗi provider nếu nhận 403.
4. Public map key sẽ được đặt trong shell ở chặng 10 và EAS ở chặng 13. Key này đi vào app và có thể bị người dùng nhìn thấy; không dùng lại server key. Nếu đổi runtime secret sau khi API đã chạy, cần task ECS mới để nạp giá trị mới.

**Đạt:** server key nằm trong Secrets Manager, public key riêng sẵn sàng cho build. Chưa coi bản đồ đã hoạt động cho đến khi kiểm trên web/thiết bị thật.

### 9.3. SMS — cần trước khi thử vai trò người cung cấp

Có thể giữ `sms_enabled=false` để mở web và thử đăng ký email trước. **Tạo hồ sơ người cung cấp vẫn cần phone_verified**, nên luồng có người cung cấp/nhận việc chưa hoàn chỉnh khi SMS còn tắt. Không sửa DB để giả xác minh.

1. Singapore → **Amazon SNS → Text messaging (SMS)**. Kiểm trạng thái sandbox, hạn mức chi và yêu cầu **origination identity** cho quốc gia đích trong AWS End User Messaging SMS; hoàn tất đăng ký nếu AWS/quốc gia yêu cầu. Xác minh số sandbox không tự thay thế đăng ký người gửi.
2. **Sandbox destination phone numbers → Add phone number**: nhập mã quốc gia/số thật, nhận OTP và **Verify phone number**. Lặp cho người thử. AWS sandbox tối đa 10 số; hạn mức chi/quota gửi vẫn áp dụng. [Các bước thêm số của AWS](https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox-verifying-phone-numbers.html), [sandbox](https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox.html).
3. Đặt hạn mức chi SMS phù hợp trong phần SMS preferences và kiểm quota hiện tại; nếu cần tăng, xin AWS duyệt trước. Không xem hạn mức SMS là bảo đảm tuyệt đối không vượt phí. [Hạn mức chi SMS](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-awssupport-spend-threshold.html).
4. Khi đã sẵn sàng, sửa `pilot.tfvars`: `sms_enabled=true`, `pilot_phones=["+84SO_THAT"]`, thay bằng số đầy đủ đúng định dạng quốc tế. Chạy plan, đọc rồi apply như chặng 7. Kiểm nhận OTP trên **chính app** sau khi API bật; OTP xác minh số trên AWS Console là một bước khác.

**Đạt cho luồng có người cung cấp:** app gửi và xác nhận OTP thật trên số đã mời. Nếu chưa có điều kiện sender/quota/chi phí, giữ SMS tắt và ghi phạm vi thử bị giới hạn.

## 10. Bật API và xuất web

Sửa `pilot.tfvars`: `service_enabled=true`, giữ `min_tasks=1`, `max_tasks=1` và digest đã kiểm. Chạy plan, đọc rồi apply:

```sh
terraform -chdir=infra/aws plan -var-file=pilot.tfvars -out=pilot.tfplan
terraform -chdir=infra/aws apply pilot.tfplan
aws ecs wait services-stable --region ap-southeast-1 --cluster dvqb-pilot --services dvqb-pilot-api
```

ECS → cluster `dvqb-pilot` → service `dvqb-pilot-api`: Running/Desired = **1/1**, target group healthy. Mở `https://api.DOMAIN-THAT/v1/ready` bằng trình duyệt, thay domain thật; phải trả thành công. Lần bật đầu chưa có bản chạy tốt trước đó để tự rollback, nên lỗi phải được xử lý theo log.

Đặt public key của bạn trong Terminal rồi publish; giá trị dưới đây chỉ là placeholder:

```sh
export EXPO_PUBLIC_GEOAPIFY_MAPS_KEY='<public-map-key>'
node scripts/aws/operate.mjs publish-web
node scripts/aws/operate.mjs smoke
```

Script tự lấy API HTTPS từ Terraform, build web/admin, upload lên S3 rồi làm mới CloudFront. Không cần chạy Metro/ngrok hoặc mở cổng máy Mac. Chờ CloudFront cập nhật nếu còn thấy trang cũ.

**Đạt:** `smoke` in `OK` cho health, ready, danh mục, web và admin. Mở `web.web.url` trên điện thoại qua 4G/5G, tắt server local vẫn tải được. Link để gửi người thử là **`web.web.url`**, không phải `api_origin` hoặc `web.admin.url`.

## 11. Tạo tài khoản chủ dự án và bật MFA quản trị app

1. Mở link web, đăng ký bằng email của bạn có trong `pilot_emails`, nhận email và hoàn tất xác minh. Chọn mật khẩu riêng cho app. Không dùng mật khẩu root/SSO AWS.
2. Từ thư mục gốc repo, thay email thật đã xác minh:

```sh
node scripts/aws/operate.mjs ops bootstrap-admin 'owner@example.com'
```

3. Đợi `Ops completed successfully.`, đăng nhập lại app/admin, mở `web.admin.url`. Làm theo phần thiết lập MFA bằng Authenticator và lưu recovery codes ngoài hệ thống.
4. Kiểm tài khoản thường không được truy cập thao tác quản trị. Bootstrap admin chỉ dành lần đầu khi chưa có admin; những lần cấp quyền sau dùng luồng quản trị có MFA.

**Đạt:** chủ dự án vào quản trị qua MFA; tài khoản thường vẫn chỉ có quyền thường. MFA quản trị app độc lập với MFA AWS đã bật ở chặng 1–2.

## 12. Kiểm thật trước khi mời khoảng 10 người

Kiểm bằng tài khoản thử được mời, không dùng dữ liệu cá nhân nhạy cảm hay giao dịch tiền thật. Đánh dấu sau khi tự kiểm, không dựa riêng vào `smoke`:

- [ ] Web mở trên mạng ngoài/máy khác khi máy Mac đã tắt server local.
- [ ] Đăng ký, xác minh email, đăng nhập/đăng xuất và khôi phục tài khoản chạy qua SES thật.
- [ ] Email ngoài `pilot_emails` bị từ chối đăng ký; người thường không có quyền quản trị.
- [ ] Bản đồ/gợi ý địa chỉ hoạt động, quota và lỗi provider được nhận biết.
- [ ] Ảnh tải lên/xem đúng quyền, ảnh riêng không truy cập được bằng người không có quyền.
- [ ] Nếu thử người cung cấp: OTP SMS thật, hồ sơ, tìm dịch vụ, gửi/nhận yêu cầu, liên hệ và hoàn tất trong phạm vi được hỗ trợ đã kiểm bằng ít nhất hai tài khoản. Không dùng DEMO để thay provider thật.
- [ ] Chủ dự án có MFA/recovery codes quản trị app; email cảnh báo SNS đã xác nhận, Budget có đúng email.
- [ ] Diễn tập khôi phục DB/ảnh sang tài nguyên riêng theo [runbook mục 9](README.md#9-backup-và-phục-hồi), kiểm dữ liệu đọc được và ghi thời gian phục hồi. Chưa diễn tập thì ghi rõ, chưa đánh dấu mục này đạt.

Kiểm tải nhỏ cho danh mục, thay URL thật (không thêm `/v1`):

```sh
node scripts/aws/load.mjs 'https://api.example.com' 10 100
```

Kết quả chỉ chứng minh GET danh mục với 10 worker/100 request, không đại diện 10 hành trình nghiệp vụ đồng thời. Trong lúc kiểm, xem **CloudWatch Alarms**, ECS CPU/memory, ALB lỗi/độ trễ và RDS memory/storage. Cần giữ bản ghi ngày, phiên bản/digest, hành trình, kết quả, lỗi tồn tại; che dữ liệu nhạy cảm.

**Đạt:** hành trình định cho người thử đã chạy thật, không còn lỗi chặn và có kế hoạch phục hồi đã kiểm. Sau đó thêm dần email tới khoảng 10 người trong `pilot_emails`, kiểm sandbox SES/SMS tương ứng, plan/apply lại; gửi link web và phạm vi tính năng đã kiểm. Push, cuộc gọi và ngân hàng thật chưa được bật trong cloud pilot; không đưa chúng vào cam kết dùng thử.

## 13. Cho người dùng tải app — làm sau khi web/API ổn định

### Android: bản APK nội bộ

APK là file cài Android, không cần lên Google Play để thử nhóm nhỏ. Profile `pilot` đã có trong [eas.json](../../apps/mobile/eas.json). Cần tài khoản Expo và quyền sở hữu EAS project đúng của bạn.

```sh
cd apps/mobile
npx eas-cli login
npx eas-cli whoami
npx eas-cli project:info
```

Nếu project chưa liên kết, chạy `npx eas-cli init`, chọn/tạo project thuộc tài khoản hoặc organization của bạn, kiểm owner/project ID trước khi chấp nhận; thao tác này có thể cập nhật app config, cần review và kiểm lại cấu hình trước build. Không nhận nhầm quyền sở hữu project khác. Kiểm `google-services.json` hiện có đúng Firebase project của bạn; đây là cấu hình client, không thay bằng server/service-account key.

Thay API domain và public map key thật:

```sh
npx eas-cli env:set --environment preview --name EXPO_PUBLIC_API_URL --value 'https://api.example.com/v1' --visibility plaintext
npx eas-cli env:set --environment preview --name EXPO_PUBLIC_GEOAPIFY_MAPS_KEY --value '<public-map-key>' --visibility plaintext
npx eas-cli build --profile pilot --platform android
```

Lần đầu, làm theo EAS để tạo/chọn Android signing keystore thuộc project của bạn và lưu quyền truy cập/bản sao an toàn. EAS có thể có quota hoặc phí build; xem lựa chọn trước khi trả phí. Khi build thành công, mở link kết quả EAS, tải **APK**, cài thử trên điện thoại Android; chỉ cho phép cài từ nguồn đó khi máy yêu cầu và bạn đã kiểm đúng file/link của mình. Gửi link nội bộ cho người thử có email được mời. Bản APK vẫn phải đăng nhập vào AWS, link tải không thay quyền trong app.

**Đạt:** cài APK lên thiết bị thật, tắt Metro/server local và kiểm lại hành trình đăng nhập/địa chỉ/ảnh. Không chỉ kiểm emulator hoặc thông báo build success. Giữ cùng signing key cho bản cập nhật. [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/).

### iPhone: web trước, internal hoặc TestFlight sau

Profile `pilot` hiện là **internal distribution**: iPhone thật cần Apple Developer, thiết bị đăng ký UDID và provisioning phù hợp. Nếu dùng hướng này, trong thư mục `apps/mobile` chạy `npx eas-cli device:create`, mở link đăng ký trên từng iPhone dự định thử, sau đó build:

```sh
npx eas-cli build --profile pilot --platform ios
```

Làm theo bước Apple credentials/provisioning của EAS, xác nhận đúng team và thiết bị. Kiểm cài từ link internal trên thiết bị đã đăng ký. Có thể phát sinh phí Apple/EAS; không chia sẻ Apple password/private signing key vào chat.

**TestFlight là bước riêng:** cần cấu hình profile store, App Store Connect, ký/gửi build và quy trình beta của Apple; repo chưa chuẩn bị trọn đường phát hành TestFlight. Không dùng lệnh build `pilot` rồi coi đó là bản TestFlight. Trong lúc chưa làm phần này, người dùng iPhone vẫn dùng link web. Nếu muốn phát hành TestFlight/Google Play chính thức, thực hiện một đợt phát hành riêng sau khi kiểm bản pilot; không cần chờ store để chia sẻ web. [Expo về iOS internal và đăng ký thiết bị](https://docs.expo.dev/build/internal-distribution/).

Sau khối EAS, chạy `cd ../..` để về root repo trước các lệnh Terraform/script AWS tiếp theo.

## 14. Dùng thử hàng ngày, xử lý lỗi và mở rộng

| Hiện tượng | Nơi kiểm và việc làm đầu tiên |
|---|---|
| CLI báo phiên hết hạn | `aws sso login --profile dvqb-setup`; kiểm lại account bằng STS |
| ACM Pending validation | Route 53 NS/record xác minh và domain ở đúng zone; không tạo lại chứng chỉ liên tục |
| ALB 503 hoặc API chưa ready | ECS Tasks/Stopped reason, target group health, CloudWatch `/ecs/dvqb-pilot`; kiểm bootstrap, digest, secret và DB/TLS |
| Web trắng/trang cũ | API ready trước; log `publish-web`, đúng URL CloudFront và invalidation; không sửa trực tiếp bucket public |
| Không nhận email | SES Singapore: domain/DKIM, recipient sandbox, quota, spam/bounce; email thuộc allowlist app |
| Không nhận SMS | SNS sandbox, số đích/allowlist, sender theo quốc gia và hạn mức; không bấm gửi OTP liên tục |
| Bản đồ 403 hoặc không gợi ý | Hai key đúng vị trí, restriction/quota Geoapify; sau sửa secret cho task mới nạp lại |
| Chi phí tăng | Billing/Cost Explorer theo dịch vụ, Budget/email; không cho rằng task count 0 sẽ dừng tiền DB/ALB/WAF |

Nếu sửa runtime secret sau khi API đã bật, cho ECS nạp lại bằng deployment mới, rồi chờ service stable và chạy smoke:

```sh
aws ecs update-service --region ap-southeast-1 --cluster dvqb-pilot --service dvqb-pilot-api --force-new-deployment
aws ecs wait services-stable --region ap-southeast-1 --cluster dvqb-pilot --services dvqb-pilot-api
node scripts/aws/operate.mjs smoke
```

Không tạo lại ngẫu nhiên `ADMIN_SECRET`/`MESSAGE_SECRET`: dữ liệu đã mã hóa phụ thuộc các khóa đó. Khôi phục DB phải có khóa tương ứng. Khi lỗi, cung cấp tên chặng, thời điểm, task ID/HTTP status và log đã che thông tin nhạy cảm; không gửi toàn bộ state/secret/env.

**Khi nâng cấp code:** dùng [runbook mục 8](README.md#8-nâng-cấp-rollback-thay-secret), giữ digest đang chạy, migration bằng ops image mới trước khi chuyển API, kiểm tương thích và chuẩn bị rollback. Không chạy lại toàn bộ bootstrap thay cho quy trình nâng cấp.

**Khi tăng người dùng:** đo tải/DB trước; có thể tăng `min_tasks=2`, `max_tasks=4`, `db_class="db.t4g.small"`, `db_multi_az=true` qua plan/apply khi đã tính lại phí. Đây là lựa chọn mở rộng, không phải yêu cầu bật ngay. Multi-AZ là bản DB dự phòng khi một vùng sẵn sàng lỗi; cấu hình một task/Single-AZ hiện tại có thể gián đoạn. Realtime giữ tắt đến khi có cơ chế phân phối sự kiện chung giữa nhiều task. Thêm email/số mời cũng cần xét quota SES/SMS.

**Nếu tạm ngừng thử:** `service_enabled=false` chỉ dừng task API; DB/ALB/WAF, lưu trữ và một số dịch vụ khác vẫn có phí. Không chạy `terraform destroy` để “thử dọn” vì dữ liệu có vòng đời riêng và đang có bảo vệ xóa. Khi muốn kết thúc pilot, lập phương án backup, giữ/xóa dữ liệu và tài nguyên còn tính phí theo plan cụ thể trước khi thực hiện.

## Phiếu tiến độ để bạn tự đánh dấu

- [ ] 1. AWS được kích hoạt, root có MFA.
- [ ] 2. SSO portal vào được account bằng user vận hành có MFA.
- [ ] 3. Có domain, hosted zone ID, NS đã trỏ đúng.
- [ ] 4. CLI vào đúng account; công cụ local sẵn sàng.
- [ ] 5. Phiên bản code đã được chốt và kiểm; chưa dùng SHA cũ cho code chưa commit.
- [ ] 6. Bucket state và cấu hình riêng đã giữ an toàn.
- [ ] 7. Đã đọc plan/chi phí, tạo hạ tầng, xác nhận email cảnh báo.
- [ ] 8. Có image digest và bootstrap DB thành công.
- [ ] 9. SES/Geoapify sẵn sàng; SMS đã kiểm hoặc ghi rõ phạm vi chưa thử.
- [ ] 10. API ready, web/admin publish thành công.
- [ ] 11. Chủ dự án có quyền quản trị và MFA app.
- [ ] 12. Đã kiểm hành trình AWS thật/khôi phục, đủ điều kiện mời nhóm nhỏ.
- [ ] 13. Nếu cần cài app: APK/iOS internal đã kiểm thiết bị thật; TestFlight/store là đợt riêng.

Giữ các ô này chưa đánh dấu cho tới khi bạn thực sự làm. Tài liệu được đối chiếu với code và nguồn chính thức ngày 29/10/2026; giao diện Console, quota và giá có thể thay đổi. Khi màn hình khác hướng dẫn, đối chiếu nguồn được dẫn và trạng thái tài khoản, không đoán rồi bỏ qua bước kiểm.
