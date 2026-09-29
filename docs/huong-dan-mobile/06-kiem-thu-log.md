# 06 — Kiểm thử native, đọc log và ghi bằng chứng

DOC-078 · v1.0 · 29/09/2026 · [Mục lục](README.md).

**Đầu vào:** app native đã mở được, API/DB hoạt động, biết app ID và binary vừa build. Nguồn log/test hiện hành: [DOC-071](../implementation/logging-testing.md).

## 1. Cài Maestro

Sau khi Java 17 hoạt động:

```bash
brew tap mobile-dev-inc/tap
brew trust --formula mobile-dev-inc/tap/maestro
brew install mobile-dev-inc/tap/maestro
maestro --version
```

Nếu Homebrew không nhận `trust`, kiểm phiên bản Homebrew và hướng dẫn cài đang dùng, không thay bằng tắt bảo vệ hệ thống. Máy đã quan sát Homebrew 7.0.6 ở lần kiểm trước. [Hướng dẫn Maestro](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).

## 2. Repo đã có gì và còn thiếu gì?

- [Script native](../../scripts/test/native.mjs) kiểm Maestro, APP_ID, APP_BINARY và thiết bị; thiếu điều kiện trả exit code 2 và ghi `test-results/native/preflight.json`.
- [Flow danh mục](../../tests/e2e/native/catalog.yaml) chọn ngành/nhóm/kỹ năng, quay lại, Home và mở lại.
- Script hiện chỉ chọn thiết bị theo mặc định: giữ **một thiết bị mục tiêu** đang chạy/kết nối. Nếu cần nhiều thiết bị, Codex phải bổ sung chọn ID rõ ràng.
- Flow hiện `clearState: true`; development client có thể mở launcher thay vì màn danh mục. Codex phải kiểm và bổ sung khởi động đúng Metro/deep link trước khi nghiệm thu. Không bỏ assertion để làm test xanh.
- `preflight.json` hiện chỉ được ghi ở nhánh thiếu điều kiện; file BLOCKED cũ có thể còn sau lần chạy thành công. Luôn đọc timestamp, exit code và JUnit của lần mới, không dùng riêng file cũ để kết luận.

## 3. Chạy Android sau khi hoàn thiện bước khởi động app

Giữ API, DB, Metro và một emulator chạy. Từ gốc repo:

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban
APP_ID=vn.dichvuquanhban.app \
APP_BINARY="$PWD/apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk" \
npm run test:native -- android
```

Đường dẫn trên dành cho bản debug mặc định. Nếu Gradle xuất chỗ khác, dùng binary vừa build từ log, không trỏ vào APK cũ. Test có bước cài lại và xóa trạng thái app trên máy ảo test.

**Đạt:** process exit 0, JUnit mới tại `test-results/native/junit.xml`, và flow thật qua các màn mong đợi. Exit 1 là lỗi cài/test, exit 2 là thiếu điều kiện. Các bài này chưa chạy test native và không đánh dấu PASS sẵn.

## 4. iOS

APP_BINARY cần là thư mục `.app` **build cho simulator**, không phải `.ipa` hoặc binary iPhone thật. Sau build, Codex xác định đường dẫn output trong build log/Xcode DerivedData, kiểm bundle ID khớp `app.json`, rồi truyền vào cùng script với đối số `ios`.

Không cung cấp một đường dẫn DerivedData cố định vì nó phụ thuộc tên project/build hiện tại. Có thể lấy output đã cài bằng `xcrun simctl get_app_container` để nhận diện app, nhưng không dùng chính thư mục app đang cài làm nguồn cài lại. Lệnh hoàn chỉnh với đường dẫn đã kiểm phải được ghi trong biên bản lần build đầu.

## 5. Checklist nghiệm thu cho mỗi nền tảng

| Ca kiểm | Kết quả cần thấy | Bằng chứng |
|---|---|---|
| Mở app | Danh mục lấy từ API | Ảnh native, request ID |
| Ngành → nhóm → kỹ năng | Danh sách đúng DB local/test | JUnit hoặc thao tác đã quan sát |
| API tắt | Lần tải mới hiện lỗi trong timeout | Ảnh và log lỗi |
| API bật lại, thử lại | Dữ liệu phục hồi | Ảnh sau retry |
| Quay lại | Đúng cấp danh mục | Test Back của Android riêng |
| Home → mở lại | App tiếp tục hoạt động | Flow native |
| UI | Không bị che bởi safe area, chữ dễ đọc | Ảnh iOS/Android |

Trạng thái rỗng cần fixture test riêng, không xóa danh mục DB làm việc. Các flow mới phải có thiết lập và dọn fixture rõ ràng.

## 6. Xem log

Để đọc API log dễ hơn, dừng API đang chạy, từ gốc repo:

```bash
npm run api:pretty
```

Hoặc dùng file JSONL local:

```bash
npm run api:logs
```

Chỉ chọn một lệnh API tại một thời điểm vì đều dùng cổng 3100. File log nằm trong `.local/logs`, bị Git ignore. Khi gặp lỗi, lấy event, thời gian và request ID, đối chiếu HTTP response `X-Request-Id` với log server. Cách xuất/lọc JSONL đầy đủ ở DOC-071; không paste toàn bộ `.env` hoặc raw payload vào báo cáo.

## 7. Kiểm tra hồi quy sau khi sửa code

Từ gốc repo:

```bash
npm run lint
npm run typecheck
npm run test:tooling
docker compose -f infra/compose.yaml --profile test up -d --wait db-test
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:smoke
```

DB test dùng cổng 55433; các integration fixture cô lập schema. Không cần lặp toàn bộ bộ kiểm khi chỉ đọc hướng dẫn/cài IDE. GitHub Actions cần xem run thật sau push: cấu hình tồn tại không có nghĩa job đã PASS.

## 8. Biên bản lần chạy

Lưu báo cáo local trong `test-results/native/` (đã ignore), ghi: ngày giờ; commit; macOS/Xcode hoặc SDK/JDK; device ID/runtime; app ID; binary và thời điểm build; API URL; lệnh; exit code; đường dẫn JUnit/ảnh; ca còn BLOCKED. Android PASS và iOS BLOCKED phải ghi thành hai kết quả riêng.

Chỉ đưa bằng chứng bàn giao chọn lọc vào docs khi đã rà nội dung. [Bài xử lý lỗi](08-xu-ly-loi.md) giúp xác định lỗi thuộc công cụ, app hay backend.
