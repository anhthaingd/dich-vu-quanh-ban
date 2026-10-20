# P1-05 — Admin tài khoản, người cung cấp và danh mục

20/10/2026 · Đã được chủ dự án yêu cầu triển khai toàn bộ admin P1-2 còn lại và chọn **Đồng ý cả 3 bổ sung**.

## Phạm vi đã chốt

- Danh sách/chi tiết tài khoản và người cung cấp có tìm kiếm, trạng thái, phiên bản và lịch sử, chỉ trả dữ liệu đúng quyền.
- Ngành–nhóm–kỹ năng: đọc cả mục ngừng, thêm/đổi tên/ngừng/khôi phục; mã ổn định, kiểm phiên bản. Giữ tên đã chụp trong công việc cũ.
- Khóa/mở tài khoản thu hồi phiên thường và realtime; tài khoản bị khóa có phiên hỗ trợ hạn chế để gửi/đọc báo cáo của mình, không tự mở khóa.
- Partner: cảnh báo, đình chỉ nhận việc mới và khôi phục. Giữ công việc cũ, hóa đơn, ví và lịch sử; khôi phục không tự bật nhận việc.
- Web admin và admin trong app, VI/EN/JA, MFA hiện hành và lý do bắt buộc; quyền accounts.manage/catalog.manage riêng, moderation.manage cho partner. Không tự cấp quyền cho tài khoản có sẵn.
- Kiểm hồi quy hỗ trợ, xác minh, đánh giá, hoàn tất thay tiền test hiện có.

## Thiết kế triển khai

Migration 017 bổ sung quyền, miền nhật ký, phiên bản danh mục và scope phiên hỗ trợ. API quản trị dùng DTO riêng, phân trang có cursor gắn bộ lọc/quyền, xác thực lại quyền/MFA khi thử lại; ghi quyết định cùng giao dịch dữ liệu. Phiên hỗ trợ chỉ được xác thực tại me/logout/reports và ảnh chứng cứ của chính người gửi; mọi API nghiệp vụ khác và socket từ chối.

Danh mục quản trị giữ cấu trúc ngành → nhóm → kỹ năng, chọn cha hợp lệ, không đổi mã/cha của bản ghi đã có. Phạm vi này không mở trình thiết kế form kỹ năng hoặc tự dịch dữ liệu người dùng.

## Kiểm và giới hạn

Kiểm nhiều admin cạnh tranh, version cũ, retry sau mất response, quyền/MFA hết hạn, tài khoản khóa, phiên hỗ trợ không truy cập nghiệp vụ; danh mục ngừng chặn lựa chọn mới nhưng giữ lịch sử; partner đình chỉ không sửa tiền. Chạy SDD toàn repo, web và native, chụp DEMO và báo cáo B09-05.

Chọn tin nhắn làm chứng cứ đã được yêu cầu để sau. Không mở khôi phục/xóa tài khoản, cấp quyền admin qua UI, tài chính P2, Q02, provider/production/chi phí, chuyển chủ/đóng doanh nghiệp hoặc PROMO-02. Không commit/push; không đồng bộ Drive/Excel/ui-ux. Contract OpenAPI chỉ cập nhật phần đã duyệt; tài liệu nghiệp vụ bên ngoài chưa đồng bộ.
