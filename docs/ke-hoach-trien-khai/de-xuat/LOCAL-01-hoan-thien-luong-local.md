# LOCAL-01 — Hoàn thiện các luồng local

23/10/2026 · Chủ dự án trả lời “ok làm hết đi” sau đề xuất sáu phần. Nền `cd719cb`. Đợt này triển khai local/test, Android emulator và iOS simulator; không mở dịch vụ thật, tiền thật hoặc production.

## Phạm vi đã duyệt

1. Ổn định chat/đánh giá khi tải lại và thao tác đồng thời: giữ nội dung, phiên bản và khóa thử lại; không mất lần bấm hoặc gửi trùng. Bài kiểm phải tái hiện được lỗi trước khi sửa.
2. Quay lại đúng thao tác sau đăng nhập: giữ ID và đích hợp lệ, đọc lại quyền/dữ liệu; không tự gửi thuê hoặc tiền.
3. Điều hướng khách/partner/nhân viên theo UI-16 hiện hành, dùng đúng hồ sơ được chọn; quyền ví do server quyết định.
4. Liên kết `dvqb://` mở màn hợp lệ, gồm app đang mở/khởi động, chưa đăng nhập, đối tượng mất quyền/không còn tồn tại. Không coi đây là kiểm APNs/Universal Links trên miền thật.
5. Tra nhật ký admin tổng hợp qua `GET /admin/audit`, quyền `audit.read`, phiên admin, phân trang gắn actor/bộ lọc; không lộ bí mật hoặc nội dung riêng của chứng cứ.
6. Kiểm và sửa trải nghiệm các luồng trên ở VI/EN/JA, lỗi/tải/rỗng/offline, đổi tài khoản, bàn phím và chữ lớn.

## Quyết định bổ sung đã duyệt ngày 23/10/2026

Chủ dự án trả lời “Đồng ý toàn bộ đề xuất” cho nhóm sau; đây là quyết định mới, chưa đồng bộ bộ spec/Drive/ui-ux:

7. Gallery tối đa 12 ảnh JPEG/PNG/WebP, tối đa 10 MB/ảnh; chủ hồ sơ hoặc người có `profile.manage` thêm, gỡ, sắp xếp. Khách chỉ xem ảnh của hồ sơ đã công bố.
8. MFA: mã dự phòng dùng một lần; mất cả TOTP và mã cần một admin khác có `grant.manage` và MFA mới reset. Admin cuối cùng chỉ có cứu hộ local trên dữ liệu DEMO.
9. Ngừng hồ sơ dùng `accepting_jobs=false`, giữ ví/việc/lịch sử và cho bật lại theo quyền hiện hành.
10. Diễn tập backup đầy đủ DB + ảnh riêng tư + khóa DEMO trong vùng test riêng.

## Cách nối và kiểm

- Giữ Expo/NestJS/PostgreSQL, feature/module hiện hành, API quyết định quyền. Không thêm màn giả hoặc dịch vụ bên ngoài.
- Mỗi luồng: bài kiểm tái hiện → state/API/DB và UI → kiểm tập trung → review quyền, retry, đổi tài khoản → SDD-PROJECT toàn bộ.
- Giữ 144 tiêu chí cũ và baseline. File/route/criterion mới phải review inventory; không tự làm mới hash hoặc bỏ bài để xanh.
- Ảnh DEMO trên emulator/simulator, Mermaid trực tiếp trong báo cáo Markdown; cập nhật checklist và mục lục. Không đồng bộ Drive/Excel/ui-ux.
- Không commit/push đợt mới nếu chưa có yêu cầu riêng. Bằng chứng local/native/CI/UAT ghi riêng.

## Tiến độ

- [x] Đọc code/spec/checklist và kiểm SDD prepare trên nền sạch.
- [x] Chat và đánh giá.
- [x] Đích sau đăng nhập và liên kết app.
- [x] Điều hướng theo vai/hồ sơ.
- [x] Nhật ký admin tổng hợp.
- [x] Kiểm trải nghiệm, Android emulator/iOS simulator, ảnh DEMO và báo cáo. Mở nguội qua development launcher, chưa phải release/thiết bị thật.
- SDD run/verify toàn bộ theo evidence đúng fingerprint; 151 tiêu chí sau khi thêm 7 tiêu chí và giữ 144 tiêu chí cũ.

- [x] Gallery có DB/API/app, ảnh riêng/công khai theo quyền và tạm ngừng nhận việc giữ dữ liệu.
- [x] Mã dự phòng dùng một lần, thay TOTP sau recovery, reset chéo có MFA mới và cứu hộ DEMO có guard.
- [x] Diễn tập DB + private assets + khóa DEMO trong vùng tạm riêng.
- Kết quả native bổ sung và kiểm tổng theo báo cáo B02-05/B11-05/B11-06; không dùng kết quả sáu mục đầu để chứng nhận các mục mới.
