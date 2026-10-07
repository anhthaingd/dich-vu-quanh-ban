# 02 · Quyền theo tài nguyên

Một quản lý có thể kiêm chủ, điều phối và tài chính. Đây là các quyền có thể gộp, không phải yêu cầu tuyển nhiều người.

## Ma trận quyền chính

|Thao tác|Khách|Thợ tự do|Chủ / quản lý được cấp quyền|Nhân viên được giao|Admin|
|---|---|---|---|---|---|
|Xem công việc|Của mình|Của mình|Của doanh nghiệp|Việc đang được giao|Qua nhiệm vụ hỗ trợ, có nhật ký|
|Nhận / từ chối thuê|Gửi / rút khi chờ|Có|jobs.accept|Không mặc định|Không nhận thay|
|Phân công nhân viên|Không|Không áp dụng|jobs.assign|Không mặc định|Không phân công thay|
|Đổi lịch|Việc của mình|Có|jobs.manage|Việc được giao|Không mặc định|
|Lập / gửi hóa đơn|Không|Có|Chỉ khi có quyền thực hiện việc|Có, không cần quản lý duyệt|Không tạo thay|
|Xác nhận hóa đơn / point|Đúng khách|Không ở vai thợ|Không|Không|Không xác nhận thay khách|
|Xác nhận nhận tiền|Chỉ báo đã trả|Có|Khi là người thực hiện|Có, người hiện tại|Chỉ nhánh báo cáo có chứng cứ|
|Xem ví / số dư partner|Không|Ví của mình|wallet.read|Không mặc định|finance.read khi cần|
|Nạp / rút / ngân hàng|Không ở vai khách|Ví của mình|wallet.topup / withdraw / bank.manage|Không mặc định|Duyệt/đối chiếu, không rút thay partner|
|Sửa năng lực / vùng / nhận việc|Không|Có|profile.manage|Không mặc định|Kiểm duyệt; không giả danh sửa|
|Xem chat riêng khách–thợ|Thành viên phòng|Thành viên phòng|Chỉ nếu chính mình là thành viên|Thành viên phòng|Không mặc định; chỉ chứng cứ được nộp|
|Gọi trong app|Theo việc đã nhận|Theo việc|Đầu mối doanh nghiệp được chỉ định|Người được giao hiện tại|Không nghe / tham gia cuộc gọi|
|Đánh giá bên kia|Một lượt/việc|Một lượt/việc|reviews.respond / reviews.write|Đề xuất đại diện partner nếu được cấp|Ẩn/khôi phục có lý do, không sửa sao|
|Đình chỉ / xét hồ sơ|Không|Không|Không|Không|moderation.manage|
|Nhật ký / báo cáo tổng|Lịch sử mình|Lịch sử mình|Trong doanh nghiệp theo quyền|Phần công việc được giao|audit.read / reports.read|
|Cấp quyền nhân viên|Không|Không|members.manage trong giới hạn mình được cấp|Không mặc định|Không tự trở thành thành viên doanh nghiệp|

Mặc định cửa hàng 1 quản lý + 2 thợ: quản lý có profile.manage, jobs.accept, jobs.assign, jobs.manage, members.manage và quyền ví; 2 thợ chỉ có quyền thực hiện việc được giao. Quản lý muốn tự làm việc thì tự phân công cho mình. Chủ có toàn quyền trong doanh nghiệp nhưng không có quyền đọc phòng riêng của người khác. Không ai tự nâng quyền vượt quyền cấp của mình.

Mỗi request kiểm tài khoản → membership hiện hành → quyền hành động → đúng tài nguyên/tenant → trạng thái/version. partner_id và user_id do server đối chiếu, không tin client. Chuyển chế độ khách/partner chỉ đổi giao diện; không cấp quyền. Một user có thể là khách và thành viên partner; point luôn thuộc user, ví doanh nghiệp thuộc partner, không thuộc nhân viên nhận tiền.

## Trường hợp cần kiểm thử quyền

|Tình huống|Kết quả bắt buộc|
|---|---|
|Nhân viên cũ gửi hóa đơn sau khi bàn giao|Bị từ chối dù tab cũ còn mở; chat riêng vẫn đọc/nhắn được khi tài khoản còn hoạt động|
|Quản lý đổi URL thành phòng khách–nhân viên|403; không trả metadata/nội dung riêng|
|Khách thiếu phí partner|Chỉ nhận thông báo chờ bổ sung; không có balance/debt/shortfall trong payload|
|Hai doanh nghiệp có cùng nhân viên|Mỗi việc kiểm đúng membership và partner; không rò dữ liệu giữa tenant|
|Người dùng có hai chế độ|Đề xuất chặn tự thuê/chốt với chính mình; quy tắc bên liên quan cần chốt trong chính sách chống gian lận trước tiền thật|
|Tài khoản nhân viên bị khóa|Không dùng token cũ để ghi nhận tiền; có thể chuyển người hoặc xử lý hỗ trợ theo chứng cứ|
|Admin xem chứng cứ|Ghi audit truy cập; link ảnh ngắn hạn; không đưa chứng cứ riêng vào thông báo chung|

Quy tắc mở đánh giá đã chốt: customer_payment_reported_at có giá trị VÀ worker_receipt_confirmed_at có giá trị VÀ settlement thành công. Thứ tự bấm có thể khác nhau; nếu thợ xác nhận trước thì chờ khách báo đã trả. Không dùng riêng invoice LOCKED hoặc job COMPLETED làm điều kiện. Admin hoàn tất thay thợ không tự giả lập dấu xác nhận của thợ và không tự mở đánh giá khi thiếu điều kiện.

Trường hợp thanh toán toàn bộ bằng point: không yêu cầu trả thêm tiền. Đề xuất nhãn xác nhận phía khách là “Xác nhận đã thanh toán bằng point”, phía thợ là “Xác nhận hoàn tất”; lưu các dấu xác nhận tương ứng, không tạo thêm giao dịch tài chính. Nhãn riêng này vẫn là đề xuất; wireframe v0.24 đã đồng bộ điều kiện hai dấu xác nhận, giữ nhãn chung Tôi đã thanh toán.


### Quy tắc hiện hành 23/09 — công việc

Đã chốt 23/09/2026: chặn thuê chính mình hoặc doanh nghiệp đang là thành viên. Đổi lịch chỉ để thay đổi ngày/giờ hẹn sau khi hai bên trao đổi, không bắt buộc vì công việc kéo dài. Công việc đã nhận không tự hết hạn, tự hủy hoặc tự hoàn tất theo thời gian; có thể kéo dài nhiều ngày. Luồng hoàn tất bình thường cần khách báo đã trả và thợ xác nhận đã nhận; xác nhận hóa đơn riêng chưa kết thúc công việc. Giữ quy tắc quyết toán một lần và ngoại lệ admin đã chốt. Không tạo luồng đổi lịch qua báo cáo/admin. Sau xác nhận hóa đơn không còn hành động đổi lịch; hỗ trợ/bảo hành vẫn trao đổi trong chat.


## P0-1 — Nguồn cung và tìm dịch vụ

P0-1 đã duyệt 06/10/2026: tài khoản có điện thoại xác minh tạo hồ sơ draft, owner và ví 0 cùng giao dịch. Công bố cần tên, kỹ năng active và nơi phục vụ cho mọi mode; ảnh chưa bắt buộc trong gói này. Công bố không tự bật nhận việc. Chuyển draft tắt nhận việc; sửa published mất điều kiện bị từ chối. Chủ/profile.manage dùng management riêng, shared version và key retry kiểm lại quyền. Public không lộ địa chỉ riêng/giấy tờ/ví; liên hệ cần đăng nhập. Tìm sort=distance dùng shop công khai hoặc tâm vùng tròn với cả điều kiện phủ khách và bán kính; mỗi hồ sơ một kết quả, cursor gắn bộ lọc và distance/created_at/id. OTP, bản đồ/GPS, polygon và ranking khác giữ Pending. DEMO local/test được phép tạo mới riêng, không sửa tài khoản có sẵn hoặc nạp tiền. Chuẩn chi tiết: technical-design v0.1.6, openapi.json và schema.sql.

Phần này ưu tiên cho gói P0-1 nếu mô tả cũ khác; các luồng công việc/tài chính đầy đủ giữ nguyên và không được coi đã triển khai.
