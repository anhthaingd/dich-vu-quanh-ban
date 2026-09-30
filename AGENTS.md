# Quy tắc quản lý tài liệu dự án

## Khi nào cần cập nhật tài liệu

Theo yêu cầu trực tiếp mới nhất của chủ dự án ngày 30/09/2026, áp dụng cho toàn repo và các phiên làm việc sau:

- **Chỉ thay đổi code hoặc môi trường phát triển:** không tự cập nhật folder tài liệu, sổ Excel, bản xuất ZIP/HTML hay Drive. Phạm vi này gồm triển khai theo spec hiện có, sửa bug để khớp spec, refactor, cấu hình, dependency, SDK/MCP, log/test, CI và build. Báo cáo thay đổi và kết quả kiểm tra trong phần bàn giao công việc.
- **Thay đổi spec đã chốt:** mới cập nhật các tài liệu liên quan theo phạm vi ảnh hưởng và đồng bộ sổ quản lý/bản xuất/Drive. Ví dụ: yêu cầu, nghiệp vụ, luồng người dùng, quyền/trạng thái, API contract, mô hình dữ liệu hoặc quyết định thiết kế được dùng làm chuẩn triển khai.
- Trước khi làm, phân biệt thay đổi cách triển khai với thay đổi spec. Không coi việc thêm/sửa code hay hoàn tất test là một thay đổi spec. Nếu cần thay đổi spec chưa được duyệt, trao đổi với chủ dự án trước; không tự biến phương án triển khai thành yêu cầu đã chốt.
- Công việc chỉ liên quan code không bắt buộc đọc sổ Excel hoặc kiểm tra Drive. Vẫn đọc spec hiện hành liên quan khi cần để triển khai đúng.
- Nếu chủ dự án yêu cầu sửa một hướng dẫn hoặc quy tắc cụ thể, thực hiện đúng phạm vi đó; không tự kéo theo đồng bộ toàn bộ hồ sơ khi spec không đổi.
- Quy tắc ngày 30/09/2026 này ưu tiên hơn các hướng dẫn cũ hoặc ghi nhớ trước đây yêu cầu cập nhật tài liệu sau mọi thay đổi. Giữ nguyên các cập nhật tài liệu đã làm, trừ khi chủ dự án yêu cầu chỉnh lại.

## Quy trình đồng bộ khi thay đổi spec

Các quy tắc quản lý từ ngày 22/09/2026 dưới đây áp dụng khi thay đổi spec hoặc khi chủ dự án yêu cầu đồng bộ hồ sơ:

- Điểm vào quản lý tài liệu là `docs/project-control/So-quan-ly-tai-lieu.xlsx`. Đọc bản Excel mới nhất trước mỗi đợt thay đổi spec/đồng bộ hồ sơ; không ghi đè các chỉnh sửa của người dùng bằng dữ liệu builder cũ. Thiết kế nằm trong `ui-ux`, ứng dụng sản phẩm dành chỗ trong `apps`, backend trong `services/api`. Đã bỏ symlink `outputs` theo yêu cầu chủ dự án ngày 29/09/2026 (PATH-01); dùng trực tiếp `docs/`, không tạo lại `outputs`. `work` và các đường dẫn thiết kế cũ khác còn là symlink tương thích; xem README dự án để dùng đường dẫn chính.
- Bản Excel trên Drive có ID `18eWx9ObcWbpRNSIsxKs7YTwBpR-ZPjQq`, nằm trong thư mục dự án `1msYKneD2-9yZMUXU0qlWQjzrCVE9gcO7`. Trước cập nhật kiểm tra bản nào mới hơn; bảo toàn chỉnh sửa của người dùng và cập nhật cùng ID, không tạo các bản sổ quản lý song song.
- Tra sheet `Anh huong` để lập danh sách tài liệu bị ảnh hưởng; bảng này là điểm bắt đầu, vẫn tìm kiếm chéo nội dung để phát hiện phụ thuộc chưa được ghi.
- Quyết định mới nhất đã được chủ dự án chốt có ưu tiên cao hơn tài liệu cũ và hành vi prototype. Phân biệt rõ Đã chốt, Đề xuất, Pending và Chưa xác định. Không biến đề xuất thành yêu cầu đã duyệt.
- Gom các câu hỏi liên quan rồi cập nhật theo một nhóm quyết định. Khi thay đổi spec đã chốt, đồng bộ các bản đang dùng: BRD/PRD, FR/NFR, SRS, UX, luồng, quyền/trạng thái, kiến trúc/ERD/API, wireframe và QA tùy tác động thực tế. Không chỉ sửa một giao diện hay một file.
- Bản chính, bản xuất HTML/Markdown/ZIP, bản phục vụ localhost và bản trên Drive phải có nguồn và phiên bản rõ. Tái tạo bản xuất sau sửa nguồn; ưu tiên cập nhật cùng Drive ID. Tài liệu lịch sử giữ nguyên và ghi đã thay thế, không dùng làm chuẩn hiện hành.
- Cập nhật `Quyet dinh`, `Dong bo` và `Danh muc` trong Excel sau mỗi đợt thay đổi spec/đồng bộ hồ sơ; mỗi dòng đồng bộ phải có người kiểm tra và bằng chứng phiên bản/vị trí. Đọc lại nội dung đã lưu, kiểm liên kết và mâu thuẫn.
- Chỉ báo hoàn tất đồng bộ khi mọi tài liệu trong phạm vi ảnh hưởng đã cập nhật/kiểm chứng hoặc được đánh dấu không áp dụng với lý do. Nếu còn thiếu quyền truy cập hoặc chưa xử lý được, ghi rõ tài liệu, nguyên nhân và phần còn thiếu; không báo đồng bộ toàn bộ.
- Excel là sổ quản lý/liên kết, không tự sửa tài liệu ngoài và không thay thế nội dung tài liệu gốc. Mọi tài liệu mới phải được đăng ký và gắn chức năng trước khi bàn giao.
- Trạng thái `Mới nhất` chỉ bản hiện hành đã kiểm khớp quyết định đã chốt; không có nghĩa mọi đề xuất trong tài liệu đã được duyệt. Khi quyết định thay đổi, chuyển tài liệu bị ảnh hưởng về `Cần rà soát` hoặc `Cần đồng bộ` cho tới khi kiểm lại. Bản lịch sử giữ `Lưu trữ`, tài liệu chưa tạo giữ `Chưa có`.

Tài liệu chi tiết và trạng thái tồn đọng nằm trong file Excel. Chưa có phê duyệt triển khai sản phẩm chỉ vì đã duyệt wireframe hoặc tài liệu.

Quyết định PROMO-02 ngày 23/09/2026: banner chiến dịch, quảng cáo partner và voucher nằm ngoài phase đầu, chỉ giữ nghiên cứu DOC-055 để mở rộng tương lai. Không thêm UI, API, dữ liệu hoặc backlog triển khai nhóm này nếu chưa có quyết định mở lại. Point hiện hành không bị hoãn.
