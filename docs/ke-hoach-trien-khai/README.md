# Kế hoạch triển khai và học code

DOC-082 · v1.0 · 01/10/2026 · DELIVERY-01. Mốc lập kế hoạch: `50d184a`; ưu tiên hiện hành: P0-1 nguồn cung và tìm dịch vụ, ngày 06/10/2026.

Đây là điểm vào công việc cho các phiên Codex tiếp theo. Kế hoạch phân rã thiết kế sẵn có thành các lát triển khai có thể kiểm chứng; không thay SRS, hợp đồng API hoặc quyết định nghiệp vụ. Những nhiệm vụ chưa làm là kế hoạch, không phải phê duyệt nhà cung cấp, chi phí hay production.

## Ưu tiên hiện tại: chức năng chính

Theo yêu cầu mới nhất ngày 06/10/2026, chuyển sang **nguồn cung và tìm dịch vụ → gửi/nhận việc và chat → hóa đơn/hoàn tất với tiền test**. Không làm hết mọi tiện ích B01 trước B02. [Bảng ưu tiên và tiêu chí từng gói](03-thu-tu-trien-khai.md) là thứ tự thực hiện cho các phiên tiếp theo.

Phần tài khoản đã push `a823d0e`. **P0-1 đang chuẩn bị, chưa có code partner/search.** [Đề xuất để duyệt một lần cho cả gói](de-xuat/P0-01-nguon-cung-va-tim-dich-vu.md) giải thích dữ liệu quản lý hồ sơ/công bố còn thiếu trong API và cách kiểm miễn phí trong DB test khi OTP Pending. Chưa tự thay spec hoặc trạng thái xác minh.

## Mở theo thứ tự

1. [Checklist chức năng](01-checklist.md): đang ở đâu, đã kiểm gì, phần còn thiếu, bước kế tiếp.
2. [Quy trình và cấu trúc code](02-quy-trinh-va-cau-truc.md): mỗi lớp chịu trách nhiệm gì; cách thực hiện một nhiệm vụ.
3. [Thứ tự triển khai](03-thu-tu-trien-khai.md): đầu vào, bước làm, đường dẫn dự kiến, điều kiện chuyển bước.
4. [Mẫu báo cáo](bao-cao/MAU-BAO-CAO.md): tạo báo cáo riêng sau mỗi chức năng lớn/lát bàn giao.
5. Đọc các báo cáo thực tế bên dưới để học code đã có.

Sơ đồ Mermaid nằm ngay trong từng file `.md`. Mở báo cáo bằng Markdown Preview có hỗ trợ Mermaid như các tài liệu khác của dự án; tab sửa văn bản hiển thị mã sơ đồ. Không cần các file nguồn/ảnh riêng. Nếu sơ đồ không hiện, kiểm lỗi cú pháp và trình xem hiện có trước khi cài thêm công cụ.

## Báo cáo đã có

| Lát bàn giao | Báo cáo | Phạm vi thực tế |
|---|---|---|
| Nền tảng + danh mục | [B00-01](bao-cao/B00-01-nen-tang-danh-muc.md) | App/API/DB, UI chung, navigation, log/test; không đóng toàn bộ B00 |
| Nền đa ngôn ngữ + lựa chọn local | [I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md) | VI/EN/JA cho các màn hiện có, mã lỗi, lưu locale; chưa dịch dữ liệu DB hoặc đồng bộ tài khoản |
| Khung giao diện cho chức năng hiện có | [B00-05](bao-cao/B00-05-khung-giao-dien.md) | Đạt local/native: avatar/header, danh mục, tài khoản; B00-05 còn khung các vai trò/nghiệp vụ khác |
| Danh mục đa ngôn ngữ + dữ liệu mở rộng | [I18N-04](bao-cao/I18N-04-danh-muc-da-ngon-ngu.md) | Đọc VI/EN/JA; bộ dữ liệu ban đầu đã thay bằng B02-01 bên dưới; tìm kiếm còn mở |
| Rà soát trùng nhóm/kỹ năng | [B02-01 — rà soát](bao-cao/B02-01-ra-soat-danh-muc.md) | Phân tích bộ cũ 50 nhóm/140 kỹ năng; dữ liệu đã được thay theo yêu cầu clear ở báo cáo kế tiếp |
| Thay bộ danh mục local | [B02-01 — dữ liệu mới](bao-cao/B02-01-thay-du-lieu-danh-muc.md) | Đã thay DB: 10 ngành, 39 nhóm, 128 kỹ năng; một nhóm mỗi kỹ năng; giữ nguyên auth |
| Sửa tên hiển thị | [B01-04](bao-cao/B01-04-ho-so-ten-hien-thi.md) | API/DB/app, version, retry an toàn và VI/EN/JA; B01-04 vẫn một phần |
| Phiên đăng nhập và sổ địa chỉ | [B01-04 — gói tài khoản](bao-cao/B01-04-phien-va-dia-chi.md) | Danh sách/thu hồi từng phiên; thêm/sửa/gỡ/mặc định địa chỉ; đạt local Android/iOS, đã push `4a98dc0` và CI đạt; chưa UAT |
| Thu hồi nhiều phiên và quay lại sau login | [B01-04/07 — bổ sung](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md) | Dùng API hiện có, thử lại phần chưa xác nhận, quay lại ba màn tài khoản; đạt 124 mobile, 8 web và native Android/iOS; đã push `a823d0e`; [CI 37428334396](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37428334396) đạt cả 3 jobs, chưa UAT |
| Tài khoản email/mật khẩu | [B01-01](bao-cao/B01-01-email-mat-khau.md) | Đăng ký/đăng nhập, refresh/logout local; không đóng toàn bộ B01 |

Báo cáo con tiếp theo dùng mã `Bxx-nn` hoặc `I18N-nn`; thêm vào bảng này và liên kết dòng checklist. Không sửa báo cáo cũ để biến kết quả của commit cũ thành bằng chứng cho commit mới. Nếu sửa báo cáo, giữ ngày/commit và ghi phần đính chính.

## Hiện trạng và công việc kế tiếp

- **Mốc 06/10/2026:** đã push I18N-04/B02-01 tại `1c80f67`; [CI 37398471842](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37398471842) đạt cả ba jobs (API/PostGIS, static/mobile, web E2E). Chủ dự án đã xác nhận bộ danh mục 10 ngành/39 nhóm/128 kỹ năng. Các mốc chưa push/CI dưới đây là lịch sử ngày 05/10.
- **B01-04 sửa tên hiển thị:** đã duyệt `Me.version` và implement ngày 06/10; [báo cáo học code](bao-cao/B01-04-ho-so-ten-hien-thi.md). API/app/web và native Android/iOS đạt local; sửa tên đã push `312972b` và CI đạt; gói phiên/địa chỉ mới xem mục Đợt gộp bên dưới. Hồ sơ/phiên/địa chỉ còn một phần. OTP vẫn Pending.

- Đã có danh mục DB thật và lát email/mật khẩu local, UI dùng chung, native navigation, log/test.
- CI của `50d184a` đã đạt: [Quality 36810424485](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36810424485). Native được kiểm riêng trên máy phát triển, không chạy trong CI Ubuntu này.
- I18N-01/02 đã đạt kỹ thuật local: 81 test mobile; 3 web hồi quy + 1 web i18n; native i18n/layout/auth đạt Android và iOS. Đã push ở `844e1d2`; [CI 37132800077](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37132800077) đạt cả 3 jobs. Chưa UAT. `AuthSession` giữ mã lỗi, UI dịch theo locale local; API `locale` vẫn chỉ nhận `vi`.
- **B01-02 OTP/xác minh: Pending** theo yêu cầu chủ dự án ngày 01/10/2026 vì cần cân nhắc chi phí. Hoãn cả bản local và gửi thật; chỉ mở lại khi chủ dự án yêu cầu. Không còn là lát tự động bắt đầu tiếp theo. I18N-03 vẫn cần chốt; I18N-04 được duyệt ngày 05/10; B00-05 đã bàn giao lát khung khách ngày 04/10/2026: 83 mobile, 5 web, 3 tooling và shell/auth/layout cả Android/iOS đạt; typecheck/lint/build đạt. Chủ dự án xác nhận bản hiện tại và yêu cầu push ngày 05/10; chưa UAT toàn app; khung các vai trò/nghiệp vụ còn lại vẫn mở.
- Chưa có nghiệm thu UAT toàn app, tài khoản/partner/công việc/chat/tài chính đầy đủ hoặc phát hành.

- B00-05 đã push ở `c120062` ngày 05/10/2026; [CI 37262885727](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37262885727) đã đạt cả 3 jobs (API/PostGIS, static/mobile, web E2E).
- I18N-04 đã được duyệt ngày 05/10, gồm mở rộng danh mục thật: xem [báo cáo](bao-cao/I18N-04-danh-muc-da-ngon-ngu.md). Đã kiểm local, chưa push/CI/UAT; tìm kiếm đa ngôn ngữ thuộc B03 còn mở.
- Rà soát bổ sung ngày 05/10 theo phản hồi chủ dự án: dữ liệu mở rộng còn nhóm chung chồng nhóm chuyên biệt và kỹ năng giao nhau về nghĩa. [Báo cáo rà đủ 140 kỹ năng](bao-cao/B02-01-ra-soat-danh-muc.md) phân biệt lỗi phân loại với lặp giữa màn ngành/nhóm. Sau đó chủ dự án yêu cầu clear và nạp bộ mới: đã thực hiện [thay dữ liệu local](bao-cao/B02-01-thay-du-lieu-danh-muc.md), kiểm DB/API/app; chưa CI/UAT.

## Đợt gộp B01-04 — 06/10/2026

Phần sửa tên đã push `312972b`; [CI 37402534136](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37402534136) đạt 3 jobs. Sau đó đã làm gói **phiên đăng nhập + sổ địa chỉ**: [báo cáo và thứ tự đọc code](bao-cao/B01-04-phien-va-dia-chi.md). 50 API, 106 mobile, web và Android/iOS đạt local. Gói đã push `4a98dc0`; [CI 37424414095](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37424414095) đạt cả 3 jobs. B01-04 còn một phần, chưa UAT, OTP Pending.

Đợt bổ sung đã push `a823d0e`: [thu hồi tất cả phiên khác và quay lại sau đăng nhập](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md). B02 đăng ký partner cần tài khoản đã xác minh nên còn phụ thuộc quyết định mở lại xác minh; không tự vượt điều kiện này.

Theo yêu cầu mới, một đợt có nhiều chức năng liên quan đủ điều kiện; không dừng sau từng thao tác nhỏ. Giữ checklist từng phần và một báo cáo chung cho đợt.

## Nguồn chuẩn cần tra

- [AGENTS.md](../../AGENTS.md): quy tắc làm việc mới nhất, bao gồm báo cáo sau chức năng lớn.
- [Backlog B00–B11](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [dữ liệu](../technical-design/01-data-design.md), [QA](../technical-design/03-qa-plan.md), [RTM](../technical-design/rtm.json).
- [Phạm vi UX](../../ui-ux/specs/ux-scope-current.md), [design system](../../ui-ux/specs/design-system.md), [rà soát luồng](../../ui-ux/specs/flow-review.md).
- [Sổ quản lý](../project-control/So-quan-ly-tai-lieu.xlsx) quản lý nguồn/ảnh hưởng/quyết định. Checklist này quản lý tiến độ code; hai vai trò khác nhau.

Các mô tả “native chưa chạy”, “B01 chưa triển khai” trong tài liệu mốc 28–29/09 là lịch sử. Dùng checklist và báo cáo gắn commit ở bộ này để biết tiến độ code hiện tại. Quy tắc đồng bộ toàn bộ tài liệu sau mỗi thay đổi code trong tài liệu cũ đã được thay bởi AGENTS.md ngày 30/09 và DELIVERY-01 ngày 01/10. Không dùng báo cáo triển khai để âm thầm đổi nghiệp vụ.

## Cách giữ tiến độ không bị quên

Mỗi phiên: đọc AGENTS → checklist → nhiệm vụ đang làm → spec liên quan → code thực tế. Chọn một đợt gồm các chức năng liên quan đủ điều kiện. Kết thúc lát: kiểm thử → tự review → viết báo cáo giải thích code → cập nhật checklist và mục lục báo cáo → bàn giao cho chủ dự án. Chỉ commit/push khi yêu cầu giao việc có cho phép; production/tiền thật luôn là quyết định riêng.

## Phạm vi lưu trữ bộ tài liệu

Theo yêu cầu chủ dự án ngày 01/10/2026, bộ kế hoạch/checklist/báo cáo chỉ lưu trong repo, quản lý bằng Git. Không đồng bộ Drive trừ khi có yêu cầu rõ. Markdown là nguồn hiện hành. Gói ZIP v1.0 là snapshot lịch sử lúc lập kế hoạch, không cập nhật theo tiến độ code và không dùng thay checklist hiện hành.
