# UX-01 — Bản thiết kế HTML để duyệt trước khi sửa app

Ngày: **02/11/2026**. Trạng thái: **chủ dự án đã duyệt giao diện và yêu cầu áp dụng vào app ngày 02/11/2026**. Bản HTML vẫn là mẫu minh họa tại thời điểm duyệt; kết quả triển khai xem [B00-15](../bao-cao/B00-15-toi-uu-trai-nghiem.md). D01–D04 giữ chưa duyệt.

[Mở bản thiết kế tương tác](UX-01-thiet-ke-giao-dien.html) · [Báo cáo bàn giao](../bao-cao/B00-16-ban-thiet-ke-ux01.md) · [Kế hoạch UX-01](UX-01-toi-uu-luong-va-nut.md).

## Cách xem

Mở file HTML trực tiếp bằng trình duyệt, không cần API hoặc máy chủ. Giữ thư mục `UX-01-thiet-ke/` cạnh HTML; font dùng từ `apps/mobile/assets/fonts/` trong repository. Bản này hoạt động offline, không gọi database, không ghi localStorage, không gửi tin nhắn/OTP/tiền ra ngoài. Tải lại trang hoặc bấm **Bắt đầu lại bản mẫu** sẽ khôi phục dữ liệu minh họa.

- **Bên trái:** chọn một trong 7 vai, lọc theo luồng và tìm tên màn/nút/mã nhóm; tìm tiếng Việt không dấu được hỗ trợ. Chỉ liệt kê màn trong góc nhìn vai đang chọn.
- **Ở giữa:** bấm trực tiếp lên giao diện. Mũi tên trở về màn nguồn. Chọn iPhone/Android để so bố cục 390/412 px trên máy tính; trên cửa sổ hẹp, khung co lại vừa vùng xem. Chữ lớn là thử bố cục HTML, không phải Dynamic Type native.
- **Bên phải:** lý do thay đổi, công dụng nút và các tình huống như không có kết quả, lỗi mạng, hóa đơn cần sửa, lỗi tải Point, chưa có ngân hàng, admin thiếu quyền.
- **Đổi vai** ở bộ điều khiển giữ cùng công việc mô phỏng để xem hai phía; đây không phải cơ chế đổi tài khoản thật. Những màn sửa thông tin phụ chỉ là mẫu tương tác, không phải toàn bộ contract.

## Luồng nên duyệt trước

1. Khách thuê → Tìm dịch vụ → mở Bộ lọc, đổi bán kính rồi Hủy; mở lại và Áp dụng; đổi sắp xếp; xem một hồ sơ → Gửi yêu cầu dịch vụ.
2. Giữ màn công việc, đổi sang **Chủ hồ sơ cung cấp** → Nhận việc → Lập hóa đơn → thêm ảnh minh họa → Lưu nháp → Gửi hóa đơn.
3. Đổi sang **Khách thuê** → Yêu cầu sửa, nhập lý do → đổi lại người thực hiện để sửa và gửi → khách Xác nhận hóa đơn → Báo đã thanh toán.
4. Đổi sang người thực hiện → tích xác nhận nhận đủ tiền → Xác nhận → về công việc → Đánh giá. Hai dấu thanh toán được trình bày riêng.
5. Nhân viên chỉ quản lý việc → Tài khoản: không có ví, đội ngũ, sửa hồ sơ. Quản lý có các điểm vào này trong kịch bản quyền mẫu.
6. Quản trị → chọn tình huống chỉ có quyền hỗ trợ; sau đó quyền mẫu đầy đủ → Tài chính chưa rõ kết quả: không bật chuyển lần hai.

Dùng tình huống ở cột phải để đến ngay một trạng thái, không cần thực hiện lại toàn luồng.

## Phạm vi thiết kế

**30 màn mẫu**, có các hộp thoại và biến thể; liên hệ với 29 nhóm UX (G03 được giữ chờ xác minh). Con số 30 này không phải 135 mục đã thiết kế lại hay 444 nút đã kiểm xong.

| Nhóm UX | Màn mẫu trong HTML | Độ sâu / giới hạn |
|---|---|---|
| G01–G02 | Tìm dịch vụ, bộ lọc, sơ đồ kết quả, địa điểm | Lọc nháp/áp dụng/hủy, sort, lỗi/trống; sơ đồ không phải bản đồ thật, không định vị/geocode |
| G03 | Không tạo điểm vào mới | Route danh mục cũ giữ chờ truy điểm vào; không đề xuất xóa |
| G04 | Hồ sơ công khai, gửi yêu cầu | Form và đường tiếp tục sau đăng nhập; dữ liệu người cung cấp minh họa |
| G05–G08 | Đăng nhập, tài khoản, địa chỉ, phiên, bảo mật | Các form phổ biến; đăng ký/đổi mật khẩu/khôi phục/xóa chỉ phác bước, không xác thực thật |
| G09–G11 | Danh sách/lịch, chi tiết công việc | Một công việc xuyên vai; lịch một tuần minh họa; dừng việc/đổi lịch/phân công chưa mô phỏng toàn bộ nghĩa vụ |
| G12–G13 | Hóa đơn theo vai/trạng thái | Nháp/gửi/sửa/chốt/hai dấu/hoàn tất thay; **chỉ 0 Point**, không tính phí nền tảng, ledger hay quyết toán thật |
| G14 | Đánh giá | Chọn sao, lưu/gỡ/khôi phục minh họa; không mô phỏng ảnh/phản hồi/kiểm duyệt toàn bộ |
| G15–G16 | Hồ sơ cung cấp, sửa hồ sơ, ảnh, xác minh | Công khai khác nhận việc; ảnh công khai khác chứng cứ riêng; vùng đa giác và upload thật chưa dựng |
| G17–G18 | Đội ngũ, quyền thành viên | Thành viên/lời mời, tóm tắt đổi quyền, gỡ có nghĩa vụ; không đại diện mọi tổ hợp quyền |
| G19–G20 | Ví và chi tiết giao dịch | Thiếu/ngân hàng chờ/đã duyệt; yêu cầu nạp/rút không báo đã chuyển; số dư không tính thật |
| G21–G22 | Inbox, chat, gọi | Giữ tin lỗi/thử lại; tin mới khi đọc lịch sử; gọi chỉ bố cục, không có media/hai đầu |
| G23–G24 | Thông báo, cài đặt, hỗ trợ | Bốn công tắc riêng, đọc thông báo; hỗ trợ tài khoản hạn chế; không gửi push/provider |
| G25–G26 | MFA, khu quản trị | Phân nhóm và hàng đợi, full/support-only; không nhận OTP/MFA thật |
| G27–G30 | Chi tiết xử lý, quyền/yêu cầu tài khoản | Mẫu kết luận/lý do, chứng cứ, ghi chú nội bộ, unknown tài chính, quyền theo tên dễ hiểu; chưa dựng mọi form/nhánh admin |

## Những điều giữ và những điều còn chờ duyệt

Giữ bảng màu B00-10/B00-11: xanh `#2457D6`, chữ `#16233B`, nền `#F4F7FC`, xanh thành công `#24634D`, cảnh báo `#925700`, lỗi `#B42318`; font Be Vietnam Pro đã có trong repo. Khoảng cách theo nhịp 4/8/12/16/24, bo nút 13 và thẻ 18. Nút chính ở bước hiện tại nổi bật; hành động nguy hiểm tách riêng. Nhãn trạng thái có chữ/biểu tượng, không chỉ khác màu.

F01/F02 và cách trình bày trạng thái F03 dựa trên bất tiện đã quan sát; bố cục mới vẫn là **phương án thiết kế**. Thanh nút dưới màn công việc/hóa đơn cần kiểm bàn phím, safe area và chữ lớn trên native trước khi chốt áp dụng. Không coi một ảnh mockup là bằng chứng thanh này luôn tốt hơn.

D01 lịch theo khoảng ngày, D02 tải lịch sử chat, D03 bộ lọc việc theo actor và D04 thông tin nhận diện admin **chưa được duyệt**. Mẫu dùng các ví dụ cục bộ; không chứng minh API đã hỗ trợ hay dữ liệu đầy đủ. Không tự bổ sung voucher, banner chiến dịch hoặc provider/chi phí.

Nội dung thuyết minh và nhãn “minh họa” ở đây phục vụ duyệt thiết kế, không phải đề xuất đưa thuật ngữ kỹ thuật vào luồng người dùng cuối. Tại thời điểm bàn giao bản mẫu: chưa áp dụng vào React Native/API, chưa ghi `dvqb_local`, chưa đồng bộ Drive/`ui-ux`, chưa commit/push/deploy. Trạng thái sau phê duyệt được ghi riêng trong B00-15. Khi triển khai được duyệt, nghiệm thu luồng thật vẫn dùng `dvqb_local` theo yêu cầu đã chốt, với dữ liệu được chọn và bảo toàn dữ liệu cũ.
