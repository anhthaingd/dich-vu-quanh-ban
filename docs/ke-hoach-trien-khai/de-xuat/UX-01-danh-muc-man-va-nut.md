# UX-01 — Danh mục rà soát màn hình và nút

Ngày: **31/10/2026**. Trạng thái: **kiểm kê và đề xuất để duyệt; chưa triển khai**. [Kế hoạch và tiêu chí bàn giao](UX-01-toi-uu-luong-va-nut.md).

> **Đang rà native theo yêu cầu mới:** 135 mục/444 mô tả nút và nhóm điều khiển dưới đây là phạm vi kiểm kê, không phải số đã bấm thử. Lượt mới kiểm Android/iOS với `dvqb_local`, tách “thấy nút”, “mở form/điều hướng”, “ghi thành công có đối chiếu DB” và “chưa kiểm”. Không lấy ảnh cũ hoặc một lần mở màn làm bằng chứng mọi nút đã đạt.

## Bằng chứng native mới

[Bảng lọc 444 mô tả theo nền tảng/vai/mức kiểm](../bao-cao/UX-01-kiem-nut-native.html) · [Kết quả và giới hạn](UX-01-ket-qua-ra-soat-native.md). Mọi mục G01–G30 dưới đây vẫn là đề xuất, trừ kết luận được ghi rõ trong kết quả audit. Ưu tiên hiện đề nghị: kiểm chứng gói 0 → tìm/lọc → công việc/hóa đơn; chưa đủ cơ sở chốt toàn bộ nút.

## Cách sử dụng

Phần 1 gom thành 30 nhóm tối ưu có quyết định cụ thể cho nút. Phần 2 ánh xạ đủ 135 mục B00-14 vào các nhóm, giữ tên vai và nút để không bỏ sót. Cột ảnh là bằng chứng cũ ngày 30/10, không phải ảnh sau sửa.

**Mức kiểm:** đã đối chiếu danh mục toàn bộ 135 mục; chỉ các quan sát ghi “Code” hoặc ảnh cụ thể là đã kiểm thêm tại nguồn tương ứng. Các đề xuất từ danh mục phải kiểm lại layout/nút thực tế ở gói 0. Chưa bấm thử lại 135 mục hay mọi nút trên thiết bị trong lượt lập kế hoạch.

**Đặc biệt với hóa đơn/công việc:** tên nút trong catalog là danh sách chức năng liên quan, không chứng minh tất cả xuất hiện cùng lúc. Kế hoạch yêu cầu ghi rõ visible/enabled/disabled/absent theo actor, quyền và state thật; không sửa app để khớp một mô tả catalog quá rộng.

## 1. Quyết định đề xuất cho từng nhóm

<a id="g01"></a>
### G01 · Tìm dịch vụ và bộ lọc

**Ưu tiên:** Cao · gói 2.

**Nút/điều khiển cần rà:** Kính lúp; Áp dụng; Hủy/đóng bộ lọc; xếp theo khoảng cách/đánh giá/đề xuất; Bản đồ/Danh sách; Xem thêm.

**Tối ưu đề xuất:** Áp dụng tìm lại ngay; thêm Hủy rõ nghĩa và bản nháp bộ lọc; đổi sort tìm lại, giữ query; chip điều kiện + Xóa bộ lọc; điều hướng bản đồ/danh sách giữ điều kiện. Giữ tìm kiếm bằng kính lúp với nhãn trợ năng, không bắt mọi icon thành nút lớn.

**Căn cứ và mức kiểm:** Code và native mới: đổi sắp xếp Đánh giá làm mất kết quả; Áp dụng bán kính còn phải bấm tìm lại, đã tái hiện trên Android/iOS (F01–F02). Các lựa chọn khác và phương án thiết kế mới vẫn cần kiểm, chưa triển khai.

**Điều phải giữ:** Không lọc kết quả cục bộ một trang rồi coi là toàn bộ; không trộn cursor giữa hai truy vấn.

<a id="g02"></a>
### G02 · Chọn địa điểm

**Ưu tiên:** Cao · gói 2.

**Nút/điều khiển cần rà:** Tìm địa chỉ; Vị trí hiện tại; Xác nhận; Hủy.

**Tối ưu đề xuất:** Xác nhận cố định dễ tìm khi hợp lệ; Hủy/Back trả nguyên giá trị cũ; lỗi định vị có đường nhập địa chỉ; mô tả địa điểm được chọn trước khi xác nhận.

**Căn cứ và mức kiểm:** Kiểm kê báo cáo + điểm gọi trong Search; cần rà native hộp thoại/keyboard ở từng nơi sử dụng.

**Điều phải giữ:** Không tự bật quyền vị trí; không dùng vị trí tài khoản trước; giữ contract địa điểm.

<a id="g03"></a>
### G03 · Route danh mục cũ

**Ưu tiên:** Cần xác minh · gói 0.

**Nút/điều khiển cần rà:** Mục danh mục; Mũi tên.

**Tối ưu đề xuất:** Truy điểm vào/deep link và nhu cầu hiện tại; giữ route cho tới khi chứng minh được có thể chuyển hướng/bỏ. Không thêm menu mới chỉ để đủ ảnh.

**Căn cứ và mức kiểm:** B00-14 chưa có ảnh/điểm vào rõ.

**Điều phải giữ:** Không xóa route khi chỉ thấy ít dùng; kiểm liên kết và Back trước khi quyết định.

<a id="g04"></a>
### G04 · Hồ sơ công khai và gửi thuê

**Ưu tiên:** Cao · gói 2.

**Nút/điều khiển cần rà:** Gửi yêu cầu; Liên hệ; kỹ năng; Làm ngay/đặt lịch.

**Tối ưu đề xuất:** Gửi yêu cầu là nút chính, Liên hệ phụ. Form có nhãn “Gửi yêu cầu dịch vụ”, tóm tắt nơi/giờ/dịch vụ; lỗi cạnh trường. Sau login quay lại ý định, không tự gửi.

**Căn cứ và mức kiểm:** Code: profile-hire/profile-chat theo can_hire/can_message; form từ báo cáo và Work.

**Điều phải giữ:** Giữ các mode, kỹ năng hợp lệ, điều kiện thời gian và quyền hiện hành.

<a id="g05"></a>
### G05 · Đăng nhập và đăng ký

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Đăng nhập; Đăng ký; OTP/đặt lại mật khẩu; Khôi phục.

**Tối ưu đề xuất:** Một nút gửi chính cho form đang chọn; tách Quên mật khẩu khỏi hỗ trợ khôi phục; giữ đường sang OTP dễ hiểu, phản hồi đúng trường.

**Căn cứ và mức kiểm:** Danh mục B00-14; chưa kết luận cần đổi bố cục mọi trường.

**Điều phải giữ:** Không tiết lộ tài khoản tồn tại; không bỏ xác thực để giảm bước.

<a id="g06"></a>
### G06 · Tài khoản và đổi ngữ cảnh

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Chọn hồ sơ/vai; thông tin; ngôn ngữ; Lưu; Đăng xuất.

**Tối ưu đề xuất:** Tên vai/cơ sở hiện hành rõ; nhóm menu công việc/cá nhân/bảo mật. Lưu thông tin nói rõ đối tượng; Đăng xuất tách cuối. Giữ thẻ Point đã chốt.

**Căn cứ và mức kiểm:** B00-14 + cấu trúc ProductRole hiện hành; không đề xuất thêm chức năng đổi vai vì đã có.

**Điều phải giữ:** Đổi vai dựa quan hệ thực; đổi scope xóa cache riêng, giữ backend kiểm quyền.

<a id="g07"></a>
### G07 · Phiên đăng nhập và địa chỉ

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Thu hồi phiên; thu hồi các phiên khác; Thêm/Sửa; Đặt mặc định; Lưu trữ; Lưu/Hủy.

**Tối ưu đề xuất:** Hiện tên thiết bị/phiên hiện tại trước nút thu hồi; đưa lưu trữ vào thao tác phụ riêng. Form địa chỉ rõ Lưu địa chỉ/Hủy; giữ xác nhận đã có.

**Căn cứ và mức kiểm:** Danh mục báo cáo; cần đối chiếu layout thực tế trước thay đổi.

**Điều phải giữ:** Không thu hồi nhầm phiên hiện tại; lưu trữ không được mô tả là xóa dữ liệu vĩnh viễn.

<a id="g08"></a>
### G08 · OTP, bảo mật và khôi phục

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Gửi mã; Xác nhận mã; Gửi lại; Đổi mật khẩu; Kiểm nghĩa vụ; Yêu cầu xóa.

**Tối ưu đề xuất:** Hiển thị theo bước, nhãn theo mục đích; lý do Gửi lại bị khóa theo thời hạn server. Xóa tài khoản ở khu riêng, trình bày nghĩa vụ/Point trước hành động.

**Căn cứ và mức kiểm:** Danh mục và nguồn security được liên kết; cần kiểm từng nhánh trên native.

**Điều phải giữ:** Không tự chọn đồng ý mất Point; giữ re-auth và kiểm nghĩa vụ; không hứa xóa vật lý ngay.

<a id="g09"></a>
### G09 · Danh sách và lịch việc

**Ưu tiên:** Cao · gói 3.

**Nút/điều khiển cần rà:** Chi tiết; Lịch/Danh sách; chọn ngày; Tải lại.

**Tối ưu đề xuất:** Tab gọn thay nút hành động lớn; giữ ngày/lọc/cuộn khi quay lại. Refresh giữ dữ liệu cùng scope, thông báo đang cập nhật. D01/D03 cần duyệt nếu mở lọc mới.

**Căn cứ và mức kiểm:** Code: JobsScreen xóa items khi refresh; calendar đọc đủ trang.

**Điều phải giữ:** Không dựng lịch từ trang đầu; không hiện dữ liệu cũ sau đổi actor/hồ sơ.

<a id="g10"></a>
### G10 · Chi tiết việc của khách

**Ưu tiên:** Cao · gói 1.

**Nút/điều khiển cần rà:** Trao đổi; Rút yêu cầu; Đổi lịch; Dừng việc; Hóa đơn; Đánh giá; Hỗ trợ.

**Tối ưu đề xuất:** Tóm tắt trạng thái + đang chờ ai; Hóa đơn/Đánh giá khi phù hợp là điểm tiếp tục. Trao đổi dễ tìm; Rút/Dừng trong nhóm thao tác có nhãn rõ, giữ lý do/xác nhận.

**Căn cứ và mức kiểm:** Code JobDetail; catalog chưa liệt kê hết nút theo điều kiện, phải dùng allowed_actions làm chuẩn.

**Điều phải giữ:** Rút yêu cầu khác Dừng việc; dừng có phí thỏa thuận vẫn theo nghiệp vụ, không ép kết thúc.

<a id="g11"></a>
### G11 · Chi tiết việc phía cung cấp

**Ưu tiên:** Cao · gói 1.

**Nút/điều khiển cần rà:** Nhận việc; Từ chối; Phân công; Đổi lịch; Hóa đơn; Trao đổi; Hỗ trợ.

**Tối ưu đề xuất:** Nhận việc trước khối đánh giá/liên hệ phụ. Từ chối thứ cấp, phân công mở chọn thành viên khi có quyền; chỉ tải thành viên khi thực sự cần nếu hợp đồng cho phép. Nút theo người thực hiện, không mặc định chủ luôn lập hóa đơn.

**Căn cứ và mức kiểm:** Code và ảnh android-owner-job-requested; tất cả state cùng tone success cần sửa cách trình bày.

**Điều phải giữ:** ETA/form nhận việc, allowed_actions, quyền phân công và người lập hóa đơn giữ nguyên.

<a id="g12"></a>
### G12 · Khách xem và xác nhận hóa đơn

**Ưu tiên:** Cao · gói 1.

**Nút/điều khiển cần rà:** Yêu cầu sửa; Xác nhận hóa đơn; dùng Point tối đa; Báo đã thanh toán; Tải lại.

**Tối ưu đề xuất:** Tiền/Point/tiền trực tiếp lên trước ảnh dài. Nút chính theo state, giải thích xác nhận chưa có nghĩa đã trả. Bản nháp chưa được xem có đường quay lại việc, không hiển thị tiền giả.

**Căn cứ và mức kiểm:** Code InvoiceScreen và ảnh ios-customer-invoice-locked; danh sách nút trong catalog dùng chung giữa state, cần sửa báo cáo.

**Điều phải giữ:** Không hiện đồng loạt mọi nút; Point chưa biết thì khóa confirm; giữ quyền và version.

<a id="g13"></a>
### G13 · Người thực hiện lập và quyết toán hóa đơn

**Ưu tiên:** Cao · gói 1.

**Nút/điều khiển cần rà:** Chọn ảnh; Lưu nháp; Gửi hóa đơn; xác nhận nhận đủ; nhận tiền sau admin; Lịch sử.

**Tối ưu đề xuất:** Gửi hóa đơn chính, Lưu nháp phụ; chỉ rõ ảnh còn thiếu/đang tải. Nhận tiền có số tiền + checkbox + nhãn đúng hậu quả. Lịch sử gấp gọn và tải khi mở.

**Căn cứ và mức kiểm:** Code InvoiceScreen; catalog gộp nút các state nên không phải bằng chứng chúng cùng hiện.

**Điều phải giữ:** Giữ hai dấu, settle và receipt-confirmed khác nhau; không tự gửi khi upload xong; retry giữ key.

<a id="g14"></a>
### G14 · Đánh giá hai chiều

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Chọn sao; Gửi/Sửa/Gỡ; Phản hồi; Báo cáo.

**Tối ưu đề xuất:** Nhãn Gửi đánh giá/Lưu chỉnh sửa/Gửi phản hồi cụ thể. Gỡ/Báo cáo phụ tách biệt, ảnh có tiến độ và lỗi; không thêm đánh giá một chạm tự gửi.

**Căn cứ và mức kiểm:** Danh mục báo cáo; cần kiểm quyền từng bên và trạng thái hiện tại trước đổi.

**Điều phải giữ:** Không mở đánh giá trước điều kiện hoàn tất; không sửa nội dung của người khác.

<a id="g15"></a>
### G15 · Danh sách và trình sửa hồ sơ cung cấp

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Tạo hồ sơ; Bật/tắt nhận việc; Công khai; Xác minh; Thêm/Lưu từng mục.

**Tối ưu đề xuất:** Nhóm menu theo nội dung; nhãn lưu theo đối tượng; trạng thái chưa lưu rõ. Công khai và nhận việc là hai điều khiển khác nghĩa, có giải thích kết quả.

**Căn cứ và mức kiểm:** Danh mục và source PartnerEditor; kiểm layout nhóm trước khi quyết định tab/cuộn.

**Điều phải giữ:** Không tự công khai vị trí/ảnh; không suy hồ sơ được xác minh từ trạng thái công khai.

<a id="g16"></a>
### G16 · Ảnh hồ sơ và xác minh

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Thêm ảnh; Lên/Xuống; Gỡ/Lưu; Chọn chứng từ; Gửi/Bổ sung.

**Tối ưu đề xuất:** Ảnh hiển thị thứ tự; Lên/Xuống bị khóa tại biên và có nhãn ảnh. Gửi hồ sơ xác minh riêng với lưu ảnh công khai; phản hồi tiến độ/lỗi cho từng ảnh.

**Căn cứ và mức kiểm:** Danh mục báo cáo và source liên quan; chưa test native lại lượt này.

**Điều phải giữ:** Chứng cứ riêng không vào gallery; không gỡ ảnh khi chỉ muốn đổi vị trí.

<a id="g17"></a>
### G17 · Cơ sở tham gia và đội ngũ

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Sử dụng hồ sơ; Mời; tab Thành viên/Lời mời/Đã rời/Quyền; Gửi lại; Thu hồi.

**Tối ưu đề xuất:** Tab gọn, chọn cơ sở có nhãn đang sử dụng. Mời chính ở danh sách phù hợp; gửi lại/thu hồi trên đúng lời mời, hiển thị trạng thái liên hệ.

**Căn cứ và mức kiểm:** Code TeamScreen có nhiều Button tab, đã có tìm kiếm/quyền dịch; giữ phần đang tốt.

**Điều phải giữ:** Không mời/gửi lại tự động; chỉ gửi tới thông tin chủ dự án đưa vào trong phạm vi kiểm local.

<a id="g18"></a>
### G18 · Phân quyền và bàn giao đội ngũ

**Ưu tiên:** Cao về an toàn thao tác · gói 4.

**Nút/điều khiển cần rà:** Công tắc quyền; Lưu quyền; Gỡ; Rời; Hủy.

**Tối ưu đề xuất:** Nhóm quyền dễ đọc và tóm tắt thay đổi trước lưu; giữ công tắc đã có. Gỡ/Rời có tên người/cơ sở + số việc bàn giao + Hủy dễ tìm.

**Căn cứ và mức kiểm:** Code TeamScreen đã dịch quyền và có preview bàn giao; tối ưu trình bày, không xây lại từ đầu.

**Điều phải giữ:** Không bỏ mật khẩu/lý do, kiểm nghĩa vụ, giới hạn người cấp; không auto-save quyền.

<a id="g19"></a>
### G19 · Ví và tạo yêu cầu tài chính

**Ưu tiên:** Cao về rõ nghĩa · gói 4.

**Nút/điều khiển cần rà:** Nạp; Rút; Ngân hàng; Gửi; Hủy yêu cầu.

**Tối ưu đề xuất:** Nút Gửi đổi theo đối tượng: Gửi yêu cầu nạp/rút/ngân hàng. Rút bị khóa có lý do và đường bổ sung ngân hàng nếu có quyền. Trình bày số tiền, tài khoản nhận trước xác nhận.

**Căn cứ và mức kiểm:** Code FinanceScreen: payout disabled khi thiếu bank/quyền; tổng quan ví đã có.

**Điều phải giữ:** Giữ re-auth, số dư, tiền giữ, đối chiếu; không coi gửi yêu cầu là đã chuyển tiền.

<a id="g20"></a>
### G20 · Lịch sử và chi tiết ví

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Bộ lọc; Dòng giao dịch; Xem thêm; Chứng cứ; Hủy; Đóng.

**Tối ưu đề xuất:** Số tiền/trạng thái/ngày làm chính; mã phụ sao chép. Bộ lọc gọn, giữ khi đóng chi tiết; chỉ hủy trạng thái cho phép; unknown có hướng đối chiếu.

**Căn cứ và mức kiểm:** Code FinanceScreen hiển thị ID/reference thô và nhiều Button lọc.

**Điều phải giữ:** Không gom dòng sổ cái khác nghĩa thành giao dịch đã hoàn tất; không xóa lịch sử.

<a id="g21"></a>
### G21 · Hội thoại và chat

**Ưu tiên:** Cao · gói 3.

**Nút/điều khiển cần rà:** Mở hội thoại; Gửi; Công việc; Gọi; tin cũ.

**Tối ưu đề xuất:** Giữ composer đáy đã có; nút Gửi không mất nháp khi lỗi. Tin cũ tải khi cần (D02); khi đọc lịch sử hiện dấu tin mới, không cuộn ép. Công việc/Gọi nằm ở ngữ cảnh gọn.

**Căn cứ và mức kiểm:** Code ConversationScreen đọc hết page, ScrollView map, onContentSizeChange scrollToEnd.

**Điều phải giữ:** Không đánh dấu mọi tin là đọc chỉ vì tải trang gần nhất; quyền và mất mạng giữ nguyên.

<a id="g22"></a>
### G22 · Cuộc gọi

**Ưu tiên:** Cần xác minh · gói 3/6.

**Nút/điều khiển cần rà:** Nhận; Từ chối; Micro; Kết thúc.

**Tối ưu đề xuất:** Kiểm bố cục hai đầu trước; Kết thúc tách biệt và nhãn rõ, Micro phản ánh trạng thái; xin quyền có cách phục hồi. Không thay media/provider trong đợt tối ưu nút.

**Căn cứ và mức kiểm:** B00-14 chưa có ảnh/native hai đầu; không kết luận đây là bug UI đã xác nhận.

**Điều phải giữ:** Không báo đạt âm thanh từ ảnh; kiểm trên môi trường được phép, giữ phần chưa có bằng chứng.

<a id="g23"></a>
### G23 · Thông báo và cài đặt

**Ưu tiên:** Vừa · gói 3.

**Nút/điều khiển cần rà:** Tất cả/Chưa đọc; Đọc tất cả; mở thông báo; công tắc; Lưu.

**Tối ưu đề xuất:** Tab gọn và dấu chọn rõ; báo lỗi mở đích bị hạn chế; Lưu cài đặt có phản hồi. Đọc tất cả có trạng thái đang xử lý, retry phần chưa xác nhận.

**Căn cứ và mức kiểm:** Code provider tải đủ trang; không kết luận sai rằng Đọc tất cả chỉ xử lý trang đầu.

**Điều phải giữ:** Giữ bốn công tắc độc lập; không nhập nhằng badge chat và thông báo; không hứa push iOS thật.

<a id="g24"></a>
### G24 · Hỗ trợ thông thường và bị hạn chế

**Ưu tiên:** Vừa · gói 4.

**Nút/điều khiển cần rà:** Tạo báo cáo; Gửi; Bổ sung; Nội dung liên quan; Tải lại; Đăng xuất.

**Tối ưu đề xuất:** Gửi báo cáo/Bổ sung báo cáo đúng đối tượng; ngữ cảnh việc/hóa đơn thấy trước gửi. Tải lại phụ, trạng thái chờ xử lý rõ. Khu bị hạn chế giữ đường hỗ trợ và đăng xuất.

**Căn cứ và mức kiểm:** Danh mục báo cáo; liên kết support từ JobDetail/Invoice đã đọc.

**Điều phải giữ:** Không coi đóng hỗ trợ là đã thanh toán; ảnh riêng và quyền tài nguyên liên quan giữ nguyên.

<a id="g25"></a>
### G25 · MFA quản trị

**Ưu tiên:** Cao về an toàn thao tác · gói 5.

**Nút/điều khiển cần rà:** Xác thực; Mã dự phòng; Tạo mã; Thay thiết bị; Đặt lại MFA; Ẩn/Đóng.

**Tối ưu đề xuất:** Tách đăng nhập MFA và quản lý MFA; thay thiết bị/đặt lại là thao tác riêng có đối tượng/lý do. Mã dự phòng có điểm Ẩn rõ, không vào ảnh tự động.

**Căn cứ và mức kiểm:** Danh mục B00-14; cần kiểm native nhánh nhạy cảm bằng xác nhận không lộ mã.

**Điều phải giữ:** Không bỏ MFA/re-auth; không cho tự reset sai quyền; không chụp secret.

<a id="g26"></a>
### G26 · Hàng đợi quản trị và bộ lọc

**Ưu tiên:** Cao · gói 5.

**Nút/điều khiển cần rà:** Menu khu quản trị; Tìm/lọc; dòng kết quả; Tải lại/Xem thêm; Khóa phiên.

**Tối ưu đề xuất:** Nhóm menu gọn, lọc có chip/xóa; thông tin nhận diện thay nút UUID dài nếu contract có (D04). Khóa phiên ở vị trí ổn định, không lẫn nút xử lý từng bản ghi.

**Căn cứ và mức kiểm:** Code P2Desk, BackofficePanel, AdminFinance; nhiều loại hàng đợi dùng chung pattern.

**Điều phải giữ:** Quyền quyết định nhóm; không thêm bulk approve/chọn tất cả vì nhanh hơn.

<a id="g27"></a>
### G27 · Xử lý tài khoản, hồ sơ và danh mục

**Ưu tiên:** Vừa · gói 5.

**Nút/điều khiển cần rà:** Đình chỉ/khôi phục; cảnh báo; dừng nhận việc; lưu danh mục; Quay lại.

**Tối ưu đề xuất:** Tên hành động cụ thể, hiển thị đối tượng và hậu quả; thao tác thay trạng thái tách khỏi chỉnh thông tin; quay lại giữ bộ lọc.

**Căn cứ và mức kiểm:** Danh mục báo cáo + AdminDesk/P2Desk; chưa thử mọi mutation ở lượt lập kế hoạch.

**Điều phải giữ:** Không coi dừng nhận việc là xóa việc cũ; không gộp đình chỉ và xóa tài khoản.

<a id="g28"></a>
### G28 · Hỗ trợ, xác minh và kiểm duyệt

**Ưu tiên:** Cao · gói 5.

**Nút/điều khiển cần rà:** Chờ bổ sung/giải quyết/đóng; Ghi chú nội bộ; Hoàn tất thay; duyệt/từ chối; ẩn/hiện đánh giá.

**Tối ưu đề xuất:** Nhóm quyết định sau khối chứng cứ; một nút gửi quyết định có nhãn rõ. Ghi chú nội bộ tách phản hồi; Hoàn tất thay trong khối tài chính có điều kiện riêng.

**Căn cứ và mức kiểm:** Danh mục và AdminDesk; cần native với admin thiếu finance.review.

**Điều phải giữ:** Không giảm đối chiếu, lý do, MFA; ẩn đánh giá không sửa nội dung người viết.

<a id="g29"></a>
### G29 · Quản trị tài chính và tra cứu

**Ưu tiên:** Cao · gói 5.

**Nút/điều khiển cần rà:** Duyệt/Từ chối; Đang chuyển/Thành công/Thất bại; Chứng cứ; Mô phỏng; lọc ngày; Tìm/Xem thêm.

**Tối ưu đề xuất:** Đặt tiền/đối tượng/trạng thái trước hành động; trạng thái chưa rõ có lời giải thích. Nút mô phỏng giữ nhãn local riêng. Tra cứu có thời gian/đối tượng, mã kỹ thuật sao chép; số liệu có khoảng thời gian.

**Căn cứ và mức kiểm:** Code AdminFinance/BackofficePanel; cần đo query chậm trước đề xuất index.

**Điều phải giữ:** Không chuyển tiền lần hai khi unknown; không biến màn tra cứu thành quyền ghi; không in payload riêng vào nhật ký công khai.

<a id="g30"></a>
### G30 · Khôi phục, xóa và quyền quản trị

**Ưu tiên:** Cao · gói 5.

**Nút/điều khiển cần rà:** Duyệt/Từ chối/Yêu cầu chứng cứ; nghĩa vụ/Point; công tắc quyền; Lưu quyền; Quay lại.

**Tối ưu đề xuất:** Quyền có tên dịch + giải thích, mã chỉ tra cứu; tóm tắt quyền thay đổi, người nhận trước lưu. Khôi phục/xóa có kết quả dự kiến và điều kiện còn thiếu rõ ràng.

**Căn cứ và mức kiểm:** Code BackofficePanel dùng mã quyền trong Button; ảnh admin-grants-detail là bằng chứng trình bày.

**Điều phải giữ:** Không cấp quyền ngoài người cấp, không tự sửa quyền; không suy duyệt khôi phục là cấp tất cả quyền cũ.

## 2. Ánh xạ đủ 135 mục báo cáo

“Cả hai” = có ảnh Android và iOS cũ; “Android”/“iOS” = mới có một phía; “Chưa có” = cần bổ sung bằng chứng. Một nút chưa có trong danh mục vẫn phải ghi thêm nếu tìm thấy khi rà code/native.

| Mục báo cáo / nguồn code | Vai | Nút được ghi trong B00-14 | Ảnh cũ | Nhóm đề xuất |
|---|---|---|---|---|
| **home** — Trang chủ và tìm dịch vụ · [code](../../../apps/mobile/src/features/search/screens/SearchScreen.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Chọn dịch vụ; Chọn địa điểm; Kính lúp; Bộ lọc; Avatar | Cả hai | [G01](#g01) |
| **service-picker** — Chọn ngành, nhóm và kỹ năng · [code](../../../apps/mobile/src/features/search/screens/SearchScreen.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Ngành / nhóm; Kỹ năng / tìm theo nhóm / tất cả; Hủy | Cả hai | [G01](#g01) |
| **location-picker** — Chọn địa điểm · [code](../../../apps/mobile/src/features/location/components/LocationField.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Tìm địa chỉ; Vị trí hiện tại; Bản đồ; Xác nhận; Hủy | Cả hai | [G02](#g02) |
| **search-filters** — Bộ lọc tìm dịch vụ · [code](../../../apps/mobile/src/features/search/screens/SearchScreen.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Bán kính; Hình thức; Áp dụng | Cả hai | [G01](#g01) |
| **search-results** — Kết quả tìm dịch vụ · [code](../../../apps/mobile/src/features/search/screens/SearchScreen.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Thẻ người cung cấp; Khoảng cách / đánh giá / đề xuất; Bản đồ; Xem thêm | Cả hai | [G01](#g01) |
| **search-map** — Kết quả trên bản đồ · [code](../../../apps/mobile/src/features/search/components/ResultsMap.native.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Ghim / cụm; Danh sách | Cả hai | [G01](#g01) |
| **catalog-category** — Danh mục theo ngành · [code](../../../apps/mobile/src/features/catalog/screens/CatalogScreen.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Mục danh mục; Mũi tên | Chưa có | [G03](#g03) |
| **public-profile** — Hồ sơ công khai người cung cấp · [code](../../../apps/mobile/src/features/partners/screens/PartnerProfileScreen.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Gửi yêu cầu; Liên hệ; Ảnh / đánh giá | Cả hai | [G04](#g04) |
| **job-create** — Gửi yêu cầu dịch vụ · [code](../../../apps/mobile/src/features/jobs/screens/JobCreateScreen.tsx) | Khách thuê dịch vụ | Kỹ năng; Hình thức / địa điểm; Làm ngay / đặt lịch; Gửi yêu cầu | Cả hai | [G04](#g04) |
| **login** — Đăng nhập · [code](../../../apps/mobile/src/features/auth/screens/AccountScreen.tsx) | Khách chưa đăng nhập | Đăng nhập; Đăng ký; OTP / đặt lại mật khẩu; Khôi phục tài khoản | Cả hai | [G05](#g05) |
| **register** — Đăng ký tài khoản · [code](../../../apps/mobile/src/features/auth/screens/AccountScreen.tsx) | Khách chưa đăng nhập | Đăng ký; Đã có tài khoản | Cả hai | [G05](#g05) |
| **account** — Tài khoản và Point · [code](../../../apps/mobile/src/features/auth/screens/AccountScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Vai khách / chọn hồ sơ; Thông tin / địa chỉ / phiên; Bảo mật; Ngôn ngữ; Đăng xuất | Cả hai | [G06](#g06) |
| **profile** — Thông tin cá nhân · [code](../../../apps/mobile/src/features/accounts/screens/ProfileScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu; Ngôn ngữ; Quay lại | Cả hai | [G06](#g06) |
| **sessions** — Các phiên đăng nhập · [code](../../../apps/mobile/src/features/accounts/screens/SessionsScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Thu hồi phiên; Thu hồi các phiên khác; Tải lại | Cả hai | [G07](#g07) |
| **addresses** — Sổ địa chỉ · [code](../../../apps/mobile/src/features/accounts/screens/AddressesScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Thêm địa chỉ; Sửa; Đặt mặc định; Lưu trữ | Cả hai | [G07](#g07) |
| **address-form** — Thêm hoặc sửa địa chỉ · [code](../../../apps/mobile/src/features/accounts/screens/AddressesScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Chọn địa điểm; Địa chỉ mặc định; Lưu; Hủy | iOS | [G07](#g07) |
| **verify-contact** — Xác minh liên hệ · [code](../../../apps/mobile/src/features/organizations/screens/VerifyContactScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Gửi mã; Xác nhận mã; Gửi lại | Cả hai | [G08](#g08) |
| **security** — Bảo mật tài khoản · [code](../../../apps/mobile/src/features/account-security/screens/SecurityScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Đổi mật khẩu; Đổi email / điện thoại; Yêu cầu xóa; Khôi phục | Cả hai | [G08](#g08) |
| **security-anonymous** — Đăng nhập OTP và đặt lại mật khẩu · [code](../../../apps/mobile/src/features/account-security/screens/SecurityScreen.tsx) | Khách chưa đăng nhập | Gửi mã; Xác nhận | Android | [G08](#g08) |
| **recovery** — Yêu cầu khôi phục tài khoản · [code](../../../apps/mobile/src/features/account-security/screens/RecoveryScreen.tsx) | Khách chưa đăng nhập, Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Gửi yêu cầu; Tra cứu / bổ sung | Android | [G08](#g08) |
| **customer-jobs** — Danh sách công việc của khách · [code](../../../apps/mobile/src/features/jobs/screens/JobsScreen.tsx) | Khách thuê dịch vụ | Chi tiết; Lịch; Tải lại / kéo làm mới | Cả hai | [G09](#g09) |
| **calendar** — Lịch công việc · [code](../../../apps/mobile/src/features/jobs/components/JobCalendar.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Chọn ngày; Công việc; Danh sách | iOS | [G09](#g09) |
| **customer-job-requested** — Chi tiết công việc · Chờ tiếp nhận · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Rút yêu cầu; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-job-accepted** — Chi tiết công việc · Đã nhận việc · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-job-draft** — Chi tiết công việc · Hóa đơn nháp · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-invoice-draft** — Hóa đơn nháp · khách chưa được xem · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Khách thuê dịch vụ | Tải lại; Quay lại | Cả hai | [G12](#g12) |
| **customer-job-sent** — Chi tiết công việc · Hóa đơn đã gửi · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-invoice-sent** — Hóa đơn · Hóa đơn đã gửi · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Khách thuê dịch vụ | Yêu cầu sửa; Xác nhận hóa đơn; Báo đã thanh toán; Đánh giá | Cả hai | [G12](#g12) |
| **customer-job-revision_requested** — Chi tiết công việc · Khách yêu cầu sửa hóa đơn · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-invoice-revision_requested** — Hóa đơn · Khách yêu cầu sửa hóa đơn · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Khách thuê dịch vụ | Yêu cầu sửa; Xác nhận hóa đơn; Báo đã thanh toán; Đánh giá | iOS | [G12](#g12) |
| **customer-job-locked** — Chi tiết công việc · Hóa đơn đã xác nhận · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-invoice-locked** — Hóa đơn · Hóa đơn đã xác nhận · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Khách thuê dịch vụ | Yêu cầu sửa; Xác nhận hóa đơn; Báo đã thanh toán; Đánh giá | Cả hai | [G12](#g12) |
| **customer-job-payment_reported** — Chi tiết công việc · Khách báo đã thanh toán · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-invoice-payment_reported** — Hóa đơn · Khách báo đã thanh toán · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Khách thuê dịch vụ | Yêu cầu sửa; Xác nhận hóa đơn; Báo đã thanh toán; Đánh giá | Cả hai | [G12](#g12) |
| **customer-job-completed** — Chi tiết công việc · Đã hoàn tất · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-invoice-completed** — Hóa đơn · Đã hoàn tất · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Khách thuê dịch vụ | Yêu cầu sửa; Xác nhận hóa đơn; Báo đã thanh toán; Đánh giá | Cả hai | [G12](#g12) |
| **customer-job-admin_completed** — Chi tiết công việc · Quản trị hoàn tất thay · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-invoice-admin_completed** — Hóa đơn · Quản trị hoàn tất thay · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Khách thuê dịch vụ | Yêu cầu sửa; Xác nhận hóa đơn; Báo đã thanh toán; Đánh giá | iOS | [G12](#g12) |
| **customer-job-declined** — Chi tiết công việc · Người cung cấp từ chối · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Hỗ trợ | iOS | [G10](#g10) |
| **customer-job-withdrawn** — Chi tiết công việc · Khách rút yêu cầu · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Hỗ trợ | iOS | [G10](#g10) |
| **customer-job-stopped** — Chi tiết công việc · Công việc đã dừng · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-job-rescheduled** — Chi tiết công việc · Đã đổi lịch · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G10](#g10) |
| **customer-job-assigned** — Chi tiết công việc · Đã phân công · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Khách thuê dịch vụ | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G10](#g10) |
| **owner-job-requested** — Chi tiết công việc · Chờ tiếp nhận · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Nhận việc; Từ chối; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-job-accepted** — Chi tiết công việc · Đã nhận việc · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Đổi lịch; Dừng việc; Phân công; Hóa đơn; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-job-draft** — Chi tiết công việc · Hóa đơn nháp · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-invoice-draft** — Hóa đơn · Hóa đơn nháp · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu nháp; Gửi hóa đơn; Xác nhận nhận tiền / hoàn tất; Xác nhận nhận tiền sau admin; Hỗ trợ | Cả hai | [G13](#g13) |
| **owner-job-sent** — Chi tiết công việc · Hóa đơn đã gửi · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-invoice-sent** — Hóa đơn · Hóa đơn đã gửi · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu nháp; Gửi hóa đơn; Xác nhận nhận tiền / hoàn tất; Xác nhận nhận tiền sau admin; Hỗ trợ | Cả hai | [G13](#g13) |
| **owner-job-revision_requested** — Chi tiết công việc · Khách yêu cầu sửa hóa đơn · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Đổi lịch; Dừng việc; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-invoice-revision_requested** — Hóa đơn · Khách yêu cầu sửa hóa đơn · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu nháp; Gửi hóa đơn; Xác nhận nhận tiền / hoàn tất; Xác nhận nhận tiền sau admin; Hỗ trợ | Cả hai | [G13](#g13) |
| **owner-job-locked** — Chi tiết công việc · Hóa đơn đã xác nhận · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-invoice-locked** — Hóa đơn · Hóa đơn đã xác nhận · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu nháp; Gửi hóa đơn; Xác nhận nhận tiền / hoàn tất; Xác nhận nhận tiền sau admin; Hỗ trợ | Cả hai | [G13](#g13) |
| **owner-job-payment_reported** — Chi tiết công việc · Khách báo đã thanh toán · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-invoice-payment_reported** — Hóa đơn · Khách báo đã thanh toán · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu nháp; Gửi hóa đơn; Xác nhận nhận tiền / hoàn tất; Xác nhận nhận tiền sau admin; Hỗ trợ | Cả hai | [G13](#g13) |
| **owner-job-completed** — Chi tiết công việc · Đã hoàn tất · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-invoice-completed** — Hóa đơn · Đã hoàn tất · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu nháp; Gửi hóa đơn; Xác nhận nhận tiền / hoàn tất; Xác nhận nhận tiền sau admin; Hỗ trợ | Cả hai | [G13](#g13) |
| **owner-job-admin_completed** — Chi tiết công việc · Quản trị hoàn tất thay · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-invoice-admin_completed** — Hóa đơn · Quản trị hoàn tất thay · [code](../../../apps/mobile/src/features/invoices/screens/InvoiceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Lưu nháp; Gửi hóa đơn; Xác nhận nhận tiền / hoàn tất; Xác nhận nhận tiền sau admin; Hỗ trợ | Cả hai | [G13](#g13) |
| **owner-job-declined** — Chi tiết công việc · Người cung cấp từ chối · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-job-withdrawn** — Chi tiết công việc · Khách rút yêu cầu · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-job-stopped** — Chi tiết công việc · Công việc đã dừng · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-job-rescheduled** — Chi tiết công việc · Đã đổi lịch · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Đổi lịch; Dừng việc; Phân công; Hóa đơn; Hỗ trợ | Cả hai | [G11](#g11) |
| **owner-job-assigned** — Chi tiết công việc · Đã phân công · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Trao đổi; Đổi lịch; Dừng việc; Phân công; Hóa đơn; Hỗ trợ | Cả hai | [G11](#g11) |
| **customer-reviews** — Đánh giá sau công việc · [code](../../../apps/mobile/src/features/reviews/screens/ReviewsScreen.tsx) | Khách thuê dịch vụ | Số sao / nội dung / ảnh; Gửi / sửa / gỡ; Phản hồi; Báo cáo | Cả hai | [G14](#g14) |
| **owner-reviews** — Đánh giá sau công việc · [code](../../../apps/mobile/src/features/reviews/screens/ReviewsScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Số sao / nội dung / ảnh; Gửi / sửa / gỡ; Phản hồi; Báo cáo | Cả hai | [G14](#g14) |
| **partners** — Các hồ sơ cung cấp của tôi · [code](../../../apps/mobile/src/features/partners/screens/PartnersScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Tên hồ sơ; Tạo hồ sơ; Ví | Cả hai | [G15](#g15) |
| **partner-create** — Tạo hồ sơ cung cấp · [code](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp | Loại hồ sơ; Tạo | Cả hai | [G15](#g15) |
| **partner-editor** — Quản lý hồ sơ cung cấp · [code](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Bật / tắt nhận việc; Công khai; Xác minh; Các mục thông tin | Cả hai | [G15](#g15) |
| **partner-profile** — Thông tin hồ sơ · [code](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Lưu thông tin | Cả hai | [G15](#g15) |
| **partner-skills** — Dịch vụ và kỹ năng · [code](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Thêm kỹ năng; Lưu kỹ năng | Cả hai | [G15](#g15) |
| **partner-areas** — Vùng phục vụ · [code](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Thêm vùng; Lưu vùng | Cả hai | [G15](#g15) |
| **partner-locations** — Địa điểm cơ sở · [code](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Thêm địa điểm; Công khai; Lưu địa điểm | Cả hai | [G15](#g15) |
| **partner-gallery** — Ảnh hồ sơ · [code](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Thêm ảnh; Lên / xuống; Gỡ / lưu | Cả hai | [G16](#g16) |
| **verification** — Nộp và theo dõi xác minh · [code](../../../apps/mobile/src/features/verification/screens/VerificationScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Chọn loại / khai báo; Ảnh chứng từ; Gửi / bổ sung | Cả hai | [G16](#g16) |
| **organizations** — Tổ chức và lời mời · [code](../../../apps/mobile/src/features/organizations/screens/OrganizationsScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Sử dụng hồ sơ; Quản lý đội ngũ; Chấp nhận lời mời; Rời đội | Cả hai | [G17](#g17) |
| **team-members** — Thành viên · [code](../../../apps/mobile/src/features/organizations/screens/TeamScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Mời thành viên; Gỡ thành viên; Các tab | Cả hai | [G17](#g17) |
| **team-invites** — Lời mời · [code](../../../apps/mobile/src/features/organizations/screens/TeamScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Gửi lại; Thu hồi; Mời thành viên | Cả hai | [G17](#g17) |
| **team-left** — Thành viên đã rời · [code](../../../apps/mobile/src/features/organizations/screens/TeamScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Tìm thành viên; Các tab | Cả hai | [G17](#g17) |
| **team-permissions** — Phân quyền · [code](../../../apps/mobile/src/features/organizations/screens/TeamScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Sửa quyền; Tìm thành viên | Cả hai | [G17](#g17) |
| **team-invite** — Mời thành viên · [code](../../../apps/mobile/src/features/organizations/screens/TeamScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Liên hệ; Tạo lời mời; Hủy | Cả hai | [G17](#g17) |
| **team-grants** — Sửa quyền thành viên · [code](../../../apps/mobile/src/features/organizations/screens/TeamScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Công tắc quyền; Lý do / mật khẩu; Lưu quyền; Hủy | Cả hai | [G18](#g18) |
| **team-remove** — Bàn giao và gỡ thành viên · [code](../../../apps/mobile/src/features/organizations/screens/TeamScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Lý do; Xác nhận gỡ; Hủy | Cả hai | [G18](#g18) |
| **team-leave** — Rời đội và xem bàn giao · [code](../../../apps/mobile/src/features/organizations/screens/OrganizationsScreen.tsx) | Nhân viên, Nhân viên có quyền quản lý | Xác nhận rời; Hủy | Cả hai | [G18](#g18) |
| **wallet** — Tổng quan ví · [code](../../../apps/mobile/src/features/finance/screens/FinanceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Nạp; Rút; Ngân hàng; Lịch sử | Cả hai | [G19](#g19) |
| **bank** — Tài khoản ngân hàng · [code](../../../apps/mobile/src/features/finance/screens/FinanceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Gửi yêu cầu; Hủy yêu cầu | Cả hai | [G19](#g19) |
| **topup** — Yêu cầu nạp ví · [code](../../../apps/mobile/src/features/finance/screens/FinanceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Ảnh chứng cứ; Gửi | Cả hai | [G19](#g19) |
| **payout** — Yêu cầu rút tiền · [code](../../../apps/mobile/src/features/finance/screens/FinanceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Đã kiểm thông tin; Gửi | Cả hai | [G19](#g19) |
| **finance-history** — Lịch sử ví · [code](../../../apps/mobile/src/features/finance/screens/FinanceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Bộ lọc; Dòng giao dịch; Xem thêm | Cả hai | [G20](#g20) |
| **finance-detail** — Chi tiết giao dịch · [code](../../../apps/mobile/src/features/finance/screens/FinanceScreen.tsx) | Chủ hồ sơ cung cấp, Nhân viên có quyền quản lý | Ảnh chứng cứ; Hủy; Đóng | Android | [G20](#g20) |
| **conversations** — Danh sách hội thoại · [code](../../../apps/mobile/src/features/chat/screens/ConversationsScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Hội thoại; Kéo làm mới | Cả hai | [G21](#g21) |
| **conversation** — Trò chuyện theo công việc · [code](../../../apps/mobile/src/features/chat/screens/ConversationScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Gửi; Công việc; Gọi; Tin cũ | iOS | [G21](#g21) |
| **call** — Cuộc gọi trong ứng dụng · [code](../../../apps/mobile/src/features/calls) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Nhận / từ chối; Micro; Kết thúc | Chưa có | [G22](#g22) |
| **notifications** — Hộp thông báo · [code](../../../apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Tất cả / chưa đọc; Đọc tất cả; Thông báo | Cả hai | [G23](#g23) |
| **notification-settings** — Cài đặt thông báo · [code](../../../apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Bốn công tắc; Lưu; Đăng ký thiết bị | Cả hai | [G23](#g23) |
| **support** — Hỗ trợ và báo cáo · [code](../../../apps/mobile/src/features/support/screens/SupportScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Tạo báo cáo; Báo cáo đã gửi; Tải lại | Cả hai | [G24](#g24) |
| **support-create** — Tạo báo cáo hỗ trợ · [code](../../../apps/mobile/src/features/support/screens/SupportScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Gửi báo cáo; Ảnh chứng cứ | iOS | [G24](#g24) |
| **support-detail** — Theo dõi và bổ sung báo cáo · [code](../../../apps/mobile/src/features/support/screens/SupportScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Bổ sung; Nội dung liên quan | iOS | [G24](#g24) |
| **restricted-support** — Khu hỗ trợ tài khoản bị khóa · [code](../../../apps/mobile/src/features/support/screens/SupportScreen.tsx) | Tài khoản bị hạn chế | Hỗ trợ; Đăng xuất | Cả hai | [G24](#g24) |
| **admin-mfa** — Xác thực quản trị · [code](../../../apps/mobile/src/features/admin/screens/AdminScreen.tsx) | Quản trị viên | Xác thực; Mã dự phòng; Đăng xuất | Cả hai | [G25](#g25) |
| **admin-users** — Tài khoản · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-users-detail** — Chi tiết · Tài khoản · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Đình chỉ toàn bộ / khôi phục; Lý do / lưu hoặc thử lại; Đóng / quay lại | Cả hai | [G27](#g27) |
| **admin-partners** — Người cung cấp · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Android | [G26](#g26) |
| **admin-partners-detail** — Chi tiết · Người cung cấp · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Cảnh báo; Dừng nhận việc mới / khôi phục; Lý do / lưu hoặc thử lại; Đóng / quay lại | Android | [G27](#g27) |
| **admin-categories** — Ngành và nhóm · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-categories-detail** — Chi tiết · Ngành và nhóm · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tên / thứ tự / trạng thái / lưu; Lý do / lưu hoặc thử lại; Đóng / quay lại | Cả hai | [G27](#g27) |
| **admin-skills** — Kỹ năng · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-skills-detail** — Chi tiết · Kỹ năng · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Thông tin kỹ năng / trạng thái / lưu; Lý do / lưu hoặc thử lại; Đóng / quay lại | Cả hai | [G27](#g27) |
| **admin-reports** — Hàng đợi hỗ trợ · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-reports-detail** — Chi tiết · Hàng đợi hỗ trợ · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Đang xem xét / chờ bổ sung / giải quyết / đóng; Ghi chú nội bộ; Hoàn tất thay; Lý do / lưu hoặc thử lại; Đóng / quay lại | Cả hai | [G28](#g28) |
| **admin-verifications** — Xét xác minh · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-verifications-detail** — Chi tiết · Xét xác minh · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Yêu cầu bổ sung / từ chối / duyệt; Đã đối chiếu chứng cứ; Lý do / lưu hoặc thử lại; Đóng / quay lại | Cả hai | [G28](#g28) |
| **admin-reviews** — Kiểm duyệt đánh giá · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-reviews-detail** — Chi tiết · Kiểm duyệt đánh giá · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Giữ / ẩn / hiện lại; Lý do / lưu hoặc thử lại; Đóng / quay lại | Cả hai | [G28](#g28) |
| **admin-audit** — Nhật ký quản trị · [code](../../../apps/mobile/src/features/admin/screens/AdminDesk.tsx) | Quản trị viên | Mã tài nguyên; Tìm; Xem thêm | Cả hai | [G29](#g29) |
| **admin-finance** — Xét giao dịch ví · [code](../../../apps/mobile/src/features/finance/screens/AdminFinance.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-finance-detail** — Chi tiết · Xét giao dịch ví · [code](../../../apps/mobile/src/features/finance/screens/AdminFinance.tsx) | Quản trị viên | Nạp / rút / tài khoản ngân hàng; Chứng cứ; Duyệt / từ chối; Đang chuyển / thành công / thất bại đã kiểm; Mô phỏng ngân hàng; Lý do / lưu hoặc thử lại; Đóng / quay lại | Android | [G29](#g29) |
| **admin-invoices** — Tra cứu hóa đơn · [code](../../../apps/mobile/src/features/admin/screens/P2Desk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-invoices-detail** — Chi tiết · Tra cứu hóa đơn · [code](../../../apps/mobile/src/features/backoffice/BackofficePanel.tsx) | Quản trị viên | Quay lại; Tải lại | Android | [G29](#g29) |
| **admin-metrics** — Tổng quan vận hành · [code](../../../apps/mobile/src/features/backoffice/BackofficePanel.tsx) | Quản trị viên | Từ ngày / đến ngày; Tải lại | Cả hai | [G29](#g29) |
| **admin-jobs** — Tra cứu công việc · [code](../../../apps/mobile/src/features/admin/screens/P2Desk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-jobs-detail** — Chi tiết · Tra cứu công việc · [code](../../../apps/mobile/src/features/backoffice/BackofficePanel.tsx) | Quản trị viên | Quay lại; Tải lại | Android | [G29](#g29) |
| **admin-recovery** — Khôi phục tài khoản · [code](../../../apps/mobile/src/features/admin/screens/RecoveryPanel.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-recovery-detail** — Chi tiết · Khôi phục tài khoản · [code](../../../apps/mobile/src/features/admin/screens/RecoveryPanel.tsx) | Quản trị viên | Duyệt / từ chối / yêu cầu chứng cứ; Lý do / lưu hoặc thử lại; Đóng / quay lại | Android | [G30](#g30) |
| **admin-deletion** — Yêu cầu xóa tài khoản · [code](../../../apps/mobile/src/features/admin/screens/RecoveryPanel.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Cả hai | [G26](#g26) |
| **admin-deletion-detail** — Chi tiết · Yêu cầu xóa tài khoản · [code](../../../apps/mobile/src/features/admin/screens/RecoveryPanel.tsx) | Quản trị viên | Nghĩa vụ / Point; Duyệt / từ chối; Lý do / lưu hoặc thử lại; Đóng / quay lại | Android | [G30](#g30) |
| **admin-grants** — Cấp quyền quản trị · [code](../../../apps/mobile/src/features/admin/screens/P2Desk.tsx) | Quản trị viên | Tìm / lọc; Dòng kết quả; Tải lại / xem thêm; Khóa phiên | Android | [G26](#g26) |
| **admin-grants-detail** — Chi tiết · Cấp quyền quản trị · [code](../../../apps/mobile/src/features/admin/screens/P2Desk.tsx) | Quản trị viên | Các quyền; Lý do / lưu quyền; Lý do / lưu hoặc thử lại; Đóng / quay lại | Android | [G30](#g30) |
| **employee-account** — Tài khoản nhân viên · [code](../../../apps/mobile/src/features/auth/screens/AccountScreen.tsx) | Nhân viên, Nhân viên có quyền quản lý | Chọn hồ sơ; Công việc | Cả hai | [G06](#g06) |
| **employee-organizations** — Các cơ sở nhân viên tham gia · [code](../../../apps/mobile/src/features/organizations/screens/OrganizationsScreen.tsx) | Nhân viên, Nhân viên có quyền quản lý | Sử dụng hồ sơ; Rời đội | Cả hai | [G17](#g17) |
| **employee-job** — Công việc được phân công · [code](../../../apps/mobile/src/features/jobs/screens/JobDetailScreen.tsx) | Nhân viên, Nhân viên có quyền quản lý | Hóa đơn; Liên hệ / tin nhắn | Cả hai | [G11](#g11) |
| **owner-account** — Tài khoản chủ hồ sơ · [code](../../../apps/mobile/src/features/auth/screens/AccountScreen.tsx) | Chủ hồ sơ cung cấp | Cung cấp dịch vụ; Đội ngũ | Cả hai | [G06](#g06) |
| **security-identity** — Đổi email / điện thoại · [code](../../../apps/mobile/src/features/account-security/screens/SecurityScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Gửi mã; Xác nhận | Android | [G08](#g08) |
| **security-delete** — Yêu cầu xóa tài khoản · [code](../../../apps/mobile/src/features/account-security/screens/SecurityScreen.tsx) | Khách thuê dịch vụ, Chủ hồ sơ cung cấp, Nhân viên, Nhân viên có quyền quản lý | Kiểm nghĩa vụ; Đồng ý mất Point; Yêu cầu xóa | Android | [G08](#g08) |
| **admin-security** — Bảo mật MFA của quản trị · [code](../../../apps/mobile/src/features/admin/screens/MfaSecurity.tsx) | Quản trị viên | Tạo mã dự phòng; Thay thiết bị xác thực; Tải tài khoản / đặt lại MFA; Ẩn / đóng | Cả hai | [G25](#g25) |

## 3. Phiếu kiểm từng nút khi triển khai

Ghi một dòng cho mỗi nút/điều khiển và mỗi điều kiện làm đổi hành vi; không chỉ ghi “màn đã test”. Dữ liệu này sẽ bổ sung vào catalog báo cáo, không cần tạo bảng tính ngoài repo.

| Trường | Giá trị cần ghi |
|---|---|
| Nhận diện | screen key, source, testID hoặc nhãn trợ năng, nhãn VI/EN/JA |
| Điều kiện | actor/vai, hồ sơ đang chọn, quyền thực tế, state/version bản ghi |
| Trước thay đổi | Hiện/ẩn/khóa, lý do khóa, vị trí, thao tác bấm, số lần cuộn |
| Quyết định | Giữ / đổi nhãn / đổi vị trí / đổi kiểu / gom nhóm / sửa điều kiện trình bày; giải thích vì sao |
| Sau bấm | Mở màn/form nào hoặc request nào; loading, success, error; Back về đâu |
| An toàn dữ liệu | Quyền server, expected_version, idempotency, nháp khi lỗi, đổi account/scope |
| Bằng chứng | Nền tảng/thiết bị, ngày, tập dữ liệu dvqb_local, ảnh trước/sau, kết quả thao tác và phần chưa kiểm |

Không dùng nhãn “không cần sửa” thay “chưa rà”; không hứa tối ưu mọi màn bằng cách giảm đồng loạt số nút. Có màn nên giữ nguyên, chỉ thêm giải thích hoặc kiểm hồi quy.
