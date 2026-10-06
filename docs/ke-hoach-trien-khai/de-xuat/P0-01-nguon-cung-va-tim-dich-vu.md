# P0-1 — Người cung cấp và tìm dịch vụ

06/10/2026 · DELIVERY-01 · **Đề xuất, chưa duyệt các bổ sung bên dưới.** [Thứ tự ưu tiên](../03-thu-tu-trien-khai.md) · [Checklist](../01-checklist.md). Tài liệu thuộc bộ kế hoạch trong repo; không phải báo cáo chức năng đã code hoặc spec đã chốt.

## Bạn sẽ thử được gì khi gói này hoàn tất?

Một người đăng nhập, tạo hồ sơ thợ/cửa hàng/doanh nghiệp, chọn kỹ năng từ danh mục thật, đặt giá tham khảo và nơi phục vụ, công bố rồi bật nhận việc. Người khác chọn kỹ năng và vị trí, thấy đúng người phù hợp, mở hồ sơ. Khi người cung cấp tắt nhận việc hoặc sửa vùng, kết quả tìm cập nhật theo dữ liệu máy chủ.

Gói này gồm cả hai phía cung và cầu, DB/API/app, VI/EN/JA, test và báo cáo học code. Chưa có gửi yêu cầu/nhận việc: đó là gói P0-2 ngay sau, không xen thêm tiện ích tài khoản. Các màn vẫn bám thiết kế hiện có, không thiết kế lại toàn app.

## Vì sao cần chốt một lần trước khi code cả gói?

Đã đối chiếu [API](../../technical-design/openapi.json), [quy tắc thao tác](../../technical-design/operations.json), [data design](../../technical-design/01-data-design.md), [schema](../../technical-design/schema.sql) và [luồng onboarding](../../../ui-ux/specs/account-batch.md):

- `createPartner` yêu cầu **User đã xác minh**; `createJob` yêu cầu **điện thoại đã xác minh**. OTP đang Pending cả bản local. Không thể tự sửa tài khoản hiện tại thành đã xác minh để demo.
- API sửa hồ sơ cần `expected_version`, nhưng `PartnerProfile` trả về chỉ là hồ sơ cho khách xem: không có version hoặc đủ kỹ năng/giá/vùng riêng để mở lại màn sửa. Không lấy version cố định hoặc đưa dữ liệu riêng vào hồ sơ công khai.
- UX có nháp/công bố nhưng schema/API chưa mô tả rõ trạng thái và thao tác công bố.
- Tìm theo khoảng cách đã có, nhưng cursor chung ghi `created_at,id`, không đủ giữ thứ tự khoảng cách. Khoảng cách vùng tròn và xếp hạng polygon còn ghi **đề xuất**; trọng số “đề xuất cho bạn” cũng chưa chốt.

Đây là khoảng trống cụ thể của hợp đồng giữa app và máy chủ, không phải yêu cầu duyệt từng file code. [AGENTS.md](../../../AGENTS.md) quy định: “Nếu cần thay đổi spec chưa được duyệt, trao đổi với chủ dự án trước; không tự biến phương án triển khai thành yêu cầu đã chốt.”

## Gói bổ sung đề nghị duyệt

### 1. Kiểm thử miễn phí, vẫn giữ yêu cầu xác minh

Giữ OTP/SMS/email thật và triển khai OTP local **Pending**. Cho phép tạo **tài khoản kiểm thử có điện thoại đã xác minh trong DB test tách biệt**, bằng công cụ test, để kiểm trọn luồng người cung cấp/khách. Không đổi trạng thái tài khoản đang dùng trong DB local, không thêm nút tự xác minh trong app, không có API bỏ qua xác minh. Công cụ chỉ chạy với DB test và schema thử do nó tạo, dọn dữ liệu của chính lượt thử sau kiểm.

Đề nghị làm rõ `User đã xác minh` ở đăng ký người cung cấp là **điện thoại đã xác minh**. API vẫn từ chối tài khoản thường chưa đạt điều kiện. Xác minh điện thoại của tài khoản khác với xác minh danh tính/chuyên môn của hồ sơ: hồ sơ mới luôn có nhãn **chưa xác minh**; người cung cấp không được tự đổi nhãn này.

Giới hạn phải báo rõ: bạn có thể kiểm chức năng trong môi trường thử; đăng ký người cung cấp từ tài khoản email thường vẫn bị chặn cho tới khi mở xác minh. Đây không phải bằng chứng SMS hoạt động hoặc luồng đăng ký công khai đã sẵn sàng.

### 2. Hồ sơ quản lý riêng, công bố và chống ghi đè

Giữ `GET /partners/{id}` là hồ sơ công khai. Thêm **`GET /partners/{id}/management`** cho chủ/người có quyền `profile.manage` của đúng hồ sơ; trả dữ liệu để sửa, gồm version, thông tin giới thiệu/liên hệ, kỹ năng/chế độ/giá, vùng, địa điểm/riêng tư, trạng thái công bố và nhận việc. Dùng `Me.partner_ids` để tìm hồ sơ đang tham gia; máy chủ vẫn kiểm quyền khi mở, không tin ID từ app.

Các thao tác tạo/sửa hồ sơ hiện có trả `PartnerManagement` thay vì `PartnerProfile`; kết quả cập nhật có version mới. Không trả giấy tờ, token hoặc ví trong dữ liệu này. Một version chung bảo vệ cả giới thiệu/kỹ năng/vùng/địa điểm/công bố/nhận việc. Mọi thao tác ghi kiểm quyền lại trên máy chủ, giữ cùng mã lần gửi khi thử lại và không thay snapshot của việc cũ.

Thêm `partners.publication_status = draft | published`, ban đầu draft; thêm **`PUT /partners/{id}/publication`** nhận `expected_version` và `publication_status`. Bản nháp không xuất hiện ở tìm kiếm/hồ sơ công khai. Công bố yêu cầu tên hợp lệ, ít nhất một kỹ năng đang hoạt động và nơi phục vụ hợp lệ cho từng chế độ: tại cửa hàng có địa điểm công khai, tại khách/tùy chọn có vùng phục vụ. Giá không bắt buộc; trống khác với 0đ. Ảnh năng lực chưa là điều kiện công bố trong gói đầu; upload giấy tờ/xét xác minh vẫn mở trong checklist.

Công bố **không tự bật nhận việc**. Bật nhận việc chỉ khi hồ sơ đã công bố, hợp lệ và không bị đình chỉ/ẩn. Lưu thay đổi làm hồ sơ đang công bố không còn hợp lệ thì từ chối, giữ bản trước; người dùng có thể chuyển về nháp trước khi sửa. Chuyển về nháp đồng thời tắt nhận việc. Không tự xóa việc cũ. Hồ sơ đã công bố nhưng tắt nhận việc vẫn xem được qua liên kết, không có trong kết quả tìm người đang nhận việc.

Tạo hồ sơ, owner membership và ví rỗng trong cùng giao dịch theo spec có sẵn. Ví rỗng chỉ là nền dữ liệu; không cộng số dư mẫu, không mở thanh toán/nạp/rút trong P0-1.

### 3. Tìm dịch vụ theo khoảng cách trước, đo bằng DB thật

Gói đầu dùng vị trí nhập tay hoặc địa chỉ đã lưu, bán kính mặc định **10km**, cho người dùng mở rộng; lọc ngành/kỹ năng/nơi làm/xác minh. Chưa cần mua bản đồ hoặc dịch vụ GPS/geocode. Tất cả điều kiện kỹ năng, trạng thái và vùng được lọc **trước** phân trang/xếp hạng.

Đề nghị chốt khoảng cách: tại cửa hàng đo tới địa điểm công khai gần nhất phù hợp; tại khách/tùy chọn dùng vùng tròn, vị trí khách phải nằm trong vùng và tâm vùng phải nằm trong bán kính tìm đã chọn. UI ghi rõ **khoảng cách tới tâm vùng phục vụ**, không gọi là vị trí hiện tại của thợ. Chọn một kết quả tốt nhất cho mỗi hồ sơ, không nhân đôi khi nhiều kỹ năng/vùng/địa điểm phù hợp.

Đợt đầu chọn `sort=distance`, mặc định khoảng cách tăng dần, hòa thì `created_at,id`; cursor ký gắn toàn bộ bộ lọc và giá trị cuối của thứ tự này. Thay bộ lọc phải bắt đầu trang đầu. Không tự tạo điểm xếp hạng “đề xuất”. Polygon, bản đồ/GPS, xếp hạng theo đánh giá/đề xuất giữ chưa triển khai, không trả kết quả giả hoặc tự thay bằng sort khác nếu client yêu cầu phần chưa hỗ trợ. Trong báo cáo vẫn để B03-01 **một phần** cho tới khi đủ phạm vi.

Hồ sơ public giữ thông tin tối thiểu; địa chỉ riêng/giấy tờ/ví không đi ra ngoài. Liên hệ chỉ trả khi đăng nhập hợp lệ. Khi chưa có chức năng thuê/chat thật, không dựng nút báo thành công giả; nối chúng ở P0-2.

## Thực hiện sau khi duyệt, không hỏi lại từng bước

1. Đồng bộ đúng phần API/data/UX/QA bị tác động và sổ quản lý theo AGENTS; không tải bộ báo cáo lên Drive.
2. Migration mới cho nguồn cung/quyền/ví cần thiết, giữ tài khoản và danh mục hiện tại. Công cụ test tách biệt kiểm quyền người chưa xác minh/chủ/người ngoài, rollback và cạnh tranh.
3. Module partner quản lý hồ sơ, công bố, nhận việc; app onboarding/editor có tải lại và lỗi version/thử lại. Dùng dữ liệu danh mục thật, không chép catalog mẫu của prototype.
4. Module tìm kiếm PostGIS, danh sách và hồ sơ khách; nối từ màn chọn kỹ năng hiện có. Dùng fixture test rõ tên cho E2E, không nạp provider tưởng là thật vào DB làm việc.
5. Kiểm hai tài khoản xuyên app/API/DB; chạy Android và iOS, tình huống mạng lỗi/trả kết quả cũ/đổi ngôn ngữ/riêng tư. Tạo báo cáo học code một gói, cập nhật checklist theo đúng phần đã kiểm.

## Tiêu chí kiểm gói P0-1

- Tạo/sửa/mở lại giữ dữ liệu; retry cùng yêu cầu không tạo hai hồ sơ; version cũ không ghi đè; thất bại giữa giao dịch không để hồ sơ mồ côi.
- Người ngoài không đọc màn quản lý hoặc sửa hồ sơ; phiên thu hồi/tài khoản bị khóa bị chặn; tài khoản chưa xác minh không được tạo.
- Hồ sơ nháp/tắt nhận việc/đình chỉ và kỹ năng ngừng hoạt động không lọt tìm kiếm. Biên bán kính/vùng dùng phép tính PostGIS, không khoảng cách cứng trong UI.
- Phân trang không lặp trên tập dữ liệu không đổi; cursor khác bộ lọc hoặc sửa nội dung bị từ chối. Kết quả cũ không đè kết quả mới khi đổi vị trí/bộ lọc.
- Không rò dữ liệu riêng; bộ test có nhiều địa điểm/kỹ năng để bắt trường hợp khớp sai giữa kỹ năng và chế độ làm việc.
- Đạt DB/API/mobile/web và native từng nền tảng được ghi riêng; chưa UAT hoặc chưa gửi SMS thật luôn ghi rõ.

Các tên file mới sẽ theo `features/partners`, `features/search`, `modules/partners`, `modules/search` khi có code thực tế. Không tạo sẵn package/framework/microservice hoặc folder trống. Bản đề xuất này chưa thay các nguồn spec; sau duyệt mới cập nhật phiên bản và trạng thái quyết định.
