# Hồ sơ kiến trúc v0.1

Mở ../architecture.html để xem bản trực quan. Nguồn 05–11 là Markdown/Mermaid chỉnh sửa được. architecture.json là dữ liệu bản xem.

Trạng thái: thiết kế đề xuất, stack Q03 đã chốt, chưa có backend. Q01: khách báo đã trả + thợ xác nhận nhận tiền, quyết toán thành công mới mở đánh giá. Q02: xử lý khoản giữ treo vẫn pending đợt này và là điều kiện bắt buộc trước tiền thật. Q03 đã chốt công nghệ; Q04 chưa có ngân sách. Native SRS/FR/UX chưa được cập nhật các đề xuất thành yêu cầu đã chốt.

Kiểm tra 22/09/2026: JavaScript syntax, 13 sơ đồ có ID/đầu mút/tác nhân hợp lệ, bảng đủ cột, 4 ví dụ công thức và cân bằng sổ theo đơn vị. Đã mở browser, kiểm tab, chọn sequence, zoom và xem ảnh kiến trúc/sequence. Không phải kết quả kiểm thử transaction, ngân hàng, thiết bị thật hoặc nghiệm thu NFR.

Tệp render.py/build.py trong work/architecture là bộ dựng của đợt này; nguồn Markdown có thể được bổ sung độc lập. Không chạy lại builder nếu chưa đối chiếu các bổ sung sau khi dựng.


### Quy tắc hiện hành 23/09 — công việc

Đã chốt 23/09/2026: chặn thuê chính mình hoặc doanh nghiệp đang là thành viên. Đổi lịch chỉ để thay đổi ngày/giờ hẹn sau khi hai bên trao đổi, không bắt buộc vì công việc kéo dài. Công việc đã nhận không tự hết hạn, tự hủy hoặc tự hoàn tất theo thời gian; có thể kéo dài nhiều ngày. Luồng hoàn tất bình thường cần khách báo đã trả và thợ xác nhận đã nhận; xác nhận hóa đơn riêng chưa kết thúc công việc. Giữ quy tắc quyết toán một lần và ngoại lệ admin đã chốt. Không tạo luồng đổi lịch qua báo cáo/admin. Sau xác nhận hóa đơn không còn hành động đổi lịch; hỗ trợ/bảo hành vẫn trao đổi trong chat.
