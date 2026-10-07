# Thiết kế kỹ thuật chi tiết

> **P0-1 · 06/10/2026 · v0.1.6 · Đã duyệt: hồ sơ quản lý riêng có version; draft/published, công bố không tự bật nhận việc; phone_verified trước tạo partner, owner và ví rỗng cùng transaction. Tìm theo distance mặc định, vùng tròn đo tới tâm và phải bao phủ khách; cursor theo distance_m/created_at/id, gắn bộ lọc. Tài khoản/provider test tách biệt được phép tạo trực tiếp; OTP, polygon, bản đồ và xếp hạng recommended/rating chưa triển khai. Không production/tiền thật.**

> **B01-04A · 06/10/2026 · v0.1.5: chủ dự án duyệt gộp quản lý phiên và sổ địa chỉ. Một mục phiên đại diện một lần đăng nhập (id = family_id ổn định qua refresh), có created_at, last_seen_at, is_current; state active/expired/revoked; không trả IP, token/hash. Thu hồi chặn toàn bộ family và kiểm lại quyền trong transaction. Địa chỉ thêm is_default/version; địa chỉ đầu tiên khi sổ đang rỗng tự mặc định. Chọn mặc định mới bỏ mặc định cũ và tăng version bản cũ. Gỡ mặc định để chưa có mặc định, không tự chọn mục khác. PUT yêu cầu expected_version. Mọi mutation giữ Idempotency-Key khi retry, kiểm chủ sở hữu; archive giữ dữ liệu lịch sử, không đổi snapshot công việc. Nhập địa chỉ/tọa độ thủ công, chưa chọn GPS/map provider. OTP Pending; không production/chi phí.**

> **B01-04 · 06/10/2026 · v0.1.4:** `Me.version` bắt buộc đã được chủ dự án duyệt, dùng cho lát sửa tên với kiểm phiên bản và gửi lặp an toàn. Nguồn API, QA, viewer và gói hiện hành cập nhật cùng đợt. DB đã có `users.version`; bảng idempotency theo mô hình đã thiết kế. Không đổi nghiệp vụ xác minh, quyền, ngôn ngữ tài khoản hoặc các phần Pending. Các ghi chú cũ bên dưới là mốc lịch sử; tiến độ code xem bộ kế hoạch triển khai trong repo.

> **I18N-04 · 05/10/2026 · v0.1.3 (phạm vi danh mục đã duyệt):** API/data/QA danh mục cập nhật I18N-04 theo quyết định 05/10/2026, phiên bản bổ sung v0.1.3. Các phần ngoài danh mục giữ nguyên trạng thái thiết kế. Gói hiện hành `technical-design-v0.1.1.zip` giữ tên/Drive ID vì được đăng ký như gói cập nhật tại chỗ; phiên bản nội dung xem nguồn, không suy từ tên ZIP.


Phiên bản 0.1.2 · 28/09/2026 · Đợt 1 triển khai local danh mục Expo/NestJS/PostgreSQL/PostGIS. Chi tiết và bằng chứng tại DOC-065; phần ngoài danh mục vẫn là thiết kế, chưa production/tiền thật.

## Đọc nhanh

1. Mở technical-design.html để xem sơ đồ và tra cứu theo nhóm.
2. 01-data-design.md + schema.sql: ERD vật lý, từ điển trường, ràng buộc và kế hoạch migration.
3. 02-api-realtime.md + openapi.json + realtime.json: hợp đồng giao tiếp và sự kiện.
4. 03-qa-plan.md + qa-cases.csv + rtm.json: kế hoạch kiểm thử, chưa phải kết quả test sản phẩm.
5. 04-backlog.md: thứ tự triển khai và điều kiện hoàn thành từng đợt.

Nguồn chuẩn nghiệp vụ: SRS v0.14, FR/NFR v0.16, UX v0.24, Q01/Q02/Q03 và phạm vi pending hiện hành. Sổ Excel quản lý liên kết/ảnh hưởng; không tự thay thế tài liệu gốc. JSON là nguồn dữ liệu cho viewer; sửa nội dung phải tái tạo Markdown/viewer/ZIP cùng đợt.

## Những gì chưa được coi là đã xong

- DDL được kiểm cú pháp không có nghĩa migration đã chạy trên PostgreSQL/PostGIS thật.
- OpenAPI hợp lệ không chứng minh backend có endpoint hoặc đã kiểm bảo mật.
- Test case và RTM là kế hoạch; QA-001…055 vẫn Chưa chạy; QA-056…059 đã kiểm local; QA-060 native bị chặn.
- Đợt 1 chọn pg/SQL migration (ADR-001); chưa chọn provider OTP/map/push/call/ngân hàng, gói hạ tầng; phiên bản runtime/framework Đợt 1 đã khóa trong workspace.
- Q02: khoản giữ treo vẫn pending đợt hiện tại, bắt buộc có cách xử lý qua báo cáo/admin và kiểm chứng trước tiền thật.
- Tiếp theo vẫn cần Design System/đặc tả field, runbook deploy/backup, runbook tài chính, lựa chọn tích hợp và dự toán.

Nguồn triển khai và runbook: [DOC-065](../implementation/dot-1.md), [ADR-001](../implementation/ADR-001-foundation.md). ZIP hiện hành `technical-design-v0.1.1.zip`; `v0.1.zip` là bản lịch sử giữ nguyên.


## LOGTEST-01 · 28/09/2026

Phương án A đã triển khai và kiểm local; chi tiết vận hành/bằng chứng tại [DOC-071](../implementation/logging-testing.md). Native còn BLOCKED; `.github/workflows/quality.yml` đã chuẩn bị, chưa push/chạy remote CI.

## MAP-01 — phiên bản API v0.1.7

Ba endpoint địa điểm và QA-076–079, thử MapLibre + Geoapify Free theo duyệt triển khai 07/10/2026. Chưa billing/production. Báo cáo B03-01 trong repo ghi riêng code/local/native/live provider; DB không đổi. ZIP v0.1.1 tiếp tục là gói hiện hành, tên giữ để không hỏng liên kết.
