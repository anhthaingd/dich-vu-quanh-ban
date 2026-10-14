# DOC-060 · Ví, ngân hàng, phân quyền và duyệt tài chính — UI-18

React v0.12 · 27/09/2026 · Bản thiết kế để review, chưa triển khai sản phẩm.

## Mở giao diện
- Storybook: wallet-mobile, partner-wallet, company-wallet (nhóm Dịch vụ quanh bạn / Thử giao diện).
- Ví ở thanh điều hướng partner; chọn Nạp tiền, Rút tiền, Ngân hàng nhận tiền hoặc Lịch sử ví.
- Avatar → Đội ngũ doanh nghiệp → Quyền truy cập: xem quyền thực tế của từng thành viên đang hoạt động.

## Luồng ví
Ví → Nạp/Rút → nhập số tiền → gửi yêu cầu → lịch sử → mở chi tiết.
Rút yêu cầu xác nhận ngân hàng; tiền giữ ngay, không được dùng hạn mức âm để rút. Nạp chờ duyệt không cộng số dư. Lệnh rút lưu bản chụp ngân hàng tại thời điểm tạo; đổi hồ sơ sau này không đổi lệnh cũ.
Lịch sử lọc Tất cả / Nạp / Rút / Phí–point, xem chi tiết thời gian, số tiền, ngân hàng hoặc phí và point công việc. Tiền trả trực tiếp không xuất hiện như tiền đi vào ví.

## Ngân hàng
Ví → Ngân hàng → nhập đề nghị mới + lý do + xác thực mẫu → Chờ admin.
Ngân hàng đang dùng giữ nguyên. Có thể hủy đề nghị. Chặn thay đổi khi đang có lệnh rút giữ tiền. Chỉ một tài khoản nhận đang hoạt động. Quy tắc này áp dụng theo baseline DOC-007, không đổi nghiệp vụ.

## Quyền
Hiển thị quyền hiện hành của chủ/quản lý và nhân viên; quản lý có thể kiêm thực hiện, không cần điều phối riêng. Không cấp quyền đọc chat cá nhân. Đây là màn giải thích quyền thực tế, KHÔNG phải trình cấp quyền tùy chỉnh.

## Kiểm chứng
- 35 kiểm tra logic đạt: gồm giữ ngân hàng cũ, chặn đổi khi rút đang giữ, mã mẫu sai, chống đề nghị trùng, rút vượt khả dụng/ngân hàng chưa xác minh.
- Build Vite và Storybook đạt; 42 stories.
- Browser: rút 100.000đ từ 500.000đ → khả dụng rút 400.000đ, giữ 100.000đ; đổi ngân hàng bị chặn. Partner khác đề nghị ACB → ngân hàng đang dùng vẫn Vietcombank.
- Browser: Avatar → Đội ngũ → Quyền truy cập hiển thị đúng 3 người, quản lý và nhân viên khác quyền. Mobile 390px và desktop 1440px được kiểm tra; không tràn ngang.

## Giới hạn UI-17 (lịch sử; được cập nhật bởi UI-18 bên dưới)
- Cấp/sửa quyền tùy chỉnh và mô phỏng cấp quyền tài chính chưa chuyển sang React.
- Admin duyệt/từ chối nạp, rút, ngân hàng; ngân hàng lần đầu và kết quả từ chối chưa có trong React, thuộc phần tiếp nối.
- Không có OTP, ngân hàng thật, thanh toán thật, backend, lưu bền hoặc xử lý đồng thời. Dữ liệu mất khi tải lại.
- Chuyển chủ/đóng doanh nghiệp, bút toán ngoại lệ vẫn pending theo phạm vi đã chốt.

## Đồng bộ
DOC-050, DOC-052, DOC-053, DOC-057, PLAN-006 và README trỏ tới phần này. UI-UX-v0.15.zip chứa nguồn và bản build. Sổ quản lý v1.23 cùng Drive ID. BRD/FR/NFR/SRS/ERD/API và wireframe nghiệp vụ không thay đổi vì chỉ chuyển một phần nghiệp vụ đã chốt vào thiết kế React; các phần chưa chuyển được ghi rõ, không tự mở lại pending.


## UI-18 · Luồng hiện hành 27/09/2026

Các mục UI-17 nói chưa có cấp quyền, ngân hàng lần đầu và admin duyệt được thay bằng phần này. Những giới hạn production vẫn giữ nguyên.

### Điểm vào
- Cửa hàng → avatar → Đội ngũ doanh nghiệp → Quyền truy cập → Sửa quyền từng nhân viên.
- Story `first-bank`: partner chưa có ngân hàng; thêm tài khoản rồi đổi vai Admin để duyệt.
- Chọn **Admin · Duyệt tài chính** trên thanh xem thử. Mã vào và xác thực quyết định mẫu **654321**. Đây là chuyển vai phục vụ review, không phải cách cấp quyền admin của sản phẩm.
- Admin có Nạp tiền / Rút tiền / Ngân hàng / Nhật ký; tìm theo mã hoặc partner và lọc trạng thái. Desktop danh sách cạnh chi tiết; mobile mở chi tiết riêng rồi quay lại.

### Quyền doanh nghiệp
Theo ma trận kiến trúc: jobs.accept, jobs.assign, jobs.manage, profile.manage, members.manage, wallet.read, wallet.topup, wallet.withdraw, bank.manage. Chủ mẫu có toàn bộ; nhân viên không được mặc định cấp các quyền này. Mỗi quyền thay đổi phải nằm trong quyền người cấp; không tự sửa quyền hoặc sửa chủ. Quyền thao tác ví cần quyền xem ví. Lý do và xác thực lại mẫu 123456; lưu lịch sử đội ngũ.
Nhận việc/phân công, sửa hồ sơ/nhận việc, quản lý đội ngũ và ví áp dụng quyền tương ứng. Lập hóa đơn và nhận tiền vẫn chỉ người thực hiện; quyền quản lý không cấp đọc chat riêng. Thu hồi quyền có hiệu lực khi chuyển về vai nhân viên; không làm thay đổi hóa đơn hoặc số dư.

### Ngân hàng
Chưa có → gửi đề nghị → chờ admin → duyệt xác minh hoặc từ chối có lý do → gửi lại. Rút bị khóa trước xác minh. Thay đổi giữ ngân hàng cũ trong lúc chờ; có thể hủy đề nghị. Admin chặn duyệt thay đổi khi có khoản rút pending/processing. Lệnh rút giữ bản chụp ngân hàng.

### Nạp / rút và nhật ký
Nạp pending → duyệt completed (cộng đúng một lần) hoặc rejected (không cộng).
Rút pending → duyệt processing (vẫn giữ tiền) → completed (trừ ví và giải phóng giữ) hoặc failed (giải phóng giữ, không trừ ví). Từ chối khi pending cũng giải phóng giữ. Không coi duyệt là đã chuyển ngân hàng.
Admin phải nhập lý do và mã xác thực mẫu; duyệt/hoàn tất cần checkbox đối chiếu và mã tham chiếu (ngân hàng chỉ cần đối chiếu chủ thể). Không cho xử lý lại yêu cầu kết thúc. Mỗi quyết định lưu nhật ký; partner thấy trạng thái, lý do, mã tham chiếu trong lịch sử.

### Kiểm chứng đợt này
- 39 kiểm tra logic đạt; gồm cấp quyền trong giới hạn, cấm tự cấp/vượt quyền, kiểm quyền nhận/phân công, chống duyệt lại, nạp/rút và ngân hàng lần đầu.
- Browser: thêm ACB lần đầu → admin duyệt → partner dùng được; nạp 100.000đ → số dư 600.000đ; rút 200.000đ qua 2 bước → số dư 400.000đ, giữ 0đ.
- Browser: cấp wallet.read cho Dũng → mở ví nhưng Nạp/Rút vô hiệu; thu hồi → tab Ví mất và nội dung bị chặn.
- Admin và ví kiểm tra 390px/1440px không tràn ngang; màn admin mobile đã xem ảnh. Build Vite/Storybook đạt, 45 stories.

### Giới hạn hiện hành
Dữ liệu, xác thực, tham chiếu và đối chiếu chỉ mô phỏng trong phiên. Không chuyển tiền, OTP, upload chứng từ, chống cạnh tranh nhiều phiên hoặc quyền server. Admin hỗ trợ/tranh chấp, danh mục, kiểm duyệt hồ sơ/đánh giá và báo cáo tổng chưa chuyển hết sang React; tiếp tục trong đợt admin tiếp theo. Không mở chuyển chủ/đóng doanh nghiệp hoặc bút toán treo pending.

### Phạm vi đồng bộ UI-18
DOC-050/052/053/057/060, PLAN-006, README và các con trỏ gói nguồn dùng React v0.12 / UI-UX-v0.16.zip / registry v1.24. BRD/FR/NFR/SRS, ma trận kiến trúc/ERD/API và wireframe nghiệp vụ giữ nguyên: triển khai bản mẫu theo quyền/luồng đã mô tả, không thay hợp đồng sản phẩm. Các tài liệu UI cũ có mục lịch sử giữ nguyên; lấy phần UI-18 làm chuẩn cho nhóm này.


## UI-19 · 27/09/2026 · React v0.13
Bổ sung Hỗ trợ từ Tài khoản/công việc, admin hỗ trợ/xác minh/kiểm duyệt đánh giá và nhật ký. Xác minh partner qua admin, bỏ nút tự mô phỏng duyệt; tệp chờ duyệt khóa sửa. Ẩn/khôi phục đánh giá cập nhật điểm trong phiên. Quyết định và giới hạn chi tiết ở DOC-061 `ui-ux/specs/support-moderation.md`; nội dung UI-19 thay các ghi chú trước rằng những màn này chưa có. Không thay tiền/point khi xử lý báo cáo. 48 stories, 42 kiểm tra logic; UI-UX-v0.17.zip.


## UI-20 — cập nhật hiện hành 27/09/2026
React v0.14, UI-UX-v0.18.zip, registry v1.26. Đã bổ sung quản trị tài khoản, đình chỉ partner, danh mục và báo cáo/nhật ký vận hành. Xem [phạm vi, luồng và bằng chứng QA](admin-operations.md). Các ghi chú trước đây rằng bốn nhóm này chưa có trong React được thay bằng UI-20; không đổi nghiệp vụ hay mở các mục pending. Các lớp xác thực và dữ liệu vẫn là mô phỏng.

## P1-01 A/B hiện hành — 13/10/2026

P1-01 A/B đã được chủ dự án duyệt ngày 13/10/2026. Chuẩn hiện hành cho đội ngũ và xác minh local/test là OpenAPI v0.1.11; các đoạn trước mô tả OTP Pending hoặc mã mẫu là lịch sử/phạm vi production, không phủ quyết phần local này.
Chỉ mở OTP purpose=verify trong phiên đăng nhập: email qua Mailpit trên máy, SMS qua hộp nhận mô phỏng. Mã ngẫu nhiên 6 số, hạn 5 phút, tối đa 5 lần sai; gửi lại sau 60 giây, 5 lần/liên hệ/giờ, 20 lần/tài khoản/giờ và 100 lần/IP/giờ. Mã gắn tài khoản, liên hệ và lần đăng nhập; gửi lại vô hiệu mã cũ. Xác minh email không xác minh điện thoại. Không thay email/điện thoại đã có hoặc chiếm liên hệ tài khoản khác. Chỉ DB DEMO/test cô lập và liên hệ cho phép; disabled mặc định, chặn production. Chưa mở OTP login/recover, MFA admin, email/SMS thật, billing hoặc tiền thật.
Chủ hoặc members.manage mời bằng email hoặc điện thoại, permissions=[]; lời mời 7 ngày, không trả token cho quản lý. Người nhận đăng nhập, xác minh đúng liên hệ rồi chủ động nhập token nhận lời. List/gửi lại/thu hồi kiểm quyền hiện hành; gửi lại thay token cũ. Nhận lời kiểm lại người mời; gia nhập lại dùng cùng membership nhưng không khôi phục quyền cũ. Lịch sử trạng thái pending/accepted/expired/revoked/replaced tách queued/submitted/failed/unknown của việc chuyển thư; submitted không chứng minh người nhận đã đọc.
GET /me/memberships phục vụ cả nhân viên thường và lịch sử đã rời. Cấp/thu hồi quyền dùng lý do, expected_version, Idempotency-Key và grant nhập lại mật khẩu qua POST /auth/reauthenticate. Grant hạn 5 phút, một lần, gắn user/family và scope membership.grants; refresh không gia hạn. Cấm tự sửa/sửa chủ/cấp vượt quyền; quyền thao tác ví cần wallet.read. Không coi nhập lại mật khẩu là MFA, không mở nghiệp vụ ngân hàng từ enum quyền.
Gỡ/tự rời: xem trước số việc cần bàn giao và version; xác nhận có lý do, máy chủ kiểm lại dưới khóa partner → job → invoice. Việc chưa có dấu nhận tiền về chờ phân công, chỉ bỏ nháp chưa gửi; giữ bản đã gửi/khóa, ledger, khoản giữ và dấu thanh toán. Việc đã nhận tiền giữ người thực hiện lịch sử. Thu hồi quyền ngay, giữ phòng chat cá nhân và không sao chép cho người mới. Đầu mối dùng Partner.version, có thể null để về cửa hàng; rời sẽ reset nếu đang là đầu mối. Gọi Internet vẫn chưa triển khai.
OTP/token lưu HMAC; liên hệ và nội dung hàng chờ mã hóa, xóa payload sau gửi/hết hạn. Worker khóa bản ghi để tránh hai lần gửi đồng thời; crash sau gửi vẫn có thể gây thư trùng, token chỉ dùng một lần. Audit bất biến ghi actor/lý do/quyền trước-sau/việc bàn giao, không ghi mật khẩu, token, OTP hay nội dung chat. Snapshot retry không chứa bí mật thô. UI Việt/Anh/Nhật đi từ Tài khoản → Xác minh liên hệ hoặc Đội ngũ → Thành viên/Lời mời/Đã rời/Quyền truy cập. Mất mạng giữ thao tác để thử lại; đổi tài khoản loại dữ liệu riêng. Bằng chứng code/native/CI/UAT được ghi riêng trong báo cáo repo, không coi spec là nghiệm thu.
