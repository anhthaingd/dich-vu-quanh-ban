# So sánh Penpot và React + Storybook — v0.1

DOC-050/051/052. Cập nhật v0.10 ngày 23/09/2026: chủ dự án đã chọn React + Storybook và hướng Dịch vụ khu phố. Bản React hiện tại là v0.10; v0.1 lưu trong ZIP lịch sử. Xem [ui-direction-v0.2.md](ui-direction-v0.2.md) để biết nguồn tham khảo, phạm vi đã dựng và phần chưa có. Chưa triển khai sản phẩm.

Thư mục chính: `/Users/j2866/Documents/anhthai/dich-vu-quanh-ban`. Vào `ui-ux/prototype` để làm việc với React. Penpot và Figma nằm trong `ui-ux/archive`, được giữ làm tư liệu thử nghiệm trước khi chọn công cụ. Vị trí Codex cũ dùng symlink đến dự án này, không tạo bộ tài liệu độc lập thứ hai. Sổ quản lý ở `docs/project-control`.

- React: http://127.0.0.1:5178/
- Storybook: http://127.0.0.1:6006/
- Penpot: https://design.penpot.app/#/workspace?team-id=b564c72c-f31f-81ec-8008-ae7a8797e0f6&project-id=b564c72c-f31f-81ec-8008-ae7aaaf1fe07&file-id=220f6449-533e-815b-8008-ae7c48b7a2d1&page-id=220f6449-533e-815b-8008-ae7c48b7a2d2

## Bản thử

React có tìm kiếm không dấu, nhóm dịch vụ, bộ lọc xác minh, bán kính 10/20/30 km, sắp xếp gần nhất/đánh giá, hồ sơ và chat trước thuê. Chat lưu trong bộ nhớ trang, không gửi người thật. Sơ đồ vị trí chỉ minh họa, không phải bản đồ thật. Địa điểm đang cố định Cầu Giấy. Form thuê, danh sách/chi tiết công việc, hóa đơn/point, đánh giá và tài khoản mẫu đã nối trong v0.3. Xem ../specs/customer-journey.md. Đã đăng nhập giả lập. Xếp hạng kết hợp thực tế chưa triển khai, không thay đổi yêu cầu nghiệp vụ.

Penpot giữ bản lịch sử v0.1: hai bố cục desktop/mobile cùng hướng màu với React v0.1. React v0.2 hiện đã đổi sang cobalt, Penpot không được dùng làm bản hiện hành. Được nhập SVG qua UI trong file mới, không đụng file New File 1. SVG phân lớp rect/text nhưng text vẫn là SVG nhập, chưa là bộ text/component native có auto-layout/tokens. Vì vậy chưa coi đây là Design System Penpot hoàn chỉnh. Desktop minh họa ba thẻ trong bốn kết quả, mobile một thẻ; không phải bản sao pixel chính xác của React. Font Penpot Arial, React Be Vietnam Pro (Google Fonts, có Arial fallback).

## Kiểm chứng lịch sử v0.2

Build Vite và Storybook đạt; 8 stories (thêm PartnerProfile và ChatBeforeHiring). Kiểm lọc xác minh, màn rỗng/mở rộng bán kính và giữ tin nhắn khi mở lại partner trong cùng phiên đạt. Đã xem hồ sơ desktop và Storybook mobile 390px. Sơ đồ bản đồ desktop nằm cạnh danh sách; mobile có nút Bản đồ. Chưa kiểm axe đầy đủ v0.2.

## Kiểm chứng lịch sử v0.1

- Build Vite và Storybook thành công; 6 stories: Desktop, Mobile, NoResults, VerifiedProfile, UnverifiedProfile, Buttons.
- Kiểm tra qua trình duyệt: Điện nước = 2, thêm xác minh = 1, chat trước thuê gửi tin mô phỏng, từ khóa không có trả trạng thái rỗng, xóa lọc/mở 20 km = 5.
- Kiểm responsive ở viewport 390px: document scrollWidth bằng clientWidth, không tràn ngang toàn trang; nhóm ngành cuộn ngang chủ ý.
- Penpot: đã lưu hai nhóm tim-tho-desktop/tim-tho-mobile và xác minh có layer svg-rect/svg-text. Giới hạn chỉnh sửa native ghi ở trên.
- Storybook axe ở story Desktop: đã sửa 5 vị trí chữ thiếu tương phản; lần quét lại có 0 violations, 25 passes, 2 inconclusive. Chưa kiểm mọi trạng thái; không tuyên bố đạt WCAG hoàn chỉnh.

## Chạy lại

Trong thư mục `ui-ux/prototype` tính từ gốc dự án: `npm ci`, `npm run dev`, `npm run storybook`. `npm run build` và `npm run build-storybook` tạo bản tĩnh. Lockfile giữ phiên bản. Cổng localhost chỉ xem được trên máy đang chạy. Gói hiện hành UI-UX-v0.14.zip dùng cấu trúc ui-ux; các gói cũ giữ nguyên để tra lịch sử.

Thư viện và plugin: xem [research.md](research.md). Sổ quản lý là điểm tra cứu chính; bản thử không thay thế BRD/SRS/UX đã duyệt. Không thay đổi cấu hình toàn cục hoặc dự án khác.

## Kiểm chứng lịch sử v0.3

14 stories; kiểm luồng chính và 8 bài kiểm tra logic đạt; các chiều rộng 360/390/768/1440 trên màn công việc/hóa đơn không tràn ngang. Chi tiết và giới hạn: [DOC-056](../specs/customer-journey.md).

## Các đợt trước đến v0.9

31 stories; có partner tự do, doanh nghiệp, nhân viên và mobile partner. Dùng thanh chọn vai trò để thử chung dữ liệu với khách. [DOC-057](../specs/partner-journey.md) ghi phạm vi, 16 test logic và kiểm tra Browser. Storybook cổng 6006 dùng bản build tĩnh để tránh danh sách story cũ do giới hạn watcher.

Nhóm hồ sơ v0.5: chọn Hồ sơ ở chế độ partner hoặc mở story Mobile · chỉnh sửa hồ sơ. Xem DOC-057 để biết giới hạn lưu phiên và vị trí mẫu.

Lịch sử UI-10: nhóm Đội ngũ có mời, thu hồi/hết hạn, nhận lời mời mẫu, phân công và gỡ. 31 stories, 20 kiểm tra logic. Quyền tùy chỉnh vẫn ở prototype nghiệp vụ; xem DOC-057.

Lịch sử UI-11: React v0.9, 31 stories / 22 test logic. Quản lý gửi lại trong tab Lời mời; nhân viên mở Tài khoản để tự rời. DOC-057 ghi giới hạn và kiểm chứng.

UI-12: 31 stories, 29 tests logic. Tài khoản, địa chỉ và đăng ký/xác minh partner; xem ../specs/account-batch.md.

## Hiện hành v0.10 — UI-14

37 stories, 33 kiểm thử logic; [DOC-059](../specs/activity-batch.md) ghi đợt công việc/đánh giá/liên lạc và các giới hạn. UI-13 giữ Point ngay dưới lời chào.

UI-15 hiện hành: React v0.10b, 39 stories. Chuông mở trang riêng; Tài khoản → Cài đặt → Thông báo. Xem bổ sung UI-15 trong DOC-059.

UI-16 thay bố cục UI-15: avatar header mở Tài khoản, Thông báo thành tab điều hướng, không còn chuông header. React v0.10b; xem DOC-059.


## UI-17 · 26/09/2026 · React v0.11
Ví có màn nạp/rút, đề nghị đổi ngân hàng và lịch sử lọc/chi tiết. Đội ngũ có tab Quyền truy cập giải thích quyền hiện hành. Chi tiết, QA và các phần còn thiếu ở `ui-ux/specs/finance-batch.md` (DOC-060). Chưa có trình cấp quyền tùy chỉnh hoặc admin duyệt trong React. UI-16 về avatar/Thông báo giữ nguyên.


## UI-18 · 27/09/2026 · React v0.12
Đã bổ sung cấp/thu hồi quyền nhân viên, ngân hàng lần đầu và admin duyệt tài chính trên cùng dữ liệu phiên. Phần UI-17 nói chưa có các màn này được thay bởi DOC-060 `finance-batch.md` mục UI-18. 45 stories, 39 kiểm tra logic; giữ nguyên avatar và điều hướng UI-16. Admin có danh sách/lọc/chi tiết/nhật ký; không kết nối tài chính thật.


## UI-19 · 27/09/2026 · React v0.13
Bổ sung Hỗ trợ từ Tài khoản/công việc, admin hỗ trợ/xác minh/kiểm duyệt đánh giá và nhật ký. Xác minh partner qua admin, bỏ nút tự mô phỏng duyệt; tệp chờ duyệt khóa sửa. Ẩn/khôi phục đánh giá cập nhật điểm trong phiên. Quyết định và giới hạn chi tiết ở DOC-061 `ui-ux/specs/support-moderation.md`; nội dung UI-19 thay các ghi chú trước rằng những màn này chưa có. Không thay tiền/point khi xử lý báo cáo. 48 stories, 42 kiểm tra logic; UI-UX-v0.17.zip.


## UI-20 — cập nhật hiện hành 27/09/2026
React v0.14, UI-UX-v0.18.zip, registry v1.26. Đã bổ sung quản trị tài khoản, đình chỉ partner, danh mục và báo cáo/nhật ký vận hành. Xem [phạm vi, luồng và bằng chứng QA](../specs/admin-operations.md). Các ghi chú trước đây rằng bốn nhóm này chưa có trong React được thay bằng UI-20; không đổi nghiệp vụ hay mở các mục pending. Các lớp xác thực và dữ liệu vẫn là mô phỏng.
