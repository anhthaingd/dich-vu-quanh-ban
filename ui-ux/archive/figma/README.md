# UI brainstorm và Design System nháp — v0.1

Ngày 23/09/2026. DOC-049. Đề xuất, chưa chốt hướng thương hiệu.

Nguồn chính: https://www.figma.com/design/cgFBrVCTbmYZHzVHA1fI1O

## Xem trên Figma

| Board | Node | Nội dung |
|---|---|---|
| Bắt đầu | 4:2 | Mục đích và cách xem |
| A | 8:2 | Tin cậy, rõ ràng, teal; đề xuất ưu tiên |
| B | 9:3 | Gần gũi, nền cam ấm, khám phá dịch vụ |
| C | 9:26 | Gọn, xanh dương, danh sách so sánh |
| Foundations | 4:7 | 28 biến trong 2 collections, 6 text styles Inter |
| Button | 5:2 | Default, pressed, disabled; nhãn thay đổi được |
| Input | 6:2 | Default, focus, error |
| Partner và hóa đơn | 10:3 | Nhận yêu cầu; tách xác nhận hóa đơn khỏi trả/nhận tiền |
| Admin desktop | 10:37 | Điều hướng riêng, danh sách tài khoản có tìm kiếm và phân trang |

## Phạm vi

Đây là canvas chỉnh sửa được và các màn minh họa tĩnh, chưa nối prototype. Tên sản phẩm, dữ liệu partner, giá, đánh giá và ngày hẹn đều là minh họa. Chưa phải bộ Design System hoàn chỉnh hoặc thiết kế responsive đã kiểm thử.

Ba hướng chưa được duyệt. Không cập nhật màu hoặc typography đề xuất thành yêu cầu SRS đã chốt. PLAN-006 còn cần đặc tả field, trạng thái tải/rỗng/lỗi, responsive, accessibility và thư viện đầy đủ.

## Cần chốt cùng một đợt

1. Hướng A, B hay C; hoặc A cho app và bố cục gọn như C cho admin?
2. Ưu tiên thẻ thoáng hay danh sách gọn cho kết quả tìm kiếm?

## Kiểm tra và giới hạn

Đã đọc lại cấu trúc foundations, button, input; sửa chiều cao auto-layout của bảng màu. Các lần tạo 3 hướng và màn nghiệp vụ trả node IDs thành công.

Figma MCP báo hết lượt Starter khi yêu cầu screenshot A, nên chưa kiểm ảnh các màn mới hoặc kiểm lại toàn bộ canvas sau cùng. Không tuyên bố QA trực quan hoàn tất. `foundations.png` là ảnh trước khi sửa chiều cao, không dùng làm bản hiện hành. `button.png` chỉ là ảnh kiểm tra thành phần, không thay thế file Figma.

Sổ quản lý ghi DOC-049 là Cần rà soát và nhật ký còn việc kiểm ảnh; tài liệu nghiệp vụ hiện hành không bị thay đổi.
