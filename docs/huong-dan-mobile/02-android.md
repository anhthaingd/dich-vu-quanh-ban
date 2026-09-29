# 02 — Cài Android Studio và tạo máy ảo

DOC-074 · v1.0 · 29/09/2026 · [Mục lục](README.md).

**Đầu vào:** Mac Apple Silicon, Homebrew hoạt động. **Đầu ra:** một máy ảo Android có trạng thái `device` trong `adb devices`. Chưa build app ở bài này.

## 1. Cài Java 17

Trong Terminal:

```bash
brew install --cask zulu@17
/usr/libexec/java_home -V
```

Nếu bộ cài hỏi mật khẩu, nhập trực tiếp tại máy. Terminal thường không hiện ký tự khi nhập mật khẩu.

Mở file cấu hình shell bằng:

```bash
nano ~/.zshrc
```

Thêm các dòng dưới nếu chưa có. Nếu đã có `JAVA_HOME`/`ANDROID_HOME`, chỉnh dòng hiện hữu theo vị trí đã xác minh, không giữ hai khai báo mâu thuẫn:

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Lưu trong nano: `Control + O`, Enter; thoát: `Control + X`. Nạp lại:

```bash
source ~/.zshrc
java -version
```

**Đạt:** Java 17. Nếu đường dẫn Zulu không tồn tại, đối chiếu kết quả `/usr/libexec/java_home -V` trước khi sửa. [JDK cho Expo Android](https://docs.expo.dev/workflow/android-studio-emulator/).

## 2. Cài Android Studio

1. Vào [Android Studio](https://developer.android.com/studio/install).
2. Tải bản stable cho **Mac with Apple chip**.
3. Mở `.dmg`, kéo Android Studio vào Applications.
4. Mở ứng dụng; với máy chưa có cấu hình, bỏ qua import settings.
5. Trong Setup Wizard chọn Standard, đọc và chấp nhận các license cần dùng.
6. Chờ tải SDK xong. Chưa cần bấm New Project.

## 3. Kiểm tra SDK

Ở màn hình Welcome, chọn **More Actions → SDK Manager**. Nếu đã mở project, vào **Settings → Languages & Frameworks → Android SDK**; tên menu có thể thay đổi nhẹ theo IDE.

Ghi lại **Android SDK Location**. Hướng dẫn này dùng `/Users/j2866/Library/Android/sdk`; nếu IDE dùng chỗ khác, sửa `ANDROID_HOME` tương ứng.

Trong SDK Platforms, chọn Android 16 / API 36. Trong SDK Tools, cài:

- Android SDK Platform-Tools.
- Android SDK Build-Tools 36.0.0, bật Show Package Details nếu cần.
- Android Emulator.
- Android SDK Command-line Tools (latest).

NDK/CMake cài đúng phiên bản mà Gradle của project yêu cầu nếu build báo thiếu; không đổi version trong project chỉ để khớp SDK có sẵn. Đây là cấu hình cho repo hiện tại, đối chiếu khi nâng Expo/RN.

## 4. Tạo thiết bị ảo

1. Welcome → **More Actions → Virtual Device Manager**, hoặc mở **Device Manager** trong project.
2. **Create Device** → chọn một mẫu Pixel → Next.
3. Chọn Android 16/API 36, ABI **arm64-v8a**. Tải image nếu chưa có.
4. Đặt tên `DVQB_API_36`, Finish.
5. Bấm nút Play ở dòng thiết bị; chờ đến màn hình chính Android.

Không cần tạo nhiều thiết bị ngay. Đây là cấu hình kiểm nền tảng đầu tiên của dự án. [Quản lý AVD](https://developer.android.com/studio/run/managing-avds).

## 5. Kiểm tra từ Terminal

Mở Terminal mới hoặc nạp lại `.zshrc` rồi chạy:

```bash
adb --version
emulator -list-avds
adb devices
```

Ví dụ kết quả đạt (số hiệu có thể khác):

```text
List of devices attached
emulator-5554 device
```

Nếu `offline`, chờ máy ảo khởi động. Nếu danh sách trống, quay lại Device Manager. Nếu `command not found`, kiểm đường dẫn SDK và PATH; chưa cần cài lại IDE.

## 6. Bàn giao cho Codex

Gửi kết quả `java -version` và `adb devices`, kèm câu:

> Môi trường Android đã sẵn sàng. Kiểm tra lại và thực hiện phần chuẩn bị development build theo docs/huong-dan-mobile/04-chay-app.md.

Tiếp: [chạy app](04-chay-app.md). Khi nghỉ, đóng cửa sổ emulator hoặc dừng thiết bị trong Device Manager; không dùng Wipe Data trừ khi đã xác định cần xóa dữ liệu máy ảo.
