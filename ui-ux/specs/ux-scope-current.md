# Phạm vi hiện hành v0.24 — 22/09/2026

> **B01-04A · 06/10/2026 — quy tắc hiện hành đã duyệt:** Địa chỉ đầu tiên trong sổ đang rỗng là mặc định; chọn mục mới bỏ mặc định cũ. Gỡ mặc định để chưa có mặc định, không tự chọn địa chỉ khác (thay hành vi tự chọn trong prototype trước đây). Sửa dùng version và giữ bản nháp khi xung đột; gỡ không đổi địa chỉ đã chụp trên việc cũ. Phiên đăng nhập hiển thị thời điểm tạo/hoạt động và đánh dấu hiện tại; thu hồi cả lần đăng nhập kể cả các token refresh, không lộ IP/token. App hiện dùng nhập tọa độ thủ công theo phạm vi đã duyệt; GPS/map, nối tìm/thuê và OTP chưa triển khai trong đợt này. Contract v0.1.5 tại `docs/technical-design`; bằng chứng app tại báo cáo B01-04A trong repo. Các số liệu prototype bên dưới là lịch sử.

> **I18N-04 · 05/10/2026 — sản phẩm thật:** Chủ dự án duyệt tên ngành/nhóm/kỹ năng VI/EN/JA từ DB, API trả tên theo lựa chọn local. Đổi tiếng giữ ID/trang và tải lại cả tiêu đề. Chỉ hiện thông báo fallback khi có mục thiếu bản dịch. Bộ phân loại giữ 10 ngành, mở rộng 50 nhóm/140 kỹ năng. Nội dung prototype và bằng chứng cũ bên dưới là lịch sử, không phải số liệu DB hiện hành. Tìm kiếm đa ngôn ngữ và đồng bộ locale tài khoản chưa thuộc lát này.


Chỉ mở đánh giá hai chiều khi khách báo đã thanh toán, thợ xác nhận nhận tiền và hóa đơn đã quyết toán thành công. Admin hoàn tất thay không phải xác nhận của thợ.

Toàn point hoặc 0đ vẫn cần hai dấu xác nhận, không phát sinh thêm tiền. Khách có thể báo đã thanh toán sau khi thợ đã nhận tiền.

Khoản giữ treo, hủy/đảo/điều chỉnh tiền vẫn pending; bắt buộc thiết kế cách xử lý qua báo cáo/admin trước khi chạy tiền thật (Q02). Anh/Nhật, chuyển chủ/đóng doanh nghiệp và mục 10/15/16/17 tiếp tục tạm hoãn.

Đồng bộ nguồn: lộ trình v4, BRD v0.2, PRD v0.3, FR/NFR v0.16, SRS v0.14, UX v0.24. Công nghệ Q03 đã chốt; ngân sách chưa có.

## Lịch sử các đợt trước (giữ để tra cứu, quy tắc đã thay thế không còn hiệu lực)

# Phạm vi thiết kế đang thực hiện

Theo lựa chọn của người dùng ngày 16/09/2026, giữ nguyên số thứ tự danh sách 22 nhóm.

## Tạm hoãn

- 10: Chặn và báo cáo liên lạc.
- 15: Đảo giao dịch và điều chỉnh tiền.
- 16: Hỗ trợ và tranh chấp nâng cao.
- 17: Nối quyền doanh nghiệp ở đánh giá/hỗ trợ.
- Chuyển chủ và đóng/mở lại doanh nghiệp; Google/Facebook; tự động xử lý rút tiền giữ ở giai đoạn sau như đã thống nhất.

Tạm hoãn thiết kế không xóa màn hình hoặc quy tắc đã có. Chức năng hỗ trợ/đánh giá cơ bản vẫn giữ.

## Thứ tự được phép tiếp tục

1. Đăng ký, đăng nhập — đã bổ sung wireframe v0.14; xem phạm vi và kiểm tra bên dưới.
2. Quản lý tài khoản và bảo mật — đã bổ sung bản mô phỏng v0.15.
3. Xóa tài khoản.
4. Địa chỉ và tìm kiếm.
5. Hồ sơ partner.
6. Danh mục và kỹ năng.
7. Yêu cầu thuê và lịch sử công việc.
8. Hủy hoặc dừng công việc.
9. Nhắn tin.
11. Gọi trong app.
12. Cài đặt thông báo.
13. Ngân hàng nhận tiền.
14. Hóa đơn chờ lâu và thay thế — không làm thêm đảo giao dịch thuộc mục 15.
18. Admin tra cứu tập trung.
19. Admin bảo mật và khóa tài khoản.
20. Báo cáo và nhật ký quản trị.
21. Ngôn ngữ và trạng thái giao diện chung.
22. Website khách/partner — được chọn thiết kế đợt này; triển khai website vẫn theo lộ trình sản phẩm đã chốt.

## v0.14 — Đăng ký và đăng nhập

Nút “MỚI · Đăng ký / Đăng nhập” ở bảng điều khiển. Luồng đăng nhập từ Nhắn tin/Thuê dịch vụ cũng dùng hộp thoại mới. Có điện thoại/OTP, sai mã, hết hạn, gửi lại; email/mật khẩu, đăng ký, xác minh email, quên/đặt lại mật khẩu. Sau đăng nhập tiếp tục hành động đang chờ. Email cần xác minh thêm điện thoại khi gửi yêu cầu thuê.

Dữ liệu chỉ trong bộ nhớ trình duyệt. Không gửi OTP/email, không đăng nhập backend, không dùng thông tin thật. OTP mẫu 123456; tài khoản mẫu khach@example.com / Demo12345. Độ dài mật khẩu trên form là quy ước minh họa, chưa chốt chính sách bảo mật sản phẩm. Chưa có hạn liên kết email thực, giới hạn lần thử, quản lý phiên hoặc hệ thống nhiều tài khoản thật. Xác minh trước nhận việc phía partner và chi tiết liên kết tài khoản sẽ tiếp tục ở nhóm 2.

Đã kiểm tra trực tiếp: OTP sai bị chặn; OTP hết hạn bị chặn dù nhập đúng; gửi lại rồi mã đúng đăng nhập; đăng ký email và xác minh mô phỏng; đặt lại mật khẩu và đăng nhập bằng mật khẩu mới; từ hồ sơ nhắn tin → đăng nhập → trở lại đúng cuộc trò chuyện. Chưa kiểm thử đầy đủ cổng điện thoại khi gửi yêu cầu thuê hoặc các lỗi mạng.


## v0.15 — Tài khoản và bảo mật

Đường vào: Tài khoản ở thanh điều hướng hoặc nút MỚI · Tài khoản và bảo mật. Có thông tin kênh đăng nhập, đổi điện thoại/email qua hai bước xác minh (tài khoản hiện tại rồi kênh mới); giữ thông tin cũ nếu chưa xác minh; thông báo mô phỏng tới các kênh cũ. Kênh xung đột dẫn hướng đăng nhập/hỗ trợ, không gộp tài khoản. Có đổi mật khẩu, phiên mẫu và đăng xuất từng phiên/các phiên khác; gửi yêu cầu khôi phục khi mất toàn bộ kênh.

Đã kiểm tra trình duyệt: xung đột số 0900000099 bị chặn; đổi số hợp lệ sau hai bước xác minh; đăng xuất các phiên khác giữ phiên hiện tại. Chưa chứng minh xác thực hoặc thu hồi token thật. Mã thử 123456; không gửi thông báo, OTP hay email. Dữ liệu phiên và vị trí chỉ là mẫu. Chưa có backend nhiều tài khoản; màn hình này dùng tài khoản minh họa cố định. Admin quyết định khôi phục ở mục 19, không tự cấp quyền từ yêu cầu hỗ trợ.

## Nhóm A — v0.16: tài khoản và quản trị truy cập

Gộp mục 1, 2, 3, 19 thành nhóm review. Giữ nguyên các mục pending 10/15/16/17 và chuyển chủ/đóng doanh nghiệp. Chỉ mô phỏng một tài khoản, không phải hoàn thành hệ thống xác thực sản phẩm.

Bổ sung yêu cầu xóa tài khoản ở Tài khoản và bảo mật: xác nhận mất point, xác thực lại, danh sách nghĩa vụ mẫu; admin kiểm tra lại ở thời điểm quyết định, chặn hoàn tất nếu còn việc/số dư/giữ/nạp-rút/hỗ trợ hoặc sở hữu doanh nghiệp. Hai nút dữ liệu thử “còn nghĩa vụ” và “không vướng” làm mới dữ liệu, không tự giải quyết tiền ở công việc đang xem. Sau xóa mẫu: vô hiệu đăng nhập, point khả dụng mẫu về 0, giữ lịch sử. Không xóa dữ liệu thật.

Admin truy cập qua mã 2FA mẫu 654321, quyết định nhạy cảm cần nhập lại mã và lý do. Có khóa/mở truy cập tách đình chỉ partner, không tự sửa tài chính. Khôi phục: tiếp nhận → bổ sung/từ chối/duyệt bước xác minh → người dùng xác minh kênh mới bằng 123456 → thu hồi phiên mẫu và yêu cầu đăng nhập lại. Khôi phục không tự mở khóa riêng hoặc đổi chủ/quyền doanh nghiệp. Có nhật ký quyết định và trạng thái hiển thị cho người yêu cầu. Thao tác admin trong wireframe là chế độ thử riêng, không phải đăng nhập giả người dùng.

Đã kiểm tra trình duyệt: gửi xóa khi còn WF-001 và số dư thì nút hoàn tất bị chặn; khóa rồi đăng nhập OTP đúng vẫn bị chặn; mở khóa; gửi và duyệt yêu cầu khôi phục, xác minh kênh mới; bổ sung chứng cứ đưa về chờ xem xét lại; xóa mẫu không nghĩa vụ hiển thị đã xóa và giữ nhật ký. Các luồng đăng nhập/bảo mật ở v0.14/v0.15 giữ kết quả kiểm tra trước, chưa chạy lại toàn bộ tổ hợp trong v0.16.

Giới hạn: checklist chỉ tính dữ liệu có trong prototype; không có nợ đảo vì mục 15 pending. Không có kho định danh/OTP thật, liên kết email có thời hạn, token/thu hồi phiên thật, chính sách lưu/xóa dữ liệu hoàn chỉnh hay phân quyền admin backend. Chứng cứ chỉ nhập mô tả giả. Chính sách lưu dữ liệu phải chốt trước triển khai xóa thật. Mã admin cố định chỉ phục vụ review. Khôi phục admin là màn một hồ sơ; tìm kiếm nhiều tài khoản sẽ làm ở nhóm D.

Tiếp theo nhóm B: mục 4–8 (địa chỉ/tìm kiếm, hồ sơ, danh mục, yêu cầu và lịch sử công việc, hủy/dừng).


## Cải tiến khung review v0.16

Theo phản hồi giao diện rối và khó chuyển vai: thêm thanh cố định Khách hàng / Partner / Admin, nhãn vai hiện tại, menu ngắn theo vai, nhớ trang vừa xem của từng vai. Chuyển vai không gọi reset dữ liệu; admin truy cập nhóm A vẫn qua bước 2FA mô phỏng. Tạo dữ liệu mẫu là thao tác riêng có nhãn làm mới. Công cụ cũ được giữ trong mục thu gọn. Thu gọn sidebar, sửa khoảng cách và grid admin để nút không bị kéo cao. Thanh chuyển vai thuộc công cụ review, không phải chức năng cấp quyền admin trong app thật.

Đã kiểm tra ba nút vai trên trình duyệt và xem ảnh bố cục desktop. Chưa kiểm tra đủ mọi trang ở kích thước điện thoại; quyền/điều hướng thật vẫn thuộc triển khai. Không bổ sung các nghiệp vụ đang pending.


## Thiết kế lại quản trị truy cập — nhiều tài khoản

Theo phản hồi ngày 19/09/2026: thay trang một tài khoản bằng danh sách 13 tài khoản mẫu, tìm tên/mã/điện thoại/email, lọc trạng thái và yêu cầu, phân trang 5 dòng. Mở chi tiết từng tài khoản với Tổng quan / Khôi phục / Yêu cầu xóa / Lịch sử xử lý. Hộp quyết định ghi rõ tên và mã tài khoản; trạng thái và nhật ký được cập nhật riêng cho tài khoản đó. Bỏ nút Rời chế độ admin trong màn hình; thanh chuyển vai phía trên đảm nhiệm việc xem thử. Màn nhỏ hiển thị danh sách dạng thẻ thay bảng nhiều cột.

TK-001 nối các luồng cũ; 12 tài khoản còn lại là dữ liệu giả độc lập để kiểm tra quản trị nhiều tài khoản, chưa nối tới app phía từng người dùng. Không có phân trang/tìm kiếm server hoặc dữ liệu thật. Đã kiểm tra tìm mã, chuyển trang, mở chi tiết, xác nhận đúng đối tượng, mở khóa TK-003 và lịch sử riêng; bộ lọc Đang khóa chỉ còn TK-009. Chưa kiểm thử lại toàn bộ luồng khôi phục/xóa qua bố cục mới.

## Nhóm B — v0.17: địa chỉ, khám phá dịch vụ và vòng đời yêu cầu

Gộp mục 4–8 theo yêu cầu ngày 19/09/2026. Điểm vào ở menu Khách: Tìm dịch vụ, Ngành và dịch vụ, Địa chỉ đã lưu, Công việc. Phía Partner: Năng lực và dịch vụ (cũng vào từ Quản lý). Các mục pending không được mở rộng.

### Địa chỉ và tìm kiếm

- Danh sách địa chỉ có tên gợi nhớ, địa chỉ chi tiết, khu vực mẫu, mặc định; thêm/sửa/xóa/chọn tìm quanh địa chỉ. Xóa địa chỉ đã lưu không sửa bản địa chỉ trên yêu cầu cũ.
- Trang chủ dùng 10 ngành từ danh mục chung. Danh mục có Ngành → Nhóm → Kỹ năng với mã ổn định và trạng thái hoạt động. Trang tìm kiếm lọc ngành, kỹ năng, địa điểm thực hiện, xác minh; sắp xếp phù hợp/khoảng cách/đánh giá; đổi danh sách/sơ đồ vị trí.
- Hồ sơ tạm nghỉ hoặc đình chỉ không có trong kết quả. Tìm tại địa chỉ khách kiểm tra khu vực partner khai báo; tìm tại cửa hàng yêu cầu partner có cửa hàng. Có trạng thái chưa có kết quả và đường đổi khu vực/bỏ bộ lọc.
- Bản mẫu dùng ba partner điện nước, một trong ba có thêm vệ sinh điều hòa. Ngành khác vẫn có thể chọn và hiển thị rỗng. Đây không phải dữ liệu thị trường hoặc bản đồ thật; khoảng cách và vị trí là minh họa, chưa có geocoding/GPS. Cửa hàng mẫu đều thuộc Cầu Giấy; sửa địa chỉ tự do chưa suy ra tọa độ/khu vực cửa hàng mới.

### Hồ sơ và kỹ năng

- Hồ sơ khách thấy loại partner, trạng thái xác minh, giới thiệu, kinh nghiệm khai báo, kỹ năng, giá công tham khảo, khu vực, cửa hàng, phí kiểm tra/di chuyển nếu công bố, ảnh mẫu và đánh giá mẫu. Liên hệ/nhắn tin/thuê giữ cổng đăng nhập; địa chỉ cửa hàng chi tiết và đánh giá chi tiết yêu cầu đăng nhập.
- Năng lực và dịch vụ cho chủ/quản lý sửa giới thiệu, kinh nghiệm, kỹ năng đang hoạt động, khu vực, cửa hàng và phí tham khảo. Thay đổi kỹ năng nối ngay tới tìm kiếm, hồ sơ và lựa chọn trong form thuê. Tối thiểu một kỹ năng và khu vực.
- Kỹ năng trên yêu cầu lưu id/version/tên tại thời điểm gửi; đổi hoặc ngừng danh mục không đổi tên công việc đã gửi. Mục ngừng không cho chọn mới.
- Màn onboarding/xác minh cũ vẫn là mẫu riêng; chưa hợp nhất profile mới đăng ký (id 4) vào ba hồ sơ tìm kiếm này. Chưa thêm upload ảnh năng lực, giá riêng cho từng kỹ năng hoặc đề nghị kỹ năng mới trong nhóm B; ảnh/đánh giá hồ sơ vẫn là mẫu, không được coi là dữ liệu tổng hợp thật.

### Yêu cầu và lịch sử

- Form thuê dùng kỹ năng partner đang cung cấp, chọn địa chỉ khách/cửa hàng, Làm ngay/Hẹn trước, ngày giờ Việt Nam và ghi chú. Ngày giờ quá khứ bị chặn. Kỹ năng và khả năng nhận việc được kiểm tra lại lúc gửi.
- Công việc có tab Tất cả / Đang xử lý / Đã kết thúc, chi tiết, mã riêng cho các yêu cầu nối tiếp. Khi gửi yêu cầu mới sau việc đã kết thúc, lưu bản công việc/hóa đơn cũ vào lịch sử. Có xem lại lý do hủy, tiếp tục chat và thuê lại. Chat vẫn dùng phòng cũ; tin hủy giữ mã việc cũ.
- Partner có Nhận công việc hoặc Từ chối yêu cầu kèm lý do. Doanh nghiệp vẫn phân công nhân viên trước khi người thực hiện lập hóa đơn; không thêm nút Bắt đầu làm hoặc quản lý duyệt hóa đơn.
- Giới hạn prototype: chỉ một công việc đang mở trong bộ xử lý hiện tại; chưa hỗ trợ nhiều công việc đồng thời, hàng đợi nhiều việc phía partner hoặc phân trang công việc server. Các việc cũ là bản đọc lại, chưa nối toàn bộ hỗ trợ/đánh giá/nhắc lịch cũ theo mã nhiều việc. Luồng sản phẩm phải dùng request_id cho mọi thực thể, không kế thừa trạng thái toàn cục của bản thử.

### Hủy hoặc dừng

- Khách rút yêu cầu đang chờ; partner từ chối yêu cầu đang chờ. Bắt buộc lý do; giữ lịch sử và chat.
- Việc đã nhận nhưng chưa xác nhận hóa đơn: ghi nhận hai bên đã trao đổi thống nhất dừng. Không phát sinh chi phí → kết thúc Đã hủy, bỏ hóa đơn chưa xác nhận nếu có; có chi phí → giữ việc chờ lập/sửa hóa đơn phần thực tế đã làm, không tự tạo phí hoặc thưởng point.
- Sau khi dừng có chi phí, không cho đổi lịch tiếp. Luồng hóa đơn hiện có tiếp tục yêu cầu ảnh, khách xác nhận và thợ xác nhận nhận tiền.
- Hóa đơn đã khóa không cho hủy/dừng qua nút này; không thêm đảo tiền/hoàn tiền thuộc mục 15. Checkbox trao đổi là khai báo của người bấm, không phải bằng chứng xác nhận điện tử của bên kia; xử lý bất đồng dùng hỗ trợ đã có.

### Kiểm tra và giới hạn

Đã kiểm tra cú pháp JavaScript và trực tiếp trên trình duyệt: lọc ngành điện lạnh ra An Tâm; chọn kỹ năng và địa chỉ cửa hàng khi gửi yêu cầu; rút WF-001, thuê lại tạo WF-002, danh sách/chi tiết giữ đúng hai mã và chat giữ tin hủy WF-001; partner từ chối yêu cầu; dừng có phát sinh chuyển sang chờ hóa đơn và bỏ đổi lịch; thêm kỹ năng Sửa máy giặt phía partner rồi tìm được phía khách; thêm địa chỉ thứ hai; ngành Thú cưng hiển thị không có kết quả. Đã xem ảnh bố cục tìm kiếm trên khung hẹp.

Chưa kiểm thử toàn bộ tổ hợp đổi lịch/hóa đơn/point với nhiều yêu cầu nối tiếp hoặc hồi quy toàn bộ nhóm A. Không có backend, thông báo thật, bản đồ thật hoặc lưu qua lần tải trang. Không coi v0.17 là sản phẩm đã sẵn sàng vận hành. Tài liệu cập nhật lần này là file phạm vi Markdown trên Drive và HTML; chưa cập nhật native SRS hoặc sheet FR/NFR.

Tiếp theo sau review nhóm B: nhóm C (9, 11, 12 — chat, gọi trong app, cài đặt thông báo), giữ pending mục 10.

## Nhóm C — v0.18: chat, gọi trong app và tùy chọn thông báo

Gộp mục 9, 11, 12. Mục 10 (chặn/báo cáo liên lạc) vẫn pending. Điểm vào: menu Tin nhắn và Cài đặt thông báo ở cả Khách/Partner; nút Tin nhắn trong thanh điều hướng partner mở danh sách phòng. Không cần tìm trong công cụ thử nghiệm.

- Danh sách phòng có tìm theo tên/nội dung, xem tin gần nhất và dấu tin mới mẫu. Mở hồ sơ có thể nhắn trước khi thuê; phòng theo partner được dùng lại khi thuê tiếp. Gửi văn bản, trạng thái gửi/đã xem mô phỏng, gửi lỗi và thử lại trên đúng tin, không nhân bản tin. Tin chưa gửi được chỉ hiện phía người gửi.
- Doanh nghiệp: khách/chủ/quản lý thấy trao đổi chung; nhân viên chỉ thấy nội dung có job_id khớp việc đang được giao. Khách và quản lý chọn Trao đổi chung hoặc Công việc trong form gửi. Tin nhân viên tự gắn công việc; nhận việc/phân công tạo tin hệ thống. Tin cũ thiếu job_id không tự cấp quyền cho nhân viên. Prototype chỉ có một khách mẫu và partner theo ngữ cảnh hiện tại; chưa có hộp thư nhiều khách hoặc phân quyền backend.
- Gọi trong app: chỉ mở cho công việc đã nhận, chưa hoàn tất/dừng; doanh nghiệp cần có người được giao. Giao diện gồm quyền mic giả lập, đang gọi, trả lời, mic/loa, không trả lời, bận, mất kết nối, kết thúc; lưu kết quả trong chat. Kiểm tra lại trạng thái/người được giao khi chuyển sang gọi/kết nối. Chưa có cuộc gọi đến, đồng hồ thời lượng, WebRTC, xin quyền thiết bị thật hoặc âm thanh. Không coi đây là tích hợp gọi thành công.
- Cài đặt riêng theo vai trong bản mẫu: push/email, tin nhắn, công việc/đổi lịch, nhắc 24h/1h, hóa đơn, ví, xác minh. Lưu thông báo trong app bất kể tùy chọn gửi ra ngoài. Có công cụ tạo thông báo thử và hiển thị kênh sẽ gửi mô phỏng. Tùy chọn không thay đổi thông báo an toàn tài khoản; chưa nối bộ thông báo hỗ trợ cũ vào lựa chọn này. Nhắc lịch vẫn dùng đồng hồ mô phỏng hiện có.
- Thông báo công việc ghi mã job; mở thông báo việc cũ phía khách tới lịch sử nếu có. Màn partner cho lịch sử cũ chưa triển khai; không mở nhầm công việc hiện tại. Chưa có push/email thật, permission OS, retry delivery, device token, thông báo đa thiết bị hoặc tùy chọn theo từng nhân viên trong doanh nghiệp.

Đã kiểm tra trình duyệt: nhắn trước thuê và nút gọi bị khóa; tin gửi lỗi rồi thử lại; doanh nghiệp nhận và giao Nguyễn Văn An; gọi mở đúng An, mô phỏng trả lời/kết thúc; gửi tin theo việc; An thấy tin việc và không thấy hai tin chung trước thuê; tắt Tin nhắn mới rồi tạo thử chỉ ghi kênh Trong app. Kiểm tra cú pháp JavaScript đạt. Chưa kiểm tra đầy đủ đổi người/rời doanh nghiệp giữa cuộc gọi, mọi nhánh lỗi gọi, nhiều lịch sử nối tiếp hoặc hồi quy tài chính. Toàn bộ là wireframe trong bộ nhớ.

Cập nhật lần này: HTML và tài liệu phạm vi Markdown trên Drive; chưa ghi lại native SRS/FR-NFR. Tiếp theo sau review: nhóm D (13,14,18,20), giữ các mục pending.

## Điều chỉnh phân việc — v0.19 (21/09/2026)

Theo bốn quyết định người dùng đã đồng ý: thay cách nhân viên đọc một phần phòng doanh nghiệp ở v0.18 bằng phòng riêng giữa hai tài khoản cá nhân.

1. Doanh nghiệp giao việc → tìm hoặc tạo phòng theo cặp customer_account_id + employee_account_id, không theo mã việc/doanh nghiệp. Thêm tin hệ thống ghi mã việc và tên doanh nghiệp vào phòng riêng. Phòng doanh nghiệp giữ nguyên, báo người được giao và có nút Nhắn với [tên]. Quản lý thực hiện phân công nhưng không tự mở hoặc đọc phòng riêng của nhân viên.
2. Đổi A sang B → mở/dùng lại phòng khách–B; phòng khách–A giữ lịch sử và tiếp tục nhắn. Giao lại A dùng đúng phòng trước, không nhân bản. Quyền công việc theo người đang được giao, không theo quyền chat.
3. Chủ/quản lý không có quyền đọc hoặc tìm nội dung phòng khách–nhân viên, trừ khi chính tài khoản đó là người tham gia. Danh sách phòng, nội dung, gửi/thử lại và mở từ thông báo đều kiểm tra người tham gia. Nhân viên không đọc phòng doanh nghiệp qua quyền được giao việc nữa.
4. Nhân viên rời doanh nghiệp vẫn giữ phòng cá nhân và quyền nhắn; mất quyền công việc của doanh nghiệp. Cặp tài khoản không bao gồm membership nên đổi nơi làm không tạo phòng mới. Prototype chưa có luồng gia nhập nhiều doanh nghiệp để kiểm thử chuyển doanh nghiệp thực tế.

Nút Nhắn tin với thợ trong chi tiết việc mở phòng riêng đúng người đang được giao. Nút chat phía người thực hiện cũng mở phòng này. Doanh nghiệp/khách vẫn có phòng chung riêng biệt. Cuộc gọi nhân viên chuyển sang phòng riêng, chỉ mở khi người đó đang có phân công hợp lệ và việc chưa kết thúc/dừng; nhật ký cuộc gọi riêng không được ghi sang phòng doanh nghiệp. Hóa đơn và phân công vẫn thuộc công việc/doanh nghiệp, không chuyển sang sở hữu cá nhân.

Đã kiểm tra trực tiếp: nhận việc, giao An tạo phòng riêng; gửi tin khách; giao Bình rồi giao lại An chỉ có một phòng An và giữ tin cũ; hộp thư quản lý không liệt kê hai phòng nhân viên; An xem và trả lời phòng của mình; An rời doanh nghiệp vẫn mở/gửi tin được trong phòng đó, gọi bị khóa. Kiểm tra cú pháp JavaScript đạt. Chưa kiểm tra toàn bộ nhánh cuộc gọi/lỗi mạng của phòng riêng, nhiều công việc đồng thời, nhiều khách hoặc chuyển doanh nghiệp thật. Định danh customer TK-001 và nhân viên owner/an/binh là tài khoản mẫu, triển khai cần account_id ổn định cùng ràng buộc cặp tài khoản duy nhất và phân quyền server. Không chuyển các tin chung cũ vào phòng cá nhân.

Bản này thay thế quy tắc đọc tin theo job_id của nhân viên ở mục nhóm C v0.18; các mục pending giữ nguyên. Cập nhật HTML và file phạm vi Markdown; native SRS/FR-NFR chưa được đồng bộ trong lần sửa này.

## Nhóm D — v0.20 (21/09/2026)

Đã bổ sung chung các mục 13, 14, 18 và 20 vào bản phác tương tác, giữ nguyên các mục tạm hoãn. Đây là thiết kế để review; chưa phải triển khai backend hoặc ngân hàng thật.

### Vị trí các màn mới

- Partner → Ngân hàng nhận tiền; cũng mở được từ Ví và giao dịch.
- Trong hóa đơn khách/partner → Theo dõi hóa đơn, nhắc bên còn lại, báo chờ xử lý; partner có sửa và gửi lại trước khi khóa.
- Admin → Tra cứu tập trung, Theo dõi hóa đơn, Duyệt ngân hàng, Báo cáo vận hành, Nhật ký quản trị.

### Ngân hàng

Một tài khoản đang dùng trên mỗi partner. Thay đổi tạo đề nghị gồm ngân hàng, số tài khoản, tên chủ thể, lý do và bước xác thực lại mô phỏng. Thông tin mới chỉ thay thế sau khi admin xác minh và duyệt; tài khoản đang dùng được giữ trong lúc chờ. Có thể hủy đề nghị hoặc nhận lý do từ chối rồi gửi lại. Không cho đổi/duyệt đổi khi còn yêu cầu rút đang giữ tiền. Yêu cầu rút lưu bản chụp thông tin tài khoản nhận lúc tạo, không đổi theo hồ sơ về sau. Quyền tài chính hiện có áp dụng cho màn partner; tài khoản mẫu ban đầu đã xác minh. Đăng ký ngân hàng lần đầu chưa được mô phỏng riêng.

### Hóa đơn

Không hết hạn tự động. Trước khi khách xác nhận, thợ có thể sửa và gửi phiên bản tiếp theo; phiên bản cũ được giữ để xem lại. Khi khách xác nhận, khóa nội dung và số point; không có thao tác sửa hoặc tự mở khóa trong nhóm này. Hai bên có nút nhắc và gửi nội dung yêu cầu hỗ trợ riêng. Bản thử giới hạn mỗi bên một lần nhắc và một yêu cầu hỗ trợ trên mỗi phiên bản để tránh bấm trùng; đây là giới hạn mô phỏng, chưa chốt thời gian chống spam cho sản phẩm. Admin thấy danh sách hóa đơn chưa hoàn tất và tra cứu số tiền; các ngoại lệ tài chính vẫn thuộc mục 15 đang pending. Hàng đợi chưa phân loại theo số giờ chờ và chưa có tác vụ nhắc nền.

### Tra cứu, báo cáo và nhật ký

Tra cứu tài khoản, partner, công việc, hóa đơn, nạp/rút, hồ sơ hỗ trợ theo từ khóa và loại; phân trang 8 kết quả. Tài khoản/partner/nạp-rút/hỗ trợ nối sang màn xử lý tương ứng; công việc/hóa đơn có chi tiết chỉ đọc. Không mở nội dung phòng chat riêng của nhân viên.

Báo cáo lấy công việc hiện tại và lịch sử đã lưu, chỉ tính hóa đơn hoàn tất vào tổng giá trị dịch vụ, phí nền tảng và point thưởng. Không tính phiên bản hóa đơn bị thay thế thành giao dịch mới. Tổng giá trị dịch vụ khác với doanh thu phí; chỉ số phí trừ thưởng chưa trừ chi phí khác. Chưa có lọc thời gian, xuất báo cáo hoặc dữ liệu vận hành thật.

Nhật ký tổng hợp nguồn tài khoản, partner, ngân hàng/hóa đơn, nạp/rút, danh mục và hỗ trợ; tìm được theo mã và nội dung. Không có thao tác sửa nhật ký. Đây là các bản ghi trong bộ nhớ, ghép theo nguồn, chưa có sắp xếp thời gian chuẩn hóa hay tính bất biến của hệ thống kiểm toán; không đọc chat cá nhân.

### Kiểm tra đã thực hiện

- Thay ngân hàng → admin chưa đánh dấu đối chiếu bị chặn → duyệt hợp lệ → lệnh rút dùng tài khoản mới, hiển thị che số; đang có lệnh rút thì nút đổi ngân hàng bị khóa.
- Hóa đơn V1 500.000đ → V2 450.000đ: lưu được V1; sau khách xác nhận, partner không còn nút sửa. Gửi nhắc và yêu cầu hỗ trợ thành công; đã kiểm tra mỗi bên có lượt nhắc riêng sau sửa giới hạn mô phỏng.
- Hoàn tất V2 với tiền công 300.000đ, vật tư 150.000đ, không dùng point: báo cáo 1 giao dịch, giá trị 450.000đ, phí 30.000đ, thưởng 6.000 point; không cộng V1.
- Tra cứu WF-001 trả công việc, hóa đơn và hồ sơ hỗ trợ liên quan; kiểm tra trang sau với danh mục nhiều tài khoản; nhật ký hiển thị thao tác ngân hàng, hóa đơn và hỗ trợ. Cú pháp JavaScript hợp lệ.

Giới hạn vẫn là một công việc đang hoạt động trong bản thử, ba partner chính và bộ tài khoản minh họa. Dữ liệu mất khi tải lại. Chưa kiểm tra đầy đủ mọi tổ hợp quyền doanh nghiệp/khóa tài khoản hoặc cạnh tranh giao dịch. Cập nhật HTML và tài liệu Markdown trên Drive; chưa đồng bộ lại native SRS/FR-NFR trong lần này.

Sau review nhóm D: nhóm E — ngôn ngữ/trạng thái chung và bố cục web responsive khách/partner.

## Nhóm E — v0.21 (21/09/2026)

### Bố cục responsive để duyệt thiết kế

Thêm thanh điều khiển ngay trên bản mẫu: Khung xem (Web responsive / Điện thoại 390px), Ngôn ngữ (VI mặc định / EN / JA), Trạng thái giao diện và Tải ứng dụng. Chế độ web dùng chiều rộng khả dụng tới 1150px; màn rộng đưa điều hướng khách/partner lên trên, danh mục dịch vụ 5 cột, bộ lọc 4 cột và kết quả 2 cột. Ở mức trung bình giảm số cột; dưới 800px chuyển bố cục một cột và điều hướng dưới. Khung 390px giữ cách xem app trước đây. Admin giữ các màn quản trị riêng.

Bố cục web kế thừa chức năng hiện có, không tạo bộ dữ liệu hoặc luồng giao dịch mới. Bản mẫu phục vụ lựa chọn bố cục, chưa có website production, SEO, deep link, ứng dụng cài đặt hoặc liên kết App Store/Google Play. Nút Tải ứng dụng mở thông báo chưa phát hành; có thể tiếp tục dùng web.

### Ngôn ngữ — phạm vi đã có và phần chưa hoàn tất

Có bản xem trước Việt/Anh/Nhật cho điều hướng khách/partner, trang chủ, tên 10 ngành chính, các nhãn tìm kiếm, một số nhãn công việc/ví và toàn bộ mẫu trạng thái. Đổi ngôn ngữ giữ trang, bộ lọc và các giá trị form hiện tại. HTML lang thay theo lựa chọn. VND, địa điểm và giờ nghiệp vụ Việt Nam không đổi theo ngôn ngữ. Không có dịch tự động tin nhắn hoặc nội dung người dùng.

Đây chưa phải bản dịch toàn bộ sản phẩm. Mô tả hồ sơ, tên kỹ năng chưa có bản dịch, nghiệp vụ chi tiết, xác thực, nhiều hộp thoại và admin còn tiếng Việt. Khi chọn EN/JA luôn có ghi chú phạm vi này. Tìm kiếm hiện vẫn dùng tên/kỹ năng tiếng Việt trong dữ liệu mẫu; chưa có tìm kiếm đa ngôn ngữ hoàn chỉnh. Cơ chế thay nhãn của prototype chỉ để review, không thay thế hệ thống i18n dùng message key/biến số/số nhiều trong sản phẩm thật. Chưa lưu ngôn ngữ vào tài khoản hoặc bộ nhớ bền vững.

### Bộ trạng thái chung

Có màn riêng để so sánh 6 trạng thái: đang tải (khung skeleton), chưa có dữ liệu, lỗi tải, mất kết nối, thiếu quyền, phiên đăng nhập hết hạn. Mỗi trạng thái có nội dung và hành động phù hợp ở 3 ngôn ngữ; lỗi/mất mạng có Thử lại, hết phiên có Đăng nhập lại, trạng thái trống/thiếu quyền có đường về trang chủ. Màn ghi rõ đây là mẫu, không mô phỏng API hoặc tự làm thay đổi phiên thực tế. Thử lại chuyển sang mẫu đang tải, không gửi yêu cầu thuê/giao dịch. Nội dung có aria-live và trạng thái busy. Quy tắc giữ dữ liệu khi hết phiên là yêu cầu thiết kế, chưa có kiểm thử xác thực backend.

### Kiểm tra và giới hạn

Đã kiểm tra trực tiếp: đổi ngôn ngữ VI/JA/EN; nhập Hùng bằng giao diện Nhật rồi chuyển Anh vẫn giữ từ khóa và tìm được một partner; khung điện thoại 390px hiển thị nhãn tiếng Anh; mẫu lỗi → thử lại → đang tải; mẫu trạng thái và thông báo chưa phát hành bằng tiếng Nhật; ví partner ở chế độ web responsive trên cửa sổ hiện có. Đã xem ảnh chụp giao diện tìm kiếm và ví; cú pháp JavaScript hợp lệ. Chưa chạy ma trận trình duyệt/thiết bị và chưa xác minh trực quan ở mọi breakpoint desktop rộng.

Cập nhật HTML và Markdown phạm vi trên Drive. Native SRS/FR-NFR chưa được đồng bộ trong lượt này. Giữ nguyên các mục 10,15,16,17 và chuyển chủ/đóng doanh nghiệp pending. Sau khi duyệt bố cục nhóm E, cần rà soát độ phủ thiết kế so với FR/SRS, liệt kê phần chưa đủ (đặc biệt bản dịch chi tiết và ma trận màn hình), rồi chốt tài liệu bàn giao; không xem bản mẫu hiện tại là sản phẩm sẵn sàng phát hành.

## v0.22 — Sửa sau audit và quyết định mới

- Mặc định tìm10km, cho tùy chọn mở rộng; luôn khớp vùng phục vụ. Địa chỉ cửa hàng công khai không đòi đăng nhập.
- Sửa mất dữ liệu hóa đơn khi thiếu ảnh; Làm ngay yêu cầu thợ nhập ngày/giờ dự kiến; điểm đánh giá tìm kiếm/hồ sơ loại phần ẩn/gỡ cùng nguồn.
- Nhiều kỹ năng và nhiều công việc mô phỏng, giữ riêng hóa đơn/ảnh/nháp/người được giao, giữ phí theo partner. Hồ sơ mới nối được tìm kiếm và thuê.
- Point mỗi hóa đơn mới là0; dùng tối đa phải do khách chọn.
- Thông báo tin nhắn và cuộc gọi tắt riêng ở cài đặt tài khoản; dùng chung hai chế độ. Email chỉ bảo mật/khôi phục.
- Cửa hàng có một đầu mối gọi do doanh nghiệp chọn. Trước giao gọi đầu mối; sau giao gọi thợ/cửa hàng; hoàn tất vẫn gọi lại. Phòng riêng khách–nhân viên giữ sau nghỉ, không mở cho quản lý.
- Sau xác nhận hóa đơn không tự sửa/hủy/hoàn. Khách/thợ phải report nếu có vấn đề; report lưu mã việc/phiên bản/chứng cứ. Admin kết luận không tự đổi tiền/point. Phần can thiệp bút toán vẫn pending; report không tự giải quyết giao dịch đang treo.
- Thêm ngân hàng lần đầu, chờ xác minh trước rút. Theo dõi hóa đơn từ24h sau xác nhận. Báo cáo lọc kỳ, tra cứu phiên bản/ảnh/bàn giao và sổ giữ/quyết toán.
- Có mô phỏng lỗi ngay tại màn hiện tại để giữ dữ liệu nhập. Dịch VI/EN/JA vẫn chưa đầy đủ; gọi, bản đồ, ảnh và tiền đều mô phỏng.
- Kiểm tra logic16case và Browser các đường chính đã qua; chưa coi là nghiệm thu NFR/production. Chi tiết kết quả và khoảng trống còn lại: `design-audit-v0.21/fix-status-v0.22.md`.

## v0.23 — Admin xác nhận hoàn tất thay thợ

- Đã được chủ dự án đồng ý: từ báo cáo của khách hoặc thợ có chứng cứ, admin được xác nhận hoàn tất thay thợ khi công việc xong và partner nhận đủ phần tiền trực tiếp. Trường hợp dùng point toàn bộ, xác minh công việc hoàn tất và tiền trực tiếp bằng 0.
- Điều kiện: quyền admin, báo cáo đang mở, hóa đơn đã xác nhận đúng phiên bản, chưa quyết toán/hủy hiệu lực. Bắt buộc lý do và xác nhận đã đối chiếu chứng cứ.
- Hiển thị trước tổng hóa đơn, tiền trực tiếp, phí, point dùng/bù và thưởng. Dùng luồng quyết toán thông thường một lần; giữ nguyên khoản giữ công việc khác.
- Lưu người xử lý, thời gian, lý do, mã báo cáo và phiên bản hóa đơn. Thông báo hai bên không chứa chứng cứ riêng tư. Đóng báo cáo là thao tác riêng và không tự tác động tài chính.
- Hủy, hoàn, đảo và điều chỉnh tùy ý vẫn pending; chưa giải quyết mọi ngoại lệ tài chính. Bản dịch Anh/Nhật tạm để sau theo yêu cầu.
- Vị trí: Admin → Hỗ trợ → báo cáo → Xác nhận hoàn tất thay thợ. Nút thử nhanh: “Thử admin hoàn tất thay thợ (làm mới)” phía trên màn hình; cần xác thực admin mẫu 654321.
- Kiểm tra: 19 ca logic đạt; đã thao tác trên Browser với hóa đơn 150.000đ, dùng 50.000 point, phí 10.000đ và thưởng 1.333 point. Dữ liệu trong phiên, chưa có thanh toán/backend thật.


### Quy tắc hiện hành 23/09 — công việc

Đã chốt 23/09/2026: chặn thuê chính mình hoặc doanh nghiệp đang là thành viên. Đổi lịch chỉ để thay đổi ngày/giờ hẹn sau khi hai bên trao đổi, không bắt buộc vì công việc kéo dài. Công việc đã nhận không tự hết hạn, tự hủy hoặc tự hoàn tất theo thời gian; có thể kéo dài nhiều ngày. Luồng hoàn tất bình thường cần khách báo đã trả và thợ xác nhận đã nhận; xác nhận hóa đơn riêng chưa kết thúc công việc. Giữ quy tắc quyết toán một lần và ngoại lệ admin đã chốt. Không tạo luồng đổi lịch qua báo cáo/admin. Sau xác nhận hóa đơn không còn hành động đổi lịch; hỗ trợ/bảo hành vẫn trao đổi trong chat.

## P0-1 — quyết định triển khai 06/10/2026

P0-1 · 06/10/2026 · v0.1.6 · Đã duyệt: hồ sơ quản lý riêng có version; draft/published, công bố không tự bật nhận việc; phone_verified trước tạo partner, owner và ví rỗng cùng transaction. Tìm theo distance mặc định, vùng tròn đo tới tâm và phải bao phủ khách; cursor theo distance_m/created_at/id, gắn bộ lọc. Tài khoản/provider test tách biệt được phép tạo trực tiếp; OTP, polygon, bản đồ và xếp hạng recommended/rating chưa triển khai. Không production/tiền thật.

Hồ sơ public và màn quản lý dùng dữ liệu riêng. Chỉ profile.manage/owner đang hoạt động được sửa; draft không hiện public. Công bố yêu cầu ít nhất một kỹ năng active và nơi làm phù hợp từng mode, ảnh năng lực chưa bắt buộc trong gói đầu. Sửa làm published không còn hợp lệ bị từ chối; về draft tắt nhận việc. Tắt nhận việc vẫn xem qua link, không hiện search. Tên kỹ năng public theo VI/EN/JA; không tự dịch tên/bio người dùng. Prototype trước P0-1 còn dữ liệu mô phỏng, không làm chuẩn thay quy tắc máy chủ mới.

Bổ sung theo yêu cầu chủ dự án P0-1: được tạo tài khoản DEMO mới cho thợ/cửa hàng/doanh nghiệp trong DB local để tự thử khi OTP Pending. Không sửa tài khoản hiện hữu, không huy hiệu xác minh hồ sơ, ví 0đ; công cụ chỉ chạy NODE_ENV=development, DB dvqb_local trên localhost. Tài khoản thử không chứng minh xác minh SMS hay đăng ký production đã hoàn tất.

## MAP-01 — chọn địa điểm, thử local ngày 07/10/2026

Theo yêu cầu triển khai tiếp sau khi chốt MapLibre + Geoapify Free: bộ chọn chung cho tìm dịch vụ, sổ địa chỉ, cửa hàng và tâm vùng. Có nhập địa chỉ/gợi ý, tìm cả chuỗi, chạm/kéo bản đồ, GPS khi bấm nút và địa chỉ đã lưu. Theo yêu cầu MAP-03 ngày 07/10/2026, bỏ nút và ô nhập tọa độ thủ công ở cả bốn nơi; tọa độ vẫn được lấy từ địa điểm đã chọn để tìm/lưu theo API hiện có. Người dùng chọn kết quả và xác nhận; không tự lấy dòng đầu. Gõ truy vấn khác hủy lựa chọn cũ, sửa mô tả tầng/phòng giữ ghim. Hủy không sửa form. Đổi tài khoản xóa bản nháp riêng; phản hồi cũ không ghi đè điểm mới.

Ba POST `/v1/locations/autocomplete`, `/geocode`, `/reverse` nhận JSON body theo OpenAPI v0.1.7. Query 3–300 ký tự, locale vi/en/ja, tối đa 5 gợi ý. Tra ngược giữ chính điểm yêu cầu, rỗng/lỗi vẫn cho nhập mô tả sau khi có điểm. Khách chưa đăng nhập được tra cứu với hạn mức IP; bearer hợp lệ dùng tài khoản. Pilot một tiến trình: 4 lookup/giây, 30/actor/phút, 1000/24h; restart reset bộ đếm. 429 có Retry-After; timeout provider 6 giây trả 504 TIMEOUT. Các giới hạn này không bao gồm tile và không phải bảo đảm chặn chi phí toàn project.

Key tra cứu ở server; key tile công khai ở app. Chưa billing/production, chưa dùng Google. Không ghi log địa chỉ/tọa độ/key, không lưu lịch sử GPS. Geoapify và OpenStreetMap được ghi nguồn. Bản đồ nền do app tải trực tiếp; không gửi token dự án tới Geoapify.

Không migration: giữ `{text, point}` và quyền/version/idempotency của API lưu hiện hành. `source` chỉ ở state app, ID gợi ý chỉ tạm. Tâm vùng không thành vị trí thợ công khai; chỉ điểm cửa hàng đã công khai được vẽ trong hồ sơ. Polygon, gom ghim toàn bộ kết quả, routing/ETA và theo dõi thợ ngoài đợt. Bằng chứng code/local/native ở báo cáo B03-01 trong repo; không suy ra UAT/production.

## MAP-02 — bản đồ kết quả, API v0.1.8

MAP-02 — 07/10/2026, quyết định đã chốt: chỉ ghim địa điểm đã đánh dấu công khai; người chưa có điểm công khai vẫn hiện trong danh sách. Mở rộng bản đồ kết quả sau MAP-01, trước P0-2; thay phần loại trừ bản đồ kết quả của MAP-01. Giữ MapLibre + Geoapify Free, chưa billing/production.

Sau khi tìm, khách chuyển Danh sách/Bản đồ trên cùng kết quả và bộ lọc. Điểm cần dịch vụ màu xanh lá, địa điểm công khai màu xanh dương; bấm ghim xem tên, địa chỉ và mở hồ sơ. Ghim trùng tọa độ gom chung nhưng vẫn chọn được từng người. Người không có ghim nằm trong danh sách bên dưới; có thể chuyển về danh sách đầy đủ. Chỉ vẽ các kết quả đã tải; Xem thêm bổ sung cả danh sách và ghim. Đổi điểm hoặc gửi tìm mới bỏ kết quả cũ. Lỗi nền bản đồ cho thử lại hoặc chuyển danh sách.

OpenAPI v0.1.8: GET /v1/partners thêm PartnerCard.map_location bắt buộc, giá trị Address {text, point} hoặc null. Với mỗi người đủ điều kiện tìm kiếm, lấy địa điểm active=true, public=true gần điểm tìm nhất và nằm trong bán kính; hòa khoảng cách chọn created_at rồi id. Không có điểm phù hợp trả null, không loại người khỏi kết quả. Giữ nguyên điều kiện công bố/nhận việc/kiểm duyệt, thứ tự, bộ lọc và cursor. distance_m/distance_kind tiếp tục phục vụ xếp hạng theo cửa hàng hoặc tâm vùng, không suy ra khoảng cách tới ghim.

Không dùng hoặc trả service_areas.center làm ghim; không lộ địa điểm private/đã lưu trữ. Đây là địa điểm khai báo công khai, không phải GPS trực tiếp của thợ. Không migration, không đổi quyền ghi public/private. Không thêm tra cứu provider theo từng thợ, routing, ETA hoặc tracking. Bằng chứng và ảnh chạy app ở báo cáo B03-02 trong repo; kiểm local/simulator không thay UAT hoặc phê duyệt production.

## MAP-03 / P0-2 — phạm vi đã duyệt ngày 07/10/2026

MAP-03 và P0-2 — quyết định chủ dự án ngày 07/10/2026, API v0.1.9.
Bỏ nút và ô nhập tọa độ thủ công trong tìm kiếm, sổ địa chỉ, cửa hàng, vùng phục vụ và form thuê. Người dùng chọn địa chỉ/gợi ý, ghim bản đồ, GPS theo nút hoặc địa chỉ đã lưu; tọa độ vẫn là dữ liệu nội bộ/API. Phần mô tả nhập tọa độ trong các mốc trước là lịch sử đã được thay thế.
Job bổ sung service_mode, time_mode, location_id (null ngoài cửa hàng), note và eta (null trước nhận/hẹn trước). Làm ngay bắt buộc ETA khi nhận; lưu thời điểm dự kiến đến và lịch ban đầu, không thêm nút Bắt đầu. Đổi lịch cập nhật scheduled_at, giữ eta ban đầu và tăng schedule_version/lịch sử. PartnerProfile bổ sung public_locations gồm id + address chỉ cho địa điểm active/public, và service_modes theo skill_id; không trả tâm vùng hoặc điểm riêng. Máy chủ đối chiếu location_id với cửa hàng hiện hành và lấy địa chỉ từ DB, không tin địa chỉ cửa hàng do client gửi.
Gói P0-2 local/test: khách tạo/đọc/rút yêu cầu, partner nhận/từ chối, đổi lịch/dừng trước hóa đơn khóa, phân công theo quyền. Có chi phí đã thỏa thuận thì dừng vẫn giữ accepted để tiếp tục hóa đơn ở P0-3; lưu cờ và lý do, không tạo hóa đơn giả. Không có chi phí chuyển stopped. Không tự hết hạn, hủy hay hoàn tất theo giờ. Giữ xác minh điện thoại ở backend khi gửi/nhận; chỉ dùng tài khoản DEMO local/test đã được duyệt, OTP thật Pending.
Chat tối thiểu dùng API HTTP: tạo/mở lại phòng trước thuê, gửi/đọc tin văn bản, thứ tự sequence, chống trùng client_message_id và idempotency, mốc đã đọc chỉ tăng, tải lại khi quay lại màn/app hoặc bấm cập nhật. Khách–cửa hàng/doanh nghiệp tách khách–nhân viên; phân công thêm tin hệ thống trong phòng riêng. Đổi người không sao chép lịch sử; người cũ giữ chat của mình nhưng mất quyền việc sau thu hồi/phân công lại. Ghi sự kiện bền vững cùng transaction; WebSocket/worker phát sự kiện, push/nhắc lịch, gọi và file đính kèm chưa nghiệm thu trong gói HTTP này. Các yêu cầu sản phẩm đầy đủ vẫn giữ, không coi phần chưa triển khai đã hoàn tất.
Bằng chứng code/local, web và native nằm trong báo cáo B03-03/B03-04 ở repo; không thay CI từ xa, UAT, production hoặc tiền thật.

## P1-01 A/B hiện hành — 13/10/2026

P1-01 A/B đã được chủ dự án duyệt ngày 13/10/2026. Chuẩn hiện hành cho đội ngũ và xác minh local/test là OpenAPI v0.1.11; các đoạn trước mô tả OTP Pending hoặc mã mẫu là lịch sử/phạm vi production, không phủ quyết phần local này.
Chỉ mở OTP purpose=verify trong phiên đăng nhập: email qua Mailpit trên máy, SMS qua hộp nhận mô phỏng. Mã ngẫu nhiên 6 số, hạn 5 phút, tối đa 5 lần sai; gửi lại sau 60 giây, 5 lần/liên hệ/giờ, 20 lần/tài khoản/giờ và 100 lần/IP/giờ. Mã gắn tài khoản, liên hệ và lần đăng nhập; gửi lại vô hiệu mã cũ. Xác minh email không xác minh điện thoại. Không thay email/điện thoại đã có hoặc chiếm liên hệ tài khoản khác. Chỉ DB DEMO/test cô lập và liên hệ cho phép; disabled mặc định, chặn production. Chưa mở OTP login/recover, MFA admin, email/SMS thật, billing hoặc tiền thật.
Chủ hoặc members.manage mời bằng email hoặc điện thoại, permissions=[]; lời mời 7 ngày, không trả token cho quản lý. Người nhận đăng nhập, xác minh đúng liên hệ rồi chủ động nhập token nhận lời. List/gửi lại/thu hồi kiểm quyền hiện hành; gửi lại thay token cũ. Nhận lời kiểm lại người mời; gia nhập lại dùng cùng membership nhưng không khôi phục quyền cũ. Lịch sử trạng thái pending/accepted/expired/revoked/replaced tách queued/submitted/failed/unknown của việc chuyển thư; submitted không chứng minh người nhận đã đọc.
GET /me/memberships phục vụ cả nhân viên thường và lịch sử đã rời. Cấp/thu hồi quyền dùng lý do, expected_version, Idempotency-Key và grant nhập lại mật khẩu qua POST /auth/reauthenticate. Grant hạn 5 phút, một lần, gắn user/family và scope membership.grants; refresh không gia hạn. Cấm tự sửa/sửa chủ/cấp vượt quyền; quyền thao tác ví cần wallet.read. Không coi nhập lại mật khẩu là MFA, không mở nghiệp vụ ngân hàng từ enum quyền.
Gỡ/tự rời: xem trước số việc cần bàn giao và version; xác nhận có lý do, máy chủ kiểm lại dưới khóa partner → job → invoice. Việc chưa có dấu nhận tiền về chờ phân công, chỉ bỏ nháp chưa gửi; giữ bản đã gửi/khóa, ledger, khoản giữ và dấu thanh toán. Việc đã nhận tiền giữ người thực hiện lịch sử. Thu hồi quyền ngay, giữ phòng chat cá nhân và không sao chép cho người mới. Đầu mối dùng Partner.version, có thể null để về cửa hàng; rời sẽ reset nếu đang là đầu mối. Gọi Internet vẫn chưa triển khai.
OTP/token lưu HMAC; liên hệ và nội dung hàng chờ mã hóa, xóa payload sau gửi/hết hạn. Worker khóa bản ghi để tránh hai lần gửi đồng thời; crash sau gửi vẫn có thể gây thư trùng, token chỉ dùng một lần. Audit bất biến ghi actor/lý do/quyền trước-sau/việc bàn giao, không ghi mật khẩu, token, OTP hay nội dung chat. Snapshot retry không chứa bí mật thô. UI Việt/Anh/Nhật đi từ Tài khoản → Xác minh liên hệ hoặc Đội ngũ → Thành viên/Lời mời/Đã rời/Quyền truy cập. Mất mạng giữ thao tác để thử lại; đổi tài khoản loại dữ liệu riêng. Bằng chứng code/native/CI/UAT được ghi riêng trong báo cáo repo, không coi spec là nghiệm thu.

## P1-02 — Tùy chọn nhắc lịch riêng, 14/10/2026

P1-02 ngày 14/10/2026: chủ dự án duyệt bổ sung công tắc nhắc lịch riêng và đồng bộ spec. Settings có bốn boolean bắt buộc message_push, call_push, service_push, reminder_push; mặc định true. reminder_push chỉ điều khiển gửi nhắc 24 giờ/1 giờ ra ngoài ứng dụng, độc lập service_push (công việc/hóa đơn). Tắt bất kỳ mục nào vẫn giữ inbox và lịch sử trong app; thông báo an toàn tài khoản không bị tắt. GET/PUT /me/notification-settings chỉ chính tài khoản, PUT giữ Idempotency-Key khi retry. Không duyệt provider, gửi push/email/SMS thật, billing hoặc production. Bằng chứng triển khai/local/native/CI/UAT được ghi riêng trong báo cáo B05-01 ở repo.


## RT-01A — cập nhật đã duyệt

RT-01A — 14/10/2026: chủ dự án đã duyệt triển khai Socket.IO 4, chỉ transport websocket, một NestJS instance. Path /v1/realtime/socket.io, namespace /; access token qua auth.token, không query URL. HTTP giữ thao tác ghi, ACK sau commit và lấy bù. Mỗi app một kết nối foreground, reconnect khi refresh, đóng khi logout/background; kiểm phiên và quyền hiện hành trước từng lần phát. Sự kiện là tín hiệu tải lại, không tự cộng tiền, unread hoặc quyết toán. Bốn công tắc push không tắt inbox/chat foreground. RT-01B/Redis, push ngoài app, gọi, presence/typing, provider/billing/production chưa mở.

Contract chi tiết: `docs/technical-design/realtime.json` v0.2, API v0.1.13. Dữ liệu thêm correlation_id và realtime_deliveries; unique theo event/user, lease riêng từng consumer; không dùng processed_at chung. QA-094–097 bổ sung kiểm realtime; không đổi trạng thái nghiệm thu của QA cũ. `notification.read.v1` chỉ lần đầu; thêm `invoice.revision_requested.v1`; invoice settled/payment_reported chuẩn hóa payload IDs/version, đọc eligibility/tiền bằng HTTP đúng quyền.


## MSG-01 — Tách Tin nhắn và Thông báo

MSG-01 — 15/10/2026, chủ dự án đã chốt: Tin nhắn và Thông báo có hai bộ đếm chưa đọc độc lập. Tin nhắn mới chỉ tăng badge Tin nhắn, không tạo mục trong inbox Thông báo và không tăng badge chuông. Badge Tin nhắn là tổng Conversation.unread trên tất cả phòng còn quyền truy cập, không phải số phòng; giữ định nghĩa unread hiện hành (không tính tin do chính mình gửi, mốc đọc theo sequence, gồm tin hệ thống của phòng). Badge Thông báo chỉ đếm mục chưa đọc ngoài chat, gồm công việc/hóa đơn/nhắc lịch và các loại khác đã được triển khai. Đọc một nhóm không đánh dấu đọc nhóm kia. Không hiển thị badge khi bằng 0; trên 99 hiện 99+. Sự kiện realtime chỉ yêu cầu tải lại HTTP, không cộng số trực tiếp; lấy bù khi reconnect/foreground, xóa số của tài khoản cũ khi đăng xuất/đổi tài khoản. Tắt message_push chỉ tắt push ngoài app, không tắt badge hoặc lịch sử chat. Không mở thêm provider hoặc production.
