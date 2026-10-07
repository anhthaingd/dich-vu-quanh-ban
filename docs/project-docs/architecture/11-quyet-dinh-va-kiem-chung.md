# 06 · Quyết định và phần còn mở

Cập nhật 22/09/2026: Q01 và Q02 đã chốt; Q03 đã chốt công nghệ; Q04 chưa có ngân sách.

## Sổ quyết định sau phản hồi

|Mã / trạng thái|Nội dung|Tác động / phần còn mở|
|---|---|---|
|Q01 · Đã chốt|Khách báo đã trả và thợ xác nhận đã nhận tiền; quyết toán thành công mới mở đánh giá hai chiều|Chủ dự án xác nhận ngày 22/09/2026. Khóa hóa đơn chưa đủ. Cần kiểm cả hai dấu xác nhận, không chỉ trạng thái job hoàn tất.|
|Q02 · Đã chốt phạm vi|Tạm hoãn xử lý khoản giữ bị treo trong đợt hiện tại; bắt buộc thiết kế và kiểm chứng cách xử lý qua báo cáo/admin trước khi chạy tiền thật|Nếu việc không hoàn tất hoặc hai bên tranh chấp sau khóa, quyền hoàn tất thay thợ không giải quyết được. Cần chốt nhánh giải phóng có kiểm soát ở một đợt sau trước launch có tiền, hoặc chưa mở giao dịch thật. Không tự đưa hoàn tiền trở lại scope.|
|Q03 · Đã chốt|Expo/React Native + web React + NestJS + PostgreSQL/PostGIS, backend chia module|Chủ dự án đã đồng ý bộ công nghệ. Có bộ kỹ thuật v0.1 để review. Next.js/ORM/nhà cung cấp vẫn chưa chốt; chưa mua hạ tầng.|
|Q04 · Chưa có ngân sách|Chủ dự án chưa xác định ngân sách vận hành; chưa chọn gói trả phí hoặc nhà cung cấp|Chưa thể chọn nhà cung cấp hay dự toán đáng tin khi thiếu ngân sách/quy mô cuộc gọi. Có thể tiếp tục API độc lập nhà cung cấp trong khi chờ.|

## Kết quả rà soát thiết kế — không phải test sản phẩm

|Kịch bản|Thiết kế đã có|Còn cần kiểm chứng|
|---|---|---|
|Bấm xác nhận hai lần|Idempotency + row lock + unique confirmation|Test DB concurrency khi có backend|
|Hai việc dùng cùng point|Lock cùng point account, trừ tổng holds|Test song song đủ/thiếu tiền|
|Thợ và admin cùng quyết toán|Một service settle, unique invoice|Test cạnh tranh + crash ở mỗi bước|
|Nhân viên bị thay|Backend kiểm assignment mới; giữ phòng riêng|Test quyền nhiều tenant / thiết bị phiên cũ|
|Rút rồi mất mạng|UNKNOWN giữ tiền, mã ngân hàng unique|Thử nhà cung cấp thật + quy trình thao tác tay|
|Thông báo lỗi|Outbox retry, nghiệp vụ đã commit không rollback|Test mất worker/push, backlog, reconnect|
|Đổi lịch nhiều lần|Schedule version và reminder unique|Test timezone/mốc qua/worker cũ|
|Giao dịch khóa không thể hoàn tất|Đã chỉ rõ khoảng trống Q02|Không thể khẳng định toàn bộ ngoại lệ đã trơn tru|
|Nhập số tiền rất lớn|Số nguyên chính xác, kiểm overflow, không cap nghiệp vụ|Test BIGINT/numeric và client không dùng float cho công thức|

Đã có baseline BRD/PRD/FR-NFR/SRS/UX, các luồng và wireframe. Q03 đã chốt: Expo/React Native, React, NestJS, PostgreSQL/PostGIS. Đã soạn thiết kế kỹ thuật v0.1 gồm ERD vật lý/DDL tham chiếu, OpenAPI/realtime, kế hoạch QA/RTM/UAT và backlog; thiết kế ngoài Đợt 1 vẫn chờ review; backend danh mục local đã triển khai 28/09 theo DOC-065, chưa native/remote CI/production. Còn Design System/đặc tả field, runbook CI/CD/backup, runbook Q02 và tích hợp/dự toán. Q04 chưa có ngân sách; không tự chọn gói trả phí.


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
