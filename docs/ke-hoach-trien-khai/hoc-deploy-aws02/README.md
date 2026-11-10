# Học cấu hình và deploy project lên AWS

AWS-02 · B00-26 · Cập nhật ngày 09/11/2026 · Dành cho chủ dự án học deploy cá nhân.

Sau khi hoàn tất, bạn sẽ mở app và trang quản trị qua Internet, dùng API và database trên AWS ngay cả khi Mac đã tắt. Bộ tài liệu này giải thích các bước đã đi qua trong phiên hướng dẫn, lý do chọn từng cấu hình và cách tự kiểm tra khi dựng lại lab.

**Điểm đang dừng:** chứng chỉ ACM cho ba tên miền đã được tạo ở đúng account/region, trạng thái **Pending validation**. Việc tiếp theo là thêm CNAME xác minh vào Cloudflare. App của dự án chưa được deploy lên AWS trong hành trình này.

## Đọc theo thứ tự nào

| Phần | Bạn sẽ hiểu và làm được gì? |
|---|---|
| [01 Kiến trúc và vai trò dịch vụ](01-kien-truc.md) | Một lần mở app đi qua đâu; vì sao dùng nhiều dịch vụ dù EC2 có thể chạy cả hệ thống |
| [02 Tài khoản, credit và chi phí](02-tai-khoan-credit.md) | Ba account, MFA, onboarding, Paid plan, advanced features và giới hạn chi tiêu |
| [03 Đăng nhập CLI và mở region](03-cli-region.md) | Profile, role, session, SCP; sửa RegionFloor và kiểm đúng account |
| [04 Domain, DNS và HTTPS](04-domain-https.md) | ACM, CNAME, Cloudflare, DNS only; hoàn tất bước đang dừng |
| [05 Chuẩn bị và chạy deploy](05-chuan-bi-deploy.md) | Config, key, provider, plan/apply, database và quản trị viên đầu tiên |
| [06 Vận hành, dọn lab và xử lý lỗi](06-van-hanh.md) | Kiểm app thật, theo dõi phí, dựng/dọn an toàn, đọc lỗi và tự kiểm hiểu |

Đây là tài liệu học theo trường hợp của bạn. [Runbook kỹ thuật](../../../infra/aws/lab/README.md) và [code runner](../../../scripts/aws/lab.mjs) là nơi đối chiếu cách lệnh thực thi. [AWS-02](../de-xuat/AWS-02-lab-khong-phi-khi-tat.md) là hướng đã chọn; AWS-01 là hướng pilot lịch sử.

## Giá trị dùng trong hành trình này

| Thông tin | Giá trị và ý nghĩa |
|---|---|
| Project để deploy | `Ctrl Shift Create` |
| Account chạy ứng dụng | `857146995969` |
| Management account | `215009180804`, quản lý tổ chức và billing |
| Tên tổ chức/team hiển thị | `dvqb-learning` |
| Profile đã đăng nhập | `dvqb-learn` |
| Lab ID dự kiến | `learn`, chưa có bằng chứng đã chạy `lab:init` |
| Region tài nguyên lab | Singapore `ap-southeast-1` |
| Region đã dùng onboarding/login | Sydney `ap-southeast-2` |
| Region chứng chỉ và WAF CloudFront | N. Virginia `us-east-1` |
| Domain | `iimissher.com`, DNS dự kiến quản lý tại Cloudflare |
| Địa chỉ sau deploy | `https://app.iimissher.com`, `https://admin.iimissher.com`, `https://api.iimissher.com` |

Các ID ở đây là thông tin nhận diện tài nguyên, không phải mật khẩu. Không lưu access key, token, mật khẩu, OTP, URL đăng nhập OAuth hoặc nội dung Terraform state vào bộ tài liệu.

## Checklist thực tế đến ngày 09/11/2026

Dấu hoàn thành chỉ áp dụng cho bằng chứng đã có trong hội thoại; không phải kiểm lại AWS trực tiếp ở thời điểm bạn đọc.

| Bước | Trạng thái | Bằng chứng và việc còn lại |
|---|---|---|
| Tài khoản AWS và MFA | Người dùng xác nhận đã làm | Root của management account sau activation cần kiểm MFA riêng nếu chưa làm |
| Đăng nhập role qua CLI | Đã thực hiện | STS từng trả account `857146995969`, role `AccountFullAccessRole` |
| Kiếm credit onboarding | Đã thực hiện | Người dùng báo hoàn tất; ảnh Billing hiển thị **Available credits $200** |
| Chuyển Paid plan | Đã thực hiện trong chuỗi thao tác | Billing chuyển sang Current charges, sau đó activation thành công |
| Đặt spend limit $20 | Đã từng đặt | Là trạng thái lịch sử; advanced features đã gỡ cơ chế này |
| Advanced features | Đã thực hiện | Banner `Activation of advanced features complete` và ba account xuất hiện |
| Mở quyền Singapore | Kiểm đọc EC2 đã qua | `describe-vpcs` tại Singapore trả VPC mặc định `vpc-0282e4da8e8663110`; chưa chứng minh mọi quyền tạo/xóa |
| Yêu cầu chứng chỉ ACM | Đã thực hiện | ARN ở đúng account/us-east-1, gồm app/api/admin, **Pending validation** |
| CNAME xác minh và ACM Issued | **Chưa hoàn tất theo bằng chứng hiện có** | Bước tiếp theo tại [phần 04](04-domain-https.md) |
| Dọn tài nguyên onboarding | Một phần đã xác nhận trong phiên trước | EC2 terminated và volume không còn; Lambda/log/RDS còn cần đối chiếu riêng |
| Token Cloudflare, email, bản đồ, LiveKit, Expo | Chưa xác nhận cấu hình cloud đủ | Theo [phần 05](05-chuan-bi-deploy.md) |
| Init và Terraform plan cho lab | Chưa có bằng chứng đã chạy | Không suy ra từ việc đã có VPC mặc định |
| Apply, migration, API, web/admin | Chưa deploy | Chỉ đánh dấu sau khi runner và kiểm live đạt |
| Thiết bị thật, gửi email/push/cuộc gọi | Chưa nghiệm thu AWS lab | Kiểm riêng từng chức năng |
| Dọn lab và đối chiếu Billing | Chưa chạy chu kỳ lab | Giữ bằng chứng sử dụng sau mốc dọn |

## Cách bổ sung sau khi deploy

Ghi ngày, commit, lệnh, account/region và kết quả đã che secret. Với mỗi lần chạy, phân biệt **đã tạo tài nguyên → API khỏe → người dùng dùng được → đã dọn → Billing đã cập nhật**. Nếu lỗi, giữ nguyên trạng thái chưa đạt và ghi cách sửa; không thay lịch sử thất bại bằng kết quả thành công lần sau.

Mẫu ghi cho lần deploy đầu:

```text
Ngày/giờ và múi giờ:
Commit được deploy:
Account / region / lab ID:
ACM: Issued hay chưa:
Plan đã xem / apply đã chạy:
App / admin / API đã kiểm:
Email / realtime / gọi / push đã kiểm trên thiết bị nào:
Thời điểm bắt đầu tính tài nguyên / thời điểm dọn:
Tài nguyên còn lại / Billing đối chiếu:
Lỗi và cách xử lý:
```

[Báo cáo phạm vi biên soạn và kiểm tra B00-26](../bao-cao/B00-26-tai-lieu-hoc-deploy.md).
