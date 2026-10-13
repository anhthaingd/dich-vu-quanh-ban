# SDD 01 Đề xuất quy trình AI bám spec

Ngày: 10/10/2026. Thuộc bộ kế hoạch triển khai DOC-082; liên quan toàn bộ Bxx/I18N, thử trước với luồng tìm dịch vụ và MAP-02. [Mục lục](../README.md).

**Trạng thái 13/10/2026: thiết kế đã duyệt; bộ kiểm local giai đoạn 1–3 đã triển khai theo yêu cầu “triển khai bộ kiểm SDD đi”.** Gói 6 tiêu chí MAP-02 có prepare/verify và thu bằng chứng test thật; [B00-07](../bao-cao/B00-07-bo-kiem-sdd-local.md) ghi kiểm thử và giới hạn, [hướng dẫn](../sdd/README.md) ghi lệnh đang dùng. Chưa commit/push, chưa nối CI hoặc chứng nhận toàn repo/native/UAT. Mục 6 và 9 lưu lộ trình, kế hoạch gốc; không dùng các câu “chưa tạo” tại mốc chuẩn bị thay trạng thái triển khai này. Không mở lại OTP, PROMO-02, provider, production hoặc tiền thật. Không thay thứ tự triển khai nghiệp vụ.

## 1. Kết quả mong muốn

Khi giao một chức năng cho AI, chủ dự án xem được: AI đang dựa vào yêu cầu nào, định sửa phạm vi nào, kiểm bằng cách nào và còn điều gì chưa được chứng minh. Một phiên AI mới có thể tiếp tục công việc từ repo mà không phải đoán lại quyết định trong hội thoại cũ.

SDD là phát triển dựa trên đặc tả: lấy hành vi đã được duyệt làm chuẩn để lập kế hoạch, viết code và kiểm kết quả. Agentic AI là AI tự thực hiện những bước đã được giao, như tìm nguồn, sửa code, chạy kiểm thử và xử lý lỗi. Không bắt buộc dùng nhiều agent.

Mục tiêu là bám **spec hiện hành đã chốt**, gồm spec ban đầu và các thay đổi đã được chủ dự án duyệt. Không đóng băng bản đầu tiên khi đã có quyết định thay thế. Không có công cụ bảo đảm AI không bao giờ đi lệch; cần kết hợp nguồn rõ, test hành vi và người duyệt nghiệp vụ.

## 2. Hiện trạng và khoảng cần bổ sung

Đã đọc quy tắc repo, bộ kế hoạch, nguồn API/QA, cấu hình CI, một số test contract và báo cáo B00-06/B03-04. Đây là khảo sát để thiết kế quy trình, không phải audit mọi chức năng hoặc chạy lại test sản phẩm.

| Nền hiện có | Bằng chứng trong repo | Hướng bổ sung |
|---|---|---|
| Phân biệt code, spec, Pending và phạm vi được phép | [AGENTS.md](../../../AGENTS.md) | Chuyển một phần thành dữ liệu kiểm được; giữ bản quy tắc ngắn, không chép toàn bộ nghiệp vụ vào đây |
| Quy trình đọc spec, khóa interface, test, báo cáo | [Quy trình hiện hành](../02-quy-trinh-va-cau-truc.md) | Thêm đầu vào/đầu ra rõ cho từng đợt AI |
| API và truy vết kiểm thử | [OpenAPI](../../technical-design/openapi.json), [RTM](../../technical-design/rtm.json), [QA](../../technical-design/qa-cases.json) | Nối tới file/test chạy thật, không dựng bộ yêu cầu trùng lặp |
| Test đọc schema từ OpenAPI | [partners.test.ts](../../../services/api/test/integration/partners.test.ts), [jobs-chat.test.ts](../../../services/api/test/integration/jobs-chat.test.ts), [invoices.test.ts](../../../services/api/test/integration/invoices.test.ts) | Tận dụng và bổ sung kiểm hành vi; schema hợp lệ chưa chứng minh đúng quyền/trạng thái |
| CI kiểm app, API/PostGIS và web E2E | [quality.yml](../../../.github/workflows/quality.yml) | Thêm kiểm liên kết yêu cầu, phạm vi và nguồn thay đổi |
| Báo cáo có ảnh và giới hạn | [B00-06](../bao-cao/B00-06-trang-chinh-theo-storybook.md), [B03-04](../bao-cao/B03-04-yeu-cau-nhan-viec-va-chat.md) | Gắn bằng chứng với đúng phiên bản code; không lấy báo cáo cũ làm kết quả mới |

RTM hiện có trường `operation_id`, `contract_case`, `scenario_ids`, `status`; một số mục vẫn ghi “Chưa chạy”. QA có các dòng “Chưa chạy — chưa có backend”. Đây là lý do phải tách kế hoạch kiểm thử và kết quả chạy thực tế; chưa đủ căn cứ để tự đổi mọi trạng thái sang đạt.

## 3. So sánh ba cách áp dụng

| Cách | Lợi ích | Đánh đổi | Kết luận cho repo |
|---|---|---|---|
| Thêm SDD vào quy trình hiện có | Giữ mã FR/QA, tài liệu và CI; chuyển dần từng miền | Cần tự duy trì một số script nhỏ | Hướng chủ dự án đã chọn |
| Dùng GitHub Spec Kit | Có quy trình, template và chuỗi spec → plan → tasks → implement → converge | Cần ánh xạ với hệ thống tài liệu hiện có, kiểm tránh hai nguồn chuẩn | Có thể đánh giá lại khi quy trình ổn định |
| Dùng OpenSpec | Tổ chức theo từng thay đổi với proposal, spec, design, tasks; có hướng dẫn cho dự án đang có code | Cần kiểm cách đồng bộ spec của công cụ với quy trình phê duyệt và sổ quản lý | Có thể thử sau, chưa cần cài ngay |

Nguồn công cụ kiểm ngày 10/10/2026: [GitHub Spec Kit](https://github.com/github/spec-kit), [OpenSpec](https://github.com/Fission-AI/OpenSpec). Đánh giá mức phù hợp trong bảng là đề xuất cho repo này, không phải benchmark. Bộ công cụ hỗ trợ quy trình; bản thân template hoặc lệnh AI không phải bằng chứng tuân thủ.

## 4. Thiết kế quy trình

### 4.1. Nguồn chuẩn theo loại thông tin

- Nghiệp vụ: quyết định mới nhất đã chốt và các spec liên quan. Phải ghi rõ quyết định thay thế phần nào; không dùng ngày sửa file để suy ra phê duyệt.
- Giao tiếp app/backend: OpenAPI và quy tắc dữ liệu/quyền/trạng thái đã chốt.
- Giao diện: spec UX, Design System và Storybook liên quan trong phạm vi đã duyệt. Dữ liệu mock không tự thành nghiệp vụ.
- Trạng thái thực hiện: code, kết quả kiểm thử và báo cáo gắn phiên bản. Code đang chạy không tự trở thành yêu cầu chuẩn.
- Excel: quản lý tài liệu, quyết định và ảnh hưởng theo AGENTS.md; không phải nơi thay nội dung spec. Kế hoạch/báo cáo triển khai tiếp tục ở repo.

Khi các nguồn mâu thuẫn mà không có quyết định thay thế rõ, AI ghi vấn đề và hỏi gộp chủ dự án; tiếp tục phần độc lập đã được giao. Không âm thầm chọn nguồn thuận tiện nhất hoặc sửa spec để hợp thức hóa code.

### 4.2. Gói đầu vào cho mỗi đợt

Mỗi đợt có một bản mô tả ngắn, trỏ tới nguồn thay vì sao chép toàn bộ:

| Mục | Nội dung cần có |
|---|---|
| Phạm vi | Mã đợt, thao tác người dùng, điều được làm và ngoài phạm vi |
| Căn cứ | FR/QA/operationId/quyết định/UX liên quan; file và mục cụ thể |
| Phiên bản | Commit nền; dấu băm nội dung nguồn đã đọc để phát hiện nguồn đổi; diff chưa commit nếu có |
| Điều kiện bắt đầu | Spec cần thiết đã rõ, phụ thuộc được đáp ứng, phạm vi thực hiện đã được giao |
| Thay đổi dự kiến | Các miền/file có thể sửa; nếu phát sinh file khác phải giải thích tác động |
| Tiêu chí đạt | Người dùng thấy gì, quyền và trạng thái nào phải giữ, các ca lỗi/retry quan trọng |
| Kiểm chứng | Test tự động tương ứng; phần cần kiểm UI/native/UAT; cách ghi kết quả |

Dấu băm giúp phát hiện nội dung đổi, không chứng minh nội dung đúng hoặc đã được duyệt. Dữ liệu nguồn phải được đọc lại khi đổi; không chỉ cập nhật dấu băm để làm kiểm tra xanh.

### 4.3. Chu trình làm việc của AI

1. **Đọc và phân loại:** xác định sửa để khớp spec, thay đổi kỹ thuật, hay đề xuất đổi spec.
2. **Đối chiếu nguồn:** chuẩn bị gói đầu vào, phát hiện phần thiếu và những quy tắc không được phá vỡ.
3. **Lập kế hoạch:** nối dữ liệu → API → app → kiểm thử; ghi tiêu chí và phần bị chặn. Chủ dự án chỉ cần chốt quyết định còn thiếu, không duyệt lại mỗi thao tác kỹ thuật.
4. **Thực hiện trong phạm vi được giao:** chạy test phù hợp, sửa lỗi theo nguyên nhân; không tự nới yêu cầu/test để lấy kết quả đạt.
5. **Review theo spec:** đối chiếu diff với nguồn, tìm hành vi thừa/thiếu, kiểm quyền, retry, dữ liệu riêng tư và UI.
6. **Ghi bằng chứng:** từng tiêu chí có kết quả và môi trường; cập nhật báo cáo/checklist đúng phần đạt.

Một agent có thể thực hiện các vai trò trên tuần tự. Review bằng phiên riêng có thể bổ sung sau khi được phép; reviewer chỉ đọc và đưa phát hiện, không tự chốt nghiệp vụ hay ghi đè phần implementer. Không cần dựng hệ thống nhiều agent ở đợt đầu.

### 4.4. Máy kiểm được gì

| Kiểm tra đề xuất | Cách xử lý |
|---|---|
| File/mục/ID tham chiếu không tồn tại, ID trùng hoặc operationId sai | Chặn phần đã đưa vào quản lý SDD |
| Nguồn thay đổi sau lúc lập kế hoạch | Yêu cầu đọc lại và đối chiếu trước bàn giao |
| API trả sai schema hoặc sai quyền/trạng thái đã có test | Test thất bại, phải sửa hoặc đưa ra quyết định đổi spec để duyệt |
| Thay đổi code trong miền đã quản lý nhưng thiếu căn cứ/phạm vi | Báo thiếu, yêu cầu bổ sung; không coi một ID bất kỳ là đủ |
| Tiêu chí bắt buộc chưa chạy, bị skip hoặc không có bằng chứng cùng phiên bản | Giữ chưa hoàn tất; không đổi thành đạt |
| Thay đổi spec mà bản mô tả ghi chỉ đổi implementation | Báo cần phân loại lại và kiểm căn cứ phê duyệt |
| Vượt ranh giới kiến trúc có thể kiểm bằng import | Bổ sung rule phù hợp sau thử nghiệm, tránh bắt nhầm cấu trúc hợp lệ |

Máy không tự xác nhận đầy đủ ý nghĩa nghiệp vụ, chất lượng UI hoặc tính hợp lệ của phê duyệt. AI review có thể phát hiện thêm, nhưng kết luận quan trọng phải chỉ ra đoạn spec và hành vi cụ thể. Trường `approved: true` do AI tự viết không phải phê duyệt của chủ dự án.

CI phải so sánh với nhánh/commit nền đáng tin cậy. Nếu cùng một thay đổi sửa cả nguồn quy tắc, script kiểm và test, cần review phần thay đổi cơ chế kiểm; không lấy việc CI xanh làm đủ chứng cứ. Việc đặt required checks hoặc bảo vệ nhánh là cấu hình riêng, cần xác minh quyền và phạm vi trước khi áp dụng; thêm job vào YAML chưa tự chặn merge/push.

## 5. Ví dụ thử với luồng tìm dịch vụ và bản đồ

Thử trên chức năng đang có để đánh giá quy trình, không mở tính năng bản đồ mới. Nguồn là phần MAP-02 trong [thiết kế kỹ thuật](../../technical-design/README.md), OpenAPI và [B03-02](../bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md). Mã ví dụ bên dưới chỉ là mã tiêu chí thử, không thay mã FR/QA đã đăng ký.

| Tiêu chí ví dụ | Hành vi cần giữ | Nơi kiểm hiện có để đối chiếu |
|---|---|---|
| MAP-02-AC-01 | Chỉ trả địa điểm active/public làm ghim; không lộ điểm private hoặc tâm vùng | `services/api/test/integration/partners.test.ts` |
| MAP-02-AC-02 | Người không có ghim vẫn xuất hiện trong danh sách nếu đủ điều kiện tìm kiếm | Test API và `tests/e2e/web/search-map.spec.mjs` |
| MAP-02-AC-03 | Danh sách và bản đồ dùng cùng kết quả đã tải; đổi điều kiện tìm bỏ kết quả cũ | Các test trong `apps/mobile/src/features/search/` và web E2E |

Trước khi gắn trạng thái đạt, phải đọc assertion thật để xác nhận test nào chứng minh từng tiêu chí; tên file không đủ. Các đường dẫn trên là điểm bắt đầu rà soát, không tuyên bố mọi tiêu chí đã được bao phủ.

Ví dụ AI muốn “lấy tâm vùng phục vụ làm ghim khi thiếu địa chỉ”: bước đối chiếu sẽ tìm thấy xung đột với MAP-02. Test riêng tư cũng phải thất bại khi đưa hành vi sai đó vào fixture thử. AI sửa cách triển khai theo spec; chỉ đề xuất đổi spec nếu chủ dự án thực sự muốn thay hành vi.

## 6. Lộ trình triển khai dự kiến

Các file mới bên dưới chỉ là thiết kế vị trí. Chỉ tạo khi bắt đầu giai đoạn tương ứng. Không viết lại toàn bộ tài liệu hoặc chuyển framework trước khi thử luồng mẫu.

| Giai đoạn | Công việc và file tác động dự kiến | Đầu ra và tiêu chí kết thúc |
|---|---|---|
| 1. Chuẩn bị nguồn cho luồng mẫu | Rà MAP-02, FR/QA/OpenAPI/UX và test; lập `docs/ke-hoach-trien-khai/sdd/source-map.json` dẫn nguồn; ghi các mâu thuẫn còn mở | Tìm được nguồn hiện hành cho từng tiêu chí mẫu, chỉ rõ phần chưa biết; không suy chuẩn nghiệp vụ từ code |
| 2. Chuẩn hóa giao việc và truy vết | Thêm template đợt và `sdd/changes/<ma-dot>.json`; thêm `sdd/traceability.json` chỉ nối mã nguồn hiện có tới code/test; cập nhật mục quy trình trong AGENTS.md và `02-quy-trinh-va-cau-truc.md` | Một phiên mới có thể xác định phạm vi, nguồn, tiêu chí và kiểm thử mà không đọc toàn bộ repo; không tạo bản sao FR/RTM |
| 3. Kiểm tự động ở local | Thêm `scripts/sdd/check.mjs` và test dưới `scripts/test/`; bổ sung lệnh dự kiến `npm run sdd:check` trong `package.json` | Fixture hợp lệ đạt; ID sai, nguồn đổi, thiếu test/evidence, trạng thái skip bắt buộc đều bị phát hiện; không dùng LLM cho các kiểm tra cấu trúc |
| 4. Thử trọn luồng và nối CI | Chạy gói mẫu qua API/app/test; ghi kết quả theo code hash; bổ sung bước SDD vào `.github/workflows/quality.yml` | Báo cáo chỉ rõ local/CI/native/UAT; job thực chạy trên phiên bản tương ứng mới được ghi CI đạt; thử cơ chế bắt lỗi trước khi áp dụng rộng |
| 5. Mở rộng theo miền | Sau luồng mẫu, áp dụng cùng cách cho jobs/chat, rồi invoice/settlement; liên kết báo cáo B03-04/B06-01 | Mỗi miền có nguồn, tiêu chí, test và bằng chứng; giữ các hạn chế OTP/realtime/tiền thật hiện hành |

Ở giai đoạn 2, cấu trúc dữ liệu tối thiểu gồm mã đợt, loại thay đổi, mã yêu cầu, nguồn/phiên bản, phạm vi code, tiêu chí, test và giới hạn. Kết quả thực chạy để trong artifact riêng có thời gian, môi trường, lệnh, mã thoát và commit/dấu băm working tree; không ghi kết quả vào spec nguồn.

Các giai đoạn phụ thuộc nhau theo thứ tự. Bắt đầu chỉ với MAP-02 và các file chạm tới nó; vi phạm cũ ngoài phạm vi được ghi tồn đọng, không làm toàn repo đỏ. Khi một miền đã được đưa vào kiểm bắt buộc, thay đổi mới trong miền đó phải đạt; không tự thêm ngoại lệ để né kiểm.

Các lệnh hiện có có thể tận dụng: `npm run lint`, `npm run typecheck`, `npm run test:tooling`, `npm run test:integration`, `npm run test:e2e`, `npm run build`. Chọn tập test theo tác động và khởi động DB test theo hướng dẫn repo; chưa chạy các lệnh này trong đợt lập đề xuất. `npm run sdd:check` là lệnh dự kiến, hiện chưa tồn tại.

## 7. Kiểm chứng chính hệ thống SDD

Không đánh giá thành công bằng số file Markdown hoặc số agent. Trước khi coi luồng mẫu dùng được, cần chứng minh:

1. Mọi tiêu chí bắt buộc trong luồng mẫu có nguồn và test/kiểm thủ công xác định; chưa kiểm thì ghi đúng chưa kiểm.
2. Cố ý đưa tham chiếu sai, nguồn đổi và bằng chứng cũ vào fixture thì bộ kiểm phát hiện được.
3. Một hành vi sai như lộ điểm private khiến test nghiệp vụ thất bại. Thử trong fixture hoặc môi trường test cô lập, không sửa dữ liệu dùng thật.
4. Thay đổi code trong miền mẫu mà thiếu gói phạm vi bị cảnh báo/chặn theo chế độ đã chọn; file ngoài bản đồ miền phải được nêu ra để phân loại, không âm thầm bỏ qua.
5. Một phiên AI mới dựa vào repo vẫn nhận ra nguồn bị thay thế, phần Pending và giới hạn của đợt.
6. Sửa bug khớp spec chỉ cập nhật code/test/báo cáo cần thiết; không kéo theo đồng bộ Excel/Drive/ZIP. Nếu phát hiện cần đổi spec, đi qua quy trình quyết định và đồng bộ hiện hành.

Trong thời gian thử, ghi thời gian chuẩn bị đợt, cảnh báo đúng/sai và các trường hợp đi lệch được phát hiện. Nếu chi phí thao tác cao mà không giúp phát hiện lỗi, rút gọn template và rule trước khi mở rộng.

## 8. Phạm vi bàn giao bản thiết kế ngày 10/10

Đã khảo sát nguồn liên quan, so sánh hướng áp dụng, đề xuất cơ chế và thứ tự triển khai. Chưa cài Spec Kit/OpenSpec, chưa tạo script/gate, chưa sửa code sản phẩm, chưa chạy lại test hoặc xác minh remote CI. Các báo cáo cũ được dùng để hiểu quy trình, không làm bằng chứng trạng thái hôm nay.

Bước tiếp theo sau khi thiết kế được chốt ngày 13/10 là đợt local ở mục 9; đợt này đã được triển khai sau yêu cầu tiếp theo, xem trạng thái đầu tài liệu và B00-07. Bộ thiết kế này không tự cấp quyền triển khai toàn bộ backlog hoặc thay spec nghiệp vụ.

## 9. Đợt đầu sau khi duyệt thiết kế

Ngày chuẩn bị: 13/10/2026. Mục tiêu bàn giao là một luồng MAP-02 có nguồn → tiêu chí → test → kết quả và một lệnh kiểm local phát hiện được lỗi truy vết. Gom giai đoạn 1–3 thành một đợt; không coi việc chỉ tạo template là đã áp dụng SDD thành công.

### 9.1. Căn cứ cụ thể đã tìm thấy

- `searchPartners` có trong RTM, liên kết QA-080/QA-081. QA-080 mô tả quyền riêng tư và cách chọn ghim; QA-081 mô tả danh sách/bản đồ, phân trang, thay điểm và lỗi nền bản đồ.
- `services/api/test/integration/partners.test.ts` có test `map pins expose only nearest active public location in radius, without dropping providers lacking a pin`: kiểm ghim null, điểm công khai gần nhất, dấu nhận diện địa chỉ riêng không xuất hiện trong response, điểm ngoài bán kính và bỏ điểm công khai.
- `apps/mobile/src/features/search/components/results-map-model.test.ts` kiểm nhóm ghim trùng và bỏ điểm thiếu. `apps/mobile/src/features/search/state/partner-search.test.ts` kiểm xóa kết quả và bỏ response cũ.
- `tests/e2e/web/search-map.spec.mjs` kiểm ghim trùng, mở hồ sơ, giữ người không có điểm công khai trong danh sách và xóa kết quả khi đổi điểm.

Đây là kết quả đọc source, chưa phải một lượt test mới. QA-081 có nhiều nhánh hơn một bài E2E; phải ánh xạ từng nhánh trước khi kết luận đủ độ bao phủ. Không đổi trạng thái RTM/QA nguồn chỉ vì đã tìm được tên test.

### 9.2. Nhiệm vụ và điều kiện kết thúc

| Thứ tự | Việc thực hiện | Đầu ra và điều kiện kết thúc |
|---|---|---|
| 1 | Đọc đầy đủ phần MAP-02, QA-080/081, schema của `searchPartners`, source API/app và các assertion liên quan. Ghi hiện trạng Git trước thao tác. | Danh sách tiêu chí có dẫn nguồn; phần thiếu/mâu thuẫn ghi rõ; bảo toàn mọi thay đổi có sẵn của người dùng. |
| 2 | Tạo `docs/ke-hoach-trien-khai/sdd/source-map.json`, `traceability.json` và `changes/SDD-01-MAP-02.json`. | Nguồn có path, mục hoặc JSON Pointer và dấu băm; tiêu chí nối mã MAP-02/QA/operationId hiện có tới file và tên test; trạng thái chưa chạy được giữ rõ. |
| 3 | Viết test cho bộ kiểm tại `scripts/test/sdd-check.test.mjs`, rồi triển khai `scripts/sdd/check.mjs`. Dùng Node có sẵn, không thêm dịch vụ hoặc framework. | Test chứng minh bộ kiểm xử lý đúng tham chiếu hỏng, ID trùng, nguồn đổi, thiếu liên kết test và bằng chứng không hợp lệ. Có fixture hợp lệ để kiểm tránh báo lỗi mọi trường hợp. |
| 4 | Thêm lệnh `sdd:check` trong `package.json`; hướng dẫn dùng tại `sdd/README.md`. | Chạy được từ thư mục repo. Thông báo lỗi nêu mã, file, tiêu chí và việc cần sửa; không tự cập nhật hash, tự sửa spec hoặc tự đánh dấu duyệt. |
| 5 | Chạy bộ kiểm và các test hành vi liên quan; nối kết quả thực chạy với tiêu chí. | Artifact ở `test-results/sdd/` có phiên bản code, thời gian, môi trường, lệnh, exit code, kết quả từng tiêu chí và đường dẫn log. Chỉ ghi đạt khi test thực chạy và đạt. |
| 6 | Thêm hướng dẫn ngắn vào AGENTS.md và quy trình, cập nhật checklist/mục lục, tạo báo cáo học code theo mẫu B00 với mã còn trống tại thời điểm triển khai. | Người mở phiên mới biết bắt đầu ở đâu, chạy gì và đọc kết quả thế nào. Báo cáo phân biệt kiểm cấu trúc với kiểm hành vi; ghi rõ CI/native/UAT chưa kiểm nếu chưa có bằng chứng. |

Các đường dẫn trong bảng là file dự kiến, chưa được tạo trong lượt chuẩn bị này. `source-map.json` chỉ là chỉ mục nguồn; `traceability.json` chỉ nối tới yêu cầu gốc, không trở thành bản spec thứ hai.

### 9.3. Hai mức kiểm local

- **Chuẩn bị (`--phase prepare`):** kiểm cấu trúc, nguồn, mã yêu cầu, liên kết code/test và phạm vi. Cho phép tiêu chí chưa chạy, nhưng phải hiện đúng trạng thái. Đạt bước này chỉ có nghĩa gói giao việc đủ cấu trúc để bắt đầu.
- **Bàn giao (`--phase verify`):** kiểm thêm kết quả các tiêu chí bắt buộc. Thiếu kết quả, skip, fail hoặc kết quả thuộc bản code khác đều không được báo hoàn tất.

Giao diện CLI dự kiến: `npm run sdd:check -- --change SDD-01-MAP-02 --phase prepare` và `npm run sdd:check -- --change SDD-01-MAP-02 --phase verify`. Mã thoát 0 khi đủ điều kiện của mức tương ứng, 1 khi vi phạm, 2 khi không thể kiểm do lỗi input/hệ thống. Các lệnh này chưa tồn tại cho tới nhiệm vụ 4.

Đầu vào CLI là các JSON trong `sdd/` và artifact bằng chứng cho bước verify; đầu ra là báo cáo dễ đọc cùng mã thoát. Bộ kiểm không chạy tùy ý chuỗi lệnh lấy từ JSON. Các lệnh test được thực hiện theo quy trình đã biết; kết quả nhập vào phải đối chiếu log thật. Bước đầu đây là kiểm tính nhất quán của bằng chứng, không phải cơ chế chống người có quyền sửa repo làm giả bằng chứng.

Phiên bản kiểm phải bao gồm commit nền và dấu băm các file code/test/config ảnh hưởng tới bài chạy, kể cả file chưa commit. Không đưa chính artifact kết quả vào dấu băm để tránh vòng lặp. Nguồn chuẩn được băm riêng. Khi nguồn hoặc code đổi, bằng chứng liên quan phải được xem lại; không dùng thời gian chạy gần đây làm thay thế việc khớp phiên bản.

### 9.4. Các ca kiểm bắt buộc cho bộ kiểm

| Đầu vào thử | Kết quả mong đợi |
|---|---|
| Gói có đủ nguồn và test, chưa có kết quả | Prepare đạt; verify chưa đạt |
| Path, mục/JSON Pointer, QA ID hoặc operationId sai | Chỉ rõ tham chiếu không tìm được; không bỏ qua âm thầm |
| Nội dung nguồn đổi sau lúc chuẩn bị | Báo nguồn cần đọc lại; không tự làm mới hash |
| Test đã xóa/đổi tên hoặc tiêu chí bắt buộc chưa nối test/kiểm thủ công | Báo mất liên kết; kiểm thủ công chưa chạy vẫn chưa đạt verify |
| Bằng chứng ghi pass nhưng log có fail/skip hoặc thiếu kết quả tiêu chí | Verify không đạt; số test tổng đạt không che lỗi tiêu chí bắt buộc |
| Bằng chứng thuộc code cũ hoặc không có phiên bản | Verify không đạt |
| Chỉ sửa file ngoài miền mẫu | Báo ngoài phạm vi kiểm; không tuyên bố đã kiểm toàn repo |

Chạy test bộ kiểm trước bằng `node --test scripts/test/sdd-check.test.mjs`, sau đó `npm run test:tooling` và `npm run lint`. Đây là lệnh sử dụng sau khi file được tạo; lượt chuẩn bị kế hoạch chưa chạy chúng.

Test hành vi mẫu dùng bộ hiện có: `npm run test -w apps/mobile -- --runTestsByPath src/features/search/components/results-map-model.test.ts src/features/search/state/partner-search.test.ts`; API và web chạy trên DB test theo hướng dẫn hiện hành. Khi triển khai phải kiểm cấu hình fixture trước khi chạy, không dùng DB/dữ liệu thật để chứng minh bộ kiểm.

### 9.5. Sau đợt local

Chỉ nối CI sau khi fixture sai bị phát hiện và gói mẫu hợp lệ qua được các mức kiểm tương ứng. Cấu hình CI sẽ chạy trên code của lần build đó, không dựa vào artifact local cũ; việc bảo vệ nhánh/required checks được xác minh riêng. Sau đó mới mở rộng jobs/chat và invoice. Không cần cài Spec Kit/OpenSpec hoặc dựng nhiều agent để bắt đầu.
