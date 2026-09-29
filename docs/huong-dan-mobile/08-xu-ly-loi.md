# 08 — Xử lý lỗi theo nơi phát sinh

DOC-080 · v1.1 · 29/09/2026 · NATIVE-B-01 · [Mục lục](README.md).

Đọc thông báo lỗi đầu tiên có nguyên nhân cụ thể, ghi lệnh và thư mục đang chạy. Không cài lại toàn bộ máy hoặc xóa dữ liệu trước khi phân loại lỗi.

## 1. Android/Java

| Hiện tượng | Kiểm tra trước | Cách xử lý |
|---|---|---|
| `adb: command not found` | Android SDK Location trong IDE | Sửa ANDROID_HOME/PATH theo bài 02, mở Terminal mới |
| `Unable to locate a Java Runtime` | `/usr/libexec/java_home -V` | Cài JDK 17 và sửa JAVA_HOME |
| Gradle dùng Java khác Terminal | Gradle JDK trong Android Studio | Chọn cùng JDK đã kiểm, ghi version; không sửa Gradle version tùy ý |
| `SDK location not found` | ANDROID_HOME, SDK có thật không | Khởi động CLI từ shell đã nạp môi trường |
| Thiếu SDK/NDK hoặc license | Dòng version cụ thể trong Gradle log | Cài đúng component trong SDK Manager và đọc license |
| `adb devices` trống | Emulator đã tới màn hình chính? | Mở đúng AVD, chờ khởi động |
| Thiết bị `offline` | Trạng thái AVD | Dừng/mở lại đúng AVD hoặc Cold Boot; chưa Wipe Data |
| Nhiều thiết bị | `adb devices` | Chọn đúng ID khi chạy lệnh; script native hiện yêu cầu chỉ một mục tiêu |

Android system image trên Apple Silicon chọn ARM64. Nếu IDE và CLI khác nhau, xác minh đường dẫn executable trước khi đổi cấu hình.

## 2. Xcode/iOS

| Hiện tượng | Kiểm tra trước | Cách xử lý |
|---|---|---|
| `xcodebuild requires Xcode` | `xcode-select -p` | Cài Xcode đầy đủ, chọn Developer directory theo bài 03 |
| Không tìm thấy `simctl` | Xcode đầy đủ đã active? | Hoàn thành first launch và kiểm lại path |
| Không có menu Devices and Simulators ở Xcode27 | Phiên bản Xcode | Mở Device Hub bằng Command+Space; chọn iPhone theo bài03 |
| Không có simulator | `xcrun simctl list devices available` | Tải runtime và tạo iPhone simulator |
| Xcode không mở trên macOS 27 | Bảng hỗ trợ Apple của phiên bản đã tải | Chọn bản stable hỗ trợ macOS 27; không hạ Expo ngay |
| Lỗi CocoaPods | `pod --version`, dòng lỗi Pods đầu tiên | Kiểm toolchain/dependency cụ thể; giữ lockfile |
| Báo signing/team | Có chọn iPhone thật thay simulator? | Chọn simulator cho chặng đầu; cấu hình thiết bị thật là nhánh riêng |

`prebuild --clean` có thể tạo lại native project; không dùng khi chưa kiểm thay đổi native thủ công. Không xóa toàn bộ DerivedData hoặc Pods của các dự án khác.

## 3. App mở được nhưng không tải danh mục

Kiểm từ backend ra app:

```bash
curl --fail --show-error http://127.0.0.1:3100/v1/ready
```

- Không kết nối: API chưa chạy hoặc sai cổng.
- HTTP 503: kiểm DB, migration, seed.
- HTTP 200 trên Mac nhưng app lỗi: kiểm URL trong Metro, thiết bị và chính sách HTTP của debug build.
- Android emulator cần `10.0.2.2`; iOS simulator dùng `127.0.0.1`. Luôn có `/v1`.
- Đổi `EXPO_PUBLIC_API_URL` rồi khởi động lại Metro/reload; không xem `.env` đã sửa là bằng chứng app đã dùng giá trị mới.
- Nếu log nói cleartext/ATS, kiểm đúng Debug build và chạy `npm run test:native-config` sau prebuild. Plugin phần B chỉ cho HTTP trong Debug; Release phải dùng HTTPS. Không tắt bảo vệ mạng toàn app phát hành.

Điện thoại thật cần cách nối mạng riêng ở bài 04. Expo tunnel chỉ cho Metro không thay URL API.

## 4. Cổng đã bị dùng hoặc Docker không chạy

```bash
lsof -nP -iTCP:3100 -sTCP:LISTEN
lsof -nP -iTCP:8081 -sTCP:LISTEN
docker compose -f infra/compose.yaml ps
```

Lệnh Docker chạy tại gốc repo. Xác định PID/tên chương trình trước; dừng server bằng `Control + C` tại tab đã mở. Không `killall node`, vì có thể dừng dự án khác. Không tự đổi cổng một phía mà quên URL phía còn lại.

Docker chỉ có Client: mở Docker Desktop và chờ engine. DB readiness lỗi sau nâng máy không có nghĩa dữ liệu hỏng; không xóa volume `catalog-data`.

## 5. Development client/Metro/Maestro

| Hiện tượng | Hướng xử lý |
|---|---|
| App ở màn chọn development server | Kiểm Metro đang chạy, đúng URL; mở server trước khi thử danh mục |
| Native module không tìm thấy | Kiểm đã rebuild binary sau thêm native dependency, không chỉ restart Metro |
| Metro báo lỗi cache sau đổi cấu hình | Dừng đúng Metro rồi dùng `npx expo start --dev-client --clear` cùng API URL/host phù hợp |
| Maestro timeout chờ Điện nước | Chụp màn hình: launcher, loading, error hay danh mục? Sửa nguyên nhân, không chỉ tăng timeout |
| Preflight BLOCKED | Đọc từng mục thiếu; cài đủ tool/device/binary rồi chạy lại |
| Preflight.json vẫn BLOCKED dù test mới đạt | File có thể từ lần cũ; xem timestamp, exit code và JUnit mới theo bài 06 |
| MCP không thấy thiết bị nhưng Terminal thấy | Kiểm PATH và môi trường MCP GUI, mở lại phiên sau cấu hình |
| `codex: command not found` | `command -v codex`; trên máy này đã thấy `~/.local/bin/codex`, kiểm PATH trước khi cài lại |

## 6. Thông tin gửi để được hỗ trợ

Gửi nội dung ngắn gồm:

1. Bạn đang ở bài/bước nào, Android hay iOS.
2. Lệnh vừa chạy và kết quả `pwd`.
3. Thông báo lỗi đầu tiên cùng khoảng 20 dòng xung quanh.
4. `sw_vers`, `node --version`; thêm `java -version`/`adb devices` hoặc `xcodebuild -version`/`simctl` tùy nền tảng.
5. App đang ở launcher, loading, màn lỗi hay danh mục; request ID nếu có.

Không gửi mật khẩu, access token, toàn bộ `.env` hay dữ liệu tài khoản thật. Những hướng sửa trong bài này là nhánh chẩn đoán; chỉ áp dụng nhánh khớp lỗi đang có.
