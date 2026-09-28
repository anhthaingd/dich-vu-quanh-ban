# DOC-071 — Vận hành log và kiểm thử phương án A

v1.0 · 28/09/2026 · LOGTEST-01. Đã triển khai và kiểm local theo DOC-069. Native còn BLOCKED, workflow GitHub chưa push/run. Không production, tiền thật hoặc telemetry ngoài.

## Chạy bộ kiểm

Từ gốc repo, Node24.7/npm11.5.1, `npm ci`, Docker hoạt động:

```sh
npm run lint
npm run typecheck
npm run test:tooling
docker compose -f infra/compose.yaml --profile test up -d --wait db-test
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:smoke
npm run test:load
```

`npm test`: unit/component; `test:integration`: HTTP/DB/lifecycle. API coverage gồm unit và integration, mobile dùng Jest/RNTL. c8/Jest bao gồm tất cả src và mobile index.ts, kể cả chưa import. Gate kiểm đủ source/report và ngưỡng theo hai nhóm: core logger/sanitizer/HTTP client/cursor/catalog client ≥90% lines/85% branches; source còn lại ≥80/70. Type-only file vẫn phải có entry; không bỏ source khó kiểm. TypeScript source map đã đối chiếu coverage-final.json; nhánh do decorator transpilation vẫn được giữ.

| Output | Nội dung |
|---|---|
| coverage/api, coverage/mobile | HTML, LCOV, JSON, summary |
| test-results/api/junit.xml, mobile/junit.xml | Kết quả Node/Jest |
| test-results/web | HTML/JUnit/JSON; API JSONL; trace/video/screenshot khi fail |
| test-results/web-negative | Bằng chứng cố ý fail, tách khỏi kết quả sản phẩm |
| test-results/performance/catalog.json | 200 request local, concurrency20; không suy ra SLA |

Mỗi integration test/E2E fixture sở hữu schema UUID trên **dvqb_test**, dọn trong finally cả khi setup lỗi một phần. Không truncate DB làm việc. Kiểm migration checksum, rerun, bảo toàn dữ liệu và rollback seed thật. CLI test cũng dùng schema riêng. E2E dùng port động, readiness probe; retries=0, forbidOnly. Lint chặn `.only` trong unit/component.

## Log API

Pino10.3.1 + nestjs-pino5.2.1 + pino-http11.0.0, một LoggingModule. AppLog chuẩn hóa cả framework log. pino-http autoLogging tắt: request middleware sở hữu đúng một terminal event; exception/DB là event riêng cùng ID. Bảng event/severity tại `services/api/src/logging/events.ts`.

Schema: timestamp UTC, level, event, service, environment, version, context, message. Allowlist bổ sung UUID request/client ID, method, route endpoint đã biết hoặc unmatched, status, duration, operation và code cố định. Health thành công DEBUG, HTTP4xx WARN/5xx ERROR, abort INFO, startup failure FATAL. DB đo từng operation, không cộng span chồng lấn.

Server sinh UUID đầu request; header `X-Request-Id` bằng error body `correlation_id`. CORS expose header; `X-Client-Request-Id` UUID hợp lệ chỉ nối diagnostic, không xác thực. Test25 request song song không lẫn ID; client abort chỉ có một terminal event.

Input400/NOT_FOUND404; lỗi lập trình500/INTERNAL, DB unavailable/timeout503/SERVICE_UNAVAILABLE. Không trả/log raw message/SQL/parameters/DSN/body/token/OTP/cookie/auth header/query/điện thoại/địa chỉ/chat/ngân hàng. Serializer cause tối đa3 tầng,6 frame/tầng, chỉ giữ vị trí frame không giữ path/function; số/UUID và kích thước được giới hạn. Record đã kiểm <2KB, canary không xuất hiện.

## Xem và xuất log local

```sh
npm run api                  # JSONL stdout
npm run api:pretty           # trình bày dễ đọc
npm run api:logs             # stdout + .local/logs/api-<pid>.<n>
npm run logs:export -- .local/exports/incident.jsonl
npm run logs:export -- .local/exports/request.jsonl <request-uuid>
npm run logs:export -- .local/exports/period.jsonl <request-uuid> 2026-09-28T00:00:00Z 2026-09-28T23:59:59Z
```

`LOG_LEVEL=debug npm run api` xem health/timing; mặc định info. `LOG_TO_FILE=1` bật local file. pino-roll4.0.0 xoay10MB, giữ2 file cũ +1 active trong process; một record có thể vượt ngưỡng trước xoay. Buffer file64KB, maxWrite2KB; lỗi/drop báo lỗi và đóng app. Directory0700/file0600; tên không lấy từ request, không xóa file process khác. File process cũ dọn thủ công; chưa là retention production.

Export lọc UUID/time, tối đa5MB, trả bytes/records/truncated. File đích phải mới, ngoài thư mục nguồn (kiểm realpath); không overwrite. Chỉ xuất scalar diagnostic an toàn, bỏ message/exception và field lạ; file log gốc giữ error type/code/frame đã sanitize. Không có API tải log, upload hoặc lưu log trong Git.

## Mobile

`src/lib/logging/logger.ts`: buffer200 record, mỗi record<2KB; console ở dev, không Pino/Node transport trong React Native. `diagnostics.exportJsonl()` dùng cho công cụ dev/test, `clear()` xóa buffer. Chưa thêm UI hỗ trợ, lưu lâu dài hoặc telemetry.

`requestJson` dùng expo-crypto57.0.3 tạo UUID, ApiError giữ code/status/serverID/clientID. Timeout10s, cancel khi chuyển/unmount; response/schema/cursor lỗi giữ correlation. Không dùng message server làm UI/log. CancelDEBUG, timeoutWARN, retryINFO; lỗi khácERROR. Jest thay native crypto bằng UUID thực của Node và dùng mock chính thức SafeArea; web E2E chạy browser thật. Chưa chứng minh native runtime.

## Kiểm chứng âm và khả năng chẩn đoán

- Trước sửa, test header rỗng và mobile mất error code/status/ID đã fail; sau sửa pass.
- Đã thêm tạm source TypeScript không import với200 nhánh: c8 thực đưa source vào report và gate fail (core lines48.99%). File canary đã xóa; `coverage/api-negative` giữ report, `/tmp/dvqb-coverage-negative.txt` giữ output. Tooling test còn kiểm thiếu source/report và branch0.
- `VERIFY_FAILURE_ARTIFACTS=1 npm exec -- playwright test --config tests/e2e/web/playwright.config.mjs` chỉ chạy failure-probe. Đã quan sát exit1, JUnit failure, PNG/WebM/traceZIP. Báo cáo riêng web-negative; không tính là lỗi sản phẩm/skip nghiệm thu.

## Native và CI

Có `tests/e2e/native/catalog.yaml` và preflight. Cần Maestro, SDK/emulator hoặc simulator booted, dev binary với API_URL đúng (không Expo Go), APP_ID/APP_BINARY. iOS cần bundleIdentifier thật khi tạo binary. Không tự cài Xcode/Android Studio hay EAS trả phí.

```sh
APP_ID=vn.dichvuquanhban.app APP_BINARY=/path/to/app.apk npm run test:native -- android
# iOS: APP_ID=<bundle-id> APP_BINARY=/path/to/App.app npm run test:native -- ios
```

Thiếu điều kiện → exit2, `test-results/native/preflight.json` BLOCKED. Lần kiểm hiện tại thiếu Maestro, SDK/thiết bị và binary. Flow có chọn ngành/nhóm/kỹ năng, back và background/resume; unit kiểm Android back handler, vẫn cần native kiểm thực tế.

`.github/workflows/quality.yml`: static/mobile, API+PostGIS, webE2E; actions pin SHA, npm/runtime/dependency khóa, artifact upload `always`, retention7 ngày, không deploy. Chưa commit/push đợt này nên **remote CI chưa chạy**. PLAN-004 deploy/backup production chưa hoàn thành. `infra/ci/github-actions.yml` chỉ là template lịch sử, workflow mới là nguồn hiện hành.

## Giới hạn và tài liệu

OpenAPI0.1.2/QA061–066/RTM/backlog/viewer đồng bộ header/lỗi/test; ERD/SQL/seed/nghiệp vụ không đổi. Prototype source/dependency riêng không đổi, số test prototype cũ không được tính là chạy lại đợt này.

`npm audit` báo10 moderate trong chuỗi Expo tooling → xcode → uuid (GHSA-w5hq-g745-h8pq). Không dùng force vì npm đề nghị đổi major Expo không tương thích; logger/test package mới không nằm trong advisory này. Cần rà lại trước phát hành native; chưa là audit bảo mật toàn hệ thống. `expo install --check` đạt sau pin expo-crypto57.0.3.


## Kết quả cuối đợt 28/09/2026

- Lint/typecheck PASS; expo install --check PASS; API và Expo Android/iOS/web bundle build PASS.
- 31 mobile tests, 26 API unit/integration/lifecycle tests, 2 tooling tests, 2 web E2E PASS. Native BLOCKED, remote CI chưa chạy.
- 200 request local/concurrency20:0 lỗi,200 server ID và terminal event duy nhất; pool không còn waiting.
- File output của process API thật có app.started/app.stopped sau SIGTERM, mode0600; rotation/flush/export đều có test.

| Coverage gate | Lines | Branches |
|---|---:|---:|
| api/core | 100.00% | 91.53% |
| api/app | 99.65% | 82.32% |
| mobile/core | 100.00% | 95.70% |
| mobile/app | 96.15% | 96.00% |

Mọi source dự kiến có entry trong report, bao gồm mobile index.ts (entry registration chưa được unit cover, được tính0 và không bị loại khỏi gate). CI actions pin SHA đã đối chiếu upstream ngày28/09/2026; chưa có GitHub run. Gói ZIP hiện hành giữ tên v0.1.1 để tương thích liên kết, nội dung mới ghi rõ LOGTEST-01/OpenAPI0.1.2; snapshot v0.1 lịch sử không sửa.
