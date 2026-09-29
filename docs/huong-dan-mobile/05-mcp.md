# 05 — Kết nối MCP hỗ trợ phát triển mobile

DOC-077 · v1.0 · 29/09/2026 · [Mục lục](README.md).

**Đầu vào:** thiết bị ảo đã chạy; muốn thử tương tác app thì hoàn thành bài 04. **Đầu ra:** AI thực sự nhìn và thao tác đúng thiết bị; không chỉ có tên MCP trong cấu hình.

## 1. Mobile MCP trước

[Mobile MCP](https://github.com/mobile-next/mobile-mcp) hỗ trợ thiết bị Android/iOS, đọc UI, chụp ảnh, tap, nhập chữ, vuốt và mở app. Công cụ này không thay SDK, simulator, compiler hoặc code ứng dụng.

Trong Terminal kiểm:

```bash
codex mcp list
```

Nếu đã có `mobile-mcp`, kiểm cấu hình bằng `codex mcp get mobile-mcp` trước; không thêm server trùng. Nếu chưa có, khóa phiên bản được npm trả tại thời điểm cài:

```bash
dvqb_mobile_mcp_version="$(npm view @mobilenext/mobile-mcp version)"
if [ -n "$dvqb_mobile_mcp_version" ]; then
  codex mcp add mobile-mcp -- npx -y "@mobilenext/mobile-mcp@$dvqb_mobile_mcp_version"
fi
codex mcp list
```

Nếu `npm view` thất bại, xử lý mạng/npm trước; không đoán số phiên bản. Ghi version vào biên bản kiểm môi trường. `npx` tải/chạy package này khi khởi động MCP; nó không cần thêm vào `apps/mobile/package.json`.

Lệnh `codex mcp add` thay cấu hình Codex trên máy, thường ở `~/.codex/config.toml`. Giữ các server khác. Cú pháp được kiểm với CLI cài trên máy và [tài liệu Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## 2. Kiểm kết nối trong phiên Codex

Mở phiên mới hoặc khởi động lại Codex nếu công cụ chưa hiện. Với giao diện dùng cấu hình MCP riêng, kiểm danh sách công cụ của chính phiên đó; cài CLI thành công không đảm bảo mọi ứng dụng AI tự dùng cùng cấu hình.

Yêu cầu:

> Dùng Mobile MCP liệt kê thiết bị. Chọn đúng máy ảo Dịch vụ quanh bạn đang chạy, chụp màn hình hiện tại, rồi mở app và chọn Điện nước. Báo lại phần tử đã bấm và ảnh sau thao tác.

Điều kiện đạt:

- Có tool gọi thành công và đúng device ID.
- Ảnh là từ máy ảo đang chạy.
- Tap thật làm app đổi màn; không nhầm thao tác trên web.

Nếu danh sách trống, kiểm `adb devices` hoặc `xcrun simctl list devices booted`. Nếu Terminal thấy thiết bị nhưng MCP không thấy, kiểm PATH của process MCP; app GUI có thể không đọc `.zshrc`. Codex sẽ cấu hình đường dẫn SDK cho MCP sau khi xác minh vị trí cài đặt, không cài thêm server khác để che lỗi PATH.

## 3. Expo MCP — bổ sung khi cần

[Expo MCP](https://docs.expo.dev/mcp/) hỗ trợ tài liệu, dependency, build và một số thao tác local/DevTools. Dùng tài khoản Expo cho OAuth:

```bash
codex mcp add expo --url https://mcp.expo.dev/mcp
codex mcp login expo
```

Bỏ qua dòng `add` nếu server đã có. Hoàn thành đăng nhập trên trình duyệt. Kết nối GitHub của bạn không tự thay cho đăng nhập Expo.

Chỉ khi triển khai thêm tính năng local, Codex sẽ thực hiện trong mobile workspace:

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban/apps/mobile
npx expo install expo-mcp --dev
npx expo whoami
```

Nếu chưa đăng nhập CLI, chạy `npx expo login` và dùng cùng tài khoản OAuth. Khởi động Metro cho iOS:

```bash
EXPO_UNSTABLE_MCP_SERVER=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/v1 npx expo start --dev-client --localhost
```

Android emulator dùng URL `http://10.0.2.2:3100/v1`. Kết nối lại MCP khi khởi động/dừng server để làm mới capability. Tính năng local có thể khác nhau giữa nền tảng; xác minh tool được expose trước khi hứa khả năng tự động hóa.

Expo hiện ghi `search_documentation` cần EAS paid plan. Bộ hướng dẫn không yêu cầu mua EAS, build cloud hoặc gửi bản TestFlight; Mobile MCP và tài liệu web đủ cho chặng local đầu tiên.

## 4. Sau khi cài

Ghi MCP name/version, nền tảng, tool đã gọi và kết quả trong biên bản bài 06. Cấu hình/tài khoản nằm trên máy, không đưa token vào Git. Chưa cần thêm XcodeBuildMCP vì phần build hiện có thể chạy bằng Expo CLI; chỉ bổ sung nếu gặp nhu cầu debug native cụ thể.
