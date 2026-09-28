# Rà soát thiết kế v0.21 — Dự thảo chờ quyết định

Ngày 21/09/2026. Kết luận: quy trình cốt lõi có thể đi được trên dữ liệu mẫu, nhưng CHƯA thể kết luận toàn hệ thống trơn tru hoặc sẵn sàng phát triển theo một đặc tả đã thống nhất. Có lệch giữa tài liệu và quyết định mới, lỗi UI tái hiện, các màn chưa nối dữ liệu và phụ thuộc với phần pending. Audit không sửa nghiệp vụ hoặc tự chuyển mục pending thành scope được duyệt.

## 1. Nguồn và cách đánh giá

Đã đọc trực tiếp SRS v0.12 trên Drive; FR/NFR v0.14 gồm 127 FR, 19 NFR và 17 điểm mở; đối chiếu với mã HTML wireframe v0.21 và ux-scope-current.md. Có ảnh chụp/trạng thái UI từ lượt kiểm tra này và các lượt v0.19–v0.21 trước. Mã nguồn được giữ nguyên trong audit; dấu SHA-256 nằm trong traceability.json. Không sửa native SRS/FR hoặc tài liệu đã duyệt khi các câu hỏi còn chờ.

Nguồn:
- SRS: https://docs.google.com/document/d/1ROapXbzOCYXFDC7k5slkdr_wMZK7OjC4JbXgxKEgOY0/edit
- FR/NFR: https://docs.google.com/spreadsheets/d/10Xf7khG6wgyp0GaGnnNYqUY3lkpktdoHGRynyXmnVNM/edit
- Bản đang xét: outputs/wireframe-v0.1/index.html, nhãn v0.21.
- Tài liệu phạm vi: outputs/ux-scope-current.md đến nhóm E.

Bảng đối chiếu có một dòng cho từng FR/NFR: tiêu chí gốc, màn/chức năng liên quan, điểm mã nguồn để kiểm tra, nhận định và phần thiếu. Không quy đổi số màn hình thành tỷ lệ hoàn thành sản phẩm. Có luồng mẫu không đồng nghĩa toàn bộ AC đã đạt; không có NFR nào được nghiệm thu qua wireframe.

## 2. Kết quả đối chiếu phạm vi

127 FR: 15 có luồng mẫu trọng tâm; 77 một phần; 7 lệch tài liệu; 1 lệch dữ liệu; 1 lỗi tái hiện; 6 vướng phụ thuộc; 3 thiếu thiết kế; 17 dòng thuộc phạm vi tạm hoãn hoàn toàn. Một FR có thể chứa cả phần cơ bản và nhánh pending; khi đó xếp Một phần, không cộng trùng. Xem toàn bộ 146 dòng trong bảng đối chiếu.

Giữ nguyên pending: mục 10 chặn/báo cáo liên lạc; 15 đảo/điều chỉnh tài chính; 16 hỗ trợ nâng cao; 17 nối quyền doanh nghiệp ở đánh giá/hỗ trợ. Chuyển chủ, đóng/mở lại doanh nghiệp, OAuth và tự động rút cũng chưa được đưa trở lại.

Các phần trong phạm vi nhưng chưa đủ:
- Nhiều công việc hoạt động, nhiều kỹ năng trong một yêu cầu, nhiều ngữ cảnh doanh nghiệp. Không có yêu cầu sản phẩm giới hạn một việc như prototype.
- Hồ sơ partner mới chưa nối vào tìm kiếm/thuê mẫu; sửa kỹ năng/phạm vi ở ba partner khác với dữ liệu onboarding.
- GPS/geocoding/bán kính, kiểm tra địa điểm thuê, điểm công khai/riêng, bộ lọc khoảng cách và sao tối thiểu.
- Chat ảnh, tắt tiếng từng phòng, định nghĩa đã đọc nhiều quản lý, gọi đến/call nền và hỗ trợ sau hoàn tất.
- Thêm tài khoản ngân hàng lần đầu và trạng thái chưa xác minh; hiện mẫu bắt đầu với tài khoản đã xác minh.
- Hóa đơn quá 24 giờ từ lúc xác nhận; mã hiện liệt kê tất cả chưa hoàn tất, nhắc thủ công không thay thế quy tắc này.
- Báo cáo theo thời gian, liên hệ→xác nhận→hoàn tất, khách quay lại, partner hoạt động; sổ đối soát point/giữ/phí/nạp-rút; admin xem đủ phiên bản/ảnh/lịch sử phân công và bút toán.
- Toàn bộ nhãn/thông báo nghiệp vụ VI/EN/JA. Nhóm E chỉ là preview, chưa đủ yêu cầu 3 ngôn ngữ của phiên bản đầu.
- Quy tắc khôi phục/xóa/lưu dữ liệu, tiêu chí OS, bảo mật backend và NFR định lượng vẫn đi vào giai đoạn kỹ thuật; không tự coi là đã chốt.

## 3. Phát hiện cụ thể và hướng xử lý

F01 — Lỗi giữ dữ liệu form: nhập công100.000/vật tư50.000, gửi thiếu ảnh bị chặn nhưng form trở lại công300.000/vật tư200.000. Khi thêm ảnh và gửi, hóa đơn500.000 thay vì150.000. Tái hiện trực tiếp. Nguyên nhân ở wrapper sendPartnerInvoice gọi render ngay cả khi gửi không thành công. Sửa giữ dữ liệu khi lỗi; không cần xác nhận lại nghiệp vụ.

F02 — Giờ nhận Làm ngay: acceptJob tự cộng30phút; partner không được nhập ETA. Tái hiện trực tiếp. Không đúng SRS-JOB-002. Thêm bước nhập giờ dự kiến khi nhận; không bắt khách duyệt lại.

F03 — Quyền chat cũ trong tài liệu: FR-CHAT-004, FR-ORG-003, SRS-CHAT-003 và NFR-SEC-001 còn mô tả phần việc trong phòng doanh nghiệp. Quyết định mới là phòng riêng cặp tài khoản, giữ lịch sử/nhắn sau bàn giao/nghỉ, quản lý không đọc thay. Cập nhật các tài liệu và sơ đồ theo quyết định mới; không hỏi lại đã chốt.

F04 — Gọi sau hoàn tất/trước giao: SRS-CALL-001 cho gọi hỗ trợ sau hoàn tất và gọi quản lý trước phân công. cCanCall chặn khi bTerminal; phòng doanh nghiệp luôn bị chặn gọi. Đã thấy nút gọi disabled sau hoàn tất của thợ tự do. Cần Q2 cho đích gọi theo thiết kế phòng riêng mới.

F05 — Quyền tìm kiếm/địa điểm: guest bị che địa chỉ cửa hàng vốn công khai trong SRS; submitJob chỉ kiểm kỹ năng/trạng thái/ngày, không kiểm địa chỉ thực hiện có nằm trong vùng. Đọc mã. Sửa theo quy tắc đã chốt; Q3 chỉ chốt giá trị mặc định phạm vi tìm.

F06 — Điểm đánh giá không nối: màn đánh giá tính theo hiển thị, nhưng results/profile/bMatches vẫn dùng providers.stars/count mẫu. Ẩn/gỡ đánh giá chưa làm thay kết quả/hồ sơ như yêu cầu end-to-end. Đọc mã. Phải dùng một nguồn đánh giá.

F07 — Tắc ở ngoại lệ tài chính: dInvoiceQueue chỉ theo dõi; chưa có admin giải phóng/hoàn tất sau khóa, INV-009 chưa có thay thế sau hủy hiệu lực. saveCaseAction lại chặn đóng khi còn tiền/point giữ. Giữ tiền là đúng; thiếu bước xử lý khiến không có đường kết thúc ngoại lệ. Cần Q1; không chữa bằng nút tự sửa hóa đơn hoặc bỏ giữ tiền.

F08 — Dữ liệu chưa liền mạch: bMatches chỉ lấy partner có b.profiles; obSearch riêng ghi rõ chưa nối hồ sơ mới vào thuê. bSubmit giới hạn một việc, hire một kỹ năng. Đây là giới hạn prototype, không phải giới hạn đã duyệt cho sản phẩm.

F09 — Thông báo: email cho mọi nhóm trong cSettings lệch SRS-NOT-003 (email bổ sung cho bảo mật/khôi phục); chưa tắt tiếng từng phòng. Sửa email theo SRS; Q4 chỉ hỏi tác động tắt tiếng tới chuông gọi. Thông báo/click lịch sử nhiều việc chưa end-to-end đầy đủ.

F10 — Phần D chưa đủ cả FR: ngân hàng chưa thêm lần đầu; báo cáo không lọc thời gian; tra cứu chưa đủ ảnh/phiên bản/nhật ký phân công/bút toán; audit ghép nguồn chưa phải timeline đầy đủ. Bổ sung thiết kế, không đổi business chỉ vì bản trước đã có nút.

F11 — Ngôn ngữ và lỗi chung: eTranslate là minh họa nhãn, eStates là phòng mẫu; không có nghĩa từng màn đã có đủ lỗi thực, retry/idempotency/khôi phục draft. Phải hoàn thiện ba ngôn ngữ và trạng thái ở từng luồng trước nghiệm thu tương ứng.

## 4. Kiểm tra luồng

T01 / Đạt trong prototype, audit này: ví−90.000; công300.000→phí30.000; khách chọn100.000point, bấm xác nhận bị chặn; sang Point vẫn200.000khả dụng, không có khoản giữ. Khách chỉ thấy thông báo chung, không số nợ.

T02 / Không khớp SRS, audit này: thợ bấm Nhận công việc, nhận ngay và tự đặt giờ sau30phút. Thiếu nhập ETA.

T03 / Có lỗi, audit này: thiếu ảnh chặn gửi đúng, nhưng làm mất số tiền đã nhập như F01. Sau thêm ảnh, có thể gửi số mẫu sai mà không cảnh báo thay đổi.

T04 / Đạt luồng toàn point, audit này: gửi lại V2 công100.000/vật tư50.000; khách dùng150.000point; khóa không phải trả trực tiếp, thợ thấy Xác nhận hoàn tất. Hoàn tất: phí10.000, bù150.000; ví500.000→640.000, giữ0. Công thức Q=0. Chưa kiểm thử callback hoặc bấm đồng thời nhiều thiết bị.

T05 / Không khớp SRS, audit này: sau T04 mở Nhắn tin với khách; lịch sử giữ và nhắn được nhưng Gọi trong app disabled, trái hỗ trợ sau hoàn tất trong SRS.

T06 / Đã kiểm tra ở v0.20, không chạy lại toàn bộ ở audit này: đổi ngân hàng, admin thiếu đánh dấu đối chiếu bị chặn; duyệt rồi rút dùng ngân hàng mới; còn lệnh rút thì không đổi; tài khoản nhận cũ trên lệnh không được cập nhật theo hồ sơ.

T07 / Đã kiểm tra ở v0.19, đọc lại mã v0.21: giao An→Bình→An dùng lại đúng phòng, lịch sử An giữ; quản lý không thấy phòng riêng của An; An rời vẫn nhắn nhưng mất quyền công việc/gọi. Chưa chứng minh nhiều khách/tài khoản/nhiều công ty/backend; đây không phải kiểm thử bảo mật production.

T08 / Đã kiểm tra ở lượt trước, đọc mã hiện tại: sửa hóa đơn trước khóa có V1/V2; hóa đơn đã khóa không còn sửa thường; báo Tôi đã thanh toán tách khỏi nhận tiền. Nhánh admin xử lý sai/sửa sau khóa chưa có.

T09 / Đã kiểm tra ở v0.21, chưa toàn ma trận: VI/EN/JA preview, giữ từ khóa khi đổi ngôn ngữ, khung390px và web trong cửa sổ hiện có. Không tương đương kiểm thử iOS/Android hoặc mọi breakpoint.

Chưa có bằng chứng thật cho OTP/email, Google Maps, push/WebRTC, lưu dữ liệu, ngân hàng, giao dịch nguyên tử, cạnh tranh hai hóa đơn/rút hoặc cách ly dữ liệu nhiều khách/doanh nghiệp. Không ghi pass cho các mục đó.

## 5. Năm điểm đề nghị chốt cùng một lượt

Q1 — Phạm vi tài chính ngoại lệ trước ra mắt: đề xuất đưa trở lại một luồng admin tối thiểu: xử lý hóa đơn đã khóa/chưa quyết toán; xác minh và hoàn tất thay thợ hoặc hủy hiệu lực/giải phóng đúng khoản giữ; và đảo toàn bộ khi có sai sót sau quyết toán. Mỗi bước có giao dịch gốc, chứng cứ/lý do, xem tác động, xác thực và nhật ký. Vẫn hoãn hoàn một phần, điều chỉnh tùy ý và hỗ trợ nâng cao. Bạn đồng ý bổ sung phần tối thiểu này, hay tiếp tục pending? Nếu pending thì chưa thể chốt hệ thống sẵn sàng giao dịch công khai.

Q2 — Đầu mối gọi trong app: đề xuất trước phân công gọi người tiếp nhận của doanh nghiệp; sau giao gọi thợ phụ trách và có nút riêng gọi doanh nghiệp; sau hoàn tất vẫn gọi hỗ trợ. Nhân viên nghỉ thì yêu cầu gọi hỗ trợ doanh nghiệp chuyển về người được doanh nghiệp chỉ định, phòng chat cá nhân cũ vẫn nhắn được. Giữ quy tắc không gọi trước khi thuê được nhận, không ghi âm. Bạn đồng ý hướng này? Chọn một người tiếp nhận của công ty để tránh nhiều máy cùng nhận trong phiên bản đầu.

Q3 — Phạm vi tìm mặc định: đề xuất 5km; khách chủ động mở rộng10/20/30km khi ít kết quả. Partner vẫn phải phù hợp vùng phục vụ/hình thức/kỹ năng; không tự đưa ngoài vùng. Đây là bán kính tìm kiếm của khách, không ép mọi thợ có cùng bán kính phục vụ. Đồng ý các mức này hay muốn thay?

Q4 — Tắt tiếng phòng: đề xuất chỉ tắt push tin nhắn của phòng đó, vẫn giữ tin và thông báo công việc/hóa đơn. Chuông gọi có tùy chọn tắt riêng, không coi tắt tiếng là chặn người. Đồng ý?

Q5 — Point mặc định: đề xuất mỗi hóa đơn bắt đầu0point, khách chủ động nhập hoặc Dùng tối đa; không tự tiêu point theo lần trước. Đồng ý?

Không hỏi lại: 10% tiền công, công thức thưởng đã chốt, hai chế độ, quyền kiêm nhiệm, nhiều kỹ năng, ba ngôn ngữ, chat riêng/reuse, không duyệt hóa đơn qua quản lý, không Bắt đầu làm, một tài khoản ngân hàng, hỗ trợ08–22h, các mục pending còn lại.

## 6. Thứ tự sau phản hồi

1. Sửa lỗi dữ liệu form và ETA, nối sao đánh giá, guest địa chỉ cửa hàng, kênh email đúng quy tắc.
2. Hoàn thiện thiết kế các phần trong scope còn thiếu: nhiều việc/kỹ năng, onboarding→tìm→thuê, ngân hàng lần đầu, 24h, báo cáo/sổ tra cứu, chat ảnh, từng trạng thái lỗi và nội dung3ngôn ngữ.
3. Bổ sung nhánh được chọn từ Q1–Q5; cập nhật cùng một lần SRS/FR/điểm mở/sơ đồ và ma trận quyền, ghi rõ bản thay thế cho chat cũ.
4. Chạy lại bộ test end-to-end với nhiều người/việc, tiền0/toànpoint/mộtphầnpoint, bàn giao trước/sau khóa, các quyền doanh nghiệp và admin. Chỉ sau đó chốt baseline thiết kế và chuyển thiết kế kỹ thuật; việc hoàn thiện tích hợp/hiệu năng/security phải nghiệm thu ở giai đoạn xây dựng.

Báo cáo này là đề xuất audit. Chưa tự cập nhật các quyết định Q1–Q5 vào tài liệu chính thức, chưa sửa mã ứng dụng trong lượt này.
