# 05 — Kết nối MCP hỗ trợ phát triển mobile

DOC-077 · v1.2 · 30/09/2026 · MCP-01; EXPO-MCP-01 · [Mục lục](README.md).

**Đầu vào:** thiết bị ảo đã chạy; muốn thử tương tác app thì hoàn thành bài 04. **Đầu ra:** AI thực sự nhìn và thao tác đúng thiết bị; không chỉ có tên MCP trong cấu hình.

## 1. Mobile MCP trước

[Mobile MCP](https://github.com/mobile-next/mobile-mcp) hỗ trợ thiết bị Android/iOS, đọc UI, chụp ảnh, tap, nhập chữ, vuốt và mở app. Công cụ này không thay SDK, simulator, compiler hoặc code ứng dụng.

Trong Terminal kiểm:

```bash
codex mcp list
```

Trên máy dự án đã cài **`@mobilenext/mobile-mcp@1.0.5`** ngày 30/09/2026. Không chạy `add` lần nữa. Kiểm bằng:

```bash
codex mcp get mobile-mcp
```

Cấu hình nằm trong `~/.codex/config.toml`, ngoài repo. Server dùng `/opt/homebrew/bin/npx -y @mobilenext/mobile-mcp@1.0.5`, đã giữ các MCP hiện có và đặt môi trường riêng cho process:

```toml
[mcp_servers.mobile-mcp]
command = "/opt/homebrew/bin/npx"
args = ["-y", "@mobilenext/mobile-mcp@1.0.5"]

[mcp_servers.mobile-mcp.env]
MOBILEMCP_DISABLE_TELEMETRY = "1"
ANDROID_HOME = "/Users/j2866/Library/Android/sdk"
DEVELOPER_DIR = "/Applications/Xcode.app/Contents/Developer"
PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/j2866/Library/Android/sdk/platform-tools:/Users/j2866/Library/Android/sdk/emulator"
```

Đây là cấu hình đã kiểm trên Mac hiện tại. Máy khác phải xác minh lại đường dẫn bằng `command -v npx`, `xcode-select -p` và vị trí Android SDK; không chép nguyên tên người dùng. Khi cài mới, dùng `codex mcp add mobile-mcp --env KEY=VALUE ... -- /duong/dan/npx -y @mobilenext/mobile-mcp@1.0.5`, thay `KEY=VALUE` bằng từng biến đã kiểm ở trên. Không thêm package này vào `apps/mobile/package.json`. [Cấu hình Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

Phiên bản đang dùng điều khiển iOS Simulator qua `mobilecli`; không cần cài `idb` theo các bài cũ. Lần đầu đọc UI gặp `Agent is not installed on the device`: đã dùng binary `mobilecli` đi kèm MCP chạy `agent install --device <UUID>` và kiểm lại thành công. Helper **Device Kit 0.0.27**, bundle ID `com.mobilenext.devicekit-iosUITests.xctrunner`, chỉ cài vào simulator. Nếu xóa/tạo lại simulator, Codex cần xác định lại binary đi kèm phiên bản MCP, xem `agent install --help` rồi cài helper cho đúng UUID; không hardcode đường dẫn npm cache của máy cũ.

## 2. Kiểm kết nối trong phiên Codex

Mở phiên mới hoặc khởi động lại Codex nếu công cụ chưa hiện. Với giao diện dùng cấu hình MCP riêng, kiểm danh sách công cụ của chính phiên đó; cài CLI thành công không đảm bảo mọi ứng dụng AI tự dùng cùng cấu hình.

Nếu chưa build app, kiểm kết nối bằng yêu cầu:

> Dùng Mobile MCP liệt kê thiết bị Android và iOS đang chạy. Với từng thiết bị, đọc UI, chụp màn hình, bấm mở một màn hệ thống an toàn rồi chụp ảnh sau thao tác. Không thay cài đặt. Cuối cùng về Home.

Sau khi hoàn thành bài04 C, kiểm riêng app dự án:

> Dùng Mobile MCP liệt kê thiết bị. Chọn đúng máy ảo Dịch vụ quanh bạn đang chạy, chụp màn hình hiện tại, rồi mở app và chọn Điện nước. Báo lại phần tử đã bấm và ảnh sau thao tác.

Điều kiện đạt:

- Có tool gọi thành công và đúng device ID.
- Ảnh là từ máy ảo đang chạy.
- Tap thật làm màn hình thay đổi; ghi rõ đó là màn hệ thống hay app dự án, không nhầm với thao tác trên web.

Nếu danh sách trống, kiểm `adb devices` hoặc `xcrun simctl list devices booted`. Nếu Terminal thấy thiết bị nhưng MCP không thấy, kiểm PATH của process MCP; app GUI có thể không đọc `.zshrc`. Codex sẽ cấu hình đường dẫn SDK cho MCP sau khi xác minh vị trí cài đặt, không cài thêm server khác để che lỗi PATH.

## 3. Expo MCP — đã kết nối, chỉ dùng tính năng miễn phí

[Expo MCP](https://docs.expo.dev/mcp/) đã thêm vào Codex và đăng nhập OAuth thành công ngày30/09/2026 theo EXPO-MCP-01. Expo CLI đã đăng nhập cùng tài khoản. Trên máy hiện tại không cần chạy lại hai lệnh thiết lập sau:

```bash
codex mcp add expo --url https://mcp.expo.dev/mcp
codex mcp login expo
```

Bỏ qua dòng `add` nếu server đã có. Hoàn thành đăng nhập trên trình duyệt. Kết nối GitHub của bạn không tự thay cho đăng nhập Expo.

Đã cài `expo-mcp@0.2.4` vào devDependencies của `apps/mobile`, khóa version và package-lock. Lệnh cài cho máy mới và kiểm tài khoản:

```bash
cd /Users/j2866/Documents/anhthai/dich-vu-quanh-ban/apps/mobile
npx expo install expo-mcp@0.2.4 --dev
npx expo whoami
```

Nếu chưa đăng nhập CLI, chạy `npx expo login` và dùng cùng tài khoản OAuth. Khởi động Metro cho iOS:

```bash
EXPO_NO_TELEMETRY=1 EXPO_UNSTABLE_MCP_SERVER=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/v1 npx expo start --dev-client --localhost
```

Android emulator dùng URL `http://10.0.2.2:3100/v1`. Kết nối lại MCP khi khởi động/dừng server để làm mới capability. Tính năng local có thể khác nhau giữa nền tảng; xác minh tool được expose trước khi hứa khả năng tự động hóa.

Theo yêu cầu chủ dự án, cấu hình `[mcp_servers.expo]` trong `~/.codex/config.toml` giới hạn tool bằng allowlist:

```toml
[mcp_servers.expo]
url = "https://mcp.expo.dev/mcp"
enabled_tools = ["read_documentation", "learn", "add_library", "expo_router_sitemap", "open_devtools", "collect_app_logs", "automation_tap", "automation_take_screenshot", "automation_find_view"]
```

- `read_documentation`: đọc URL tài liệu cụ thể. `learn`: hướng dẫn chủ đề mà server hỗ trợ. `add_library`: trả lệnh cài và hướng dẫn, không tự sửa package.
- Công cụ local: DevTools, log, ảnh, tap và tìm testID khi Metro/app đáp ứng điều kiện. `expo_router_sitemap` chỉ xuất hiện nếu dự án dùng Expo Router; repo hiện chưa dùng.
- `search_documentation` yêu cầu EAS paid plan và không nằm trong allowlist. Các lệnh build/workflow cloud, submit/publish và ghi phản hồi store cũng không được bật. Không mua gói, không dùng quota cloud thay cho build local.

Allowlist giới hạn công cụ hiện tại, không bảo đảm nhà cung cấp giữ chính sách giá mãi. Nếu công cụ báo cần gói trả phí, dừng công cụ đó và dùng tài liệu web/CLI local, không nâng gói tự động. [Danh sách capability và điều kiện Expo](https://docs.expo.dev/mcp/#available-mcp-capabilities).

Expo MCP là server remote: dữ liệu từ tool local được chuyển qua Expo MCP khi được gọi. Mobile MCP vẫn dùng để thao tác trực tiếp thiết bị local. [Luồng dữ liệu Expo](https://docs.expo.dev/mcp/#data-privacy).

## 4. Sau khi cài

Ghi MCP name/version, nền tảng, tool đã gọi và kết quả trong biên bản bài 06. Cấu hình/tài khoản nằm trên máy, không đưa token vào Git. Chưa cần thêm XcodeBuildMCP vì phần build hiện có thể chạy bằng Expo CLI; chỉ bổ sung nếu gặp nhu cầu debug native cụ thể.

## 5. Kết quả trên máy dự án — 30/09/2026

Đã gọi giao thức MCP stdio bằng chính command/args/env đọc từ cấu hình Codex: initialize thành công, 32 tool được công bố, liệt kê đúng cả hai máy. Đọc UI, chụp ảnh, tap và HOME thành công trên Android/iOS. Chi tiết thao tác và giới hạn ở [biên bản bài06](06-kiem-thu-log.md#9-biên-bản-mcp-01--30092026).

**Việc bạn cần làm:** mở phiên Codex mới. Nếu tool chưa xuất hiện, trong VS Code mở Command Palette (`Cmd+Shift+P`), chạy `Developer: Reload Window` rồi mở lại Codex. Phiên thực hiện cấu hình chưa nạp lại danh sách tool, nên kết quả trên là kiểm giao thức/server thật; việc tool xuất hiện trong phiên IDE mới còn cần xác nhận. Không phải cài lại server.

Tại mốc MCP-01 ban đầu, Expo MCP chưa kết nối. EXPO-MCP-01 tiếp nối trong ngày đã cài và kiểm các công cụ miễn phí theo mục3; bằng chứng ở bài06 mục10. Chưa nghiệm thu luồng ngành/nhóm/kỹ năng native vì chưa build/cài binary sản phẩm.

## 6. Dùng ngay sau khi mở lại Codex

Mở phiên Codex mới để nạp cấu hình Expo và allowlist. Có thể yêu cầu:

> Dùng Expo MCP read_documentation đọc https://docs.expo.dev/develop/development-builds/introduction/ và đối chiếu cách build local với dự án, không chạy build cloud.

> Dùng Expo MCP add_library tra cách dùng expo-dev-client. Chỉ đọc hướng dẫn, không cài lại dependency đã có.

Hai lời gọi trên đã chạy thành công qua MCP client của Codex. Công cụ local đã được expose khi bật Metro, nhưng screenshot/tap/DevTools của app dự án cần hoàn thành bài04 C. Metro dùng để kiểm kết nối đã dừng sau phép thử; chạy lại lệnh ở mục3 khi cần, rồi kết nối lại MCP để cập nhật tool. Không cần đăng nhập lại nếu phiên còn hợp lệ.
