# I18N-04 — Đề xuất dịch tên ngành, nhóm và kỹ năng

05/10/2026 · Thuộc bộ kế hoạch DELIVERY-01. **Đã duyệt ngày 05/10/2026; đã triển khai lát đọc danh mục local.** [Checklist](../01-checklist.md). Bản code tham chiếu: `c120062`.

> Bộ dữ liệu 50 nhóm/140 kỹ năng của lần nạp ban đầu đã được thay theo yêu cầu clear tiếp theo của chủ dự án: xem [bộ mới 39 nhóm/128 kỹ năng](../bao-cao/B02-01-thay-du-lieu-danh-muc.md). Quyết định đọc đa ngôn ngữ và hợp đồng API bên dưới vẫn giữ nguyên.

## Kết quả muốn đạt

Khi chọn English hoặc 日本語, tên ngành, nhóm, kỹ năng và tiêu đề ngành đang mở đổi theo ngôn ngữ. ID của mục vẫn như cũ nên việc chuyển ngôn ngữ không mở nhầm ngành. Ví dụ tên “Điện nước” đổi cách hiển thị nhưng vẫn trỏ cùng một bản ghi dữ liệu.

Tại thời điểm lập đề xuất, API chỉ trả `name_vi`; bảng categories có `translations` nhưng chưa dùng, bảng skills chưa có trường này. Không thể hoàn tất bằng cách chỉ sửa từ điển nhãn giao diện.

## Quyết định chủ dự án đã chốt

- Codex soạn bản dịch Anh/Nhật ban đầu cho bộ danh mục mở rộng đủ 10 ngành đã chốt: 50 nhóm và 140 kỹ năng, có nghiên cứu dịch vụ phổ biến theo yêu cầu bổ sung của chủ dự án; chủ dự án kiểm nội dung. Không gọi dịch vụ dịch tự động hoặc trả phí.
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

Đây là thay API/data **được chủ dự án duyệt ngày 05/10/2026**, kèm yêu cầu mở rộng dữ liệu thật. Spec liên quan được cập nhật đúng phạm vi. [Báo cáo triển khai](../bao-cao/I18N-04-danh-muc-da-ngon-ngu.md).

## Thứ tự triển khai đã duyệt

1. Đối chiếu bản sổ quản lý mới nhất và các nguồn API/data/UX/QA bị ảnh hưởng; ghi quyết định đã chốt, bảo toàn sửa đổi của chủ dự án.
2. Soạn bản dịch, thêm migration mới và seed an toàn; kiểm chạy lại không nhân đôi hay ghi đè dữ liệu.
3. Mở rộng `catalog.query.ts` nhận ngôn ngữ; `catalog.service.ts` chọn tên và báo ngôn ngữ thực tế. Viết test API với DB thật cho tên dịch, thiếu dịch, phân trang và mục không active.
4. `catalog-api.ts` gửi locale và kiểm dữ liệu trả về. `CatalogScreen` tải lại theo locale, hủy yêu cầu cũ khi đổi ngôn ngữ; tiêu đề dựa dữ liệu đúng ID/ngôn ngữ, không giữ tên tiếng Việt cố định trong route.
5. Kiểm đổi tiếng khi đang mở ngành/nhóm, đổi liên tiếp khi request đang chạy, mạng lỗi/Thử lại, thiếu bản dịch, chữ dài trên Android và iOS. Kiểm các thao tác auth còn hoạt động.
6. Bàn giao báo cáo học code có Mermaid nhúng, file/hàm thật và bằng chứng từng nền tảng; cập nhật checklist. Chỉ đóng phần đã kiểm, chưa đóng tìm kiếm hoặc đồng bộ locale tài khoản.
