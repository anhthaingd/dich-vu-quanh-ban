# Dịch vụ quanh bạn

Mobile Expo/React Native + API NestJS + PostgreSQL/PostGIS. **Đã chạy được luồng ngành → nhóm → kỹ năng với DB thật.** Những chức năng khác đang là khung giữ chỗ. Website/admin chưa khởi tạo ứng dụng.

DOC-054 · Cấu trúc v0.3 · 28/09/2026.

## Bắt đầu ở đâu

- **Hiểu code và chỗ đặt file:** [Sơ đồ cấu trúc DOC-070](docs/implementation/project-structure.md).
- **Cài/chạy/test:** [Runbook Đợt 1 DOC-065](docs/implementation/dot-1.md).
- **Quyết định kỹ thuật:** [ADR-001](docs/implementation/ADR-001-foundation.md).
- **Log và kiểm thử:** [Runbook phương án A đã triển khai local](docs/implementation/logging-testing.md).
- **Đặc tả và quyết định nghiệp vụ:** [Sổ quản lý tài liệu](docs/project-control/So-quan-ly-tai-lieu.xlsx), đọc trước khi đổi chức năng.

## Bản đồ repository

```text
apps/
  mobile/             Expo, ứng dụng sản phẩm Android/iOS
  web/                Khung website responsive, triển khai sau
  admin/              Khung giao diện quản trị, triển khai sau
services/
  api/                NestJS, một backend chia module nghiệp vụ
packages/             Khung contracts, API client, domain, design tokens
```

```text
tests/e2e/web/         Smoke xuyên mobile web → API → PostgreSQL
tests/e2e/native/      Maestro flow/preflight; native còn BLOCKED
tests/performance/     Kiểm thử tải local danh mục
scripts/              Build, quality gates, xuất diagnostic
infra/                Docker Compose, CI template, khung observability
.github/workflows/    Workflow quality đã có; chưa push/run remote
docs/                 Đặc tả, kiến trúc, runbook, sổ quản lý
ui-ux/                Prototype React/Storybook và tài liệu thiết kế
tools/                Công cụ tài liệu local, không thuộc Git
```

Mobile đi từ `apps/mobile/index.ts` → `src/app/App.tsx` → `src/features/catalog/`. API đi từ `services/api/src/main.ts` → `bootstrap.ts` → `app.module.ts` → `modules/catalog/`. Các thư mục chỉ có `.gitkeep` **chưa có triển khai**. Danh sách trách nhiệm và quy tắc mở rộng ở DOC-070.

## Chạy local

Dùng Node/npm đã khóa trong `.nvmrc`/`package.json`, Docker đang chạy:

```sh
npm ci
cp -n services/api/.env.example services/api/.env
cp -n apps/mobile/.env.example apps/mobile/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run api
# Terminal khác:
npm run mobile
# Hoặc: npm run mobile:web
```

```sh
npm run lint
npm run typecheck
npm run test:tooling
npm test
docker compose -f infra/compose.yaml --profile test up -d --wait db-test
npm run test:integration
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:smoke
```

Playwright ghi HTML/JUnit/JSON và giữ trace/video/screenshot khi fail trong `test-results/web/` (không track Git). Ảnh bàn giao cũ trong docs giữ nguyên. Native binary/thiết bị và CI từ xa chưa được nghiệm thu; bundle build không thay cho chạy native. Không production hoặc tiền thật.

## Thiết kế và nguồn chuẩn

`ui-ux/prototype` là bản thử dữ liệu mô phỏng, có package-lock riêng, không nằm trong npm workspace sản phẩm. Chạy tại đó: `npm ci`, `npm run dev` (5178), `npm run storybook` (6006); build bằng `npm run build` và `npm run build-storybook`. Đặc tả ở `ui-ux/specs`, wireframe ở `ui-ux/wireframes`, nghiên cứu ở `ui-ux/research`, lịch sử ở `ui-ux/archive`, gói xuất ở `ui-ux/exports`.

Nguồn tài liệu chung ở `docs/project-docs`, thiết kế dữ liệu/API/QA ở `docs/technical-design`. `outputs → docs`, `work → tools`, `apps/ui` và các alias trong docs là symlink tương thích; chỉ sửa đường dẫn chính. Không chạy builder cũ để ghi đè chỉnh sửa hiện hành. Git riêng của dự án trỏ `anhthaingd/dich-vu-quanh-ban`; không sửa Git cha. `tools/`, `work`, `.env`, cache, build, log và báo cáo tạm không vào Git.

Banner chiến dịch, quảng cáo partner và voucher ngoài phase đầu theo PROMO-02; point hiện hành vẫn trong phạm vi. Thư mục giữ chỗ không phê duyệt nghiệp vụ pending hoặc kích hoạt tích hợp thật.

<details>
<summary>Lịch sử thiết kế UI — các mốc và liên kết đã bàn giao</summary>

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



</details>
