# Dịch vụ quanh bạn

Thư mục dự án chính từ 23/09/2026. React + Storybook đã được chủ dự án chọn cho công việc thiết kế UI; bản hiện tại vẫn là prototype dữ liệu giả.

| Vị trí | Nội dung |
|---|---|
| `ui-ux/prototype` | Mã React + Storybook phục vụ thiết kế, chưa phải ứng dụng production |
| `ui-ux/research` | Nghiên cứu giao diện, hướng thiết kế, brainstorm banner/voucher |
| `ui-ux/specs` | Đặc tả và phạm vi UX hiện hành |
| `ui-ux/wireframes` | Prototype nghiệp vụ và các trang hồ sơ đang phục vụ ở cổng 8765 |
| `ui-ux/archive` | Thử nghiệm Figma, Penpot và bằng chứng UX lịch sử |
| `ui-ux/exports` | Gói xuất thiết kế theo phiên bản |
| `docs/project-control/So-quan-ly-tai-lieu.xlsx` | Sổ quản lý chính cho toàn bộ dự án |
| `docs/project-docs` | Hồ sơ chung, user flow, screen flow, sơ đồ, kiến trúc |
| `docs/technical-design` | Thiết kế dữ liệu, API, QA, backlog |
| `apps/mobile` | App Expo/React Native Đợt 1: danh mục từ API thật |
| `apps/web` | Dành cho web khách/partner; hiện chưa có mã sản phẩm |
| `apps/admin` | Dành cho web quản trị; hiện chưa có mã sản phẩm |
| `services/api` | NestJS: danh mục PostgreSQL/PostGIS, migration/seed/test |
| `packages` | Dành cho thành phần dùng chung khi có nhu cầu thực tế |
| `infra` | Dành cho cấu hình môi trường, triển khai và hạ tầng |
| `tools` | Công cụ tạo tài liệu và bằng chứng lịch sử |

Chạy từ `ui-ux/prototype`: `npm ci`, `npm run dev` (5178), `npm run storybook` (6006).
Build: `npm run build`, `npm run build-storybook`.

DOC-054 · Cấu trúc v0.1 ngày 23/09/2026. Tại mốc cấu trúc v0.1, thư mục sản phẩm chỉ giữ chỗ. Đợt 1 ngày 28/09 đã khởi tạo mobile/API; xem trạng thái hiện hành bên dưới. Không cần thêm thư mục `frontend`: mobile, web và admin đã là ba ứng dụng giao diện. `services/api` là backend chung. Chỉ tách worker khi có nhu cầu và quyết định kiến trúc tương ứng. Sau này tokens có thể dùng chung qua `packages`, nhưng component web không tự chạy được trên React Native.

Không đổi repository hay cấu hình của các dự án khác. `outputs → docs`, `work → tools`, `apps/ui` và những đường dẫn thiết kế cũ trong docs là symlink tương thích. Ở workspace Codex cũ, outputs/work cũng dẫn về đây. Chỉ sửa đường dẫn chính trong bảng trên, không tạo bộ tài liệu thứ hai. Symlink có thể bỏ sau khi các công cụ lịch sử được chuyển hết; không chạy lại builder cũ để ghi đè nguồn hiện hành.

UI mới đã chọn hướng Dịch vụ khu phố: [Hướng thiết kế v0.2](ui-ux/research/ui-direction-v0.2.md). React đã dựng v0.5 với luồng khách hàng và partner/doanh nghiệp; sơ đồ bản đồ và dữ liệu vẫn minh họa. Sổ quản lý giữ trạng thái phê duyệt riêng với trạng thái cập nhật.

Ý tưởng tương lai: [Banner, quảng cáo và voucher](ui-ux/research/promotions-v0.1.md). Đã chốt: toàn bộ nhóm này để mở rộng tương lai, không làm trong phase đầu; chưa gán lịch triển khai. Point hiện hành không thay đổi.

Đợt UI-05: [Design system v0.1](ui-ux/specs/design-system.md) và [luồng khách hàng v0.3](ui-ux/specs/customer-journey.md). Xem hướng dẫn thử, kiểm chứng và giới hạn tại DOC-056.

Đợt UI-06: [Partner/doanh nghiệp v0.5](ui-ux/specs/partner-journey.md). Thanh chọn vai trò ở đầu bản thử dùng các tài khoản mẫu để kiểm tra dữ liệu hai phía.

UI-12: [Đợt 1 — tài khoản, địa chỉ, đăng ký partner](ui-ux/specs/account-batch.md).


### UI-17 · Ví và ngân hàng (26/09/2026)
Xem [thiết kế và giới hạn](ui-ux/specs/finance-batch.md). Storybook `wallet-mobile` / `company-wallet`; quyền hiện hành tại Avatar → Đội ngũ → Quyền truy cập. React v0.11, 42 stories; chưa có cấp quyền tùy chỉnh và admin duyệt.


### UI-18 · Phân quyền và admin tài chính (27/09/2026)
Bản hiện hành React v0.12: avatar → Đội ngũ → Quyền truy cập để cấp quyền; `first-bank` để thử ngân hàng lần đầu. Chuyển vai **Admin · Duyệt tài chính**, mã mẫu 654321, để duyệt nạp/rút/ngân hàng. Có 45 stories, 39 kiểm tra logic. Quyết định admin cập nhật trực tiếp số dư/trạng thái partner trong phiên. [Chi tiết và giới hạn](ui-ux/specs/finance-batch.md).


### UI-19 · Hỗ trợ và kiểm duyệt (27/09/2026)
Tài khoản hoặc công việc → Hỗ trợ. Chọn vai **Admin · Hỗ trợ và kiểm duyệt**, mã mẫu 654321. Story `admin-operations-queue` có hồ sơ/đánh giá mẫu; `customer-support` để gửi báo cáo. React v0.13, 48 stories và 42 tests. [Luồng, QA và phần còn lại](ui-ux/specs/support-moderation.md).


## UI-20 — cập nhật hiện hành 27/09/2026
React v0.14, UI-UX-v0.18.zip, registry v1.26. Đã bổ sung quản trị tài khoản, đình chỉ partner, danh mục và báo cáo/nhật ký vận hành. Xem [phạm vi, luồng và bằng chứng QA](ui-ux/specs/admin-operations.md). Các ghi chú trước đây rằng bốn nhóm này chưa có trong React được thay bằng UI-20; không đổi nghiệp vụ hay mở các mục pending. Các lớp xác thực và dữ liệu vẫn là mô phỏng.


## UI-21 — rà soát luồng 27/09/2026
Bản hiện hành React v0.15 / UI-UX-v0.19.zip. Đã sửa kiểm trạng thái lúc gửi thuê, mở chat đúng người từ công việc, thông báo đến nhân viên phụ trách và khôi phục giá trị point khi mở hóa đơn từ thông báo. [Ma trận kiểm chứng và phần chưa nghiệm thu](ui-ux/specs/flow-review.md). Không đổi nghiệp vụ đã chốt; 49 tests, 52 stories.


## Sản phẩm Đợt 1 · 28/09/2026

Đã có Expo/React Native → NestJS → PostgreSQL/PostGIS local cho danh mục 10 ngành. [Cách cài, chạy, test và kết quả](docs/implementation/dot-1.md) · [ADR kỹ thuật](docs/implementation/ADR-001-foundation.md).

```sh
npm ci
cp -n services/api/.env.example services/api/.env
cp -n apps/mobile/.env.example apps/mobile/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run api
# Terminal khác: npm run mobile hoặc npm run mobile:web
```

Prototype có lockfile riêng và vẫn dùng để review thiết kế. Chưa thử native simulator/thiết bị, chưa kích hoạt CI từ xa, chưa production/tiền thật. Repository đã được chủ dự án chỉ định: https://github.com/anhthaingd/dich-vu-quanh-ban. Git riêng được khởi tạo tại thư mục dự án; không sửa Git cha. Template CI vẫn ở `infra/ci`, chưa kích hoạt workflow từ xa.

Lưu ý khi clone: `tools/` và symlink `work` là dữ liệu làm việc local, không đưa vào Git. Cache, `.env`, bản build và báo cáo tạm cũng được bỏ qua; `.env.example`, mã sản phẩm, prototype và hồ sơ thiết kế được giữ. Symlink tương thích trong Git dùng đường dẫn tương đối.
