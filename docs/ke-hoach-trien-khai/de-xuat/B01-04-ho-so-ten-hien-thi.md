# B01-04 — Lát hồ sơ: sửa tên hiển thị

06/10/2026 · DELIVERY-01 · **Đề xuất phần bổ sung contract, chưa duyệt/chưa implement.** Nối sau danh mục `1c80f67`. OTP vẫn Pending. Tài liệu chỉ lưu trong repo.

## Thao tác muốn bàn giao

Đăng nhập → Tài khoản → Sửa tên hiển thị → Lưu. Tên mới được lưu DB, cập nhật ngay trên tài khoản/avatar, mở lại app vẫn giữ. Đổi tiếng giao diện không làm mất tên đang nhập.

Đây là lát nhỏ của B01-04; chưa đóng hồ sơ/phiên/địa chỉ đầy đủ. Không cần OTP, upload ảnh hoặc dịch vụ trả phí. Không sửa ngôn ngữ tài khoản (I18N-03 chưa chốt), email, mật khẩu hay trạng thái xác minh.

## Điểm thiếu đã xác nhận trong contract hiện hành

- `PATCH /me` đã được thiết kế, dùng body `ProfileEdit`, bắt buộc `expected_version` và header `Idempotency-Key`.
- `users.version` đã có trong DB; mặc định 1.
- Schema `Me` không có trường `version` và cấm trường ngoài (`additionalProperties: false`). Code `GET /me` cũng chưa trả version.
- Vì vậy app chưa thể biết phiên bản thật để sửa hồ sơ. Không lấy số 1 cố định hoặc tự đoán từ phiên đăng nhập.

`version` là số tăng sau mỗi lần sửa. Ví dụ hai thiết bị cùng đọc phiên bản 3: thiết bị thứ nhất lưu thành 4; thiết bị thứ hai gửi phiên bản 3 sẽ được báo dữ liệu đã đổi, tránh ghi đè nhầm.

## Bổ sung cần duyệt

**Thêm `version: integer, minimum: 1` vào các trường bắt buộc của `Me`.** Áp dụng nhất quán cho `GET /me`, kết quả `PATCH /me` và `Session.user` từ đăng ký/đăng nhập/refresh vì cùng tham chiếu schema Me. Không đổi đường dẫn hoặc tạo API mới.

Ví dụ phần dữ liệu liên quan:

```json
{"display_name":"An","version":3}
```

App gửi `PATCH /me` với `Idempotency-Key` là UUID và body:

```json
{"expected_version":3,"display_name":"Anh An"}
```

Thành công trả `Me` với `display_name = "Anh An"`, `version = 4`. Ví dụ trên chỉ trích các trường liên quan; response thật vẫn có đủ các trường Me hiện hành.

## Phần triển khai theo spec đã có sau khi duyệt

1. API kiểm phiên đang hoạt động và chỉ sửa chính tài khoản đó; không nhận user ID từ client. Tên được trim, không rỗng và dùng giới hạn 100 ký tự như đăng ký hiện tại.
2. Khóa bản ghi user trong giao dịch, kiểm `expected_version`, cập nhật tên và tăng version. Phiên bị thu hồi/tài khoản bị khóa phải bị từ chối; không chỉ dựa vào nút trên app.
3. Dùng `idempotency_keys` theo mô hình dữ liệu hiện hành: cùng actor + operation + key + payload không sửa lần hai; cùng key khác payload trả 409. Lưu cùng giao dịch với thay đổi tên; không đặt TTL/xóa key mới khi retention chưa chốt.
4. Khi timeout, app giữ cùng key/payload để thử lại. Khi version conflict, giữ tên đang nhập và cho tải lại hồ sơ hiện tại trước khi lưu lại; không tự ghi đè.
5. App có màn sửa tên, tải/lỗi/thử lại, thông báo thành công và lỗi VI/EN/JA. Trạng thái lưu mã lỗi, không giữ câu đã dịch.
6. Viết test DB/API: quyền chính mình, input sai, phiên thu hồi, sửa cạnh tranh, retry cùng key, key khác payload, rollback. Test app: lưu, lỗi/retry, mất phiên, đổi tiếng, không mất bản nháp. Kiểm web và native cả Android/iOS.
7. Báo cáo học code riêng; checklist ghi B01-04 một phần. Phần phiên và địa chỉ nối trong lát sau.

## File dự kiến

| Phần | Vị trí |
|---|---|
| Nguồn contract sau duyệt | `docs/technical-design/openapi.json`, các nguồn/mirror liên quan theo sổ quản lý |
| Trả version thật | `services/api/src/modules/auth/auth.service.ts`; model/validator auth trên app |
| Sửa hồ sơ | `services/api/src/modules/accounts/` theo cấu trúc module hiện hành |
| Giao tiếp và lỗi | `services/api/src/bootstrap.ts`: cho PATCH/Idempotency-Key qua CORS; HTTP exception filter và HTTP client app phân biệt VERSION_CONFLICT/IDEMPOTENCY_MISMATCH qua mã lỗi cho phép |
| Lưu kết quả chống gửi lặp | Migration mới cho `idempotency_keys` theo data design, không sửa migration cũ |
| App | `apps/mobile/src/features/accounts/`, nối route thật từ Tài khoản |
| Test/báo cáo | Test cạnh source, API integration, web/native và `bao-cao/B01-04-ho-so-ten-hien-thi.md` |

`AuthSession` hiện giữ token riêng và tuần tự hóa đăng nhập/refresh/logout. Phần sửa hồ sơ cần đi qua cơ chế xác thực đó, cập nhật tên trong snapshot cho header, không đưa access token vào React state hay tạo đường refresh cạnh tranh thứ hai. Tên bản nháp nằm ở feature hồ sơ; phản hồi cũ sau logout/đổi tài khoản không được cập nhật user mới.

## Vì sao cần chốt phần bổ sung này?

[AGENTS.md](../../../AGENTS.md) yêu cầu: “Nếu cần thay đổi spec chưa được duyệt, trao đổi với chủ dự án trước; không tự biến phương án triển khai thành yêu cầu đã chốt.” Thêm trường bắt buộc vào schema Me là thay đổi API contract. Việc đã duyệt làm tiếp không được dùng để âm thầm bỏ kiểm version hoặc mở rộng contract mà không nêu rõ. Sau khi duyệt, thực hiện và đồng bộ đúng phạm vi tác động; không hỏi lại các bước kỹ thuật ở trên.
