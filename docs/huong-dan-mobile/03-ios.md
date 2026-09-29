# 03 — Cài Xcode và iOS Simulator trên macOS 27

DOC-075 · v1.1 · 29/09/2026 · NATIVE-B-01 · [Mục lục](README.md).

**Đầu vào:** macOS 27 đã kiểm bằng `sw_vers`. **Đầu ra:** Xcode đầy đủ, simulator booted, CocoaPods có thể chạy. Chưa yêu cầu phát hành App Store hoặc ký app cho iPhone thật.

## 1. Chọn Xcode

Repo dùng Expo SDK 57, yêu cầu Xcode 26.4+ theo [bảng Expo](https://docs.expo.dev/versions/latest/). Cần đồng thời đáp ứng hệ điều hành mà Xcode hỗ trợ: [bảng Apple](https://developer.apple.com/xcode/system-requirements) hiện liệt kê Xcode 27 cho macOS 26.6 trở lên, còn dòng Xcode 26.4.1 giới hạn tới macOS 26.x.

Với máy macOS 27, **ưu tiên Xcode 27 stable** theo bảng hiện tại; không chỉ chọn Xcode cũ vì vượt mức tối thiểu của Expo. Build thành công vẫn phải kiểm thực tế; chưa có bằng chứng native trên máy này.

1. Mở App Store, tìm **Xcode** của Apple.
2. Cài bản stable đáp ứng cặp phiên bản trên. Nếu App Store cung cấp phiên bản khác, đối chiếu lại bảng Apple/Expo trước khi tải.
3. Chờ cài xong và mở Xcode lần đầu.
4. Đọc/chấp nhận license và cài component khi được hỏi.

Không chọn bản beta chỉ để có số phiên bản cao hơn.

## 2. Trỏ command line tới Xcode đầy đủ

Nếu cài đúng `/Applications/Xcode.app`, chạy:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
xcode-select -p
xcodebuild -version
```

Đường dẫn mong đợi: `/Applications/Xcode.app/Contents/Developer`; lệnh version phải hiện phiên bản Xcode thay vì báo cần Xcode đầy đủ. Nếu dùng tên khác, chọn đúng đường dẫn app đã cài, không đổi tên/xóa bản Xcode của dự án khác.

Nếu báo license/first launch chưa hoàn tất, mở Xcode và hoàn thành cửa sổ đó. Chỉ chạy `sudo xcodebuild -runFirstLaunch` khi cần hoàn thành component command line, không dùng để bỏ qua đọc license.

## 3. Tải runtime và tạo simulator

1. Xcode → **Settings → Components** hoặc **Platforms** tùy phiên bản.
2. Tải một iOS Simulator runtime được Xcode đang dùng hỗ trợ.
3. Với **Xcode 27**, nhấn **Command + Space**, tìm **Device Hub**, Enter. Đây là ứng dụng quản lý thiết bị/simulator đi kèm Xcode27; menu Window → Devices and Simulators là hướng dẫn Xcode cũ.
4. Chọn iPhone ở danh sách bên trái trong Device Hub, nhấp đúp để mở. Nếu chưa có, dùng nút thêm thiết bị và chọn tạo simulator với runtime vừa tải.
5. Kiểm tra từ Terminal:

```bash
xcrun simctl list devices booted
```

**Đạt:** thấy màn hình chính iPhone và dòng `(Booted)` trong kết quả lệnh. Đã xác nhận iPhone18 Pro/iOS27.0 trên máy ngày29/09/2026. [Device Hub của Apple](https://developer.apple.com/videos/play/wwdc2026/260/).

## 4. CocoaPods cho native dependencies

Kiểm trước:

```bash
pod --version
```

Nếu chưa có, sau khi Xcode đầy đủ hoạt động:

```bash
brew install cocoapods
pod --version
```

Nếu báo lỗi Ruby hoặc Xcode, giữ nguyên thông báo để chẩn đoán; không chạy `sudo gem update` trên Ruby hệ thống. Expo `run:ios` sẽ phối hợp tạo native project và cài Pods; không cần tự tạo project Swift. [Build local Expo](https://docs.expo.dev/guides/local-app-development/).

## 5. Mốc bàn giao

- [ ] `xcodebuild -version` hiện đúng Xcode đã chọn.
- [ ] Simulator iPhone đã mở, `simctl` thấy Booted.
- [ ] `pod --version` hoạt động.
- [ ] Biết đang dùng simulator; không nhầm với iPhone thật cần cấu hình thiết bị/ký số riêng.

Chuyển sang [04 — Chạy app](04-chay-app.md). Phần B đã thêm `ios.bundleIdentifier` và development client; tiếp theo chạy backend và build/cài app. Công cụ đã cài không đồng nghĩa app đã build thành công.
