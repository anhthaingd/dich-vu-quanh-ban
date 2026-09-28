# DOC-065 — Đợt 1: nền tảng và danh mục

v1.4 · 28/09/2026 · Đã triển khai và kiểm local theo DOC-064. Còn kiểm native thiết bị/simulator và kích hoạt CI từ xa.

## Baseline trước thay đổi

- Sổ v1.28 local/Drive giống SHA-256 `fd13b902236a2146f0e36f9ee356a3698c93394db4684d2b49f7bc320e75fa61`. Drive sửa 27/09 03:42:19 UTC.
- Git root `/Users/j2866/Documents/anhthai`; dự án chưa được track (`?? ./`). Không sửa Git cha, stage, branch, commit hay push.
- `apps/mobile`, `services/api`, `infra`, `packages` trống. Prototype có package-lock riêng, giữ ngoài workspace sản phẩm.
- Node 24.7.0, npm 11.5.1; Docker/OrbStack hoạt động. Container gym/Fuurin/uranai đang chạy, không dùng chung hoặc thay đổi.
- Không có `xcrun simctl` và `adb`. Chưa thể kiểm native thiết bị/simulator.
- `outputs`, `work`, `apps/ui` là đường tương thích. `ui-ux/wireframes/technical-design` là bản sao phục vụ, nguồn chuẩn ở `docs/technical-design`.
- Đã đọc BRD v0.2, PRD v0.3, FR/NFR v0.16, SRS v0.14 trên Drive. FR-CAT-001/002 giữ 10 ngành, skill N–N, ngừng chọn mới nhưng giữ lịch sử. Không lấy mẫu prototype làm quy tắc sản phẩm.

## Phạm vi và thứ tự

1. npm workspace chỉ mobile/API, cấu hình local/test, khóa dependency.
2. Migration danh mục, skill và liên kết N–N; seed local từ PRD §6–7, ID ổn định, không ghi đè dữ liệu.
3. NestJS `/v1/categories`, `/v1/skills`, health/readiness; bổ sung contract cây danh mục vào endpoint hiện hành.
4. Expo màn ngành → nhóm/kỹ năng; tải/rỗng/lỗi/thử lại, không fallback mock.
5. Kiểm unit, HTTP–PostgreSQL, app, bundle, prototype; CI chuẩn bị trong dự án.
6. Đồng bộ JSON/Markdown/viewer/bản phục vụ/ZIP/Drive và sổ quản lý.

Đây là lát kiểm chứng B00; chưa hoàn thành toàn bộ B02, tài khoản, quản trị danh mục hoặc nghiệp vụ thuê. Không production/tiền thật.

## Chạy từ lockfile

Tại gốc dự án, dùng Node/npm trong `.nvmrc` và `package.json` (nếu có nvm: `nvm use`). Docker phải đang chạy.

```sh
npm ci
cp -n services/api/.env.example services/api/.env
cp -n apps/mobile/.env.example apps/mobile/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run api
```

API mặc định `http://127.0.0.1:3100/v1`. Terminal khác: `npm run mobile`, hoặc `npm run mobile:web`. Khi không có Watchman và Metro báo EMFILE, dùng `CI=1 npm run mobile` để tắt watcher; sửa code thì khởi động lại Metro. Đổi API URL thì khởi động với `--clear` để không dùng bundle đã inline URL cũ. Trong sandbox phiên kiểm này, cache npm/Expo dùng `/tmp`; đây không phải yêu cầu thay cấu hình toàn máy.

`npm run build` xuất bundle Android/iOS/web và biên dịch API. Có thể thử bản web đã xuất bằng `python3 -m http.server 8081 --bind 127.0.0.1 --directory apps/mobile/dist`, mở `http://localhost:8081` (khớp CORS_ORIGIN). API đã build: tại `services/api`, chạy `node --env-file=.env dist/src/main.js`. Không cần Expo account để export/check.

### Thiết bị và địa chỉ API

| Môi trường | EXPO_PUBLIC_API_URL | Ghi chú |
|---|---|---|
| iOS simulator trên Mac / browser | `http://127.0.0.1:3100/v1` | API cùng máy |
| Android emulator tiêu chuẩn | `http://10.0.2.2:3100/v1` | Loopback của máy phát triển |
| Điện thoại thật | `http://<IP-LAN-của-Mac>:3100/v1` | Cùng Wi-Fi; API `HOST=0.0.0.0`; chạy `npm exec -w apps/mobile -- expo start --lan --clear`; chỉ dùng mạng local tin cậy |

`EXPO_PUBLIC_*` được đóng vào app nên không chứa bí mật. Không giả định localhost trên điện thoại là Mac. Seed minh họa chỉ local/test, không có partner, OTP, số dư hoặc ngân hàng giả trong app.

### DB và bảo toàn dữ liệu

- Local: service `db`, database `dvqb_local`, cổng55432, volume `dvqb-foundation_catalog-data`.
- Test: service `db-test`, database `dvqb_test`, cổng55433, tmpfs. Mỗi lần integration/smoke tạo schema UUID riêng rồi xóa đúng schema của lần đó. Từ chối URL không phải `dvqb_test`; không truncate DB làm việc.
- Dừng local: `npm run db:stop`. Dừng test: `docker compose -f infra/compose.yaml --profile test stop db-test`. Không dùng `down -v` để giữ dữ liệu local.
- Chạy lại migration/seed không nhân đôi; migration đã áp dụng không được sửa checksum. Không rollback phá dữ liệu; thay đổi tiếp theo thêm file migration mới. Không dùng `docs/technical-design/schema.sql` để khởi tạo môi trường này.
- Seed: `services/api/seeds/catalog.json`, nguồn PRD §6–7/FR-CAT-001/002. 10 ngành, 10 nhóm, 20 kỹ năng, 21 liên kết. Nhãn nhóm và tập skill là fixture local, chưa công bố danh mục production. Mã ổn định, camera dùng chung một skill ID.

## Kiểm chứng 28/09/2026

```sh
docker compose -f infra/compose.yaml --profile test up -d --wait db-test
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npx playwright install chromium
npm run test:smoke
```

| Kiểm tra | Kết quả thực tế |
|---|---|
| `npm ci` | Đạt từ package-lock sản phẩm |
| `expo install --check` | Đạt, dependency khớp SDK57 |
| lint/typecheck | Đạt mobile, API và scripts |
| `npm test` | 4 app/API-client tests + 3 API unit tests đạt |
| `npm run test:integration` | 8 tests HTTP–NestJS–PostgreSQL thật đạt; migration schema trống, PostGIS, seed lặp/bảo toàn, N–N, cha/con ngừng, cursor, contract, constraints và DB lỗi |
| `npm run build` | Android/iOS Hermes bundle, web bundle và API TypeScript đạt; chưa phải native binary ký số |
| `npm run test:smoke` | Expo web thật → HTTP → PostgreSQL test; ngành → nhóm → kỹ năng, offline/thử lại, rỗng,390px, không page error hoặc tràn ngang |
| Prototype | 49 model tests, Vite và Storybook build đạt; 52 stories theo index đã xuất |
| iOS/Android native | Chưa chạy: không có simctl/adb/thiết bị kết nối; không dùng web để thay nghiệm thu native |
| Remote CI | Chưa chạy: chỉ chuẩn bị `infra/ci/github-actions.yml`; Template chưa kích hoạt trong `.github/workflows` |

Smoke test dùng schema riêng trên `dvqb_test`, xuất web với URL API test động và xóa schema sau khi thử; không sửa danh mục làm việc. Trên máy này đã dùng Chromium headless có sẵn qua `PLAYWRIGHT_EXECUTABLE_PATH`; có thể bỏ biến sau khi cài browser bằng lệnh trên. Ảnh cùng nguồn kiểm: [ngành](evidence/catalog-root.png), [kỹ năng](evidence/catalog-skills.png), [lỗi](evidence/catalog-error.png), [rỗng](evidence/catalog-empty.png). Các ảnh minh chứng app web ở390px, không là ảnh native.

## Quyết định và tác động tài liệu

IMPLEMENT-01: chủ dự án giao Đợt1 ngày28/09/2026, chưa production/tiền thật. Các lựa chọn kỹ thuật trong quyền được giao ghi ở [ADR-001](ADR-001-foundation.md), không tự coi mọi thiết kế roadmap là đã duyệt.

- F02/F18: cập nhật contract OpenAPI/operations, schema/data-model, QA/RTM/backlog và Markdown/viewer/bản phục vụ/ZIP.
- F18/F20: cập nhật README, trạng thái kiến trúc, DOC-064 con trỏ bàn giao; đăng ký DOC-065/066 và runbook local PLAN-004 (chỉ phần local/CI, deploy/backup production còn thiếu).
- BRD/PRD/FR/NFR/SRS, user/screen/sequence nghiệp vụ, quyền/trạng thái, wireframe/prototype và UI ZIP: không đổi yêu cầu nghiệp vụ, hành vi thiết kế hoặc code prototype; ghi không áp dụng cho sửa nội dung. DOC-065 mô tả lớp triển khai mới, không thay tài liệu gốc.
- PROMO-02 và Q02 giữ nguyên. Chưa hoàn thành B02/nguồn cung hoặc mọi tiêu chí B00 rộng hơn (web/admin/remoteCI).

Trạng thái Drive và kiểm bảo toàn workbook được ghi trong `Dong bo`; chỉ công bố hoàn tất đồng bộ sau đọc lại cùng Drive ID. Kiểm native và kích hoạt CI vẫn còn sau đợt này. Repository đã được chủ dự án chỉ định theo cập nhật bên dưới.

## Bàn giao Git · 28/09/2026

Chủ dự án yêu cầu push lên `https://github.com/anhthaingd/dich-vu-quanh-ban`. Đã tạo Git riêng tại gốc dự án, origin trỏ repo này, giữ nguyên Git cha. Chuyển symlink nội bộ sang tương đối, bảo toàn đích; bỏ qua tools/work local, `.env`, cache, build, Storybook output và báo cáo inspect tạm. Đã quét file dự kiến commit và nội dung ZIP, không phát hiện mẫu credential; `.env.example` chỉ có giá trị local mẫu.

Đã kiểm repo private và trống, đăng nhập `anhthaingd` qua macOS Keychain, push commit nền tảng `1f070655aad0a0487b8d600e84554daa95b5465d` lên `origin/main` thành công. `main` theo dõi `origin/main`; không force-push. Lệnh sandbox trước đó không đọc được Keychain nên báo token invalid; chạy qua quyền truy cập Keychain đã xác minh đăng nhập hoạt động. CI template chưa được kích hoạt; không deployment.


## Khung cấu trúc · STRUCTURE-01 · 28/09/2026

Chủ dự án duyệt log/test phương án A, yêu cầu hoàn thiện khung trước khi tiếp tục chức năng. [DOC-070](project-structure.md) là bản đồ code hiện hành và quy tắc mở rộng.

- Mobile: `index.ts` → `src/app/App.tsx` → `src/features/catalog/{api,models,screens}`. Có màn danh mục thật; các feature khác chỉ giữ chỗ.
- API: `src/main.ts` → `src/bootstrap.ts` → `src/app.module.ts`; `modules/catalog`, `health`, `database`, `common/http`, `config` tách trách nhiệm. Migration/seed SQL và contract HTTP giữ nguyên.
- Backend tests ở `services/api/test/unit` và `test/integration`; mobile tests đặt cạnh feature; smoke ở `tests/e2e/web/catalog.smoke.mjs`. Các lệnh npm phía trên vẫn dùng được.
- Smoke hiện ghi ảnh mới vào `test-results/web/` (Git bỏ qua); `docs/implementation/evidence` là ảnh bàn giao Đợt 1 giữ nguyên, không bị test ghi đè.
- Build helpers ở `scripts/build`; build API xóa output cũ trước biên dịch, giữ migration/seed trong dist đúng đường dẫn runtime.
- Web/admin, shared packages, logger, native E2E và các miền chưa code chỉ có `.gitkeep`. Chưa kích hoạt CI, chưa triển khai bộ log/test A hoặc nghiệp vụ mới.

Kiểm chứng sau tái cấu trúc được ghi trong DOC-070 và sổ quản lý. Các số/bằng chứng prototype trong bảng Đợt 1 là lần kiểm trước; đợt cấu trúc không sửa prototype.


## LOGTEST-01 — phương án A hiện hành

Đã triển khai logger và bộ kiểm trên khung STRUCTURE-01. Xem [DOC-071](logging-testing.md) cho lệnh chạy, xuất log, coverage/report và bằng chứng âm. Header request ID/lỗi500/503 theo OpenAPI0.1.2; native vẫn BLOCKED, workflow quality đã có tại `.github/workflows/quality.yml` nhưng chưa push/chạy GitHub. Các đoạn nói logger/test mới chưa triển khai ở mốc STRUCTURE-01 là lịch sử, được cập nhật bằng mục này. Lệnh `test:smoke` hiện dùng Playwright Test và ghi report/trace khi fail; không dùng smoke script cũ. Số test/bằng chứng mới ở DOC-071, không cộng thành kết quả của Đợt1 ban đầu.
