# DOC-063 — Rà soát luồng prototype · UI-21

27/09/2026 · React v0.15 · 52 stories · 49 kiểm tra logic đạt. Đây là kiểm chứng prototype, không phải nghiệm thu sản phẩm thật.

## Kết quả theo luồng
| Luồng | Bằng chứng đợt này | Kết quả |
|---|---|---|
| Form thuê mở trước khi admin đình chỉ | Browser: mở form Minh → đình chỉ → quay lại gửi → thông báo chặn; Công việc vẫn trống | Đã sửa và kiểm lại |
| Phân việc và chat | Doanh nghiệp nhận KV-001 → giao Dũng → thông báo → mở việc → Nhắn tin với Anh Tuấn mở đúng phòng | Đã sửa và kiểm lại |
| Đổi nhân viên | Dũng nhắn riêng → quản lý giao Hà → Dũng không còn thấy việc nhưng lịch sử chat còn nguyên | Đạt trên browser |
| Hóa đơn doanh nghiệp | Nhân viên chọn ảnh, vật tư 100.000đ, công 200.000đ → gửi trực tiếp khách | Đạt trên browser |
| Point và thanh toán | Khách dùng 80.000 point, trả 220.000đ → thợ nhận tiền → thưởng 2.933 point, mở đánh giá | Đạt trên browser |
| Ví doanh nghiệp | 500.000 + 80.000 bù point − 20.000 phí = 560.000đ, phí giữ về 0 | Đạt trên browser |
| Thông báo cho người thực hiện | Trước sửa: chỉ quản lý nhận thay đổi thanh toán. Sau sửa: quản lý và người đang được giao nhận thông báo, không nhân đôi khi tự làm | Logic tests; browser nhận cả thông báo phân công, xác nhận hóa đơn và đã thanh toán; mở đúng việc |
| Point khi mở từ thông báo | Đồng bộ ô nhập từ hóa đơn đang mở thay vì giữ ô nhập của công việc trước | Đã rà code; chưa chạy tay tổ hợp nhiều hóa đơn |
| Quyền, danh mục, khóa hóa đơn, ví/admin | 49 tests toàn bộ các model đang có; tiếp nối kiểm chứng UI-18/19/20 | Đạt test; không đồng nghĩa mọi nhánh đã thử tay |

## Các lỗi đã sửa
1. Kiểm trạng thái partner và kỹ năng tại thời điểm gửi yêu cầu, dùng hồ sơ hiện hành thay cho snapshot form. Bao phủ cả tắt nhận việc, đình chỉ, kỹ năng bị bỏ/ngừng.
2. Nút nhắn tin từ công việc phía partner mở đúng cặp người dùng; tái sử dụng khóa phòng, không tạo phòng mới mỗi việc.
3. Thông báo công việc/thanh toán gửi đến quản lý và nhân viên đang phụ trách; hỗ trợ nhân viên mới được mời. Tin nhắn riêng vẫn không gửi cho quản lý.
4. Khi mở hóa đơn từ thông báo, ô point lấy giá trị của đúng hóa đơn đó.

## Phạm vi kiểm tra
Browser chạy với dữ liệu mẫu qua thanh chuyển vai trò; không gọi API thật. Luồng hóa đơn/point hoàn tất được thử trước bản vá nối màn; các bản vá được chạy lại cho nhánh thuê, chat, phân công và quyền việc. Build Vite/Storybook cuối đạt. Kiểm bề rộng màn công việc 390px và 1440px không tràn ngang. Đây không phải visual regression toàn bộ 52 stories hoặc kiểm thử mọi kích thước.

## Chưa nghiệm thu
- OTP/SSO, bản đồ thực, gọi thoại, push, upload, lưu bền, phân quyền server và thanh toán/ngân hàng thật chưa có.
- Chưa chạy toàn bộ ma trận nhiều tài khoản đồng thời, mất mạng thực, accessibility và mọi trình duyệt/thiết bị.
- Xác minh onboarding còn dùng hồ sơ mẫu, danh mục một số fixture nối bằng tên; cần ID thống nhất ở sản phẩm thật.
- Xử lý báo cáo cho khoản giữ treo bắt buộc giải quyết trước tiền thật; hiện vẫn pending. Quảng cáo/voucher, chuyển chủ/đóng doanh nghiệp không mở lại.

## Bước kế tiếp đề xuất
Chốt bản UI sau rà soát; chuyển sang nền tảng triển khai app/API theo kiến trúc đã thống nhất: cấu trúc workspace, schema/migration, hợp đồng API, CI và kiểm thử. Đây là đề xuất bước tiếp, chưa phải xác nhận đã có backend hay phát hành.

## Đồng bộ
DOC-050, DOC-054, DOC-056/057/059/062 và tài liệu chỉ dẫn trỏ báo cáo này; registry v1.27; UI-UX-v0.19.zip cùng Drive ID. Sửa lỗi thể hiện yêu cầu hiện hành, không đổi BRD/FR/SRS/API/ERD và không thay quyết định nghiệp vụ.
