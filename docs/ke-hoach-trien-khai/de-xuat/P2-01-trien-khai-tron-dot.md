# P2-01 — Triển khai P2 trong một đợt

21/10/2026 · Chủ dự án yêu cầu **“làm hết phần p2 trong đợt này đi”** và đã trả lời chốt ba nhóm quyết định bên dưới. Nền code `2098b5c`. Đây là kế hoạch triển khai trong repo; bằng chứng từng phần và giới hạn tại [B11-03](../bao-cao/B11-03-tong-ket-p2.md).

## Quyết định đã chốt

1. Mở OTP đăng nhập/khôi phục và đổi email/điện thoại trong môi trường DEMO bằng Mailpit/SMS mô phỏng hiện có. Giữ giới hạn liên hệ cho phép và DB local/test; không gửi SMS/email thương mại.
2. Ngôn ngữ tài khoản gồm VI/EN/JA. Đăng nhập lấy lựa chọn tài khoản; đổi khi đăng nhập lưu server. Khách chưa đăng nhập dùng lựa chọn trên máy. Phản hồi cũ của tài khoản trước không được đổi ngôn ngữ hoặc nội dung tài khoản mới.
3. Khôi phục mất mọi kênh cần admin xét rồi người yêu cầu xác minh kênh mới. Không tự mở khóa tài khoản hoặc chuyển chủ doanh nghiệp.
4. Xóa kiểm lại nghĩa vụ, vô hiệu đăng nhập và ẩn danh hồ sơ, giữ chứng từ/nhật ký. Chưa xóa vật lý cho tới khi chốt thời hạn lưu. Không coi bước này là chứng nhận xóa hết dữ liệu cá nhân trong mọi bản sao/lịch sử.
5. Cấp quyền admin cần MFA; không tự sửa/cấp vượt quyền và không thu hồi người quản trị quyền cuối cùng.
6. Cuộc gọi dùng **LiveKit chạy local để thử âm thanh thật**. Nhận khi app nền/đóng và iOS/APNs là các mức kiểm riêng, không được lấy mô phỏng hoặc màn gọi làm bằng chứng âm thanh/provider.
7. Ngân hàng dùng **mô phỏng local, chỉ tiền test**; DB/ledger và luồng duyệt/đối soát chạy thật. Không mô tả adapter này là sandbox của ngân hàng bên ngoài.

Yêu cầu này chuyển công việc sang P2. Giới hạn P1-2 về APNs, cold-start, thiết bị thật và UAT vẫn mở. Chọn tin nhắn làm chứng cứ, Q02 ngoại lệ tài chính, chuyển chủ/đóng doanh nghiệp, PROMO-02, production và tiền thật giữ nguyên phạm vi trước.

## Kiến trúc và hiện trạng đã đọc

Giữ npm workspace, Expo/React Native, NestJS, PostgreSQL/PostGIS và feature/module hiện hành. Mỗi thao tác đi từ màn hình → API → quyền/trạng thái → giao dịch DB → kết quả. Backend quyết định quyền. Mutation có phiên bản và khóa retry; kiểm quyền lại cả khi trả kết quả cũ. Chuỗi UI dùng VI/EN/JA; state lưu mã lỗi.

| Nhóm | Hiện trạng tại đầu đợt | Nguồn cần bám |
|---|---|---|
| B01 bảo mật | Email/mật khẩu, verify local, phiên/địa chỉ đã có; OTP chỉ `purpose=verify`; chưa reset/đổi định danh/recovery/deletion | `account-batch.md`, OpenAPI nhóm Tài khoản, QA-001–006; `auth`, `accounts`, `local-messages` |
| I18N-03 | App lưu lựa chọn local; `Me`/`ProfileEdit` chỉ enum `vi` | `LocaleProvider`, `locale-state`, `profile.input`, `AccountsService.edit` |
| B09-03 còn lại | Admin MFA và quản trị tài khoản có; chưa recovery/deletion/grants UI | `admin-operations.md`, `AdminAuthService`, `OperationsService`, QA-005/006/048 |
| B08 | Có ledger/holds/settlement của hóa đơn; chưa bank/topup/payout | `finance-batch.md`, OpenAPI, QA-033/040–042, `008_invoices_ledger.sql` |
| B10-02 | Có chat/đầu mối hiện hành và công tắc call_push; chưa media/cuộc gọi | `activity-batch.md`, `startCall`/`actOnCall`, QA-024 |
| B11-01/03 | Có audit/health/quality CI; chưa metrics/admin invoice lookup/diễn tập restore | `admin-operations.md`, `getMetrics`/`adminInvoices`/`getOperation`, QA-051/052/054/055 |

API cũ có nhiều operation dự kiến nhưng chưa đủ đường đọc/chi tiết/reauth/receipt cho UI thật. Bổ sung contract triển khai theo quyết định trên; review từng diff, giữ toàn bộ baseline và tiêu chí cũ. Không tự đồng bộ Drive, Excel hoặc `ui-ux`.

## Một đợt, sáu phần nối xuyên suốt

### 1. Tài khoản, khôi phục và quản trị quyền

- Đăng nhập OTP local; quên/đặt lại và đổi mật khẩu; đổi/liên kết email/điện thoại hai bước. Mã gắn mục đích, tài khoản/liên hệ và phiên khi có; ngẫu nhiên, hết hạn, giới hạn thử/gửi, dùng một lần. Không dùng mã verify để reset hoặc lấy phiên.
- Định danh cũ giữ tới lúc xác minh kênh mới và commit. Unique bảo vệ hai người cùng chiếm liên hệ. Xung đột không gộp tài khoản. Reset/recovery thu hồi phiên, push token và admin session cũ; đổi mật khẩu kiểm lại phiên và bí mật hiện hành trong giao dịch.
- Người mất mọi kênh gửi hồ sơ có bí mật tra cứu riêng; xem/bổ sung theo quyền hồ sơ. Admin bổ sung/từ chối/cho phép xác minh; duyệt không tự đăng nhập. Không trả nội dung riêng qua API public, log hoặc snapshot retry.
- Yêu cầu xóa có xác nhận mất point, xác thực lại và xem nghĩa vụ. Admin kiểm lại ngay trong giao dịch: việc/hóa đơn chưa xử lý, số dư/holds, nạp/rút, báo cáo chưa đóng, sở hữu doanh nghiệp và quyền admin. Không cascade sổ tiền; forfeiture point nếu áp dụng phải là bút toán cân bằng.
- Quyền admin mở theo danh sách cố định: quyền hiện hành cộng `finance.read`, `reports.read`, `grant.manage`. Cấm tự thay đổi, cấp vượt quyền và làm mất người quản trị quyền cuối. Thu hồi có hiệu lực ở request/socket kế tiếp; bootstrap chỉ DEMO và không ghi bí mật vào Git.
- Giữ hành động đích hợp lệ qua đăng nhập, kiểm quyền lại; không tự gửi thao tác thuê/tiền. Địa chỉ lưu tiếp tục tạo snapshot bất biến trên việc.

### 2. Ngôn ngữ tài khoản

- Mở enum VI/EN/JA ở DB/API/client; cập nhật cùng cơ chế version/idempotency của hồ sơ.
- Khách dùng lựa chọn local. Đăng nhập lấy locale server; đăng xuất trở lại lựa chọn khách trên máy. Không gửi lựa chọn khách đè tài khoản khi đăng nhập.
- Đổi khi có phiên: lưu server thành công rồi áp dụng; lỗi giữ lựa chọn cũ và cho thử lại. Đồng bộ thiết bị khác khi đọc lại tài khoản/foreground, không cần thêm dịch vụ realtime.
- Giữ form/route và các ID dữ liệu khi đổi tiếng; xử lý phản hồi trễ và đổi tài khoản.

### 3. Ngân hàng, ví và tài chính test

- Màn ví đầy đủ theo Storybook, số dư/khả dụng/khoản giữ/lịch sử; đúng membership và quyền.
- Một ngân hàng verified đang dùng. Đề nghị mới giữ ngân hàng cũ; hủy đề nghị; admin đối chiếu/duyệt/từ chối. Chặn thay đổi khi payout chưa kết thúc, lưu số mã hóa, response che số.
- Nạp chờ không cộng tiền; chỉ đối soát xác nhận giao dịch test mới ghi có. Mã giao dịch unique ở phạm vi nguồn ngân hàng mô phỏng, không chỉ theo khóa retry.
- Rút tối thiểu 50.000, khả dụng `max(0, balance - mọi khoản giữ)`, không rút credit. Khóa cùng ledger account với giữ phí; chụp ngân hàng tại lúc tạo. Duyệt không đồng nghĩa đã chuyển.
- Timeout sau chuyển thành unknown, tiếp tục hold; tra cứu giao dịch gốc trước retry. Success consume hold và ghi tiền một lần; chỉ failure đã xác minh hoặc từ chối trước gửi mới release. Bài kiểm phải mô phỏng ngân hàng đã thực hiện nhưng mất phản hồi.
- Admin web/mobile có hàng đợi/chi tiết/đối soát/lịch sử, MFA mới, lý do và chứng cứ. Lưu bền kết quả adapter local; không để client tự báo success làm bằng chứng ngân hàng.

### 4. Cuộc gọi âm thanh thật

- Hai tài khoản trong quan hệ việc accepted/completed; target thợ/cửa hàng theo assignment/contact hiện hành. Người rời mất quyền gọi theo việc cũ; admin/manager không được nghe phòng riêng.
- Tạo cuộc gọi, nhận/từ chối/kết thúc, bận/không trả lời/lỗi mạng; version và retry. Một người không tham gia hai cuộc đang hoạt động.
- Token media do server cấp ngắn hạn cho đúng call/user/room, không chứa trong log hoặc idempotency snapshot public; recipient chỉ tham gia sau accept. Hết quyền/đăng xuất/kết thúc phải ngắt media, không chỉ đổi UI.
- SDK LiveKit cho Expo development build, không Expo Go; kiểm tương thích phiên bản trước khóa dependency. LiveKit local tách service media; NestJS vẫn quyết định quyền và trạng thái.
- Có mic/loa/kết thúc và lịch sử đúng chat; không ghi âm. Tắt call_push chỉ tắt chuông/push, không xóa lịch sử hay cấm cuộc gọi đang được phép. Phân biệt audio hai chiều, foreground, background và app đã đóng trong bằng chứng.
- Nguồn chính thức đã đọc: [LiveKit local](https://docs.livekit.io/transport/self-hosting/local/) và [Expo SDK](https://docs.livekit.io/transport/sdk-platforms/expo/). Cấu hình APNs và thiết bị có thể chặn một số lượt native; ghi đúng giới hạn, không thu hẹp tiêu chí để tuyên bố toàn bộ đã đạt.

### 5. Tra cứu và báo cáo vận hành

- Admin tra công việc/hóa đơn chỉ đọc theo quyền và MFA; thêm tìm/lọc/phân trang cần cho màn đã thiết kế. Không sinh quyền quyết toán hoặc sửa tiền từ route tra cứu.
- Metrics có định nghĩa rõ: số yêu cầu/việc, đang xử lý, đủ hai dấu, phí đã quyết toán, point bù partner, báo cáo mở, nạp/rút chờ. Không tính khách báo trả là doanh thu.
- Tra thao tác mất phản hồi chỉ đúng actor; không lộ response riêng tư/bí mật. Audit ghi đọc và quyết định nhưng không ghi nội dung chứng cứ, token, số ngân hàng đầy đủ.

### 6. Vận hành, kiểm chứng và bàn giao chung

- Công cụ/runbook local: migration, cấu hình tách môi trường, backup và restore vào DB test riêng; kiểm FK/index/trigger, ledger cân bằng và tổng số dư trước/sau. Không restore đè DB người dùng.
- Diễn tập khởi động lại/recovery worker, rollback ứng dụng tương thích schema; hướng dẫn production ghi điều kiện cần, không tự deploy hoặc cam kết RPO/RTO chưa duyệt.
- Mỗi nhóm có báo cáo B01/I18N/B08/B10/B11 tương ứng theo mẫu; ảnh app chạy thật và Mermaid đã render. Cập nhật checklist/mục lục cùng đợt, đánh dấu đúng bằng chứng local/native/CI/UAT.
- Chuỗi kiểm cuối: `npm run sdd:check -- --change SDD-PROJECT --phase prepare`; kiểm tập trung từng miền; `npm run sdd:run -- --change SDD-PROJECT`; `npm run sdd:check -- --change SDD-PROJECT --phase verify`.
- Kiểm cạnh tranh, mất phản hồi, rollback, quyền bị thu hồi và dữ liệu không rò giữa tài khoản/partner. Không thay assertion hoặc giảm coverage để lấy xanh. Native/âm thanh/provider là bằng chứng bổ sung ngoài SDD.

## Phân chia file để tích hợp

| Phần | File chính mới/được sửa | Đầu ra và phụ thuộc |
|---|---|---|
| Tài khoản/admin | `modules/auth`, `modules/accounts`, module account security/recovery, màn security/recovery/admin account và client riêng; migration `019` | API challenge/session/recovery/deletion/grants; cần kết nối nghĩa vụ tài chính khi B08 có bảng |
| Tài chính | module `finance`, feature `finance`, admin finance component/client; migration `020` | Bank/topup/payout/ledger test; dùng auth/MFA/ledger hiện có |
| Cuộc gọi | module/feature `calls`, adapter LiveKit, plugin CNG; migration `021` | Call state/media theo jobs/chat; cấu hình tích hợp ở root |
| Ngôn ngữ/vận hành/tích hợp | locale/profile, admin metrics/invoices/operation lookup, công cụ restore, navigation/module/config/contracts/SDD | Nối ba miền, kiểm toàn bộ và báo cáo |

Các file tích hợp chung `auth-session.ts`, `AppNavigator.tsx`, `app.module.ts`, `environment.ts`, `apps/admin/src/App.tsx`, OpenAPI/QA/SDD do đầu mối tích hợp rà tập trung. Mỗi miền giao client/component thật và ghi interface cần nối; không tạo nút placeholder.

## Tiến độ thực hiện

- [x] Đọc checklist/spec/API/QA, code liên quan và đối chiếu giới hạn hiện hành.
- [x] SDD prepare đạt trước thay đổi: 129 criterion; giữ QA partial/unmapped.
- [x] Chủ dự án chốt bộ quy tắc tài khoản, LiveKit local và ngân hàng mô phỏng local.
- [x] Tài khoản/khôi phục/xóa/quyền admin nối DB/API/app/test.
- [x] Ngôn ngữ tài khoản và kiểm đổi tài khoản/thiết bị.
- [x] Ví/ngân hàng/nạp/rút/đối soát test và admin.
- [x] Cuộc gọi LiveKit và bằng chứng âm thanh thật.
- [x] Tra cứu/metrics/diễn tập phục hồi.
- [x] Native Android/iOS đã build và kiểm màn bảo mật/ví/ngân hàng; báo cáo có ảnh DEMO và Mermaid render.
- Gate cuối: review các lỗi đã sửa và chạy SDD đầy đủ trên dấu băm cuối. Trạng thái máy tại `test-results/sdd/SDD-PROJECT/evidence.json` cùng `sdd:check --phase verify`; không dùng checkbox kế hoạch thay bằng chứng.

Commit/push chưa được yêu cầu trong đợt này. UAT của chủ dự án và phát hành là cổng riêng; trạng thái của kế hoạch không thay bằng chứng chạy thực tế.
