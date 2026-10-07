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

## MAP-01 — chọn địa điểm, thử local ngày 07/10/2026

Theo yêu cầu triển khai tiếp sau khi chốt MapLibre + Geoapify Free: bộ chọn chung cho tìm dịch vụ, sổ địa chỉ, cửa hàng và tâm vùng. Có nhập địa chỉ/gợi ý, tìm cả chuỗi, chạm/kéo bản đồ, GPS khi bấm nút và địa chỉ đã lưu. Theo yêu cầu MAP-03 ngày 07/10/2026, bỏ nút và ô nhập tọa độ thủ công ở cả bốn nơi; tọa độ vẫn được lấy từ địa điểm đã chọn để tìm/lưu theo API hiện có. Người dùng chọn kết quả và xác nhận; không tự lấy dòng đầu. Gõ truy vấn khác hủy lựa chọn cũ, sửa mô tả tầng/phòng giữ ghim. Hủy không sửa form. Đổi tài khoản xóa bản nháp riêng; phản hồi cũ không ghi đè điểm mới.

Ba POST `/v1/locations/autocomplete`, `/geocode`, `/reverse` nhận JSON body theo OpenAPI v0.1.7. Query 3–300 ký tự, locale vi/en/ja, tối đa 5 gợi ý. Tra ngược giữ chính điểm yêu cầu, rỗng/lỗi vẫn cho nhập mô tả sau khi có điểm. Khách chưa đăng nhập được tra cứu với hạn mức IP; bearer hợp lệ dùng tài khoản. Pilot một tiến trình: 4 lookup/giây, 30/actor/phút, 1000/24h; restart reset bộ đếm. 429 có Retry-After; timeout provider 6 giây trả 504 TIMEOUT. Các giới hạn này không bao gồm tile và không phải bảo đảm chặn chi phí toàn project.

Key tra cứu ở server; key tile công khai ở app. Chưa billing/production, chưa dùng Google. Không ghi log địa chỉ/tọa độ/key, không lưu lịch sử GPS. Geoapify và OpenStreetMap được ghi nguồn. Bản đồ nền do app tải trực tiếp; không gửi token dự án tới Geoapify.

Không migration: giữ `{text, point}` và quyền/version/idempotency của API lưu hiện hành. `source` chỉ ở state app, ID gợi ý chỉ tạm. Tâm vùng không thành vị trí thợ công khai; chỉ điểm cửa hàng đã công khai được vẽ trong hồ sơ. Polygon, gom ghim toàn bộ kết quả, routing/ETA và theo dõi thợ ngoài đợt. Bằng chứng code/local/native ở báo cáo B03-01 trong repo; không suy ra UAT/production.

## MAP-02 — bản đồ kết quả, API v0.1.8

MAP-02 — 07/10/2026, quyết định đã chốt: chỉ ghim địa điểm đã đánh dấu công khai; người chưa có điểm công khai vẫn hiện trong danh sách. Mở rộng bản đồ kết quả sau MAP-01, trước P0-2; thay phần loại trừ bản đồ kết quả của MAP-01. Giữ MapLibre + Geoapify Free, chưa billing/production.

Sau khi tìm, khách chuyển Danh sách/Bản đồ trên cùng kết quả và bộ lọc. Điểm cần dịch vụ màu xanh lá, địa điểm công khai màu xanh dương; bấm ghim xem tên, địa chỉ và mở hồ sơ. Ghim trùng tọa độ gom chung nhưng vẫn chọn được từng người. Người không có ghim nằm trong danh sách bên dưới; có thể chuyển về danh sách đầy đủ. Chỉ vẽ các kết quả đã tải; Xem thêm bổ sung cả danh sách và ghim. Đổi điểm hoặc gửi tìm mới bỏ kết quả cũ. Lỗi nền bản đồ cho thử lại hoặc chuyển danh sách.

OpenAPI v0.1.8: GET /v1/partners thêm PartnerCard.map_location bắt buộc, giá trị Address {text, point} hoặc null. Với mỗi người đủ điều kiện tìm kiếm, lấy địa điểm active=true, public=true gần điểm tìm nhất và nằm trong bán kính; hòa khoảng cách chọn created_at rồi id. Không có điểm phù hợp trả null, không loại người khỏi kết quả. Giữ nguyên điều kiện công bố/nhận việc/kiểm duyệt, thứ tự, bộ lọc và cursor. distance_m/distance_kind tiếp tục phục vụ xếp hạng theo cửa hàng hoặc tâm vùng, không suy ra khoảng cách tới ghim.

Không dùng hoặc trả service_areas.center làm ghim; không lộ địa điểm private/đã lưu trữ. Đây là địa điểm khai báo công khai, không phải GPS trực tiếp của thợ. Không migration, không đổi quyền ghi public/private. Không thêm tra cứu provider theo từng thợ, routing, ETA hoặc tracking. Bằng chứng và ảnh chạy app ở báo cáo B03-02 trong repo; kiểm local/simulator không thay UAT hoặc phê duyệt production.

## MAP-03 / P0-2 — phạm vi đã duyệt ngày 07/10/2026

MAP-03 và P0-2 — quyết định chủ dự án ngày 07/10/2026, API v0.1.9.
Bỏ nút và ô nhập tọa độ thủ công trong tìm kiếm, sổ địa chỉ, cửa hàng, vùng phục vụ và form thuê. Người dùng chọn địa chỉ/gợi ý, ghim bản đồ, GPS theo nút hoặc địa chỉ đã lưu; tọa độ vẫn là dữ liệu nội bộ/API. Phần mô tả nhập tọa độ trong các mốc trước là lịch sử đã được thay thế.
Job bổ sung service_mode, time_mode, location_id (null ngoài cửa hàng), note và eta (null trước nhận/hẹn trước). Làm ngay bắt buộc ETA khi nhận; lưu thời điểm dự kiến đến và lịch ban đầu, không thêm nút Bắt đầu. Đổi lịch cập nhật scheduled_at, giữ eta ban đầu và tăng schedule_version/lịch sử. PartnerProfile bổ sung public_locations gồm id + address chỉ cho địa điểm active/public, và service_modes theo skill_id; không trả tâm vùng hoặc điểm riêng. Máy chủ đối chiếu location_id với cửa hàng hiện hành và lấy địa chỉ từ DB, không tin địa chỉ cửa hàng do client gửi.
Gói P0-2 local/test: khách tạo/đọc/rút yêu cầu, partner nhận/từ chối, đổi lịch/dừng trước hóa đơn khóa, phân công theo quyền. Có chi phí đã thỏa thuận thì dừng vẫn giữ accepted để tiếp tục hóa đơn ở P0-3; lưu cờ và lý do, không tạo hóa đơn giả. Không có chi phí chuyển stopped. Không tự hết hạn, hủy hay hoàn tất theo giờ. Giữ xác minh điện thoại ở backend khi gửi/nhận; chỉ dùng tài khoản DEMO local/test đã được duyệt, OTP thật Pending.
Chat tối thiểu dùng API HTTP: tạo/mở lại phòng trước thuê, gửi/đọc tin văn bản, thứ tự sequence, chống trùng client_message_id và idempotency, mốc đã đọc chỉ tăng, tải lại khi quay lại màn/app hoặc bấm cập nhật. Khách–cửa hàng/doanh nghiệp tách khách–nhân viên; phân công thêm tin hệ thống trong phòng riêng. Đổi người không sao chép lịch sử; người cũ giữ chat của mình nhưng mất quyền việc sau thu hồi/phân công lại. Ghi sự kiện bền vững cùng transaction; WebSocket/worker phát sự kiện, push/nhắc lịch, gọi và file đính kèm chưa nghiệm thu trong gói HTTP này. Các yêu cầu sản phẩm đầy đủ vẫn giữ, không coi phần chưa triển khai đã hoàn tất.
Bằng chứng code/local, web và native nằm trong báo cáo B03-03/B03-04 ở repo; không thay CI từ xa, UAT, production hoặc tiền thật.
