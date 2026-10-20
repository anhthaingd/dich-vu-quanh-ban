# P1-04 — Admin hoàn tất thay thợ bằng tiền test

20/10/2026 · **Đã duyệt triển khai.** Chủ dự án chọn “Đồng ý bổ sung và triển khai” cho API xem trước có phiên bản hóa đơn/tổng tiền/tiền trực tiếp, trường xác nhận đối chiếu chứng cứ và luồng DB/API → admin web/mobile → test. Gói thuộc phần còn lại P1-2, tiếp sau P1-03.

## Kết quả và thiết kế đã chốt

Admin mở báo cáo gắn đúng phiên bản hóa đơn đã được khách xác nhận, xem chứng cứ, bấm xem trước, ghi lý do và xác nhận đã đối chiếu. Server quyết toán một lần bằng luồng dùng chung với thợ. Tiền trực tiếp không đi qua hệ thống. Hai dấu thanh toán giữ nguyên, đánh giá vẫn theo Q01, báo cáo không tự đóng.

Dùng quyền `finance.review` riêng và `support.read` để đọc hồ sơ/chứng cứ, cùng MFA trong 5 phút. Quyền tài chính không tự cấp quyền xử lý trạng thái báo cáo. Không tự cấp grant cho tài khoản hiện có. Cấu hình admin hiện hành giới hạn database DEMO/test local.

`CompletionPreview` thêm `invoice_expected_version`, `total`, `cash_due`; `AdminCompletion` thêm `checked: true`. Hai endpoint thêm header phiên admin hiện hành. Token xem trước mã hóa, gắn admin/báo cáo/phiên bản/tác động/chứng cứ, hạn mặc định 5 phút. Server kiểm lại quyền, MFA, báo cáo, hóa đơn, tài khoản và chứng cứ khi gửi. Thử lại cùng key/payload trả kết quả cũ chỉ sau kiểm quyền/MFA hiện hành.

Giao diện dùng bố cục admin hiện hành đã đối chiếu Storybook `AdminOperationsQueue`, phần xác nhận theo wireframe `adminSettlementOpen` tại `ui-ux/wireframes/index.html` và `ux-scope-current.md` v0.23. Thêm phần xem trước ngay chi tiết báo cáo, VI/EN/JA, checkbox đối chiếu, lỗi/hết hạn/thử lại. Không sửa thiết kế nguồn trong `ui-ux`.

## Các bước triển khai và tiêu chí kiểm

1. Migration 016 thêm quyền tài chính riêng và liên kết chứng cứ với settlement bất biến. Tách `settleLockedInvoice` và `readInvoice`; thợ và admin cùng dùng một bộ ghi sổ, khóa theo partner → việc → hóa đơn → tài khoản tiền.
2. `CompletionService` nối hai route đã có contract. Giữ phí/point việc khác, hai dấu thanh toán, audit người/lý do/báo cáo/phiên bản/chứng cứ, thông báo hai bên không mang nội dung chứng cứ. Report chỉ tăng version để bảo vệ quyết định cạnh tranh, giữ state.
3. `Completion.tsx` và `AdminCompletion.tsx`: hiển thị số tiền trả về, lưu request thử lại trong bộ nhớ, hết hạn/conflict yêu cầu xem lại, quyền/MFA mất hiệu lực trở về xác thực. Lịch sử hiển thị kết quả hoàn tất thay.
4. Kiểm tích hợp PostgreSQL: cạnh tranh thợ/admin, một settlement, rollback giữa sự kiện, mất response, sai actor/token/version/chứng cứ, case đóng/MFA hết hạn/quyền bị thu hồi, hóa đơn 0 và toàn point. Kiểm UI/web hai vai và native riêng.
5. Đăng ký file/route/criterion SDD, giữ baseline và toàn bộ 114 criterion cũ; QA-034/039 chỉ nâng từ unmapped sang partial với phạm vi kiểm thực tế. Chạy toàn gói và verify. Báo cáo học code B09-04, checklist/mục lục cùng đợt.

## Giới hạn

Không mở ngân hàng, tiền thật, hủy/hoàn/đảo tiền, Q02, provider/production, khôi phục MFA hoặc chọn đoạn chat chứng cứ. Không tự xác nhận dấu nhận tiền của thợ kể cả sau admin quyết toán; đường bổ sung dấu thợ sau quyết toán chưa có trong contract hiện hành, nên không tự thêm. Không commit/push hoặc đồng bộ Drive/Excel/ui-ux.
