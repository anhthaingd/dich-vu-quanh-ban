# I18N-04 — Đề xuất dịch tên ngành, nhóm và kỹ năng

05/10/2026 · Thuộc bộ kế hoạch DELIVERY-01. **Chưa duyệt, chưa triển khai.** [Checklist](../01-checklist.md). Bản code tham chiếu: `c120062`.

## Kết quả muốn đạt

Khi chọn English hoặc 日本語, tên ngành, nhóm, kỹ năng và tiêu đề ngành đang mở đổi theo ngôn ngữ. ID của mục vẫn như cũ nên việc chuyển ngôn ngữ không mở nhầm ngành. Ví dụ tên “Điện nước” đổi cách hiển thị nhưng vẫn trỏ cùng một bản ghi dữ liệu.

API hiện chỉ trả `name_vi`; bảng categories có `translations` nhưng chưa dùng, bảng skills chưa có trường này. Không thể hoàn tất bằng cách chỉ sửa từ điển nhãn giao diện.

## Quyết định đang xin chủ dự án chốt

- Codex soạn bản dịch Anh/Nhật ban đầu cho 20 mục ngành/nhóm và 20 kỹ năng trong seed hiện hành; chủ dự án kiểm nội dung. Không gọi dịch vụ dịch tự động hoặc trả phí.
- Lưu bản dịch trong DB. App gửi ngôn ngữ đang chọn; máy chủ trả tên phù hợp. Mục thiếu bản dịch hiện tên tiếng Việt kèm thông báo dễ hiểu, không giả vờ đã dịch đầy đủ.
- Giữ ID, code và `name_vi` để các phần cũ tiếp tục sử dụng. Không thay dữ liệu người dùng hoặc ghi đè bản dịch đã chỉnh thủ công.
- Lát này chỉ đọc danh mục theo ngôn ngữ; tìm kiếm đa ngôn ngữ nối khi triển khai B03. Locale tài khoản/đa thiết bị thuộc I18N-03; OTP vẫn Pending.

## Phương án kỹ thuật để review

API là cách app yêu cầu dữ liệu từ máy chủ. Đề xuất mở rộng `GET /v1/categories` và `GET /v1/skills` như sau:

| Nội dung | Đề xuất |
|---|---|
| Ngôn ngữ yêu cầu | Thêm query `locale=vi\|en\|ja`, mặc định `vi`; giá trị ngoài danh sách hoặc lặp tham số bị từ chối |
| Tên hiện lên | Thêm `name`: tên theo ngôn ngữ yêu cầu, hoặc `name_vi` khi thiếu bản dịch |
| Ngôn ngữ thực tế của tên | Thêm `name_locale`: `vi`, `en` hoặc `ja`; giúp app biết mục nào đang dùng tiếng Việt thay thế |
| Trường hiện có | Giữ nguyên, gồm `name_vi`; vẫn kiểm theo cây active và quyền đọc danh mục |
| Phân trang | Cursor gắn ngôn ngữ cùng bộ lọc; không trộn trang của hai ngôn ngữ |
| DB | `translations` là object chứa tên theo khóa `en`/`ja`; thêm trường cho skills bằng migration mới |
| Seed | Bổ sung khóa bản dịch còn thiếu cho bản ghi đã có; giữ ID, tên gốc và giá trị đã được chỉnh |

Đây là **đề xuất thay API/data**, không phải contract đã được duyệt. Sau quyết định mới cập nhật nguồn spec liên quan, sổ quản lý và bản xuất theo AGENTS.md; không tự sửa các nguồn đó trước khi chốt.

## Thứ tự thực hiện sau khi duyệt

1. Đối chiếu bản sổ quản lý mới nhất và các nguồn API/data/UX/QA bị ảnh hưởng; ghi quyết định đã chốt, bảo toàn sửa đổi của chủ dự án.
2. Soạn bản dịch, thêm migration mới và seed an toàn; kiểm chạy lại không nhân đôi hay ghi đè dữ liệu.
3. Mở rộng `catalog.query.ts` nhận ngôn ngữ; `catalog.service.ts` chọn tên và báo ngôn ngữ thực tế. Viết test API với DB thật cho tên dịch, thiếu dịch, phân trang và mục không active.
4. `catalog-api.ts` gửi locale và kiểm dữ liệu trả về. `CatalogScreen` tải lại theo locale, hủy yêu cầu cũ khi đổi ngôn ngữ; tiêu đề dựa dữ liệu đúng ID/ngôn ngữ, không giữ tên tiếng Việt cố định trong route.
5. Kiểm đổi tiếng khi đang mở ngành/nhóm, đổi liên tiếp khi request đang chạy, mạng lỗi/Thử lại, thiếu bản dịch, chữ dài trên Android và iOS. Kiểm các thao tác auth còn hoạt động.
6. Bàn giao báo cáo học code có Mermaid nhúng, file/hàm thật và bằng chứng từng nền tảng; cập nhật checklist. Chỉ đóng phần đã kiểm, chưa đóng tìm kiếm hoặc đồng bộ locale tài khoản.
