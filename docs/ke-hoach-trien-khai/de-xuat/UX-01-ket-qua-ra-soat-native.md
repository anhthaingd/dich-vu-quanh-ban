# UX-01 — Kết quả rà soát native và điều chỉnh mức chắc chắn

> Lịch sử audit trước UX-01. 14 ảnh cũ đã xóa ngày 02/11 theo yêu cầu; giữ nguyên kết quả/nhật ký lịch sử. Giao diện hiện tại và lỗi đã sửa: [B00-14](../bao-cao/B00-14-bao-cao-man-hinh.html), [B00-15](../bao-cao/B00-15-toi-uu-trai-nghiem.md).
Ngày kiểm: **31/10–01/11/2026**, múi giờ Asia/Tokyo. Trạng thái: **đã ghi nhận kết quả lượt kiểm này; audit toàn bộ vẫn chưa hoàn tất và chưa đủ điều kiện chốt toàn bộ kế hoạch sửa**. Không triển khai thay đổi giao diện/API trong đợt audit này.

[Bảng lọc từng mô tả nút](../bao-cao/UX-01-kiem-nut-native.html) · [Kế hoạch](UX-01-toi-uu-luong-va-nut.md) · [Danh mục đề xuất](UX-01-danh-muc-man-va-nut.md) · [Nhật ký native đã bỏ thông tin xác thực](../bao-cao/bang-chung/UX-01/native-events.json).

## 1. Kết luận hiện tại

Có thể xác nhận một số bất tiện cụ thể bằng thao tác trên app. **Chưa thể nói đã kiểm hết mọi nút của cả hai nền tảng hoặc chốt mọi đề xuất tối ưu.** Bảng lọc giữ trạng thái chưa kiểm ở từng mô tả; không lấy số ảnh, số lần bấm hoặc số route làm tỷ lệ hoàn tất.

Phân biệt bốn kết luận:

| Kết luận | Khi nào được dùng | Cách xử lý trong kế hoạch |
|---|---|---|
| Bất tiện tái hiện | Có bước bấm, điều kiện và kết quả native | Đề xuất sửa đúng điểm đã thấy; vẫn chờ duyệt triển khai |
| Đang hoạt động đúng trong ca đã thử | Có kết quả UI; thao tác ghi quan trọng đối chiếu thêm DB | Giữ nghiệp vụ; chỉ cân nhắc bố cục/nhãn nếu có lý do |
| Đề xuất thiết kế | Có quan sát bố cục nhưng chưa thử phương án thay thế | Đưa phương án thử và tiêu chí đánh giá; không gọi là bug |
| Chưa đủ bằng chứng | Chưa bấm, mới mở form, thiếu quyền/trạng thái hoặc lỗi môi trường | Giữ chưa kiểm; không chốt xóa/gộp/chuyển nút |

## 2. Môi trường và dữ liệu thật sự đã dùng

- Android Emulator `DVQB_API_36`, Android 16; iOS Simulator iPhone 18 Pro, iOS 27. Đây là app native trên máy giả lập, không phải trình duyệt giả lập điện thoại và không phải điện thoại vật lý.
- API local cổng 3110, PostgreSQL **`dvqb_local`**. Dữ liệu vận hành mô phỏng đã được chủ dự án yêu cầu nạp trong B00-13, cùng các bản ghi có trước; không chuyển sang database fixture để nghiệm thu.
- Có backup trước audit, kiểm được mục lục 547 dòng của dump; chưa diễn tập phục hồi. Backup và thông tin đăng nhập nằm trong thư mục local không track Git.
- Bổ sung **10 công việc có nhãn UX-01**: mỗi nền tảng có ca chờ nhận, hóa đơn nháp, chờ xác nhận, cần sửa và đã khóa. Chuẩn bị qua API thật là bước tạo điều kiện; chỉ thao tác sau đó qua native mới tính là kiểm nút.
- Không reset/truncate DB, không thay API bằng mock. Các thao tác ghi dùng tài khoản và bản ghi mô phỏng; không thực hiện chuyển tiền hoặc gửi provider bên ngoài.
- Trạng thái cuối, phiên bản và hai dấu thanh toán được lưu ở `databaseOutcomes` trong nhật ký. Mười ca đã có kết quả riêng trên từng nền tảng, không lấy kết quả Android thay thế iOS.

### Sự cố môi trường đã tách khỏi lỗi sản phẩm

1. Android ban đầu dùng binary cũ thiếu module WebRTC: build lại nguồn hiện có, cài APK thành công; không sửa sản phẩm để bỏ chức năng gọi.
2. Hai công cụ điều khiển Android tranh quyền UIAutomation: dừng tiến trình điều khiển xung đột rồi chạy Maestro. Lỗi driver không tính là nút lỗi.
3. Một lượt iOS bắt đầu khi đang ở Account thay vì root: giữ log fail, quay về đúng điều kiện rồi chạy lại.
4. iOS mất runtime khi Xcode được cập nhật. Sau khi chủ dự án báo cập nhật xong, khởi động lại và tiếp tục chạy. Không suy ra app crash hoặc lỗi UI từ sự cố này.

## 3. Những kết luận có bằng chứng cụ thể

### F01 — Đổi sắp xếp làm mất kết quả tìm kiếm

**Bước kiểm:** chọn địa chỉ đã lưu → tìm thấy kết quả → bấm sắp xếp Đánh giá. **Quan sát:** danh sách biến mất, màn quay về lời nhắc chọn khu vực dù địa chỉ vẫn hiện; phải bấm kính lúp mới có kết quả lại. Đã tái hiện trên Android và iOS.

**Đề xuất:** đổi sắp xếp thì chạy tìm kiếm theo điều kiện hiện tại; có phản hồi đang tải và xử lý kết quả cũ/mới rõ ràng. Nghiệm thu bằng cả kết quả thứ tự mới lẫn điều kiện query, không chỉ kiểm danh sách vẫn nhìn thấy. Chưa kiểm riêng toàn bộ lựa chọn sắp xếp.

### F02 — “Áp dụng” bộ lọc chưa chạy tìm kiếm

**Bước kiểm:** có kết quả → đổi bán kính → bấm Áp dụng. **Quan sát:** hộp lọc đóng, người dùng còn phải bấm kính lúp. Lượt tìm kiếm lưu ảnh trước/sau và kiểm sự vắng mặt của điều khiển kết quả.

**Đề xuất:** Áp dụng là xác nhận lựa chọn và tìm lại; Hủy bỏ lựa chọn nháp. Nút Hủy mới là đề xuất thêm, không ghi thành nút hiện có đã thử. Mức kiểm từng nền tảng xem bảng bằng chứng; không suy ra tất cả bộ lọc đã được kiểm.

### F03 — Nhãn trạng thái chưa giúp phân biệt kết quả

Ảnh native Android của Chờ phản hồi và Đã từ chối cùng dùng nền xanh. Ảnh iOS mới (ảnh trước sửa đã xóa theo yêu cầu ngày 02/11/2026) cũng xác nhận nền xanh ở Đã từ chối. Chữ vẫn khác nhau nên chưa có bằng chứng người dùng hiểu nhầm trạng thái; đây là bất tiện trình bày.

**Đề xuất:** giữ chữ rõ ràng, bổ sung màu/biểu tượng theo nhóm chờ, đang làm, hoàn tất, không tiếp tục. Không đổi trạng thái máy chủ hoặc dùng màu làm tín hiệu duy nhất.

### D01 — Ưu tiên vị trí “Nhận việc”

Ảnh Android mới cho thấy nút Nhận việc nằm sau Hỗ trợ, Tin nhắn và Lịch sử đánh giá khách. **Nút vẫn nhìn thấy trong viewport đã kiểm**; không có căn cứ gọi là nút bị che hoặc luôn phải cuộn nhiều lần.

**Đề xuất thử:** đưa hành động tiếp nhận gần thông tin việc, giữ đường liên hệ và thông tin đánh giá dễ tìm. Chỉ quyết định thanh cố định sau khi thử màn nhỏ, bàn phím và chữ lớn; chưa chốt dùng thanh cố định cho mọi màn.

### K01 — Giữ quy tắc hóa đơn và thanh toán đã chạy đúng

| Ca native Android và iOS | Kết quả đối chiếu DB | Kết luận |
|---|---|---|
| Nhận việc, nhập ETA, xác nhận | Công việc `accepted`, phiên bản 2 | Giữ hành vi nhận việc |
| Sửa tiền công 210.000, lưu nháp, gửi hóa đơn | Hóa đơn `sent`, phiên bản 5 | Giữ phân biệt Lưu nháp và Gửi |
| Khách yêu cầu sửa, người thực hiện chỉnh ghi chú và gửi lại | Hóa đơn `sent`, phiên bản 6 | Giữ vòng yêu cầu sửa/gửi lại |
| Khách xác nhận hóa đơn rồi báo đã trả; người thực hiện tick ô xác nhận và bấm nhận đủ | Hóa đơn `settled`, công việc `completed`; đủ hai dấu | Giữ hai dấu thanh toán tách biệt |
| Ca đã khóa, khách báo trả rồi người thực hiện xác nhận | Cũng `settled`/`completed`, đủ hai dấu | Không gộp hai hành động thành một nút |

iOS được tiếp tục đúng bước sau khi kiểm DB: lượt yêu cầu sửa/xác nhận có các bước đạt nhưng dừng ở báo thanh toán, lượt `ios-customer-payments` hoàn tất phần còn lại; không chạy lại các ghi đã thành công. Lượt owner iOS kiểm riêng phía nhận việc/hóa đơn/nhận tiền.

Nút gửi lý do sửa bị khóa khi trống; nút xác nhận nhận tiền bị khóa trước khi tick. Có thao tác chọn Point tối đa nhưng đặt lại **0 Point** trước khi xác nhận, nên **không chứng nhận nhánh dùng Point khác 0** từ lượt này. Không kiểm bank/provider thật.

### K02 — Tách đúng nhân viên thường và quản lý

Tài khoản nhân viên 75 trong lượt chụp trước có toàn bộ quyền thành viên; không dùng ảnh đó để chứng minh trải nghiệm nhân viên thường. Audit bổ sung tài khoản 77 chỉ có `jobs.manage`, chọn hồ sơ đối tác 5, kiểm không hiện lối vào quản lý đội/ví ở vị trí đã kiểm và mở được việc được giao. Kết quả Android ở lượt `employee,employee-basic,admin-login`; iOS ở lượt `employee,employee-basic`.

Đây là bằng chứng UI ở các điểm đã kiểm, không thay kiểm API chống truy cập trái phép hoặc chứng nhận mọi tổ hợp quyền.

### O01 — Một lần mở báo cáo quản trị không thành công

Android mở danh sách báo cáo được, nhưng một lần bấm dòng đầu không vào chi tiết và hiện “Chưa xác nhận được kết quả. Giữ nguyên nội dung để thử lại.” Lượt `admin-standard` dừng ở điều kiện tìm nút đóng chi tiết; giữ trạng thái **fail/partial**, không sửa log thành đạt.

Probe đọc ba báo cáo qua API thật sau đó đều HTTP 200, đúng bộ kiểm cấu trúc của app, thời gian 86/115/77 ms. Chưa chứng minh nguyên nhân SQL, thiếu index hay lỗi dữ liệu. Cần tái hiện lại nút đó và kiểm đường retry; thông báo cho lỗi đọc nên mô tả rõ việc tải chưa thành công. Đây chưa phải kết luận lỗi DB đã xác nhận. Các mục quản trị độc lập được tiếp tục trong lượt `admin-after-reports`.

### K03 — Đánh giá và hỗ trợ: cần kiểm kết quả sau bấm

Android đã gửi đánh giá 5 sao, sửa nội dung và gỡ trên công việc UX-01 đã hoàn tất; DB xác nhận các phiên bản 1 → 2 → 3. Nút gửi bị khóa khi chưa chọn sao. Lần bấm “Hiện lại” ngay sau gỡ chưa có hiệu lực vì màn vẫn đang tải: **log tap và tên ảnh “restored” không chứng minh khôi phục thành công**. Lượt `android-review-restore` sau đó chờ đúng nhãn/điều kiện mở, bấm Hiện lại và chờ nút trở về Gỡ; DB xác nhận phiên bản 4, `removed=false`. Ảnh sau khôi phục (ảnh trước sửa đã xóa theo yêu cầu ngày 02/11/2026).

Từ đánh giá, mở Hỗ trợ và báo cáo, gửi nội dung UX-01 rồi bổ sung một lần: DB có báo cáo phiên bản 2 và một bản ghi bổ sung. Tài khoản bị hạn chế cũng gửi được một báo cáo UX-01 ở khu hỗ trợ riêng. Chưa kiểm tải ảnh chứng cứ, phản hồi đánh giá hay xử lý báo cáo bằng quyền admin; iOS chưa kiểm lại các thao tác ghi này trong lượt mới.

### K04 — Tài khoản: tách trường hợp có dữ liệu và rỗng

Hai nền tảng lưu hồ sơ không thay tên; DB giữ nguyên tên, phiên bản tăng 1 → 2. Bật/tắt từng lựa chọn thông báo hai lần rồi Lưu: cả bốn giá trị sau kiểm khớp trước kiểm. Ảnh iOS đã lưu (ảnh trước sửa đã xóa theo yêu cầu ngày 02/11/2026). Đây chưa phải kiểm gửi push hoặc đăng ký thiết bị.

Android có phiên khác: đã mở hai xác nhận thu hồi và Hủy, **không thu hồi phiên**. iOS không có phiên khác đang hoạt động, bấm thu hồi hàng loạt hiện thông báo không có phiên khác. Kịch bản ban đầu chờ hộp xác nhận nên dừng; không phải lỗi sản phẩm. Form địa chỉ được mở, thử lưu thiếu thông tin rồi Hủy; chưa chứng nhận lưu địa chỉ hợp lệ.

Android có 48 thông báo chưa đọc: bấm Đọc tất cả, DB có giảm nhưng lượt đã điều hướng và khởi động lại app trước khi xác minh toàn bộ hoàn tất. Có phát sinh thông báo mới từ khôi phục đánh giá. **Giữ nhánh này kiểm một phần**, không ghi “đã đọc hết”. Cần chạy riêng đến điều kiện kết thúc, không dựa vào tên ảnh hay log tap. iOS vốn có 0: nút Đọc tất cả bị khóa và bộ lọc chưa đọc hiện rỗng, đã kiểm riêng điều kiện này. Không tính trường hợp iOS rỗng thành một lần ghi thành công.

### O02 — Cảnh báo render ở màn gọi iOS và giới hạn ca hai đầu

Mở gọi từ công việc được giao trên iOS hiện lớp cuộc gọi và cảnh báo `Text strings must be rendered within a <Text> component.`; Metro ghi cùng cảnh báo. Ảnh native (ảnh trước sửa đã xóa theo yêu cầu ngày 02/11/2026). Phân tích JSX tìm được 3 đoạn khoảng trắng trực tiếp dưới `View` ở dòng 92; đây là đầu mối cụ thể cần xác minh khi sửa, chưa có kết quả sau sửa. Cần kiểm các nút/đoạn JSX của `CallsProvider.tsx`, sửa lỗi render rồi kiểm lại trạng thái đang gọi, nhận/từ chối, kết thúc. Chưa kết luận app crash hay âm thanh hỏng chỉ từ cảnh báo này.

Lượt đầu gọi kết thúc `no_answer`, DB không còn khóa người tham gia. Android lúc đó không khởi động được lượt Maestro; log Android ghi ANR ở **com.google.android.permissioncontroller**, không phải bằng chứng ANR của app DVQB. Lượt iOS dừng ở bộ chọn quyền của kịch bản, trong khi DB đã tạo cuộc gọi. Sau cold boot, Maestro tiếp tục báo driver startup timeout; công cụ thay thế đọc được cây điều khiển sau khi chụp ảnh timeout nhưng chưa hoàn tất ca hai đầu. Giữ các lượt này không đạt kiểm hai đầu; không tính “có server local” là đã gọi thành công. Đã đóng lớp gọi iOS, khôi phục cấu hình API ban đầu, dừng LiveKit do audit mở; DB có 0 khóa người tham gia còn hoạt động.

### R01 — Đính chính mô tả báo cáo trước khi dùng để sửa app

Danh mục B00-14 gom nhiều hành động hóa đơn vào tất cả trạng thái. Đối chiếu `InvoiceScreen.tsx` cho thấy: khách chỉ sửa/xác nhận khi hóa đơn `sent` và việc `accepted`; người thực hiện chỉ lưu/gửi ở chế độ nháp hoặc yêu cầu sửa; xác nhận nhận tiền sau admin cần thiếu dấu nhận tiền và quyền `confirm_receipt`.

Ngoài ra, `invoice-done` là thông báo, **không phải nút Đánh giá**. Điểm vào đánh giá hiện tại là `job-reviews` trên `JobDetailScreen.tsx` khi việc hoàn tất. Bảng lọc mới ghi đính chính ngay ở các dòng liên quan; giữ mô tả cũ để truy vết nhưng không coi nút đó là đang có trên màn. Đây là lỗi độ chính xác của danh mục, không phải yêu cầu thêm nút mới vào app.

### Cách diễn giải các lượt dừng

Các lượt dừng vì driver Android, runtime iOS, điều kiện bắt đầu sai, vị trí cuộn, nhánh dữ liệu rỗng hoặc bấm khi đang tải vẫn giữ trong nhật ký. Những lượt này **không tự trở thành lỗi sản phẩm**. Ca báo cáo quản trị O01 chưa rõ nguyên nhân nên giữ theo dõi riêng. Một lượt Maestro trả mã 0 cũng không tự chứng minh mọi ghi đã thành công: vẫn kiểm nhãn/trạng thái và DB như trường hợp khôi phục đánh giá và Đọc tất cả ở trên.

## 4. Phạm vi còn phải kiểm trước khi gọi là audit đầy đủ

- Mỗi mô tả nút trong bảng còn `Chưa kiểm` hoặc `Kiểm một phần`: kiểm đúng vai, trạng thái, điều kiện khóa/mở và hậu quả sau bấm. Các nhóm “Gửi / sửa / gỡ”, “Tìm / lọc”, “Tải lại / xem thêm” phải tách từng thao tác.
- Nút có thay đổi dữ liệu ở đội ngũ, xác minh, bảo mật, ví, quản trị: mở được form không có nghĩa đã lưu thành công. Dùng ca UX-01 riêng cho thao tác ảnh hưởng quyền/trạng thái.
- Quản trị toàn quyền không đại diện các quyền support, moderation, finance, accounts, catalog, audit/reports. Phải kiểm riêng những tài khoản đó trước khi chốt gộp/ẩn menu.
- Gọi hai đầu, quyền microphone, nhận/từ chối, tắt mic/loa, kết thúc, retry; có module native hoặc server local không phải bằng chứng đã gọi được.
- Chọn ảnh và quyền hệ điều hành, từ chối/cấp lại quyền vị trí, GPS, tìm gợi ý, bản đồ kéo/chọn điểm; chỉ mở rồi Hủy chưa kiểm các nhánh này.
- Back Android, vuốt quay lại iOS, mất mạng, hết phiên, đổi quyền giữa lúc nhập, bấm lặp, đổi tài khoản, giữ bản nháp/vị trí cuộn; không kết luận từ happy path.
- Baseline 5 lần mở mới + 5 lần quay lại cho lịch/chat/admin theo gói 0 chưa đủ dữ liệu. Không chốt SQL index, cache hoặc refactor hiệu năng từ thời gian Maestro và tải máy lúc cập nhật Xcode.
- Thiết bị vật lý, chữ lớn, trình đọc màn hình, ngôn ngữ EN/JA và UAT chưa được chứng nhận.

## 5. Điều chỉnh kế hoạch

1. Giữ **gói 0 chưa hoàn tất**. Chỉ đóng khi ma trận được kiểm hoặc có phần loại trừ được thống nhất rõ; không đánh dấu hoàn tất bằng số ảnh.
2. Sau gate kiểm chứng, ưu tiên thử **tìm kiếm/bộ lọc (gói 2)** vì đã tái hiện hành vi gây thêm thao tác. Giữ mã gói để không làm hỏng tham chiếu cũ.
3. **Công việc/hóa đơn (gói 1):** giữ nghiệp vụ đã chạy đúng; tập trung trình bày trạng thái, vị trí nút và giải thích điều kiện. Chưa chốt thanh cố định hoặc tách tải sâu chỉ từ ảnh.
4. **Lịch/chat/hiệu năng, quản trị, tài khoản/đội ngũ/ví:** tiếp tục là đề xuất cần bằng chứng tương ứng; D01–D04 API của kế hoạch chính vẫn chưa duyệt.
5. Mỗi thay đổi được đề nghị phải ghi: vấn đề quan sát → ca tái hiện → phương án → hành vi cần giữ → kiểm sau sửa. Không có bằng chứng thì để giả thuyết, không đưa thành lỗi đã xác nhận.

## 6. Cách tự xem bằng chứng

Mở HTML, chọn nền tảng và vai trò; chọn **Bất tiện tái hiện** để xem điểm có cơ sở sửa, **Ghi + đối chiếu DB** để xem nghiệp vụ cần giữ, hoặc **Chưa kiểm** để thấy phần còn thiếu. Tên lượt trong mỗi dòng truy về `native-events.json`.

Nhật ký công khai chỉ giữ tap/điều kiện kiểm/đường điều hướng/tên ảnh/trạng thái; loại biến đăng nhập, mật khẩu và mã MFA. Tap trên ô nhập không tính là một nút riêng. Tap optional không chứng minh điều khiển từng tồn tại. Lượt thất bại được giữ cùng nguyên nhân; không tính thành đạt.

Câu hỏi để đánh giá phương án: sau bấm Áp dụng, bạn có còn phải bấm tìm lần nữa? Khi việc bị từ chối, chữ/màu có phân biệt với đang chờ? Khi hóa đơn khóa, bạn có hiểu ai chưa xác nhận thanh toán? Nhân viên thường có được dẫn vào màn mà mình không có quyền không?

## 7. Mức bao phủ và kiểm tra tài liệu của lượt này

- Nhật ký lưu **49 lượt**, gồm 31 lượt kết thúc mã 0 và 18 lượt dừng/lỗi. Đây là số lượt chạy, **không phải 31 chức năng hoặc 31 ca nghiệp vụ đã đạt**; nguyên nhân và các bước đã hoàn tất phải đọc riêng.
- Ma trận có bằng chứng ít nhất một phần ở **82 mô tả Android, 52 mô tả iOS** trên danh mục gốc 444 mô tả nút/nhóm. Chưa kiểm tương ứng 362 và 392 mô tả. Không tính tỷ lệ hoàn tất nút duy nhất từ các số này: danh mục có nhóm nhiều nút, mô tả lặp theo trạng thái và 32 dòng cần đính chính.
- Đã kiểm HTML ở chiều rộng 1440 và 390: tìm không dấu, lọc nền tảng/vai/mức bằng chứng/đính chính, xóa lọc; đủ 444 dòng khi chọn toàn bộ, không lỗi JavaScript hoặc tràn ngang toàn trang. Đường dẫn ảnh/tài liệu trong HTML hợp lệ; bảng rộng có vùng cuộn riêng.
- 14 ảnh công khai đã xem, có nguồn và SHA-256 trong `images.json`; chỉ dữ liệu mô phỏng. Nhật ký đã loại các bước nhập/biến mật khẩu và MFA. Backup, thông tin xác thực và log thô giữ local.
- SDD prepare kiểm nguồn/liên kết đạt với 156 tiêu chí, QA 97 partial/12 unmapped. Đã chạy `sdd:run`: lint, typecheck, 58 kiểm tooling, 349 kiểm mobile và cổng coverage mobile đạt. **Bước API dừng sau khoảng 10 phút** (runner giới hạn 600.000 ms); file `api.json` 0 byte và `api.log` chỉ có dòng trống, nên chưa có kết quả API hợp lệ để kết luận bài nào đạt/lỗi. Mốc artifact: bắt đầu API 15:28:40 UTC, dừng 15:38:44 UTC ngày 31/10 (00:28–00:38 ngày 01/11 tại máy). `sdd:check --phase verify` báo **CHƯA ĐẠT**, thiếu `evidence.json`. Các bước sau API chưa chạy; không hạ tiêu chí/tăng timeout để báo xanh. Một lượt trước đó đã chủ động dừng để sửa ánh xạ nút, không tính là lỗi sản phẩm.
- Artifact hồi quy ở `test-results/sdd/SDD-PROJECT/` chỉ lưu local. Kiểm kỹ thuật dùng database cô lập theo cơ chế fixture; **toàn bộ kết luận audit native ở trên dùng `dvqb_local`**. Không có bằng chứng CI mới, thiết bị vật lý hoặc UAT trong lượt này.
- Không sửa sản phẩm trong lượt audit, không đổi source hash/thu hẹp tiêu chí SDD để lấy kết quả xanh. Kế hoạch sửa vẫn cần chốt theo từng vấn đề có bằng chứng; gói 0 giữ mở.
