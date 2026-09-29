# 01 — Chuẩn bị máy và dùng Terminal

DOC-073 · v1.0 · 29/09/2026 · [Mục lục](README.md).

## 1. Mở Terminal đúng chỗ

Nhấn `Command + Space`, gõ `Terminal`, Enter. Dán từng khối lệnh, chờ hoàn tất rồi mới chạy khối tiếp theo. Không gõ dấu `$` hoặc `%` của dấu nhắc Terminal.

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban
pwd
git status --short
```

`pwd` phải ra đúng đường dẫn dự án. `git status --short` không có dòng nào nghĩa là không có thay đổi chưa commit; nếu có, giữ nguyên, không reset.

Khi cần Terminal thứ hai, bấm `Command + T`. Lệnh chạy server sẽ giữ Terminal bận; đó là bình thường. Dừng đúng server ở tab của nó bằng `Control + C`.

## 2. Kiểm tra máy sau nâng macOS

Các lệnh sau chỉ đọc:

```bash
sw_vers
uname -m
df -h .
node --version
npm --version
brew --version
xcode-select -p
```

| Lệnh | Cần đọc gì? |
|---|---|
| `sw_vers` | Máy hiện đã ghi nhận macOS 27.0 |
| `uname -m` | `arm64`: chọn bộ cài Apple Silicon |
| `df -h .` | Cột Available; dành dung lượng cho SDK, simulator và build cache |
| `node --version` | `v24.7.0` theo `.nvmrc` |
| `npm --version` | `11.5.1` theo `package.json` |
| `xcode-select -p` | Trước cài Xcode đang là `/Library/Developer/CommandLineTools` |

Nếu Node/npm lệch, nhờ Codex kiểm công cụ quản lý Node đang có và chọn phiên bản repo. Không dùng `brew upgrade` toàn bộ máy để xử lý một lỗi phiên bản.

## 3. Kiểm tra Docker

Mở Docker Desktop trong Applications, chờ trạng thái engine chạy. Sau đó:

```bash
docker version
docker compose version
```

`docker version` cần có cả Client và Server. Nếu chỉ có Client hoặc báo không kết nối daemon, Docker chưa sẵn sàng. Sau nâng macOS có thể cần mở lại Docker; không xóa volume DB để sửa lỗi engine.

## 4. Công cụ nào cần cài?

| Chọn nền tảng | Cần cài |
|---|---|
| Android | JDK 17, Android Studio, SDK API 36, Emulator ARM64 |
| iOS | Xcode stable tương thích macOS 27, iOS simulator runtime, CocoaPods cho build local |
| Test native | Maestro; cài sau khi một app native chạy được |
| AI thao tác thiết bị | Mobile MCP; cài sau khi thiết bị ảo đã chạy |

Expo SDK đang khóa trong [package mobile](../../apps/mobile/package.json); xem [bảng hỗ trợ Expo](https://docs.expo.dev/versions/latest/). Hướng dẫn cài công cụ cần Internet để tải dependency. Không cần tạo project Android/Swift mới trong IDE: dự án sản phẩm đã nằm trong repo.

## 5. Mốc hoàn thành

- [ ] Đã mở đúng thư mục repository.
- [ ] Node/npm đúng phiên bản.
- [ ] Docker có Server hoạt động.
- [ ] Đã chọn cài Android, iOS hoặc cả hai.
- [ ] Chưa sửa/xóa dữ liệu hay các thay đổi có sẵn.

Tiếp: [Android](02-android.md) hoặc [iOS](03-ios.md).
