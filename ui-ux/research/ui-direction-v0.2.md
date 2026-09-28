# Hướng thiết kế UI v0.10 — Dịch vụ khu phố

DOC-053 · 23/09/2026 · Chủ dự án đã chọn hướng A — Dịch vụ khu phố. React + Storybook và hướng thị giác đã duyệt; đã mở rộng bản mẫu v0.5 theo UI-05/06; chưa triển khai sản phẩm.

## Những gì đã tham khảo

Quan sát trực tiếp website ngày 23/09, không đăng nhập hay tạo giao dịch. Mobile là web ở viewport 390px, không phải kiểm thử ứng dụng native.

| Nguồn | Quan sát | Áp dụng cho dự án |
|---|---|---|
| [Taskrabbit](https://www.taskrabbit.com/) | Tìm nhu cầu trước, nhóm công việc cụ thể, ảnh người đang làm, giá tham khảo và đánh giá. Có popup ưu đãi che nội dung lúc xem. | Gợi ý bằng việc cần làm: sửa vòi nước, vệ sinh điều hòa. Đưa bằng chứng tay nghề gần nút liên hệ. Không đưa popup quảng cáo vào luồng tìm thợ. |
| [Urban Company Delhi](https://www.urbancompany.com/delhi-ncr) | Desktop đặt địa chỉ và tìm kiếm trên đầu, ngành dịch vụ bằng hình, ảnh người làm dịch vụ ở nửa phải. Thu viewport mà không tải lại gây cắt nội dung trong lần quan sát; chưa kết luận chất lượng mobile của hãng. | Dùng hình giúp nhận biết ngành, gắn tìm kiếm với địa chỉ. Không áp dụng thời gian đến hoặc giá cố định vì mô hình dự án chưa có dữ liệu đó. |
| [Airbnb Services](https://www.airbnb.com/services) | Desktop có tìm theo địa điểm/thời gian/loại dịch vụ. Mobile sau tải lại có tìm kiếm gọn, hàng danh mục cuộn ngang, thẻ ảnh công việc, thông tin giá/đánh giá, điều hướng dưới. | Phân cấp ảnh → dịch vụ → thông tin tin cậy. Tách thiết kế mobile và desktop. Không sao chép thương hiệu, ảnh hoặc luồng thanh toán. |

## Ba hướng cân nhắc

| Hướng | Cảm giác và lợi ích | Đánh đổi |
|---|---|---|
| A. Dịch vụ khu phố — đề xuất chọn | Cobalt, ảnh tay nghề, tên thật/cửa hàng, thẻ gọn có bằng chứng. Phù hợp nhiều ngành tại Hà Nội. | Cần ảnh partner đủ chất lượng, có fallback tử tế khi chưa có ảnh. |
| B. Chuyên gia cao cấp | Ảnh lớn, ít nội dung trên màn, hồ sơ trình bày như portfolio. Phù hợp beauty/pet/detailing. | Tốn diện tích và làm chậm việc tìm thợ sửa chữa gấp. |
| C. Tìm thợ tức thời | Bản đồ ưu tiên, danh sách rất gọn, tương tác nhanh. | Dễ gây hiểu nhầm theo dõi GPS/điều phối như gọi xe, ảnh năng lực ít nổi bật. |

## A — Cá tính thị giác

- Màu hành động cobalt `#2457D6`; chữ mực `#16233B`; nền trắng/xám xanh `#F4F7FC`; vàng nhạt `#FFF0B8` chỉ làm điểm nhấn nhỏ. Màu cảnh báo/thành công có icon và chữ đi kèm.
- Be Vietnam Pro, nội dung 16px, nhãn phụ tối thiểu 14px; tiêu đề mobile 28–32px, desktop 36–40px. Chỉ dùng 3 mức độ đậm chính.
- Bo góc 12–16px, nút ít nhất 44px, ảnh có tỷ lệ ổn định, khoảng cách theo thang 4/8/12/16/24/32. Hiệu ứng chỉ phản hồi thao tác, tôn trọng reduced-motion.
- Bộ icon cùng nét, một nét nhận diện đồ họa dựa trên dấu vị trí dùng ở logo/nhãn địa chỉ. Không lặp họa tiết ở mọi thẻ.
- Ảnh công việc do partner cung cấp và có quyền sử dụng. Trong mẫu ghi rõ minh họa; không dùng chân dung giả kèm chứng nhận hoặc review có vẻ thật.
- Khi chưa có ảnh: ảnh đại diện chữ cái + biểu tượng ngành; không tạo vùng ảnh trống lớn. Nội dung mới/ít đánh giá được trình bày trung thực.

## Bố cục đề xuất

```text
MOBILE — TÌM DỊCH VỤ                 DESKTOP — KẾT QUẢ
┌─────────────────────────┐         ┌───────────────────────────────────────────────┐
│ Địa điểm làm việc  ▾     │         │ Logo   Địa điểm   Tìm kiếm   Chat  Tài khoản │
│ Bạn cần giúp việc gì?   │         ├───────────────────────────────────────────────┤
│ [Tìm dịch vụ          ] │         │ Ngành   10 km ▾   Xác minh   Bộ lọc          │
│ Ngành bằng hình + tên   │         ├───────────────────────┬───────────────────────┤
│ 10 km ▾  Bộ lọc  Bản đồ │         │ Kết quả + sắp xếp     │ Bản đồ               │
│─────────────────────────│         │ ┌───────────────────┐ │                       │
│ Ảnh việc + tên partner │         │ │Ảnh │ Năng lực     │ │ Marker chọn đồng bộ  │
│ Kỹ năng · khu phục vụ  │         │ │    │ Giá tham khảo│ │ với thẻ bên trái    │
│ ★ số sao (số đánh giá) │         │ │Nhắn tin · Hồ sơ   │ │                       │
│ Giá tham khảo nếu có   │         │ └───────────────────┘ │                       │
│ [Nhắn tin]  Xem hồ sơ  │         └───────────────────────┴───────────────────────┘
│─────────────────────────│
│ Tìm · Việc · Chat · Tôi│
└─────────────────────────┘
```

- Trang khám phá: ngành dễ nhận biết, tìm kiếm nổi bật, không có hero quảng cáo chiếm toàn màn đầu. Màn kết quả tập trung so sánh, không lặp phần giới thiệu.
- Mobile: danh sách toàn chiều ngang; mở bản đồ ở chế độ riêng, thẻ kết quả ở bảng kéo dưới, vẫn có nút mở danh sách cho người không dùng thao tác kéo. Bộ lọc có Áp dụng/Xóa, hiển thị số điều kiện đang dùng.
- Web: kết quả và bản đồ cùng nhìn được; bỏ sidebar lớn của bản thử. Tablet khi không đủ chỗ chuyển sang nút Danh sách/Bản đồ.
- Hồ sơ: ảnh công việc, phần giới thiệu ngắn, kỹ năng, khu phục vụ, giá tham khảo, review. Nhắn tin là hành động nổi bật; Thuê dịch vụ vẫn dễ tìm và không bắt buộc chat trước.
- Chat trước thuê và lịch sử theo cặp người dùng giữ nguyên. Yêu cầu thuê là thẻ trong cuộc trò chuyện; khi nhận việc có tin hệ thống theo nghiệp vụ đã duyệt.
- Khu partner dùng hàng công việc có hành động rõ; bật/tắt nhận việc đặt ở đầu màn. Admin có giao diện vận hành riêng, không trộn menu quản trị vào tìm thợ.

## UX phải kiểm chứng khi làm mẫu

| Tình huống | Hành vi mục tiêu |
|---|---|
| Khách sửa địa chỉ | Địa chỉ đang tìm luôn thấy được; cập nhật kết quả và vùng bản đồ cùng nhau |
| Khoảng cách | Phân biệt địa chỉ cửa hàng và khu vực nhận phục vụ; không gắn khoảng cách giả cho thợ di động |
| Không có kết quả | Giữ tiêu chí, cho mở từ 10 lên 20/30 km hoặc bỏ bộ lọc; không tự đổi âm thầm |
| Partner chưa xác minh | Nhãn có giải thích; không dùng cùng huy hiệu với đã xác minh |
| Chưa khai báo giá | Ghi Trao đổi để nhận báo giá; không dùng 0đ hoặc giá từ ảo |
| Quay lại từ hồ sơ/chat | Giữ bộ lọc, vị trí cuộn và partner đã chọn |
| Chưa đăng nhập | Xem phần hồ sơ công khai; nhấn liên hệ yêu cầu đăng nhập và quay về hành động đang làm |
| Màn hình nhỏ/bàn phím | Nút chat không che ô nhập; hỗ trợ safe area, focus và bàn phím; không tràn ngang toàn trang |

Tiêu chí mẫu: người xem nhận ra cách đổi địa chỉ, lọc ngành, xem năng lực và mở chat; thử 360/390/768/1440px; kiểm tương phản, focus, trạng thái rỗng/lỗi/đang tải. Đây là mục tiêu kiểm thử, chưa có kết quả đo UX người thật.

## Phạm vi hiện hành v0.5

UI-05 đã chốt làm gộp nền tảng thiết kế và luồng khách hàng. React v0.9 bổ sung form thuê, công việc, hóa đơn/point, xác nhận thanh toán, đánh giá, danh sách chat và tin hệ thống nhận việc. Storybook có 31 stories. Partner/doanh nghiệp được nối chung dữ liệu; xem [DOC-057](../specs/partner-journey.md).

Xem [DOC-056: hướng dẫn và kiểm chứng](../specs/customer-journey.md) và [PLAN-006: bộ nền tảng](../specs/design-system.md). Nghiệp vụ không đổi; tài liệu hiện hành và prototype nghiệp vụ cổng 8765 tiếp tục là chuẩn đối chiếu. Duyệt hướng không phải nghiệm thu tất cả UI hoặc triển khai production.

Các giới hạn còn lại: bản đồ/ảnh giả, tìm kiếm Cầu Giấy cố định, chưa đăng nhập/gọi/nhắc lịch thật, dữ liệu trong bộ nhớ phiên; chưa chuyển hết các luồng phụ hoặc nhóm admin. Tất cả giới hạn và kết quả kiểm cụ thể nằm trong DOC-056. Banner/quảng cáo/voucher để sau theo PROMO-02.

UI-10: đội ngũ doanh nghiệp trong React v0.9, xem DOC-057 cho phạm vi mời/gỡ và giới hạn.

UI-11: gửi lại lời mời và mục tài khoản nhân viên/tự rời đã có trong bản mới; xem DOC-057.

UI-12 chuyển đợt 1 sang UI mới; phạm vi và giới hạn tại ../specs/account-batch.md.

## Hiện hành UI-14, React v0.10

37 stories; UI công việc/đánh giá/liên lạc đã chuyển sang React theo [DOC-059](../specs/activity-batch.md). Các đoạn UI-05 đến UI-12 phía trên ghi tiến trình lịch sử; phạm vi và giới hạn hiện tại tra DOC-059. Gọi/push/nhắc lịch vẫn mô phỏng.

UI-15 hiện hành: React v0.10a; 39 stories. Thông báo tách khỏi chat, cài đặt trong tài khoản. Tham khảo: https://www.linkedin.com/help/linkedin/answer/a597801/ và https://www.airbnb.com/help/article/2893 . Quy tắc dự án theo DOC-059, không sao chép mọi hành vi của các nền tảng tham khảo.

UI-16 thay bố cục UI-15: avatar header mở Tài khoản, Thông báo thành tab điều hướng, không còn chuông header. React v0.10b; xem DOC-059.


## UI-17 · 26/09/2026 · React v0.11
Ví có màn nạp/rút, đề nghị đổi ngân hàng và lịch sử lọc/chi tiết. Đội ngũ có tab Quyền truy cập giải thích quyền hiện hành. Chi tiết, QA và các phần còn thiếu ở `ui-ux/specs/finance-batch.md` (DOC-060). Chưa có trình cấp quyền tùy chỉnh hoặc admin duyệt trong React. UI-16 về avatar/Thông báo giữ nguyên.


## UI-18 · 27/09/2026 · React v0.12
Đã bổ sung cấp/thu hồi quyền nhân viên, ngân hàng lần đầu và admin duyệt tài chính trên cùng dữ liệu phiên. Phần UI-17 nói chưa có các màn này được thay bởi DOC-060 `finance-batch.md` mục UI-18. 45 stories, 39 kiểm tra logic; giữ nguyên avatar và điều hướng UI-16. Admin có danh sách/lọc/chi tiết/nhật ký; không kết nối tài chính thật.


## UI-19 · 27/09/2026 · React v0.13
Bổ sung Hỗ trợ từ Tài khoản/công việc, admin hỗ trợ/xác minh/kiểm duyệt đánh giá và nhật ký. Xác minh partner qua admin, bỏ nút tự mô phỏng duyệt; tệp chờ duyệt khóa sửa. Ẩn/khôi phục đánh giá cập nhật điểm trong phiên. Quyết định và giới hạn chi tiết ở DOC-061 `ui-ux/specs/support-moderation.md`; nội dung UI-19 thay các ghi chú trước rằng những màn này chưa có. Không thay tiền/point khi xử lý báo cáo. 48 stories, 42 kiểm tra logic; UI-UX-v0.17.zip.


## UI-20 — cập nhật hiện hành 27/09/2026
React v0.14, UI-UX-v0.18.zip, registry v1.26. Đã bổ sung quản trị tài khoản, đình chỉ partner, danh mục và báo cáo/nhật ký vận hành. Xem [phạm vi, luồng và bằng chứng QA](../specs/admin-operations.md). Các ghi chú trước đây rằng bốn nhóm này chưa có trong React được thay bằng UI-20; không đổi nghiệp vụ hay mở các mục pending. Các lớp xác thực và dữ liệu vẫn là mô phỏng.
