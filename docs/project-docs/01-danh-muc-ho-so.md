# Hồ sơ phát triển dự án — Danh mục và kế hoạch v0.2

Ngày rà soát: 22/09/2026. Chủ dự án kiêm phát triển/vận hành; trợ lý hỗ trợ BA, UX, kiến trúc và QA. Đây là kế hoạch tài liệu và bản luồng để review, không phải phê duyệt công nghệ hoặc bắt đầu code sản phẩm.

## Kết quả rà soát thực tế

Nguồn hiện hành đã đồng bộ: BRD v0.2, PRD v0.3, FR/NFR v0.16, SRS v0.14, UX v0.24, wireframe v0.24, phạm vi UX v0.24, lộ trình v4. Có 14 User Flow, 53 màn/mốc đối chiếu, 32 tuyến chính, 5 sequence nghiệp vụ và bộ kiến trúc sơ bộ. Hồ sơ lịch sử giữ nguyên để tra cứu.

Sổ quản lý Excel là điểm vào; trạng thái Mới nhất nghĩa là tài liệu khớp quyết định hiện hành, không phải toàn bộ thiết kế đã được duyệt hoặc sản phẩm đã triển khai.

## Bộ tài liệu cần có

Một tài liệu có thể chứa nhiều phần bên dưới; không cần tạo nhiều file chỉ để đủ tên. Thứ tự ưu tiên theo phụ thuộc, không yêu cầu viết chi tiết vận hành trước khi chọn kiến trúc.

| Mã | Hồ sơ / phần cần có | Hiện trạng | Cần hoàn tất khi nào | Tiêu chí hoàn thành |
|---|---|---|---|---|
| D01 | Mục lục hồ sơ, kế hoạch, phạm vi và sổ quyết định | Bản này + Excel quản lý + Q01/Q02 | Ngay, cập nhật mỗi đợt | Mỗi đầu ra có nguồn, phiên bản, trạng thái, người chốt và phụ thuộc |
| D02 | BRD / PRD: vấn đề, khách hàng, giá trị, KPI, phạm vi | BRD v0.2 / PRD v0.3 đã đồng bộ | Trước chốt yêu cầu | Phân biệt đã chốt/đề xuất; không tự đặt KPI mới thay số đã đồng ý |
| D03 | FR / NFR + tiêu chí nghiệm thu | Có, một số NFR chưa định lượng | Trước phát triển module liên quan | Mỗi yêu cầu kiểm chứng được, có độ ưu tiên và ngoại lệ |
| D04 | SRS + use case + quy tắc nghiệp vụ + thuật ngữ | SRS v0.14 đã đồng bộ baseline | Trước baseline nghiệp vụ | Gỡ mâu thuẫn giữa đoạn cũ/mới, thống nhất tiền, quyền và trạng thái |
| D05 | User Flow / Activity nghiệp vụ | Mới soạn 14 luồng trong đợt này | Trước kiến trúc chi tiết | Tác nhân, mục tiêu, bàn giao, đường chính, lỗi và kết thúc rõ |
| D06 | Sitemap / Screen Flow / danh mục màn & trạng thái | 53 màn/mốc đối chiếu, 32 tuyến chính | Trước hoàn thiện UX | Mã màn, điểm vào/ra, điều kiện và đường quay lại; kiểm kê chi tiết còn tiếp tục |
| D07 | Wireframe + đặc tả màn + Design System/UI | Wireframe có; UI/Design System chưa hoàn chỉnh | Trước code giao diện từng nhóm | Field/validation/loading/rỗng/lỗi/quyền/mobile-web có chuẩn chung |
| D08 | Ma trận phân quyền và vòng đời trạng thái | Có trong bộ kiến trúc: ma trận quyền và vòng đời, Q01/Q02 đã cập nhật | Trước dữ liệu/API | Quyền theo tài nguyên và ngữ cảnh; mọi chuyển trạng thái có tác nhân/điều kiện |
| D09 | Kiến trúc tổng thể + ADR quyết định kỹ thuật | Có kiến trúc sơ bộ và ADR; Q03 đã chốt | Sau luồng, trước code nền | Sơ đồ hệ thống/module, phương án chọn/bỏ, chi phí và giới hạn |
| D10 | ERD + từ điển dữ liệu + phân loại/lưu giữ dữ liệu | Có thiết kế ERD vật lý và DDL tham chiếu v0.1; migration chưa chạy, retention chưa chốt | Trước migration/API | Khóa, ràng buộc, chủ thể sở hữu, dữ liệu nhạy cảm, lưu/xóa và lịch sử |
| D11 | API/realtime contract + Sequence Diagram | Có sequence và OpenAPI/realtime v0.1 để review; chưa có backend | Trước tích hợp client/backend | Request/response/lỗi, quyền, idempotency, sự kiện, retry và cạnh tranh |
| D12 | Thiết kế tài chính: sổ giao dịch, đối soát, bất biến | Có thiết kế sơ bộ giữ/quyết toán và bất biến, chưa kiểm chứng backend | Trước lập trình ví/point | Không ghi trùng; nguyên tử; nhiều việc; đối soát; chứng minh công thức |
| D13 | Thiết kế tích hợp | Chưa chọn nhà cung cấp | Trước module liên quan | OTP, bản đồ, push, gọi, ảnh, ngân hàng: hợp đồng dữ liệu, lỗi, chi phí |
| D14 | Kế hoạch phát triển / backlog / Definition of Done | Có backlog v0.1 theo lát chức năng; chưa triển khai | Sau kiến trúc sơ bộ | Mỗi đầu việc có đầu ra, phụ thuộc và kiểm chứng; không cần tự áp deadline |
| D15 | QA strategy, test case, RTM, UAT & báo lỗi | Có kế hoạch QA/RTM/UAT v0.1; các ca sản phẩm chưa chạy | Soạn trước code, chạy theo từng đợt | FR → màn/API → test → bằng chứng; tiền/quyền/cạnh tranh có test riêng |
| D16 | Deployment, CI/CD, cấu hình, backup/restore, monitoring | Chưa có | Thiết kế khi chọn hạ tầng; kiểm chứng trước ra mắt | Tái tạo môi trường, rollback, phục hồi và cảnh báo chạy được |
| D17 | Sổ vận hành admin, sự cố, hỗ trợ và đối soát | Có mô tả tác vụ; chưa có runbook hoàn chỉnh | Trước pilot/giao dịch thật | Cách nhận/xử lý/escalate, giờ 08–22h, kiểm soát quyền và bằng chứng |
| D18 | Hồ sơ ra mắt: UAT sign-off, checklist, hướng dẫn, chính sách | Chưa có | Trước mở công khai | Chủ dự án chấp nhận rủi ro còn lại; hướng dẫn khách/partner/admin, điều khoản và quyền riêng tư được rà soát phù hợp |

## Trình tự làm chủ động

1. Baseline tài liệu đã đồng bộ: yêu cầu, UX, luồng và kiến trúc sơ bộ.
2. Tiếp: review bộ kỹ thuật v0.1 và chốt các điểm mở; hoàn thiện Design System/đặc tả trường.
3. Chọn tích hợp/hạ tầng khi có ngân sách; xử lý Q02 trước tiền thật.
4. Chuẩn bị phát triển: backlog theo lát chức năng, test plan và môi trường/CI. Không code sản phẩm chỉ vì đã duyệt wireframe.
5. Phát triển: mỗi lát cập nhật API/schema/test/runbook; kiểm tra liên kết tài liệu, không đợi chủ dự án hỏi mới thêm.
6. Ra mắt: UAT, kiểm tra bảo mật, phục hồi dữ liệu, đối soát tiền, vận hành và checklist công khai. Mong muốn mở công khai không thay thế tiêu chí sẵn sàng.

## Cách quản lý thay đổi từ nay

Mỗi đợt báo rõ: đã làm, cần review, chưa làm, tài liệu bị ảnh hưởng và bước tiếp theo. Quyết định nghiệp vụ ảnh hưởng tiền/quyền/phạm vi phải đưa ra cùng một nhóm câu hỏi; sau khi thống nhất mới cập nhật một lượt. Lựa chọn kỹ thuật thường lệ có thể đề xuất chủ động nhưng phải ghi là đề xuất trước khi được chọn. Không gọi tài liệu hoàn chỉnh nếu mới là khung hoặc mới kiểm tra happy path.

Nguồn ưu tiên: quyết định mới nhất của chủ dự án → đặc tả đã đồng bộ → wireframe minh họa. Khi có xung đột ghi vào danh sách chênh lệch, không âm thầm coi hành vi prototype là yêu cầu sản phẩm.

## Những điểm cần xử lý, chưa cần hỏi lại quy tắc đã chốt

- Chỉ mở đánh giá hai chiều khi khách báo đã thanh toán, thợ xác nhận nhận tiền và hóa đơn đã quyết toán thành công. Admin hoàn tất thay không phải xác nhận của thợ.
- Khoản giữ treo, hủy/đảo/điều chỉnh tiền vẫn pending; bắt buộc thiết kế cách xử lý qua báo cáo/admin trước khi chạy tiền thật (Q02). Anh/Nhật, chuyển chủ/đóng doanh nghiệp và mục 10/15/16/17 tiếp tục tạm hoãn.
- NFR tải/hiệu năng, SLA, retention, giới hạn upload/OTP chưa có số đủ triển khai: đưa phương án khi thiết kế kiến trúc, không tự coi “chưa cần” là không cần kiểm thử.
- Nhiều tài khoản/doanh nghiệp, điều hướng từ thông báo, các quyền nhân viên phải bổ sung ma trận kiểm chứng; prototype chưa chứng minh bảo mật thật.
- Báo cáo funnel và nhật ký/đối soát tổng thể còn thiếu. Không chuyển chúng sang “đã xong” khi mới có màn.
- Không triển khai bản dịch Anh/Nhật đợt hiện tại; vẫn lưu yêu cầu mở rộng. Các mục pending 10/15/16/17 giữ nguyên, trừ nhánh hoàn tất thay thợ đã được chốt.
- Xóa tài khoản còn sở hữu doanh nghiệp và việc hủy sau hóa đơn khóa vẫn có phụ thuộc pending; phải xử lý điều kiện ra mắt trước giao dịch thật.

## Nguồn chính

- [Thư mục dự án](https://drive.google.com/drive/folders/1msYKneD2-9yZMUXU0qlWQjzrCVE9gcO7)
- [SRS](https://docs.google.com/document/d/1ROapXbzOCYXFDC7k5slkdr_wMZK7OjC4JbXgxKEgOY0/edit)
- [FR/NFR](https://docs.google.com/spreadsheets/d/10Xf7khG6wgyp0GaGnnNYqUY3lkpktdoHGRynyXmnVNM/edit)
- [UX hiện hành v0.24](https://docs.google.com/document/d/1XnVHJUShqHMsQ0bi-LSO2ulMSXePL7uIqtVEb0867iQ/edit)
- [Wireframe v0.24](http://127.0.0.1:8765/)


## Baseline đồng bộ 22/09/2026

- Q01: Chỉ mở đánh giá hai chiều khi khách báo đã thanh toán, thợ xác nhận nhận tiền và hóa đơn đã quyết toán thành công. Admin hoàn tất thay không phải xác nhận của thợ.
- Q02: Khoản giữ treo, hủy/đảo/điều chỉnh tiền vẫn pending; bắt buộc thiết kế cách xử lý qua báo cáo/admin trước khi chạy tiền thật (Q02). Anh/Nhật, chuyển chủ/đóng doanh nghiệp và mục 10/15/16/17 tiếp tục tạm hoãn.
- Q03 đã chốt bộ công nghệ; Q04 chưa có ngân sách.
- Không coi hồ sơ hiện hành là hoàn tất OpenAPI, DDL, QA sản phẩm hay runbook Q02.
- [Sổ quản lý Excel](https://docs.google.com/spreadsheets/d/18eWx9ObcWbpRNSIsxKs7YTwBpR-ZPjQq/edit)

## Thiết kế kỹ thuật v0.1

Đã có baseline BRD/PRD/FR-NFR/SRS/UX, các luồng và wireframe. Q03 đã chốt: Expo/React Native, React, NestJS, PostgreSQL/PostGIS. Đã soạn thiết kế kỹ thuật v0.1 gồm ERD vật lý/DDL tham chiếu, OpenAPI/realtime, kế hoạch QA/RTM/UAT và backlog; thiết kế ngoài Đợt 1 vẫn chờ review; backend danh mục local đã triển khai 28/09 theo DOC-065, chưa native/remote CI/production. Còn Design System/đặc tả field, runbook CI/CD/backup, runbook Q02 và tích hợp/dự toán. Q04 chưa có ngân sách; không tự chọn gói trả phí.

[Mở bản trực quan](http://127.0.0.1:8765/technical-design.html#overview). Nguồn ở outputs/technical-design; sổ Excel liên kết PLAN-001/002/003/008.
