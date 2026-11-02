# UX-01 — Kế hoạch tối ưu luồng, màn hình, nút và tải dữ liệu

**Quyết định mới ngày 02/11/2026:** chủ dự án duyệt bản thiết kế HTML và yêu cầu áp dụng giao diện vào code, kiểm thao tác mượt. [B00-15](../bao-cao/B00-15-toi-uu-trai-nghiem.md) ghi kết quả và giới hạn thực tế. Không suy ra duyệt D01–D04 từ việc duyệt bố cục; giữ contract hiện hành.

Ngày lập: **31/10/2026**. Trạng thái: **Đề xuất, chờ chủ dự án duyệt triển khai**.

> **Đính chính sau phản hồi của chủ dự án:** đây là kế hoạch sơ bộ từ code và báo cáo B00-14, chưa phải kết luận kiểm hết nút native. Chủ dự án đã giao thực hiện rà soát Android/iOS trên `dvqb_local` trước khi chốt sửa. Đợt rà soát đang thực hiện; ưu tiên và thiết kế bên dưới vẫn là đề xuất cho tới khi đối chiếu bằng chứng. Chưa được duyệt triển khai giao diện/API từ việc duyệt kiểm thử này.

## 1. Kết quả người dùng sẽ nhận được

Mở một màn là biết đang ở bước nào, cần làm gì tiếp theo; thao tác quan trọng dễ tìm, thao tác phụ gọn hơn; dữ liệu cập nhật không làm mất nội dung đang đọc hoặc đang nhập. Giữ nguyên quy tắc tiền, Point, quyền và trạng thái nghiệp vụ đã chốt.

Kế hoạch gồm **một đợt UX-01**, triển khai theo các gói trọn luồng ở mục 6. Không bàn giao rời từng nút. Phạm vi chính: app Android và iPhone/iOS, mọi vai trong B00-14. Quản trị web chỉ kiểm hồi quy khi dùng chung API; thiết kế lại web không nằm trong đợt này.

- [Danh mục rà soát màn và nút](UX-01-danh-muc-man-va-nut.md): đề xuất cụ thể theo nhóm, kèm đủ 135 mục của báo cáo để truy vết.
- [B00-14 — báo cáo đang có](../bao-cao/B00-14-bao-cao-man-hinh.html): ảnh và hướng dẫn trước thay đổi.
- [Bằng chứng và giới hạn B00-14](../bao-cao/B00-14-bao-cao-man-hinh.md), [dữ liệu vận hành B00-13](../bao-cao/B00-13-du-lieu-van-hanh-local.md).

Đây là kế hoạch thực hiện, chưa phải chứng nhận đã sửa hoặc đã kiểm native lại. Không sửa app, API, DB trong lượt lập kế hoạch.

## 2. Căn cứ và cách đọc mức độ chắc chắn

B00-14 kiểm kê 27 route, 135 màn/tab/trạng thái, 9 luồng; có 243 ảnh native, 110 mục có cả Android và iOS, 133 mục có ít nhất một ảnh. Không hiểu 135 mục là 135 màn độc lập. Bảy nhóm vai: khách chưa đăng nhập, khách thuê, chủ hồ sơ, nhân viên, nhân viên có quyền quản lý, quản trị viên và tài khoản bị hạn chế. Quyền quản trị phải tách tiếp theo quyền thực tế, không chỉ thử tài khoản toàn quyền.

| Quan sát | Nguồn đã đọc | Ý nghĩa cho kế hoạch |
|---|---|---|
| Nút nhận việc nằm sau khối hỗ trợ/liên hệ/lịch sử đánh giá | `JobDetailScreen.tsx`, ảnh `android-owner-job-requested.png` trong B00-14 | Đưa hành động theo trạng thái lên gần tóm tắt việc |
| Nhãn trạng thái việc luôn dùng màu thành công | `JobDetailScreen.tsx`, `job-state` | Dùng chữ + màu phù hợp từng trạng thái; không sửa state máy chủ |
| Hóa đơn chờ cả ảnh, Point/ví, lịch sử rồi mới cập nhật nội dung | `InvoiceScreen.tsx`, `useFocusEffect` | Tách tải chính/phụ, nhưng giữ điều kiện tài chính trước khi gửi |
| Đổi bộ lọc/sắp xếp tìm kiếm xóa kết quả; nút Áp dụng chỉ đóng hộp lọc | `SearchScreen.tsx`, effect `search.reset`, `search-filters-apply` | Cần một quy tắc nhất quán: áp dụng là chạy tìm kiếm, hủy là bỏ lựa chọn nháp |
| Danh sách việc xóa khi làm mới; lịch đọc hết trang | `JobsScreen.tsx`, `loadCalendarJobs` | Giữ kết quả trong cùng phạm vi; đề xuất API lịch theo khoảng ngày |
| Chat đọc hết trang trước khi hiện; nội dung đổi là cuộn cuối | `ConversationScreen.tsx` | Đề xuất lấy tin gần nhất trước; giữ vị trí khi đọc tin cũ |
| Quản trị có nút lớn liên tiếp, mã quyền/mã tài nguyên thô | `P2Desk.tsx`, `BackofficePanel.tsx`, `AdminFinance.tsx` và ảnh B00-14 | Nhóm điều hướng, dùng tên dễ hiểu, mã là thông tin tra cứu |
| Một số nhóm nút hóa đơn trong catalog báo cáo dùng chung giữa các trạng thái | `scripts/review/screen-catalog.mjs`, JSON B00-14, điều kiện render trong `InvoiceScreen.tsx` | Báo cáo cập nhật phải phân biệt nút hiện tại, nút bước sau, nút không có quyền |

ANR Android và một timeout truy vấn quản trị từng xuất hiện trong đợt chụp. Chưa đủ bằng chứng kết luận nguyên nhân là SQL, thiếu index hay React. Gói 0 sẽ đo lại trước khi đề xuất sửa hiệu năng DB. Lỗi Point làm hỏng tải hóa đơn đã được sửa trong B00-14, chỉ giữ kiểm hồi quy.

`CatalogCategory` chưa rõ điểm vào từ luồng mới; cuộc gọi chưa có bằng chứng native hai đầu trong B00-14. Không tự xóa route hoặc tuyên bố gọi đã đạt.

### Bổ sung từ lượt native 31/10–01/11/2026 — chưa đóng gói 0

Xem [kết quả audit](UX-01-ket-qua-ra-soat-native.md) và [bảng lọc bằng chứng từng mô tả nút](../bao-cao/UX-01-kiem-nut-native.html). Đây là nguồn mức kiểm mới; các đề xuất phía dưới không tự chuyển thành kết luận đã xác nhận.

- Đã tái hiện đổi sắp xếp Đánh giá làm mất kết quả và Áp dụng bán kính còn cần bấm tìm lại trên cả Android/iOS. Đề nghị ưu tiên gói 2 sau gate kiểm chứng.
- Luồng nhận việc, lưu/gửi/sửa hóa đơn và hai dấu thanh toán trên cả Android/iOS đã có thao tác native + đối chiếu `dvqb_local`. Giữ nghiệp vụ; đề xuất bố cục không có nghĩa các nút này bị lỗi.
- Ảnh Android cho thấy Nhận việc đứng sau các thao tác phụ, nhưng vẫn nhìn thấy trên viewport đã kiểm. Không kết luận nút bị che hoặc bắt buộc phải cuộn nhiều lần. Đã thấy Chờ phản hồi và Đã từ chối cùng nền xanh; chỉnh cách phân biệt là đề xuất trình bày.
- Màn gọi iOS đã xuất hiện cảnh báo render chữ ngoài `<Text>` (O02); cần chẩn đoán/sửa riêng khi được duyệt và kiểm lại đủ trạng thái. Ca hai đầu chưa đạt, không dùng lỗi công cụ Android để kết luận lỗi app.
- Đã kiểm riêng nhân viên chỉ có `jobs.manage`; tài khoản nhân viên có toàn quyền trong B00-14 là quản lý, không đại diện mọi nhân viên.
- Mở form đội ngũ/ví/quản trị chưa chứng minh lưu thành công. Nhóm quyền admin, cuộc gọi, lỗi mạng, chữ lớn, baseline hiệu năng và mọi ô chưa kiểm trong bảng vẫn là phần việc còn thiếu. Không dùng ảnh hoặc số lần tap để đóng gói 0.

## 3. Giới hạn và quyết định cần duyệt cùng kế hoạch

### Phần bố cục và triển khai

- Giữ thiết kế B00-10/B00-11 đã áp dụng, cấu trúc feature/module, React Native/Expo + TypeScript, NestJS/PostgreSQL; không thêm framework hoặc package chia sẻ rỗng.
- Nút gọi API qua lớp hiện hành; backend quyết định quyền. Không tự cấp quyền, đổi công thức tiền/Point hoặc thêm bước nghiệp vụ bắt buộc.
- Giữ mã chống gửi trùng, phiên bản bản ghi, kiểm phiên đăng nhập, xử lý mất quyền và dấu thanh toán hai phía.
- Không xóa nút chỉ để màn ngắn hơn. Mỗi nút cần quyết định: giữ, đổi vị trí, đổi nhãn, giảm độ nổi bật, đưa vào nhóm thao tác, hoặc chỉ hiện khi phù hợp.
- Không thêm xác nhận cho mọi thao tác. Tìm kiếm, lọc và điều hướng phải nhanh; xác nhận tập trung vào tiền, cấp/thu hồi quyền và hành động khó đảo ngược.
- Giữ điểm vào hỗ trợ cho tài khoản bị hạn chế. Mã dự phòng, token và dữ liệu riêng không vào ảnh/báo cáo.
- Không mở PROMO-02, production, nhà cung cấp trả phí, ngân hàng thật; không commit/push/deploy nếu chưa được giao riêng.

### Các bổ sung API cần chốt, không coi là đã duyệt

| Mã | Đề xuất contract | Hành vi cần giữ | Nếu chưa duyệt |
|---|---|---|---|
| D01 | Bổ sung `scheduled_from`, `scheduled_before` dạng thời điểm ISO cho `GET /jobs`, khoảng đầu gồm/cuối không gồm | Giờ hiển thị nghiệp vụ Việt Nam; giữ phân quyền khách/thành viên; cursor gắn toàn bộ bộ lọc và actor; không cắt mất việc ở trang sau; client cũ vẫn hoạt động | Giữ tải đủ lịch hiện hành; chỉ cải thiện phản hồi chờ, không giả lịch đầy đủ từ trang đầu |
| D02 | Bổ sung chế độ lấy trang tin gần nhất và `before_sequence` cho `GET /conversations/{id}/messages` | `after_sequence` tiếp tục phục hồi tin mới; không dùng đồng thời before/after; xác định thứ tự trả về, cursor, giới hạn và mốc đánh dấu đã đọc | Giữ API cũ; vẫn sửa cuộn, giữ bản nháp, tách tải nền; không báo đã tối ưu tải lịch sử |
| D03 | Nhóm “Cần tôi xử lý”/“Sắp đến lịch” chỉ triển khai nếu API lọc đầy đủ theo actor, quyền, trạng thái liên quan | Không lọc trang đầu rồi trình bày như toàn hệ thống; không coi nhân viên là chủ hồ sơ | Đợt đầu dùng bộ lọc trạng thái API đã hỗ trợ; nhãn thời gian chỉ mô tả các mục đang hiển thị |
| D04 | Tên người/cơ sở trên danh sách admin lấy từ trường được phép hoặc bổ sung projection tối thiểu sau review quyền | Không gọi chi tiết từng dòng để lấy tên; không mở rộng dữ liệu cá nhân cho vai thiếu quyền | Dùng thông tin hiện có + mã rút gọn có sao chép, không dựng tên giả |

D01–D04 là phương án đề xuất để chủ dự án duyệt cùng phạm vi, không phải yêu cầu dừng hỏi từng thao tác kỹ thuật. Phần độc lập vẫn triển khai sau khi kế hoạch được duyệt. Nếu chốt contract khác, ghi quyết định trước khi sửa nguồn API/QA; không tự đồng bộ Google Drive hoặc `ui-ux`.

## 4. Quy tắc bố cục và nút dùng xuyên suốt

1. **Một hành động chính cho bước hiện tại.** Nếu màn chỉ chờ đối tác thì nói rõ đang chờ, không tạo nút chính giả. Hai lựa chọn loại trừ nhau không nhất thiết cùng màu nổi bật.
2. **Nút có động từ và đối tượng.** Ví dụ “Gửi yêu cầu dịch vụ”, “Lưu thông tin”, “Gửi yêu cầu rút”, “Xác nhận đã nhận đủ tiền”; tránh một loạt nút “Gửi”, “Lưu”, “Xác nhận” không rõ đối tượng.
3. **Thứ tự ổn định khi tải nền.** Không chèn nút mới ngay dưới ngón tay đang bấm; không tự ghi đè form đang sửa khi sự kiện cập nhật tới.
4. **Giải thích điều kiện ngay tại nhóm thao tác.** Thiếu ảnh, tài khoản ngân hàng, lý do, tiền khả dụng hay xác thực phải có lời nhắc cụ thể. Lỗi trường đặt cạnh trường; lỗi toàn màn có hướng xử lý.
5. **Phân biệt ba thao tác:** “Tải lại dữ liệu” là đọc; “Thử lại thao tác” dùng cùng mã yêu cầu chưa rõ kết quả; “Gửi yêu cầu mới” là một ý định mới. Không gộp thành cùng một nút retry.
6. **Bấm được trên cả hai nền tảng.** Dùng quy tắc dự án: nút chính tối thiểu 48, điều khiển nhỏ tối thiểu 44 đơn vị giao diện; chữ/icon có nhãn trợ năng. Nút `Button` hiện đã có minHeight và trạng thái busy/disabled, tái sử dụng trước khi thêm component.
7. **Thao tác nguy hiểm tách khỏi thao tác phổ biến.** Từ chối/rút/dừng/gỡ/thu hồi có nhãn cụ thể và giữ bước lý do/xác nhận hiện hành. Không biến công tắc chọn quyền thành lưu tự động.
8. **Thanh thao tác cuối màn chỉ dùng khi có lợi.** Thử ở công việc và hóa đơn; tránh chồng thanh tab, bàn phím và nội dung. Với chữ lớn/nội dung dài, cho bố cục tự giãn hoặc dùng vị trí trong luồng cuộn.
9. **Quay lại đúng nguồn.** Back Android, vuốt quay lại iOS và mũi tên cùng kết quả; danh sách giữ lọc/vị trí trong cùng tài khoản và hồ sơ. Đổi tài khoản/quyền thì xóa dữ liệu không còn được phép.

Luồng minh họa sau tối ưu:

| Bước | Nội dung đầu màn | Hành động chính đề xuất | Thao tác phụ |
|---|---|---|---|
| Người cung cấp nhận yêu cầu | Ai thuê, dịch vụ, lịch/địa điểm, chờ tiếp nhận | Nhận việc, mở form ETA nếu cần | Trao đổi; từ chối có lý do; hỗ trợ |
| Người thực hiện lập hóa đơn | Công việc, tổng chi phí và điều kiện còn thiếu | Gửi hóa đơn khi hợp lệ | Lưu nháp; ảnh kết quả; hỗ trợ |
| Khách xem hóa đơn đã gửi | Tổng tiền, Point, tiền trực tiếp, giải thích việc xác nhận | Xác nhận hóa đơn | Yêu cầu sửa; chi tiết ảnh/chi phí |
| Khách đã xác nhận | Số tiền trực tiếp và hai dấu thanh toán tách biệt | Báo đã thanh toán khi đủ điều kiện | Trao đổi; hỗ trợ |
| Người thực hiện nhận tiền | Số tiền, dấu khách báo trả, ô xác nhận đã nhận đủ | Xác nhận nhận tiền/hoàn tất theo quyền API | Chi tiết; hỗ trợ |
| Công việc hoàn tất | Kết quả, thời gian, trạng thái hai dấu | Đánh giá ở điểm vào có sẵn nếu được phép | Xem hóa đơn; liên hệ/hỗ trợ theo quyền |

Không dùng bảng minh họa thay điều kiện render/API. Trường hợp admin hoàn tất thay vẫn giữ riêng dấu xác nhận nhận tiền của người thực hiện.

## 5. Kiến trúc thay đổi

Giữ chuỗi hiện hành: **màn hình → hook/state trong feature → AuthSession/lớp API → NestJS kiểm quyền → PostgreSQL**.

| Phần | Input | Output / trách nhiệm |
|---|---|---|
| Model trình bày hành động việc | Job + `allowed_actions` + actor + trạng thái gửi | Thứ tự, nhãn, nhóm và lý do khóa nút; không tự suy ra quyền mới |
| Bộ tải hóa đơn theo phần | owner, job ID, generation, snapshot/version hiện có | job/invoice chính; ảnh; Point/ví; lịch sử có loading/error riêng; `canSubmit` phụ thuộc dữ liệu tài chính và phiên bản |
| Trạng thái danh sách | actor/hồ sơ + bộ lọc đã áp dụng + cursor | Dữ liệu và vị trí theo đúng scope; phân biệt tải đầu/cập nhật/tải thêm/lỗi |
| Trạng thái chat | conversation + actor + mốc tin mới/cũ + bản nháp | Không trùng/thiếu tin, giữ vị trí đọc, gửi/thử lại an toàn |
| Khối nút dùng chung | label, variant, busy/disabled, accessibility/test ID | Tương tác và cách biểu thị nhất quán; không chứa nghiệp vụ riêng |

Đề xuất tạo file chỉ khi gói tương ứng bắt đầu: `features/jobs/state/job-presentation.ts`, `features/invoices/state/use-invoice-data.ts`, các khối `features/invoices/components/InvoiceSummary.tsx`, `InvoiceActions.tsx`, `InvoiceHistory.tsx`. Tên có thể điều chỉnh trong review thiết kế; không tạo trước thư mục/package rỗng. Kiểm thử đi cùng file mới và đăng ký inventory.

## 6. Thứ tự thực hiện và tiêu chí kết thúc từng gói

**Điều chỉnh sau audit:** giữ số gói để truy vết; thứ tự đề nghị là gói 0 → gói 2 → gói 1 → các gói còn lại theo bằng chứng/phụ thuộc. Gói 0 hiện chưa hoàn tất, nên chưa chốt triển khai toàn đợt.

### Gói 0 — Chốt ma trận nút và đo mốc ban đầu

**Đầu vào:** B00-14, danh mục kèm kế hoạch, source hiện hành và tài khoản seed trong `dvqb_local`.

1. Ghi trạng thái Git/diff; giữ nguyên việc AWS/seed/báo cáo đang có. Chạy SDD prepare, mở mọi lỗi phạm vi trước khi sửa.
2. Đối chiếu 135 mục: route, vai, trạng thái, nút thấy được, nút bị khóa/lý do, kết quả bấm và đường quay lại. Kiểm riêng nhân viên không quyền và các admin theo quyền.
3. Đo cùng tài khoản/dữ liệu trên từng nền tảng: mở công việc, hóa đơn, lịch, chat dài, danh sách admin. Mỗi tình huống 5 lần mở mới và 5 lần quay lại; ghi trung vị, giá trị lớn nhất, số request và số lần cuộn tới hành động chính. Không gọi 5 mẫu là chứng minh p95.
4. Thử API chậm/lỗi bằng công cụ kiểm soát mạng local và unit test; không sửa dữ liệu đang dùng để gây lỗi. Ghi lỗi chưa tái hiện, không gán nguyên nhân.
5. Chốt bản phác bố cục ngay trong báo cáo repo cho công việc, hóa đơn, tìm kiếm, quản trị. Dùng nguyên tắc đã duyệt, không mở vòng phê duyệt từng pixel.

**File:** `scripts/review/screen-catalog.mjs`, `capture-native.mjs`, `check-report.mjs`, `apps/mobile/src/app/navigation/routes.ts`, các source trong phụ lục.

**Đầu ra:** bảng nút trước/sau và baseline đo có ngày/nền tảng/data scope; D01–D04 được ghi rõ trạng thái. Mỗi mục có kết luận giữ/cải thiện/chưa đủ bằng chứng. Chỉ kiểm kê đủ không được ghi thành đã bấm thử đủ.

### Gói 1 — Công việc → hóa đơn → xác nhận và tải dữ liệu

**Ưu tiên sau gói tìm/lọc đã tái hiện; thứ tự đề xuất chưa phải phê duyệt triển khai. Phụ thuộc:** gói 0; không phụ thuộc D01/D02.

**File chính:** `apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx`, `features/jobs/components/JobFeedback.tsx`, `features/jobs/state/mutation.ts` (giữ contract), `features/invoices/screens/InvoiceScreen.tsx`, các file tách ở mục 5, `components/ui/Button.tsx`, `theme/tokens.ts`, từ điển `lib/i18n/` liên quan.

1. Bổ sung kiểm hành vi trước thay đổi tại `features/jobs/screens/Work.test.tsx` và `features/invoices/screens/InvoiceScreen.test.tsx`: quyền theo từng vai; ảnh/lịch sử lỗi không chặn nội dung chính; Point lỗi khóa xác nhận nhưng cho xem; cập nhật tới khi đang nhập không mất nháp; retry giữ cùng payload/key.
2. Tách model sắp xếp nút khỏi JSX; trạng thái có chữ/màu đúng nghĩa, hành động chính theo dữ liệu backend. Đưa Nhận việc và mở hóa đơn vào vùng dễ thấy; giữ support và các thao tác phụ tìm được.
3. Tải job/invoice làm nguồn chính. Tải ảnh độc lập theo giới hạn đồng thời hợp lý; lỗi ảnh riêng. Chỉ tải ledger khi mở lịch sử. Point/ví có trạng thái “chưa biết” riêng, không dùng số 0 thay cho lỗi.
4. Giữ generation/session/version khi dữ liệu về trễ; xóa dữ liệu riêng khi logout/mất quyền. Chỉ giữ nội dung cũ khi cùng scope và vẫn được phép đọc.
5. Tách tóm tắt tiền, ảnh/ghi chú, hành động, lịch sử. Nút gửi có tên cụ thể; thiếu ảnh/lý do/Point hiển thị cạnh nhóm tương ứng.
6. Chạy trọn luồng trên `dvqb_local` với bản ghi seed được chọn: nhận việc → nháp → gửi → yêu cầu sửa → gửi lại → xác nhận → báo trả → nhận đủ → hoàn tất. Nhánh từ chối/rút/dừng/phân công và admin hoàn tất thay kiểm riêng theo dữ liệu hiện hành.

**Đạt khi:** nút chính thấy trước phần phụ trên kích thước chụp chuẩn; ảnh/lịch sử lỗi vẫn đọc được tóm tắt; thiếu dữ liệu tiền không gửi được; bấm hai lần/mất phản hồi không ghi hai lần; thông báo trạng thái hai bên đúng; cả Android/iOS có ảnh và kết quả thao tác.

### Gói 2 — Tìm dịch vụ → lọc → hồ sơ → gửi yêu cầu

**File:** `features/search/screens/SearchScreen.tsx`, `features/search/state/partner-search.ts`, `features/search/components/ServiceFilter.tsx`, `features/location/components/LocationField.tsx`, `features/partners/screens/PartnerProfileScreen.tsx`, `features/jobs/screens/JobCreateScreen.tsx`.

1. Tách lựa chọn lọc nháp khỏi điều kiện đang dùng. “Áp dụng” xác nhận bộ lọc và tìm lại; “Hủy” giữ điều kiện cũ; chọn sắp xếp chạy lại với cùng truy vấn hợp lệ. Thiếu địa điểm thì hướng tới trường cần bổ sung.
2. Hiển thị bộ lọc đang áp dụng và nút xóa lọc; xác định rõ xóa lọc chỉ reset bán kính/hình thức/xác minh hay cả nhu cầu/địa điểm. Đề xuất giữ nhu cầu và địa điểm, đưa bán kính/hình thức/xác minh về mặc định.
3. Giữ kết quả cũ khi cập nhật có nhãn đang cập nhật; không cho trang cũ ghép vào truy vấn mới. Bỏ phản hồi về trễ. Phân biệt không tìm thấy, lỗi mạng và chưa tìm.
4. Một điểm nhấn Gửi yêu cầu trong hồ sơ, Liên hệ phụ; ảnh/đánh giá không che mất hành động chính. Form thuê có tóm tắt dịch vụ/địa điểm/giờ trước khi gửi; không thêm màn xác nhận bắt buộc nếu không cần.
5. Bộ chọn địa điểm: Xác nhận trả kết quả về đúng màn nguồn, Hủy/Back giữ dữ liệu trước; khi từ chối định vị vẫn cho nhập địa chỉ.

**Kiểm:** `partner-search.test.ts`, `ServiceFilter.test.tsx`, `LocationField.test.tsx`, `Partners.test.tsx`, `Work.test.tsx`; hành trình `tests/e2e/web/search-service.spec.mjs`, `search-map.spec.mjs`, `jobs-chat.spec.mjs`; native lọc/hủy/đổi sort/quay lại và gửi một yêu cầu.

**Đạt khi:** Áp dụng không yêu cầu bấm thêm kính lúp; Hủy không đổi kết quả; đổi sort không để danh sách trống vô cớ; không mất query/scroll khi quay từ hồ sơ; địa chỉ không rò sang tài khoản khác.

### Gói 3 — Danh sách việc, lịch, chat và thông báo

**File:** `features/jobs/screens/JobsScreen.tsx`, `features/jobs/state/calendar.ts`, `features/jobs/components/JobCalendar.tsx`, `features/chat/screens/ConversationScreen.tsx`, `features/notifications/screens/NotificationsScreen.tsx`, `app/providers/RealtimeProvider.tsx`.

1. Tách tải đầu/cập nhật/tải thêm; giữ danh sách khi refresh cùng scope. Dùng bộ lọc trạng thái backend hiện có; giữ tab/ngày/vị trí khi mở chi tiết rồi quay lại.
2. Nếu D01 được duyệt: thêm DTO/validation, truy vấn, cursor scope tại `services/api/src/modules/jobs/`, cập nhật client `features/jobs/api/jobs-api.ts`; kiểm ranh giới ngày/tháng theo giờ Việt Nam, việc đổi lịch ra/vào khoảng, quyền nhân viên và nhiều trang. Giữ cách cũ khi chưa có contract.
3. Nếu D02 được duyệt: thêm lựa chọn trang gần nhất/đọc lùi tại `services/api/src/modules/chat/`, client `features/chat/api/`; trang mới/cũ không trùng và không bỏ sót khi có tin tới giữa hai lần đọc. Thứ tự gửi và read watermark phải đúng trước khi bật cho UI.
4. Chat chỉ tự cuộn khi ở gần cuối hoặc vừa gửi tin của mình; nếu đang đọc lịch sử thì hiện dấu tin mới. Dùng danh sách tái sử dụng hàng khi cần, đo lại với cuộc hội thoại dài; không mất bản nháp hoặc vị trí khi tải thêm.
5. Thu hẹp refresh theo resource thực sự ảnh hưởng; giữ phục hồi HTTP khi realtime gián đoạn và backoff hiện có. Không hiểu vòng kiểm dirty cục bộ là tần suất gọi API.
6. Thông báo: đánh dấu đã đọc, lỗi mở đích và tài nguyên bị mất quyền có phản hồi rõ; kiểm phạm vi “Đọc tất cả” với provider thực tế, không đoán chỉ từ nút.

**Kiểm:** `state/calendar.test.ts`, `screens/Work.test.tsx`, test chat trong feature, `Notifications.test.tsx`, `NotificationsProvider.test.tsx`; API `jobs-chat.test.ts`, `realtime.test.ts`, `notifications.test.ts`; web `calendar.spec.mjs`, `realtime.spec.mjs`, `notifications.spec.mjs`.

**Đạt khi:** không nhấp nháy danh sách vì refresh; lịch không thiếu việc ở trang sau; tin mới không kéo người đang đọc tin cũ; mất quyền xóa nội dung; D01/D02 đạt tương thích client cũ. Chưa duyệt contract thì ghi đúng phần chưa làm, không thay kiểm đủ dữ liệu bằng lọc cục bộ một trang.

### Gói 4 — Ví, hồ sơ cung cấp, đội ngũ và tài khoản

**File:** `features/finance/screens/FinanceScreen.tsx`, `features/partners/screens/PartnerEditorScreen.tsx`, `features/organizations/screens/TeamScreen.tsx`, `OrganizationsScreen.tsx`, `features/accounts/screens/`, `features/auth/screens/AccountScreen.tsx`, `features/account-security/screens/`, `features/verification/screens/VerificationScreen.tsx`, `features/reviews/screens/`, `features/support/screens/SupportScreen.tsx`.

1. Ví: giải thích Rút chưa dùng được do chưa có ngân hàng/quyền/số dư phù hợp; hành động dẫn tới điều kiện cần bổ sung chỉ khi được phép. Chi tiết giao dịch dùng số tiền/trạng thái/ngày làm chính; mã sao chép ở phần phụ.
2. Hồ sơ: nhóm thông tin/dịch vụ/vùng/địa điểm/ảnh; mỗi nhóm có trạng thái đã lưu/chưa lưu và nút đúng tên. Tách công khai hồ sơ khỏi đang nhận việc, không dùng cùng nghĩa. Ảnh có số thứ tự và thao tác lên/xuống/gỡ dễ hiểu, kiểm đầu/cuối.
3. Đội ngũ: tab gọn, Mời thành viên nổi bật ở nơi phù hợp; Sửa quyền/Gỡ thành viên theo hàng. Khi rời/gỡ phải thấy số việc và hướng bàn giao hiện hành, không bỏ kiểm nghĩa vụ.
4. Tài khoản: rõ đang dùng vai/hồ sơ nào; nhóm menu theo nhu cầu; Đăng xuất, thu hồi phiên, xóa tài khoản tách khỏi thao tác thường dùng. OTP có bước nhập liên hệ/gửi mã/xác nhận/gửi lại và lý do khóa theo giới hạn server.
5. Đánh giá/hỗ trợ/xác minh: nút gửi có nhãn đối tượng; trạng thái ảnh đang tải/lỗi/sẵn sàng rõ; phân biệt nội dung công khai và ảnh chứng cứ riêng tư; nhánh yêu cầu bổ sung giữ bản nháp.

**Kiểm:** `features/finance/screens/FinanceScreen.test.tsx`, `features/partners/screens/Partners.test.tsx`, `features/organizations/screens/Organizations.test.tsx`, `features/accounts/screens/AccountManagement.test.tsx`, `features/account-security/screens/SecurityScreen.test.tsx`, `features/reviews/screens/Reviews.test.tsx`, `features/support/screens/Support.test.tsx`, `features/verification/screens/Verification.test.tsx`; giữ test quyền backend tương ứng.

**Đạt khi:** người dùng hiểu điều kiện nút bị khóa; mỗi form có phản hồi lưu và giữ nháp khi lỗi; không tăng quyền hoặc đổi tiền; thao tác nguy hiểm không nằm sát nút thường dùng mà không phân biệt.

### Gói 5 — Khu quản trị trên điện thoại

**File:** `features/admin/screens/AdminScreen.tsx`, `AdminDesk.tsx`, `P2Desk.tsx`, `RecoveryPanel.tsx`, `MfaSecurity.tsx`, `features/backoffice/BackofficePanel.tsx`, `features/finance/screens/AdminFinance.tsx`, các file `messages.ts` cùng feature.

1. Thay dãy nút điều hướng lớn bằng nhóm chức năng/bộ chọn mục gọn: hỗ trợ, kiểm duyệt/xác minh, tài khoản/quyền, tài chính, tra cứu. Chỉ hiện nhóm được cấp quyền; không thêm “dashboard” số liệu nếu API chưa có.
2. Hàng đợi dùng trạng thái/thời gian/đối tượng; bộ lọc có giá trị hiện tại và reset, giữ khi quay lại chi tiết. Không hiển thị tổng số toàn hệ thống nếu chỉ biết số đã tải.
3. Bảng quyền dùng tên VI/EN/JA + mô tả ngắn + mã kỹ thuật tra cứu; nhóm xem/thay đổi, thể hiện thay đổi trước khi lưu. Không thêm preset vai hoặc nút chọn tất cả làm cấp quá quyền.
4. Chi tiết có khối kết luận xử lý riêng; lý do, đối chiếu chứng cứ, phiên bản, MFA và retry giữ nguyên. Ghi chú nội bộ không trình bày như phản hồi gửi khách.
5. Tách component theo miền khi file đang trộn nhiều trách nhiệm; helper chỉ tái sử dụng khi cùng nghĩa. Nếu D04 chưa duyệt, không tải N chi tiết để hiển thị N tên.

**Kiểm:** `features/admin/screens/Admin.test.tsx`, `AdminCompletion.test.tsx`, `RecoveryPanel.test.tsx`, `features/backoffice/BackofficePanel.test.tsx`, `features/finance/screens/AdminFinance.test.tsx`; API `admin-operations.test.ts`, `admin-completion.test.ts`, `backoffice.test.ts`, `finance.test.ts`, `mfa-recovery.test.ts`; native tài khoản đầy đủ và từng nhóm quyền. Web chỉ hồi quy contract/quyền.

**Đạt khi:** vào được từng khu bằng điều hướng rõ; không cần đọc mã quyền để hiểu công dụng; bộ lọc trở lại đúng; thiếu MFA/quyền không xem ảnh riêng hoặc gửi được thao tác; trạng thái giao dịch chưa rõ kết quả không cho chuyển lần hai.

### Gói 6 — Hậu kiểm trải nghiệm và cập nhật báo cáo

1. Hoàn tất danh mục 135 mục trên cả hai nền tảng với cột trạng thái kiểm; bổ sung mục mới nếu UI tạo nhánh mới. Kiểm mọi route và menu nội bộ admin; không chỉ dựa số route.
2. Đối chiếu từng nút với vai/quyền/trạng thái trong `scripts/review/screen-catalog.mjs`. Dữ liệu báo cáo cần thêm điều kiện hiện/khóa, mức ưu tiên, kết quả bấm, nguồn kiểm/ngày kiểm; không tạo schema thứ hai trong app.
3. Cập nhật `report-template.html`, `build-report.mjs`, `check-report.mjs`: giữ tìm kiếm và lọc kết hợp, bổ sung lọc mức kiểm/nhóm cải thiện nếu giúp tra cứu; kiểm nút chuyển màn không làm mất bộ lọc, mục trống có cách xóa lọc. Không sửa trực tiếp HTML/JSON sinh ra làm nguồn chính.
4. Tham số hóa device trong capture, ổn định testID và điều kiện chờ dữ liệu sẵn sàng; không tăng sleep để che lỗi. Chạy nền tảng lần lượt nếu máy không đủ tài nguyên cho hai simulator.
5. Lưu ảnh sau thay đổi riêng, giữ ảnh/bằng chứng B00-14 làm mốc trước. Báo cáo mới dự kiến `bao-cao/B00-15-toi-uu-trai-nghiem.md`, ảnh `anh/B00-15/`; cập nhật báo cáo tra cứu có phiên bản/ngày và giới hạn rõ.
6. Chạy các kiểm tập trung rồi SDD toàn dự án; cập nhật checklist/mục lục và inventory đúng diff, không đổi hash/giảm tiêu chí để xanh. Sau đó bàn giao bản trước/sau và bài thử cho chủ dự án.

**Đạt khi:** kiểm link/ảnh/filter; báo cáo không liệt kê nút bước sau như nút hiện tại; có kết quả thao tác bên cạnh ảnh; mọi giới hạn chưa kiểm được ghi riêng. Chỉ đóng UX-01 khi các gói được duyệt có bằng chứng đạt; không lấy 243 ảnh cũ làm ảnh sau sửa.

## 7. Cách dùng database hiện tại và bảo toàn dữ liệu

- **Mọi kiểm nghiệm thu luồng, nút, ảnh và hiệu năng trải nghiệm dùng `dvqb_local`**, nối API thật. Không dùng mock/fixture thay bằng chứng này và không chuyển sang `dvqb_p1_demo`.
- Đọc cấu hình hiệu lực và xác nhận tên DB trước khi chạy; không in connection string hoặc mật khẩu. Kiểm manifest seed và số lượng hiện tại, không mặc định số liệu 30/10 vẫn nguyên.
- Trước các bài có ghi, tạo backup và ghi tập ID thử; dùng tài khoản/bản ghi seed đã có hoặc tạo tình huống bổ sung qua API trong cùng `dvqb_local`. Không reset/truncate, không sửa khách/bản ghi cũ ngoài tập kiểm, không chạy lại seed --apply chỉ để về trạng thái đầu.
- Mỗi nền tảng dùng bản ghi có thể truy vết riêng cho thao tác làm đổi trạng thái; kiểm trước/sau và giữ lịch sử. Không rollback SQL tùy tiện một giao dịch đã phát sinh ledger/ảnh/sự kiện.
- Các bài tự động SDD hiện có fixture và DB cô lập riêng vẫn dùng để kiểm hồi quy kỹ thuật; **tuyệt đối không trỏ bộ reset fixture vào `dvqb_local`**. Kết quả này ghi riêng, không thay yêu cầu kiểm trên database hiện tại của chủ dự án.
- Provider gửi ngoài/tiền thật không được kích hoạt bởi bài kiểm. Dữ liệu tài chính vẫn là local; ảnh báo cáo chỉ dùng tài khoản seed và che thông tin riêng.

## 8. Lệnh kiểm và ma trận nghiệm thu

Chạy từ root repo, trừ khi lệnh chỉ rõ workspace. Lệnh dưới là hướng dẫn sau khi duyệt, không đồng nghĩa đã chạy trong lượt lập kế hoạch.

```sh
# Nguồn, phạm vi, inventory trước thay đổi
npm run sdd:check -- --change SDD-PROJECT --phase prepare

# Tra tên test thực tế trước khi chọn kiểm tập trung
rg --files apps/mobile/src/features | rg '\.test\.(ts|tsx)$'

# Gói công việc/hóa đơn
npm test -w apps/mobile -- --runTestsByPath src/features/jobs/screens/Work.test.tsx src/features/invoices/screens/InvoiceScreen.test.tsx src/features/jobs/state/mutation.test.ts

# Gói tìm kiếm/lịch
npm test -w apps/mobile -- --runTestsByPath src/features/search/state/partner-search.test.ts src/features/search/components/ServiceFilter.test.tsx src/features/location/components/LocationField.test.tsx src/features/jobs/state/calendar.test.ts

# Kiểm dữ liệu hiện hành: đọc code và điều kiện kết nối trước khi chạy
npm run db:operational:verify
node --import tsx scripts/review/check-operational-api.mjs

# Chỉ tạo lại báo cáo khi catalog, ảnh và metadata đã cập nhật
npm run review:screens:build
npm run review:screens:check

# Gate cuối sau triển khai; runner dùng DB test cô lập theo cấu hình của nó
npm run sdd:run -- --change SDD-PROJECT
npm run sdd:check -- --change SDD-PROJECT --phase verify
```

`check-operational-api.mjs` hiện dùng API local cổng 3110; đọc lại cấu hình và xác nhận dịch vụ đó nối `dvqb_local` trước khi chạy. Script có đăng nhập/MFA, không phải truy vấn DB thuần đọc. Không chạy `verify-operational-flow.mjs` trước khi kiểm tập bản ghi sẽ thay đổi.

| Mã kiểm | Tình huống | Kỳ vọng bắt buộc |
|---|---|---|
| UX-T01 | Nút nhận việc, xác nhận hóa đơn, gửi form ở cỡ chụp chuẩn | Thấy hành động chính trước khối phụ; không bị tab/bàn phím che |
| UX-T02 | Font lớn 150%/200%, VI/EN/JA, nội dung dài | Nhãn không mất nghĩa, không đè nhau; cuộn tới được mọi nút |
| UX-T03 | Ảnh/ledger lỗi, Point/ví lỗi | Phần đọc chính vẫn hiện nếu được phép; phần tiền thiếu dữ liệu không xác nhận |
| UX-T04 | Refresh khi đang xem danh sách/nhập nháp | Giữ nội dung và input cùng scope; không nhảy nút ngay khi bấm |
| UX-T05 | Đổi tài khoản/hồ sơ/mất quyền, request cũ về trễ | Không hiện dữ liệu scope cũ, không ghi dưới actor mới |
| UX-T06 | Bấm đôi, mất phản hồi, retry, xung đột version | Không ghi hai lần; giữ đúng ý định hoặc yêu cầu đọc lại, không tự gửi yêu cầu mới |
| UX-T07 | Áp dụng/hủy/xóa lọc, sort, tải thêm, Back | Query/cursor đúng; không trộn trang; khôi phục bộ lọc và vị trí đúng scope |
| UX-T08 | Lịch tháng nhiều trang, mốc nửa đêm VN, đổi lịch | Không thiếu/trùng việc; khoảng ngày và quyền chính xác |
| UX-T09 | Chat dài, tin mới khi đang đọc tin cũ, reconnect | Không giật xuống cuối; không thiếu/trùng tin; read watermark không đánh dấu tin chưa đọc vì chỉ tải trang |
| UX-T10 | Nhân viên ít quyền, admin từng nhóm quyền, MFA hết hạn | Nút/ảnh/data theo quyền server; đường hỗ trợ hạn chế vẫn dùng được |
| UX-T11 | Hủy chọn ảnh, ảnh đang tải/lỗi, từ chối vị trí/micro | Có hướng tiếp tục hợp lệ; không gửi nhầm dữ liệu thiếu hoặc báo thành công giả |
| UX-T12 | Báo cáo tương tác trước/sau | Liên kết và filter đúng; giải thích nút khớp từng trạng thái và nền tảng |

Các mục UX-Txx là tiêu chí kế hoạch, **chưa tự đăng ký thành criterion SDD đã chứng minh**. Khi triển khai, gắn test literal thật và review inventory/traceability. Không thêm test chỉ kiểm chi tiết nội bộ của refactor hoặc snapshot sao chép JSX.

Gate hiệu năng: so cùng data/device/build/mạng; nội dung hóa đơn không đợi ảnh/ledger; nếu D01/D02 được duyệt, mở lịch/chat không đọc toàn lịch sử trước nội dung đầu. Điều tra nếu trung vị sau sửa chậm hơn trước trên 10% qua hai lượt đo tương đương; đây là ngưỡng rà soát đề xuất, không phải cam kết SLA. Chưa có baseline thì không hứa giảm x% hoặc số giây cụ thể.

## 9. Checklist duyệt và bàn giao

- [x] Lập kế hoạch và danh mục đủ 135 mục B00-14; đối chiếu source ở các điểm nêu cụ thể.
- [x] Chủ dự án duyệt áp dụng bố cục HTML UX-01 ngày 02/11/2026.
- [ ] Lựa chọn D01–D04: chưa được duyệt, không triển khai trong lượt giao diện này.
- [ ] Gói 0: xác nhận matrix hành động và baseline trên `dvqb_local`.
- [ ] Gói 1: công việc/hóa đơn/tải dữ liệu, đủ hai nền tảng.
- [ ] Gói 2: tìm/lọc/hồ sơ/gửi yêu cầu.
- [ ] Gói 3: danh sách/lịch/chat/thông báo; contract được duyệt hoặc ghi phần hoãn.
- [ ] Gói 4: ví/hồ sơ/đội ngũ/tài khoản/đánh giá/hỗ trợ.
- [ ] Gói 5: quản trị và mọi nhóm quyền liên quan.
- [ ] Gói 6: báo cáo trước/sau, ảnh, bằng chứng nút, SDD mới và giới hạn.
- [ ] UAT chủ dự án; thiết bị vật lý ghi riêng nếu có điều kiện.

Không chuyển checklist triển khai thành hoàn tất chỉ vì đã tạo kế hoạch. Các báo cáo/checklist chỉ lưu repo; không tự đồng bộ hồ sơ nghiệp vụ/Drive/`ui-ux`.

## 10. Kiểm tra riêng lượt lập kế hoạch

Ngày 31/10/2026: `SDD-PROJECT --phase prepare` đạt trước và sau đăng ký hai file tài liệu; vẫn 156 tiêu chí, QA 97 partial/12 unmapped. Đã kiểm liên kết file/anchor, đối chiếu 135 key duy nhất với B00-14 và đủ 30 nhóm, `git diff --check` không báo lỗi. Chỉ thêm tài liệu đề xuất và liên kết/checklist/inventory tương ứng; không đổi source hash hoặc tiêu chí để lấy kết quả xanh.

Ở lượt lập kế hoạch ban đầu chưa chạy lại native. Đợt audit tiếp theo ngày 31/10–01/11 đã có bằng chứng Android/iOS trong [kết quả rà soát](UX-01-ket-qua-ra-soat-native.md), nhưng chưa đo đủ baseline. Kết quả `sdd:run`/`verify` mới phải đọc ở artifact local có snapshot khớp, không lấy kết quả trước audit thay thế. Bằng chứng SDD của đợt trước thuộc bộ file trước, không chứng nhận bộ file vừa bổ sung. Sau khi triển khai phải tạo bằng chứng mới theo gói 6.

Cập nhật kiểm tra ngày 01/11: đã chạy SDD cho lượt audit; lint/typecheck/tooling/mobile đạt, bước API dừng khoảng giới hạn 10 phút và không tạo report hợp lệ, `verify` chưa đạt vì thiếu evidence. Xem mục 7 của [kết quả audit](UX-01-ket-qua-ra-soat-native.md); không dùng kết quả này để chốt toàn bộ gói 0 hoặc nghiệp vụ API.
