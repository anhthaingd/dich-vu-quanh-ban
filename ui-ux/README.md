# UI/UX — Dịch vụ quanh bạn

Điểm vào phần thiết kế của dự án. Xem [README dự án](../README.md) để biết cấu trúc toàn hệ thống.

- `prototype/`: React + Storybook hiện hành. Chạy `npm run dev` hoặc `npm run storybook` tại đây.
- `research/`: nghiên cứu, hướng thiết kế và đề xuất; trạng thái phê duyệt ghi trong từng tài liệu.
- `specs/`: phạm vi UX hiện hành.
- `wireframes/`: prototype nghiệp vụ và các viewer HTML; phục vụ localhost:8765.
- `archive/`: bằng chứng và bản thử lịch sử, không tự dùng làm yêu cầu hiện hành.
- `exports/`: ZIP theo phiên bản; gói hiện hành UI-UX-v0.14.zip; các gói trước giữ làm lịch sử.

Sổ quản lý toàn dự án: `../docs/project-control/So-quan-ly-tai-lieu.xlsx`. Mã prototype nằm riêng, không đặt chung với `apps/web` để tránh nhầm dữ liệu giả với ứng dụng thật.

Hiện hành: React v0.10b, 39 stories. [Luồng khách hàng](specs/customer-journey.md) · [Design system](specs/design-system.md). Mở story Desktop/Mobile để thử xuyên suốt, hoặc các story hóa đơn/đánh giá để xem nhanh.

[Partner và doanh nghiệp](specs/partner-journey.md): nhận việc, phân công, hóa đơn, nhận tiền, ví. Cổng 6006 hiện phục vụ bản Storybook đã build; chạy build-storybook rồi tải lại để cập nhật.

Đợt 1: [Tài khoản, địa chỉ và đăng ký partner](specs/account-batch.md) — UI-12.

Đợt 2: [Công việc, đánh giá, liên lạc và thông báo](specs/activity-batch.md) — UI-14.


## UI-20 — cập nhật hiện hành 27/09/2026
React v0.14, UI-UX-v0.18.zip, registry v1.26. Đã bổ sung quản trị tài khoản, đình chỉ partner, danh mục và báo cáo/nhật ký vận hành. Xem [phạm vi, luồng và bằng chứng QA](specs/admin-operations.md). Các ghi chú trước đây rằng bốn nhóm này chưa có trong React được thay bằng UI-20; không đổi nghiệp vụ hay mở các mục pending. Các lớp xác thực và dữ liệu vẫn là mô phỏng.


## UI-21 — rà soát luồng 27/09/2026
Bản hiện hành React v0.15 / UI-UX-v0.19.zip. Đã sửa kiểm trạng thái lúc gửi thuê, mở chat đúng người từ công việc, thông báo đến nhân viên phụ trách và khôi phục giá trị point khi mở hóa đơn từ thông báo. [Ma trận kiểm chứng và phần chưa nghiệm thu](specs/flow-review.md). Không đổi nghiệp vụ đã chốt; 49 tests, 52 stories.
