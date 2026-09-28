# Banner, quảng cáo và voucher — brainstorm v0.2

DOC-055 · Ngày 23/09/2026 · ĐÃ CHỐT PHẠM VI: toàn bộ banner, quảng cáo partner và voucher để mở rộng tương lai, không thiết kế triển khai hoặc phát triển trong phase đầu. Các phương án bên dưới chỉ là tư liệu tham khảo, chưa duyệt nghiệp vụ chi tiết. Không thay đổi quy tắc point hiện hành. [Bản xem trực quan](promotions.html).

## Học gì từ các nền tảng khác?

Nguồn chính thức được đọc ngày 23/09/2026. Hướng dẫn của hãng có thể mô tả tính năng theo thị trường; đây không phải kiểm chứng mọi phiên bản app đang chạy.

| Tham khảo | Mẫu thiết kế/nghiệp vụ | Điều phù hợp với dự án |
|---|---|---|
| [Uber Eats — Sponsored Listings](https://help.uber.com/en/ubereats/restaurants/article/what-are-sponsored-listings?nodeId=e4222375-edec-4323-99f8-172ed6c4e532) | Thẻ cửa hàng tài trợ có nhãn phân biệt với kết quả thường. | Giữ cấu trúc thẻ partner quen thuộc, thêm nhãn “Được tài trợ”; không đổi huy hiệu xác minh hoặc rating vì trả tiền. |
| [Uber — Custom Creative](https://www.uber.com/us/en/advertising/specs/sponsored-listing/) | Có hình minh họa app; vùng ảnh hiển thị và vùng đặt nhãn ưu đãi được quy định, khuyến nghị ít chữ trên ảnh và một điểm nhấn rõ. Đã mở trang chính thức bằng browser. | Banner gồm ảnh/illustration và chữ HTML riêng; không nhúng toàn bộ điều kiện bằng chữ nhỏ trong ảnh. Thiết kế crop riêng mobile/web. |
| [GrabMerchant — Quảng cáo hình ảnh](https://merchant.grab.com/vn-vn/blog/quangcaohinhanh) | Bài giới thiệu 2022 về công cụ partner tự tạo quảng cáo hình ảnh. Đây là ví dụ lịch sử, không dùng xác nhận tính năng tài khoản hiện nay. | Tương lai có thể cho partner tạo chiến dịch từ mẫu có sẵn, admin duyệt trước khi hiển thị. |
| [Airbnb — coupon](https://www.airbnb.com/help/article/160) | Coupon có nơi lưu trong tài khoản, trạng thái hoạt động/đã dùng/hết hạn và bước áp dụng trước chốt đặt; tối đa một coupon/đặt. | Có nơi “Ưu đãi của tôi” và bước chọn voucher ngay trước xác nhận hóa đơn; không dùng quy trình thanh toán online của Airbnb cho app này. |
| [Booking — Rewards FAQ](https://www.booking.com/content/incentives-faq.en-gb.html) | Phân biệt giảm ngay và thưởng sau; hiển thị ưu đãi ở trang chốt và trong chi tiết giá. | Voucher giảm ngay phải tách khỏi point sẽ nhận sau hoàn tất. Không để khách tưởng point tương lai đã được trừ ngay. |

## Ba loại nội dung nên tách biệt

| Loại | Dùng để làm gì? | Ví dụ / điểm đến |
|---|---|---|
| Banner nội dung của nền tảng | Khám phá dịch vụ, hướng dẫn hoặc chiến dịch theo mùa, không bắt buộc có giảm giá | “Điều hòa cần vệ sinh?” → danh sách Điện lạnh tại địa chỉ khách đã chọn |
| Quảng cáo trả phí | Partner mua khả năng được nhìn thấy, không mua uy tín | Thẻ “Được tài trợ” → hồ sơ partner đủ điều kiện phục vụ địa chỉ đó |
| Voucher | Một quyền giảm tiền có điều kiện, đơn vị tài trợ và ngân sách | “Giảm 30.000đ tiền công, từ 200.000đ” → điều kiện + danh sách đủ điều kiện |

Banner không phải voucher. Một banner có thể giới thiệu voucher nhưng máy chủ vẫn phải xác nhận quyền sử dụng tại hóa đơn. Tránh dùng từ “Nhận” nếu thao tác thực tế chỉ mở trang chi tiết.

## Bố cục đề xuất cho Dịch vụ khu phố

```text
MOBILE                          WEB
Địa chỉ + ô tìm kiếm            Tìm kiếm + địa chỉ
Nhóm ngành                     Nhóm ngành
[1 banner ngắn phù hợp]        [Banner ngang ngắn, tối đa 1 chiến dịch chính]
Ưu đãi của tôi →                Bộ lọc + kết quả                 Bản đồ
Thợ phù hợp                    Kết quả tự nhiên
Thẻ được tài trợ (nếu có)       Thẻ được tài trợ có nhãn
Các kết quả khác               Các kết quả khác
```

- Vị trí banner sau ngành, không thay thế tìm kiếm/địa chỉ. Mobile cao khoảng 120–150px là điểm bắt đầu thử nghiệm; nếu đẩy kết quả quá xa thì thu gọn. Không mặc định slideshow tự chạy, popup toàn màn hoặc countdown khi không có thời hạn thật.
- Mỗi banner một thông điệp và một CTA. Màu cobalt là nền tảng; vàng nhạt là khung ưu đãi, không phủ toàn app bằng màu khuyến mãi. Font và bo góc dùng design system hiện hành.
- Nội dung theo ngành/khu vực khách chủ động chọn. Không có chiến dịch phù hợp thì ẩn cả vùng; không để ô quảng cáo trống. Đích mở giữ địa chỉ/bộ lọc, back quay lại đúng vị trí.
- Kết quả tìm kiếm tập trung chọn thợ: thử tối đa một thẻ tài trợ trong 5 kết quả đầu, sau ít nhất một kết quả tự nhiên. Đây là giả thuyết cần đo, không phải tiêu chuẩn chung. Chỉ hiển thị partner đang được phép nhận việc và đáp ứng bộ lọc; không vượt qua việc bị ẩn/đình chỉ.
- Hồ sơ chỉ hiển thị ưu đãi áp dụng cho chính partner đó. Chat và hóa đơn không chen quảng cáo. Người dùng đi sửa xe gấp không nên phải xem quảng cáo mới liên hệ được.
- Không thêm tab thứ năm dưới mobile ngay. “Ưu đãi của tôi” có lối vào từ trang tìm kiếm và Tài khoản. Point giữ mục riêng vì là số dư, không phải coupon.
- Đọc bằng screen reader được; vùng bấm ít nhất 44px, text không nằm trong ảnh, không chỉ dùng màu để báo hết hạn/không đủ điều kiện.

## Voucher: nội dung thẻ và nơi áp dụng

Thẻ mẫu, không phải chương trình thật:

> GIẢM 30.000đ TIỀN CÔNG  
> Tiền công từ 200.000đ · Điện lạnh tại Hà Nội  
> Nền tảng tài trợ · Hạn sử dụng hiển thị bằng ngày cụ thể  
> Xem điều kiện / Xem dịch vụ áp dụng

Hiển thị giá trị thực, mức tối đa khi giảm %, mức tối thiểu tính trên tiền công hay tổng, partner/kỹ năng/khu vực áp dụng, ngày hết hạn, số lần còn lại, bên tài trợ. Voucher không áp dụng phải nêu lý do: thiếu tiền công tối thiểu, sai dịch vụ, hết lượt hoặc hết ngân sách. Mã nhập tay là lựa chọn phụ; ưu tiên liệt kê voucher đủ điều kiện và cho khách chủ động chọn.

Luồng đề xuất phù hợp mô hình hiện hành:

1. Khách xem/lưu voucher để biết điều kiện. Vì giá chốt sau khi làm, chưa hứa số tiền giảm chính xác ở bước thuê. Lưu voucher không đồng nghĩa giữ ngân sách; nếu muốn cam kết từ lúc thuê cần thiết kế giữ quyền riêng và nguồn tiền tương ứng.
2. Thợ gửi hóa đơn gồm vật tư và tiền công đã thống nhất. Khách xem, chọn voucher rồi dùng point trên phần còn phải trả.
3. Trước khi khóa hóa đơn, máy chủ kiểm điều kiện và giữ quyền dùng voucher/ngân sách cùng khoản giữ point/phí trong một giao dịch nguyên tử. Nếu hết suất, báo khách xem lại tổng, không âm thầm bỏ giảm giá và xác nhận số tiền lớn hơn.
4. Khách xác nhận hóa đơn → thanh toán trực tiếp số còn lại cho thợ → khách báo đã trả → thợ xác nhận nhận tiền. Voucher được ghi đã dùng, khoản bù và point được quyết toán đúng một lần.
5. Sau khi khóa, không đổi voucher tự do. Ngoại lệ phải qua report/admin. Luồng giải phóng khoản giữ/đảo bút toán vẫn cần giải quyết trước chạy tiền thật, không mở lại phạm vi tài chính pending bằng brainstorm này.

Đề xuất khởi đầu: một voucher/hóa đơn, được dùng cùng point; voucher trừ trước, point trừ sau, tổng tiền trả trực tiếp không âm. Khách vẫn dùng được point đến hết phần hóa đơn còn lại. Voucher có thể hết hạn nhưng không làm đổi quy tắc point không hết hạn đã chốt. Không đổi voucher thành số dư có thể rút/chuyển nhượng.

## Ai chịu tiền giảm?

| Cách tài trợ | Tác động cần thiết kế |
|---|---|
| Nền tảng tài trợ | Giữ nguyên vật tư/tiền công đã thống nhất; app bù giá trị voucher vào ví partner khi quyết toán. Phí vẫn dựa tiền công. Phải có ngân sách nền tảng. |
| Partner tài trợ | Giảm thu nhập thực nhận của partner. Phải có opt-in, xác định tiền công trước/sau giảm và cơ sở tính phí/point. Đây là nghiệp vụ mới, không tự trừ ví hoặc biến giảm giá thỏa thuận ngoài app thành chương trình của platform. |
| Cùng tài trợ | Tách rõ phần mỗi bên trả; đối soát phức tạp hơn. Để sau. |

Ví dụ giả định nền tảng tài trợ, chỉ để hiểu luồng: vật tư 300.000đ + tiền công 200.000đ = 500.000đ. Voucher 30.000đ, dùng 50.000 point → khách trả trực tiếp 420.000đ. Ví partner nhận bù 80.000đ, trừ phí 20.000đ → tổng giá trị partner nhận sau phí là 480.000đ. Nếu giữ mức thưởng 2% tiền công thì khách được 4.000 point sau hoàn tất. Phí 20.000đ trừ thưởng 4.000đ và voucher 30.000đ = âm 14.000đ trước các chi phí khác; không gọi đây là lợi nhuận. Point đã dùng là nghĩa vụ cũ, không tính lại như phần thưởng mới của đơn.

Theo quyết định chủ dự án, không chuẩn bị thêm giao diện banner/voucher trong phase đầu; chỉ lưu nghiên cứu để dùng khi mở lại phạm vi. Nếu ưu đãi partner được chọn trước, cần chốt lại cơ sở tính phí/point, không triển khai theo ví dụ trên.

## Vận hành và dữ liệu để mở rộng sau này

Ba đối tượng tách nhau: nội dung hiển thị (placement, ảnh desktop/mobile, CTA, khu vực/ngành, lịch hiển thị); chiến dịch quảng cáo (partner, ngân sách, thời gian, nhãn tài trợ, số liệu); voucher (bên tài trợ, điều kiện, mức giảm/trần, hạn, lượt dùng) và bản ghi dùng/giữ theo hóa đơn. Chỉ bật chiến dịch đã được duyệt, giữ phiên bản điều kiện tại thời điểm khách xác nhận. Không để chỉnh banner làm đổi ưu đãi đã áp dụng.

Admin cần preview mobile/web, nháp/duyệt/lên lịch/tạm dừng/kết thúc, dừng khẩn, lịch sử sửa, kiểm ảnh/đích mở, ngân sách và lượt dùng. Thời gian vận hành theo múi giờ Hà Nội. Partner tự tạo chỉ nên thêm sau; lúc đầu admin có thể cấu hình campaign đã thỏa thuận. Tài khoản quản trị được phân quyền, không có nút tự tăng ngân sách trong chế độ khách.

Đo riêng impression/click/đến hồ sơ/chat/yêu cầu thuê/hoàn tất. Cuộc gọi ngoài app không chứng minh có deal; không ghi doanh thu quảng cáo như chắc chắn từ click. Theo dõi tỷ lệ voucher không dùng được, chi phí trợ giá trên đơn hoàn tất và tác động tới tỷ lệ tìm được thợ. Giới hạn lượt/khách và tổng ngân sách; các thao tác retry/nhận tiền lặp không được cấp lại tiền bù.

## Lộ trình đề xuất và điểm cần chốt

1. Phase đầu: không làm banner chiến dịch, quảng cáo partner, voucher, màn Ưu đãi hay chức năng quản trị chiến dịch. Không cần giữ khoảng trống trên giao diện. Point hiện hành giữ nguyên.
2. Khi có nguồn cung/traffic: thử thẻ partner tài trợ, admin quản lý chiến dịch; chốt cách tính tiền quảng cáo riêng, chưa áp dụng đấu giá/CPC mặc định.
3. Khi có ngân sách và luồng tài chính đã kiểm chứng: bật voucher với một nguồn tài trợ trước, sau đó mới cân nhắc cùng tài trợ hoặc tự phục vụ cho partner.

Quyết định đã chốt: không đưa toàn bộ nhóm này vào phase đầu. Ba nhóm quyết định khi chủ dự án mở lại phạm vi: (a) đưa loại nào vào phase sau; (b) partner hay nền tảng tài trợ, mức ngân sách; (c) voucher trừ trên tiền công hay tổng, một voucher + point và cơ sở thưởng/phí. Các điều kiện triển khai phase sau chưa được duyệt; chưa gán lịch hoặc phiên bản ra mắt.

Tác động khi duyệt: BRD/FR/SRS (khuyến mại và quảng cáo), UX/luồng hóa đơn, sổ ví/point, API/ERD, phân quyền admin, QA ngân sách/đồng thời/ngoại lệ. Hiện chỉ đăng ký nghiên cứu và liên kết ảnh hưởng; không ghi các đề xuất vào baseline sản phẩm.
