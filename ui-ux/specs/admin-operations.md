# DOC-062 — Quản trị vận hành · UI-20

React v0.14 · 27/09/2026 · giao diện để review. Phạm vi: thể hiện nghiệp vụ quản trị đã thống nhất; chưa triển khai backend.

## Điểm vào
Storybook → Admin · quản lý tài khoản / quản lý partner / danh mục / báo cáo. Mã quản trị mẫu **654321**. Thanh vai trò xem thử dùng chung dữ liệu trong lượt thử. Trong trang có liên kết đến Duyệt tài chính và Hỗ trợ & kiểm duyệt.

## Các luồng
| Nhóm | Luồng và ảnh hưởng |
|---|---|
| Tài khoản | Tìm tên/mã/liên hệ → phân trang 8 dòng → chọn hồ sơ → Truy cập / Khôi phục / Yêu cầu xóa. Không có thao tác xóa khi chưa có yêu cầu. |
| Khóa | Nhập lý do và mã mẫu → thu hồi phiên mẫu → màn chặn truy cập. Không đổi số dư hoặc chứng từ. |
| Khôi phục | Khách gửi liên hệ/chứng cứ → admin bổ sung/từ chối/cho xác minh → khách xác minh kênh mới bằng 123456 → đăng nhập lại. Không tự mở khóa tài khoản. |
| Xóa | Admin đối chiếu yêu cầu và nghĩa vụ → chặn nếu còn việc hoặc yêu cầu tài chính chưa xử lý → đánh dấu xóa mẫu, giữ chứng từ lịch sử. Không xóa dữ liệu thật. |
| Partner | Cảnh báo / đình chỉ / khôi phục, có lý do. Đình chỉ ẩn khỏi tìm kiếm, chặn nhận việc mới và bật nhận việc; giữ việc cũ, hóa đơn, ví. |
| Danh mục | Ngành → nhóm → kỹ năng. Thêm, đổi tên, ngừng/khôi phục; mã giữ ổn định. Danh mục ngừng không được chọn mới; lịch sử công việc giữ tên đã ghi. |
| Báo cáo | Số việc, hoàn tất hai phía, đang xử lý, phí quyết toán, point bù partner, báo cáo mở, nạp/rút chờ; tra cứu công việc/hóa đơn chỉ đọc. |
| Nhật ký | Tổng hợp thao tác quản trị, hỗ trợ và tài chính trong phiên; không có sửa/xóa nhật ký. |

## Trạng thái và bố cục
Danh sách–chi tiết trên desktop; mobile chọn hồ sơ rồi quay về danh sách. Có tìm kiếm, phân trang và mô phỏng tải/trống/lỗi/mất mạng/thiếu quyền/hết phiên. Thử lại không tự gửi lại quyết định.

## Kiểm chứng
- 46 kiểm tra logic; build Vite và Storybook. 52 stories trong bản xuất.
- Browser: tìm kiếm/phân trang tài khoản; khóa → khách bị chặn → gửi khôi phục → admin cho xác minh → khách xác minh; tài khoản vẫn khóa đúng quy tắc.
- Browser: đình chỉ Minh → tắt và khóa switch nhận việc, không thêm yêu cầu; công việc chờ nhận tiền cũ vẫn hiển thị.
- Browser: tạo kỹ năng trong nhóm điện nước → tìm thấy bản ghi mới. Danh mục mobile 390px không tràn ngang, đã xem ảnh.
- Các nhánh đổi tên/ngừng/khôi phục danh mục, xóa có nghĩa vụ, thống kê phí được kiểm tra bằng model tests. Chưa kiểm thủ công mọi tổ hợp màn hình/thiết bị.

## Giới hạn và phần còn lại
Dữ liệu chỉ trong bộ nhớ, reload sẽ mất. OTP, phân quyền, thu hồi phiên, tệp chứng cứ và trạng thái lỗi là mô phỏng; không dùng dữ liệu cá nhân thật. Danh mục dùng mã cho quản trị nhưng một số fixture kỹ năng còn nối qua tên; production cần quan hệ ID thống nhất. Số liệu là lượt thử, không phải doanh thu thật hoặc biểu đồ lịch sử.

Xác minh giấy tờ vẫn là hồ sơ onboarding mẫu theo DOC-061. Xử lý bút toán treo/đảo tiền, chuyển chủ/đóng doanh nghiệp, banner/quảng cáo/voucher vẫn ngoài đợt. Còn cần rà soát UX xuyên suốt và kiểm thử sản phẩm thật sau khi có backend; không tuyên bố toàn bộ sản phẩm hoàn thành.

## Đồng bộ
Nguồn React, các spec liên quan, registry v1.26 và UI-UX-v0.18.zip. BRD/FR/NFR/SRS/API/ERD không thay đổi nghiệp vụ trong đợt này. Mục admin còn thiếu trong UI-19 đã được thay thế trong phạm vi UI-20 trên; các giới hạn khác giữ nguyên.


## UI-21 — rà soát luồng 27/09/2026
Bản hiện hành React v0.15 / UI-UX-v0.19.zip. Đã sửa kiểm trạng thái lúc gửi thuê, mở chat đúng người từ công việc, thông báo đến nhân viên phụ trách và khôi phục giá trị point khi mở hóa đơn từ thông báo. [Ma trận kiểm chứng và phần chưa nghiệm thu](flow-review.md). Không đổi nghiệp vụ đã chốt; 49 tests, 52 stories.
