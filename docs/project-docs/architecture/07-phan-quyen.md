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

## P1-01 A/B hiện hành — 13/10/2026

P1-01 A/B đã được chủ dự án duyệt ngày 13/10/2026. Chuẩn hiện hành cho đội ngũ và xác minh local/test là OpenAPI v0.1.11; các đoạn trước mô tả OTP Pending hoặc mã mẫu là lịch sử/phạm vi production, không phủ quyết phần local này.
Chỉ mở OTP purpose=verify trong phiên đăng nhập: email qua Mailpit trên máy, SMS qua hộp nhận mô phỏng. Mã ngẫu nhiên 6 số, hạn 5 phút, tối đa 5 lần sai; gửi lại sau 60 giây, 5 lần/liên hệ/giờ, 20 lần/tài khoản/giờ và 100 lần/IP/giờ. Mã gắn tài khoản, liên hệ và lần đăng nhập; gửi lại vô hiệu mã cũ. Xác minh email không xác minh điện thoại. Không thay email/điện thoại đã có hoặc chiếm liên hệ tài khoản khác. Chỉ DB DEMO/test cô lập và liên hệ cho phép; disabled mặc định, chặn production. Chưa mở OTP login/recover, MFA admin, email/SMS thật, billing hoặc tiền thật.
Chủ hoặc members.manage mời bằng email hoặc điện thoại, permissions=[]; lời mời 7 ngày, không trả token cho quản lý. Người nhận đăng nhập, xác minh đúng liên hệ rồi chủ động nhập token nhận lời. List/gửi lại/thu hồi kiểm quyền hiện hành; gửi lại thay token cũ. Nhận lời kiểm lại người mời; gia nhập lại dùng cùng membership nhưng không khôi phục quyền cũ. Lịch sử trạng thái pending/accepted/expired/revoked/replaced tách queued/submitted/failed/unknown của việc chuyển thư; submitted không chứng minh người nhận đã đọc.
GET /me/memberships phục vụ cả nhân viên thường và lịch sử đã rời. Cấp/thu hồi quyền dùng lý do, expected_version, Idempotency-Key và grant nhập lại mật khẩu qua POST /auth/reauthenticate. Grant hạn 5 phút, một lần, gắn user/family và scope membership.grants; refresh không gia hạn. Cấm tự sửa/sửa chủ/cấp vượt quyền; quyền thao tác ví cần wallet.read. Không coi nhập lại mật khẩu là MFA, không mở nghiệp vụ ngân hàng từ enum quyền.
Gỡ/tự rời: xem trước số việc cần bàn giao và version; xác nhận có lý do, máy chủ kiểm lại dưới khóa partner → job → invoice. Việc chưa có dấu nhận tiền về chờ phân công, chỉ bỏ nháp chưa gửi; giữ bản đã gửi/khóa, ledger, khoản giữ và dấu thanh toán. Việc đã nhận tiền giữ người thực hiện lịch sử. Thu hồi quyền ngay, giữ phòng chat cá nhân và không sao chép cho người mới. Đầu mối dùng Partner.version, có thể null để về cửa hàng; rời sẽ reset nếu đang là đầu mối. Gọi Internet vẫn chưa triển khai.
OTP/token lưu HMAC; liên hệ và nội dung hàng chờ mã hóa, xóa payload sau gửi/hết hạn. Worker khóa bản ghi để tránh hai lần gửi đồng thời; crash sau gửi vẫn có thể gây thư trùng, token chỉ dùng một lần. Audit bất biến ghi actor/lý do/quyền trước-sau/việc bàn giao, không ghi mật khẩu, token, OTP hay nội dung chat. Snapshot retry không chứa bí mật thô. UI Việt/Anh/Nhật đi từ Tài khoản → Xác minh liên hệ hoặc Đội ngũ → Thành viên/Lời mời/Đã rời/Quyền truy cập. Mất mạng giữ thao tác để thử lại; đổi tài khoản loại dữ liệu riêng. Bằng chứng code/native/CI/UAT được ghi riêng trong báo cáo repo, không coi spec là nghiệm thu.
