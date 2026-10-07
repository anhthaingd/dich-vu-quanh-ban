# Checklist chức năng và bằng chứng


**Cập nhật 07/10:** MAP-01 đã push `4dc7600`, [CI đạt cả 3 job](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37577265358). **MAP-02 đã triển khai** theo quyết định chỉ ghim địa điểm công khai; người chưa có điểm công khai vẫn hiện danh sách. [Báo cáo B03-02](bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md) ghi kiểm thử/ảnh và trạng thái push riêng. Thứ tự P0-1 → MAP-01 → MAP-02 → P0-2 → P0-3. Các mốc chưa tích hợp bản đồ phía dưới là lịch sử, không thay trạng thái này.
DOC-083 · v1.0 · 01/10/2026 · DELIVERY-01. Baseline code `50d184a`. [Mục lục](README.md).

## Quy ước

- `[x]` = đạt phạm vi kỹ thuật của đúng dòng tại baseline/bằng chứng dẫn kèm; không đồng nghĩa toàn nhóm Bxx đã xong hoặc đã UAT.
- `[ ]` = chưa hoàn thành; lý do/đầu việc còn thiếu ở cột tiêu chí. Toàn nhóm có thể “một phần”. Không tính phần trăm app từ số ô tick.
- Gói vừa triển khai: **P0-1 — người cung cấp và tìm dịch vụ**, đã duyệt ngày 06/10/2026. [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md) ghi bằng chứng local/native và giới hạn. Tiếp theo **MAP-01 chọn địa điểm bằng địa chỉ/bản đồ**, rồi **P0-2 gửi/nhận việc + chat**, theo yêu cầu 07/10. [Kế hoạch MAP-01](de-xuat/MAP-01-ban-do-mien-phi.md) đã triển khai theo duyệt tiếp ngày 07/10, OpenAPI v0.1.7; xem [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md). Đã thử live, CI MAP-01 đạt; chưa billing/UAT. **B01-02 OTP vẫn Pending**; chỉ tài khoản DEMO mới local/test được cấp định danh thử theo cho phép của chủ dự án.
- Hạng mục mới theo kế hoạch chưa có phê duyệt tích hợp trả phí/production. Phần thay contract cần chốt rõ trước khi code.
- Chưa có dòng nào được gắn “UAT chủ dự án đã nghiệm thu”.

## Hàng đợi ưu tiên

Bảng này là thứ tự làm việc mới nhất; bảng chi tiết Bxx bên dưới vẫn theo nhóm để tra cứu. Chưa đánh dấu xong chỉ vì đã có kế hoạch.

| Ưu tiên | Kết quả bàn giao | Trạng thái hiện tại |
|---|---|---|
| **P0-1** | Tạo/quản lý/công bố hồ sơ cung cấp, kỹ năng/giá/vùng, nhận việc; khách tìm và xem hồ sơ | **Đã implement và kiểm local/native** theo phạm vi đã duyệt. [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md). Đã push `fe35564`, [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37566935703) đạt 3 jobs; chưa UAT, không đóng bản đồ/GPS/upload/xét xác minh/ranking. |
| **MAP-01** | Nhập địa chỉ/gợi ý, chọn ghim, GPS; bộ chọn chung tìm dịch vụ/sổ địa chỉ/cửa hàng/tâm vùng | **Code/local đã kiểm; live map trên web, Android emulator, iOS simulator.** [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md). Chưa kiểm trọn 4 nơi trên từng native, GPS thiết bị thật, UAT; CI MAP-01 đã đạt. Chưa billing. |
| **MAP-02 — trước P0-2** | Ghim địa điểm công khai trong kết quả; giữ người không có ghim trong danh sách | [B03-02 / MAP-02](bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md): API/app/test, điểm trùng và hồ sơ; không công khai tâm vùng, không GPS thợ. |
| **P0-2** | Gửi/nhận/theo dõi yêu cầu, thay đổi/rút/dừng, chat trước/sau thuê | Sau nguồn cung P0-1, MAP-01 và MAP-02; quyền/xác minh vẫn bắt buộc. |
| **P0-3** | Ảnh kết quả, hóa đơn, point/phí và hoàn tất với tiền test | Sau P0-2; ảnh và nền ví cần thiết được làm ngay trong gói phụ thuộc. |
| **P1** | Đội ngũ/phân công đầy đủ, thông báo/lịch, bản đồ nâng cao ngoài MAP-01/MAP-02, đánh giá, hỗ trợ/admin | Kéo phần tối thiểu lên P0 khi bắt buộc để luồng chính chạy đúng; provider/cost cần duyệt riêng. |
| **P2** | Tiện ích tài khoản còn lại, locale tài khoản, gọi, ngân hàng sandbox, vận hành mở rộng | Không chen trước P0 vì dễ làm; vẫn là yêu cầu cần xử lý trước ra mắt nếu nằm trong phạm vi bắt buộc. |

UAT và phê duyệt production/tiền thật là cổng riêng, không tự mở từ bảng này.

## Bằng chứng hiện hành

**Đã push P0-1 tại `fe35564` ngày 07/10/2026; [CI 37566935703](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37566935703) đạt cả 3 jobs: static/mobile/build, API/PostGIS và web E2E.** Chưa UAT; native dùng bằng chứng emulator/simulator đã ghi, không phải thiết bị thật. Các ghi chú chưa push/CI ở mốc kiểm trước là lịch sử.

**Rà soát UI P0-1 · 07/10/2026:** làm rõ khối nhận việc đầu màn, trạng thái ở danh sách, bốn mục chỉnh sửa hai cột và ngôn ngữ ở cuối. [Báo cáo và 24 ảnh Android/iOS](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md) ghi 139 mobile, web P0-1 và native hai nền tảng đạt; typecheck/lint đạt. Không đổi API/DB/spec; chưa commit/push/CI mới, chưa nghiệm thu UI sau sửa.

**P0-1 · 06/10/2026:** [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md) — hồ sơ quản lý → công bố/nhận việc → tìm PostGIS → public profile, DEMO local riêng. API/mobile/web/native có bằng chứng chi tiết tại báo cáo; chưa push/CI/UAT gói này. OTP/map/tiền thật chưa mở.

**Đợt gộp mới 06/10/2026:** sửa tên đã push `312972b`, [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37402534136) đạt 3 jobs. [Phiên và địa chỉ](bao-cao/B01-04-phien-va-dia-chi.md) đã implement và kiểm local: 50 API, 106 mobile, 7 web (hành trình mới kiểm lại sau sửa tọa độ), accounts Android/iOS PASS; typecheck/lint/build, tooling đạt. Gói đã push `4a98dc0`; [CI 37424414095](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37424414095) đạt cả 3 jobs. Chưa UAT. [Đợt bổ sung](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md) đạt 124 mobile, 8 web (hai hành trình tài khoản kiểm lại sau chỉnh UI cuối), accounts Android/iOS PASS, lint/typecheck/build và 3 tooling; đã push `a823d0e`; [CI 37428334396](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37428334396) đạt cả 3 jobs, chưa UAT. Các mốc bên dưới là lịch sử.

**Mốc trước đợt gộp 06/10/2026:** đã push danh mục `1c80f67`; [CI 37398471842](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37398471842) đạt cả ba jobs. Chủ dự án xác nhận danh mục 10 ngành/39 nhóm/128 kỹ năng; chưa UAT toàn app. Các ghi chú chưa push/CI của ngày 05/10 bên dưới là lịch sử. Lát đang bàn giao: [B01-04 sửa tên hiển thị](bao-cao/B01-04-ho-so-ten-hien-thi.md), đã implement sau duyệt `Me.version`; 44 API/98 mobile đạt, 5 web hồi quy và 1 web profile đạt qua hai lượt chạy, profile Android/iOS PASS; typecheck/lint/build và 3 tooling đạt. Chưa commit/push/CI/UAT mới; OTP vẫn Pending.

| Mốc | Bằng chứng | Kết luận được phép dùng |
|---|---|---|
| `41579b5` | [B00-01](bao-cao/B00-01-nen-tang-danh-muc.md), [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36729018889) | UI chung/native navigation và nền danh mục |
| `50d184a` | [B01-01](bao-cao/B01-01-email-mat-khau.md), [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36810424485) | 65 test mobile, 30 API, 3 web, 3 tooling; CI 3 jobs đạt |
| Working tree 01/10 | [I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md); 81 test mobile, 3 web hồi quy + 1 web i18n; native i18n/layout/auth hai nền tảng | Đạt kỹ thuật I18N-01/02, chưa commit/push, chưa CI mới/UAT |
| Native cuối 30/09 UTC–01/10 JST | `test-results/native/{android,ios}/{result.json,auth/result.json}`; báo cáo B00/B01 | Danh mục + auth đạt trên DVQB_API_36 và iPhone 18 Pro/iOS 27; không phải thiết bị thật |
| `844e1d2` · 04/10 JST | [CI 37132800077](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37132800077); kiểm trước push: 81 mobile, 4 web, 3 tooling, typecheck/lint/build đạt | Đã push i18n và bộ báo cáo; CI 3 jobs đạt. Không phải bằng chứng cho phần B00-05 viết sau commit này |
| Local sau `844e1d2` · 04/10 JST | [B00-05](bao-cao/B00-05-khung-giao-dien.md): 83 mobile, 5 web, 3 tooling; shell/auth/layout Android và iOS đạt; typecheck/lint/build đạt | Khung khách cho chức năng hiện có đã kiểm. Chủ dự án xác nhận và yêu cầu push ngày 05/10; chưa UAT toàn app; B00-05 còn khung các vai trò và nghiệp vụ khác |

Đã push B00-05 ở `c120062` ngày 05/10; [CI 37262885727](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37262885727) đã đạt cả 3 jobs (API/PostGIS, static/mobile, web E2E). I18N-04 được duyệt ngày 05/10 và đã triển khai lát đọc danh mục đa ngôn ngữ, mở rộng DB; xem [báo cáo](bao-cao/I18N-04-danh-muc-da-ngon-ngu.md). Chưa push/CI/UAT.

Artifact local không track Git. Nếu không còn artifact, chạy lại theo báo cáo; không đổi ngày kiểm cũ thành ngày hiện tại.

> Rà soát 05/10 phát hiện chồng chéo trong bộ cũ. Chủ dự án đã yêu cầu clear và nạp lại; [bộ mới](bao-cao/B02-01-thay-du-lieu-danh-muc.md) có **10 ngành/39 nhóm/128 kỹ năng**, một nhóm chính cho mỗi kỹ năng. Đã thay DB local và kiểm giữ nguyên tài khoản/phiên; kiểm kỹ thuật không thay nghiệm thu nội dung/UAT.

## B00 — Nền tảng — đã có phần chạy thật, chưa đóng toàn phạm vi

Nguồn: [spec](../technical-design/04-backlog.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F17/F18/F20; QA-055…060.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B00-01 | Workspace, API/DB, migration/seed và health | Mobile/API chạy; migration lặp không nhân đôi; DB test tách biệt; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [x] | B00-02 | Theme, UI chung và native stack | Button/Input/Card/Feedback; Back, blur/cancel và resume được kiểm; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [x] | B00-03 | Log/test phương án A và CI | Correlation, lọc dữ liệu nhạy cảm, unit/integration/web, coverage gate; CI 50d184a đạt; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [x] | B00-04 | Development build + E2E danh mục Android/iOS | Binary có SecureStore; danh mục và auth chạy trên hai máy ảo; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [ ] | B00-05 | Shell sản phẩm đúng UI-16, routing và các điểm vào thật | **Một phần: khung khách hiện có đạt local/native** — header/avatar, danh mục, tài khoản, Tìm dịch vụ. [Báo cáo](bao-cao/B00-05-khung-giao-dien.md). Khung partner/DN và điểm vào nghiệp vụ khác nối theo chức năng thật; chưa đóng toàn dòng |
| [ ] | B00-06 | Admin workspace tối thiểu khi bắt đầu có tác vụ vận hành | Manifest/build/test/auth/quyền thật; không suy ra từ folder apps/admin |

## I18N — Nền đa ngôn ngữ — duy trì trong từng gói chức năng

Nguồn: [spec](../../ui-ux/specs/ux-scope-current.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F17; UI ngôn ngữ; QA bổ sung khi thực hiện.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | I18N-01 | Message keys và trạng thái lỗi độc lập ngôn ngữ | i18n-js, typed keys/params, đủ khóa VI/EN/JA, fallback/số nhiều; lỗi auth là mã. [Báo cáo I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md), kiểm local 01/10, đã push `844e1d2` |
| [x] | I18N-02 | VI/EN/JA cho các màn đã có + chọn/lưu locale local | Giữ form/route/session, lưu local; i18n/auth và cỡ chữ lớn đạt Android/iOS; web 3 hồi quy + 1 i18n đạt. [Báo cáo](bao-cao/I18N-01-nen-da-ngon-ngu.md). CI `844e1d2` đạt; chưa UAT |
| [ ] | I18N-03 | Locale tài khoản và đồng bộ đa thiết bị | Cần chốt ưu tiên locale local/tài khoản; mở rộng enum Me/ProfileEdit theo quyết định |
| [ ] | I18N-04 | Bản dịch danh mục/kỹ năng và tìm kiếm theo ngôn ngữ | **Một phần:** lát đọc tên VI/EN/JA, fallback, cursor theo locale; 10 ngành/39 nhóm/128 kỹ năng sau thay dữ liệu đã kiểm kỹ thuật local. [Báo cáo](bao-cao/I18N-04-danh-muc-da-ngon-ngu.md). Phân loại đã thay bằng bộ mới theo [báo cáo](bao-cao/B02-01-thay-du-lieu-danh-muc.md); CI `1c80f67` đạt. Tìm kiếm theo ngôn ngữ B03 chưa làm, chưa UAT toàn app. |

## B01 — Tài khoản — đã có email/mật khẩu, sửa tên, phiên và địa chỉ; toàn nhóm còn một phần

Nguồn: [spec](../../ui-ux/specs/account-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F01/F08; QA-001…006.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B01-01 | Email/mật khẩu + phiên local | Đăng ký/login, SecureStore, access 15 phút, phiên tối đa 30 ngày, rotation/replay/logout; email chưa xác minh; xem [báo cáo](bao-cao/B01-01-email-mat-khau.md) |
| [ ] | B01-02 | OTP điện thoại và xác minh email | **Pending — chủ dự án yêu cầu hoãn ngày 01/10/2026 vì cân nhắc chi phí**, gồm cả local; chỉ mở lại khi được yêu cầu. Provider/chính sách mã chưa duyệt; không cấp verified từ client |
| [ ] | B01-03 | Quên/đổi mật khẩu, liên kết/đổi định danh | Chứng minh kênh mới; giữ kênh cũ đến commit; revoke phiên theo spec |
| [ ] | B01-04 | Hồ sơ tài khoản, quản lý phiên và địa chỉ | get/editMe, list/revokeSessions; địa chỉ mặc định; snapshot việc cũ bất biến. **Một phần:** đã implement lát sửa tên có version/idempotency; [báo cáo](bao-cao/B01-04-ho-so-ten-hien-thi.md). Đã có list/thu hồi từng phiên và địa chỉ thêm/sửa/gỡ/mặc định, [báo cáo gói](bao-cao/B01-04-phien-va-dia-chi.md). Gói đã push `4a98dc0`/CI đạt. Đã code [thu hồi các phiên khác](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md) bằng API từng phiên; Android/iOS và kiểm lỗi/thử lại đã đạt. Còn nối địa chỉ tìm/thuê và kiểm snapshot jobs; phần bổ sung đã push `a823d0e`, [CI 37428334396](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37428334396) đạt cả 3 jobs, chưa UAT |
| [ ] | B01-05 | Guard và quyền nền, fresh auth/MFA admin | Đổi UI vai không cấp quyền; từ chối cross-user/tenant; phương thức MFA cần chọn |
| [ ] | B01-06 | Khôi phục thủ công và yêu cầu xóa tài khoản | Kiểm nghĩa vụ server, không xóa lịch sử tài chính; đóng toàn luồng sau màn admin B09/B11 |
| [ ] | B01-07 | Tiếp tục hành động sau đăng nhập và deep link có quyền | **Một phần:** [trở lại Profile/Sessions/Addresses sau login](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md), đọc lại theo tài khoản, không tự gửi mutation. Chat/thuê và deep link ngoài app còn mở |

## B02 — Nguồn cung — P0-1 đã có phần chạy thật

Nguồn: [spec](../../ui-ux/specs/partner-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F02/F03/F05; QA-007…009,012,049.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B02-01 | Đọc ngành → nhóm → kỹ năng | Đạt lát đọc kỹ thuật: API DB thật, lọc toàn cây active, cursor ký, UI tải/rỗng/lỗi/retry; chưa CRUD quản trị; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md). [Thay bộ dữ liệu theo yêu cầu 05/10](bao-cao/B02-01-thay-du-lieu-danh-muc.md): 39 nhóm/128 kỹ năng, đã kiểm local; chưa UAT nội dung |
| [ ] | B02-02 | Upload/asset làm nền cho ảnh và giấy tờ | createUpload/completeUpload/getAsset; ownership, trạng thái ready, private/public, dung lượng/loại file |
| [ ] | B02-03 | Đăng ký/hồ sơ partner đa loại, kỹ năng, vùng, địa điểm | **Một phần đạt P0-1**: thợ/cửa hàng/doanh nghiệp, kỹ năng/giá/vùng tròn/địa điểm, nháp/công bố và DTO riêng. [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md). Ảnh/upload/xét xác minh còn mở |
| [ ] | B02-04 | Bật/tắt nhận việc và đình chỉ | **Một phần đạt P0-1**: bật/tắt nhận việc, loại khỏi tìm kiếm, lọc đình chỉ. Recheck lúc gửi thuê ở P0-2; admin đình chỉ còn mở |
| [ ] | B02-05 | Gửi/xét xác minh và quản trị danh mục tối thiểu | Admin thật có quyền/audit; cần bổ sung/đạt/không đạt; không có nút partner tự duyệt |

## B03 — Tìm và thuê — đã có tìm danh sách P0-1, MAP-01 đã triển khai thử local

Nguồn: [spec](../../ui-ux/specs/customer-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F04/F06/F07; QA-010,011,017,018,053.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B03-01 | Tìm danh sách/bản đồ, GPS/tay, bộ lọc và hồ sơ | **P0-1 + MAP-01 đạt phần code/local**: bộ chọn chung, map/GPS theo nút, địa chỉ lưu, vùng tròn và điểm cửa hàng public. [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md). MAP-02 thêm ghim public theo kết quả đã tải và gom điểm trùng, xem báo cáo B03-02. Polygon/ranking khác, UAT và thiết bị thật còn mở. |
| [ ] | B03-02 | Gửi yêu cầu làm ngay/hẹn trước, nhiều kỹ năng | Điện thoại đã xác minh; chặn tự thuê/doanh nghiệp đang tham gia; retry không nhân đôi |
| [ ] | B03-03 | Danh sách/chi tiết việc, nhận/từ chối/rút | Kiểm version/cạnh tranh; làm ngay có ETA, không thêm bước bắt đầu |
| [ ] | B03-04 | Đổi lịch/dừng việc và liên hệ trước thuê | Đổi lịch chỉ giờ hẹn, không tự đóng việc; chat trước thuê hoàn tất tích hợp khi B05 đạt |

## B04 — Doanh nghiệp và phân công — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/partner-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F08; QA-013…016.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B04-01 | Membership: mời/nhận/gửi lại/rời/cấp quyền | Lời mời 7 ngày theo spec; một quản lý có thể kiêm quyền; không rò tenant |
| [ ] | B04-02 | Phân công/đổi nhân viên/đầu mối gọi | Một assignment hiệu lực; người cũ mất quyền việc; giữ chat riêng; chưa mở chuyển chủ/đóng DN |

## B05 — Chat, lịch và thông báo — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/activity-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F09/F07; QA-019,021,022,023,025,050.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B05-01 | Chat trước/sau thuê: mở phòng, lịch sử, gửi/đọc | Phòng theo cặp tài khoản; ACK sau commit, idempotency và reconnect; quản lý không đọc phòng riêng |
| [ ] | B05-02 | Outbox/inbox, device push, cài đặt và deep link | Provider/cost cần chốt; tắt push vẫn có inbox; chỉ đến đúng người có quyền hiện hành |
| [ ] | B05-03 | Lịch, nhắc 24h/1h và đổi lịch | Không nhắc lịch cũ; múi giờ nghiệp vụ không đổi theo ngôn ngữ |

## B06 — Hóa đơn — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/activity-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F10/F07; QA-020,026…028.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B06-01 | Ảnh kết quả, nháp hóa đơn công/vật tư | Ảnh phải ready khi gửi; người thực hiện gửi trực tiếp, không thêm duyệt quản lý |
| [ ] | B06-02 | Gửi/xem/yêu cầu sửa/xác nhận hóa đơn | Bản gửi bất biến, kiểm version; khóa xong không sửa số tiền; preview point mặc định 0 |
| [ ] | B06-03 | Tích hợp dừng việc, hóa đơn 0 và trạng thái hoàn tất | Theo quy tắc đã chốt; xác nhận hóa đơn riêng chưa hoàn tất việc; tiền chỉ test khi B07 đạt |

## B07 — Ví/point/quyết toán test — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/finance-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F11/F12; QA-029…037,043.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B07-01 | Ledger/holds/formula version và projection | Bút toán cân bằng, số nguyên; dùng bộ mẫu spec, không suy công thức từ một ví dụ UI |
| [ ] | B07-02 | Point, giữ phí và hai dấu thanh toán | Khách báo trả + thợ xác nhận nhận; một settlement; thưởng chưa quyết toán không tiêu được |
| [ ] | B07-03 | Ví/lịch sử và cạnh tranh/crash recovery | Nhiều việc song song; âm ví chỉ phục vụ phí; cash trực tiếp không hạch toán thành tiền platform |

## B08 — Ngân hàng/nạp/rút sandbox — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/finance-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F12; QA-040…042.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B08-01 | Ngân hàng đã xác minh, topup/payout và hàng đợi duyệt | Một ngân hàng; mức rút 50.000 theo spec; quyền tài chính riêng, không rút credit |
| [ ] | B08-02 | Đối soát, idempotency và kết quả unknown | Giữ tiền khi chưa rõ; không ghi có/chuyển lại hai lần; nhà cung cấp/ngân sách chưa chọn |

## B09 — Hỗ trợ/admin — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/support-moderation.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F14/F15/F16; QA-038,039,047,048.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B09-01 | Báo cáo, chứng cứ, trao đổi và hàng đợi hỗ trợ | URL có quyền, audit; đóng báo cáo không sinh bút toán |
| [ ] | B09-02 | Admin hoàn tất thay: preview/fresh auth/lý do/recheck | Dùng cùng settlement service; không giả dấu nhận tiền, không tự mở đánh giá |
| [ ] | B09-03 | Xử lý khôi phục/xóa, user/partner/verification/admin grants | Nối các luồng B01/B02; nguyên tắc tối thiểu quyền và lịch sử quyết định |

## B10 — Đánh giá và gọi — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/activity-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F09/F13; QA-024,044…046.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B10-01 | Đánh giá hai chiều, sửa/ẩn/phản hồi, tính sao | Chỉ sau đủ hai dấu Q01; mỗi chiều một đánh giá; ẩn/gỡ không tính sao |
| [ ] | B10-02 | Gọi trong app, đầu mối hiện hành và sau hoàn tất | Adapter/provider cần chọn; recheck quyền; không coi nút gọi hoặc mock là cuộc gọi thật |

## B11 — UAT và vận hành — chưa nghiệm thu

Nguồn: [spec](../../ui-ux/specs/admin-operations.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F16/F17/F18/F20; QA-051,052,054,055.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B11-01 | Admin tra cứu/hóa đơn/audit/metrics và permission matrix | Không bỏ sót workflow từ RTM; thông tin nhạy cảm chỉ trả đúng quyền |
| [ ] | B11-02 | UAT khách/partner/doanh nghiệp/admin xuyên toàn hành trình | Từng nền tảng, VI/EN/JA, accessibility, offline, nhiều tài khoản; chủ dự án xác nhận riêng |
| [ ] | B11-03 | Runbook môi trường, deploy/backup/restore/rollback/giám sát | Diễn tập và bằng chứng ở môi trường được cho phép; kế hoạch không tự cho deploy |

## G-MONEY — Cổng tiền thật — CHƯA ĐƯỢC PHÉP

Nguồn: [spec](../technical-design/04-backlog.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F15/F12/F19; QA-038,043,055.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | G-MONEY-01 | Q02 khoản giữ treo, đối soát, dự trữ và ngoại lệ | PLAN-005/007, nhà cung cấp/ngân sách, chính sách và test phải được duyệt trước tiền thật |

## Ngoài phase đầu / chưa được mở lại

Banner chiến dịch, quảng cáo partner, voucher theo PROMO-02; chuyển chủ/đóng doanh nghiệp và các phương án pending khác không được biến thành nhiệm vụ triển khai đã duyệt. Point vẫn nằm trong B07. Website khách làm sau theo kế hoạch riêng; web Expo hiện là preview/test, không phải website sản phẩm. Không bắt đầu tiền thật từ việc đạt test sandbox.

## Khi cập nhật checklist

Ghi mã lát, trạng thái, commit, kết quả kiểm, báo cáo và phần thiếu. Nếu một lỗi hồi quy làm mất tiêu chí, bỏ tick ở lát bị ảnh hưởng và ghi lý do; không xóa bằng chứng cũ. Tra đầy đủ operationId/QA trong nguồn trước mỗi lát; các dải QA ở đây là điểm vào, không thay RTM hay xác nhận toàn bộ QA đã pass.

### MAP-01 — bằng chứng ngày 07/10/2026

- [x] Ba API và bộ chọn chung 4 nơi; hai key Geoapify thật trả 200; chưa billing.
- [x] 148 mobile; API toàn bộ 66 và nhóm địa điểm 6 bài sau bổ sung contract; 10 web và bài MAP chạy lại đạt. Typecheck/lint/native config đạt.
- [x] Build Android/iOS; live map trên emulator/simulator; Android accounts và iOS partners hồi quy đạt. Mermaid đã render, ảnh trong [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md).
- [ ] Live picker trọn 4 nơi trên từng native, GPS/chữ lớn/thiết bị thật, chủ dự án UAT.
- [x] MAP-01 push `4dc7600`; CI 37577265358 đạt cả 3 job.

### MAP-02 — bằng chứng ngày 07/10/2026

- [x] Quyết định public-only; API `map_location` Address/null, giữ ranking/cursor/quyền.
- [x] Danh sách/bản đồ, ghim trùng mở từng hồ sơ, thiếu ghim vẫn hiện danh sách; lỗi map/thử lại; VI/EN/JA.
- [x] Typecheck/lint, 152 mobile và 68 API, coverage gate; E2E web và web live.
- [x] Ảnh bản đồ/thẻ ghim trên Android emulator và iOS simulator; iOS mở hồ sơ đạt. Xem [B03-02](bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md).
- [x] Android kiểm lại đạt nhập địa chỉ → tìm → ghim → mở hồ sơ, sau gián đoạn emulator; có ảnh hồ sơ.
- [ ] Commit/push và remote CI MAP-02.
- [ ] Thiết bị thật, UAT; chưa billing/production.
