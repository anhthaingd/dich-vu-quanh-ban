# AWS-01 — Hạ tầng AWS cho nhóm dùng thử, mở rộng theo tải

> **Đổi hướng ngày 29/10/2026:** chủ dự án chỉ triển khai để học và yêu cầu không giữ phí khi nghỉ. Kế hoạch hiện hành là [AWS-02 — lab tạo/xóa hoàn toàn](AWS-02-lab-khong-phi-khi-tat.md). AWS-01 giữ làm lịch sử thiết kế và căn cứ của Terraform pilot đã viết; không còn là phương án mặc định để chủ dự án apply. Bộ code pilot chưa tự chuyển thành lab từ việc sửa plan này.

28/10/2026 · Quyết định triển khai theo ủy quyền trực tiếp của chủ dự án: tự quyết định thiết kế, tối ưu chi phí/bảo mật/mở rộng, chuẩn bị sẵn phần cần AWS/key để chủ dự án cấu hình sau. Đây là phạm vi mới vượt các giới hạn local trước đây. Không phải tuyên bố đã triển khai AWS hoặc phê duyệt giao dịch tiền thật.

## Phạm vi đã chọn

- Khoảng 10 người dùng được mời; giả định tối đa khoảng 10 người thao tác đồng thời, chủ yếu tìm dịch vụ, quản lý hồ sơ, yêu cầu việc, chat HTTP, ảnh và quản trị. Phải đo tải trên AWS trước khi coi giả định này là năng lực đã chứng minh.
- Một môi trường `pilot`, region `ap-southeast-1` (Singapore), dự kiến người dùng tại Việt Nam. Region có thể đổi lúc tạo môi trường mới; chuyển region của dữ liệu đang dùng là một đợt di chuyển, không chỉ sửa biến.
- Web khách và web admin qua HTTPS; native có profile phân phối nội bộ riêng, cần tài khoản/chứng chỉ của chủ dự án. AWS không thay TestFlight, Apple signing hoặc Android signing.
- Mở bộ lưu ảnh S3, email SES, SMS SNS tùy chọn và cấu hình quản trị cloud. Giữ kiểm tra phone_verified của partner và MFA của admin. Không đánh dấu số điện thoại đã xác minh bằng SQL.
- Tắt realtime một tiến trình, push/LiveKit local và mô phỏng ngân hàng. Luồng tài chính hiện có vẫn chỉ được dùng với số liệu thử nghiệm; đây chưa phải nền tảng giao dịch tiền thật. Không mở PROMO-02.
- Không đồng bộ Drive/ui-ux, không commit/push hoặc tạo tài nguyên AWS trong đợt chuẩn bị này.

## Tham chiếu và cách áp dụng

[Airbnb trên AWS](https://aws.amazon.com/solutions/case-studies/innovators/airbnb/) mô tả phân quyền IAM cho từng workload và audit quyền. Áp dụng ở đây là tách role API, role chạy migration và role build; API không được đọc mật khẩu chủ database hoặc sửa hạ tầng. Không sao chép Kubernetes của Airbnb cho 10 người.

[Khách hàng ECS, gồm United Airlines](https://aws.amazon.com/ecs/customers/) cho thấy container và điều chỉnh tài nguyên theo nhu cầu có thể phục vụ ứng dụng lớn. Áp dụng ở đây là một image bất biến dùng trên Fargate, giữ API theo module hiện tại, tách dữ liệu bền vững khỏi container. Đây là suy luận thiết kế phù hợp dự án, không phải kiến trúc đầy đủ hay chi phí nội bộ của các công ty đó.

[AWS mô tả public subnet và private subnet/NAT](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/networking-outbound.html). Chọn public subnet cho task để truy cập AWS/provider mà không trả phí NAT; security group chỉ nhận cổng 3100 từ ALB. RDS ở subnet không có đường ra Internet. Public IP của task không đồng nghĩa cổng API được mở công khai.

## So sánh ba cách

| Cách | Điểm tốt | Đổi lại | Quyết định |
|---|---|---|---|
| EC2/Lightsail nhỏ, tự chạy app + DB | Hóa đơn thấp nhất, khoảng vài chục USD/tháng tùy gói và backup | Tự vá OS, quản DB/backup, cùng điểm lỗi; chuyển dữ liệu khi mở rộng | Không chọn do chủ dự án cần bảo mật và mở rộng dễ, ít việc vận hành |
| Fargate + RDS + S3/CloudFront | Không quản OS máy app; DB managed; tăng tài nguyên/số task bằng biến | ALB/RDS tạo phí nền ngay cả ít truy cập | Chọn, dự trù 80–95 USD/tháng trước SMS/thuế/tên miền |
| EKS/microservices, Aurora, Redis, NAT mỗi AZ | Hợp với đội vận hành và tải lớn/khác biệt | Nhiều thành phần, chi phí nền lớn, chưa có nhu cầu chứng minh | Chỉ cân nhắc khi có bằng chứng tải hoặc nhu cầu tổ chức |

## Kiến trúc ban đầu

- Terraform quản VPC, hai public subnet, hai subnet DB, IGW và S3 gateway endpoint; không NAT Gateway, Redis, bastion hay EKS.
- ALB HTTPS/ACM + WAF: giới hạn chung 1000 request/5 phút/IP, giới hạn `/v1/auth/` 100/5 phút/IP, managed KnownBadInputs. Chỉ cổng 443 mở ra Internet. Rate limit WAF mang tính gần đúng, không phải quota giao dịch chính xác.
- Một Fargate task x86, 0.25 vCPU/1 GiB; chạy user 1000, filesystem chỉ đọc, bỏ Linux capabilities, không ECS Exec/SSH. Có healthcheck, readiness và rolling update/circuit breaker.
- RDS PostgreSQL 17, PostGIS qua migration, `db.t4g.micro`, Single-AZ, gp3 20 GiB, tự tăng tối đa 100 GiB. Hai subnet DB không biến Single-AZ thành HA. Backup 7 ngày, mã hóa, bắt buộc TLS, bảo vệ xóa.
- API dùng role DB riêng không có DDL, không đọc `schema_migrations`; migration/khởi tạo dùng task tạm có quyền cao hơn. Không đưa mật khẩu master vào Terraform state. Secret runtime do bootstrap tạo trực tiếp trong Secrets Manager.
- Ảnh S3 private, versioning, HTTPS-only; API kiểm quyền mỗi lần đọc, giữ thời hạn grant 10 phút và thu hồi phiên. Ảnh xác minh còn được mã hóa ở lớp ứng dụng. Không phát URL public S3.
- Hai bucket web/admin private, CloudFront OAC, HTTPS và security headers. Tên miền mặc định CloudFront tiết kiệm bước chứng chỉ web; API dùng tên miền thuộc Route53 của chủ dự án.
- SES xác minh email; SMS SNS chỉ khi bật và đúng allowlist. Outbox DB giữ payload mã hóa, tối đa ba lần gửi, TTL và mã dùng một lần. Provider có thể nhận trước timeout nên không hứa gửi đúng một lần.
- CloudWatch log 14 ngày, alarm API/ALB/DB và SNS email; AWS Budget 80% actual/100% forecast, mặc định 100 USD/tháng trên toàn tài khoản. Budget cảnh báo, không phải công tắc chặn hóa đơn.

## Mở rộng

Giai đoạn đầu giữ `min_tasks=max_tasks=1`. Khi cần, thử 0.5 vCPU/1 GiB trước; đo CPU, memory, latency, kết nối DB và chi phí. Sau đó tăng `min_tasks=2`, `max_tasks=4`, `db_class=db.t4g.small`, `db_multi_az=true`. Autoscaling theo CPU 60%, scale-out 60 giây, scale-in 300 giây; pool mỗi API tối đa 5 kết nối, còn headroom cho rolling update/worker/ops. Load test quyết định bước tăng, không dùng số tài khoản đăng ký làm thước đo duy nhất.

DB/MFA/session/idempotency/outbox đều ở PostgreSQL, ảnh ở S3 nên task thay mới không mất chúng. HTTP API có thể tăng replica; limiter in-process chỉ là backstop và WAF là lớp chung. Realtime hiện dùng fan-out trong tiến trình nên bị khóa trong cloud pilot: trước khi mở lại cần adapter phân phối giữa task (ví dụ Redis), test reconnect, revoke, event delivery và tải. Không tự bật websocket rồi gọi đó là mở rộng hoàn tất.

Khi cần uptime cao hơn: Multi-AZ RDS + tối thiểu hai task, diễn tập mất AZ, triển khai healthcheck tổng hợp ngoài AWS. Khi cần egress isolation chặt hơn: chuyển task sang private subnet với NAT hoặc bộ VPC endpoints được tính lại giá; không đơn giản bỏ public IP khi task vẫn phải gọi SES/SNS/Geoapify.

## Tiêu chí bàn giao

1. Terraform validate và test mô phỏng: mạng/database/bucket an toàn mặc định, không khởi động image chưa cấu hình, kiểm giới hạn scale.
2. Image Linux amd64 build và khởi động thật với PostGIS/TLS trong môi trường local cô lập; chạy không root/read-only, endpoint health/ready/catalog/auth và allowlist hoạt động.
3. Test cloud config từ chối secret yếu/adapter local/realtime; TLS xác minh CA và từ chối URL override; S3/SES/SNS adapter và shared-store ACL/revocation được kiểm bằng transport giả. Không gọi đó là provider live.
4. Quy trình bootstrap, migration trước rollout, publish web, smoke, backup/restore, rollback và xử lý sự cố có lệnh/file cụ thể. Native distribution và thông tin cần chủ dự án cung cấp được tách rõ.
5. Giữ mọi criterion và QA gap hiện có, thêm inventory cho phạm vi này, chạy SDD-PROJECT đầy đủ và verify trên dấu băm cuối. Không sửa source hash cũ để né lỗi.
6. Báo cáo B00-12 có sơ đồ Mermaid đã kiểm render, nguồn giá/tham chiếu, chi phí, rủi ro, bằng chứng và checklist chủ dự án. AWS live, load thực, delivery, restore thực, CI mới và UAT phải còn trạng thái chưa kiểm nếu chưa thực hiện.

Nguồn thiết kế mới nằm trong repo. SRS/Excel/Drive/ui-ux chưa đồng bộ thay đổi cloud này theo quy tắc tài liệu 15/10/2026; không coi các mô tả local trong hồ sơ cũ đã tự được sửa.
