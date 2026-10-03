# Kế hoạch triển khai và học code

DOC-082 · v1.0 · 01/10/2026 · DELIVERY-01. Đối chiếu code tại commit `50d184a`.

Đây là điểm vào công việc cho các phiên Codex tiếp theo. Kế hoạch phân rã thiết kế sẵn có thành các lát triển khai có thể kiểm chứng; không thay SRS, hợp đồng API hoặc quyết định nghiệp vụ. Những nhiệm vụ chưa làm là kế hoạch, không phải phê duyệt nhà cung cấp, chi phí hay production.

## Mở theo thứ tự

1. [Checklist chức năng](01-checklist.md): đang ở đâu, đã kiểm gì, phần còn thiếu, bước kế tiếp.
2. [Quy trình và cấu trúc code](02-quy-trinh-va-cau-truc.md): mỗi lớp chịu trách nhiệm gì; cách thực hiện một nhiệm vụ.
3. [Thứ tự triển khai](03-thu-tu-trien-khai.md): đầu vào, bước làm, đường dẫn dự kiến, điều kiện chuyển bước.
4. [Mẫu báo cáo](bao-cao/MAU-BAO-CAO.md): tạo báo cáo riêng sau mỗi chức năng lớn/lát bàn giao.
5. Đọc các báo cáo thực tế bên dưới để học code đã có.

Sơ đồ Mermaid nằm ngay trong từng file `.md`. Mở báo cáo bằng Markdown Preview có hỗ trợ Mermaid như các tài liệu khác của dự án; tab sửa văn bản hiển thị mã sơ đồ. Không cần các file nguồn/ảnh riêng. Nếu sơ đồ không hiện, kiểm lỗi cú pháp và trình xem hiện có trước khi cài thêm công cụ.

## Báo cáo đã có

| Lát bàn giao | Báo cáo | Phạm vi thực tế |
|---|---|---|
| Nền tảng + danh mục | [B00-01](bao-cao/B00-01-nen-tang-danh-muc.md) | App/API/DB, UI chung, navigation, log/test; không đóng toàn bộ B00 |
| Nền đa ngôn ngữ + lựa chọn local | [I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md) | VI/EN/JA cho các màn hiện có, mã lỗi, lưu locale; chưa dịch dữ liệu DB hoặc đồng bộ tài khoản |
| Tài khoản email/mật khẩu | [B01-01](bao-cao/B01-01-email-mat-khau.md) | Đăng ký/đăng nhập, refresh/logout local; không đóng toàn bộ B01 |

Báo cáo con tiếp theo dùng mã `Bxx-nn` hoặc `I18N-nn`; thêm vào bảng này và liên kết dòng checklist. Không sửa báo cáo cũ để biến kết quả của commit cũ thành bằng chứng cho commit mới. Nếu sửa báo cáo, giữ ngày/commit và ghi phần đính chính.

## Hiện trạng và công việc kế tiếp

- Đã có danh mục DB thật và lát email/mật khẩu local, UI dùng chung, native navigation, log/test.
- CI của `50d184a` đã đạt: [Quality 36810424485](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36810424485). Native được kiểm riêng trên máy phát triển, không chạy trong CI Ubuntu này.
- I18N-01/02 đã đạt kỹ thuật local: 81 test mobile; 3 web hồi quy + 1 web i18n; native i18n/layout/auth đạt Android và iOS. Chưa commit/push, chưa CI mới/UAT. `AuthSession` giữ mã lỗi, UI dịch theo locale local; API `locale` vẫn chỉ nhận `vi`.
- **B01-02 OTP/xác minh: Pending** theo yêu cầu chủ dự án ngày 01/10/2026 vì cần cân nhắc chi phí. Hoãn cả bản local và gửi thật; chỉ mở lại khi chủ dự án yêu cầu. Không còn là lát tự động bắt đầu tiếp theo. I18N-03/04 vẫn cần chốt contract/dữ liệu; chưa chốt lát thay thế trong đợt hoãn này.
- Chưa có nghiệm thu UAT toàn app, tài khoản/partner/công việc/chat/tài chính đầy đủ hoặc phát hành.

## Nguồn chuẩn cần tra

- [AGENTS.md](../../AGENTS.md): quy tắc làm việc mới nhất, bao gồm báo cáo sau chức năng lớn.
- [Backlog B00–B11](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [dữ liệu](../technical-design/01-data-design.md), [QA](../technical-design/03-qa-plan.md), [RTM](../technical-design/rtm.json).
- [Phạm vi UX](../../ui-ux/specs/ux-scope-current.md), [design system](../../ui-ux/specs/design-system.md), [rà soát luồng](../../ui-ux/specs/flow-review.md).
- [Sổ quản lý](../project-control/So-quan-ly-tai-lieu.xlsx) quản lý nguồn/ảnh hưởng/quyết định. Checklist này quản lý tiến độ code; hai vai trò khác nhau.

Các mô tả “native chưa chạy”, “B01 chưa triển khai” trong tài liệu mốc 28–29/09 là lịch sử. Dùng checklist và báo cáo gắn commit ở bộ này để biết tiến độ code hiện tại. Quy tắc đồng bộ toàn bộ tài liệu sau mỗi thay đổi code trong tài liệu cũ đã được thay bởi AGENTS.md ngày 30/09 và DELIVERY-01 ngày 01/10. Không dùng báo cáo triển khai để âm thầm đổi nghiệp vụ.

## Cách giữ tiến độ không bị quên

Mỗi phiên: đọc AGENTS → checklist → nhiệm vụ đang làm → spec liên quan → code thực tế. Chọn một lát đang hoạt động. Kết thúc lát: kiểm thử → tự review → viết báo cáo giải thích code → cập nhật checklist và mục lục báo cáo → bàn giao cho chủ dự án. Chỉ commit/push khi yêu cầu giao việc có cho phép; production/tiền thật luôn là quyết định riêng.

## Phạm vi lưu trữ bộ tài liệu

Theo yêu cầu chủ dự án ngày 01/10/2026, bộ kế hoạch/checklist/báo cáo chỉ lưu trong repo, quản lý bằng Git. Không đồng bộ Drive trừ khi có yêu cầu rõ. Markdown là nguồn hiện hành. Gói ZIP v1.0 là snapshot lịch sử lúc lập kế hoạch, không cập nhật theo tiến độ code và không dùng thay checklist hiện hành.
