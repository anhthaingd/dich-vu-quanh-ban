# Thiết kế tiếp theo: thành viên và quyền doanh nghiệp

Đối chiếu ngày 16/09/2026 với FR-NFR v0.14 và wireframe v0.12. Đây là đặc tả màn hình tiếp theo dựa trên nghiệp vụ đã thống nhất, chưa phải chức năng đã triển khai. Không thay đổi chính sách tiền, point hay người sở hữu giao dịch.

## 1. Cửa hàng một quản lý và hai thợ

Người tạo cửa hàng là chủ, có thể đồng thời quản lý việc và trực tiếp làm việc. Hai thợ được cấp quyền thực hiện; người chủ nhận yêu cầu rồi giao cho một trong hai thợ hoặc tự nhận làm. Không bắt tạo tài khoản điều phối, không chờ chủ duyệt hóa đơn. Chủ/quản lý có quyền tài chính mới xem ví; quyền thực hiện không tự cấp quyền tài chính.

Chức danh hiển thị và quyền thao tác là hai dữ liệu riêng. Một người được kiêm nhiều nhóm quyền. Hệ thống có đúng một chủ tại một thời điểm, còn số quản lý không bị giới hạn bằng việc tách chức danh.

## 2. Màn hình và hành động

| Màn hình | Nội dung và hành động | FR liên quan |
|---|---|---|
| Quản lý → Thành viên | Danh sách thành viên, nhóm quyền, việc đang phụ trách; tab Lời mời; Mời thành viên chỉ xuất hiện khi đủ quyền | ORG-004, ORG-005 |
| Mời thành viên | Số điện thoại, chọn các quyền trong phạm vi được phép cấp, xem lại trước gửi; quyền quản trị/tài chính cần xác thực lại | ORG-004, ORG-005, AUTH-009 |
| Chi tiết lời mời | Người nhận xem doanh nghiệp, người mời, quyền dự kiến và hạn; xác minh đúng số rồi chấp nhận; không tự gia nhập chỉ vì được mời | ORG-005 |
| Quản lý lời mời | Trạng thái chờ, đã chấp nhận, hết hạn, đã thu hồi, đã được thay thế; gửi lại vô hiệu lời mời cũ; kiểm tra lại quyền người mời | ORG-005 |
| Chi tiết thành viên | Quyền hiện tại, việc được giao; sửa quyền và gỡ thành viên theo thẩm quyền; lưu người thay đổi, trước/sau | ORG-003, ORG-004, ORG-006 |
| Thành viên tự rời | Hiển thị tác động, xác nhận rời; không buộc đợi hoàn thành việc; chủ phải chuyển chủ hoặc đóng tổ chức trước | ORG-006 |
| Công việc cần phân công lại | Hiện việc chưa xong của người đã rời; quản lý tiếp nhận liên lạc, giao người mới; giữ nguyên tác giả hóa đơn | ORG-003, ORG-006 |
| Chuyển chủ | Chủ chọn thành viên hiện hữu, xác thực lại; người nhận xem trách nhiệm và chấp nhận sau xác thực; hạn 7 ngày; chủ cũ hủy được trước nhận | ORG-007 |

Ký hiệu ORG/AUTH trong bảng là hậu tố của mã FR tương ứng, ví dụ FR-ORG-005.

## 3. Cách trình bày quyền

Màn hình dùng các lựa chọn độc lập: Quản trị tổ chức, Quản lý công việc, Thực hiện công việc, Tài chính, Quản lý đánh giá và phản hồi, Xử lý hỗ trợ và tranh chấp. Hai quyền cuối có thể cấp kiêm nhiệm; không yêu cầu lập chức danh mới.

Người chủ mặc định có các quyền của chủ. Một quản lý chỉ cấp trong phạm vi được ủy quyền, không tự nâng quyền. Phải hiển thị tác động rõ khi cấp tài chính: xem ví và thực hiện những thao tác tiền được cho phép; không lẫn với quyền gửi hóa đơn trên việc được giao.

Nhân viên không được mở trao đổi chung của doanh nghiệp hoặc công việc chưa được giao. Người được giao mới chỉ xem phần liên quan tới việc đó. Thu hồi quyền áp dụng cả xem dữ liệu, gửi tin, hóa đơn, nhận tiền, đánh giá và chứng cứ theo phạm vi.

## 4. Trình tự giao việc và rời tổ chức

1. Doanh nghiệp chấp nhận yêu cầu; khách nhận tin hệ thống đã nhận.
2. Người quản lý việc chọn thành viên còn hiệu lực và có quyền thực hiện; khách nhận thông báo người phụ trách.
3. Nhân viên gửi hóa đơn trực tiếp sau ảnh kết quả; người hiện phụ trách xác nhận nhận tiền.
4. Nếu nhân viên rời hoặc bị gỡ, quyền tổ chức mất ngay; việc chưa hoàn tất chuyển Cần phân công lại. Không hủy hóa đơn, hoàn tiền hoặc đổi point chỉ vì nhân viên rời.
5. Người mới được giao tiếp tục theo trạng thái hóa đơn: trước khóa có thể sửa/gửi; sau khóa không sửa tiền, chỉ thực hiện phần còn lại trong quyền. Giữ người tạo và lịch sử cũ.

Việc đã hoàn tất vẫn giữ người thực hiện lịch sử; doanh nghiệp tiếp nhận liên hệ hỗ trợ. Không chuyển ví doanh nghiệp cho nhân viên, không thu phí lần hai khi đổi người.

## 5. Trường hợp phải thể hiện trong wireframe

- Gửi lời mời, chấp nhận đúng số; mở lời mời khi chưa đăng nhập hoặc đăng nhập sai số.
- Lời mời quá 7 ngày, bị thu hồi hoặc bị thay thế không thể cấp quyền.
- Người mời bị thu hồi quyền trước khi người nhận chấp nhận: kiểm tra lại, không tự cấp quyền cũ.
- Mời người đã là thành viên: không tạo thành viên trùng.
- Quản lý chỉ có quyền công việc không cấp tài chính hay quản trị cho bản thân/người khác.
- Nhân viên đang làm việc bị gỡ: mất quyền ngay; quản lý thấy Cần phân công lại; hóa đơn/tiền không đổi.
- Gỡ người phụ trách trước và sau khóa hóa đơn: người tiếp nhận có hành động đúng từng trạng thái.
- Chuyển chủ thành công chỉ có một chủ; chủ cũ không mặc định giữ quyền quản trị/tài chính.
- Chuyển chủ không đổi pháp nhân, ngân hàng, ví hoặc nợ. Lời mời chuyển chủ hết hạn/hủy không có tác động.

## 6. Ranh giới của đợt tiếp theo

Dựng màn hình thành viên, lời mời, quyền và bàn giao với dữ liệu mô phỏng trước. Luồng đóng/mở lại doanh nghiệp và hỗ trợ mất quyền chủ tiếp tục ở nhóm ngoại lệ tổ chức. Xác minh số điện thoại, thời gian hết hạn, thu hồi phiên và kiểm soát truy cập thật thuộc giai đoạn triển khai, không thể nghiệm thu chỉ bằng wireframe.

Không có quyết định nghiệp vụ mới cần người dùng chốt cho nhóm này: các quy tắc đã có trong FR-ORG-003 đến FR-ORG-007. Bố cục/quyền chọn trên màn hình là cách thể hiện cần kiểm tra khi dựng bản tương tác.

## 7. Bản tương tác v0.13 đã dựng

Đường vào: nút “MỚI · Thành viên doanh nghiệp” ở bảng điều khiển thử nghiệm, hoặc Partner → Quản lý → Thành viên và quyền khi đang ở doanh nghiệp.

Có danh sách thành viên; mời theo số điện thoại và quyền; phía người nhận kiểm tra số; hạn 7 ngày mô phỏng; thu hồi/gửi lại; sửa quyền; gỡ/tự rời; nhật ký; lọc người được phân công theo thành viên còn hiệu lực và quyền thực hiện. Gỡ người đang làm hoặc thu hồi quyền thực hiện đưa việc chưa hoàn tất về cần phân công lại, giữ nguyên hóa đơn/tiền. Quản lý công việc tách quyền truy cập ví.

Kiểm tra trực tiếp trình duyệt: tạo lời mời; sai số bị chặn; đúng số gia nhập; quá 8 ngày không chấp nhận; gửi lại tạo lời mời mới; cấp tài chính thiếu xác thực lại bị chặn; quản lý việc không thấy ví; gỡ An đang có hóa đơn 500.000đ, phân công Bình, vẫn giữ người lập An và tổng tiền cũ; An không còn truy cập công việc. Đây là bằng chứng mô phỏng giao diện, không chứng minh kiểm soát truy cập backend.

Chưa dựng chuyển chủ, đóng/mở tổ chức, xác minh số/OTP thật hoặc giao lời mời thật. Quyền đánh giá/hỗ trợ được thể hiện trên form thành viên nhưng chưa nối đầy đủ với các màn hình cũ. Chưa kiểm thử đầy đủ rời tự nguyện, thu hồi lời mời, thay quyền người mời trước chấp nhận và bàn giao sau khóa hóa đơn. Bảng đối chiếu v0.12 giữ làm mốc trước thay đổi, không phải tình trạng mới nhất của nhóm ORG.
