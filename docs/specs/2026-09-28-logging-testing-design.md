# DOC-069 — Thiết kế log và kiểm thử nền tảng

Phiên bản 0.3 · 28/09/2026 · **Phương án A đã được chủ dự án duyệt và triển khai/kiểm local sau khung DOC-070. Runbook/bằng chứng: DOC-071. Native BLOCKED; remote CI chưa chạy.**

Yêu cầu: làm log và test chỉn chu, tham khảo mã nguồn các sản phẩm đã có người dùng thực tế. Phạm vi là app/API danh mục hiện hành và hạ tầng kiểm thử cho các đợt sau. Không triển khai nghiệp vụ mới, production, tiền thật hoặc dịch vụ có phí.

## 1. Baseline khảo sát trước STRUCTURE-01

Baseline Git: `19a09cac15d14540b1e7cca65cacdfaa04d5e2fe`; registry local/Drive v1.31 giống byte trước thay đổi tài liệu.

- Có giao diện React Native tại `apps/mobile/src/CatalogScreen.tsx`, không phải chỉ API. App tải danh mục từ backend, có tải/rỗng/lỗi/thử lại. Chưa có giao diện các miền nghiệp vụ khác trong sản phẩm.
- `services/api/src/app.ts` dùng `logger: false`. Error filter tạo correlation ID khi trả lỗi, không có ngữ cảnh request xuyên suốt để đối chiếu với log.
- Main và DB pool chỉ ghi thông điệp console ngắn. Hiện chưa có log HTTP có cấu trúc, bảng event/severity, redaction có test, đo thời gian hoặc cơ chế xuất log có giới hạn.
- Lỗi ngoài HttpException đều bị trả 503, làm lẫn lỗi lập trình và lỗi dependency. Không lưu được nguyên nhân chẩn đoán tương ứng trong log.
- Integration dùng PostgreSQL/PostGIS thật, schema riêng cho cả suite. Một số test thay trạng thái rồi tự khôi phục ở cuối; assertion thất bại giữa chừng có thể ảnh hưởng test sau.
- Mobile API-client chỉ có một test gộp; thiếu timeout, cancel, response đến muộn, JSON sai, cursor lặp và chẩn đoán lỗi có request ID.
- Smoke dùng Playwright trực tiếp trong một script; port web cố định, chưa có test runner/report/trace khi fail. Script còn ghi screenshot trực tiếp vào `docs/implementation/evidence` mỗi lần chạy.
- CI vẫn là template ở `infra/ci`; chưa có workflow hoạt động trên GitHub.
- Đã chạy lại `npm test`: 4 mobile + 3 API unit PASS; `npm run test:integration`: 8 PostgreSQL integration PASS. Đây là baseline, không phải nghiệm thu thiết kế mới.
- Chưa có `adb` hoặc `simctl` trên máy; kiểm native vẫn bị chặn.

## 2. Nguồn tham khảo đã đọc

Đã đọc trực tiếp source/test/config ở các commit dưới đây. Các ví dụ là bằng chứng về cách dự án tổ chức mã nguồn công khai; không phải phép đo hiệu năng production của họ hoặc bảo đảm tự động cho dự án này. Áp dụng nguyên tắc, không sao chép nguyên hệ thống hay mã nguồn có giấy phép khác.

| Nguồn | Bằng chứng cụ thể | Áp dụng cho dự án |
|---|---|---|
| [Directus logger](https://github.com/directus/directus/blob/1694b19048c8523bc90dd1fd11566b748b155ec4/api/src/logger/index.ts) và [test che query token](https://github.com/directus/directus/blob/1694b19048c8523bc90dd1fd11566b748b155ec4/api/src/logger/redact-query.test.ts) | Pino/pino-http; cấu hình level, định dạng; che authorization/cookie/token trong URL | Logger tập trung; JSON stdout; redaction có test. Với dự án này bỏ query/raw payload khỏi log từ đầu |
| [n8n logger](https://github.com/n8n-io/n8n/blob/62f08a8b2e8e0d5b11ba90273bdcccb1e593dc8d/packages/%40n8n/backend-common/src/logging/logger.ts) và [logger tests](https://github.com/n8n-io/n8n/blob/62f08a8b2e8e0d5b11ba90273bdcccb1e593dc8d/packages/%40n8n/backend-common/src/logging/__tests__/logger.test.ts) | Winston; scope, metadata, JSON/text; test output, level, transport, error cause có vòng lặp | Event có tên ổn định, ngữ cảnh module; kiểm dữ liệu thực sự xuất ra, không chỉ mock lời gọi logger |
| [n8n Playwright config](https://github.com/n8n-io/n8n/blob/62f08a8b2e8e0d5b11ba90273bdcccb1e593dc8d/packages/testing/playwright/playwright.config.ts) | Readiness trước test; fixture môi trường riêng; JUnit/HTML/JSON; trace/video/screenshot; forbidOnly | Test runner chuẩn, fixture độc lập và bằng chứng khi fail. Dự án này không bật reporter SaaS hoặc retry để che flaky |
| [Mattermost Mobile testing guide](https://github.com/mattermost/mattermost-mobile/blob/bc03c18f88581bde36dd82a84321b2ddde40d12c/docs/testing_guide.md), [log wrapper](https://github.com/mattermost/mattermost-mobile/blob/bc03c18f88581bde36dd82a84321b2ddde40d12c/app/utils/log.ts), [log tests](https://github.com/mattermost/mattermost-mobile/blob/bc03c18f88581bde36dd82a84321b2ddde40d12c/app/utils/log.test.ts), [Detox config](https://github.com/mattermost/mattermost-mobile/blob/bc03c18f88581bde36dd82a84321b2ddde40d12c/detox/.detoxrc.json) | Tests theo tầng; logger facade có test; native E2E tách iOS/Android và bản build | Mobile có lớp diagnostic riêng; tách component tests, network tests, web E2E và native E2E. Không coi web PASS là native PASS |

Tài liệu công cụ: [nestjs-pino](https://github.com/iamolegga/nestjs-pino) ghi v5 hỗ trợ Nest 12.0.2+, Pino10/pino-http11, Node22.12+; [Pino redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md); [Node test reporters](https://nodejs.org/docs/latest-v24.x/api/test.html#test-reporters); [c8](https://github.com/bcoe/c8); [Playwright reporters](https://playwright.dev/docs/test-reporters); [Expo native E2E với Maestro](https://docs.expo.dev/eas/workflows/examples/e2e-tests/). Kiểm peer dependencies và pin phiên bản cụ thể trong lockfile khi triển khai; không dùng cờ force để vượt xung đột.

## 3. Các phương án

| Phương án | Được gì | Đánh đổi |
|---|---|---|
| A — Pino/nestjs-pino + bộ test theo tầng, đã duyệt | Request context có sẵn, JSON, redaction; giữ Node test/Jest hiện có, thêm Playwright Test và native flow | Cần cấu hình serializer, severity, lifecycle và kiểm lỗi thực tế; không chỉ cài package |
| B — Winston + cùng bộ test | Có scope/transport linh hoạt như n8n | Phải tích hợp request context và HTTP lifecycle nhiều hơn; chưa có nhu cầu transport đặc thù để chọn B |
| C — A cộng collector/OpenTelemetry, dashboard log và hệ thống crash reporting | Tra cứu tập trung khi chạy nhiều môi trường/dịch vụ | Tăng vận hành, cần quyết định nơi lưu/retention/quyền truy cập/chi phí; đề xuất để sau khi chọn hạ tầng |

Phương án A tập trung vào code có thể kiểm chứng trên local/CI. Thiết kế schema log để bổ sung collector sau mà không thay các call site nghiệp vụ. Không nhận OpenTelemetry trace khi mới có correlation ID.

## 4. Thiết kế log đã duyệt

### API

- Một LoggingModule đăng ký một lần, dùng Pino/nestjs-pino. App bootstrap dùng logger thay cho `logger: false`; log khởi động/thất bại và shutdown cùng schema, có flush trước khi thoát bình thường.
- Schema tối thiểu: `timestamp` UTC, `level`, `event`, `service`, `environment`, `version`, `request_id` nếu thuộc request, `context`, `message`. HTTP thêm `method`, `route` dạng template, `status_code`, `duration_ms`; lỗi thêm mã phân loại ổn định.
- Server tạo UUID request ID ngay đầu request, trả `X-Request-Id` cả thành công/lỗi. Error body `correlation_id` phải bằng ID này. CORS expose header để app web đọc được; không dùng ID làm thông tin xác thực.
- Client có thể gửi `X-Client-Request-Id` UUID để nối lỗi timeout/mất kết nối với request phía server. Validate định dạng/độ dài; dữ liệu này chỉ là metadata không đáng tin, không thay server request ID.
- Request context theo async scope; test song song chứng minh không lẫn ID giữa request. Một event kết thúc cho mỗi request: hoàn tất hoặc client hủy, không log trùng từ filter và middleware. Chi tiết exception nối cùng ID.
- Bảng event/severity có typed API. Ví dụ: `app.started` INFO, `app.start_failed` FATAL, `http.completed` theo status, `http.aborted` INFO, `db.unavailable` ERROR, `db.slow` WARN, `db.migration.completed` INFO. 4xx do input bình thường không báo ERROR; 5xx cần ERROR. Health thành công hạ DEBUG; readiness lỗi vẫn phải hiện.
- Tách lỗi lập trình 500 và dependency unavailable/timeout 503; cập nhật Error contract/test nếu thêm mã lỗi. Client luôn nhận thông điệp an toàn, không stack/SQL/DSN.
- DB log tên operation, duration và mã lỗi được cho phép; không SQL parameters hoặc connection string. Đo từng operation thực tế; không cộng span chồng lấn thành latency request.
- Sanitizer chỉ cho phép metadata đã định nghĩa, che secret theo key là lớp phòng thủ bổ sung. Không log body, cookie/auth header, query nguyên bản, số điện thoại, địa chỉ, token, OTP, payload chat/ngân hàng. Route không match ghi nhãn `unmatched`, không ghi URL tùy ý.
- Error serializer giới hạn độ sâu/cause/kích thước, xử lý vòng lặp. Production dùng tên lỗi/mã/stack frame đã xử lý; không đẩy raw error.message có thể chứa dữ liệu SQL vào output. Diagnostic chi tiết local phải dùng cùng sanitizer.

### Mobile

- Lớp logger riêng, không import Pino/Node transport vào React Native. Ghi event hữu ích: request thất bại, timeout, response invalid, retry và lifecycle của request bị hủy.
- API client giữ server request ID/status/error code trong lỗi có kiểu. Log và báo cáo test đối chiếu được với backend; request bị hủy do đổi màn không báo như lỗi hệ thống.
- Console phát triển và buffer chẩn đoán trong bộ nhớ có giới hạn 200 event, mỗi event tối đa 2 KB sau sanitize. Có hàm xuất JSONL cho công cụ phát triển/test; chưa thêm màn hỗ trợ mới, upload endpoint hay gửi telemetry ra ngoài.
- Không ghi dữ liệu danh mục nguyên khối, user input, secret hoặc full URL. Không lưu buffer vô hạn hoặc tự ghi đè dữ liệu ứng dụng.

### Định dạng và xuất file

- Mặc định API xuất JSONL qua stdout. Local có lệnh xem pretty; JSON vẫn là nguồn để lọc bằng request/event.
- Lệnh dev tùy chọn ghi vào `.local/logs`, xoay file bằng [pino-roll](https://github.com/mcollina/pino-roll): ngưỡng 10 MB/file, `limit.count=2` để giữ 2 file cũ cộng 1 file active mỗi process. Một record có thể làm vượt ngưỡng trước lúc xoay nên phải giới hạn record; test kiểm biên thực tế. Đây là giới hạn phát triển, không phải retention production đã duyệt. Tên file dùng service/process, không lấy từ request; không bật xóa file của process khác.
- Lệnh xuất diagnostic local đọc JSONL đã sanitize, lọc theo request ID hoặc khoảng thời gian, giới hạn 5 MB/export. Không tạo API tải log công khai. Log/test report nằm trong gitignore.
- Test file transport/flush/giới hạn dữ liệu; mất quyền ghi file không được làm API trả thành công giả hoặc treo vô hạn. Nếu khởi động với file output được yêu cầu mà không mở được file, fail rõ ràng ở bootstrap.

## 5. Thiết kế bộ test đã duyệt

Giữ Node test cho backend, Jest + React Native Testing Library cho mobile; không chuyển runner chỉ để giống dự án tham khảo. Backend dùng c8 xuất coverage HTML/LCOV và Node JUnit reporter; mobile dùng Jest coverage và jest-junit. Pin/kiểm tương thích các công cụ với runtime hiện có. Các trường hợp quan trọng có test riêng thay vì nhiều mục dồn vào một tên test.

| Tầng | Ca bắt buộc trong đợt này | Bằng chứng |
|---|---|---|
| Unit API | Parse input/cursor, config, event level, sanitizer, error serializer/circular cause, output size, duration | Output JSON thực, JUnit, coverage |
| Integration HTTP/DB | Migration schema trống, checksum/rerun, rollback seed lỗi, giữ dữ liệu sửa, FK/unique/cycle, active ancestry, shared skill, phân trang, 400/404/500/503, contract và request ID | PostgreSQL/PostGIS thật, fixture riêng cho mỗi test/suite với cleanup trong finally |
| Integration log | Hai request lỗi/thành công đồng thời, ID không lẫn; đúng một log kết thúc; lỗi DB và startup/shutdown; secret canary nằm trong header/query/error không xuất ra | Parse stream JSONL thực, không chỉ spy logger |
| Mobile unit/component | Loading/empty/error/retry; timeout bằng fake timer; cancel khi unmount/đổi nhóm; response cũ không ghi đè mới; malformed JSON/schema; cursor lặp; correlation ID, logging không PII | Jest/RNTL, assertion hành vi và request lifecycle |
| Web E2E | Ngành → nhóm → kỹ năng; offline/retry; danh mục ngừng; API lỗi/khôi phục; 390px; không page error | Playwright Test, API/DB thật, HTML/JUnit/JSON, trace + screenshot/video khi fail |
| Native E2E | Cùng luồng trên bản app Android/iOS, nút back Android, chuyển nền/khôi phục phù hợp luồng hiện có | Maestro theo Expo, app binary/dev build + emulator/simulator; ghi BLOCKED nếu thiếu môi trường |
| Concurrency/smoke tải local | Các request danh mục song song; không mất log, không lẫn context, không cạn connection sau khi kết thúc | Kịch bản tải local có số request/concurrency/dataset cụ thể, thời gian và lỗi; không suy ra SLA production |

Test harness DB tạo schema riêng, seed fixture xác định; không sửa DB làm việc. Test có thể chạy riêng và đổi thứ tự mà không phụ thuộc ca trước. Cleanup phải chạy cả khi setup chỉ thành công một phần; không xóa schema không thuộc run hiện tại.

Chuyển smoke script sang `@playwright/test`: fixture sở hữu API/DB/server/browser, port động hoặc được khóa theo worker, probe readiness và teardown tin cậy. Reports vào `test-results/`, không tự sửa screenshot đã bàn giao trong docs; lệnh xuất bằng chứng tài liệu là thao tác riêng.

Ngưỡng đã duyệt: core logger/sanitizer/cursor/client request lifecycle ≥90% lines và ≥85% branches; phần source API/mobile còn lại ≥80% lines và ≥70% branches. Coverage bao gồm cả source chưa được import vào test; không loại file khó test để đạt số. Contract/secret/concurrency là gate bắt buộc dù coverage cao. Verify sourcemap về TypeScript, không đo nhầm JS sinh ra. Gate phải fail khi không có coverage hoặc thiếu source dự kiến; có kiểm thử âm bằng một nhánh không được chạy để xác nhận công cụ đo thật.

CI không retry tự động để che fail; nếu thêm retry phục vụ chẩn đoán thì kết quả flaky vẫn phải lộ và có issue/owner, không thay bằng PASS sạch. Chặn `.only`; skip native chỉ được báo BLOCKED, không được tính là đã nghiệm thu app native.

## 6. CI và cấu trúc

Sau khung STRUCTURE-01, chuẩn bị `.github/workflows/quality.yml` với các job rõ: lint/typecheck; unit + coverage; HTTP/PostGIS integration; build API/mobile bundles; web E2E. Upload artifact với `if: always()` kể cả test fail, chỉ dùng fixture giả; báo riêng baseline commit và môi trường. Runtime/dependency/action refs được pin và kiểm trước khi dùng. Không có deployment job.

CI từ xa chỉ được báo PASS sau một workflow run thực trên commit đã push. Yêu cầu push trước đã hoàn thành; đợt này chưa tự commit/push mới. Chuẩn bị thay đổi local review được trước, sau đó thực hiện theo quyền giao tiếp theo. Nếu chưa push thì ghi rõ chỉ kiểm các lệnh local.

Native là job/lệnh riêng và có preflight SDK/emulator. Hiện thiếu native tooling; không tự đăng ký EAS Cloud hoặc cài toàn bộ Xcode/Android Studio trong đợt log/test. Có thể viết flow và runbook trước, kết quả vẫn BLOCKED tới khi có thiết bị/môi trường.

```text
services/api/src/
  app.module.ts
  logging/        # module, schema/event, sanitizer, serializers
  common/http/    # request context, exception mapping
  modules/catalog/ # controller, service, query
  health/         # health/readiness
services/api/test/
  unit/
  integration/
  helpers/        # DB fixture, captured log stream, process harness
apps/mobile/src/
  lib/logging/
  lib/http/
  features/catalog/
tests/e2e/web/    # Playwright fixtures/specs
tests/e2e/native/ # Maestro flows và điều kiện chạy
scripts/diagnostics/ # xuất log đã sanitize
```

Khung hiện hành và các miền giữ chỗ được thực hiện riêng theo yêu cầu STRUCTURE-01 tại DOC-070. Chưa chuyển navigation sang Expo Router. Smoke hiện ghi test-results/web; vị trí code baseline ở phần 1 là lịch sử trước tái cấu trúc.

## 7. Tiêu chí nghiệm thu và thứ tự

1. Viết test lỗi/hành vi còn thiếu; chứng minh test thất bại vì đúng nguyên nhân.
2. Triển khai logger, correlation, phân loại lỗi và API/mobile diagnostic; test output thực và leak canary PASS.
3. Cô lập test fixtures, thêm fault/cancel/concurrency và coverage/report gates.
4. Chuyển web smoke sang Playwright Test; chạy app → API → PostGIS thật, giữ bằng chứng khi fail có chủ đích.
5. Chuẩn bị workflow quality và native flows. Chạy mọi kiểm tra local có điều kiện; native/remote chỉ đánh PASS với bằng chứng chạy tương ứng.
6. Rà lại lỗi trùng/mất log, rò metadata, cleanup test, thay đổi contract; bảo toàn prototype. Đồng bộ tài liệu rồi bàn giao code/diff và kết quả thật.

DoD: truy một lỗi từ mobile đến API/DB bằng request ID; tìm được event/status/thời gian; log không chứa canary secret trong mọi output; test failure sinh report và exit code khác 0; chạy lại test không nhiễm dữ liệu; coverage đủ điều kiện; migration/seed bảo toàn dữ liệu; native còn thiếu được ghi đúng; không phát sinh phí hoặc production.

## 8. Ảnh hưởng tài liệu và trạng thái quyết định

- Yêu cầu chất lượng log/test: chủ dự án đã yêu cầu. Lựa chọn A, schema, thresholds và cách native/CI nêu trên: **đã được chủ dự án duyệt ngày 28/09/2026**, đã có kết quả local theo DOC-071; không bao gồm native/remoteCI.
- Đăng ký DOC-069 cho F18/F20; cập nhật Quyet dinh, Dong bo và Danh muc để tìm được thiết kế đã duyệt này.
- Khi triển khai: cập nhật DOC-065, ADR-001 hoặc ADR mới, PLAN-003/004/008, QA JSON/CSV/RTM/backlog, API error/header contract, README và bản viewer/ZIP/Drive bị ảnh hưởng. Tra lại registry/nguồn ở thời điểm đó.
- BRD/PRD/SRS và UI nghiệp vụ chưa đổi vì đây là hạ tầng. Runtime hiện hành theo DOC-065 v1.3 và DOC-070; không sửa các tài liệu đang dùng thành như log mới đã tồn tại.
- LOGTEST-01 đã thêm logger/dependencies/test/report/workflow; nguồn hiện trạng tại DOC-071. Native và remoteCI còn thiếu điều kiện; chưa commit/push mới.


## 9. Bàn giao triển khai LOGTEST-01

[DOC-071](../implementation/logging-testing.md) mô tả triển khai, lệnh và bằng chứng. Phần1 là baseline trước triển khai, không phải hiện trạng. Core coverage đo theo nhóm source và có gate phát hiện source chưa import; không hạ ngưỡng. Error frame giữ vị trí, bỏ path/function; export chỉ giữ scalar diagnostic. Đây là chi tiết triển khai trong yêu cầu sanitizer đã duyệt. Native flow/preflight đã viết nhưng không tính PASS khi thiếu môi trường.
