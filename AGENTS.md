# Quy tắc quản lý tài liệu dự án

## Khi nào cần cập nhật tài liệu

Theo yêu cầu trực tiếp mới nhất của chủ dự án ngày 30/09/2026, áp dụng cho toàn repo và các phiên làm việc sau:

- **Chỉ thay đổi code hoặc môi trường phát triển:** không tự đồng bộ toàn bộ spec, sổ Excel, bản xuất ZIP/HTML hay Drive. Phạm vi này gồm triển khai theo spec hiện có, sửa bug để khớp spec, refactor, cấu hình, dependency, SDK/MCP, log/test, CI và build. Báo cáo/checklist triển khai là ngoại lệ được chủ dự án yêu cầu ngày 01/10/2026, theo mục dưới đây.
- **Thay đổi spec đã chốt:** mới cập nhật các tài liệu liên quan theo phạm vi ảnh hưởng và đồng bộ sổ quản lý/bản xuất/Drive. Ví dụ: yêu cầu, nghiệp vụ, luồng người dùng, quyền/trạng thái, API contract, mô hình dữ liệu hoặc quyết định thiết kế được dùng làm chuẩn triển khai.
- Trước khi làm, phân biệt thay đổi cách triển khai với thay đổi spec. Không coi việc thêm/sửa code hay hoàn tất test là một thay đổi spec. Nếu cần thay đổi spec chưa được duyệt, trao đổi với chủ dự án trước; không tự biến phương án triển khai thành yêu cầu đã chốt.
- Công việc chỉ liên quan code không bắt buộc đọc sổ Excel hoặc kiểm tra Drive. Vẫn đọc spec hiện hành liên quan khi cần để triển khai đúng.
- Nếu chủ dự án yêu cầu sửa một hướng dẫn hoặc quy tắc cụ thể, thực hiện đúng phạm vi đó; không tự kéo theo đồng bộ toàn bộ hồ sơ khi spec không đổi.
- Quy tắc ngày 30/09/2026 này ưu tiên hơn các hướng dẫn cũ hoặc ghi nhớ trước đây yêu cầu cập nhật tài liệu sau mọi thay đổi. Giữ nguyên các cập nhật tài liệu đã làm, trừ khi chủ dự án yêu cầu chỉnh lại.

## Kế hoạch, checklist và báo cáo để học code

Theo yêu cầu trực tiếp ngày 01/10/2026 (DELIVERY-01):

- Điểm vào triển khai là [docs/ke-hoach-trien-khai/README.md](docs/ke-hoach-trien-khai/README.md). Trước khi code, đọc checklist, nhiệm vụ đang làm, báo cáo liên quan và spec hiện hành; đối chiếu code thực tế, không dùng trạng thái tài liệu cũ thay bằng chứng.
- Làm tuần tự theo các lát có ý nghĩa, một lát đang hoạt động tại một thời điểm. Mỗi lát nối dữ liệu → API → app → test, có tiêu chí hoàn thành và phụ thuộc rõ. Không biến toàn bộ plan thành phê duyệt production, tiền thật, provider hoặc chi phí.
- Sau mỗi chức năng lớn/lát bàn giao, tạo một báo cáo riêng trong `docs/ke-hoach-trien-khai/bao-cao/` theo [mẫu](docs/ke-hoach-trien-khai/bao-cao/MAU-BAO-CAO.md). Bắt buộc có: kết quả/phạm vi, sơ đồ luồng, thứ tự đọc file và hàm thật, input/output, dữ liệu/quyền/trạng thái, lỗi/retry, test và bằng chứng, giới hạn, câu hỏi/bài thử giúp chủ dự án hiểu code.
- Sơ đồ báo cáo viết trực tiếp trong khối `mermaid` của file `.md`. Kiểm cú pháp và render trước bàn giao; không tạo thêm `.mmd`/PNG/SVG riêng trừ khi chủ dự án yêu cầu xuất ảnh. Khi không hiện sơ đồ, kiểm cú pháp và trình xem hiện có trước khi đề xuất cài thêm công cụ.
- Báo cáo học code dành cho chủ dự án chưa có nhiều kiến thức phát triển app: bắt đầu bằng thao tác và kết quả người dùng thấy, rồi giải thích từng bước bằng tiếng Việt dễ hiểu. Giải nghĩa thuật ngữ ngay lần đầu dùng; sơ đồ dùng tên vai trò và hành động dễ đọc. Giữ link file/tên hàm thật, nêu mỗi bước nhận gì, làm gì, chuyển gì sang đâu và vì sao. Đưa bảng lệnh, số liệu, chi tiết kỹ thuật sâu vào phần tra cứu cuối bài; giữ nguyên bằng chứng, giới hạn và trạng thái chưa làm. Không chỉ liệt kê thuật ngữ hoặc yêu cầu người đọc tự suy ra từ tên file.
- Cập nhật checklist và mục lục báo cáo cùng đợt; chỉ đánh dấu phần đã kiểm. Phân biệt code/local, native từng nền tảng, remote CI và UAT của chủ dự án. Một lát email/mật khẩu không đồng nghĩa toàn bộ B01 đã xong.
- Các báo cáo con dùng mã `Bxx-nn`/`I18N-nn` và được quản lý trong bộ kế hoạch đã đăng ký. Việc cập nhật báo cáo/checklist theo code không tự kéo theo sửa sổ Excel/Drive/ZIP hoặc đồng bộ hồ sơ nghiệp vụ. Khi spec thay đổi, áp dụng quy trình đồng bộ bên dưới; khi chủ dự án yêu cầu xuất/đồng bộ bộ báo cáo thì làm đúng phạm vi đó.
- Bộ kế hoạch, checklist và báo cáo học code chỉ lưu trong repo, quản lý bằng Git. Chỉ tải lên Drive hoặc xuất gói khi chủ dự án yêu cầu rõ; không coi đây là bước chờ phê duyệt.
- Giữ kiến trúc feature/module hiện hành; UI không tự gọi DB, state không giữ câu đã dịch, backend quyết định quyền. Dùng hướng dẫn cấu trúc trong bộ kế hoạch; không tự thêm framework, microservice hoặc package rỗng.
- Nếu một lát đã được giao và đủ điều kiện, tiếp tục phần việc đã được phép mà không hỏi duyệt lại từng bước kỹ thuật. Chỉ hỏi quyết định còn thiếu; ghi rõ phần bị chặn. Commit/push và triển khai theo phạm vi được chủ dự án cho phép.

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
