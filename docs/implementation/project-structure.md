# DOC-070 — Khung cấu trúc dự án

v1.3 · 29/09/2026 · STRUCTURE-01; LOGTEST-01; NATIVE-B-01. Khung và log/test đã triển khai local; cấu hình development build đã bổ sung.

NATIVE-B-01: `apps/mobile/plugins/with-debug-http.cjs` là Expo config plugin tách HTTP Debug/Release; `app.json` giữ app ID/scheme. Expo CNG sinh `apps/mobile/android/` và `ios/`, cả hai được ignore khỏi Git/lint. Thay cấu hình ở nguồn, không sửa native generated. Workspace dùng script `native:generate` (gốc: `mobile:prebuild`) để tránh hook npm `prebuild` tự chạy khi export bundle. `scripts/test/native-config.mjs` kiểm cấu hình đã sinh, không là native E2E. Hai thiết bị ảo đã boot; binary và Maestro còn chờ. Xem [DOC-076](../huong-dan-mobile/04-chay-app.md).

## Nguyên tắc và nguồn tham khảo

Giữ npm workspace hiện hành, một API NestJS chia module nghiệp vụ, mobile Expo tách khỏi website và prototype. Không đổi framework/package manager chỉ để giống repository khác. Các thư mục chỉ có `.gitkeep` là vị trí dự kiến, không có endpoint, màn hình, dependency hoặc test giả.

Đã kiểm cây nguồn công khai ngày 28/09/2026:

| Nguồn | Điều quan sát được | Áp dụng tại đây |
|---|---|---|
| [Expo monorepos](https://docs.expo.dev/guides/monorepos/) | `apps` và `packages`, hỗ trợ npm workspaces và Metro tự nhận monorepo | Giữ npm, chỉ khai báo hai workspace thực sự chạy |
| [Mattermost Mobile](https://github.com/mattermost/mattermost-mobile/tree/bc03c18f88581bde36dd82a84321b2ddde40d12c) | `app/components`, `screens`, `client`, `hooks`, `routes`; assets và E2E tách riêng | Tách composition, UI dùng chung, client và test; nhóm code nghiệp vụ vào feature để dễ tìm |
| [Immich](https://github.com/immich-app/immich/tree/6b978d0c0d3dfddf43c9138314bc7d1c5e5295d2) | mobile/server/web/packages/e2e độc lập; server tách controller/service/repository/schema | Tách ứng dụng, API, tài nguyên DB và E2E; chưa thêm lớp repository khi SQL hiện hành chưa cần |
| [Vendure](https://github.com/vendure-ecommerce/vendure/tree/cccf0a72ec1b88a4e00ea3cffad4d30b35aaf7e7/packages/core/src) | Nest backend có config, connection, health-check, telemetry, testing, các module hạ tầng | Tách database, config, health và logging khỏi controller nghiệp vụ |

Các repo trên có cách nhóm khác nhau. `features/<miền>` và `modules/<miền>` là lựa chọn cho dự án này để code cùng nghiệp vụ ở gần nhau, không phải cấu trúc sao chép nguyên xi từ một nguồn.

## Cây sản phẩm

`[chờ]` chỉ chứa `.gitkeep`. Folder có code bên dưới đã được nối vào app/lệnh chạy.

```text
apps/mobile/
  index.ts                         Đăng ký Expo root
  app.json                         Cấu hình Expo
  assets/{fonts,images}/           [chờ] Tài nguyên đóng gói
  src/
    app/
      App.tsx                      Composition root
      navigation/                  [chờ] Navigation toàn app
      providers/                   [chờ] Provider toàn app
    components/ui/                 [chờ] UI React Native dùng chung
    theme/                         [chờ] Ánh xạ token thành theme native
    lib/http/                      API errors, request lifecycle
    lib/logging/                   Diagnostic buffer/JSONL
    lib/storage/                   [chờ] Lưu trữ mobile
    features/
      catalog/
        api/catalog-api.ts         Đọc API, phân trang, timeout/cancel
        api/catalog-api.test.ts
        models/catalog.types.ts    Kiểu dữ liệu của feature
        screens/CatalogScreen.tsx  UI và trạng thái danh mục
        screens/CatalogScreen.test.tsx
      auth/ accounts/ partners/ search/ jobs/ organizations/
      chat/ notifications/ invoices/ wallet/ points/ support/ [chờ]
  test/helpers/                    Jest setup cho native module boundary
apps/web/src/{app,features,components,lib}/   [chờ]
apps/admin/src/{app,features,components,lib}/ [chờ]

services/api/
  src/
    main.ts                        Đọc env, khởi động server
    bootstrap.ts                   Tạo HTTP app, prefix/CORS/filter
    app.module.ts                  Nối các module đã triển khai
    config/environment.ts          Đọc và kiểm env
    common/http/http-exception.filter.ts
    common/guards/                 [chờ] Guard xác thực/phân quyền
    database/
      database.module.ts           Pool và lifecycle; export Pool toàn app
      cli.ts                       CLI migration/seed
      migrate.ts                   SQL migration và checksum
      seed.ts                      Seed local/test
    health/
      health.module.ts
      health.controller.ts         Liveness/readiness
    logging/                       Events, sanitizer, Pino, output
    integrations/                  [chờ] Adapter nhà cung cấp ngoài
    modules/
      catalog/
        catalog.module.ts          Đăng ký controller/provider
        catalog.controller.ts      HTTP input, gọi service
        catalog.service.ts         Truy vấn nghiệp vụ
        catalog.query.ts           Validate query và signed cursor
      auth/ accounts/ partners/ search/ jobs/ organizations/
      chat/ notifications/ invoices/ wallet/ points/ support/
      moderation/                  Các miền còn lại [chờ]
  migrations/001_catalog.sql       Migration đã chạy; không sửa nội dung
  seeds/catalog.json               Fixture local danh mục
  test/
    unit/catalog-config.test.ts
    integration/catalog.test.ts    HTTP và PostgreSQL/PostGIS thật
    helpers/                       DB schema fixture, capture JSONL

packages/
  contracts/src/                   [chờ] DTO/schema giao tiếp thuần
  api-client/src/                  [chờ] Client dùng chung khi có consumer
  domain/src/                      [chờ] Logic/validation thuần có nhu cầu chia sẻ
  design-tokens/src/               [chờ] Màu/khoảng cách/typography thuần
tests/
  e2e/web/                         Playwright config/fixtures/specs
  e2e/native/                      Maestro flow; chờ binary và kiểm app thực tế
  performance/catalog.mjs          200 request local, concurrency20
scripts/
  build/clean-api.mjs              Xóa output sinh ra trước khi build
  build/api.mjs                    Copy SQL và fixture vào dist
  dev/                            [chờ] Công cụ phát triển
  diagnostics/                    Xuất JSONL, filter/limit, test
infra/
  compose.yaml                    PostgreSQL/PostGIS local và test
  ci/github-actions.yml           Template, chưa kích hoạt
  observability/                  [chờ] Cấu hình thu thập log/metric
.github/workflows/quality.yml     Quality workflow; chưa push/run remote
```

`docs` giữ đặc tả/runbook/sổ quản lý; `ui-ux` giữ prototype/thiết kế. PATH-01 (29/09/2026): bỏ alias `outputs`, dùng trực tiếp `docs/`; `apps/ui` trỏ trực tiếp đến `ui-ux/prototype`. Các alias khác còn được giữ tương thích. Các ZIP lịch sử và ghi chép baseline có thể còn tên `outputs`; chúng không phải hướng dẫn đường dẫn hiện hành. `test-results/`, `.local/`, `dist/`, `coverage/` là output bỏ qua Git, không phải source.

## Trách nhiệm các miền giữ chỗ

| Miền | Trách nhiệm dự kiến khi được giao triển khai |
|---|---|
| auth | Xác thực, phiên, quyền truy cập; chưa chọn nhà cung cấp OTP |
| accounts | Hồ sơ tài khoản, địa chỉ |
| partners | Hồ sơ/đăng ký nhà cung cấp dịch vụ |
| search | Tìm dịch vụ, vị trí và bộ lọc |
| jobs | Công việc/yêu cầu thuê và trạng thái |
| organizations | Doanh nghiệp, đội ngũ, quyền nhân viên |
| chat | Hội thoại gắn với công việc |
| notifications | Thông báo và điều hướng đích |
| invoices | Hóa đơn nghiệp vụ |
| wallet | Ví, yêu cầu tài chính, thông tin ngân hàng; chưa tiền thật |
| points | Point hiện hành |
| support | Yêu cầu hỗ trợ/báo cáo |
| moderation | Xử lý quản trị/kiểm duyệt phía API và admin sau này |

Không tạo miền banner/ads/voucher theo PROMO-02. Folder không chốt nhà cung cấp, workflow pending, mô hình dữ liệu hoặc điều kiện tiền thật. Không dựng worker/queue/microservice chưa có nhu cầu.

## Quy tắc đặt code và dependency

1. Mobile: `app` nối feature và provider; `features` sở hữu UI, API và types của từng miền; `components/ui`, `lib`, `theme` không import ngược vào feature. Test hành vi đặt cạnh source; helper dùng chung ở `test/helpers`.
2. API: `main/bootstrap/app.module` chỉ khởi tạo. Controller đọc HTTP, service xử lý nghiệp vụ, query/DTO kiểm input. Module khác chỉ dùng provider được export, không import controller hoặc chạm nội bộ của nhau. `common`, `config`, `database`, `logging` không phụ thuộc module nghiệp vụ.
3. `DatabaseModule` global chỉ cung cấp một Pool; app đóng pool do app tạo. Test truyền pool riêng thì test sở hữu cleanup. Health không nằm trong CatalogController.
4. `packages` chỉ nhận mã thuần có consumer thật; không import source từ `apps`, `services` hoặc `ui-ux`. Không chia sẻ component DOM cho React Native. Package giữ chỗ chưa có `package.json`, chưa nằm trong workspace, không có lệnh build/test giả.
5. Không thêm alias TypeScript chỉ để rút ngắn import: hiện dùng relative import khớp Node ESM/Metro/Jest. Khi thêm alias phải cập nhật cả runtime, bundler và test runner.
6. API dùng tên `kebab-case.role.ts`; component React dùng `PascalCase.tsx`; test `*.test.ts(x)`. Không tạo barrel `index.ts` hàng loạt hoặc lớp abstract rỗng.
7. Khi triển khai miền mới: đọc registry/spec đã duyệt, thêm source và test cần thiết, nối module/navigation thật rồi bỏ `.gitkeep`. Chỉ tạo `dto`, `hooks`, `components`, `repositories` con khi có code tương ứng.
8. Khi kích hoạt website/admin/package: tạo manifest thật, thêm đường dẫn cụ thể vào root `workspaces`, chạy `npm install` tại root để cập nhật lockfile, nối quality checks. Không dùng glob `apps/*` vì có alias `apps/ui` của prototype.

Chưa chọn/migrate Expo Router. `src/app` hiện là composition thông thường, không phải file-based routes. `ios/` và `android/` không tạo rỗng: Expo có thể sinh native project khi cần [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/).

## Kiểm chứng và bước tiếp

Các lệnh chính giữ nguyên trong README và DOC-065. Bộ kiểm hiện có phải tiếp tục pass sau chuyển đường dẫn; migration, seed, endpoint và giao diện danh mục giữ hành vi. Build API dọn dist trước biên dịch để tránh chạy nhầm file cũ. Smoke mới ghi `test-results/web/`, ảnh docs đã bàn giao giữ nguyên.

Sau khung đã triển khai local DOC-069 phương án A theo [DOC-071](logging-testing.md) (Pino/request context, logger mobile, sanitizer, export log, test isolation/report/coverage, Playwright Test và CI). Logging/test đã có code và bằng chứng riêng tại DOC-071. Native/remote CI cần bằng chứng riêng; không suy ra từ bundle/web.

Phạm vi đồng bộ: DOC-054/064/065/066/069/070, registry và hai ZIP kỹ thuật có chứa các tài liệu này. API/ERD/QA nghiệp vụ, BRD/PRD/FR/SRS, quyền/trạng thái, wireframe, prototype không đổi nội dung vì không đổi contract hoặc nghiệp vụ. Nguồn JSON/viewer không mô tả đường dẫn code cũ nên không cần tái tạo nội dung; các ZIP hiện hành được làm mới từ đúng file nguồn.


### Kết quả kiểm sau chuyển cấu trúc

Ngày 28/09/2026: lint/typecheck PASS; 4 mobile tests +3 API unit PASS; 8 HTTP/PostgreSQL integration PASS; API build và Expo Android/iOS/web bundles PASS; smoke app web → API → PostgreSQL PASS (ngành/nhóm/kỹ năng, offline/retry, rỗng, 390px). Bằng chứng mới ở `test-results/web/catalog-{root,skills,error,empty}.png`. Native simulator/thiết bị và remote CI chưa chạy. Prototype không đổi, không chạy lại bộ prototype trong đợt này.


Mốc kiểm STRUCTURE-01 phía trên giữ lịch sử. LOGTEST-01: `scripts/test` chứa coverage gate và native preflight; các `*.test` mới nằm cạnh source mobile và trong API test/unit/integration. Danh sách file chính xác trong repository; logging/test không còn là thư mục trống.
