# Checklist chức năng và bằng chứng

DOC-083 · v1.0 · 01/10/2026 · DELIVERY-01. Baseline code `50d184a`. [Mục lục](README.md).

## Quy ước

- `[x]` = đạt phạm vi kỹ thuật của đúng dòng tại baseline/bằng chứng dẫn kèm; không đồng nghĩa toàn nhóm Bxx đã xong hoặc đã UAT.
- `[ ]` = chưa hoàn thành; lý do/đầu việc còn thiếu ở cột tiêu chí. Toàn nhóm có thể “một phần”. Không tính phần trăm app từ số ô tick.
- Chỉ một lát **Đang làm** tại một thời điểm. Hiện: **I18N-01/02 đã push ở `844e1d2`, CI đạt**. **B00-05 đã bàn giao lát khung khách ngày 04/10/2026**, đạt local/native cho chức năng hiện có; chủ dự án xác nhận và yêu cầu push ngày 05/10; chưa UAT toàn app, chưa đóng khung các vai trò và nghiệp vụ còn lại. **B01-02 Pending theo yêu cầu chủ dự án ngày 01/10/2026**, do cần cân nhắc chi phí. Tạm hoãn cả triển khai local và tích hợp gửi thật; chưa bắt đầu code OTP. Chỉ mở lại khi chủ dự án yêu cầu. Các phần phụ thuộc xác minh không được bỏ qua điều kiện bảo mật để đi tiếp.
- Hạng mục mới theo kế hoạch chưa có phê duyệt tích hợp trả phí/production. Phần thay contract cần chốt rõ trước khi code.
- Chưa có dòng nào được gắn “UAT chủ dự án đã nghiệm thu”.

## Bằng chứng hiện hành

| Mốc | Bằng chứng | Kết luận được phép dùng |
|---|---|---|
| `41579b5` | [B00-01](bao-cao/B00-01-nen-tang-danh-muc.md), [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36729018889) | UI chung/native navigation và nền danh mục |
| `50d184a` | [B01-01](bao-cao/B01-01-email-mat-khau.md), [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36810424485) | 65 test mobile, 30 API, 3 web, 3 tooling; CI 3 jobs đạt |
| Working tree 01/10 | [I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md); 81 test mobile, 3 web hồi quy + 1 web i18n; native i18n/layout/auth hai nền tảng | Đạt kỹ thuật I18N-01/02, chưa commit/push, chưa CI mới/UAT |
| Native cuối 30/09 UTC–01/10 JST | `test-results/native/{android,ios}/{result.json,auth/result.json}`; báo cáo B00/B01 | Danh mục + auth đạt trên DVQB_API_36 và iPhone 18 Pro/iOS 27; không phải thiết bị thật |
| `844e1d2` · 04/10 JST | [CI 37132800077](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37132800077); kiểm trước push: 81 mobile, 4 web, 3 tooling, typecheck/lint/build đạt | Đã push i18n và bộ báo cáo; CI 3 jobs đạt. Không phải bằng chứng cho phần B00-05 viết sau commit này |
| Local sau `844e1d2` · 04/10 JST | [B00-05](bao-cao/B00-05-khung-giao-dien.md): 83 mobile, 5 web, 3 tooling; shell/auth/layout Android và iOS đạt; typecheck/lint/build đạt | Khung khách cho chức năng hiện có đã kiểm. Chủ dự án xác nhận và yêu cầu push ngày 05/10; chưa UAT toàn app; B00-05 còn khung các vai trò và nghiệp vụ khác |

Đã push B00-05 ở `c120062` ngày 05/10; [CI 37262885727](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37262885727) đã đạt cả 3 jobs (API/PostGIS, static/mobile, web E2E). I18N-04 đang có [đề xuất cụ thể](de-xuat/I18N-04-dich-danh-muc.md), chờ quyết định; chưa triển khai.

Artifact local không track Git. Nếu không còn artifact, chạy lại theo báo cáo; không đổi ngày kiểm cũ thành ngày hiện tại.

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

## I18N — Nền đa ngôn ngữ — làm tiếp trước mở rộng UI

Nguồn: [spec](../../ui-ux/specs/ux-scope-current.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F17; UI ngôn ngữ; QA bổ sung khi thực hiện.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | I18N-01 | Message keys và trạng thái lỗi độc lập ngôn ngữ | i18n-js, typed keys/params, đủ khóa VI/EN/JA, fallback/số nhiều; lỗi auth là mã. [Báo cáo I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md), kiểm local 01/10, đã push `844e1d2` |
| [x] | I18N-02 | VI/EN/JA cho các màn đã có + chọn/lưu locale local | Giữ form/route/session, lưu local; i18n/auth và cỡ chữ lớn đạt Android/iOS; web 3 hồi quy + 1 i18n đạt. [Báo cáo](bao-cao/I18N-01-nen-da-ngon-ngu.md). CI `844e1d2` đạt; chưa UAT |
| [ ] | I18N-03 | Locale tài khoản và đồng bộ đa thiết bị | Cần chốt ưu tiên locale local/tài khoản; mở rộng enum Me/ProfileEdit theo quyết định |
| [ ] | I18N-04 | Bản dịch danh mục/kỹ năng và tìm kiếm theo ngôn ngữ | Chốt nguồn bản dịch và fallback; categories.translations chưa được trả ra API; skills chưa có translations |

## B01 — Tài khoản — chỉ lát email/mật khẩu local hoàn thành

Nguồn: [spec](../../ui-ux/specs/account-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F01/F08; QA-001…006.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B01-01 | Email/mật khẩu + phiên local | Đăng ký/login, SecureStore, access 15 phút, phiên tối đa 30 ngày, rotation/replay/logout; email chưa xác minh; xem [báo cáo](bao-cao/B01-01-email-mat-khau.md) |
| [ ] | B01-02 | OTP điện thoại và xác minh email | **Pending — chủ dự án yêu cầu hoãn ngày 01/10/2026 vì cân nhắc chi phí**, gồm cả local; chỉ mở lại khi được yêu cầu. Provider/chính sách mã chưa duyệt; không cấp verified từ client |
| [ ] | B01-03 | Quên/đổi mật khẩu, liên kết/đổi định danh | Chứng minh kênh mới; giữ kênh cũ đến commit; revoke phiên theo spec |
| [ ] | B01-04 | Hồ sơ tài khoản, quản lý phiên và địa chỉ | get/editMe, list/revokeSessions; địa chỉ mặc định; snapshot việc cũ bất biến |
| [ ] | B01-05 | Guard và quyền nền, fresh auth/MFA admin | Đổi UI vai không cấp quyền; từ chối cross-user/tenant; phương thức MFA cần chọn |
| [ ] | B01-06 | Khôi phục thủ công và yêu cầu xóa tài khoản | Kiểm nghĩa vụ server, không xóa lịch sử tài chính; đóng toàn luồng sau màn admin B09/B11 |
| [ ] | B01-07 | Tiếp tục hành động sau đăng nhập và deep link có quyền | Giữ intent chat/thuê; recheck đối tượng/quyền trước tiếp tục, không tự gửi mutation |

## B02 — Nguồn cung — chỉ có danh mục đọc thật

Nguồn: [spec](../../ui-ux/specs/partner-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F02/F03/F05; QA-007…009,012,049.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B02-01 | Đọc ngành → nhóm → kỹ năng | API DB thật, lọc toàn cây active, cursor ký, UI tải/rỗng/lỗi/retry; chưa CRUD quản trị; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [ ] | B02-02 | Upload/asset làm nền cho ảnh và giấy tờ | createUpload/completeUpload/getAsset; ownership, trạng thái ready, private/public, dung lượng/loại file |
| [ ] | B02-03 | Đăng ký/hồ sơ partner đa loại, kỹ năng, vùng, địa điểm | Thợ/cửa hàng/doanh nghiệp; nháp và công bố; dữ liệu nhạy cảm không ra public |
| [ ] | B02-04 | Bật/tắt nhận việc và đình chỉ | Recheck lúc gửi thuê; việc cũ vẫn theo quyền hiện hành |
| [ ] | B02-05 | Gửi/xét xác minh và quản trị danh mục tối thiểu | Admin thật có quyền/audit; cần bổ sung/đạt/không đạt; không có nút partner tự duyệt |

## B03 — Tìm và thuê — chưa có code sản phẩm

Nguồn: [spec](../../ui-ux/specs/customer-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F04/F06/F07; QA-010,011,017,018,053.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B03-01 | Tìm danh sách/bản đồ, GPS/tay, bộ lọc và hồ sơ | Lọc điều kiện trước xếp hạng; 10km/mở rộng theo spec; từ chối GPS vẫn dùng được |
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
