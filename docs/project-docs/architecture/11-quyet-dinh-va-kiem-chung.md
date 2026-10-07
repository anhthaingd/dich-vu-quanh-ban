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

Theo yêu cầu triển khai tiếp sau khi chốt MapLibre + Geoapify Free: bộ chọn chung cho tìm dịch vụ, sổ địa chỉ, cửa hàng và tâm vùng. Có nhập địa chỉ/gợi ý, tìm cả chuỗi, chạm/kéo bản đồ, GPS khi bấm nút, địa chỉ đã lưu và nhập tọa độ nâng cao. Người dùng chọn kết quả và xác nhận; không tự lấy dòng đầu. Gõ truy vấn khác hủy lựa chọn cũ, sửa mô tả tầng/phòng giữ ghim. Hủy không sửa form. Đổi tài khoản xóa bản nháp riêng; phản hồi cũ không ghi đè điểm mới.

Ba POST `/v1/locations/autocomplete`, `/geocode`, `/reverse` nhận JSON body theo OpenAPI v0.1.7. Query 3–300 ký tự, locale vi/en/ja, tối đa 5 gợi ý. Tra ngược giữ chính điểm yêu cầu, rỗng/lỗi vẫn cho nhập mô tả sau khi có điểm. Khách chưa đăng nhập được tra cứu với hạn mức IP; bearer hợp lệ dùng tài khoản. Pilot một tiến trình: 4 lookup/giây, 30/actor/phút, 1000/24h; restart reset bộ đếm. 429 có Retry-After; timeout provider 6 giây trả 504 TIMEOUT. Các giới hạn này không bao gồm tile và không phải bảo đảm chặn chi phí toàn project.

Key tra cứu ở server; key tile công khai ở app. Chưa billing/production, chưa dùng Google. Không ghi log địa chỉ/tọa độ/key, không lưu lịch sử GPS. Geoapify và OpenStreetMap được ghi nguồn. Bản đồ nền do app tải trực tiếp; không gửi token dự án tới Geoapify.

Không migration: giữ `{text, point}` và quyền/version/idempotency của API lưu hiện hành. `source` chỉ ở state app, ID gợi ý chỉ tạm. Tâm vùng không thành vị trí thợ công khai; chỉ điểm cửa hàng đã công khai được vẽ trong hồ sơ. Polygon, gom ghim toàn bộ kết quả, routing/ETA và theo dõi thợ ngoài đợt. Bằng chứng code/local/native ở báo cáo B03-01 trong repo; không suy ra UAT/production.
