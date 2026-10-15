# Thiết kế kỹ thuật chi tiết

> **P0-1 · 06/10/2026 · v0.1.6 · Đã duyệt: hồ sơ quản lý riêng có version; draft/published, công bố không tự bật nhận việc; phone_verified trước tạo partner, owner và ví rỗng cùng transaction. Tìm theo distance mặc định, vùng tròn đo tới tâm và phải bao phủ khách; cursor theo distance_m/created_at/id, gắn bộ lọc. Tài khoản/provider test tách biệt được phép tạo trực tiếp; OTP, polygon, bản đồ và xếp hạng recommended/rating chưa triển khai. Không production/tiền thật.**

> **B01-04A · 06/10/2026 · v0.1.5: chủ dự án duyệt gộp quản lý phiên và sổ địa chỉ. Một mục phiên đại diện một lần đăng nhập (id = family_id ổn định qua refresh), có created_at, last_seen_at, is_current; state active/expired/revoked; không trả IP, token/hash. Thu hồi chặn toàn bộ family và kiểm lại quyền trong transaction. Địa chỉ thêm is_default/version; địa chỉ đầu tiên khi sổ đang rỗng tự mặc định. Chọn mặc định mới bỏ mặc định cũ và tăng version bản cũ. Gỡ mặc định để chưa có mặc định, không tự chọn mục khác. PUT yêu cầu expected_version. Mọi mutation giữ Idempotency-Key khi retry, kiểm chủ sở hữu; archive giữ dữ liệu lịch sử, không đổi snapshot công việc. Nhập địa chỉ/tọa độ thủ công, chưa chọn GPS/map provider. OTP Pending; không production/chi phí.**

> **B01-04 · 06/10/2026 · v0.1.4:** `Me.version` bắt buộc đã được chủ dự án duyệt, dùng cho lát sửa tên với kiểm phiên bản và gửi lặp an toàn. Nguồn API, QA, viewer và gói hiện hành cập nhật cùng đợt. DB đã có `users.version`; bảng idempotency theo mô hình đã thiết kế. Không đổi nghiệp vụ xác minh, quyền, ngôn ngữ tài khoản hoặc các phần Pending. Các ghi chú cũ bên dưới là mốc lịch sử; tiến độ code xem bộ kế hoạch triển khai trong repo.

> **I18N-04 · 05/10/2026 · v0.1.3 (phạm vi danh mục đã duyệt):** API/data/QA danh mục cập nhật I18N-04 theo quyết định 05/10/2026, phiên bản bổ sung v0.1.3. Các phần ngoài danh mục giữ nguyên trạng thái thiết kế. Gói hiện hành `technical-design-v0.1.1.zip` giữ tên/Drive ID vì được đăng ký như gói cập nhật tại chỗ; phiên bản nội dung xem nguồn, không suy từ tên ZIP.


Phiên bản 0.1.2 · 28/09/2026 · Đợt 1 triển khai local danh mục Expo/NestJS/PostgreSQL/PostGIS. Chi tiết và bằng chứng tại DOC-065; phần ngoài danh mục vẫn là thiết kế, chưa production/tiền thật.

## Đọc nhanh

1. Mở technical-design.html để xem sơ đồ và tra cứu theo nhóm.
2. 01-data-design.md + schema.sql: ERD vật lý, từ điển trường, ràng buộc và kế hoạch migration.
3. 02-api-realtime.md + openapi.json + realtime.json: hợp đồng giao tiếp và sự kiện.
4. 03-qa-plan.md + qa-cases.csv + rtm.json: kế hoạch kiểm thử, chưa phải kết quả test sản phẩm.
5. 04-backlog.md: thứ tự triển khai và điều kiện hoàn thành từng đợt.

Nguồn chuẩn nghiệp vụ: SRS v0.14, FR/NFR v0.16, UX v0.24, Q01/Q02/Q03 và phạm vi pending hiện hành. Sổ Excel quản lý liên kết/ảnh hưởng; không tự thay thế tài liệu gốc. JSON là nguồn dữ liệu cho viewer; sửa nội dung phải tái tạo Markdown/viewer/ZIP cùng đợt.

## Những gì chưa được coi là đã xong

- DDL được kiểm cú pháp không có nghĩa migration đã chạy trên PostgreSQL/PostGIS thật.
- OpenAPI hợp lệ không chứng minh backend có endpoint hoặc đã kiểm bảo mật.
- Test case và RTM là kế hoạch; QA-001…055 vẫn Chưa chạy; QA-056…059 đã kiểm local; QA-060 native bị chặn.
- Đợt 1 chọn pg/SQL migration (ADR-001); chưa chọn provider OTP/map/push/call/ngân hàng, gói hạ tầng; phiên bản runtime/framework Đợt 1 đã khóa trong workspace.
- Q02: khoản giữ treo vẫn pending đợt hiện tại, bắt buộc có cách xử lý qua báo cáo/admin và kiểm chứng trước tiền thật.
- Tiếp theo vẫn cần Design System/đặc tả field, runbook deploy/backup, runbook tài chính, lựa chọn tích hợp và dự toán.

Nguồn triển khai và runbook: [DOC-065](../implementation/dot-1.md), [ADR-001](../implementation/ADR-001-foundation.md). ZIP hiện hành `technical-design-v0.1.1.zip`; `v0.1.zip` là bản lịch sử giữ nguyên.


## LOGTEST-01 · 28/09/2026

Phương án A đã triển khai và kiểm local; chi tiết vận hành/bằng chứng tại [DOC-071](../implementation/logging-testing.md). Native còn BLOCKED; `.github/workflows/quality.yml` đã chuẩn bị, chưa push/chạy remote CI.

## MAP-01 — phiên bản API v0.1.7

Ba endpoint địa điểm và QA-076–079, thử MapLibre + Geoapify Free theo duyệt triển khai 07/10/2026. Chưa billing/production. Báo cáo B03-01 trong repo ghi riêng code/local/native/live provider; DB không đổi. ZIP v0.1.1 tiếp tục là gói hiện hành, tên giữ để không hỏng liên kết.

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

## P0-3 / local-test — 07/10/2026

P0-3 — chủ dự án đồng ý cả hai bổ sung cho local/test ngày 07/10/2026.
Invoice trả thêm note (chuỗi ghi chú của phiên bản đang xem) và revision_reason (lý do yêu cầu sửa gần nhất, null nếu chưa có). Hai trường này đưa nội dung đã có trong nghiệp vụ/Storybook tới app, không đổi quy tắc tiền, quyền hoặc trạng thái. Khách không thấy bản nháp chưa gửi; trong khi người thực hiện sửa, khách tiếp tục thấy bản đã gửi gần nhất và lý do sửa. Bản gửi và bản khóa bất biến.
Kho ảnh local chỉ dùng DEMO/test, bật bằng LOCAL_ASSET_DIRECTORY và LOCAL_ASSET_ORIGIN; từ chối bật trong NODE_ENV=production. Giữ contract cấp quyền tải lên → tải bytes theo URL → complete → ready. URL ký ngắn hạn và kiểm lại phiên/quyền công việc lúc đọc; không mở thư mục tĩnh công khai. Cấu hình adapter thử: JPEG/PNG/WebP, 10 MiB, 25 triệu pixel, tối đa 100 grant/tài khoản/giờ, URL 10 phút. Complete giải mã ảnh, loại metadata và lưu PNG. Đây là giới hạn kỹ thuật adapter thử, không phải quyết định provider hoặc giới hạn nghiệp vụ production. Chưa có dọn ảnh mồ côi, storage bền vững phân tán, quét nội dung hay phê duyệt phát hành.
P0-3 nối ảnh kết quả, nháp/gửi/sửa/xác nhận, giữ phí/point, hai dấu thanh toán, ledger và lịch sử chỉ bằng tiền test. Xác nhận hóa đơn không tự hoàn tất việc. Người thực hiện nhận đủ tiền mới quyết toán, có thể trước dấu khách đã trả; đánh giá đủ điều kiện chỉ khi có cả hai dấu. API khách không lộ ví/nợ/thiếu phí của partner. Q02, ngân hàng, admin hoàn tất thay và tiền thật không được mở từ quyết định này.
Bằng chứng triển khai ở báo cáo B06-01 trong repo. Local/native, CI và UAT được ghi riêng; báo cáo không tải Drive.

## P1-01 A/B hiện hành — 13/10/2026

P1-01 A/B đã được chủ dự án duyệt ngày 13/10/2026. Chuẩn hiện hành cho đội ngũ và xác minh local/test là OpenAPI v0.1.11; các đoạn trước mô tả OTP Pending hoặc mã mẫu là lịch sử/phạm vi production, không phủ quyết phần local này.
Chỉ mở OTP purpose=verify trong phiên đăng nhập: email qua Mailpit trên máy, SMS qua hộp nhận mô phỏng. Mã ngẫu nhiên 6 số, hạn 5 phút, tối đa 5 lần sai; gửi lại sau 60 giây, 5 lần/liên hệ/giờ, 20 lần/tài khoản/giờ và 100 lần/IP/giờ. Mã gắn tài khoản, liên hệ và lần đăng nhập; gửi lại vô hiệu mã cũ. Xác minh email không xác minh điện thoại. Không thay email/điện thoại đã có hoặc chiếm liên hệ tài khoản khác. Chỉ DB DEMO/test cô lập và liên hệ cho phép; disabled mặc định, chặn production. Chưa mở OTP login/recover, MFA admin, email/SMS thật, billing hoặc tiền thật.
Chủ hoặc members.manage mời bằng email hoặc điện thoại, permissions=[]; lời mời 7 ngày, không trả token cho quản lý. Người nhận đăng nhập, xác minh đúng liên hệ rồi chủ động nhập token nhận lời. List/gửi lại/thu hồi kiểm quyền hiện hành; gửi lại thay token cũ. Nhận lời kiểm lại người mời; gia nhập lại dùng cùng membership nhưng không khôi phục quyền cũ. Lịch sử trạng thái pending/accepted/expired/revoked/replaced tách queued/submitted/failed/unknown của việc chuyển thư; submitted không chứng minh người nhận đã đọc.
GET /me/memberships phục vụ cả nhân viên thường và lịch sử đã rời. Cấp/thu hồi quyền dùng lý do, expected_version, Idempotency-Key và grant nhập lại mật khẩu qua POST /auth/reauthenticate. Grant hạn 5 phút, một lần, gắn user/family và scope membership.grants; refresh không gia hạn. Cấm tự sửa/sửa chủ/cấp vượt quyền; quyền thao tác ví cần wallet.read. Không coi nhập lại mật khẩu là MFA, không mở nghiệp vụ ngân hàng từ enum quyền.
Gỡ/tự rời: xem trước số việc cần bàn giao và version; xác nhận có lý do, máy chủ kiểm lại dưới khóa partner → job → invoice. Việc chưa có dấu nhận tiền về chờ phân công, chỉ bỏ nháp chưa gửi; giữ bản đã gửi/khóa, ledger, khoản giữ và dấu thanh toán. Việc đã nhận tiền giữ người thực hiện lịch sử. Thu hồi quyền ngay, giữ phòng chat cá nhân và không sao chép cho người mới. Đầu mối dùng Partner.version, có thể null để về cửa hàng; rời sẽ reset nếu đang là đầu mối. Gọi Internet vẫn chưa triển khai.
OTP/token lưu HMAC; liên hệ và nội dung hàng chờ mã hóa, xóa payload sau gửi/hết hạn. Worker khóa bản ghi để tránh hai lần gửi đồng thời; crash sau gửi vẫn có thể gây thư trùng, token chỉ dùng một lần. Audit bất biến ghi actor/lý do/quyền trước-sau/việc bàn giao, không ghi mật khẩu, token, OTP hay nội dung chat. Snapshot retry không chứa bí mật thô. UI Việt/Anh/Nhật đi từ Tài khoản → Xác minh liên hệ hoặc Đội ngũ → Thành viên/Lời mời/Đã rời/Quyền truy cập. Mất mạng giữ thao tác để thử lại; đổi tài khoản loại dữ liệu riêng. Bằng chứng code/native/CI/UAT được ghi riêng trong báo cáo repo, không coi spec là nghiệm thu.

## P1-02 — Tùy chọn nhắc lịch riêng, 14/10/2026

P1-02 ngày 14/10/2026: chủ dự án duyệt bổ sung công tắc nhắc lịch riêng và đồng bộ spec. Settings có bốn boolean bắt buộc message_push, call_push, service_push, reminder_push; mặc định true. reminder_push chỉ điều khiển gửi nhắc 24 giờ/1 giờ ra ngoài ứng dụng, độc lập service_push (công việc/hóa đơn). Tắt bất kỳ mục nào vẫn giữ inbox và lịch sử trong app; thông báo an toàn tài khoản không bị tắt. GET/PUT /me/notification-settings chỉ chính tài khoản, PUT giữ Idempotency-Key khi retry. Không duyệt provider, gửi push/email/SMS thật, billing hoặc production. Bằng chứng triển khai/local/native/CI/UAT được ghi riêng trong báo cáo B05-01 ở repo.


## RT-01A — cập nhật đã duyệt

RT-01A — 14/10/2026: chủ dự án đã duyệt triển khai Socket.IO 4, chỉ transport websocket, một NestJS instance. Path /v1/realtime/socket.io, namespace /; access token qua auth.token, không query URL. HTTP giữ thao tác ghi, ACK sau commit và lấy bù. Mỗi app một kết nối foreground, reconnect khi refresh, đóng khi logout/background; kiểm phiên và quyền hiện hành trước từng lần phát. Sự kiện là tín hiệu tải lại, không tự cộng tiền, unread hoặc quyết toán. Bốn công tắc push không tắt inbox/chat foreground. RT-01B/Redis, push ngoài app, gọi, presence/typing, provider/billing/production chưa mở.

Contract chi tiết: `docs/technical-design/realtime.json` v0.2, API v0.1.13. Dữ liệu thêm correlation_id và realtime_deliveries; unique theo event/user, lease riêng từng consumer; không dùng processed_at chung. QA-094–097 bổ sung kiểm realtime; không đổi trạng thái nghiệm thu của QA cũ. `notification.read.v1` chỉ lần đầu; thêm `invoice.revision_requested.v1`; invoice settled/payment_reported chuẩn hóa payload IDs/version, đọc eligibility/tiền bằng HTTP đúng quyền.


## MSG-01 — Tách Tin nhắn và Thông báo

MSG-01 — 15/10/2026, chủ dự án đã chốt: Tin nhắn và Thông báo có hai bộ đếm chưa đọc độc lập. Tin nhắn mới chỉ tăng badge Tin nhắn, không tạo mục trong inbox Thông báo và không tăng badge chuông. Badge Tin nhắn là tổng Conversation.unread trên tất cả phòng còn quyền truy cập, không phải số phòng; giữ định nghĩa unread hiện hành (không tính tin do chính mình gửi, mốc đọc theo sequence, gồm tin hệ thống của phòng). Badge Thông báo chỉ đếm mục chưa đọc ngoài chat, gồm công việc/hóa đơn/nhắc lịch và các loại khác đã được triển khai. Đọc một nhóm không đánh dấu đọc nhóm kia. Không hiển thị badge khi bằng 0; trên 99 hiện 99+. Sự kiện realtime chỉ yêu cầu tải lại HTTP, không cộng số trực tiếp; lấy bù khi reconnect/foreground, xóa số của tài khoản cũ khi đăng xuất/đổi tài khoản. Tắt message_push chỉ tắt push ngoài app, không tắt badge hoặc lịch sử chat. Không mở thêm provider hoặc production.
