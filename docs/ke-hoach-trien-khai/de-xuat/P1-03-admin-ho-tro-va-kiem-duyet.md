# P1-03 — Admin hỗ trợ, xác minh và kiểm duyệt

19/10/2026 · Đợt P1-2 · **Đã duyệt triển khai local/test**. Chủ dự án yêu cầu làm gói admin được đề xuất, sau đó xác nhận “Đồng ý bổ sung toàn bộ như đề xuất” cho MFA TOTP, API phiên admin, hồ sơ xác minh, tìm/lọc/chi tiết hàng đợi và Giữ/Ẩn/Khôi phục đánh giá.

## Kết quả người dùng sẽ thấy

Người cung cấp nộp ảnh hồ sơ riêng tư và theo dõi phản hồi. Người quản trị đăng nhập bằng mật khẩu, thiết lập ứng dụng xác thực và nhập mã TOTP để mở trang quản trị. Ba hàng đợi cho phép đọc nội dung được gửi, ghi lý do và quyết định. Người gửi đọc lại kết quả qua app. Mỗi quyết định có nhật ký; xử lý báo cáo không đổi tiền hoặc trạng thái công việc.

MFA là xác thực bằng hai yếu tố: mật khẩu và ứng dụng giữ khóa tạo mã theo thời gian. Dùng TOTP local theo [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238), không gọi SMS. Nguyên tắc quản lý yếu tố xác thực tham chiếu [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html). Đây là pilot DEMO, không phải phê duyệt production hoặc quy trình khôi phục MFA cho tài khoản thật.

## Thiết kế đã chốt và lựa chọn triển khai

- React/TypeScript trong `apps/admin`, dùng bố cục Storybook `AdminOperationsQueue`, NestJS/PostgreSQL hiện hành. Web admin responsive; người cung cấp tiếp tục dùng Expo. Không dùng thanh đổi vai hoặc mã cố định của prototype để cấp quyền.
- Quyền `support.read`, `support.manage`, `moderation.manage`, `audit.read` lưu riêng với quyền doanh nghiệp. Tài khoản DEMO được tạo bằng công cụ local giới hạn DB; đăng ký công khai không cấp admin.
- TOTP 6 số, chu kỳ 30 giây; khóa riêng mỗi tài khoản được mã hóa, chống dùng lại mã, hạn mức nhập sai được lưu DB. Thiết lập cần mật khẩu và xác nhận mã trước khi có quyền đọc admin. Phiên admin gắn phiên đăng nhập, hạn 15 phút; quyết định cần xác thực trong 5 phút gần nhất. Khóa phiên, đăng xuất và thu hồi quyền được kiểm lại ở server.
- Hồ sơ gồm loại `identity/business/professional`, thông tin khai báo ngắn và ảnh JPEG/PNG/WebP DEMO theo adapter ảnh hiện hành. `business` chỉ cho loại doanh nghiệp. Mỗi lần gửi là một bản bất biến, giữ lịch sử khi gửi lại sau `awaiting_evidence/rejected`; đang chờ hoặc đã duyệt không gửi đè. Chỉ duyệt danh tính cập nhật huy hiệu chung theo prototype. Duyệt cần xác nhận đã đối chiếu.
- Báo cáo giữ trạng thái hiện hành, đóng là chỉ đọc. Phản hồi admin hiển thị cho người gửi; ghi chú nội bộ được tách riêng. Admin chỉ mở chứng cứ chủ động gửi và ảnh đánh giá/hồ sơ đúng quyền; không mở chat riêng.
- Kiểm duyệt giữ nguyên sao, nội dung, phản hồi và trạng thái tác giả tự gỡ. `keep/hide/unhide` tăng phiên bản, lưu lý do; ẩn loại khỏi điểm công khai, hiện lại không phục hồi bản tác giả đã gỡ.
- Mỗi mutation dùng phiên bản đã xem và cùng mã retry. Retry phải kiểm lại quyền/MFA trước khi trả kết quả; không lưu mật khẩu/mã/khóa MFA trong snapshot, log hoặc báo cáo.

## Contract bổ sung đã được phép

Các tên route dưới đây là lựa chọn kỹ thuật trong phạm vi đã duyệt; OpenAPI là contract máy đọc sau triển khai.

| Nhóm | Input → output và quyền |
|---|---|
| MFA | trạng thái; bắt đầu thiết lập bằng mật khẩu → khóa thiết lập; xác nhận mã → phiên admin; mật khẩu + mã → phiên mới; khóa phiên → Ack. Chỉ tài khoản có grant admin, kiểm family hiện hành. |
| Hàng đợi | phân trang cursor, `q/state` theo miền → danh sách tóm tắt; GET chi tiết → nội dung/lịch sử/ảnh được cấp quyền. Cursor gắn actor và bộ lọc. |
| Báo cáo | giữ decision hiện hành, thêm đọc chi tiết, người gửi và thời điểm; lý do ghi thành phản hồi; quyền đọc và xử lý riêng. |
| Xác minh | bổ sung GET lịch sử của partner, GET admin chi tiết, DTO hồ sơ thay Ack trong hàng đợi; gửi `{document_asset_ids, details:{kind, statement}}`; quyết định `{expected_version,action,reason,checked}` với `request_evidence/approve/reject`. |
| Đánh giá | DTO admin gồm đánh giá hiện hành và lịch sử moderation; thêm `keep`; không thay quyền sửa nội dung của app. |
| Ảnh admin | đọc nội dung theo phiên admin và quan hệ chứng cứ; dữ liệu hồ sơ và file xác minh mã hóa; URL/token không cấp quyền vĩnh viễn. |
| Nhật ký | phân trang các quyết định hỗ trợ/moderation trong gói, loại bỏ dữ liệu bí mật và không mở toàn bộ audit tài chính. |

## Thứ tự triển khai và kiểm

1. `services/api/migrations/015_admin_moderation.sql`, `modules/admin-auth`: quyền, yếu tố TOTP, phiên và rate limit. Test RFC vectors, sai mật khẩu/mã, replay, expiry, khóa/thu hồi, người ngoài và thiếu cấu hình.
2. `modules/moderation`, `modules/verification`, mở ACL assets: báo cáo/xác minh/đánh giá/nhật ký. Test PostGIS thật với hai admin cạnh tranh, retry mất response, ảnh sai chủ, quyền chéo và bất biến tiền/chat.
3. `apps/admin`: workspace/build/typecheck, đăng nhập/MFA, hàng đợi/chi tiết/quyết định/nhật ký, VI/EN/JA và responsive. Kiểm web API/DB thật, hết phiên, conflict và giữ form/retry.
4. `apps/mobile/src/features/verification`: nộp ảnh và đọc lịch sử từ hồ sơ partner, VI/EN/JA, API client/state/navigation. Test quyền và mất response; kiểm web + native và ảnh DEMO.
5. OpenAPI + SDD: review diff, đăng ký file/route/criterion; giữ baseline và toàn bộ tiêu chí cũ. `npm run sdd:check -- --change SDD-PROJECT --phase prepare`, `npm run sdd:run -- --change SDD-PROJECT`, `npm run sdd:check -- --change SDD-PROJECT --phase verify`.
6. Báo cáo B09-02, B02-04 với luồng, file/hàm, input/output, ảnh và bằng chứng; cập nhật checklist/mục lục. Local/CI/native/UAT được ghi riêng.

## Ranh giới đợt

Gói được duyệt gồm nền admin và ba hàng đợi. Admin hoàn tất thay, quản lý tài khoản/tài chính/danh mục toàn diện, chọn đoạn chat làm chứng cứ, PDF/cloud storage, recovery MFA cho tài khoản thật và production là phần tiếp theo. Không thay quyết định Q02, PROMO-02 hoặc mở tiền thật. Không commit/push khi chưa có yêu cầu riêng. Không đồng bộ Drive/Excel/ui-ux.

## Bằng chứng khởi đầu

- HEAD `7545890`; chỉ có thư mục IDE mobile chưa track trước khi bắt đầu.
- SDD prepare đạt: 108 criterion, 69 QA partial, 28 unmapped; đây chưa phải kiểm hành vi mới.
- Đã đọc và mở Storybook `AdminOperationsQueue`, đối chiếu `support/AdminOperations.jsx`, `account/Onboarding.jsx`, support/moderation spec, OpenAPI, auth/assets/support/reviews và migration hiện hành.
- Các contract thiếu đã được hỏi gộp và duyệt ngày 19/10/2026. Phần thiết kế trên được ghi nhận tại đây; chưa đồng bộ hồ sơ nghiệp vụ bên ngoài.
