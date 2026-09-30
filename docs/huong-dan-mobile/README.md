# Bắt đầu phát triển app Android và iOS

DOC-072 · v1.3 · 30/09/2026 · MOBILE-GUIDE-01; NATIVE-B-01; MCP-01; EXPO-MCP-01.

Bộ hướng dẫn dành cho chủ dự án Dịch vụ quanh bạn. Mục tiêu là cài công cụ trên Mac, chạy luồng danh mục bằng app native, kiểm tra bằng MCP/Maestro, rồi hoàn thiện khung giao diện trước khi mở rộng nghiệp vụ.

## Bắt đầu ở đâu?

1. Đọc [01 — Kiểm tra máy và cách dùng Terminal](01-chuan-bi-may.md).
2. Làm [02 — Android Studio và máy ảo](02-android.md) hoặc [03 — Xcode và iOS Simulator](03-ios.md). Có thể cài cả hai; chỉ cần mở một máy ảo khi bắt đầu.
3. Khi một thiết bị ảo đã chạy, chuyển sang [04 — Chạy API và development build](04-chay-app.md). Phần chuẩn bị native trong bài này có thay đổi code, được ghi riêng để phối hợp với Codex.
4. Kết nối [05 — MCP](05-mcp.md), sau đó chạy [06 — Kiểm thử và log](06-kiem-thu-log.md).
5. Thực hiện [07 — Kế hoạch hoàn thiện khung app](07-ke-hoach-khung-app.md).
6. Khi gặp lỗi, tra [08 — Xử lý lỗi](08-xu-ly-loi.md).

## Hiện trạng đã kiểm ngày 29–30/09/2026

| Hạng mục | Quan sát trên máy/repo | Việc tiếp theo |
|---|---|---|
| macOS | `27.0`, build `26A428`; Apple Silicon | Không còn bước nâng từ macOS 14.6 |
| Node/npm | Repo khóa Node `24.7.0`, npm `11.5.1` | Kiểm lại bằng bài 01, giữ phiên bản repo |
| Xcode | `27.0 (27A266a)`; iPhone18 Pro/iOS27.0 booted trong Device Hub | Build/cài app ở bài04 C |
| Android Studio/SDK | Emulator API36 ARM64 booted; SDK36 và Build-Tools36.0.0 có trên máy | Build/cài app ở bài04 C |
| Java | Zulu `17.0.20.1` | Đã kiểm |
| Maestro/CocoaPods | CocoaPods `1.17.0`; chưa thấy Maestro trong PATH | Maestro ở bài06 |
| App | Expo `57.0.26`, RN `0.86.3`, dev-client `57.0.19`; app ID hai nền tảng và scheme đã cấu hình | Phần B đã làm; chưa tạo binary |
| Mobile MCP | 1.0.5; đọc UI, ảnh và tap qua MCP đạt trên cả hai máy ngày30/09 | Mở phiên Codex mới để nạp tool; chi tiết bài05/06 |
| Expo MCP | OAuth và CLI đã đăng nhập; expo-mcp0.2.4; đọc tài liệu/tra thư viện qua MCP PASS | Chỉ allowlist miễn phí; UI app chờ build, xem bài05/06 |
| Kiểm native | Có script preflight/flow; chưa có binary và chưa nghiệm thu | Không coi web/bundle build là bằng chứng native |

macOS 27 đã xác nhận bằng lệnh, nhưng **chưa xác nhận native build tương thích thành công**. Expo SDK 57 yêu cầu Xcode 26.4+; trên macOS 27 chọn Xcode stable được Apple liệt kê hỗ trợ hệ điều hành này, ví dụ Xcode 27 trong bảng hiện tại. Không tải lại Xcode 16 theo hướng dẫn cũ. [Expo SDK](https://docs.expo.dev/versions/latest/), [Apple Xcode](https://developer.apple.com/xcode/system-requirements).

## Phân biệt các công cụ

| Công cụ | Vai trò |
|---|---|
| Expo/React Native | Viết và chạy app Android/iOS từ phần lớn code TypeScript dùng chung |
| Metro | Máy chủ gửi JavaScript cho development build, thường ở cổng 8081 |
| Android Emulator/iOS Simulator | Thiết bị ảo để cài và chạy app |
| NestJS API | Backend dự án, cổng local 3100 |
| PostgreSQL/PostGIS | DB trong Docker, cổng local 55432; DB test 55433 |
| Mobile MCP | Cho AI nhìn và thao tác thiết bị đang chạy |
| Maestro | Chạy lại kịch bản kiểm thử native |
| Playwright | Kiểm thử bản web; không thay thế kiểm native |

## Ai làm phần nào?

- **Bạn:** cài ứng dụng qua giao diện, chấp nhận license sau khi đọc, nhập mật khẩu quản trị trên máy, đăng nhập Apple/Expo nếu cần, mở máy ảo và xem UI.
- **Codex:** kiểm tra môi trường, chuẩn bị development build, sửa app/config/test, xử lý lỗi, đối chiếu thiết kế và cập nhật tài liệu.
- **Cùng kiểm:** luồng thật, ảnh màn hình, lỗi và kết quả test trên từng nền tảng.

Đợt tạo hướng dẫn MOBILE-GUIDE-01 được tiếp nối bởi **NATIVE-B-01**: chủ dự án cài công cụ, Codex kiểm hai máy ảo và triển khai phần B. Bài01 giữ mốc kiểm máy ban đầu; trạng thái hiện tại ở bảng trên và bài04. Chưa build/cài app hoặc nghiệm thu native E2E. Các bước tiếp theo giữ giới hạn local/test; không production hoặc tiền thật. Navigation/UI trong bài07 vẫn là kế hoạch.

## Tài liệu liên quan và phiên bản

- [Bản đồ code DOC-070](../implementation/project-structure.md).
- [Log/test đã triển khai DOC-071](../implementation/logging-testing.md).
- [Phạm vi triển khai DOC-064](../handoff/CODEX-IMPLEMENTATION-PROMPT.md).
- [Sổ quản lý](../project-control/So-quan-ly-tai-lieu.xlsx): DOC-072–080 là các bài; DOC-081 là gói xuất.

Nguồn chính là 9 file Markdown trong thư mục này. Gói hiện hành [huong-dan-mobile-v1.3.zip](huong-dan-mobile-v1.3.zip) chứa đúng các file đó; giải nén vào `docs/huong-dan-mobile/` trong repo để các liên kết sang tài liệu khác hoạt động. Gói v1.0, v1.1 và v1.2 là lịch sử đã thay thế. Không có bản HTML/localhost riêng trong đợt này.

Khi sửa nội dung, tăng phiên bản phù hợp, tái tạo ZIP, cập nhật sổ và Drive cùng ID. Không sửa kết quả test cũ thành kết quả của máy sau nâng cấp.
