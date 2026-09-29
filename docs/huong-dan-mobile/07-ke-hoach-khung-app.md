# 07 — Kế hoạch hoàn thiện khung app trước nghiệp vụ

DOC-079 · v1.1 · 29/09/2026 · NATIVE-B-01 · [Mục lục](README.md).

Đây là kế hoạch tiếp theo sau môi trường native, không phải danh sách phần đã code. Yêu cầu tạo hướng dẫn chưa tự kích hoạt toàn bộ roadmap sản phẩm.

## Chặng 1 — Development build có thể dựng lại

**Cập nhật NATIVE-B-01:** bước 1–2 đã làm; hai máy ảo/công cụ và cấu hình sinh từ CNG đã kiểm. Bước 3–4 (binary, app/API thực tế, Maestro) còn chờ. Chưa hoàn tất chặng 1.

**Đầu vào:** một simulator/emulator đã mở. **Files:** `apps/mobile/app.json`, `apps/mobile/package.json`, `package-lock.json`, `.gitignore`, scripts chạy app và runbook.

1. Kiểm sổ quản lý local/Drive và hiện trạng Git; bảo toàn thay đổi.
2. Thực hiện nhóm B trong [bài 04](04-chay-app.md).
3. Build/cài app trên từng nền tảng, kiểm API → DB và ghi binary output.
4. Hoàn thiện bootstrap Maestro, ghi test lỗi/khôi phục mà không phá DB làm việc.

**Đạt:** người khác có thể làm lại từ lockfile; native và web có bằng chứng riêng. Nếu chỉ Android đạt thì vẫn có thể chuẩn bị code chung, nhưng chưa báo hoàn tất chặng hai nền tảng.

## Chặng 2 — Theme và UI React Native dùng chung

**Nguồn:** [design system](../../ui-ux/specs/design-system.md), [phạm vi UX](../../ui-ux/specs/ux-scope-current.md), [review luồng](../../ui-ux/specs/flow-review.md).

| Vị trí dự kiến | Công việc | Kiểm tra |
|---|---|---|
| `src/theme/` | Màu cobalt, typography, spacing, radius theo thiết kế | Màn danh mục dùng cùng token, không nhân bản màu |
| `src/components/ui/` | Button, Text, Input, Card, Loading, Empty, Error/Retry | Vai trò accessibility, disabled/loading, text dài |
| `src/features/catalog/screens/` | Refactor màn danh mục dùng UI chung | Hành vi tải/rỗng/lỗi/retry hiện có giữ đúng |

Viết test hành vi cần bảo toàn trước khi refactor: nút disabled không gọi callback, loading không gửi lặp, retry tải lại, hủy request khi rời màn. Không thêm snapshot lớn chỉ để tăng số test. Kiểm ảnh trên hai thiết bị với safe area và cỡ chữ hệ thống.

`packages/design-tokens` chỉ trở thành workspace chạy thật khi có nhu cầu chia sẻ và đủ cấu hình build/typecheck. Không tạo package giả chỉ để di chuyển vài biến.

## Chặng 3 — Navigation và providers

**Vị trí:** `apps/mobile/src/app/navigation/`, `src/app/providers/`, `src/app/App.tsx`.

1. Đối chiếu luồng đã duyệt để xác định stack/tab và tuyến màn hình.
2. Chọn thư viện navigation phù hợp Expo đã khóa, ghi ADR và lý do. Chưa quyết định dùng Expo Router chỉ vì folder đang tên `src/app`.
3. Kiểu hóa route params, nối màn danh mục và xử lý quay lại.
4. Test vào/ra màn, Back Android, quay lại iOS và request đang tải khi đổi màn.
5. Chỉ thêm provider có consumer thật; trạng thái session/auth được bổ sung cùng chức năng xác thực sau này.

**Đạt:** mở một màn mới không phải tự tạo lại theme, loading/error, safe area và logic điều hướng. Màn sản phẩm không có nút chọn vai trò mẫu hoặc OTP giả từ prototype.

## Chặng 4 — Chọn một luồng nghiệp vụ hoàn chỉnh

Đọc [handoff](../handoff/CODEX-IMPLEMENTATION-PROMPT.md) và backlog hiện hành để chốt phạm vi từng đợt. Thứ tự tham khảo: tài khoản/quyền, hồ sơ partner, tìm/thuê, doanh nghiệp/phân công, chat/lịch, hóa đơn, ví/point thử nghiệm, hỗ trợ/admin.

Mỗi đợt gồm contract → dữ liệu/migration → API → màn mobile → unit/integration/native → tài liệu. Với nhà cung cấp OTP/bản đồ/chat/ngân hàng, xác định cấu hình và chi phí trước khi tích hợp; không lấy hành vi mock làm yêu cầu đã duyệt.

Chưa production, tiền thật, banner/quảng cáo/voucher. Các quyết định pending không trở thành chức năng triển khai chỉ vì đã có folder.

## Mốc review và phân công

| Mốc | Codex chuẩn bị | Bạn kiểm |
|---|---|---|
| M1 — Android | Binary, luồng danh mục, log và test | Mở và thao tác trên emulator |
| M2 — iOS | Cùng luồng trên simulator | Safe area, thao tác và lỗi |
| M3 — UI chung | Component/theme và màn danh mục refactor | Đối chiếu thiết kế đã duyệt |
| M4 — Navigation | Luồng điều hướng và test | Cách đi/về giữa màn |
| M5 — Bàn giao nền tảng | Kết quả kiểm, giới hạn, tài liệu | Xác định luồng nghiệp vụ tiếp theo |

Sau mỗi nhóm đã làm, cập nhật DOC-064/065/070/071 và nguồn thật bị ảnh hưởng, bản xuất, Drive và sổ. Native chưa chạy vẫn ghi BLOCKED. Commit/push gắn với yêu cầu giao việc tương ứng; tài liệu này không phải lệnh tự deploy.
