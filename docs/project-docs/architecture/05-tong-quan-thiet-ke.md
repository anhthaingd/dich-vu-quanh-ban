# Bản thiết kế để review

Kiến trúc v0.1 · 22/09/2026 · Dựa trên quyết định nghiệp vụ và wireframe v0.23. Chưa phải sản phẩm đã triển khai.

## Đọc theo thứ tự này

|Phần|Bạn sẽ hiểu|Trạng thái|
|---|---|---|
|01 · Trạng thái|Khi nào được nhận việc, sửa hóa đơn, thu phí, rút tiền|Quy tắc đã chốt + đề xuất kỹ thuật|
|02 · Phân quyền|Quản lý kiêm điều phối; nhân viên chỉ thao tác việc được giao|Bản ma trận để review|
|03 · Kiến trúc|Một backend chia module; app và web dùng chung API|Q03 đã chốt công nghệ; thiết kế chi tiết chờ review|
|04 · Dữ liệu|ERD chia cụm, khóa liên kết, lịch sử và tiền|Mô hình logic; chưa có migration|
|05 · Sequence|Bấm lặp, mất mạng, phân công và thanh toán|Thiết kế xử lý; chưa kiểm thử backend|
|06 · Quyết định|Q01–Q02 đã chốt; Q03 đã chốt; Q04 còn mở|Đã đồng bộ Q01/Q02 trong kiến trúc, SRS v0.14, FR/NFR v0.16 và UX v0.24|

Đã giữ nguyên: phí 10% tiền công; point dùng cho toàn hóa đơn; hạn mức âm 100.000đ chỉ trả phí; một ngân hàng nhận tiền/partner; không có nút Bắt đầu làm; không duyệt hóa đơn qua quản lý; chat trước thuê và dùng lại phòng riêng. Hủy/hoàn/đảo tài chính vẫn pending, ngoại trừ admin hoàn tất thay thợ từ báo cáo có chứng cứ.

Bộ này bổ sung D08–D12 ở mức thiết kế sơ bộ và mở danh sách tích hợp D13. Đã có OpenAPI và DDL tham chiếu v0.1; Đợt 1 ngày 28/09 đã triển khai migration/backend danh mục local; DOC-065 ghi bằng chứng và giới hạn. Các miền khác chưa triển khai. Chọn nhà cung cấp, dự toán, kế hoạch tải và kiểm thử bảo mật vẫn còn. Native SRS/FR/UX giữ nghiệp vụ đã chốt; Q03 được cập nhật, thiết kế chi tiết mới vẫn cần review.


### Quy tắc hiện hành 23/09 — công việc

Đã chốt 23/09/2026: chặn thuê chính mình hoặc doanh nghiệp đang là thành viên. Đổi lịch chỉ để thay đổi ngày/giờ hẹn sau khi hai bên trao đổi, không bắt buộc vì công việc kéo dài. Công việc đã nhận không tự hết hạn, tự hủy hoặc tự hoàn tất theo thời gian; có thể kéo dài nhiều ngày. Luồng hoàn tất bình thường cần khách báo đã trả và thợ xác nhận đã nhận; xác nhận hóa đơn riêng chưa kết thúc công việc. Giữ quy tắc quyết toán một lần và ngoại lệ admin đã chốt. Không tạo luồng đổi lịch qua báo cáo/admin. Sau xác nhận hóa đơn không còn hành động đổi lịch; hỗ trợ/bảo hành vẫn trao đổi trong chat.

## P1-01 A/B hiện hành — 13/10/2026

P1-01 A/B đã được chủ dự án duyệt ngày 13/10/2026. Chuẩn hiện hành cho đội ngũ và xác minh local/test là OpenAPI v0.1.11; các đoạn trước mô tả OTP Pending hoặc mã mẫu là lịch sử/phạm vi production, không phủ quyết phần local này.
Chỉ mở OTP purpose=verify trong phiên đăng nhập: email qua Mailpit trên máy, SMS qua hộp nhận mô phỏng. Mã ngẫu nhiên 6 số, hạn 5 phút, tối đa 5 lần sai; gửi lại sau 60 giây, 5 lần/liên hệ/giờ, 20 lần/tài khoản/giờ và 100 lần/IP/giờ. Mã gắn tài khoản, liên hệ và lần đăng nhập; gửi lại vô hiệu mã cũ. Xác minh email không xác minh điện thoại. Không thay email/điện thoại đã có hoặc chiếm liên hệ tài khoản khác. Chỉ DB DEMO/test cô lập và liên hệ cho phép; disabled mặc định, chặn production. Chưa mở OTP login/recover, MFA admin, email/SMS thật, billing hoặc tiền thật.
Chủ hoặc members.manage mời bằng email hoặc điện thoại, permissions=[]; lời mời 7 ngày, không trả token cho quản lý. Người nhận đăng nhập, xác minh đúng liên hệ rồi chủ động nhập token nhận lời. List/gửi lại/thu hồi kiểm quyền hiện hành; gửi lại thay token cũ. Nhận lời kiểm lại người mời; gia nhập lại dùng cùng membership nhưng không khôi phục quyền cũ. Lịch sử trạng thái pending/accepted/expired/revoked/replaced tách queued/submitted/failed/unknown của việc chuyển thư; submitted không chứng minh người nhận đã đọc.
GET /me/memberships phục vụ cả nhân viên thường và lịch sử đã rời. Cấp/thu hồi quyền dùng lý do, expected_version, Idempotency-Key và grant nhập lại mật khẩu qua POST /auth/reauthenticate. Grant hạn 5 phút, một lần, gắn user/family và scope membership.grants; refresh không gia hạn. Cấm tự sửa/sửa chủ/cấp vượt quyền; quyền thao tác ví cần wallet.read. Không coi nhập lại mật khẩu là MFA, không mở nghiệp vụ ngân hàng từ enum quyền.
Gỡ/tự rời: xem trước số việc cần bàn giao và version; xác nhận có lý do, máy chủ kiểm lại dưới khóa partner → job → invoice. Việc chưa có dấu nhận tiền về chờ phân công, chỉ bỏ nháp chưa gửi; giữ bản đã gửi/khóa, ledger, khoản giữ và dấu thanh toán. Việc đã nhận tiền giữ người thực hiện lịch sử. Thu hồi quyền ngay, giữ phòng chat cá nhân và không sao chép cho người mới. Đầu mối dùng Partner.version, có thể null để về cửa hàng; rời sẽ reset nếu đang là đầu mối. Gọi Internet vẫn chưa triển khai.
OTP/token lưu HMAC; liên hệ và nội dung hàng chờ mã hóa, xóa payload sau gửi/hết hạn. Worker khóa bản ghi để tránh hai lần gửi đồng thời; crash sau gửi vẫn có thể gây thư trùng, token chỉ dùng một lần. Audit bất biến ghi actor/lý do/quyền trước-sau/việc bàn giao, không ghi mật khẩu, token, OTP hay nội dung chat. Snapshot retry không chứa bí mật thô. UI Việt/Anh/Nhật đi từ Tài khoản → Xác minh liên hệ hoặc Đội ngũ → Thành viên/Lời mời/Đã rời/Quyền truy cập. Mất mạng giữ thao tác để thử lại; đổi tài khoản loại dữ liệu riêng. Bằng chứng code/native/CI/UAT được ghi riêng trong báo cáo repo, không coi spec là nghiệm thu.
