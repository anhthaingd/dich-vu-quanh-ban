# AWS pilot — hướng dẫn triển khai và vận hành

> **Hướng hiện hành ngày 29/10/2026:** [AWS-02 — deploy để học, dọn hết tài nguyên có phí](../../docs/ke-hoach-trien-khai/de-xuat/AWS-02-lab-khong-phi-khi-tat.md). Chế độ lab mới ở mức kế hoạch, chưa có script để chạy. Không tạo bucket state, mua domain hoặc apply các lệnh pilot bên dưới theo mục tiêu không giữ phí khi nghỉ; Terraform hiện có vẫn giữ bảo vệ dữ liệu pilot.

28/10/2026 · [Thiết kế/giới hạn](../../docs/ke-hoach-trien-khai/de-xuat/AWS-01-ha-tang-pilot.md) · [Báo cáo học code](../../docs/ke-hoach-trien-khai/bao-cao/B00-12-ha-tang-aws.md).

**Tham khảo pilot cũ:** [hướng dẫn từng bước dành cho chủ dự án](HUONG-DAN-TUNG-BUOC.md) ghi các màn hình/giá trị/lệnh của bộ pilot đã chuẩn bị. Đọc thông báo đổi hướng ở đầu file trước; chỉ phần tài khoản/MFA/SSO và công cụ local còn phù hợp để chuẩn bị ngay cho lab.

Đây là bộ chuẩn bị triển khai, chưa có AWS endpoint thật. Các lệnh `apply`, `run-task`, upload dưới đây dành cho chủ tài khoản khi bắt đầu triển khai và có thể phát sinh phí. Tất cả chạy từ root repo trừ khi có `-chdir`. Không dùng database hoặc secret local/DEMO cho cloud.

## 1. Những thứ chủ dự án cần chuẩn bị

| Cần | Dùng ở đâu | Cách xử lý |
|---|---|---|
| Tài khoản AWS, billing, region Singapore | Toàn bộ hạ tầng | Bật MFA tài khoản root, không tạo access key root; dùng IAM Identity Center/SSO cho người vận hành |
| Quyền tạo VPC/ECS/RDS/IAM/ACM/Route53/S3/WAF/CloudFront/SES/SNS/Budget | Terraform lần đầu | Role setup riêng; role build đã giới hạn trong code, không dùng AdministratorAccess cho API |
| Domain và public Route53 hosted zone đã được delegate | `zone_id`, `api_domain`, `ses_domain` | Cùng hosted zone quản API và SES domain; xác minh NS trước apply |
| Email nhận cảnh báo | `alert_email` | Bấm xác nhận email SNS sau apply; kiểm cả email AWS Budget |
| Danh sách email được mời | `pilot_emails` | Bắt đầu khoảng 10 email, bao gồm chủ dự án; giữ trong `.tfvars` không commit |
| SES ở Singapore | Domain/DKIM do Terraform tạo | Trong sandbox phải xác minh từng email người nhận, hoặc xin production access; kiểm quota và bounce |
| SMS/phone verification | `sms_enabled`, `pilot_phones` | Xác minh số sandbox, origination identity/đăng ký theo quốc gia, spend limit; bật sau khi cấu hình xong |
| Geoapify server key | Secret `GEOAPIFY_API_KEY` | Điền vào JSON runtime bằng Secrets Manager console, giữ các key khác; khởi động task mới. Thiếu key thì gợi ý địa chỉ chưa hoạt động |
| Geoapify public map key | `EXPO_PUBLIC_GEOAPIFY_MAPS_KEY` khi export web và EAS preview | Key riêng cho tile/style client, giới hạn origin/quota theo provider; không dùng secret server |
| Native app | Expo/EAS/Apple/Android credentials | Đọc mục phát hành app; web dùng được trước, không cần Metro trên máy cá nhân |

SES sandbox giới hạn người nhận đã xác minh, 200 email/ngày và 1 email/giây ([AWS](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)). SMS sandbox có tối đa 10 số đã xác minh ([AWS](https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox.html)); có thể cần đăng ký sender theo quốc gia. SNS mặc định đặt hạn mức chi 1 USD/tháng cho tài khoản mới; giới hạn có độ trễ nên vẫn có khả năng vượt một ít ([AWS](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-awssupport-spend-threshold.html)). Không coi allowlist của app thay thế sandbox/approval của AWS.

## 2. Kiểm không cần AWS

```sh
npm ci
npm run sdd:check -- --change SDD-PROJECT --phase prepare
terraform -chdir=infra/aws init -backend=false
terraform -chdir=infra/aws validate
terraform -chdir=infra/aws test
terraform -chdir=infra/aws/bootstrap init -backend=false
terraform -chdir=infra/aws/bootstrap validate
docker build --platform linux/amd64 -f infra/aws/Dockerfile -t dvqb-api:check .
node scripts/aws/container-smoke.mjs dvqb-api:check
```

Terraform test dùng `mock_provider`, chỉ lập plan giả, không gọi AWS. Không dùng mock output làm account/subnet thật. `.terraform.lock.hcl` khóa provider đã kiểm. Docker context không nhận `.env`, node_modules máy host, Terraform state hoặc dữ liệu test.

## 3. Tạo nền tảng, chưa khởi động app

```sh
aws sso login --profile dvqb-setup
export AWS_PROFILE=dvqb-setup
aws sts get-caller-identity
terraform -chdir=infra/aws/bootstrap init
terraform -chdir=infra/aws/bootstrap plan -out=bootstrap.tfplan
terraform -chdir=infra/aws/bootstrap apply bootstrap.tfplan
terraform -chdir=infra/aws/bootstrap output state_bucket
cp infra/aws/backend.hcl.example infra/aws/backend.hcl
cp infra/aws/pilot.tfvars.example infra/aws/pilot.tfvars
```

Điền bucket từ output vào `backend.hcl`; điền các trường bảng trên vào `pilot.tfvars`. Giữ `service_enabled=false`, `image_digest=""` trong lần đầu. File bootstrap state local không có mật khẩu DB nhưng có thông tin hạ tầng: giữ bản sao mã hóa trong nơi quản trị, không xóa vì bucket này giữ state chính.

```sh
terraform -chdir=infra/aws init -reconfigure -backend-config=backend.hcl
terraform -chdir=infra/aws plan -var-file=pilot.tfvars -out=pilot.tfplan
terraform -chdir=infra/aws apply pilot.tfplan
terraform -chdir=infra/aws output -json deployment
```

Kiểm plan trước apply: không có xóa/thay RDS/S3 ngoài dự định, account/region đúng, chỉ ALB mở 443, không NAT, task count 0. RDS/ALB/WAF vẫn tính phí dù task count 0. Nếu ACM chờ lâu, kiểm NS/record validation; không bỏ HTTPS để vượt bước này.

Backend S3 có versioning, encryption và lockfile để hai người không apply cùng lúc. Giới hạn quyền đọc/ghi state cho role setup; state có ARN, email/phone allowlist, không phải tài liệu public. Runtime secret không được ghi trong Terraform state vì Terraform chỉ tạo vỏ secret.

## 4. Build image và đưa lên ECR

Lấy `repository_url` từ output, đặt biến theo giá trị thật, dùng SHA đã qua kiểm thử làm tag. Không dùng `latest`.

```sh
export AWS_REGION=ap-southeast-1
export DVQB_ECR_URL='<repository_url từ output>'
export DVQB_RELEASE_TAG="$(git rev-parse HEAD)"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${DVQB_ECR_URL%%/*}"
docker build --platform linux/amd64 -f infra/aws/Dockerfile -t "$DVQB_ECR_URL:$DVQB_RELEASE_TAG" .
docker push "$DVQB_ECR_URL:$DVQB_RELEASE_TAG"
aws ecr describe-images --region "$AWS_REGION" --repository-name "${DVQB_ECR_URL#*/}" --image-ids "imageTag=$DVQB_RELEASE_TAG" --query 'imageDetails[0].imageDigest' --output text
```

Chỉ dùng lệnh tag SHA khi working tree sạch và SHA đó đã kiểm. ECR immutable từ chối ghi đè tag; nếu đã build SHA đó, dùng image/digest đã có, hoặc tạo phiên bản code mới. Kiểm ECR scan findings, giải quyết lỗ hổng nghiêm trọng trước khi bật service; scan không tự chặn push.

Tùy chọn GitHub: tạo OIDC provider `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com` nếu tài khoản chưa có. Điền ARN vào `github_oidc_provider_arn`, apply; tạo GitHub Environment `aws-pilot`, chỉ cho main và người duyệt phù hợp. Đặt environment variables `AWS_BUILD_ROLE_ARN`, `AWS_REGION`, `AWS_ECR_URL` từ Terraform output. Workflow `AWS pilot image` chạy tay trên main, đòi Quality thành công trên đúng SHA push, dùng OIDC ngắn hạn, chỉ build/push ECR. Nó không tự sửa DB/ECS/web và không cần AWS key dài hạn trong GitHub.

## 5. Khởi tạo DB và secret

Đặt `image_digest="sha256:..."` trong `pilot.tfvars`, vẫn `service_enabled=false`, plan/apply. ECS ops task nay dùng image thật.

```sh
node scripts/aws/operate.mjs ops bootstrap
```

Script kiểm account khớp output rồi chạy task, chờ exit code thật. Trong task: khóa bootstrap, tạo secret ngẫu nhiên một lần nếu chưa có, migration có checksum/advisory lock, nạp danh mục đã duyệt, cấp role `dvqb_app` quyền dữ liệu cần dùng. Không tạo tài khoản DEMO, công việc giả, tiền thử hoặc mật khẩu admin mặc định. Secret đã có được giữ nguyên khi chạy lại.

Nếu task không đạt, xem CloudWatch nhóm `/ecs/dvqb-pilot`, stream `ops`; thông báo lỗi cố ý không in credentials. Không bật service khi bootstrap thất bại. Các lỗi thường gặp: image chưa tồn tại, IAM thiếu quyền secret, RDS chưa ready, TLS/hostname sai, PostGIS hoặc migration lỗi. Lấy task ID từ script để xem stoppedReason, không paste toàn bộ secrets/env vào báo cáo.

Điền Geoapify key bằng console nếu dùng gợi ý địa chỉ. Xác minh SES identity/DKIM và các email sandbox. Chỉ đổi `sms_enabled=true` sau khi SMS identity/đích/chi phí đã sẵn sàng; điền `pilot_phones` dạng `+84...`.

## 6. Bật API rồi xuất web

Đặt `service_enabled=true`, giữ một task; plan/apply. Chờ service ổn định và readiness HTTP 200. Nếu lần triển khai đầu không có bản thành công trước đó, circuit breaker không có bản cũ để rollback; phải sửa cấu hình rồi triển khai lại.

```sh
aws ecs wait services-stable --region ap-southeast-1 --cluster dvqb-pilot --services dvqb-pilot-api
node scripts/aws/operate.mjs publish-web
node scripts/aws/operate.mjs smoke
node scripts/aws/load.mjs 'https://api.ten-mien-cua-ban' 10 100
```

Trước export web, đặt `EXPO_PUBLIC_GEOAPIFY_MAPS_KEY` trong shell bằng public map key nếu dùng bản đồ. Cấu hình EAS environment được mô tả theo [tài liệu Expo](https://docs.expo.dev/eas/environment-variables/).

`publish-web` kiểm readiness rồi build với URL HTTPS thật, upload assets trước/index sau, invalidation CloudFront. Nó giữ file hash cũ để client đang mở trang không gãy. Lưu phiên bản web đã export hoặc artifact cùng SHA để rollback; không dùng app build chứa `127.0.0.1`/`10.0.2.2`. `smoke` chỉ kiểm health/ready/catalog/web, không chứng nhận đăng nhập/ảnh/SMS/UAT. Probe tải chỉ GET danh mục, tối đa 50 worker/1000 request; cần thêm hành trình nghiệp vụ khi tăng quy mô.

Chủ dự án mở URL web trong output trên điện thoại/máy khác, đăng ký đúng email được mời và xác minh email. Sau đó:

```sh
node scripts/aws/operate.mjs ops bootstrap-admin 'email-chu-du-an-da-xac-minh'
```

Chỉ dùng lần đầu khi chưa có admin_grants. Đăng nhập lại, mở URL admin, enroll TOTP và lưu recovery codes ngoài hệ thống. Các lần cấp quyền sau qua UI có MFA, không chạy lại bootstrap hoặc cấp quyền bằng SQL. Không có quyền finance bootstrap mặc định.

## 7. Phát hành Android/iOS cho nhóm dùng thử

Web là kênh dễ chia sẻ ngay. Native dùng profile `pilot` trong `apps/mobile/eas.json`: internal distribution, Android APK, không developmentClient. Thiết lập biến `EXPO_PUBLIC_API_URL=https://api.<domain>/v1` trong EAS environment `preview`; đây là URL public, không phải secret. Realtime giữ `0`. Không chạy lệnh `npm run android/ios` để phát hành vì các lệnh đó phục vụ local.

```sh
cd apps/mobile
npx eas-cli login
npx eas-cli env:set --environment preview --name EXPO_PUBLIC_API_URL --value 'https://api.ten-mien-cua-ban/v1' --visibility plaintext
npx eas-cli env:set --environment preview --name EXPO_PUBLIC_GEOAPIFY_MAPS_KEY --value '<public-map-key>' --visibility plaintext
npx eas-cli build --profile pilot --platform android
npx eas-cli build --profile pilot --platform ios
```

Cần EAS project ownership đúng, Android signing, `google-services.json` hiện đã có trong repo và app.json tham chiếu trực tiếp: kiểm nó đúng Firebase project trước khi build. Đây là client configuration, không phải service-account/admin SDK key; không đưa khóa server vào file này. Nếu thay bằng EAS file variable thì cần nối đường dẫn đó qua dynamic app config trước, không chỉ tạo biến rồi mong app.json tự đọc. iOS internal cần Apple Developer và UDID thiết bị trong provisioning profile; TestFlight cần profile/store submission riêng. Có thể phát sinh phí EAS/Apple. Build và phân phối native thật chưa được thực hiện trong đợt này. FCM/APNs/push và LiveKit cloud vẫn chưa mở trong cấu hình pilot này; không quảng cáo chúng là đã hoạt động.

## 8. Nâng cấp, rollback, thay secret

1. Lưu digest API/web đang chạy và snapshot trước migration có thay đổi dữ liệu lớn; chạy Quality trên SHA mới, scan image.
2. Đặt **chỉ** `migration_image_digest` bằng digest mới, giữ `image_digest` cũ và `service_enabled=true`. Plan/apply. API vẫn chạy code cũ; ops dùng image mới.
3. Chạy `node scripts/aws/operate.mjs ops migrate`; chỉ tiếp tục khi exit code 0. Migration tương lai phải theo expand/contract, tương thích code cũ còn chạy; bước này không làm migration phá hủy thành an toàn.
4. Đặt `image_digest` bằng digest mới, plan/apply; chờ stable/ready, kiểm nghiệp vụ rồi `publish-web`. Xóa override migration hoặc giữ cùng digest hiện tại.
5. Nếu API lỗi, circuit breaker quay về task definition thành công trước khi có thể. Chủ động rollback bằng digest trước trong tfvars/plan/apply. Không chạy down migration tự động: code cũ phải đọc được schema mới. Nếu schema không tương thích, dùng maintenance/restore đã diễn tập.
6. Web rollback bằng build/artifact SHA trước và cùng URL API tương thích, upload index cuối + invalidation. S3 versioning cũng giữ bản cũ 30 ngày.

Task nhận secret lúc khởi động. Sau khi đổi JSON runtime, force new deployment rồi kiểm. AUTH_SECRET đổi sẽ vô hiệu access token cũ; CURSOR_SECRET đổi làm cursor cũ mất hiệu lực. **Không tự thay ADMIN_SECRET/MESSAGE_SECRET**: chúng mã hóa TOTP/ảnh xác minh/outbox, thay thẳng làm dữ liệu cũ không đọc được. Cần kế hoạch re-encryption/key-versioning trước khi rotate hai key này. RDS master được RDS quản lý; runtime password có vòng đời riêng, cần phối hợp role DB + secret + rollout khi đổi.

## 9. Backup và phục hồi

RDS tự backup/PITR 7 ngày; S3 versioning giữ phiên bản không hiện hành 30 ngày. Snapshot và versioning cùng region không chống được mọi sự cố tài khoản/region. Khóa mã hóa ứng dụng nằm trong Secrets Manager, phải bảo toàn cùng dữ liệu. Mục tiêu pilot: RPO database khoảng vài phút theo latest restorable time, RTO mục tiêu 2 giờ; **chưa đo trên AWS, chưa phải SLA**. S3/DB không có snapshot nguyên tử chung; cần kiểm object theo mốc thời gian và metadata DB.

Diễn tập trước khi mời người ngoài:

1. Tạo dữ liệu thử hợp lệ gồm ảnh đã hoàn tất, đăng nhập, công việc; ghi ID và checksum không chứa thông tin riêng. Kiểm latestRestorableTime và snapshot status trên RDS.
2. Restore RDS tới **identifier mới**, cùng private subnet group/SG, mã hóa và cùng major version, không ghi đè instance đang dùng. Dùng console Restore to point in time và ghi mốc phục hồi. Không mở public access để tiện truy cập.
3. Tạo môi trường restore tách biệt hoặc task ops tạm theo DB đã restore; giữ bản secret riêng với DATABASE_URL trỏ DB mới, giữ nguyên các key mã hóa. Không sửa secret production để kiểm bản restore. Bản restore RDS có thể không kế thừa quản lý master secret như mong đợi; kiểm/reset credential qua RDS và Secrets Manager theo hướng dẫn AWS trước task.
4. Đối chiếu `schema_migrations`, số dòng/ID nghiệp vụ, đăng nhập bằng test account, TOTP, metadata ảnh và SHA của ảnh. Với object bị ghi đè/xóa sau thời điểm restore, lấy version S3 tương ứng và phục hồi **sang bucket restore**, không ghi đè bucket đang chạy. Phiên bản cũ chỉ có trong cửa sổ 30 ngày.
5. Chỉ đổi service sang DB/bucket đã phục hồi sau khi kiểm; giữ nguyên DB cũ để rollback. Ghi thời gian thực tế/mất dữ liệu thực tế rồi mới xác nhận RTO/RPO. Thu dọn tài nguyên diễn tập sau khi lưu bằng chứng; kiểm lại bill.

Quy trình restore trên là runbook để chủ tài khoản thực hiện; chưa tự động hóa import Terraform/restore đa tài nguyên và chưa có restore AWS thành công được chứng minh. Xem [AWS PITR](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html) và [S3 versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html).

## 10. Khi có cảnh báo

| Hiện tượng | Xem trước | Hành động |
|---|---|---|
| ALB 503/HealthyHostCount thấp | ECS stoppedReason, target health, `/v1/ready` | Kiểm secret/IAM/DB/migration; rollback image nếu mới deploy |
| API 5xx/latency cao | request_id và route đã che query trong CloudWatch; DB CPU/memory | Phân biệt lỗi DB/provider/CPU; tăng task CPU hoặc DB khi có bằng chứng |
| OTP không đến | SES identity/sandbox, SNS sandbox/spend/origination; bảng local_deliveries state/attempts, không đọc payload | Chờ 60 giây rồi resend trong app; không retry vô hạn hoặc xác minh bằng tay |
| Ảnh lỗi | Quyền S3, grant hết hạn/revoked, metadata/checksum | Xin grant mới; giữ file và DB; không đổi bucket public |
| Hết dung lượng | FreeStorageSpace, S3 version/object growth, log volume | RDS tự tăng tới 100 GiB; plan tăng có tính chi phí, không tự xóa dữ liệu nghiệp vụ |
| Chi phí vượt dự kiến | Budget + Cost Explorer theo service/region, SMS, transfer, RDS credits | Xác định nguồn; giảm quota/min/max phù hợp; đừng xóa DB để giảm hóa đơn |

Outbox/realtime deliveries và idempotency có thể tăng theo thời gian. Pilot chưa có policy dọn dữ liệu nghiệp vụ/retention được duyệt; theo dõi dung lượng hàng tuần, đặc biệt realtime queue khi realtime tắt. Việc dọn cần thiết kế riêng giữ audit/retry đúng nghĩa. Đây là giới hạn mở rộng dài hạn, không được bỏ qua bằng việc tăng storage mãi.

## 11. Trước khi mời 10 người

- [ ] API/web HTTPS đúng chứng chỉ, không có URL local trong bundle; CORS đúng hai web origin.
- [ ] Không truy cập trực tiếp task IP/RDS/S3; role API không DDL hoặc đọc secret master.
- [ ] Hai tài khoản thử đăng ký/đăng nhập, email/phone OTP thật, không vượt allowlist; owner tạo/publish partner và người khác tìm thấy.
- [ ] Yêu cầu/nhận việc/chat/ảnh/hóa đơn với số liệu thử, ACL ảnh, logout/revocation, admin TOTP và recovery.
- [ ] Không dùng tiền thật/DEMO bank; thông báo rõ phạm vi push/call/realtime chưa bật.
- [ ] Đã nhận email alarm thử, kiểm Budget, thử task replacement; load 10 người và p95/memory/connections đạt mục tiêu đã đặt.
- [ ] Restore diễn tập được ghi nhận; secret/key backup và người chịu trách nhiệm rõ.
- [ ] Native đã cài/chạy trên thiết bị thật nếu phân phối APK/IPA; web ngoài mạng local được kiểm riêng.

Chưa đánh dấu các ô này vì chưa có tài khoản/provider/thiết bị thật trong đợt chuẩn bị. Không dùng kết quả local thay thế chúng.
