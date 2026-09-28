# 05 · Sequence kỹ thuật

Các mũi tên mô tả thiết kế dự kiến, chưa chứng minh backend đã xử lý được cạnh tranh hoặc tích hợp thật.

## Thuê và nhận việc

```mermaid
sequenceDiagram
  participant A0 as Khách / Partner
  participant A1 as API
  participant A2 as PostgreSQL
  participant A3 as Worker / Push
  A0->>A1: Gửi yêu cầu thuê + Idempotency-Key
  A1->>A2: Kiểm khách, kỹ năng, vùng, partner; INSERT job + outbox
  A2->>A1: COMMIT → job_id + version
  A1->>A0: Trả trạng thái chờ
  A3->>A2: Đọc outbox đã commit; gửi thông báo
  A0->>A1: Partner chấp nhận + expected_version; ETA nếu làm ngay
  A1->>A2: Lock job, kiểm quyền; update accepted; room/event unique
  A2->>A1: COMMIT; chỉ một lần nhận
  A1->>A0: Kết quả mới nhất
  Note over A0,A3: Request lặp cùng key/body trả kết quả cũ; key cũ/body khác bị từ chối.

```

Mất mạng sau commit: client tra trạng thái theo key rồi retry cùng key. Không tạo yêu cầu mới chỉ vì không nhận được response.

## Phân công và phòng chat riêng

```mermaid
sequenceDiagram
  participant A0 as Quản lý
  participant A1 as API
  participant A2 as PostgreSQL
  participant A3 as Khách / nhân viên
  A0->>A1: Phân công người mới + job_version
  A1->>A2: Lock job; kiểm membership và jobs.assign
  A1->>A2: Kết thúc assignment cũ; tạo assignment mới
  A1->>A2: Upsert conversation theo cặp khách–nhân viên
  A1->>A2: Liên kết việc + system message unique + outbox
  A2->>A1: COMMIT toàn bộ
  A1->>A3: Báo người phụ trách mới; room_id dùng lại
  Note over A0,A3: Client nhân viên cũ ghi tiếp → API kiểm assignment mới và từ chối.
  A3->>A1: Đọc lịch sử riêng nếu là participant

```

Quản lý chỉ thấy việc và trạng thái bàn giao. Không copy chat cũ sang phòng người mới. Nếu đã khóa hóa đơn, bàn giao không đổi invoice author/history và không đổi tài chính.

## Khóa hóa đơn và giữ số dư

```mermaid
sequenceDiagram
  participant A0 as Khách
  participant A1 as API / Billing
  participant A2 as DB + Ledger
  participant A3 as Partner
  A0->>A1: Confirm(version, points, key)
  A1->>A2: BEGIN; khóa job/invoice và accounts theo thứ tự cố định
  A1->>A2: Kiểm quyền, version, point, phí sau mọi hold
  Note over A0,A3: Thiếu một điều kiện → ROLLBACK; không giữ phí hoặc point riêng lẻ.
  A1->>A2: INSERT holds F/R; confirmation + invoice LOCKED + outbox
  A2->>A1: COMMIT
  A1->>A0: Tổng, point dùng, tiền trực tiếp; không có số dư partner
  A1->>A3: Thông báo hóa đơn khóa; thông tin ví riêng theo quyền
  Note over A0,A3: Mất response: retry cùng key / GET trạng thái, không trừ lần nữa.

```

Request sửa hóa đơn chạy cạnh tranh với confirm cũng khóa cùng invoice/version. Chỉ một bên thắng; bên còn lại nhận 409 và xem bản mới.

## Quyết toán một lần

```mermaid
sequenceDiagram
  participant A0 as Thợ / Admin
  participant A1 as API
  participant A2 as DB + Ledger
  participant A3 as Worker
  A0->>A1: Xác nhận nhận đủ / admin hoàn tất có case + lý do
  A1->>A2: BEGIN; khóa invoice, job, accounts; kiểm quyền mới nhất
  A1->>A2: Nếu settlement đã có → trả kết quả đã có
  Note over A0,A3: Chưa có: phải LOCKED, đúng hold/version; admin phải có chứng cứ và xác thực.
  A1->>A2: INSERT settlement UNIQUE(invoice_id); consume holds
  A1->>A2: Posting phí / bù point / thưởng; cập nhật projection
  A1->>A2: Mark invoice/job hoàn tất + audit + outbox
  A2->>A1: COMMIT nguyên tử
  A1->>A0: Kết quả quyết toán
  A3->>A2: Đọc outbox; gửi thông báo có retry/dedupe

```

Admin và thợ bấm cùng lúc: dùng cùng operation quyết toán; unique invoice là hàng rào cuối. Không gọi nhà cung cấp push trong transaction giữ khóa.

## Rút tiền và mất kết quả

```mermaid
sequenceDiagram
  participant A0 as Partner / Admin
  participant A1 as API + DB
  participant A2 as Ngân hàng
  participant A3 as Đối soát
  A0->>A1: Partner gửi rút + key
  A1->>A1: Lock wallet; kiểm tiền/bank; tạo payout + hold
  A0->>A1: Admin duyệt và đánh dấu đang chuyển
  A0->>A2: Chuyển theo mã payout; ban đầu thao tác ngân hàng thủ công
  Note over A0,A3: Không biết chuyển thành công hay chưa → UNKNOWN; giữ tiền, không chuyển lại.
  A3->>A2: Đọc sao kê / xác minh mã ngân hàng
  A3->>A1: Ghi kết quả với chứng cứ; bank_ref duy nhất
  A1->>A1: Thành công: posting + consume; thất bại chắc chắn: release
  A1->>A0: Kết quả và lịch sử

```

Tự động hóa sau này cần provider idempotency hoặc truy vấn mã lệnh trước retry. Nếu nhà cung cấp không hỗ trợ, giữ đường đối soát thủ công.

## Đổi lịch và chống nhắc lịch cũ

```mermaid
sequenceDiagram
  participant A0 as Khách / Thợ
  participant A1 as API
  participant A2 as DB
  participant A3 as Worker
  A0->>A1: Đổi lịch đã thống nhất + expected_version
  A1->>A2: Kiểm thời gian/quyền; tăng schedule_version; lưu lịch sử
  A1->>A2: Outbox thông báo đổi lịch + mốc 24h/1h còn tương lai
  A2->>A1: COMMIT; không chờ bên kia xác nhận
  A3->>A2: Đến hạn: kiểm version hiện tại và job còn phù hợp
  Note over A0,A3: Version cũ hoặc việc đã đóng → bỏ reminder.
  A3->>A0: Gửi một reminder mỗi job/version/mốc

```

Worker chạy lại không gửi một sự kiện nghiệp vụ hai lần. Push có thể trùng/không đến ở nhà cung cấp; app dedupe notification_id và luôn đọc dữ liệu mới.

## Khung API để đặc tả tiếp

|Nhóm|Lệnh / đọc|Hợp đồng bắt buộc|
|---|---|---|
|Search / hồ sơ|GET /partners?location&radius=10000&skill&mode|Filter area + visibility; cursor; DTO công khai/đăng nhập riêng|
|Thuê / nhận|POST /jobs; POST /jobs/{id}/accept|Idempotency-Key + expected_version cho update; actor lấy từ session|
|Phân công / lịch|POST /jobs/{id}/assignments; POST /jobs/{id}/reschedule|Kiểm tenant/membership; lock/version; ghi lịch sử|
|Hóa đơn|POST /jobs/{id}/invoice-versions; POST /invoices/{id}/revision-requests|Ảnh hợp lệ; không UPDATE version đã gửi|
|Khóa / đã trả / nhận|POST /invoices/{id}/confirm; /payment-reported; /settle|Tiền là chuỗi số nguyên ở JSON để tránh mất chính xác; server tính; không settlement qua GET|
|Admin|POST /reports/{id}/complete-on-behalf|Fresh admin auth, reason, evidence refs, version; cùng hàm settle|
|Ví|POST /topups; /payouts; /payouts/{id}/decision|Idempotency + proof + state guards; bank snapshot|
|Chat / gọi|POST /conversations/direct; /messages; /calls/token|Participant/assignment check; client_message_id; token ngắn hạn|
|Lỗi / retry|401/403; 409 VERSION_CONFLICT; 422 INVALID; 429; 500 INTERNAL; 503 SERVICE_UNAVAILABLE|Lỗi có code, correlation_id, retryable; không lộ dữ liệu; mạng lỗi tra key trước retry|

Idempotency phải lưu trong DB với actor + operation + key + request_hash + result/resource_id. Unique bảo vệ cả request đang cạnh tranh; retry cùng payload trả trạng thái đã commit, khác payload báo conflict. Key vận chuyển không thay ràng buộc nghiệp vụ invoice/bank_ref. Retry deadlock chỉ giới hạn số lần, cùng key, và phải chạy lại toàn transaction.


### Quy tắc hiện hành 23/09 — công việc

Đã chốt 23/09/2026: chặn thuê chính mình hoặc doanh nghiệp đang là thành viên. Đổi lịch chỉ để thay đổi ngày/giờ hẹn sau khi hai bên trao đổi, không bắt buộc vì công việc kéo dài. Công việc đã nhận không tự hết hạn, tự hủy hoặc tự hoàn tất theo thời gian; có thể kéo dài nhiều ngày. Luồng hoàn tất bình thường cần khách báo đã trả và thợ xác nhận đã nhận; xác nhận hóa đơn riêng chưa kết thúc công việc. Giữ quy tắc quyết toán một lần và ngoại lệ admin đã chốt. Không tạo luồng đổi lịch qua báo cáo/admin. Sau xác nhận hóa đơn không còn hành động đổi lịch; hỗ trợ/bảo hành vẫn trao đổi trong chat.
