# P1-06 — Hoàn thiện phần còn lại P1-2 trong cùng một đợt

20/10/2026 · Code đã nối các nhóm và có kiểm local theo báo cáo; bằng chứng hồi quy cuối dùng SDD cùng phiên bản. Push thật chờ cấu hình dự án và thiết bị. Chủ dự án yêu cầu “làm hết trong 1 lần đi”, sau đó chọn **Đồng ý bộ quy tắc đề xuất** và **Dùng Expo Push Service để thử thật**.

## Quyết định đã chốt

1. Ghi chú hỗ trợ nội bộ tách khỏi phản hồi gửi khách; chỉ admin hỗ trợ đọc. Giữ MFA, kiểm phiên bản, retry cùng khóa và báo cáo đóng chỉ đọc. Nhật ký chung không chứa nội dung ghi chú.
2. Người cung cấp chỉ xem lịch sử đánh giá khách qua quan hệ yêu cầu thuê và quyền xem việc hiện hành. Chỉ hiện đánh giá còn hiển thị; không trả mã việc, địa chỉ hoặc danh tính đơn vị khác.
3. Bản đồ gom cụm theo zoom trên các kết quả đã tải. Chủ hồ sơ tự vẽ vùng đa giác và chọn điểm đại diện riêng. Xếp hạng sao giảm dần; đề xuất theo đã xác minh → sao → số đánh giá → khoảng cách. Phân trang ổn định.
4. Sau admin hoàn tất, đúng người đang được phân công được xác nhận nhận tiền một lần. Không quyết toán hoặc thưởng lần hai. Đánh giá vẫn cần đủ dấu khách báo trả tiền và người thực hiện nhận tiền.
5. Hỗ trợ, xác minh và đánh giá cập nhật qua inbox/realtime cho người có quyền hiện hành; sự kiện chỉ chứa mã và phiên bản, không chứa nội dung riêng.
6. Dùng Expo Push Service thử thật, payload chung và mã đối tượng; thu hồi token khi đăng xuất, xử lý lỗi gửi. Phải kiểm cấu hình Expo/FCM/APNs; local/mock, provider nhận yêu cầu, thiết bị nhận và mở thông báo là các mức bằng chứng khác nhau. Không bật dịch vụ trả phí.

## Phạm vi giữ hoãn

Chọn tin nhắn làm chứng cứ; P2, Q02, khôi phục/xóa tài khoản, cấp quyền admin qua UI, tài chính sandbox, cuộc gọi, metrics vận hành, PROMO-02, production và tiền thật.

## Tiêu chí bàn giao

- Nối dữ liệu → API → app → test; đối chiếu quyền hiện hành, cạnh tranh, retry, riêng tư và không nhân đôi bút toán.
- Báo cáo học code riêng theo nhóm lớn, có Mermaid và ảnh app chạy thật với dữ liệu DEMO; cập nhật checklist/mục lục cùng đợt.
- SDD prepare đã đạt trước sửa; phải bổ sung inventory cho file/operation/QA mới và chạy run/verify sau triển khai.
- Ghi rõ giới hạn native, provider, CI và UAT; không dùng code hoặc test giả làm bằng chứng gửi push thật.
- Các quyết định được ghi trong repo. Chưa yêu cầu đồng bộ Drive, Excel hoặc ui-ux.
