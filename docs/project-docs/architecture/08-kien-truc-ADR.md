# 03 · Kiến trúc tổng thể

Đề xuất: TypeScript, một backend chia module và một cơ sở dữ liệu giao dịch. Tách tiến trình nền khi cần; chưa chia microservice.

## Các thành phần và đường kết nối

```mermaid
flowchart TB
  APP["Ứng dụng iOS / Android"]
  WEB["Web responsive + Admin"]
  API["Backend API + realtime"]
  EXT["Nhà cung cấp ngoài"]
  DB["PostgreSQL + PostGIS"]
  WORK["Worker / scheduler"]
  MEDIA["Kho ảnh riêng tư"]
  OBS["Giám sát + sao lưu"]
  APP -->|"HTTPS / WebSocket"| API
  WEB -->|"Cùng API"| API
  API -->|"Giao dịch nguyên tử"| DB
  API -->|"Adapter"| EXT
  API -->|"Cấp quyền upload/download"| MEDIA
  DB -->|"Outbox bền vững"| WORK
  WORK -->|"Thông báo / nhắc lịch"| EXT
  DB -->|"Backup / số liệu"| OBS
```

API là nguồn sự thật. Push/WebSocket chỉ báo thay đổi; client đọc lại trạng thái. Media cuộc gọi đi qua nhà cung cấp WebRTC, không chạy xuyên API giao dịch.

## Ranh giới module trong cùng backend

|Module|Sở hữu dữ liệu|Trách nhiệm|
|---|---|---|
|Identity & Access|users, identities, sessions, memberships|Đăng nhập, quyền, khóa tài khoản, xác thực tăng cường|
|Partners & Catalog|partners, locations, skills, service areas|Hồ sơ đa ngành, xác minh, tìm theo khoảng cách và vùng phục vụ|
|Jobs|jobs, assignments, schedule_history|Nhận việc, lịch hẹn, phân công|
|Messaging & Calls|conversations, messages, call_sessions|Phòng riêng dùng lại; quyền gọi; đồng bộ lịch sử|
|Billing|invoices, versions, photos|Số tiền đã chốt, ảnh, sửa trước khóa|
|Ledger & Wallet|accounts, entries, holds, payouts, topups|Giữ, quyết toán, đối soát; module khác không sửa trực tiếp số dư|
|Support & Moderation|cases, evidence, reviews|Xét chứng cứ, ẩn đánh giá, thao tác admin theo quyền|
|Notifications & Audit|outbox, notifications, audit_events|Gửi sau commit, nhắc lịch, nhật ký và truy vết|

## ADR — quyết định kiến trúc đề xuất

|Mã|Chọn|Lý do / giới hạn|
|---|---|---|
|ADR-01|Modular monolith + PostgreSQL|Ít thành phần cho một người; dễ giữ hóa đơn/point/phí trong một transaction. Cần kỷ luật ranh giới module; tách dịch vụ khi có nhu cầu đo được.|
|ADR-02|Expo / React Native cho mobile; web dùng chung API/types|Phù hợp Android+iOS; bố cục web riêng khi cần. Không cam kết mọi component dùng lại được; SDK gọi/bản đồ cần thử trên thiết bị thật.|
|ADR-03|NestJS / TypeScript backend; React admin|Một ngôn ngữ chính; module và guard rõ. Đây là lựa chọn đề xuất, chưa khóa phiên bản/dependency.|
|ADR-04|PostGIS cho vị trí; tìm trong DB trước|Geography tính mét; bán kính 10.000m, lọc vùng phục vụ theo chế độ đến nhà/cửa hàng; chỉ mục GiST. Không suy khoảng cách điểm neo là vị trí GPS trực tiếp của thợ.|
|ADR-05|DB outbox + worker; chưa cần Redis/Kafka|Commit nghiệp vụ và outbox cùng transaction. Worker lease/retry; unique event chống tin tự động trùng. Redis có thể thêm cho scale realtime sau.|
|ADR-06|Sổ append-only + holds; không UPDATE số dư tùy ý|Số dư có thể lưu projection để khóa nhanh, luôn đối soát lại từ entries. Cần test cạnh tranh/khôi phục trước tiền thật.|
|ADR-07|Tích hợp ngoài qua adapter|OTP, map, push, calls, bank thay nhà cung cấp được. Chưa chọn nhà cung cấp/hợp đồng/giá.|
|ADR-08|Dev / staging / production tách biệt|Không dùng dữ liệu và khóa production ở test. Quản lý secrets; migration có review; rollback app tương thích schema.|

## Tích hợp và triển khai tối thiểu

|Mảng|Thiết kế / phương án|Điều chưa chốt|
|---|---|---|
|Đăng nhập|Dịch vụ auth quản lý hoặc module auth với điện thoại/email; MFA admin, phiên có thu hồi|Nhà cung cấp SMS Việt Nam, chi phí, anti-abuse; không tự gắn tài khoản vì email trùng|
|Bản đồ|Geocoding + hiển thị map, PostGIS quyết định lọc|Độ phủ địa chỉ Hà Nội, quyền lưu tọa độ, giá và quota|
|Gọi trong app|WebRTC managed; API cấp token ngắn hạn sau kiểm quyền công việc|SDK iOS/Android, nhận cuộc gọi khi nền/khóa máy, push cuộc gọi; chưa ghi âm|
|Chat / push|Lưu message trong DB trước ACK; cursor đồng bộ khi kết nối lại|Push không đảm bảo đến; tắt nhận push/call theo cài đặt, không mất lịch sử chat|
|Nạp/rút|Admin đối chiếu ngân hàng; adapter API sẵn để tự động sau|Chưa cam kết ngân hàng/API cụ thể; cần kế hoạch nguồn tiền bù point|
|Ảnh|Object storage private; upload có kích thước/MIME allowlist, quét file|Đề xuất JPEG/PNG/WebP tối đa 10MB/file, 10 ảnh/lần; cần chốt trước API|
|Hạ tầng|Một API + một worker cùng repo; DB managed hỗ trợ PostGIS; kho ảnh; TLS|Chọn vùng đặt dữ liệu, ngân sách/tháng; chưa mua tài nguyên|
|Khôi phục|Đề xuất backup liên tục/PITR + kiểm restore trước mở|Đề xuất RPO 15 phút / RTO 4 giờ, chưa phải SLA cam kết; xác minh gói DB hỗ trợ|
|Giám sát|Lỗi API, outbox trễ, hold lâu, chênh sổ, chuyển tiền chưa rõ|Sự cố tiền ưu tiên cảnh báo; hỗ trợ người dùng 08–22h giờ Việt Nam|

Chưa áp mục tiêu 10.000 người đồng thời. Trước launch đo p95 và tải theo kịch bản chốt sau; không tự gán con số hiệu năng đã cam kết. Retention chứng cứ/chat/nhật ký và chính sách xóa cần chốt trước production, không xóa dây chuyền dữ liệu tài chính khi user yêu cầu xóa tài khoản.

Cơ sở kỹ thuật đã đối chiếu ngày 22/09/2026: Expo hỗ trợ Android/iOS/web; NestJS tổ chức module; PostGIS ST_DWithin geography dùng mét; PostgreSQL hỗ trợ khóa hàng và ràng buộc unique. Đề xuất chọn stack là đánh giá cho dự án, không phải kết luận từ nhà cung cấp.

## Mở rộng, triển khai và kiểm thử — phương án đề xuất

|Mục tiêu|Cách tổ chức cho dự án|Giới hạn cần hiểu|
|---|---|---|
|Mở rộng ngành / chức năng|Danh mục và kỹ năng là dữ liệu; modules jobs, chat, billing, ledger có ranh giới. Thêm ngành không cần dựng app mới.|Không hứa mở rộng vô hạn; ngành mới có quy trình khác vẫn cần thêm validation/luồng.|
|Mở rộng lưu lượng|API không lưu phiên/trạng thái quan trọng trong RAM; dùng DB bền vững, pagination/index; tăng tài nguyên rồi thêm replicas khi đo được nhu cầu.|Nhiều instance realtime cần cơ chế pub/sub chung; worker cần lease/idempotency; DB có thể là nút thắt.|
|Deploy backend / web|Build artifact cố định; backend/worker đóng Docker; web build riêng; cấu hình/secrets tách môi trường. Database có migration kiểm soát.|Cần pipeline, health check, backup và quy trình rollback tương thích schema; framework không tự làm hộ.|
|Build / phát hành mobile|Expo có EAS Build/Submit để hỗ trợ build và nộp app; giữ lựa chọn build local khi phù hợp.|iOS/Android vẫn có ký app, tài khoản store và quy trình xét duyệt; thay đổi native thường cần build lại.|
|Unit / integration test|Kiểm công thức, state guard, quyền bằng unit tests; tích hợp chạy PostgreSQL/PostGIS thật trong môi trường test tách biệt.|Mock DB không chứng minh row lock, unique constraint hoặc race condition.|
|Kiểm thử giao diện|Test component cho app/web; E2E cho thuê, hóa đơn, ví, phân công. Thiết bị thật kiểm push, gọi, quyền vị trí và app chạy nền.|Không thể dựa vào test JavaScript để kết luận phần native iOS/Android hoạt động.|
|Dùng chung code|Một repo đề xuất có mobile, web, api và packages cho API types/client, validation chung, design tokens.|React web và React Native không dùng nguyên xi mọi giao diện; bí mật và nghiệp vụ tài chính vẫn ở server.|
|Chưa có ngân sách|Tiếp tục đặc tả API/DB và thử tích hợp bằng sandbox/local; chỉ chọn gói trả phí sau khi có dự toán.|Không cam kết production miễn phí; OTP, gọi, ảnh, backup và ngân hàng còn chi phí theo sử dụng.|

Pipeline đề xuất: thay đổi mã → lint/typecheck → unit test → integration với DB test → build web/API/app → deploy staging → smoke/E2E → duyệt phát hành production. Với app, thêm build/ký/nộp store và kiểm thiết bị; với migration, kiểm tương thích trước khi deploy. Đây là kế hoạch, chưa tạo CI hoặc triển khai hạ tầng.


## Nguồn kỹ thuật

- [Expo core concepts](https://docs.expo.dev/core-concepts/): hỗ trợ Android, iOS và web.
- [NestJS modules](https://docs.nestjs.com/modules): tổ chức backend theo module.
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html): geography với khoảng cách mét.
- [PostgreSQL row locking](https://www.postgresql.org/docs/current/explicit-locking.html): khóa hàng trong transaction.
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): khóa ngoại và unique.

Đối chiếu 22/09/2026; lựa chọn kiến trúc là đề xuất riêng cho dự án.

Nguồn bổ sung về build/deploy/test (22/09/2026):
- [NestJS deployment](https://docs.nestjs.com/deployment)
- [NestJS testing](https://docs.nestjs.com/fundamentals/testing)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo unit testing](https://docs.expo.dev/develop/unit-testing/)
- [React Native testing](https://reactnative.dev/docs/testing-overview)


### Quy tắc hiện hành 23/09 — công việc

Đã chốt 23/09/2026: chặn thuê chính mình hoặc doanh nghiệp đang là thành viên. Đổi lịch chỉ để thay đổi ngày/giờ hẹn sau khi hai bên trao đổi, không bắt buộc vì công việc kéo dài. Công việc đã nhận không tự hết hạn, tự hủy hoặc tự hoàn tất theo thời gian; có thể kéo dài nhiều ngày. Luồng hoàn tất bình thường cần khách báo đã trả và thợ xác nhận đã nhận; xác nhận hóa đơn riêng chưa kết thúc công việc. Giữ quy tắc quyết toán một lần và ngoại lệ admin đã chốt. Không tạo luồng đổi lịch qua báo cáo/admin. Sau xác nhận hóa đơn không còn hành động đổi lịch; hỗ trợ/bảo hành vẫn trao đổi trong chat.
