# Thiết kế kỹ thuật chi tiết

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
