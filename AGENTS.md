# Quy tắc quản lý tài liệu dự án

Theo yêu cầu trực tiếp của chủ dự án ngày 22/09/2026:

- Điểm vào quản lý tài liệu là `docs/project-control/So-quan-ly-tai-lieu.xlsx`. Đọc bản Excel mới nhất trước mỗi thay đổi; không ghi đè các chỉnh sửa của người dùng bằng dữ liệu builder cũ. Thiết kế nằm trong `ui-ux`, ứng dụng sản phẩm dành chỗ trong `apps`, backend trong `services/api`. Đã bỏ symlink `outputs` theo yêu cầu chủ dự án ngày 29/09/2026 (PATH-01); dùng trực tiếp `docs/`, không tạo lại `outputs`. `work` và các đường dẫn thiết kế cũ khác còn là symlink tương thích; xem README dự án để dùng đường dẫn chính.
- Bản Excel trên Drive có ID `18eWx9ObcWbpRNSIsxKs7YTwBpR-ZPjQq`, nằm trong thư mục dự án `1msYKneD2-9yZMUXU0qlWQjzrCVE9gcO7`. Trước cập nhật kiểm tra bản nào mới hơn; bảo toàn chỉnh sửa của người dùng và cập nhật cùng ID, không tạo các bản sổ quản lý song song.
- Tra sheet `Anh huong` để lập danh sách tài liệu bị ảnh hưởng; bảng này là điểm bắt đầu, vẫn tìm kiếm chéo nội dung để phát hiện phụ thuộc chưa được ghi.
- Quyết định mới nhất đã được chủ dự án chốt có ưu tiên cao hơn tài liệu cũ và hành vi prototype. Phân biệt rõ Đã chốt, Đề xuất, Pending và Chưa xác định. Không biến đề xuất thành yêu cầu đã duyệt.
- Gom các câu hỏi liên quan rồi cập nhật theo một nhóm quyết định. Khi sửa chức năng, đồng bộ các bản đang dùng: BRD/PRD, FR/NFR, SRS, UX, luồng, quyền/trạng thái, kiến trúc/ERD/API, wireframe và QA tùy tác động thực tế. Không chỉ sửa một giao diện hay một file.
- Bản chính, bản xuất HTML/Markdown/ZIP, bản phục vụ localhost và bản trên Drive phải có nguồn và phiên bản rõ. Tái tạo bản xuất sau sửa nguồn; ưu tiên cập nhật cùng Drive ID. Tài liệu lịch sử giữ nguyên và ghi đã thay thế, không dùng làm chuẩn hiện hành.
- Cập nhật `Quyet dinh`, `Dong bo` và `Danh muc` trong Excel sau mỗi đợt; mỗi dòng đồng bộ phải có người kiểm tra và bằng chứng phiên bản/vị trí. Đọc lại nội dung đã lưu, kiểm liên kết và mâu thuẫn.
- Chỉ báo hoàn tất đồng bộ khi mọi tài liệu trong phạm vi ảnh hưởng đã cập nhật/kiểm chứng hoặc được đánh dấu không áp dụng với lý do. Nếu còn thiếu quyền truy cập hoặc chưa xử lý được, ghi rõ tài liệu, nguyên nhân và phần còn thiếu; không báo đồng bộ toàn bộ.
- Excel là sổ quản lý/liên kết, không tự sửa tài liệu ngoài và không thay thế nội dung tài liệu gốc. Mọi tài liệu mới phải được đăng ký và gắn chức năng trước khi bàn giao.
- Trạng thái `Mới nhất` chỉ bản hiện hành đã kiểm khớp quyết định đã chốt; không có nghĩa mọi đề xuất trong tài liệu đã được duyệt. Khi quyết định thay đổi, chuyển tài liệu bị ảnh hưởng về `Cần rà soát` hoặc `Cần đồng bộ` cho tới khi kiểm lại. Bản lịch sử giữ `Lưu trữ`, tài liệu chưa tạo giữ `Chưa có`.

Tài liệu chi tiết và trạng thái tồn đọng nằm trong file Excel. Chưa có phê duyệt triển khai sản phẩm chỉ vì đã duyệt wireframe hoặc tài liệu.

Quyết định PROMO-02 ngày 23/09/2026: banner chiến dịch, quảng cáo partner và voucher nằm ngoài phase đầu, chỉ giữ nghiên cứu DOC-055 để mở rộng tương lai. Không thêm UI, API, dữ liệu hoặc backlog triển khai nhóm này nếu chưa có quyết định mở lại. Point hiện hành không bị hoãn.
