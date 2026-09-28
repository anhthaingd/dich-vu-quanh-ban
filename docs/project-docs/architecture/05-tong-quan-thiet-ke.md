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
