# Mẫu báo cáo chức năng — giải thích để chủ dự án học code

DOC-086 · 01/10/2026 · DELIVERY-01. Đây là mẫu chưa điền, không phải bằng chứng đã triển khai. [Mục lục](../README.md).

Người đọc chưa có nhiều kiến thức phát triển app. Viết để họ hiểu một thao tác đi qua code như thế nào, không chỉ để lập trình viên kiểm tra tiến độ. Mỗi chức năng lớn có một báo cáo `.md` riêng. Không chép số kiểm thử của lần trước thành kết quả mới.

## 1. Bạn đã dùng được những gì?

Mở đầu bằng hành động cụ thể: trước đây người dùng chưa làm được gì, giờ bấm ở đâu và nhận kết quả gì. Nêu phần còn thiếu bằng lời thông thường. Phân biệt rõ đã chạy trên máy phát triển, đã kiểm trên Android/iOS, đã kiểm tự động trên GitHub và đã được chủ dự án nghiệm thu.

Để mã checklist, ngày và phiên bản code ở dòng thông tin riêng. Giải thích `commit` là một phiên bản code đã lưu trong Git; `working tree` là code đang sửa chưa lưu thành phiên bản đó nếu cần dùng các từ này.

## 2. Những khái niệm cần biết

Chỉ giải thích các từ thực sự cần cho câu chuyện, ngay trước hoặc ngay khi dùng. Ví dụ:

| Từ xuất hiện trong code | Nghĩa trong chức năng đang giải thích |
|---|---|
| State | Thông tin màn hình đang ghi nhớ, như đang tải hay đã có danh sách |
| API | Cách app gửi yêu cầu tới chương trình xử lý phía máy chủ |
| Provider | Phần cung cấp dữ liệu/công cụ dùng chung cho các màn bên trong |

Không dồn hàng chục thuật ngữ vào đầu bài. Một ví dụ cụ thể có ích hơn một định nghĩa chung. Giữ chính xác: “lưu trên thiết bị” và “lưu trên máy chủ” là hai việc khác nhau.

## 3. Theo một thao tác từ đầu đến cuối

Chọn một thao tác thật, ví dụ bấm Đăng nhập. Kể theo thứ tự: nhận dữ liệu gì → xử lý gì → chuyển cho ai → trả lại gì → người dùng thấy gì.

Sơ đồ đặt ngay trong khối `mermaid` của báo cáo `.md`. Dùng tên vai trò dễ hiểu như “Màn tài khoản”, “Máy chủ”, “Nơi lưu dữ liệu”; bảng ở mục sau nối các vai trò đó với tên file thật. Chỉ vẽ các phần thực sự tham gia. Không tạo thêm `.mmd`/PNG/SVG trừ khi được yêu cầu xuất ảnh.

Kiểm cú pháp và render sơ đồ trước bàn giao. Nếu vẽ trường hợp thành công, ghi rõ điều đó và giải thích nhánh lỗi riêng. Không dùng dấu `;` trực tiếp trong nhãn sequence vì có thể bị hiểu là kết thúc câu lệnh.

## 4. Mở code theo thứ tự nào?

| Bước | File có link và tên hàm cần tìm | Nhận gì, làm gì, chuyển tiếp gì? |
|---|---|---|
| 1 | File nhận thao tác người dùng | Ví dụ: lấy email/mật khẩu trong ô nhập rồi gọi bộ quản lý đăng nhập |
| 2 | File tiếp theo thực sự được gọi | Giải thích nhiệm vụ và vì sao cần tách khỏi màn hình |
| … | Theo đến kết quả rồi quay lại màn hình | Nêu chỗ quyết định hiển thị thành công/lỗi |

Mỗi link phải mở được. Phân biệt file chuẩn bị app lúc khởi động với file xử lý mỗi lần bấm. Đừng chỉ viết “input → output” rồi liệt kê tên hàm mà không giải thích ý nghĩa.

Có thể trích 3–8 dòng code thật và giải thích từng dòng, như `await` nghĩa là chờ việc trước xong. Nếu rút gọn, ghi rõ đây không phải toàn bộ hàm. Không thêm đoạn code giả rồi mô tả là code đã có.

## 5. Dữ liệu được nhớ ở đâu và nếu có lỗi thì sao?

Nêu dữ liệu nào chỉ giữ tạm, dữ liệu nào còn sau khi đóng app, dữ liệu nào do máy chủ quyết định. Giải thích bằng tình huống: mất mạng, bấm hai lần, rời màn khi đang tải, lưu thất bại, không đủ quyền.

Giải thích lý do của cách làm, ví dụ “chờ lưu thành công rồi mới báo đăng nhập để tránh báo thành công giả”. Không bỏ giới hạn bảo mật để câu chuyện dễ hiểu hơn. Không đưa mật khẩu/token thật vào ví dụ.

## 6. Bạn có thể tự thử và tự kiểm hiểu

Đưa các bước ngắn để chủ dự án thử trên app, kết quả mong đợi và một tình huống lỗi có cách thử lại. Đặt 2–3 câu hỏi kèm gợi ý file hoặc đáp án ngắn. Không yêu cầu người mới mở công cụ kỹ thuật khó dùng mới hiểu được phần chính.

## 7. Đã kiểm tra gì và còn giới hạn nào?

Tóm tắt bằng lời: thao tác nào đã thử, trên nền tảng nào, đạt điều gì. Giải thích số kiểm thử là tổng bộ hay chỉ riêng chức năng. Mức code được chạy qua khi kiểm thử (`coverage`) không đồng nghĩa không còn lỗi. Không coi kiểm trên máy ảo là kiểm trên điện thoại thật, hoặc kiểm tự động là chủ dự án đã nghiệm thu.

Đặt thông tin sâu trong phần có thể mở ra bên dưới:

<details>
<summary>Thông tin kỹ thuật và bằng chứng kiểm thử</summary>

- Liên kết nguồn thiết kế, yêu cầu và bài kiểm tra liên quan.
- File thêm/sửa/xóa, thư viện mới và lý do; thay đổi cách triển khai hay thay yêu cầu đã chốt.
- Các cấu trúc dữ liệu, quy tắc quyền và xử lý đồng thời cần kiểm chứng sâu hơn.

| Kiểm phần nào? | Lệnh hoặc bài kiểm tra | Ngày, phiên bản, môi trường | Kết quả | Bằng chứng và giới hạn |
|---|---|---|---|---|
| Từng phần code | Điền lệnh đã chạy | | | |
| App nối máy chủ và dữ liệu | Điền khi đã kiểm | | | |
| Hành trình Android/iOS | Ghi riêng từng nền tảng | | | |
| Trình duyệt/GitHub | Phân biệt xem thử và sản phẩm phát hành | | | |

Chưa chạy thì ghi chưa chạy. Giữ ngày/phiên bản gốc khi sửa lời giải thích; không biến việc sửa báo cáo thành một lượt kiểm app mới. Nếu file bằng chứng không lưu trong Git hoặc có thể hết hạn, nêu cách chạy lại.

</details>

## 8. Phần chưa làm và bước sau

Nêu rõ chức năng còn thiếu, ảnh hưởng và liên kết checklist. Giữ các mục Pending cho tới khi được mở lại; không biến đề xuất thành quyết định. Phân biệt đã viết code, đã đẩy lên GitHub và đã phát hành cho người dùng thật.
