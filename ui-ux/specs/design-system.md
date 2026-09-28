# Design system v0.7 — Dịch vụ khu phố

PLAN-006 · 23/09/2026 · Bộ nền tảng cho khách hàng và partner React v0.9. Hướng thị giác đã chốt; chi tiết màn mới chờ chủ dự án xem. Chưa phải design system đầy đủ toàn hệ thống/admin hoặc React Native.

## Xem trực tiếp

Storybook → Dịch vụ quanh bạn → Thử giao diện → **Design system · bộ nền tảng**. Các thành phần được dùng thật trong luồng khách hàng, không chỉ là hình minh họa.

| Thành phần | Quy tắc hiện tại |
|---|---|
| Màu | Cobalt #2457D6: hành động; mực #16233B: nội dung; nền #F4F7FC; thành công #24634D; cảnh báo #925700; lỗi #B42318 |
| Chữ | Be Vietnam Pro, Arial fallback. Nội dung 16px, phụ 14px; chú thích mô phỏng 11–13px; tiêu đề 28–36px |
| Khoảng cách | 4/8/12/16/24/32/48px; panel 20px mobile, 24px desktop; bo góc 10–16px |
| Button | Primary/secondary/disabled; icon kèm nhãn; nút luồng mới tối thiểu 44px, nút chính 48px |
| Field | Nhãn luôn hiển thị; mô tả và lỗi cạnh nhóm nhập; hỗ trợ input/select/textarea/date/time |
| Status | Chờ phản hồi, kiểm tra hóa đơn, chờ thanh toán, hoàn tất. Có chữ/icon, không chỉ màu |
| Note | Hướng dẫn, trạng thái chờ, lỗi giữ dữ liệu để thử lại |
| Tiền | Nhóm nghìn, đơn vị đ, căn phải; vật tư/công riêng, số point trừ riêng, số trả trực tiếp nổi bật |
| Điều hướng | Desktop thanh ngang; mobile thanh dưới cố định: khách 4 mục, partner 4, quản lý doanh nghiệp 5, nhân viên 3; vùng nội dung chừa chỗ và safe area. Admin không nằm trong menu khách |
| Accessibility | Focus outline 3px; radio/fieldset có nhãn; modal Radix; reduced-motion; chưa nghiệm thu WCAG toàn bộ |

## Field trong luồng chính

| Màn | Trường | Điều kiện |
|---|---|---|
| Thuê | Dịch vụ | Từ danh sách kỹ năng đã lưu của partner; có thể chọn nhiều kỹ năng trong hồ sơ |
| Thuê | Địa điểm | Nhà khách/địa điểm khác; tại cửa hàng khi partner mẫu có cửa hàng |
| Thuê | Địa chỉ | Bắt buộc, không chỉ khoảng trắng; chưa geocode/kiểm vùng phục vụ thật |
| Thuê | Làm ngay/hẹn trước | Hẹn trước bắt buộc ngày + giờ tương lai, tính giờ Hà Nội |
| Thuê | Ghi chú | Tùy chọn |
| Hóa đơn | Vật tư/tiền công | Chỉ đọc ở phía khách; thợ gửi sau ảnh kết quả |
| Hóa đơn | Point | Mặc định 0; số nguyên không âm; không vượt số dư khả dụng và tổng hóa đơn; khóa cùng hóa đơn |
| Yêu cầu sửa | Lý do | Bắt buộc trước khóa; hóa đơn chờ sửa không được xác nhận |
| Đánh giá | Sao/nội dung | 1–5 sao bắt buộc; nội dung tùy chọn; chỉ sau hai xác nhận thanh toán |

Nguồn mã: `prototype/src/journey.css`, `Journey.jsx`, `App.jsx`. Hiện dùng CSS variables; chưa trích token sang package dùng chung native/web. Đã bổ sung partner.css/Partner.jsx: công tắc nhận việc, danh sách việc, phân công, ảnh/nháp/hóa đơn và bảng ví. Admin và field toàn hệ thống chưa đầy đủ.

## Bổ sung partner v0.2

Công tắc nhận việc dùng switch + nhãn trạng thái; tab Công việc/Ví/Đội ngũ/Hồ sơ/Tin nhắn phụ thuộc quyền; nhân viên chỉ có Công việc/Tin nhắn. Form hóa đơn khóa phần tiền trước khi chọn ảnh; số công/vật tư nguyên không âm bắt buộc. Nhận tiền có checkbox kiểm tra số tiền. Yêu cầu rút chỉ nhận số nguyên dương trong khoản có thể rút. Trên mobile các panel xếp một cột, giữ cùng thuật ngữ với khách.

UI-08: trình sửa hồ sơ gồm bốn nhóm, checkbox kỹ năng/khu vực, trường giá tùy chọn, phản hồi lưu/lỗi. Desktop có cột xem trước, mobile mở xem trước bằng nút để tránh trang quá dài.

UI-09: bộ chọn đa ngành gồm chip đã chọn/bỏ chọn, tìm kiếm không dấu, lọc ngành, nhóm kỹ năng, số kết quả và trạng thái rỗng. Không xóa lựa chọn khi lọc.

UI-10: danh sách đội ngũ theo trạng thái, tìm kiếm, thẻ thành viên và việc phụ trách; form lời mời/gỡ có xác nhận và lý do, công cụ mô phỏng có nhãn riêng.

UI-11: nhân viên có Công việc / Tin nhắn / Tài khoản. Đã rời thì chỉ còn Tin nhắn / Tài khoản. Form tự rời có lý do, xác nhận và nút ở lại.

UI-12: điểm vào Tài khoản theo nhóm, form OTP/đổi kênh hai bước, thẻ địa chỉ và luồng onboarding 5 bước. Xem account-batch.md.

## UI-13 — Bố cục Point đã duyệt (23/09/2026)

Trong màn Tài khoản, thẻ Point nằm ngay dưới lời chào và trước danh sách quản lý trên cả mobile/desktop. Thẻ ngang nền xanh nhạt, hiển thị số point, giá trị tương đương và “Dùng để thanh toán dịch vụ”. Bỏ cột Point bên phải và đoạn quy tắc dài tại đây. Quy tắc tích/dùng Point giữ nguyên. Bản vá React v0.9a; gói UI-UX-v0.11.zip.

## UI-14 — Đợt 2, React v0.10

[DOC-059](activity-batch.md) bổ sung đổi lịch/rút/dừng, đánh giá hai chiều và liên lạc/thông báo. Các giới hạn cũ về những màn này được thay bằng phạm vi và giới hạn DOC-059. Tài khoản có đường vào Tin nhắn và thông báo; Point vẫn ngay dưới lời chào. Nghiệp vụ tiền không đổi.

## UI-15 — Lịch sử bố cục; vị trí chuông được thay thế bởi UI-16

Chủ dự án đã duyệt sau tham khảo LinkedIn/Airbnb. React v0.10a: chuông ở header khách/partner/doanh nghiệp mở trang Thông báo riêng, huy hiệu số chưa đọc, Tất cả/Chưa đọc và đánh dấu đã đọc. Bấm thông báo mở đúng việc/phòng chat và cập nhật huy hiệu. Tin nhắn chỉ chứa hộp thư/chat/gọi. Tài khoản → Cài đặt → Thông báo là đường quản lý tùy chọn. Tắt push vẫn giữ thông báo trong app.

Partner/doanh nghiệp dùng thanh dưới Công việc / Ví / Tin nhắn / Tài khoản; nhân viên không có Ví. Hồ sơ cung cấp dịch vụ, Đội ngũ (theo quyền), tài khoản doanh nghiệp của nhân viên nằm trong Tài khoản. Không đổi quyền hoặc nghiệp vụ. Header desktop dùng cùng điểm vào chuông; mobile không thêm tab thứ năm. Bản mẫu vẫn chưa kết nối push thật.

Kiểm chứng: build Vite/Storybook; browser mở chuông/lọc chưa đọc, đường cài đặt, Tin nhắn không còn menu phụ, partner mở thông báo vào đúng chat và giảm huy hiệu. Mobile 390px không tràn ngang. Gói UI-UX-v0.13; registry v1.21.

## UI-16 — Hiện hành: avatar vào tài khoản, tab Thông báo

Chủ dự án chốt 23/09/2026: giữ avatar chữ đầu tên trên header để mở Tài khoản; bỏ chuông header. Thông báo thay Tài khoản trong điều hướng chính (mobile ở dưới, desktop ở trên). Khách: Tìm dịch vụ / Công việc / Tin nhắn / Thông báo. Partner: Công việc / Ví / Tin nhắn / Thông báo; nhân viên không có Ví. Avatar partner dùng tên người đang xem. Hồ sơ/Đội ngũ/Cài đặt vẫn trong Tài khoản và giữ quyền. Huy hiệu chưa đọc nằm ở tab Thông báo. UI-16 thay vị trí chuông của UI-15; các hành vi lọc, đọc, mở đúng đối tượng và tùy chọn thông báo giữ nguyên. React v0.10b, 39 stories; gói UI-UX-v0.14, registry v1.22. Build Vite/Storybook đạt; browser kiểm avatar/tab và bố cục mobile.


## UI-17 · 26/09/2026 · React v0.11
Ví có màn nạp/rút, đề nghị đổi ngân hàng và lịch sử lọc/chi tiết. Đội ngũ có tab Quyền truy cập giải thích quyền hiện hành. Chi tiết, QA và các phần còn thiếu ở `ui-ux/specs/finance-batch.md` (DOC-060). Chưa có trình cấp quyền tùy chỉnh hoặc admin duyệt trong React. UI-16 về avatar/Thông báo giữ nguyên.


## UI-18 · 27/09/2026 · React v0.12
Đã bổ sung cấp/thu hồi quyền nhân viên, ngân hàng lần đầu và admin duyệt tài chính trên cùng dữ liệu phiên. Phần UI-17 nói chưa có các màn này được thay bởi DOC-060 `finance-batch.md` mục UI-18. 45 stories, 39 kiểm tra logic; giữ nguyên avatar và điều hướng UI-16. Admin có danh sách/lọc/chi tiết/nhật ký; không kết nối tài chính thật.


## UI-19 · 27/09/2026 · React v0.13
Bổ sung Hỗ trợ từ Tài khoản/công việc, admin hỗ trợ/xác minh/kiểm duyệt đánh giá và nhật ký. Xác minh partner qua admin, bỏ nút tự mô phỏng duyệt; tệp chờ duyệt khóa sửa. Ẩn/khôi phục đánh giá cập nhật điểm trong phiên. Quyết định và giới hạn chi tiết ở DOC-061 `ui-ux/specs/support-moderation.md`; nội dung UI-19 thay các ghi chú trước rằng những màn này chưa có. Không thay tiền/point khi xử lý báo cáo. 48 stories, 42 kiểm tra logic; UI-UX-v0.17.zip.


## UI-20 — cập nhật hiện hành 27/09/2026
React v0.14, UI-UX-v0.18.zip, registry v1.26. Đã bổ sung quản trị tài khoản, đình chỉ partner, danh mục và báo cáo/nhật ký vận hành. Xem [phạm vi, luồng và bằng chứng QA](admin-operations.md). Các ghi chú trước đây rằng bốn nhóm này chưa có trong React được thay bằng UI-20; không đổi nghiệp vụ hay mở các mục pending. Các lớp xác thực và dữ liệu vẫn là mô phỏng.
