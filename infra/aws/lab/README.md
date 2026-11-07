# AWS-02 — Hướng dẫn dựng và dọn lab với iimissher.com

05/11/2026 · Đây là môi trường học, dùng dữ liệu thử. Code nằm ở `infra/aws/lab`, độc lập với pilot `infra/aws`. [Báo cáo học code B00-20](../../../docs/ke-hoach-trien-khai/bao-cao/B00-20-lab-aws02.md).

Bạn sẽ có `https://app.iimissher.com`, `https://admin.iimissher.com` và `https://api.iimissher.com`. Sau khi dọn, ba địa chỉ ngừng phục vụ; dữ liệu app/ảnh bị xóa. Buổi sau dựng lại dùng cùng tên miền, database mới. Domain, tài khoản AWS, đăng nhập quản trị AWS, domain gửi email đã xác minh và chứng chỉ ACM không export giữ riêng, ngoài state lab. Domain vẫn gia hạn tại Cloudflare.

**Mức bằng chứng:** đã chuẩn bị code và kiểm local/mô phỏng; chưa chạy tài nguyên AWS thật, chưa đo chi phí mỗi buổi. Không gọi kết quả mock là deploy thành công hoặc xác nhận không phát sinh phí. Không dùng hướng dẫn pilot cũ để dựng lab.

**Cập nhật 06/11:** đã nối code realtime một task, LiveKit cloud có kiểm chính sách phòng và Expo Push vào cấu hình lab. [B00-22](../../../docs/ke-hoach-trien-khai/bao-cao/B00-22-realtime-livekit-push-lab.md) phân biệt kiểm local/mock và live. Chưa tạo provider/AWS, chưa kiểm âm thanh/push trên máy thật; gọi đến bằng giao diện hệ thống khi khóa màn hình vẫn chưa hoàn tất. Bước `lab:media-check` phải qua trước khi dựng cloud media.

## 1. Chuẩn bị một lần: tài khoản và công cụ

1. Vào AWS bằng tài khoản của bạn, bật MFA cho root và thiết lập người/role vận hành qua IAM Identity Center. Lưu account ID, portal URL và region SSO. Thao tác triển khai dùng role, không dùng root/access key root. Chọn hỗ trợ Basic nếu phù hợp nhu cầu học; không tự đăng ký dịch vụ trả phí bổ sung.
2. Nếu tài khoản đang Free plan, đọc thông báo trước khi tạo AWS Organizations/Identity Center: [AWS nêu Organizations chuyển tài khoản Free sang Paid plan](https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html). Đây là quyết định cấu hình của chủ tài khoản, không do script tự thực hiện. Nếu đã có SSO thì dùng cấu hình đó.
3. Trên Mac cần Node/npm đúng `.nvmrc`/`package.json`, Docker đang chạy, AWS CLI v2 có `cloudfront list-vpc-origins`, Terraform 1.13.3 hoặc phiên bản tương thích lock hiện có. Cài dependencies repo bằng `npm ci`.
4. Đăng nhập bằng profile riêng (SSO region có thể khác region lab):

```sh
aws configure sso --profile dvqb-lab
aws sso login --profile dvqb-lab
aws sts get-caller-identity --profile dvqb-lab
```

**Kiểm đạt:** Account là tài khoản bạn định dùng; Arn là role vận hành. Quyền setup phải đủ tạo/dọn mạng, CloudFront/VPC origins/WAF, ECS/ECR, RDS, S3, Secrets Manager, IAM/pass-role, log/cảnh báo/SNS/Budgets và service-linked roles. Không đoán policy tối thiểu từ tên dịch vụ: nếu quyền thiếu, đọc thao tác bị từ chối rồi cấp đúng phạm vi. Người mới có thể dùng permission set setup được chủ tài khoản quản lý trong tài khoản học riêng, sau đó rà thu hẹp quyền. Script không thay IAM/SSO của bạn.

## 2. Cloudflare và chứng chỉ HTTPS

1. Cloudflare → chọn zone **iimissher.com**. Lưu **Zone ID** (32 ký tự), kiểm domain hoạt động và DNS đang do Cloudflare quản lý. Không đổi nameserver hoặc record web/email hiện có.
2. Kiểm các tên `app`, `admin`, `api` chưa dùng cho dịch vụ khác. Script sẽ từ chối record có sẵn không mang dấu sở hữu của lab, kể cả record bạn tạo thủ công. Không xóa record đang dùng để vượt lỗi; hãy đối chiếu trước.
3. AWS Console → đổi region **US East (N. Virginia), us-east-1** → Certificate Manager → Request → public certificate. Nhập ba tên `app.iimissher.com`, `admin.iimissher.com`, `api.iimissher.com`; chọn DNS validation, RSA 2048, **không cho export**.
4. Với từng CNAME xác minh ACM đưa ra, thêm đúng name/value trong Cloudflare DNS, **DNS only**. Giữ record xác minh để ACM có thể gia hạn. Đợi certificate thành **Issued**, sao chép ARN vào cấu hình bước 4.
5. Cloudflare → My Profile → API Tokens → tạo token chỉ cho zone `iimissher.com`, quyền **Zone / DNS / Edit** và **Zone / Zone / Read**. Lưu token vào kho mật khẩu; không ghi trong repo. Token được đọc từ biến môi trường `CLOUDFLARE_API_TOKEN`.

Ba record phục vụ app sẽ được script tạo/cập nhật dưới dạng CNAME **DNS only**, có comment `dvqb-lab:ACCOUNT:LAB_ID`. Không bật proxy màu cam: đường proxy backend đã kiểm là CloudFront → ALB; thêm Cloudflare proxy làm đổi đường đi/IP. Dọn lab chỉ xóa ba record do đúng lab sở hữu, giữ apex/www/MX/TXT và CNAME xác minh ACM.

Nguồn: [chứng chỉ CloudFront phải ở us-east-1](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html), [ACM non-exportable](https://aws.amazon.com/certificate-manager/pricing/), [Cloudflare với CDN khác](https://developers.cloudflare.com/dns/proxy-status/use-cases/).

## 3. Email thử và bản đồ

Lab hiện dùng OTP email để mở luồng dịch vụ; số điện thoại vẫn chưa xác minh. Chi tiết [B00-21](../../../docs/ke-hoach-trien-khai/bao-cao/B00-21-otp-email-lab.md).

1. Resend → Domains → thêm `iimissher.com` (hoặc subdomain gửi thư riêng). Thêm chính xác các DNS record Resend cung cấp vào Cloudflare; đợi **Verified**. Tạo API key chỉ quyền gửi cho domain đó; không cần mua hộp thư để gửi từ `no-reply@iimissher.com`. [Xác minh domain](https://resend.com/docs/dashboard/domains/introduction).
2. Điền `email_provider: "resend"`, `email_from` khớp domain đã xác minh, `pilot_emails` gồm email người thử. Resend không cần xác minh từng người nhận; allowlist app vẫn được giữ để giới hạn lab. Cấu hình cũ không có `email_provider` tiếp tục dùng SES với `ses_from`; SES cần xác minh sender và mọi email tester tại Singapore như trước. Không dùng đồng thời hai sender khác nhau.
3. Chuẩn bị Geoapify key phía server và public maps key riêng. Thêm origin `https://app.iimissher.com` vào hạn chế phù hợp của public key, kiểm quota Free; không bật billing. Giữ private key ngoài cấu hình build/public key.
4. Nạp bốn biến qua kho mật khẩu hoặc nhập ẩn trong Terminal zsh, không viết giá trị thật vào lịch sử lệnh:

```sh
read -rs 'RESEND_API_KEY?Resend sending key: '
export RESEND_API_KEY
read -rs 'CLOUDFLARE_API_TOKEN?Cloudflare token: '
export CLOUDFLARE_API_TOKEN
read -rs 'GEOAPIFY_API_KEY?Geoapify server key: '
export GEOAPIFY_API_KEY
read -rs 'EXPO_PUBLIC_GEOAPIFY_MAPS_KEY?Geoapify public map key: '
export EXPO_PUBLIC_GEOAPIFY_MAPS_KEY
```

Các biến chỉ còn trong cửa sổ Terminal này. Không gửi token/key vào chat. Script không nạp `apps/mobile/.env` và không sửa môi trường local hiện có.

## 3.1. Realtime, LiveKit cloud và push

1. Dùng project LiveKit Cloud riêng cho lab; chọn gói miễn phí nếu tài khoản hiện có hỗ trợ. Lấy URL `wss://...livekit.cloud`, API key/secret. Trong cấu hình project, kiểm tùy chọn tắt tự tạo phòng (`auto_create`). Nếu tài khoản không hỗ trợ hoặc không tìm thấy, dừng ở kiểm chính sách và kiểm với LiveKit; không bỏ guard hoặc tự nâng gói.
2. Điền `realtime: true`, `livekit_url` đúng project. Cấu hình singleton/rollout do code tự nối; không bật nhiều API hoặc tăng maximum_percent khi dùng kiến trúc này.
3. Expo: dùng project của bạn, ghi UUID vào `expo_project_id`, bật enhanced push security và tạo access token cho server. Cấu hình FCM v1 cho Android và APNs cho iOS; credentials phải khớp project/bundle/package. Repo đang có project trong app.json; nếu tái sử dụng thì đối chiếu quyền sở hữu/credentials trước. Khi dùng project khác, biến public dưới đây sẽ override project trong app config. [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [bảo vệ gửi push](https://docs.expo.dev/push-notifications/sending-notifications/#additional-security).
4. Nạp thêm key bằng nhập ẩn (không gửi vào chat hoặc ghi config):

```sh
read -rs 'LIVEKIT_API_KEY?LiveKit API key: '
export LIVEKIT_API_KEY
read -rs 'LIVEKIT_API_SECRET?LiveKit API secret: '
export LIVEKIT_API_SECRET
read -rs 'EXPO_ACCESS_TOKEN?Expo push access token: '
export EXPO_ACCESS_TOKEN
```

Sau `lab:init`, chạy kiểm media độc lập, chưa cần gọi AWS/DNS:

```sh
npm run lab:media-check -- --lab learn
```

Lệnh chỉ probe quyền vào phòng chưa tồn tại; không tạo phòng, không phát âm thanh. `LIVEKIT_EXPLICIT_ROOMS_REQUIRED` nghĩa chính sách chưa đáp ứng, không phải lỗi cần bỏ kiểm. Key thiếu/sai và policy sai đều phải xử lý trước `up`. Có thể dùng `livekit_url` rỗng và `expo_push: false` để chủ động dựng phần còn lại, nhưng đó không phải nghiệm thu đủ ba chức năng.

App web có realtime và gọi foreground; push dành cho native. Android đã có thông báo cuộc gọi, nút nhận/từ chối và dịch vụ duy trì gọi theo [B00-24](../../../docs/ke-hoach-trien-khai/bao-cao/B00-24-cuoc-goi-android.md). Cần APK mới; nhận/từ chối mở app và có thể yêu cầu mở khóa. iOS CallKit/PushKit chưa triển khai.

### Build Android trên EAS

Profile `lab` trong `apps/mobile/eas.json` dùng môi trường **preview**, tạo APK nội bộ và đã bật realtime/push. Trước build, mở project Expo tương ứng → Environment variables → chọn **preview** và khai báo:

| Tên | Loại/giá trị |
|---|---|
| `EXPO_PUBLIC_API_URL` | String, plaintext: `https://api.iimissher.com/v1` |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | String, plaintext: UUID đúng project Expo đã cấu hình push |
| `EXPO_PUBLIC_GEOAPIFY_MAPS_KEY` | String, plaintext: key bản đồ công khai dành cho app, giới hạn sử dụng phù hợp |
| `GOOGLE_SERVICES_JSON` | File, secret: tải `google-services.json` của Firebase Android app có package `vn.dichvuquanhban.app` |

`app.config.js` đọc đường dẫn file do EAS đặt vào `GOOGLE_SERVICES_JSON`; khi không có biến này, giữ `./google-services.json` cho build local. Biến file không phải nội dung JSON dán vào string. File Firebase này không thay cho thông tin xác thực gửi FCM v1 cần cấu hình trong EAS Credentials của đúng project.

Biến `export` trong Terminal hoặc `.env` bị Git ignore trên Mac không tự cấu hình môi trường build từ xa. Dùng [biến môi trường EAS](https://docs.expo.dev/eas/environment-variables/manage/) cho remote build; các biến `EXPO_PUBLIC_*` được đưa vào app, chỉ chứa cấu hình công khai.

Sau khi cấu hình, chạy trong `apps/mobile`:

```sh
eas build --platform android --profile lab
```

Lệnh trên khởi tạo một lượt build EAS theo hạn mức tài khoản; không tự publish store. Cài APK mới, đăng nhập, đăng ký push lại và cấp quyền thông báo/micro. Kiểm hai máy khác mạng, foreground/nền/khóa màn theo B00-24; token đăng ký thành công chưa chứng minh push đã đến. Với iOS cần cấu hình ký/APNs và kiểm riêng.

## 3.2. Ngân hàng mô phỏng và tiền test

Đặt `finance_test: true` trong config riêng (mẫu mới đã bật). Đây là số dư giả trong database lab, không kết nối ngân hàng hoặc chuyển tiền thật. Chỉ lab nhận `LAB_FINANCE_TEST=1`; AWS-01 giữ tắt. Không bật `FINANCE_LOCAL_SECRET` trên cloud.

Task bootstrap tạo `FINANCE_TEST_SECRET` riêng trong runtime secret; runner giữ nguyên key khi chạy lại và không gửi key vào build web. Không tự sửa/xóa/xoay key trong khi còn dữ liệu lab. Nếu key lưu bị lỗi, dừng và khôi phục đúng key; không tạo key mới để bỏ lỗi. Tắt cờ không xóa key hoặc dữ liệu; `lab:down` xóa theo vòng đời lab.

Admin đầu tiên do `lab:admin` tạo nhận thêm `finance.read`/`finance.review` nếu bật cờ. Vẫn phải xác minh email, thiết lập MFA và dùng MFA mới khi quyết định. Admin đã tồn tại cần được cấp quyền qua quản trị có MFA hiện hành; bootstrap không chạy lại để vượt kiểm quyền.

Mở **Ví → Ngân hàng nhận tiền**, dùng dữ liệu giả, ví dụ `DEMO` / `0000001234` / `DEMO TEST`, rồi admin duyệt. Người dùng yêu cầu nạp; admin ghi nguồn nạp giả đúng hồ sơ/số tiền/mã và duyệt mới cộng ví. Rút dùng số dư test đã nạp; giữ tiền rồi mô phỏng thành công, thất bại hoặc mất phản hồi. Mọi màn có nhãn **TIỀN TEST — không có giá trị thanh toán**. Xem [B00-23](../../../docs/ke-hoach-trien-khai/bao-cao/B00-23-tien-test-tren-lab.md) để thử đầy đủ, xem ảnh và đọc code.

Không seed số dư tự động. Nếu tắt tài chính hoặc API ngân hàng lỗi, màn Ví vẫn đọc số dư/lịch sử sổ tiền và khóa thao tác ngân hàng/nạp/rút; mất quyền thì xóa dữ liệu riêng tư. Không có phí nhà cung cấp ngân hàng; dữ liệu/bút toán vẫn tiêu thụ tài nguyên AWS lab hiện có.

## 4. Tạo cấu hình riêng trên máy

Từ thư mục gốc repo:

```sh
mkdir -p .local/aws-lab-input
cp infra/aws/lab/config.example.json .local/aws-lab-input/config.json
chmod 600 .local/aws-lab-input/config.json
```

Mở file vừa sao chép, thay:

| Trường | Giá trị cần điền |
|---|---|
| `finance_test` | `true` để thử ngân hàng/nạp/rút bằng tiền giả; không cần key ngân hàng |
| `lab_id` | `learn` hoặc tên mới 3–12 ký tự thường; dùng cố định cho mỗi lab |
| `expected_account_id` | Account ID thật 12 chữ số |
| `profile` | `dvqb-lab`, khớp profile SSO |
| `region` | `ap-southeast-1` |
| `domain` | `iimissher.com` |
| `cloudflare_zone_id` | Zone ID Cloudflare |
| `certificate_arn` | ARN ACM đã Issued ở us-east-1, đúng account |
| `email_provider` | `resend` theo config mẫu mới; `ses` nếu chủ động dùng SES |
| `email_from` | `no-reply@iimissher.com`, khớp domain đã Verified trong Resend |
| `pilot_emails` | Danh sách email người thử được phép đăng ký/nhận thư, gồm bạn; dùng chữ thường |
| `realtime` | `true` để bật gateway singleton |
| `livekit_url` | URL project riêng; phải qua `lab:media-check` |
| `expo_push` | `true` để bật worker gửi push với key server |
| `expo_project_id` | UUID đúng project Expo đã cấu hình FCM/APNs |
| `alert_email` | Email nhận cảnh báo, bạn thường kiểm tra |
| `monthly_budget_usd` | Ngưỡng cảnh báo bạn chọn; `20` là giá trị mẫu, **không phải dự toán hoặc trần chặn chi tiêu** |

```sh
npm run lab:init -- --config .local/aws-lab-input/config.json
npm run lab:status -- --lab learn
```

`init` chỉ kiểm và lưu local, không gọi AWS/Cloudflare. File riêng nằm `.local/aws-lab/learn/`: config, state, journal (tiến độ), plan và audit. State có thông tin nhạy cảm: giữ trên ổ mã hóa, backup mã hóa ngoài AWS, không commit/chia sẻ. Không xóa state khi tài nguyên chưa được kiểm dọn xong. `status` mặc định chỉ đọc journal, thêm `--live` mới kiểm AWS thật.

## 5. Chốt code và xem kế hoạch tài nguyên

Trước deploy, cần phiên bản code đã review/commit theo phạm vi bạn cho phép, working tree sạch. Script `up --apply` từ chối code chưa commit và yêu cầu SDD verify khớp nguồn. Việc chuẩn bị code lần này không tự commit/push. Nếu thay source/HEAD, chạy lại kiểm theo [hướng dẫn SDD](../../../docs/ke-hoach-trien-khai/sdd/README.md).

```sh
npm run lab:up -- --lab learn
```

Lệnh này kiểm account, DNS sở hữu, ACM và chính sách LiveKit (thêm SES nếu chọn SES); chạy Terraform plan. Chưa tạo hạ tầng hoặc ghi DNS. Đọc danh sách tài nguyên, account/region và khả năng chi trả trước bước tiếp theo. Plan lần đầu có API ở 0 task; cả quy trình `up --apply` còn gồm các plan tiếp theo để đưa image vào task rồi bật 1 API, bootstrap database và publish web.

## 6. Dựng lab — bước bắt đầu tạo tài nguyên có phí

Thay `YOUR_ACCOUNT_ID` bằng ID thật, giữ lab ID đúng cấu hình:

```sh
npm run lab:up -- --lab learn --apply --confirm YOUR_ACCOUNT_ID/learn
```

Quy trình: build image local → tạo hạ tầng chưa bật API → push image theo commit vào ECR → cập nhật task vận hành → tạo cấu trúc DB/catalog và secret độc lập → nạp Geoapify/Resend/LiveKit/Expo key qua stdin → bật API → đợi đúng phiên bản ổn định → cập nhật DNS → build/publish web/admin → kiểm HTTPS. Không seed tài khoản/mật khẩu DEMO hoặc số dư test giả vào cloud.

Giữ Terminal và Mac hoạt động trong khi chạy. Terraform/CloudFront/RDS có thể cần chờ; không có cam kết số phút. Email SNS cảnh báo sẽ yêu cầu bạn xác nhận đăng ký. Khi script báo `Ready for lab checks`, mở web, đăng ký bằng email allowlist, nhận mã qua provider email đã cấu hình, xác minh email, sau đó cấp quyền quản trị ban đầu:

```sh
npm run lab:admin -- --lab learn --email EMAIL_CUA_BAN --apply --confirm YOUR_ACCOUNT_ID/learn
```

Lệnh kiểm email đã xác minh ở DB và chỉ bootstrap lần đầu. Đăng nhập admin, thiết lập MFA trong app. SMS/ngân hàng thật chưa mở; realtime/gọi foreground/push dùng các cấu hình mục 3.1 và cần nghiệm thu live; lab dùng email đã xác minh cho điều kiện tạo dịch vụ/gửi và nhận việc; số điện thoại giữ trạng thái thật, không dùng SQL để bỏ kiểm tra. Lát đầu ưu tiên web; APK/iPhone cần build và kiểm thiết bị riêng dù API domain đã ổn định.

## 7. Kết thúc buổi học

Nếu cần giữ kết quả thử, xuất DB/ảnh/khóa cần thiết về bản sao mã hóa trên máy và kiểm khả năng phục hồi trước. Công cụ hiện **không tự export/restore dữ liệu**; mặc định buổi sau bắt đầu DB mới.

```sh
npm run lab:down -- --lab learn
npm run lab:down -- --lab learn --apply --confirm YOUR_ACCOUNT_ID/learn --accept-data-loss
npm run lab:status -- --lab learn --live
```

Lệnh đầu chỉ lập plan xóa. Lệnh có `--apply` xóa DNS của lab, dừng API/ops, kiểm policy và dọn phòng LiveKit thuộc đúng lab, rồi dọn tài nguyên trong state, kiểm state rỗng rồi kiểm độc lập RDS/backup, S3, ECR, ECS/tasks, ALB/VPC/ENI/IP, CloudFront/VPC origins, WAF us-east-1, secret kể cả secret RDS do AWS tạo, log/cảnh báo/SNS/Budget và tags hai region. Thiếu quyền kiểm hoặc còn sót là **thất bại**, lưu `audit.json`; không báo đã dọn. Lưu state/journal kể cả sau thành công.

Thông báo `resources-removed-billing-pending` nghĩa là không tìm thấy tài nguyên lab trong các phép kiểm đã thực hiện. Tiếp tục xem Billing/Cost Explorer sau khi dữ liệu cập nhật, đối chiếu thời gian sử dụng sau mốc dọn, kiểm các region/thuê bao khác của tài khoản. Phí domain, phí trước khi dọn và tài nguyên ngoài lab không được xóa hoặc xác nhận bởi script. [Độ trễ dữ liệu Billing](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html).

Buổi sau đăng nhập SSO/nạp token-key, chạy lại `lab:up`; không cần tạo lại domain, email identity hoặc ACM. Nếu ACM hết hạn do lâu không sử dụng, cấp/xác minh lại và cập nhật ARN trong cấu hình riêng trước.

## 8. Khi có lỗi

| Tình huống | Làm gì |
|---|---|
| SSO hết hạn/mất mạng | Đăng nhập lại, dùng **cùng lab ID**, kiểm `status --live`, chạy lại cùng thao tác. Tài nguyên có thể vẫn tính phí. |
| Terraform apply lỗi giữa chừng | State và tiến độ được giữ. Sửa đúng lỗi rồi tiếp tục `up`, hoặc `down` để dọn. Không tạo lab khác che lỗi. |
| Đang dọn mà kiểm audit lỗi | Chạy lại `down`; `up` bị chặn tới khi hoàn tất dọn. Không xóa state/journal để bỏ chặn. |
| DNS đã có record khác/proxy bật | Công cụ không ghi đè. Kiểm tên và chủ sở hữu record; không xóa tùy tiện. |
| HTTPS chưa phân giải sau cập nhật DNS | Đợi DNS cập nhật, thử lại `up` với cùng commit. Không coi record đã ghi là app đã truy cập được. |
| ECS tự rollback | Script yêu cầu đúng task definition mới chạy ổn định; kiểm log task, sửa rồi kiểm lại trước khi publish. |
| `operation.lock` còn sau crash | Đọc PID trong lock, xác nhận tiến trình đã dừng; khi đó mới xóa **đúng file lock**, giữ state/journal. |
| State/journal mất hoặc khác lineage | Dừng tạo/xóa tự động, phục hồi bản sao đúng; `status --live` giúp kiểm AWS. Không import state pilot vào lab. |
| `down` báo còn tài nguyên | Đọc `audit.json`, đợi AWS hoàn tất hoặc xử lý tài nguyên được xác định đúng lab rồi chạy lại kiểm. Không tự tuyên bố không phí. |

Kiểm local không cần credentials:

```sh
node --test scripts/test/aws-lab.test.mjs scripts/test/aws-lab-cli.test.mjs
terraform -chdir=infra/aws/lab init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/aws/lab validate
terraform -chdir=infra/aws/lab test
```

Sau khi runner đã cấu hình local backend cho lab thật, không chạy các lệnh Terraform thủ công để đổi backend/workspace. Dùng runner; nếu muốn kiểm Terraform trên checkout riêng, dùng `TF_DATA_DIR` riêng để không ghi đè metadata backend. Mock tests không tạo AWS thật.

### Android nhận cuộc gọi và giữ cuộc gọi nền

Bản Android mới dùng cùng Expo/FCM; không thêm key provider ở API. Deploy migration 026, build APK mới (Kotlin/manifest), đăng ký push lại. Bản cũ và iOS vẫn dùng thông báo thường. Cấp quyền thông báo/micro; kiểm quyền full-screen của Android nếu muốn màn nhận cuộc gọi phủ màn khóa. Nút nhận/từ chối mở app để xác thực, có thể cần mở khóa. Xem [B00-24](../../../docs/ke-hoach-trien-khai/bao-cao/B00-24-cuoc-goi-android.md) cho kiểm foreground/Home/khóa máy, hai thiết bị và giới hạn. Không coi build hoặc mock là đã kiểm FCM/âm thanh LiveKit thật.
