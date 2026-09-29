# 04 — Chạy API và app native

DOC-076 · v1.1 · 29/09/2026 · NATIVE-B-01 · [Mục lục](README.md).

**Điều kiện:** hoàn thành bài 01 và có Android emulator hoặc iOS simulator đang chạy. **Phần B đã triển khai và kiểm cấu hình** theo NATIVE-B-01. Chưa build/cài binary hoặc nghiệm thu luồng app native; tiếp tục phần A rồi C trên từng nền tảng.

## A. Chạy backend hiện có

### Terminal A — DB và API

Mở Docker Desktop, sau đó:

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban
node --version
npm --version
npm ci
```

Node cần `v24.7.0`, npm `11.5.1`. `npm ci` cài đúng lockfile; không thay bằng cập nhật dependency hàng loạt. Chỉ chạy lại khi mới clone hoặc dependency thay đổi.

Tạo cấu hình local nếu chưa có; lệnh này giữ nguyên file đã tồn tại:

```bash
test -f services/api/.env || cp services/api/.env.example services/api/.env
test -f apps/mobile/.env || cp apps/mobile/.env.example apps/mobile/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run api
```

API phải chạy và giữ Terminal A bận. DB làm việc là `dvqb_local` ở cổng 55432; không đổi sang DB test. Nếu log báo cổng 3100 đã dùng, tra bài 08 để xác định process, không chạy thêm API thứ hai.

### Terminal B — kiểm API

```bash
curl --fail --show-error http://127.0.0.1:3100/v1/ready
```

**Đạt:** `{"status":"ready"}`. Nếu trả 503, kiểm Docker/migration/seed trước khi sửa mobile.

## B. Chuẩn bị development build — đã thực hiện

- Đã kiểm sổ v1.36 local/Drive và bảo toàn thay đổi PATH-01. Bản Drive có 5 ô điều hướng khác local; giữ các ô từ Drive khi cập nhật sổ.
- Đã cài `expo-dev-client` bằng Expo CLI, khóa `57.0.19`. Expo được nâng bản vá `57.0.25` → `57.0.26` theo kiểm tương thích; React Native giữ `0.86.3`. Lockfile là nguồn cài lại bằng `npm ci`.
- App ID local trên cả hai nền tảng: `vn.dichvuquanhban.app`. Scheme app `dvqb`; development client còn đăng ký `exp+dich-vu-quanh-ban`. Chưa đăng ký app trên store.
- Chọn Expo CNG: [app.json](../../apps/mobile/app.json) và [plugin HTTP debug](../../apps/mobile/plugins/with-debug-http.cjs) là nguồn. `apps/mobile/android/` và `ios/` được sinh, bỏ khỏi Git/lint; không sửa tay trong đó. Đã chạy prebuild `--no-install`, chưa cài Pods/Gradle dependencies của app.
- Android: main manifest chặn cleartext; manifest debug ghi đè cho Metro/API local. iOS: Xcode Debug dùng `Info-Debug.plist` cho phép HTTP; Release dùng `Info.plist` với ATS chặn HTTP. Hai cấu hình cùng ID/scheme và các thuộc tính còn lại. Không phụ thuộc biến môi trường để phân biệt debug/release.

Kiểm lại từ gốc repo sau thay đổi native config/dependency:

```bash
npm run mobile:prebuild
npm run test:native-config
```

Lệnh prebuild sinh/cập nhật project, không tạo APK hay `.app`. Không dùng `prebuild --clean` làm cách sửa lỗi mặc định; kiểm thay đổi native trước khi tái sinh. Bài kiểm đọc plist, Xcode project và manifests đã sinh, chưa thay thế kiểm binary sau build. [Development build](https://docs.expo.dev/develop/development-builds/introduction/), [CNG](https://docs.expo.dev/workflow/continuous-native-generation/).

### Bằng chứng kiểm ngày 29/09/2026

| Hạng mục | Kết quả |
|---|---|
| Node / npm / Java | `24.7.0` / `11.5.1` / Zulu `17.0.20.1` |
| Android | `emulator-5554`, AVD `DVQB_API_36`, API `36`, `arm64-v8a`, `sys.boot_completed=1`; SDK36 và Build-Tools36.0.0 có trên máy |
| iOS | Xcode `27.0 (27A266a)`, CocoaPods `1.17.0`; iPhone18 Pro / iOS27.0 `Booted`, bootstatus đạt |
| Ảnh môi trường | Đã lấy và xem screenshot từ adb/simctl; chỉ là màn hình Home của OS, chưa phải app dự án |
| CNG / HTTP policy | Prebuild hai nền tảng và `test:native-config` đạt; kiểm lại sau tái sinh |
| Dependency / hồi quy | Expo dependency check, lint, typecheck, 31 test mobile và export bundle Android/iOS/web đạt |
| Còn thiếu | Chưa build binary/cài app, chưa thử API từ app native, chưa có Maestro trong PATH; phần C/E và bài06 còn chờ |

### Lệnh và nơi xuất binary

Các script chạy từ gốc repo đặt URL rõ ràng, ưu tiên hơn `.env`: Android `http://10.0.2.2:3100/v1`, iOS `http://127.0.0.1:3100/v1`. Chạy Metro theo từng nền tảng; dừng Metro cũ bằng Control+C trước khi đổi.

| Mục đích | Lệnh |
|---|---|
| Build/cài Android debug | `npm run mobile:android` |
| Build/cài iOS debug | `npm run mobile:ios` |
| Chỉ chạy Metro Android sau khi đã có binary | `npm run mobile:start:android` |
| Chỉ chạy Metro iOS sau khi đã có binary | `npm run mobile:start:ios` |

Android dự kiến xuất `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Tên product iOS đã sinh là `Dchvquanhbn`; binary simulator dự kiến `Build/Products/Debug-iphonesimulator/Dchvquanhbn.app` trong DerivedData mà lần build sử dụng. **Chưa có binary ở đợt B**: lấy đường dẫn tuyệt đối từ log build phần C trước khi truyền `APP_BINARY`; không suy đoán thư mục DerivedData hoặc dùng binary cũ. Script nhận thêm tham số sau `--`, ví dụ chọn Android `npm run mobile:android -- emulator-5554`.

## C. Build lần đầu trên một nền tảng

Giữ Terminal A chạy API. Trong Terminal B:

### Android

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban/apps/mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:3100/v1 npx expo run:android --device
```

Chọn emulator đã tạo ở bài 02 khi CLI hỏi. Chờ Gradle tải dependency/build/cài app, sau đó Metro chạy. Nếu không tự mở app, mở icon Dịch vụ quanh bạn trên emulator và chọn development server.

### iOS

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban/apps/mobile
EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/v1 npx expo run:ios --device
```

Chọn **simulator**, không chọn iPhone thật. Chờ Pods/build/cài app. Các lệnh `run:*` vừa build native, vừa cài và khởi động Metro; lần đầu lâu hơn lần sau. [Expo local build](https://docs.expo.dev/guides/local-app-development/).

## D. Những lần chạy tiếp theo

Nếu chỉ sửa TypeScript/giao diện và binary vẫn còn cài trên máy ảo, dùng Metro:

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban/apps/mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:3100/v1 npx expo start --dev-client --localhost
```

Đây là lệnh cho Android emulator. Nhấn `a` để mở Android. Với iOS, dừng Metro bằng `Control + C`, chạy lại cùng lệnh nhưng đổi URL thành `http://127.0.0.1:3100/v1`, rồi nhấn `i`.

**Chạy lần lượt hai nền tảng** để tránh một Metro dùng sai URL cho nền tảng còn lại. Khi đổi native dependency hoặc cấu hình native, build lại bằng `run:android`/`run:ios`. `npm run build` của repo xuất bundle; không tạo APK/IPA cài được.

## E. Kiểm luồng app

1. Mở danh mục, chọn **Điện nước → Dịch vụ điện nước**.
2. Thấy kỹ năng **Sửa điện dân dụng** từ seed local.
3. Quay lại bằng nút app; Android kiểm thêm nút Back của hệ điều hành.
4. Dừng API ở Terminal A. Tạo lần tải mới bằng đổi lựa chọn hoặc mở lại màn; danh sách đã tải không tự mất ngay khi API dừng.
5. Chờ timeout tối đa khoảng 10 giây, thấy thông báo lỗi/thử lại.
6. Chạy lại `npm run api`, bấm Thử lại và thấy dữ liệu.

Nếu DB local đã được người dùng chỉnh khác seed, đối chiếu dữ liệu thay vì reset DB để làm khớp ví dụ.

## F. Điện thoại thật — nhánh sau máy ảo

`127.0.0.1` trên điện thoại là chính điện thoại, không phải Mac. Với kết nối Wi-Fi, cần cùng mạng, API `HOST=0.0.0.0`, Metro dùng `--lan`, và `EXPO_PUBLIC_API_URL` trỏ IP LAN thật của Mac. Không dùng script hiện có `npm run mobile` vì script đang ép `--localhost`.

Nhờ Codex cấu hình theo thiết bị cụ thể; Android USB có thể dùng `adb reverse`, iPhone thật có thêm yêu cầu signing/trust. Expo tunnel cho Metro không tự làm API cổng 3100 truy cập được. Không mở cổng router hoặc deploy API công khai để thử local.

Kết thúc buổi: dừng API/Metro ở đúng tab, rồi từ thư mục gốc chạy `npm run db:stop` nếu không dùng DB nữa. Lệnh này giữ dữ liệu; không dùng `docker compose down -v`.
