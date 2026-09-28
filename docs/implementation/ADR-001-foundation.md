# DOC-066 — ADR-001: nền tảng Đợt 1

v1.0 · 28/09/2026 · Quyết định kỹ thuật trong phạm vi triển khai được giao qua DOC-064. Không phải phê duyệt production.

## Bối cảnh và lựa chọn

- **Runtime:** Node 24.7.0, npm 11.5.1 là runtime hiện có và đã kiểm trên máy; `.nvmrc`, engines, packageManager và package-lock ghi rõ. Cần đánh giá bản vá runtime trước phát hành; không tự thay runtime toàn máy.
- **Workspace:** npm workspaces chỉ `apps/mobile` và `services/api`, một lockfile sản phẩm. Prototype giữ package-lock và scripts riêng. Chưa có nhu cầu package dùng chung nên không tạo package trống.
- **App:** Expo 57.0.25, React Native 0.86.3, React 19.2.3; dependency bổ trợ đối chiếu `expo install --check`. Màn danh mục dùng React Native, safe area, màu/nhịp điệu từ PLAN-006; font hệ thống hỗ trợ tiếng Việt. Expo web dùng kiểm thử cùng code app, không thay quyết định website responsive về sau.
- **API:** NestJS 12.1.0, TypeScript 6.0.3; một module danh mục trong một ứng dụng. Chưa thêm worker/queue/auth/CRUD admin.
- **Dữ liệu:** PostgreSQL 17/PostGIS 3.5, image `postgis/postgis:17-3.5` khóa digest trong Compose. Image dùng linux/amd64 qua OrbStack trên Mac arm64. Không dùng DB/volume dự án khác.
- **Truy cập DB:** `pg` và SQL tham số hóa, chưa dùng ORM. Ba bảng danh mục đủ nhỏ; migration SQL phiên bản, transaction và khóa advisory tránh chạy đồng thời, checksum chống sửa migration đã áp dụng. Khi phát triển miền khác sẽ đánh giá lại ORM trong ADR mới.
- **Schema:** dùng `categories.parent_id`, `skills` độc lập, `skill_categories` N–N đúng thiết kế. FK RESTRICT, mã duy nhất, tên không rỗng, version dương, trigger chặn chu kỳ. Không chạy toàn bộ DDL tham chiếu. Mọi tổ tiên phải active thì node mới được chọn; shared skill vẫn thấy qua nhánh active khác.
- **Seed:** 10 mã ngành PRD §6; 10 nhóm duyệt kỹ thuật và 20 kỹ năng minh họa từ nội dung PRD, 21 liên kết gồm một `camera_installation` dùng chung. UUID suy ra ổn định từ mã kỹ thuật, không từ tên hiển thị. Nhãn nhóm là cấu hình local/test, chưa công bố catalog production. Không lấy “Trông thú cưng” trong prototype vì PRD để nhánh đó cho mở rộng. `ON CONFLICT(id) DO NOTHING` bảo toàn trường người dùng sửa; xung đột code khác ID làm rollback thay vì tự ghi đè. Seed chỉ chạy CLI khi NODE_ENV development/test.
- **Contract:** giữ hai operation `listCategories`/`listSkills`. Thêm `Category.parent_id`, `parent_id=root|UUID` trên categories; skills lọc ngành/nhóm gồm con. UUID hợp lệ nhưng không tồn tại/ngừng → trang rỗng. Cursor HMAC gắn endpoint/filter/public, thứ tự created_at,id; giới hạn20/max100. Tham số lạ/lặp/sai →400. App đọc hết các trang, timeout10s, hủy request khi chuyển màn và báo lỗi thay vì mock.
- **CI:** template trong `infra/ci`, chưa đặt vào Git cha. Chờ quyết định repository riêng trước kích hoạt remote CI; không commit/push. Local chạy các lệnh tương đương, không gọi là CI từ xa.

## Nguồn kiểm tương thích

- [Expo SDK reference](https://docs.expo.dev/versions/latest/): SDK57/RN0.86/React19.2.3, Node từ22.13.
- [NestJS migration guide](https://docs.nestjs.com/migration-guide): Nest12 ESM, runtime có require(esm), Node20.19+/22.12+.
- [Docker PostGIS chính thức](https://github.com/postgis/docker-postgis): nhánh PostgreSQL17/PostGIS3.5.
- npm registry và template `expo-template-blank-typescript@57.0.27` đã kiểm ngày28/09/2026. Phiên bản thực tế và dependency bắc cầu nằm trong lockfile.

## Giới hạn

Không production, TLS công khai, tài khoản thật, ngân hàng hoặc tiền thật. Chưa chứng minh native simulator/thiết bị, App Store, load/security audit toàn hệ thống, backup/restore sản phẩm. DB local dùng role phát triển; trước production cần tách migration owner và runtime read-only, secrets thật, rate limit và kiểm vận hành. Q02/PROMO-02 và backlog ngoài Đợt1 giữ nguyên.
