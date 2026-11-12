# Checklist chức năng và bằng chứng

## B00-30 — Tổng kết deploy AWS-02, 11/11/2026

- [x] Ghi việc đã làm: AWS account/credits, DNS/ACM, Resend/LiveKit/Expo, Terraform lab và các endpoint đã phát hành.
- [x] Đối chiếu task API revision 7, image digest, HTTPS checks và trạng thái UAT từ receipt phát hành cục bộ.
- [x] Nêu rõ đăng ký ngoài pilot đã bật nhưng inbox UAT, thiết bị thật, full UAT và đối chiếu Billing sau vận hành còn chờ.
- [x] [Tài liệu tổng kết](bao-cao/B00-30-tong-ket-deploy-aws02.md); cập nhật mục lục và inventory. Không đưa secrets/state vào tài liệu.
- [x] Kiểm lại tối 11/11, chỉ đọc: web live tải đủ danh mục (11 request 200, CORS đạt, có ảnh); ECS rev 7 COMPLETED; không NAT/EC2 đang chạy; Budgets $0.446 và $0.00 trên $20 (Billing có thể trễ ~24 giờ).
- [x] SDD toàn dự án chạy lại đạt 12/12 bước, web E2E 35/35; `verify` ĐẠT trước khi sửa tài liệu. Sau khi sửa docs, bằng chứng local không còn khớp hash; cần CI `SDD project` trên commit mới.
- [ ] Đối chiếu Billing/credits sau khi AWS cập nhật; chu kỳ `lab:down` và kiểm tài nguyên còn sót.

## B00-29 — Mở đăng ký email lab, 11/11/2026

- [x] Chủ dự án cho phép mọi email hợp lệ đăng ký và nhận thư giao dịch trong lab; giữ OTP/quota, SMS và admin riêng.
- [x] Cờ cấu hình mặc định đóng; unit 12/12, tooling 30/30, luồng email với DB test đạt trước phát hành.
- [x] [Báo cáo học code B00-29](bao-cao/B00-29-mo-dang-ky-email-lab.md); không tự đồng bộ Drive/ui-ux hoặc sửa spec gốc.
- [ ] UAT hai hộp thư thật và kiểm delivery trên Resend; không suy ra inbox delivery từ test local.
- SDD toàn dự án: đọc evidence/verify của nguồn hiện hành. Phát hành AWS đọc receipt riêng; không coi thay code là đã deploy.


## B00-28 — Ổn định bộ chọn địa điểm Android, 10/11/2026

- [x] Tái hiện chân màn hình nhảy 189 px khi thanh nhập nổi mở; sửa Android không tự co chiều cao lần hai.
- [x] Hồi quy đỏ trước sửa, sau sửa 10/10 picker/draft đạt; đo 6 mẫu native ổn định; Android chọn/hủy và iOS chọn/xác nhận được.
- [x] [Báo cáo và ảnh B00-28](bao-cao/B00-28-sua-nhap-nhay-chon-dia-diem.md); inventory thêm đúng báo cáo/ảnh, không đổi tiêu chí. SDD dùng evidence/verify của nguồn hiện hành.
- [ ] Full SDD/verify: chủ dự án tự chạy theo yêu cầu; lượt của agent đã dừng ở tooling, chưa có evidence hoàn tất.
- [ ] Điện thoại thật, các kiểu bàn phím còn lại, UAT và CI remote của bản sửa.

## B00-27 — Cô lập môi trường test API, 10/11/2026

- [x] Tái hiện lỗi khởi động khi terminal export khóa LiveKit giả; hồi quy đỏ trước sửa và đạt sau sửa.
- [x] Giữ biến hệ thống/coverage, chỉ nhận cấu hình ứng dụng từ fixture; bổ sung output/mã thoát vào lỗi khởi động. Cả 5 bài lifecycle đạt dưới c8 với biến deploy giả.
- [x] Ghi [báo cáo học code B00-27](bao-cao/B00-27-sua-moi-truong-test-api.md); kết quả toàn SDD đọc từ evidence và verify của nguồn hiện hành, không suy từ kiểm riêng.
- [ ] CI remote, native, UAT và deploy không thuộc bằng chứng đợt sửa test này.

## B00-26 — Tài liệu học deploy AWS-02, 09/11/2026

- [x] Ghi lại hành trình và giải thích cấu hình trong [bộ học deploy](hoc-deploy-aws02/README.md), tách trạng thái thực tế khỏi hướng dẫn bước sau.
- [x] Tại thời điểm 09/11, account/credit/advanced features có bằng chứng hội thoại; CLI đọc được VPC Singapore; ACM đúng account/us-east-1 đang Pending validation.
- [x] Ghi lại lịch sử cấu hình trong [B00-26](bao-cao/B00-26-tai-lieu-hoc-deploy.md); trạng thái deploy mới hơn đã được cập nhật trong [B00-30](bao-cao/B00-30-tong-ket-deploy-aws02.md).
- [ ] Mốc checklist ngày 09/11: CNAME Cloudflare/ACM Issued, provider/config/plan/apply và nghiệm thu lab thật chưa được xác nhận khi báo cáo được tạo; trạng thái sau đó xem B00-30.
- [ ] Dọn/audit chu kỳ lab và kiểm Billing sau dọn.
- Kết quả kiểm bộ tài liệu ở [B00-26](bao-cao/B00-26-tai-lieu-hoc-deploy.md); không đổi trạng thái nghiệm thu code/native/UAT của các đợt trước.

## B00-25 — Sửa lỗi trước deploy, 06/11/2026

- [x] Bổ sung 10/11: đọc trace CI `42764634309`, sửa bước chuẩn bị nhấn/thả để tránh bấm vào thanh điều hướng; giữ nguyên assertions và retries=0. Kết quả toàn bộ phải theo CI commit cuối.

- [x] Tái hiện mất chọn ngày khi tải xong giữa nhấn/thả; sửa nhãn tải trùng và giữ bài hồi quy đủ trang/đổi lịch/hai phạm vi.
- [x] Sửa cấu hình nhận file Firebase từ EAS; cập nhật hướng dẫn môi trường preview và kiểm fallback local.
- [x] Tái hiện NATIVE-05 (2/10 lượt debug), đối chiếu upstream #4413, áp dụng bản vá đúng 4.26.0 và build APK mới.
- [x] Kiểm media local thật với âm DEMO hai chiều, mute/unmute, end/logout và token cũ; không thay LiveKit Cloud/máy thật.
- [x] APK debug sau vá: 30/30 cold-start không crash; native call instrumentation đạt; Docker API build đạt. [B00-25](bao-cao/B00-25-sua-loi-truoc-deploy.md) giữ bằng chứng trước/sau.
- [~] SDD local/CI: dùng evidence và `verify` khớp nguồn hiện tại; CI cho commit mới chưa có. Không dùng lượt SDD trước sửa thay bằng chứng.
- [ ] EAS/FCM/LiveKit Cloud thực, hai điện thoại, CI commit mới và UAT.


## AWS-02 — Lab với iimissher.com, 05/11/2026

- [x] Bổ sung [kế hoạch realtime/gọi thoại/push và dự toán](de-xuat/AWS-02-lab-khong-phi-khi-tat.md#8-bổ-sung-chat-realtime-gọi-thoại-và-thông-báo-nền): ưu tiên một API + LiveKit Build + Expo Push, 5–10 USD/tháng cho giả định 30 giờ tài nguyên; chưa phải hóa đơn hoặc code cloud đã bật.
- [ ] Kiểm chính sách phòng/token LiveKit Cloud, triển khai realtime một task và gọi thoại hai máy khác mạng; chưa được chỉ đổi cờ cấu hình.
- [ ] Push và nhận cuộc gọi nền/khóa màn/đóng app trên Android/iOS thật; ghi bằng chứng từng trạng thái, không suy ra từ gọi foreground.
- [ ] Mở rộng dọn/audit phiên media và đo AWS Billing/LiveKit usage; giữ quota miễn phí và không tự nâng gói.
- [x] Root Terraform lab riêng, state local, domain Cloudflare, CloudFront → ALB private, xóa dữ liệu thử; bảo vệ pilot giữ nguyên.
- [x] Công cụ init/up/down/status/admin, kiểm account/state/DNS sở hữu, khóa đồng thời và journal; gửi secret qua stdin.
- [x] Kiểm proxy HTTP: hai hop, quota theo client, giả header không vượt hạn mức; giữ pilot/local.
- [x] Terraform validate/mock và kiểm tooling local; chi tiết và lệnh ở [B00-20](bao-cao/B00-20-lab-aws02.md).
- Kết quả toàn repo đọc từ SDD evidence khớp nguồn cuối; không dùng test riêng thay SDD hoặc AWS live.
- [ ] Chủ tài khoản cấu hình SSO/ACM/SES/Cloudflare, review plan và chi phí.
- [ ] Hai chu kỳ dựng/thử/dọn AWS thật; kiểm đủ quyền audit và Billing sau dọn. Chưa chứng minh không có phí khi nghỉ.
- [ ] Commit/push, CI mới, native distribution và UAT theo phạm vi được chủ dự án cho phép.

## B00-14 — Cập nhật báo cáo tổng UX-02, 05/11/2026

- [x] Theo yêu cầu chủ dự án: cập nhật catalog, HTML/JSON, ledger ảnh, mô tả đường vào/nút và liên kết B00-19; 141 mục, giữ đủ route hiện có.
- [x] Sau phản hồi về ảnh cũ: chụp lại 80 ảnh quản trị/Tài khoản trên Android và iOS ngày 05/11; thay ảnh trước thay đổi trong B00-14. Đủ 282 vị trí native; ảnh web không thay native. Giữ NATIVE-05 còn mở và ngày kiểm riêng của các màn ngoài UX-02.
- Kết quả kiểm giao diện báo cáo và SDD theo bộ nguồn cuối: [B00-14](bao-cao/B00-14-bao-cao-man-hinh.md). Không mở thêm phạm vi đồng bộ Drive/Excel/`ui-ux`.


## UX-02 — Triển khai sau duyệt, 05/11/2026

- [x] Chủ dự án duyệt implement cả web/mobile và lời mời 7 ngày, xác minh đúng email, MFA, gửi lại/hủy, hộp thư local.
- [x] Nối migration/API/app cho Tổng quan, hỗ trợ, nhân sự có sẵn và lời mời; bảo toàn quyền backend, nhật ký, phiên bản và gửi lại không trùng.
- [x] Kiểm API/mobile/web tập trung; thư Mailpit local; áp dụng migration 025 có sao lưu DB local.
- [x] Chụp app chạy trên web, iOS Simulator và Android Emulator; sơ đồ Mermaid đã render. [B00-19](bao-cao/B00-19-trien-khai-quan-tri.md).
- [x] Review inventory/route/QA-110/4 tiêu chí mới; giữ QA partial/unmapped và khoảng trống OpenAPI. Kết quả hồi quy toàn repo nằm trong SDD evidence khớp nguồn hiện tại, xem B00-19.
- 05/11, hậu kiểm push không infra: CI đầu đạt mobile/API/build, web 31/32 do race giữa polling phát hiện hết phiên và nút tải lại. Đã đồng bộ thời điểm thu hồi trong test, kiểm local 3/3; giữ lượt CI lỗi và theo dõi check của commit cuối tại [B00-19](bao-cao/B00-19-trien-khai-quan-tri.md).
- [ ] Kiểm toàn bộ hành trình trên thiết bị thật, CI remote và UAT chủ dự án; chưa bật email bên ngoài/production.

Các mục thiết kế dưới đây giữ bằng chứng lịch sử; phê duyệt và triển khai mới được ghi ở mục này. D04 ngoài phạm vi hỗ trợ và PROMO-02 vẫn chưa mở.

## UX-02 — Thiết kế quản trị trước khi áp dụng, 04/11/2026

- [x] 05/11: bổ sung hai cách thêm quản trị viên theo yêu cầu; kiểm nháp/đầu vào/trùng/lời mời chờ và bố cục mobile; hướng dẫn bản mẫu nằm ngoài menu app. Chỉ thiết kế, chưa gửi email/cấp quyền thật.
- [x] Dựng [HTML tương tác](de-xuat/UX-02-quan-tri.html) cho web và điện thoại: Tổng quan, hàng đợi, chi tiết hỗ trợ và quyền truy cập.
- [x] Kiểm thao tác, quyền chỉ xem, xác nhận/lỗi thử lại, bố cục 360–1440 px và mở file offline; [ảnh và giới hạn B00-18](bao-cao/B00-18-ban-thiet-ke-quan-tri.md).
- [x] Cập nhật inventory cho tài liệu/bản mẫu/ảnh; không đổi tiêu chí hoặc nguồn chuẩn.
- [ ] Chủ dự án duyệt bố cục/hành vi và chốt phần cần đối chiếu API; D04 chưa được phê duyệt.
- [ ] Áp dụng vào code ứng dụng và kiểm native/CI/UAT sau duyệt; chưa thực hiện trong đợt thiết kế.
- 05/11: kiểm HTML mới đạt; SDD toàn repo **chưa đạt** do 1/31 bài web đánh giá lỗi định vị hai phần tử. Chạy lại riêng đạt nhưng không thay lượt SDD bị dừng; `verify` thiếu evidence, ba bước sau web chưa chạy. [Chi tiết B00-18](bao-cao/B00-18-ban-thiet-ke-quan-tri.md).

## UX-01 — Sửa lỗi sau audit, 04/11/2026

- [x] Bỏ màn danh mục cũ theo duyệt; giữ bộ lọc hiện hành và các test liên quan.
- [x] Sửa mã lỗi/đóng cuộc gọi, tải xác minh, màn chi tiết ví và định dạng sao; kiểm native hai nền tảng trên dvqb_local.
- [x] Chuẩn hóa runner media local; kiểm kết nối/tắt mic/kết thúc, không còn khóa cuộc gọi.
- [x] Cập nhật ảnh, báo cáo B00-14/B00-17 và inventory/ánh xạ kiểm thử.
- [ ] NATIVE-05: tìm nguyên nhân và chứng minh bản sửa crash Android.
- SDD toàn dự án: kết quả nằm trong evidence khớp nguồn, xem B00-17; không tự đóng QA partial/unmapped, CI hoặc UAT.

**04/11/2026 — Sửa các lỗi sau audit native:** [B00-17](bao-cao/B00-17-sua-loi-sau-audit-native.md) ghi các bản sửa gọi/xác minh/chi tiết ví/điểm sao và bằng chứng Android–iOS trên `dvqb_local`. Bỏ CatalogCategory theo duyệt; [B00-14](bao-cao/B00-14-bao-cao-man-hinh.html) còn 134 mục, đủ 268 ảnh chính. NATIVE-05 vẫn mở: release 10 lần khởi động chưa tái hiện, chưa chứng minh đã hết crash. Code local chưa có CI/push/UAT mới; xem evidence SDD theo nguồn hiện tại.


**Mốc lịch sử 02/11/2026 — Chụp lại báo cáo tổng sau UX-01 (được cập nhật ở B00-17):** [B00-14](bao-cao/B00-14-bao-cao-man-hinh.html) có **268 ảnh chính, 134/135 mục trên cả Android và iOS**, cộng 2 ảnh lỗi xác minh. Mục CatalogCategory chưa có đường vào hiện hành. [Bảng 6 vấn đề](bao-cao/B00-14-bao-cao-man-hinh.md) tách lỗi/cấu hình/điểm vướng; có bộ lọc riêng trong HTML. Dùng `dvqb_local`, không reset dữ liệu; không coi chụp ảnh là đã kiểm mọi nút, thiết bị thật hoặc UAT. Ảnh cũ trước UX-01 đã dọn ở đợt trước; không đồng bộ Drive/`ui-ux`.

## UX-01 — Áp dụng bản thiết kế đã duyệt, 02/11/2026

- [x] Chủ dự án duyệt giao diện HTML và yêu cầu sửa app; D01–D04 chưa được duyệt.
- [x] Áp dụng bố cục, thanh hành động, lọc nháp, phân cấp nút và giữ quyền/API hiện hành. [B00-15](bao-cao/B00-15-toi-uu-trai-nghiem.md).
- [x] Kiểm logic toàn app, lint/typecheck; review lỗi giữ nháp/thử lại và trạng thái tài chính.
- Bằng chứng native sau sửa và giới hạn: mục 7 B00-15. Không dùng ảnh cũ hoặc số test để đóng toàn bộ audit 444 mô tả nút.
- SDD cuối dùng report/verify có snapshot khớp trong `test-results/sdd/SDD-PROJECT/`; CI/UAT chưa thực hiện cho bộ code này.


## UX-01 — Bản thiết kế để duyệt, 02/11/2026

- [x] Dựng [HTML tương tác](de-xuat/UX-01-thiet-ke-giao-dien.html): 30 màn mẫu, 7 vai, lọc/tìm màn, khung iPhone/Android, giải thích nút và tình huống.
- [x] Kiểm luồng HTML chính và hiển thị danh mục theo vai trên trình duyệt; [phạm vi và giới hạn B00-16](bao-cao/B00-16-ban-thiet-ke-ux01.md). Không thay kiểm native/DB.
- [ ] Chủ dự án duyệt thiết kế và phạm vi áp dụng vào code. Chưa triển khai app/API hoặc chốt D01–D04 từ bản mẫu.

## UX-01 — Rà native đang thực hiện; sửa sản phẩm vẫn chờ duyệt, 31/10–01/11/2026

- [x] Lập [kế hoạch chi tiết](de-xuat/UX-01-toi-uu-luong-va-nut.md) và [danh mục 30 nhóm tối ưu, ánh xạ đủ 135 mục B00-14](de-xuat/UX-01-danh-muc-man-va-nut.md); ghi mức kiểm source/ảnh/danh mục, không coi là đã kiểm lại tất cả nút trên native.
- [x] Chủ dự án giao kiểm lại native trước khi chốt sửa; dùng `dvqb_local`, backup trước audit và bổ sung 10 ca UX-01 qua API thật, không reset DB.
- [x] Tạo [bảng lọc bằng chứng từng mô tả nút](bao-cao/UX-01-kiem-nut-native.html) và [kết quả/giới hạn audit](de-xuat/UX-01-ket-qua-ra-soat-native.md); tách ghi có kiểm DB, điều hướng/form, bất tiện và chưa kiểm.
- [x] Kiểm bộ lọc/liên kết/ảnh và SDD prepare; giữ riêng kết quả native với hồi quy fixture.
- [ ] SDD verify mới: chưa đạt; lượt toàn dự án dừng ở API sau khoảng 10 phút, chưa có báo cáo API/evidence hợp lệ. Lint/typecheck/tooling/mobile đã đạt trước đó.
- [ ] Đóng toàn bộ ma trận native: chưa đạt; đã ghi nhận kết quả lượt này, các mục chưa kiểm/kiểm một phần vẫn mở.
- [ ] Chủ dự án duyệt phạm vi và D01–D04 (API lịch, lịch sử chat, lọc công việc và dữ liệu nhận diện admin).
- [ ] Đo baseline, đối chiếu nút theo vai/quyền/trạng thái trên `dvqb_local`; triển khai các gói 1–5 theo kế hoạch.
- [ ] Kiểm Android/iOS, hồi quy, SDD mới; cập nhật báo cáo trước/sau, ảnh và giới hạn; UAT ghi riêng.

Đợt hiện tại chỉ audit và chỉnh mức chắc chắn của kế hoạch; chưa sửa UI/API. Có ghi dữ liệu mô phỏng qua native trên `dvqb_local` và đối chiếu DB. Các thay đổi sản phẩm/hạ tầng có trước được giữ nguyên. Không commit/push/deploy hoặc đồng bộ Drive/`ui-ux`.

## B00-13 / B00-14 — Dữ liệu và báo cáo màn hình, 30/10/2026

- [x] Theo lựa chọn của chủ dự án, dùng `dvqb_local`; backup trước seed, nạp bổ sung có định danh ổn định và kiểm giữ dữ liệu có trước. [B00-13](bao-cao/B00-13-du-lieu-van-hanh-local.md).
- [x] Bổ sung 252 tài khoản, 72 hồ sơ, 1.008 công việc và dữ liệu liên quan; kiểm sổ cái, hóa đơn, quyền, đánh giá/ảnh, quan hệ đội ngũ và vùng phục vụ.
- [x] Chạy một công việc mới qua API thật đến hoàn tất/quyết toán; kiểm truy cập chéo và hóa đơn nháp; tổng hiện tại 1.009 công việc. Không reset DB ứng dụng.
- [x] Sửa mã tham chiếu rỗng của dòng Point khởi tạo cho đúng hợp đồng UUID; kiểm hồi quy hóa đơn/sổ cái và 93 kiểm API trên dữ liệu hiện tại đạt. Không đổi số dư hoặc công thức tiền.
- [x] Kiểm kê 27 route cùng nhánh quản trị/hỗ trợ hạn chế, giải thích 135 màn/tab/trạng thái theo 9 luồng; báo cáo có tìm kiếm, bộ lọc kết hợp và hướng dẫn từng bước. [HTML](bao-cao/B00-14-bao-cao-man-hinh.html) · [Bằng chứng và giới hạn](bao-cao/B00-14-bao-cao-man-hinh.md).
- [x] Ngày 02/11 chụp lại 134/135 mục trên cả Android Emulator và iOS Simulator: 268 ảnh chính + 2 ảnh lỗi xác minh; ledger đủ 270 vị trí, CatalogCategory thiếu đường vào có lý do cụ thể. Bảng 6 vấn đề và lọc ảnh có lỗi/không thể chụp đã bổ sung. Ảnh dùng `dvqb_local`, không thay ảnh thiếu bằng web.
- [ ] Chứng nhận toàn bộ trạng thái trên cả hai nền tảng, thiết bị vật lý, tiếng Anh/Nhật, provider thật và UAT: chưa đạt; giữ rõ phần thiếu trong báo cáo.
- SDD chạy với database kiểm thử riêng, ảnh và kiểm vận hành dùng `dvqb_local`. Không commit/push, triển khai AWS, đồng bộ Drive hoặc `ui-ux` trong đợt này.


## AWS-02 — Môi trường học không giữ phí sau khi dọn, 29/10/2026

- [x] Theo yêu cầu mới: xem xét tính khả thi và lập [kế hoạch thay thế AWS-01](de-xuat/AWS-02-lab-khong-phi-khi-tat.md); mục tiêu không có phí lab mới sau khi AWS dọn xong, không hứa hóa đơn bằng 0 ngay khi bấm tắt.
- [x] Bỏ yêu cầu domain/hosted zone, state S3 và lưu image/backup trên AWS giữa các buổi khỏi kế hoạch lab; giữ code/state/config/build ở máy, ghi rõ dữ liệu thử bị xóa và Billing có độ trễ.
- [x] Đánh dấu hướng dẫn/runbook/báo cáo pilot cũ để tránh chạy nhầm; giữ bảo vệ và code pilot hiện có, không đồng bộ Drive/ui-ux.
- [ ] Triển khai root lab/backend local, HTTPS không mua domain, xử lý proxy/cache/CORS theo đường CloudFront mới; giữ guard pilot.
- [ ] Triển khai các thao tác tạo/dọn/kiểm, retry khi deploy dở, danh sách ID/ARN thật, kiểm account và tài nguyên có phí còn sót.
- [ ] Kiểm AWS thật hai vòng dựng/dọn, đối chiếu kỳ sử dụng trong Billing và cập nhật hướng dẫn lab trước khi bàn giao lệnh chạy cho chủ dự án.
- Chưa có lệnh lab, chưa tạo/xóa tài nguyên AWS, chưa commit/push/CI mới. Dự toán pilot bên dưới không phải chi phí cố định của lab.

## B00-12 / AWS-01 — Chuẩn bị hạ tầng cloud, 28/10/2026

- [x] Theo ủy quyền chủ dự án: nghiên cứu nguồn chính thức, chọn cấu hình khoảng 10 người, dự trù giá và đường mở rộng. [Thiết kế](de-xuat/AWS-01-ha-tang-pilot.md).
- [x] Terraform mạng/HTTPS/WAF/Fargate/RDS/S3/CloudFront, secret/IAM/backup/cảnh báo; bootstrap mặc định không khởi động API.
- [x] S3/SES/SNS tùy chọn, email/phone allowlist, admin cloud, DB TLS và runtime role; giữ phone verification, ACL và MFA.
- [x] Image production boot trong local TLS PostGIS, không root/read-only; Terraform mock, API unit/integration đạt phạm vi ghi trong [báo cáo](bao-cao/B00-12-ha-tang-aws.md).
- [x] [Runbook](../../infra/aws/README.md) cho setup, migration trước rollout, publish web/native, rollback, restore và cấu hình cần chủ dự án.
- [x] 29/10/2026: [hướng dẫn từng bước dành cho chủ dự án](../../infra/aws/HUONG-DAN-TUNG-BUOC.md), có màn hình/giá trị/cách kiểm, lưu ý Free plan/SSO, chi phí, chốt phiên bản code, đường dùng web và cài native. Đây là bàn giao hướng dẫn, chưa đánh dấu các bước AWS live đã làm.
- [x] Hậu kiểm IP tra cứu địa chỉ: hai client sau cùng proxy có hạn mức riêng; giả phần đầu X-Forwarded-For hoặc giả header khi local không vượt được hạn mức. Đã kiểm HTTP local với provider giả; chưa ALB live.
- Inventory/source/criterion cloud được bổ sung; kết quả SDD toàn repo phải đọc từ evidence/verify đúng dấu băm bộ file cuối, không suy ra từ kiểm API riêng.
- [ ] Tạo tài nguyên AWS, provider/key/domain thật, quota và IAM live, restore AWS/load thực, native phân phối/thiết bị, UAT và remote CI mới: chưa thực hiện; theo yêu cầu chủ dự án sẽ cấu hình phần tài khoản thật sau.
- Không đồng bộ Drive/ui-ux; không mở tiền thật, push/calls cloud hoặc PROMO-02. Chưa commit/push đợt infra.


## B00-11 — Áp dụng giao diện, 28/10/2026

- [x] Chủ dự án duyệt triển khai từ B00-10: mũi tên không chữ, ẩn trên màn gốc; giữ quyền và nghiệp vụ/API.
- [x] Áp dụng khung chung, tìm dịch vụ, hồ sơ, công việc, chat, hóa đơn, Ví, Tài khoản và menu quản trị desktop. [Báo cáo/ảnh](bao-cao/B00-11-trien-khai-giao-dien.md).
- [x] Bổ sung kiểm Point từ API và lỗi lưu ngôn ngữ trùng lúc xác thực phiên; giữ retry, bản nháp và hai dấu thanh toán.
- [x] 349 test mobile và 10 hành trình web liên quan đạt; iOS Simulator đạt shell/jobs, Android Emulator đạt jobs; ảnh và giới hạn trong báo cáo.
- [x] Inventory và SDD prepare đạt; báo cáo ghi cách chạy/đọc evidence SDD cuối đúng working tree, tách khỏi native/CI/UAT.
- [ ] Thiết bị vật lý, UAT, commit/push và CI mới: chưa thực hiện.


## B00-10 — Rà soát bảo mật và giao diện, 23/10/2026

- [x] 28/10: sửa riêng bản thiết kế theo duyệt — mũi tên không chữ, ẩn ở màn gốc, cùng hàng tiêu đề; quay về đúng nguồn mở, kiểm desktop/mobile/file/Live Server và chụp ảnh HTML. Chưa áp dụng vào app.

- [x] Đối chiếu CI đúng commit; tải trace của run `39910748394`, sửa lỗi nút dịch chuyển khi đọc nền.
- [x] Sửa hash mật khẩu mới trước proof, có kiểm RED/GREEN; cập nhật dependency có bản vá và giữ cảnh báo tồn đọng.
- [x] Chuẩn bị [báo cáo, ảnh DEMO và đề xuất tương tác](bao-cao/B00-10-ra-soat-bao-mat-va-giao-dien.md); chưa áp dụng thiết kế mới vào app.
- [x] Sửa liên kết chuyển màn bên trong bản HTML: tab, hồ sơ, công việc/chat/hóa đơn, avatar và ví; kiểm 7 màn với JavaScript bật/tắt, bàn phím, Back/Forward và màn hẹp. Mục chưa mô phỏng được ghi rõ; admin vẫn là bố cục tĩnh.
- [x] Web local độc lập 31/31; native 14/14 flow iOS simulator và 14/14 Android emulator. Sửa thêm lưu tên sau đổi locale và bàn phím địa điểm; không lấy web thay native/UAT.
- [x] Cô lập worker thông báo khỏi hàng rào đếm đúng hai actor trong bài API đổi lịch đồng thời; giữ kiểm 200/409 và lịch sử ghi một lần.
- SDD giữ 151 tiêu chí và QA 96 partial/12 unmapped; kết quả bộ file cuối đọc từ evidence và verify đúng fingerprint, không thay bằng số kiểm tập trung.
- [ ] Chủ dự án chốt thiết kế; commit/push sửa đợt này và CI mới; thiết bị vật lý/UAT/production.

LOCAL-01 đã có commit `1d925ce` trên nhánh remote, nhưng CI tương ứng thất bại. Dòng chưa push trong checklist cũ là trạng thái lịch sử.

## LOCAL-01 — Hoàn thiện local, 23/10/2026

- [x] Chat/đánh giá nhận ý định lúc đọc nền, giữ nội dung/phiên bản/khóa; hủy khi rời màn hoặc đổi tài khoản.
- [x] Đích sau đăng nhập và `dvqb://` chỉ mang ID hợp lệ, đọc lại quyền, không tự gửi thuê/tiền; kiểm cold/warm bằng navigation.
- [x] Chọn hồ sơ chủ/nhân viên/khách theo UI-16; tab ví đúng vai, API quyết định quyền, logout xóa lựa chọn.
- [x] `GET /admin/audit` theo contract hiện hành; quyền/MFA/cursor/bộ lọc và projection không trả details; màn desktop/mobile VI/EN/JA.
- [x] Hành trình web local: role/wallet, đổi ngôn ngữ, offline và logout; admin đọc/lọc/khóa phiên.
- [x] Native Android emulator/iOS simulator: vai chủ, ví, VI/EN/JA, font lớn, mở nóng/mở nguội qua development launcher. Ảnh và giới hạn chi tiết: [B00-09](bao-cao/B00-09-luong-local-va-dieu-huong.md); nhật ký: [B11-04](bao-cao/B11-04-nhat-ky-admin-tong-hop.md).
- SDD: giữ 144 tiêu chí, thêm 7 tiêu chí được review thành 151; QA 96 partial/12 unmapped. Kết quả toàn bộ đọc từ evidence và verify đúng fingerprint, không thay bằng số test tập trung.
- [x] Bốn nhóm bổ sung đã được duyệt rõ ngày 23/10: gallery/ngừng nhận việc ([B02-05](bao-cao/B02-05-gallery-va-ngung-nhan-viec.md)), MFA ([B11-05](bao-cao/B11-05-khoi-phuc-mfa.md)), restore DB + file + khóa DEMO ([B11-06](bao-cao/B11-06-backup-day-du-demo.md)); đã có code và kiểm tập trung local. Native bổ sung Android/iOS đã PASS gallery xem/sắp xếp/gỡ, tắt nhận việc, đăng nhập bằng mã dự phòng và mở bảo mật; giới hạn từng thao tác ghi trong báo cáo.
- [ ] Commit/push đợt LOCAL-01, CI mới, thiết bị thật/UAT/phát hành.

Nền P2 `cd719cb` đã được push vào main và main CI `39717884524` thành công. Dòng trạng thái 22/10 bên dưới là lịch sử trước khi CI hoàn tất.

**22/10/2026 — Push P2 và ngân sách CI:** `a2a6a50` đã lên nhánh public `feat/p2-local-workflows`; chưa vào `main` vì CI chưa đạt. Lượt hai của run `39706934174` đạt 25 bài web liên tiếp rồi hết giới hạn tổng 15 phút trước khi đủ 28 bài. Tăng giới hạn cả bộ web lên 20 phút và job lên 40 phút; giữ nguyên từng bài, retries=0, coverage và 144 tiêu chí. Chi tiết lỗi lượt đầu và kiểm lại nằm trong [báo cáo P2](bao-cao/B11-03-tong-ket-p2.md#kiểm-ci-khi-push--22102026). Kết quả bàn giao phải kiểm trên commit mới.

**21/10/2026 — P2 đang được triển khai theo yêu cầu mới nhất:** chủ dự án đã chốt OTP/khôi phục/xóa và locale tài khoản, quyền admin, LiveKit local để thử âm thanh thật, ngân hàng mô phỏng local chỉ tiền test. [Kế hoạch đã duyệt](de-xuat/P2-01-trien-khai-tron-dot.md). Các ghi chú “chưa chuyển P2” bên dưới là lịch sử; giới hạn APNs/thiết bị thật/UAT của P1-2 vẫn giữ. Kết quả cuối và phạm vi từng lượt kiểm nằm trong [báo cáo tổng P2](bao-cao/B11-03-tong-ket-p2.md). Chủ dự án đã yêu cầu push ngày 21/10; CI phải kiểm trên đúng commit. Chưa phát hành. Phần còn thiếu đã đối chiếu code được gom tại mục “Rà soát phần còn thiếu trước push” trong báo cáo tổng P2.


**20/10/2026 — P1-06, hoàn thiện cùng đợt P1-2:** ghi chú hỗ trợ nội bộ; lịch sử đánh giá khách theo quyền việc; người thực hiện bổ sung dấu nhận tiền sau admin; vùng đa giác/điểm đại diện, gom cụm theo zoom và xếp hạng ổn định; sự kiện hỗ trợ/xác minh/đánh giá; tích hợp Expo Push Service. [Quyết định đã chốt](de-xuat/P1-06-hoan-thien-cung-dot.md). Code và kiểm local được ghi theo từng báo cáo bên dưới. **Đã liên kết Expo, build và thử thông báo mô phỏng trên Android/iOS; iOS đã đăng ký token, gửi thật bị Expo từ chối InvalidCredentials. Còn cấu hình FCM/APNs và nghiệm thu chuyển phát thật; chưa đóng toàn P1-2.** Chọn tin nhắn chứng cứ tiếp tục hoãn; chưa chuyển P2. Chưa commit/push, CI mới hoặc UAT.

- [B09-06 — Ghi chú nội bộ hỗ trợ](bao-cao/B09-06-ghi-chu-noi-bo.md).
- [B10-04 — Lịch sử đánh giá khách và dấu nhận tiền](bao-cao/B10-04-lich-su-khach-va-dau-nhan-tien.md).
- [B03-06 — Đa giác, gom cụm và xếp hạng](bao-cao/B03-06-da-giac-gom-cum-va-xep-hang.md).
- [B05-06 — Sự kiện và push Expo](bao-cao/B05-06-su-kien-va-expo-push.md).

## P1-05 — Admin tài khoản, người cung cấp và danh mục, 20/10/2026

- [x] Chủ dự án duyệt cả ba contract bổ sung; [thiết kế](de-xuat/P1-05-admin-tai-khoan-partner-danh-muc.md) ghi phạm vi và phần hoãn.
- [x] DB/API/web/mobile: danh sách/chi tiết có quyền, lọc, phiên bản, lịch sử; khóa/mở tài khoản; cảnh báo/đình chỉ/khôi phục người cung cấp; thêm/sửa/ngừng/khôi phục ngành–nhóm–kỹ năng.
- [x] Tài khoản bị khóa có phiên hỗ trợ riêng; API nghiệp vụ/socket từ chối, thu hồi phiên cũ; polling thông báo/chat và realtime client không dùng phiên hỗ trợ.
- [x] Kiểm tập trung API, mobile và hành trình web nối DB; chống gửi trùng và xung đột phiên bản. Bằng chứng cuối, ảnh native và Mermaid ở [B09-05](bao-cao/B09-05-admin-tai-khoan-va-danh-muc.md).
- [x] Native: iOS simulator khóa tài khoản/tạo ngành/hỗ trợ hạn chế; Android emulator đình chỉ người cung cấp và kiểm MFA hết hạn. Đã đối chiếu DB, ảnh DEMO và Mermaid trong B09-05.
- SDD: giữ 117 tiêu chí cũ, thêm 5 tiêu chí có review, QA-048/049 chỉ `partial`; dùng bằng chứng `SDD-PROJECT` cùng dấu băm, không lấy lượt tập trung thay toàn gói.
- [ ] CI trên commit mới, thiết bị thật, UAT, production. Chọn tin nhắn chứng cứ để sau; khôi phục/xóa tài khoản, cấp quyền admin và tài chính P2 ngoài đợt. Không đóng toàn B09/P1-2.


## P1-04 — Admin hoàn tất thay, 20/10/2026

- [x] Chủ dự án duyệt bổ sung trường xem trước và xác nhận đối chiếu; phạm vi tiền test, web/mobile.
- [x] DB/API: quyền finance.review riêng + support.read + MFA; xem trước gắn phiên bản/tác động, quyết toán chung với thợ, chứng cứ/audit. Giữ hai dấu và trạng thái báo cáo.
- [x] Kiểm tập trung PostgreSQL: 5 bài mới và 6 bài hóa đơn hồi quy đạt; UI/client và hồi quy 27 bài đạt. Web desktop/mobile qua API/DB thật, mất response rồi retry cùng payload/key đạt.
- [x] iOS 27 simulator và Android 16/API 36 emulator: ảnh chứng cứ, xem trước, gửi và lịch sử đạt; DB giữ hai dấu null, report open. Ảnh DEMO và Mermaid đã kiểm trong B09-04.
- SDD: dùng bằng chứng cuối tại [B09-04](bao-cao/B09-04-admin-hoan-tat-thay.md), không lấy lượt tập trung thay kết quả toàn gói.
- [ ] Commit/push, CI mới, thiết bị thật/UAT/production. Chưa đóng toàn B09/P1-2.

## P1-03 — Admin hỗ trợ, xác minh và kiểm duyệt, 19/10/2026

- [x] Chủ dự án duyệt toàn bộ contract bổ sung: TOTP, phiên admin, khai báo/ảnh/lịch sử xác minh, Cần bổ sung, chi tiết/tìm/lọc và Giữ/Ẩn/Khôi phục.
- [x] DB/API: MFA gắn family, quyền hiện hành, fresh 5 phút, rate limit, chống replay; phiên bản/idempotency, audit truy cập/quyết định, dữ liệu xác minh mã hóa.
- [x] Admin workspace React có build/typecheck/test, đăng nhập/MFA, ba hàng đợi và nhật ký VI/EN/JA. App Expo có lối vào từ hồ sơ nháp, nộp ảnh/bổ sung/lịch sử và đọc kết quả.
- [x] Kiểm tập trung: 4 integration + TOTP/config + 4 mobile/client + admin client; web API/DB thật hai vai, retry mất response, duyệt bổ sung, ẩn/khôi phục và khóa phiên đạt.
- [x] iOS 27 simulator: nhập khai báo, chọn ảnh Photos, upload/gửi và đọc lịch sử hồ sơ chờ duyệt qua API DEMO thật.
- [x] Báo cáo riêng [B09-02](bao-cao/B09-02-admin-ho-tro-va-kiem-duyet.md), [B02-04](bao-cao/B02-04-nop-va-xet-xac-minh.md); Mermaid đã parse/render, ảnh DEMO.
- SDD: thêm 5 tiêu chí/QA, giữ 108 tiêu chí trước và baseline. 113 tiêu chí, 74 QA partial/28 unmapped. Kết quả đầy đủ theo `test-results/sdd/SDD-PROJECT/evidence.json` và `sdd:check --phase verify` của bộ file cuối; không dùng kiểm tập trung thay SDD.
- [ ] CI trên commit mới, Android, thiết bị thật/UAT/production; khôi phục MFA, quản trị tài chính/tài khoản/danh mục đầy đủ, hoàn tất thay và chọn đoạn chat chứng cứ còn mở. Không đóng toàn B02/B09/B10/P1-2.

## B09-01 — Hỗ trợ phía người gửi, 16/10/2026

- [x] Chủ dự án duyệt bổ sung tiêu đề/ảnh local; admin/MFA để đợt riêng.
- [x] DB/API: hồ sơ riêng, phân trang theo tài khoản, đúng phiên bản hóa đơn, chứng cứ của chính người gửi, idempotency/audit; không đổi việc/tiền.
- [x] App: điểm vào Tài khoản/việc/hóa đơn/đánh giá; tạo, lọc, xem, bổ sung ảnh/nội dung; closed chỉ đọc; VI/EN/JA.
- [x] Kiểm riêng: 5 API, 5 mobile/client, 1 web; quyền người ngoài, mất response/retry và trạng thái test. [Báo cáo](bao-cao/B09-01-ho-tro-va-bao-cao.md).
- [x] SDD local trên `e1664cd`: 240 mobile/118 API/20 web, coverage/build/load/prototype/Storybook và verify đạt. Giữ lịch sử lỗi gián đoạn danh mục trong báo cáo.
- [ ] CI `38847707687` lỗi thao tác gửi lại hóa đơn; đã thêm test giữ đọc nền và sửa xếp hàng thao tác. Commit sửa phải chạy lại SDD/CI trước main.
- [x] iOS simulator: picker/upload ảnh và gửi/đọc hồ sơ có tiêu đề; ảnh trong báo cáo. Android chưa hoàn tất kiểm hỗ trợ do driver timeout.
- [ ] Admin tiếp nhận/đổi trạng thái/MFA; chọn đoạn chat chứng cứ; thiết bị thật/UAT/production chưa thực hiện. Chưa đóng toàn B09/P1-2.

## B10-03 — Ảnh và phản hồi đánh giá, 16/10/2026

- [x] Chủ dự án duyệt thêm metadata ảnh/phản hồi/quyền vào API; một ảnh và một phản hồi theo contract, server kiểm quyền hiện hành.
- [x] DB/API/app: chọn/tải/xem/thay/gỡ ảnh; bên nhận tạo/sửa phản hồi; phiên bản chung, audit và retry cùng payload.
- [x] 8 bài API, 11 bài app/client và hành trình web hai tài khoản đạt ở lượt tập trung; kiểm lại toàn bộ bằng SDD trên bộ file cuối.
- [x] iOS 27 simulator: đọc ảnh/phản hồi, viết phản hồi và chọn/tải/gửi ảnh từ Photos qua API local thật. Đã sửa MIME Blob trống trên iOS và cảnh báo JSX.
- [ ] Android lát này, thiết bị thật, UAT và production chưa xác nhận.
- SDD bổ sung 3 tiêu chí, tổng 105; giữ 68 QA partial/29 unmapped. Báo cáo máy và `verify` quyết định trạng thái bộ file cuối, không dùng checklist thay bằng chứng.
- B10-03 đã đẩy commit `0ccfa6e` lên nhánh `feat/review-photos-replies`; CI 38843555641 lỗi tương tác đổi lịch, đã thêm regression và sửa form trong đợt B09-01; không đồng bộ Drive/Excel/ui-ux. [Báo cáo và ảnh](bao-cao/B10-03-anh-va-phan-hoi-danh-gia.md).

## B10-01 — Đánh giá sao/nội dung và điểm công khai, 15/10/2026

- [x] DB/API: Q01, một bản mỗi chiều, sửa/gỡ/khôi phục, audit, retry và quyền hiện hành; 5 bài PostGIS tập trung đạt.
- [x] App VI/EN/JA: đánh giá từ công việc, bản gửi/nhận, sửa/gỡ và danh sách public trên hồ sơ. Giữ phiên bản lúc bắt đầu sửa; không lấy phiên bản mới để ghi đè bản nháp cũ.
- [x] Web hai tài khoản: đủ dấu, gửi, mất phản hồi/retry cùng key, sửa, gỡ/hiện lại; dữ liệu test thật.
- [x] iOS 27 simulator gửi 5 sao; Android 16 emulator đọc hai chiều và sửa 5 xuống 4 sao qua API DEMO; ảnh trong báo cáo.
- SDD toàn repo: 102 tiêu chí, giữ 68 QA partial/29 unmapped. Kết quả máy kiểm của bộ file cuối nằm ở `test-results/sdd/SDD-PROJECT/result.json` và `evidence.json`, kiểm lại bằng `sdd:check --phase verify`; không dùng lượt kiểm tập trung thay thế.
- [ ] Ảnh/phản hồi và metadata quyền response: đã duyệt 16/10, triển khai trong B10-03 bên trên. Admin/support và lịch sử đánh giá khách qua quan hệ việc khác chưa triển khai.
- [ ] B10-01 đã push `bc90978` lên main sau CI nhánh đạt. CI main cả hai lượt lỗi web/timeout; sửa tranh khóa hồ sơ/chat trong B10-03 local, chưa push; điện thoại thật/UAT/production chưa thực hiện.

[Báo cáo B10-01 và giới hạn](bao-cao/B10-01-danh-gia-sau-cong-viec.md). Không đóng toàn B10-01/B10 hoặc P1-2.


## B05-05 — Tự cập nhật và kéo làm mới, 15/10/2026

- [x] Bỏ nút tải lại thường trực ở danh sách phòng/chat/thông báo, thêm kéo xuống native và retry riêng khi lỗi.
- [x] Giữ nội dung và bản nháp lúc tải nền/lỗi mạng, xóa nội dung khi mất quyền; 21 bài mobile liên quan và 2 hành trình web đạt.
- [x] Android emulator/iOS simulator: kéo, vòng xoay, timeout với API DEMO, hồi phục; [ảnh và phạm vi](bao-cao/B05-05-cap-nhat-tu-dong-va-keo-lam-moi.md).
- [x] Sửa vòng chờ khóa tài khoản khi hai bên đổi lịch: bài tái hiện thất bại trước sửa, 16 bài API tài khoản/auth/jobs đạt sau sửa; giữ một thành công/một xung đột.
- SDD toàn repo: kết quả máy kiểm được lưu trong `test-results/sdd/SDD-PROJECT/evidence.json` của nội dung cuối; không dùng kết quả các đợt trước thay thế.
- [ ] Commit/push, CI mới, thiết bị vật lý và UAT.


## B05-04 — Lịch tổng hợp, 15/10/2026

- [x] Chọn phần còn thiếu của P1-2 theo kế hoạch; dùng contract/jobs và quyền hiện hành, không đổi spec.
- [x] Chế độ Danh sách/Lịch hẹn, tháng/ngày, giờ Việt Nam, giữ ngày khi tải lại, mở chi tiết và đổi lịch.
- [x] 19 test mobile tập trung; 6 API/PostGIS; web 21 việc qua nhiều trang và hai tài khoản đạt.
- [x] iOS simulator/Android emulator: mở lịch, chọn ngày và mở đúng chi tiết; ảnh DEMO và Mermaid đã kiểm trong [B05-04](bao-cao/B05-04-lich-tong-hop-cong-viec.md).
- [x] SDD prepare 98 tiêu chí; giữ 65 QA partial/32 unmapped. Kết quả toàn gói của bộ file cuối lấy từ `test-results/sdd/SDD-PROJECT/result.json` và `sdd:check --phase verify`, không dùng lượt tập trung thay thế.
- [ ] Commit/push, CI mới, UAT/thiết bị thật và provider push.

## P1-01 A/B — 13/10/2026

- [x] Chủ dự án duyệt verify-only local Mailpit/SMS mô phỏng và contract đội ngũ/reauth. API v0.1.11, migration009; không mở login/recover/MFA/provider thật.
- [x] DB/API/app: lời mời/list/resend/revoke/accept, memberships của mình, cấp quyền có lý do/mật khẩu, preview/gỡ/tự rời, đọc/reset đầu mối và bỏ nháp khi bàn giao.
- [x] API P1: 9 integration với PostGIS, response OpenAPI, 2 unit; mobile 4 màn + 1 API boundary; web hai tài khoản.
- [x] SDD local trên `e1664cd`: 240 mobile/118 API/20 web, coverage/build/load/prototype/Storybook và verify đạt. Giữ lịch sử lỗi gián đoạn danh mục trong báo cáo.
- [ ] CI `38847707687` lỗi thao tác gửi lại hóa đơn; đã thêm test giữ đọc nền và sửa xếp hàng thao tác. Commit sửa phải chạy lại SDD/CI trước main.
- [x] iOS simulator: mời qua Mailpit, xem thành viên, cấp jobs.assign bằng mật khẩu; kiểm lại DB. Android emulator: xác minh email từ Mailpit, nhận lời, preview/Hủy/xác nhận tự rời. Chỉ máy ảo, không thiết bị thật.
- [x] Báo cáo [B04-01](bao-cao/B04-01-doi-ngu-va-xac-thuc-local.md)/[B04-02](bao-cao/B04-02-quyen-va-ban-giao-doi-ngu.md), ảnh DEMO và Mermaid render; spec/mirror/ZIP/Drive theo phạm vi, sổ v1.49.
- [x] Các suite SDD-PROJECT đã chạy đạt: lint/typecheck/tooling/mobile/API/coverage/build/web/load/prototype/Storybook. Giữ 80 tiêu chí, 93 QA/130 operation, 59 partial/34 unmapped. Bằng chứng đúng fingerprint bộ file bàn giao là `test-results/sdd/SDD-PROJECT/result.json` và lệnh `--phase verify`; lượt trước đổi tài liệu bị checker từ chối, không dùng thay evidence cuối.
- [ ] Commit/push, remote CI cho code mới, UAT, thiết bị vật lý, provider thật/production.

Các mục OTP Pending trước ngày 13/10 là lịch sử; chỉ phần verify local được mở lại. Không đánh dấu toàn B01/B04 xong.

## SDD toàn dự án ngày 13/10/2026

Đợt mở rộng được giao trực tiếp: [B00-08](bao-cao/B00-08-sdd-toan-du-an.md) · [Cách dùng](sdd/README.md).

- [x] Đăng ký toàn repo, 88 QA, 123 operation, 71 criterion và các phần partial/unmapped.
- [x] Bộ kiểm phát hiện thiếu file/QA/API/criterion, đọc route/action thật và gắn evidence với phiên bản.
- [x] Bổ sung test MAP-02: tie-break created_at/id và phân trang qua UI với API/DB thật.
- [x] Viết CI toàn dự án, giữ coverage/build/load, thêm prototype/Storybook.
- [x] Local đạt toàn gói: 50 tooling, 196 mobile, 83 API, 14 web, coverage/build/load/prototype/Storybook và SDD verify. Mermaid đã render.

**Bằng chứng remote:** kiểm [Quality trên main](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/workflows/quality.yml?query=branch%3Amain) và [bảo vệ nhánh](https://github.com/anhthaingd/dich-vu-quanh-ban/settings/branches) khi bàn giao. Check phải là `SDD project` từ GitHub Actions trên đúng commit. Lịch sử lượt kiểm, lỗi timeout CI đầu và cách sửa ở B00-08; không dùng một ô đánh dấu trong tài liệu thay trạng thái GitHub.
- [ ] Native/thiết bị thật/UAT và các nhánh nghiệp vụ còn thiếu; không nằm trong chứng nhận tự động này.

## Mốc SDD-01 local ban đầu ngày 13/10/2026

Đợt công cụ theo yêu cầu trực tiếp của chủ dự án; không đổi ưu tiên nghiệp vụ. [Hướng dẫn](sdd/README.md) · [B00-07](bao-cao/B00-07-bo-kiem-sdd-local.md).

- [x] Nguồn MAP-02/QA-080/081/OpenAPI/UX → 6 tiêu chí mẫu → code/test; ghi rõ nhánh chưa được chứng nhận.
- [x] Kiểm prepare/verify, nguồn đổi, mất liên kết, phạm vi và bằng chứng cũ/fail/skip; 28 test riêng, tổng 31 tooling và lint đạt local.
- [x] Thu report thật: 7 mobile, 2 API/PostGIS và 1 web; verify đạt trên working tree. Thử bỏ điều kiện public trong bản sao tạm bị test riêng tư bắt đúng.
- [x] Hướng dẫn AGENTS/quy trình, báo cáo học code và Mermaid parse/render.
- [x] Chuyển kế hoạch CI/required checks sang đợt mở rộng B00-08 phía trên.
- [x] Chuyển mở rộng MAP-02/jobs/chat/invoice sang B00-08; các giới hạn native/UAT vẫn giữ.

## Các mốc chức năng trước đó

**Bổ sung icon ngành · 08/10:** đã gắn 10 icon Lucide riêng theo mã ngành; Tất cả giữ ô lưới. Typecheck/lint và 8 test liên quan đạt; ảnh và giới hạn kiểm native tại [B00-06, mục 8](bao-cao/B00-06-trang-chinh-theo-storybook.md#8-bổ-sung-icon-theo-ngành--08102026). Chưa commit/push/CI/UAT.

**Sửa giao diện trang chính · 08/10:** đã thay trang danh mục cũ bằng bố cục Storybook Mobile, font/icon cùng nguồn, tìm dịch vụ và khu vực ngay trang chính, tab Công việc/Tin nhắn thật. [B00-06](bao-cao/B00-06-trang-chinh-theo-storybook.md) có ảnh Android/iOS và giới hạn khác bản mock. Local đạt 196 mobile test, 14 bài web đã kiểm qua các lượt, native cả hai nền tảng; chưa push/CI/UAT. Thông báo vẫn chưa triển khai.


**P0-3 · 07/10:** đã nối ảnh kết quả local/test → hóa đơn → giữ phí/point → quyết toán/hai dấu → ví/lịch sử. [B06-01 — hóa đơn và quyết toán test](bao-cao/B06-01-hoa-don-va-quyet-toan-test.md). Web hai tài khoản và native Android/iOS đạt phạm vi báo cáo; trình chọn ảnh native chưa kiểm. **Đã push `d4828e2` ngày 08/10; [CI đạt cả 3 job](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37713859771)** (app/build, API/PostGIS, web E2E). Chưa UAT/production/tiền thật.

**Sửa thiếu sót tìm dịch vụ · 07/10:** bổ sung chọn ngành → nhóm → kỹ năng ngay trên màn tìm, xóa kết quả cũ khi đổi bộ lọc. Đây là sửa khớp spec; xem [B03-05](bao-cao/B03-05-chon-dich-vu-truoc-khi-tim.md). Chủ dự án đã yêu cầu commit/push MAP-03 + P0-2 và bản sửa này.

**Đợt mới 07/10 — MAP-03 + P0-2:** đã bỏ nhập tọa độ thủ công; đã nối yêu cầu/nhận việc và chat văn bản qua API trong phạm vi DEMO local/test đã duyệt. Xem [B03-03](bao-cao/B03-03-bo-nhap-toa-do.md) và [B03-04](bao-cao/B03-04-yeu-cau-nhan-viec-va-chat.md). Web hai tài khoản và native Android/iOS đạt phạm vi ghi trong báo cáo; code đã push `293b073`; [CI 37604427549](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37604427549) đạt cả 3 job (app/build, API/PostGIS, web E2E); chưa UAT. OTP và WebSocket Pending. Bước nghiệp vụ kế tiếp là P0-3 với tiền test.



**Cập nhật 07/10:** MAP-01 đã push `4dc7600`, [CI đạt cả 3 job](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37577265358). **MAP-02 đã push `a6d4735` và bản sửa camera `8fdc9d4`; [CI MAP-02](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37584532165) đạt cả 3 job** theo quyết định chỉ ghim địa điểm công khai; người chưa có điểm công khai vẫn hiện danh sách. [Báo cáo B03-02](bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md) ghi kiểm thử/ảnh và trạng thái push riêng. Thứ tự P0-1 → MAP-01 → MAP-02 → P0-2 → P0-3. Các mốc chưa tích hợp bản đồ phía dưới là lịch sử, không thay trạng thái này.
DOC-083 · v1.0 · 01/10/2026 · DELIVERY-01. Baseline code `50d184a`. [Mục lục](README.md).

## Quy ước

- `[x]` = đạt phạm vi kỹ thuật của đúng dòng tại baseline/bằng chứng dẫn kèm; không đồng nghĩa toàn nhóm Bxx đã xong hoặc đã UAT.
- `[ ]` = chưa hoàn thành; lý do/đầu việc còn thiếu ở cột tiêu chí. Toàn nhóm có thể “một phần”. Không tính phần trăm app từ số ô tick.
- Gói vừa triển khai: **P0-1 — người cung cấp và tìm dịch vụ**, đã duyệt ngày 06/10/2026. [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md) ghi bằng chứng local/native và giới hạn. Tiếp theo **MAP-01 chọn địa điểm bằng địa chỉ/bản đồ**, rồi **P0-2 gửi/nhận việc + chat**, theo yêu cầu 07/10. [Kế hoạch MAP-01](de-xuat/MAP-01-ban-do-mien-phi.md) đã triển khai theo duyệt tiếp ngày 07/10, OpenAPI v0.1.7; xem [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md). Đã thử live, CI MAP-01 đạt; chưa billing/UAT. **B01-02 OTP vẫn Pending**; chỉ tài khoản DEMO mới local/test được cấp định danh thử theo cho phép của chủ dự án.
- Hạng mục mới theo kế hoạch chưa có phê duyệt tích hợp trả phí/production. Phần thay contract cần chốt rõ trước khi code.
- Chưa có dòng nào được gắn “UAT chủ dự án đã nghiệm thu”.

## Hàng đợi ưu tiên

Bảng này là thứ tự làm việc mới nhất; bảng chi tiết Bxx bên dưới vẫn theo nhóm để tra cứu. Chưa đánh dấu xong chỉ vì đã có kế hoạch.

| Ưu tiên | Kết quả bàn giao | Trạng thái hiện tại |
|---|---|---|
| **P0-1** | Tạo/quản lý/công bố hồ sơ cung cấp, kỹ năng/giá/vùng, nhận việc; khách tìm và xem hồ sơ | **Đã implement và kiểm local/native** theo phạm vi đã duyệt. [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md). Đã push `fe35564`, [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37566935703) đạt 3 jobs; chưa UAT, không đóng bản đồ/GPS/upload/xét xác minh/ranking. |
| **MAP-01** | Nhập địa chỉ/gợi ý, chọn ghim, GPS; bộ chọn chung tìm dịch vụ/sổ địa chỉ/cửa hàng/tâm vùng | **Code/local đã kiểm; live map trên web, Android emulator, iOS simulator.** [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md). Chưa kiểm trọn 4 nơi trên từng native, GPS thiết bị thật, UAT; CI MAP-01 đã đạt. Chưa billing. |
| **MAP-02 — trước P0-2** | Ghim địa điểm công khai trong kết quả; giữ người không có ghim trong danh sách | [B03-02 / MAP-02](bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md): API/app/test, điểm trùng và hồ sơ; không công khai tâm vùng, không GPS thợ. |
| **P0-2** | Gửi/nhận/theo dõi yêu cầu, thay đổi/rút/dừng, chat trước/sau thuê | Sau nguồn cung P0-1, MAP-01 và MAP-02; quyền/xác minh vẫn bắt buộc. |
| **P0-3** | Ảnh kết quả, hóa đơn, point/phí và hoàn tất với tiền test | Sau P0-2; ảnh và nền ví cần thiết được làm ngay trong gói phụ thuộc. |
| **P1** | Đội ngũ/phân công đầy đủ, thông báo/lịch, bản đồ nâng cao ngoài MAP-01/MAP-02, đánh giá, hỗ trợ/admin | Kéo phần tối thiểu lên P0 khi bắt buộc để luồng chính chạy đúng; provider/cost cần duyệt riêng. |
| **P2** | Tiện ích tài khoản còn lại, locale tài khoản, gọi, ngân hàng sandbox, vận hành mở rộng | Không chen trước P0 vì dễ làm; vẫn là yêu cầu cần xử lý trước ra mắt nếu nằm trong phạm vi bắt buộc. |

UAT và phê duyệt production/tiền thật là cổng riêng, không tự mở từ bảng này.

## Bằng chứng hiện hành

**Đã push P0-1 tại `fe35564` ngày 07/10/2026; [CI 37566935703](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37566935703) đạt cả 3 jobs: static/mobile/build, API/PostGIS và web E2E.** Chưa UAT; native dùng bằng chứng emulator/simulator đã ghi, không phải thiết bị thật. Các ghi chú chưa push/CI ở mốc kiểm trước là lịch sử.

**Rà soát UI P0-1 · 07/10/2026:** làm rõ khối nhận việc đầu màn, trạng thái ở danh sách, bốn mục chỉnh sửa hai cột và ngôn ngữ ở cuối. [Báo cáo và 24 ảnh Android/iOS](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md) ghi 139 mobile, web P0-1 và native hai nền tảng đạt; typecheck/lint đạt. Không đổi API/DB/spec; chưa commit/push/CI mới, chưa nghiệm thu UI sau sửa.

**P0-1 · 06/10/2026:** [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md) — hồ sơ quản lý → công bố/nhận việc → tìm PostGIS → public profile, DEMO local riêng. API/mobile/web/native có bằng chứng chi tiết tại báo cáo; chưa push/CI/UAT gói này. OTP/map/tiền thật chưa mở.

**Đợt gộp mới 06/10/2026:** sửa tên đã push `312972b`, [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37402534136) đạt 3 jobs. [Phiên và địa chỉ](bao-cao/B01-04-phien-va-dia-chi.md) đã implement và kiểm local: 50 API, 106 mobile, 7 web (hành trình mới kiểm lại sau sửa tọa độ), accounts Android/iOS PASS; typecheck/lint/build, tooling đạt. Gói đã push `4a98dc0`; [CI 37424414095](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37424414095) đạt cả 3 jobs. Chưa UAT. [Đợt bổ sung](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md) đạt 124 mobile, 8 web (hai hành trình tài khoản kiểm lại sau chỉnh UI cuối), accounts Android/iOS PASS, lint/typecheck/build và 3 tooling; đã push `a823d0e`; [CI 37428334396](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37428334396) đạt cả 3 jobs, chưa UAT. Các mốc bên dưới là lịch sử.

**Mốc trước đợt gộp 06/10/2026:** đã push danh mục `1c80f67`; [CI 37398471842](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37398471842) đạt cả ba jobs. Chủ dự án xác nhận danh mục 10 ngành/39 nhóm/128 kỹ năng; chưa UAT toàn app. Các ghi chú chưa push/CI của ngày 05/10 bên dưới là lịch sử. Lát đang bàn giao: [B01-04 sửa tên hiển thị](bao-cao/B01-04-ho-so-ten-hien-thi.md), đã implement sau duyệt `Me.version`; 44 API/98 mobile đạt, 5 web hồi quy và 1 web profile đạt qua hai lượt chạy, profile Android/iOS PASS; typecheck/lint/build và 3 tooling đạt. Chưa commit/push/CI/UAT mới; OTP vẫn Pending.

| Mốc | Bằng chứng | Kết luận được phép dùng |
|---|---|---|
| `41579b5` | [B00-01](bao-cao/B00-01-nen-tang-danh-muc.md), [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36729018889) | UI chung/native navigation và nền danh mục |
| `50d184a` | [B01-01](bao-cao/B01-01-email-mat-khau.md), [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/36810424485) | 65 test mobile, 30 API, 3 web, 3 tooling; CI 3 jobs đạt |
| Working tree 01/10 | [I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md); 81 test mobile, 3 web hồi quy + 1 web i18n; native i18n/layout/auth hai nền tảng | Đạt kỹ thuật I18N-01/02, chưa commit/push, chưa CI mới/UAT |
| Native cuối 30/09 UTC–01/10 JST | `test-results/native/{android,ios}/{result.json,auth/result.json}`; báo cáo B00/B01 | Danh mục + auth đạt trên DVQB_API_36 và iPhone 18 Pro/iOS 27; không phải thiết bị thật |
| `844e1d2` · 04/10 JST | [CI 37132800077](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37132800077); kiểm trước push: 81 mobile, 4 web, 3 tooling, typecheck/lint/build đạt | Đã push i18n và bộ báo cáo; CI 3 jobs đạt. Không phải bằng chứng cho phần B00-05 viết sau commit này |
| Local sau `844e1d2` · 04/10 JST | [B00-05](bao-cao/B00-05-khung-giao-dien.md): 83 mobile, 5 web, 3 tooling; shell/auth/layout Android và iOS đạt; typecheck/lint/build đạt | Khung khách cho chức năng hiện có đã kiểm. Chủ dự án xác nhận và yêu cầu push ngày 05/10; chưa UAT toàn app; B00-05 còn khung các vai trò và nghiệp vụ khác |

Đã push B00-05 ở `c120062` ngày 05/10; [CI 37262885727](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37262885727) đã đạt cả 3 jobs (API/PostGIS, static/mobile, web E2E). I18N-04 được duyệt ngày 05/10 và đã triển khai lát đọc danh mục đa ngôn ngữ, mở rộng DB; xem [báo cáo](bao-cao/I18N-04-danh-muc-da-ngon-ngu.md). Chưa push/CI/UAT.

Artifact local không track Git. Nếu không còn artifact, chạy lại theo báo cáo; không đổi ngày kiểm cũ thành ngày hiện tại.

> Rà soát 05/10 phát hiện chồng chéo trong bộ cũ. Chủ dự án đã yêu cầu clear và nạp lại; [bộ mới](bao-cao/B02-01-thay-du-lieu-danh-muc.md) có **10 ngành/39 nhóm/128 kỹ năng**, một nhóm chính cho mỗi kỹ năng. Đã thay DB local và kiểm giữ nguyên tài khoản/phiên; kiểm kỹ thuật không thay nghiệm thu nội dung/UAT.

## B00 — Nền tảng — đã có phần chạy thật, chưa đóng toàn phạm vi

Nguồn: [spec](../technical-design/04-backlog.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F17/F18/F20; QA-055…060.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B00-01 | Workspace, API/DB, migration/seed và health | Mobile/API chạy; migration lặp không nhân đôi; DB test tách biệt; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [x] | B00-02 | Theme, UI chung và native stack | Button/Input/Card/Feedback; Back, blur/cancel và resume được kiểm; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [x] | B00-03 | Log/test phương án A và CI | Correlation, lọc dữ liệu nhạy cảm, unit/integration/web, coverage gate; CI 50d184a đạt; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [x] | B00-04 | Development build + E2E danh mục Android/iOS | Binary có SecureStore; danh mục và auth chạy trên hai máy ảo; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md) |
| [ ] | B00-05 | Shell sản phẩm đúng UI-16, routing và các điểm vào thật | **Một phần: đã sửa trang chính theo Storybook ngày 08/10** — tìm kiếm/khu vực, font/icon, hai hàng ngành, tab Công việc/Tin nhắn; [B00-06](bao-cao/B00-06-trang-chinh-theo-storybook.md) có ảnh và kiểm local/native. Thông báo chưa triển khai. [Báo cáo](bao-cao/B00-05-khung-giao-dien.md). Khung partner/DN và điểm vào nghiệp vụ khác nối theo chức năng thật; chưa đóng toàn dòng |
| [ ] | B00-06 | Admin workspace tối thiểu khi bắt đầu có tác vụ vận hành | Manifest/build/test/auth/quyền thật; không suy ra từ folder apps/admin |

## I18N — Nền đa ngôn ngữ — duy trì trong từng gói chức năng

Nguồn: [spec](../../ui-ux/specs/ux-scope-current.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F17; UI ngôn ngữ; QA bổ sung khi thực hiện.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | I18N-01 | Message keys và trạng thái lỗi độc lập ngôn ngữ | i18n-js, typed keys/params, đủ khóa VI/EN/JA, fallback/số nhiều; lỗi auth là mã. [Báo cáo I18N-01/02](bao-cao/I18N-01-nen-da-ngon-ngu.md), kiểm local 01/10, đã push `844e1d2` |
| [x] | I18N-02 | VI/EN/JA cho các màn đã có + chọn/lưu locale local | Giữ form/route/session, lưu local; i18n/auth và cỡ chữ lớn đạt Android/iOS; web 3 hồi quy + 1 i18n đạt. [Báo cáo](bao-cao/I18N-01-nen-da-ngon-ngu.md). CI `844e1d2` đạt; chưa UAT |
| [~] | I18N-03 | Locale tài khoản và đồng bộ đa thiết bị | VI/EN/JA lưu server; account thắng khi login, logout phục hồi guest; replay cũ không ghi đè phiên bản mới. Local API/app/web đã kiểm; xem I18N-05, chưa UAT. |
| [ ] | I18N-04 | Bản dịch danh mục/kỹ năng và tìm kiếm theo ngôn ngữ | **Một phần:** lát đọc tên VI/EN/JA, fallback, cursor theo locale; 10 ngành/39 nhóm/128 kỹ năng sau thay dữ liệu đã kiểm kỹ thuật local. [Báo cáo](bao-cao/I18N-04-danh-muc-da-ngon-ngu.md). Phân loại đã thay bằng bộ mới theo [báo cáo](bao-cao/B02-01-thay-du-lieu-danh-muc.md); CI `1c80f67` đạt. Tìm kiếm theo ngôn ngữ B03 chưa làm, chưa UAT toàn app. |

## B01 — Tài khoản — đã có email/mật khẩu, sửa tên, phiên và địa chỉ; toàn nhóm còn một phần

Nguồn: [spec](../../ui-ux/specs/account-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F01/F08; QA-001…006.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B01-01 | Email/mật khẩu + phiên local | Đăng ký/login, SecureStore, access 15 phút, phiên tối đa 30 ngày, rotation/replay/logout; email chưa xác minh; xem [báo cáo](bao-cao/B01-01-email-mat-khau.md) |
| [~] | B01-02 | OTP điện thoại và xác minh email | Verify/login/reset local qua Mailpit/SMS mô phỏng, mục đích và hạn dùng riêng; chưa provider thương mại. Xem B01-08. |
| [~] | B01-03 | Quên/đổi mật khẩu, liên kết/đổi định danh | Đã nối DB/API/app/test local; giữ liên hệ cũ tới xác minh mới, thu hồi phiên và kiểm cạnh tranh. Xem B01-08; provider/UAT riêng. |
| [ ] | B01-04 | Hồ sơ tài khoản, quản lý phiên và địa chỉ | get/editMe, list/revokeSessions; địa chỉ mặc định; snapshot việc cũ bất biến. **Một phần:** đã implement lát sửa tên có version/idempotency; [báo cáo](bao-cao/B01-04-ho-so-ten-hien-thi.md). Đã có list/thu hồi từng phiên và địa chỉ thêm/sửa/gỡ/mặc định, [báo cáo gói](bao-cao/B01-04-phien-va-dia-chi.md). Gói đã push `4a98dc0`/CI đạt. Đã code [thu hồi các phiên khác](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md) bằng API từng phiên; Android/iOS và kiểm lỗi/thử lại đã đạt. Còn nối địa chỉ tìm/thuê và kiểm snapshot jobs; phần bổ sung đã push `a823d0e`, [CI 37428334396](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37428334396) đạt cả 3 jobs, chưa UAT |
| [~] | B01-05 | Guard và quyền nền, fresh auth/MFA admin | MFA TOTP và phiên admin đã có; P2 thêm cấp quyền không tự sửa/vượt quyền/mất manager cuối. Xem B11-01; UAT riêng. |
| [~] | B01-06 | Khôi phục thủ công và yêu cầu xóa tài khoản | Admin xét, applicant xác minh kênh mới; xóa kiểm lại nghĩa vụ, vô hiệu phiên/ẩn danh, giữ chứng từ. Xem B01-08; chưa xóa vật lý/chốt thời hạn lưu. |
| [ ] | B01-07 | Tiếp tục hành động sau đăng nhập và deep link có quyền | **Một phần:** [trở lại Profile/Sessions/Addresses sau login](bao-cao/B01-07-tiep-tuc-tai-khoan-va-thu-hoi-phien.md), đọc lại theo tài khoản, không tự gửi mutation. Chat/thuê và deep link ngoài app còn mở |

## B02 — Nguồn cung — P0-1 đã có phần chạy thật

Nguồn: [spec](../../ui-ux/specs/partner-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F02/F03/F05; QA-007…009,012,049.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] | B02-01 | Đọc ngành → nhóm → kỹ năng | Đạt lát đọc kỹ thuật: API DB thật, lọc toàn cây active, cursor ký, UI tải/rỗng/lỗi/retry; chưa CRUD quản trị; xem [báo cáo](bao-cao/B00-01-nen-tang-danh-muc.md). [Thay bộ dữ liệu theo yêu cầu 05/10](bao-cao/B02-01-thay-du-lieu-danh-muc.md): 39 nhóm/128 kỹ năng, đã kiểm local; chưa UAT nội dung |
| [ ] | B02-02 | Upload/asset làm nền cho ảnh và giấy tờ | createUpload/completeUpload/getAsset; ownership, trạng thái ready, private/public, dung lượng/loại file |
| [ ] | B02-03 | Đăng ký/hồ sơ partner đa loại, kỹ năng, vùng, địa điểm | **Một phần đạt P0-1**: thợ/cửa hàng/doanh nghiệp, kỹ năng/giá/vùng tròn/địa điểm, nháp/công bố và DTO riêng. [B02-03 / P0-1](bao-cao/B02-03-nguon-cung-va-tim-dich-vu.md). Ảnh/upload/xét xác minh còn mở |
| [ ] | B02-04 | Bật/tắt nhận việc và đình chỉ | **Một phần đạt P0-1**: bật/tắt nhận việc, loại khỏi tìm kiếm, lọc đình chỉ. Recheck lúc gửi thuê ở P0-2; admin đình chỉ còn mở |
| [ ] | B02-05 | Gửi/xét xác minh và quản trị danh mục tối thiểu | Admin thật có quyền/audit; cần bổ sung/đạt/không đạt; không có nút partner tự duyệt |

- [x] **B03 bổ sung 07/10:** chọn/đổi ngành, nhóm, kỹ năng ngay trên màn tìm và xóa kết quả cũ theo bộ lọc; [B03-05](bao-cao/B03-05-chon-dich-vu-truoc-khi-tim.md), kiểm component và web API/DB.

## B03 — Tìm và thuê — đã có tìm danh sách P0-1, MAP-01 đã triển khai thử local

Nguồn: [spec](../../ui-ux/specs/customer-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F04/F06/F07; QA-010,011,017,018,053.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B03-01 | Tìm danh sách/bản đồ, GPS/tay, bộ lọc và hồ sơ | **P0-1 + MAP-01 đạt phần code/local**: bộ chọn chung, map/GPS theo nút, địa chỉ lưu, vùng tròn và điểm cửa hàng public. [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md). MAP-02 thêm ghim public theo kết quả đã tải và gom điểm trùng, xem báo cáo B03-02. Polygon/ranking khác, UAT và thiết bị thật còn mở. |
| [ ] | B03-02 | Gửi yêu cầu làm ngay/hẹn trước, nhiều kỹ năng | Điện thoại đã xác minh; chặn tự thuê/doanh nghiệp đang tham gia; retry không nhân đôi |
| [ ] | B03-03 | Danh sách/chi tiết việc, nhận/từ chối/rút | Kiểm version/cạnh tranh; làm ngay có ETA, không thêm bước bắt đầu |
| [ ] | B03-04 | Đổi lịch/dừng việc và liên hệ trước thuê | Đổi lịch chỉ giờ hẹn, không tự đóng việc; chat trước thuê hoàn tất tích hợp khi B05 đạt |

## B04 — Doanh nghiệp và phân công — đã có một phần phân công trong P0-2

**13/10:** P1-01 A/B đã duyệt và triển khai local/test; xem hai báo cáo B04 ở đầu checklist. Full B04/production/UAT vẫn chưa đóng.

Nguồn: [spec](../../ui-ux/specs/partner-journey.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F08; QA-013…016.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [~] | B04-01 | Membership: mời/nhận/gửi lại/rời/cấp quyền | Đã có P1-01 local/test và native theo hai báo cáo B04; chưa UAT/provider thật/toàn B04 |
| [ ] | B04-02 | Phân công/đổi nhân viên/đầu mối gọi | Một assignment hiệu lực; người cũ mất quyền việc; giữ chat riêng; chưa mở chuyển chủ/đóng DN |

## B05 — Chat, lịch và thông báo — HTTP/inbox/nhắc lịch local

Nguồn: [spec](../../ui-ux/specs/activity-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F09/F07; QA-019,021,022,023,025,050.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [~] | B05-01 | Chat trước/sau thuê: mở phòng, lịch sử, gửi/đọc | Phòng theo cặp tài khoản; ACK sau commit, idempotency và reconnect; quản lý không đọc phòng riêng |
| [~] | B05-02 | Outbox/inbox, device push, cài đặt và deep link | P1-02 đã có inbox, bốn công tắc, read/unread và mở đích có kiểm quyền; đã kiểm local/web/native. Chưa device push/provider/UAT |
| [~] | B05-03 | Lịch, nhắc 24h/1h và đổi lịch | P1-02 worker 24h/1h, hủy mốc cũ khi đổi lịch/dừng; đã kiểm API. Màn lịch tổng hợp B05-04 đã nối API hiện hành, giờ Việt Nam/đủ trang/đổi phạm vi; [bằng chứng](bao-cao/B05-04-lich-tong-hop-cong-viec.md). Chưa push thật/UAT |

## B06 — Hóa đơn — P0-3 local/test

Nguồn: [spec](../../ui-ux/specs/activity-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F10/F07; QA-020,026…028.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] local/test¹ | B06-01 | Ảnh kết quả, nháp hóa đơn công/vật tư | Ảnh phải ready khi gửi; người thực hiện gửi trực tiếp, không thêm duyệt quản lý |
| [x] local/test¹ | B06-02 | Gửi/xem/yêu cầu sửa/xác nhận hóa đơn | Bản gửi bất biến, kiểm version; khóa xong không sửa số tiền; preview point mặc định 0 |
| [x] local/test¹ | B06-03 | Tích hợp dừng việc, hóa đơn 0 và trạng thái hoàn tất | Theo quy tắc đã chốt; xác nhận hóa đơn riêng chưa hoàn tất việc; tiền chỉ test khi B07 đạt |

## B07 — Ví/point/quyết toán — P0-3 local/test

Nguồn: [spec](../../ui-ux/specs/finance-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F11/F12; QA-029…037,043.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [x] local/test¹ | B07-01 | Ledger/holds/formula version và projection | Bút toán cân bằng, số nguyên; dùng bộ mẫu spec, không suy công thức từ một ví dụ UI |
| [x] local/test¹ | B07-02 | Point, giữ phí và hai dấu thanh toán | Khách báo trả + thợ xác nhận nhận; một settlement; thưởng chưa quyết toán không tiêu được |
| [x] local/test¹ | B07-03 | Ví/lịch sử và cạnh tranh/crash recovery | Nhiều việc song song; âm ví chỉ phục vụ phí; cash trực tiếp không hạch toán thành tiền platform |

¹ B06/B07: đánh dấu phần P0-3 trong B06-01, không gồm provider ảnh production, native picker, admin/Q02, giao diện ví/ngân hàng đầy đủ hoặc UAT.

## B08 — Ngân hàng/nạp/rút — đã có mô phỏng local, tiền test

Nguồn: [spec](../../ui-ux/specs/finance-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F12; QA-040…042.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [~] | B08-01 | Ngân hàng đã xác minh, topup/payout và hàng đợi duyệt | Đã nối DB/API/app/admin/test, một bank đang dùng, rút tối thiểu50.000, giữ tiền/chặn rút credit. Chỉ bộ mô phỏng local; xem B08-01. |
| [~] | B08-02 | Đối soát, idempotency và kết quả unknown | Đã kiểm mất phản hồi sau chuyển, giữ hold, đối soát giao dịch gốc một lần và source reference đúng chứng cứ. Chưa ngân hàng bên ngoài. |

## B09 — Hỗ trợ/admin — người gửi và quản trị local/test

**B09-03 ngày 19/10:** đã nối khu quản trị riêng trên app với MFA, hàng đợi/chi tiết/quyết định/nhật ký của P1-03; kiểm iOS simulator riêng với DEMO lưu bền. [Báo cáo và giới hạn](bao-cao/B09-03-admin-tren-dien-thoai.md). Không đóng các chức năng quản trị khác; Android native/UAT/CI mới chưa kiểm.

Nguồn: [spec](../../ui-ux/specs/support-moderation.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F14/F15/F16; QA-038,039,047,048.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | B09-01 | Báo cáo, chứng cứ, trao đổi và hàng đợi hỗ trợ | Phía người gửi/ảnh local có B09-01; web admin/MFA có B09-02, khu quản trị mobile có B09-03. Giữ trạng thái một phần do chưa UAT và còn giới hạn ghi trong báo cáo. Không sinh bút toán |
| [~] | B09-02 | Admin hoàn tất thay: preview/fresh auth/lý do/recheck | Lát tiền test [B09-04](bao-cao/B09-04-admin-hoan-tat-thay.md): quyết toán chung, giữ hai dấu và báo cáo; native/CI/UAT ghi riêng |
| [~] | B09-03 | Xử lý khôi phục/xóa, user/partner/verification/admin grants | User/partner/danh mục local có [B09-05](bao-cao/B09-05-admin-tai-khoan-va-danh-muc.md), verification có B02-04. Khôi phục/xóa và admin grants ngoài đợt; chưa UAT/production |

## B10 — Đánh giá và gọi — đánh giá sao/nội dung đã có lát local

Nguồn: [spec](../../ui-ux/specs/activity-batch.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F09/F13; QA-024,044…046.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [~] | B10-01 | Đánh giá hai chiều, sửa/ẩn/phản hồi, tính sao | Chỉ sau đủ hai dấu Q01; mỗi chiều một đánh giá; ẩn/gỡ không tính sao |
| [~] | B10-02 | Gọi trong app, đầu mối hiện hành và sau hoàn tất | LiveKit local có âm thanh tổng hợp hai chiều qua2browser, mute và server disconnect/cached-token denial. Android/iOS build có SDK; microphone/thiết bị, nền/đóng/APNs chưa nghiệm thu. Xem B10-05. |

## B11 — UAT và vận hành — chưa nghiệm thu

Nguồn: [spec](../../ui-ux/specs/admin-operations.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F16/F17/F18/F20; QA-051,052,054,055.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [~] | B11-01 | Admin tra cứu/hóa đơn/audit/metrics và permission matrix | Đã nối DB/API/web/mobile với quyền/MFA riêng, kỳ metrics nửa mở, tiền chuỗi chính xác và tra thao tác đúng actor. Xem B11-01; UAT riêng. |
| [ ] | B11-02 | UAT khách/partner/doanh nghiệp/admin xuyên toàn hành trình | Từng nền tảng, VI/EN/JA, accessibility, offline, nhiều tài khoản; chủ dự án xác nhận riêng |
| [~] | B11-03 | Runbook môi trường, deploy/backup/restore/rollback/giám sát | Đã có guard và diễn tập dump/restore schema DEMO, so dữ liệu/cấu trúc/ledger, chạy lại migration. Xem B11-02; chưa restore private assets/keys, production hoặc RPO/RTO. |

## G-MONEY — Cổng tiền thật — CHƯA ĐƯỢC PHÉP

Nguồn: [spec](../technical-design/04-backlog.md), [backlog](../technical-design/04-backlog.md), [API](../technical-design/openapi.json), [QA](../technical-design/03-qa-plan.md). Ánh xạ: F15/F12/F19; QA-038,043,055.

| Xong | Mã | Chức năng | Tiêu chí / phần còn thiếu |
|---|---|---|---|
| [ ] | G-MONEY-01 | Q02 khoản giữ treo, đối soát, dự trữ và ngoại lệ | PLAN-005/007, nhà cung cấp/ngân sách, chính sách và test phải được duyệt trước tiền thật |

## Ngoài phase đầu / chưa được mở lại

Banner chiến dịch, quảng cáo partner, voucher theo PROMO-02; chuyển chủ/đóng doanh nghiệp và các phương án pending khác không được biến thành nhiệm vụ triển khai đã duyệt. Point vẫn nằm trong B07. Website khách làm sau theo kế hoạch riêng; web Expo hiện là preview/test, không phải website sản phẩm. Không bắt đầu tiền thật từ việc đạt test sandbox.

## Khi cập nhật checklist

Ghi mã lát, trạng thái, commit, kết quả kiểm, báo cáo và phần thiếu. Nếu một lỗi hồi quy làm mất tiêu chí, bỏ tick ở lát bị ảnh hưởng và ghi lý do; không xóa bằng chứng cũ. Tra đầy đủ operationId/QA trong nguồn trước mỗi lát; các dải QA ở đây là điểm vào, không thay RTM hay xác nhận toàn bộ QA đã pass.

### MAP-01 — bằng chứng ngày 07/10/2026

- [x] Ba API và bộ chọn chung 4 nơi; hai key Geoapify thật trả 200; chưa billing.
- [x] 148 mobile; API toàn bộ 66 và nhóm địa điểm 6 bài sau bổ sung contract; 10 web và bài MAP chạy lại đạt. Typecheck/lint/native config đạt.
- [x] Build Android/iOS; live map trên emulator/simulator; Android accounts và iOS partners hồi quy đạt. Mermaid đã render, ảnh trong [B03-01 / MAP-01](bao-cao/B03-01-chon-dia-diem-va-ban-do.md).
- [ ] Live picker trọn 4 nơi trên từng native, GPS/chữ lớn/thiết bị thật, chủ dự án UAT.
- [x] MAP-01 push `4dc7600`; CI 37577265358 đạt cả 3 job.

### MAP-02 — bằng chứng ngày 07/10/2026

- [x] Quyết định public-only; API `map_location` Address/null, giữ ranking/cursor/quyền.
- [x] Danh sách/bản đồ, ghim trùng mở từng hồ sơ, thiếu ghim vẫn hiện danh sách; lỗi map/thử lại; VI/EN/JA.
- [x] Typecheck/lint, 153 mobile và 68 API, coverage gate; E2E web và web live.
- [x] Ảnh bản đồ/thẻ ghim trên Android emulator và iOS simulator; iOS mở hồ sơ đạt. Xem [B03-02](bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md).
- [x] Android kiểm lại đạt nhập địa chỉ → tìm → ghim → mở hồ sơ, sau gián đoạn emulator; có ảnh hồ sơ.
- [x] Commit/push `a6d4735`, sửa camera `8fdc9d4`; [CI MAP-02](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37584532165) đạt static/mobile/build, API/PostGIS và web E2E. Báo cáo/ảnh cập nhật riêng, không thay code đã kiểm.
- [ ] Thiết bị thật, UAT; chưa billing/production.

## P0-2 — kiểm phần local ngày 07/10/2026

- [x] B03-02: ba mode, làm ngay/hẹn trước, nhiều kỹ năng; phone/self-hire/schema/vùng; retry không trùng — API/DB và web hai tài khoản.
- [x] B03-03/04: list/detail, nhận ETA, từ chối/rút/đổi lịch/dừng; version race và lịch sử — API/web; native nhận ETA.
- [x] B04-02 phần phân công: một người hiệu lực, đổi người mất quyền việc cũ, giữ phòng riêng — API/DB. Chưa nghiệm thu toàn bộ quản trị nhân viên.
- [x] B05-01 phần HTTP: mở trước thuê, gửi/đọc/sequence/cursor/read, retry và quyền phòng riêng — API/web; đọc/gửi native Android/iOS.
- [ ] WebSocket/push/nhắc lịch, file/gọi; OTP thật; native toàn bộ ma trận phân công/lỗi; thiết bị thật, remote CI và UAT của đợt này.

Không đánh dấu toàn bộ B05 hoàn tất vì mới có phạm vi HTTP đã duyệt. Báo cáo [B03-04](bao-cao/B03-04-yeu-cau-nhan-viec-va-chat.md) ghi test và giới hạn.

### P1-02 — thông báo và nhắc lịch · 14/10/2026

- [x] DB/API/app: inbox riêng, phân trang, đọc tất cả, retry, bốn công tắc theo tài khoản; công tắc nhắc lịch riêng đã duyệt và đồng bộ spec.
- [x] Worker local: cùng giao dịch, không trùng, người nhận tại lúc phát sinh và quyền lúc giao; nhắc 24h/1h theo phiên bản lịch, không tự đóng việc.
- [x] API/PostGIS, component mobile và web hai tài khoản; Android emulator/iOS simulator lưu cài đặt và mở chat từ inbox.
- [ ] Thiết bị thật, push provider, WebSocket, lịch tổng hợp, remote CI mới và UAT.

Bằng chứng, ảnh và lệnh SDD: [B05-01](bao-cao/B05-01-thong-bao-va-nhac-lich.md). Không đánh dấu toàn B05 hoặc P1-2 hoàn tất.

### RT-01A — realtime foreground · 14/10/2026

- [x] Đã duyệt và đồng bộ Socket.IO websocket-only một API instance; HTTP ghi/lấy bù; migration 011, outbox và recipient snapshot riêng.
- [x] API: auth/ACL, logout/refresh/revoke, rollback/lease/retry/poison, giới hạn kết nối/gói và client chậm; test tích hợp local.
- [x] App: một kết nối theo phiên/foreground; chat/inbox/việc/hóa đơn tải lại, gom sự kiện trong lúc bận, giữ bản nhập và báo xung đột.
- [x] Web hai tài khoản: chat live/offline catch-up/read phiên khác; hóa đơn sửa/xác nhận/hai dấu thanh toán dùng tiền test.
- [x] Thử tải local: 100 kết nối, 3.000 tin/300 giây, đủ 60.000 lượt tin; p95 HTTP ACK → nhận frame 113 ms. Không đồng nhất với độ trễ render/UI production.
- [x] iOS 27 simulator và Android API 36 emulator: phòng đang mở nhận tin DEMO không tải lại; có ảnh trong B05-02. Android debug build đạt.
- [ ] Thiết bị thật, full ma trận native, remote CI mới và UAT; chưa push provider/production.
- [ ] RT-01B: bus/adapter cho nhiều API instance, chưa mở Redis.

Báo cáo/ảnh/native và bằng chứng SDD: [B05-02](bao-cao/B05-02-realtime-inbox-va-chat.md). Các dòng chưa WebSocket ở mốc P0-2/P1-02 phía trên là lịch sử trước RT-01A. Không đóng toàn bộ B05/P1-2.


### MSG-01 — tách Tin nhắn và Thông báo · 15/10/2026

- [x] Backend ngừng tạo inbox chat; loại mục chat cũ trước phân trang và bỏ qua hàng chờ cũ; kiểm API local.
- [x] Hai badge độc lập, tổng qua nhiều trang, 0 ẩn/99+; đọc ở phiên khác, hồi phục mạng, đổi tài khoản; kiểm mobile/web.
- [x] Android 16 emulator/iOS 27 simulator: hai badge riêng; đọc thông báo không đọc chat, đồng bộ giữa hai phiên. Không quay lại video theo yêu cầu.
- [x] Spec MSG-01 và sổ v1.52; nguồn/mirror/export/Drive cùng ID, đọc lại. Báo cáo chỉ repo.
- [ ] CI mới, UAT, điện thoại thật và push provider.

Bằng chứng và giới hạn: [B05-03](bao-cao/B05-03-tach-tin-nhan-va-thong-bao.md). SDD-PROJECT vẫn giữ toàn bộ tiêu chí trước và QA partial/unmapped; evidence toàn repo tạo bằng sdd:run/verify trên nội dung cuối.

## P1-06 — Phần còn lại P1-2 đã được duyệt trong cùng đợt

- [x] DB/API/app ghi chú nội bộ, kiểm quyền và retry; không hiện cho người gửi hoặc admin chỉ đọc audit.
- [x] Lịch sử đánh giá khách tối thiểu theo quan hệ việc và quyền hiện hành; ẩn đánh giá bị gỡ/kiểm duyệt.
- [x] Bổ sung dấu nhận tiền sau admin hoàn tất một lần, không sinh quyết toán hoặc thưởng mới.
- [x] Vẽ đa giác, chọn điểm đại diện riêng; gom cụm theo zoom; rating/recommended với thứ tự phân trang cố định.
- [x] Sự kiện/inbox hỗ trợ, xác minh, đánh giá chỉ đúng người; sự kiện không mang nội dung riêng.
- [x] Code Expo push: đăng ký/thu hồi token, hàng đợi, kiểm quyền/công tắc, ticket/receipt và mở đối tượng; test transport giả lập.
- [x] Ảnh Expo web và admin web DEMO, báo cáo học code/Mermaid; không dùng ảnh web thay bằng chứng native.
- [x] Build Android/iOS, thông báo mô phỏng hiện và mở đúng báo cáo; iOS mở từ app đã đóng, đăng ký token và gọi Expo thật bị từ chối `InvalidCredentials`. Chi tiết/ảnh ở B05-06.
- [x] 21/10: FCM V1 gắn đúng app; Android Emulator nhận thật qua Expo/FCM, 4 receipt thành công, bấm từ nền mở đúng báo cáo. Cold-start lượt kiểm lại đạt, một lần chỉ mở trang chủ vẫn ghi nhận trong B05-06.
- [ ] Kiểm thiết bị thật iOS/Android với native build mới và dự án Expo/FCM/APNs; gửi → nhận khi nền/đóng → mở đúng quyền.
- [ ] Remote CI mới và UAT chủ dự án. Kết quả SDD local cuối đọc tại `test-results/sdd/SDD-PROJECT/`, không lấy mốc các đợt cũ.
- [ ] Chọn tin nhắn làm chứng cứ: chủ dự án chủ động để sau, không thuộc tiêu chí đóng code đợt này.

Các mục P1-2 cũ bên trên là lịch sử theo lát; tra bốn báo cáo P1-06 cho bổ sung mới. P2 vẫn chưa mở.

### AWS-02 — OTP email (05/11/2026)

- [x] Code chính sách email riêng cho lab, Resend và cấu hình secret; kiểm API local luồng tạo dịch vụ/gửi/nhận việc.
- [x] Typecheck và component test liên quan; xem [B00-21](bao-cao/B00-21-otp-email-lab.md) cho bằng chứng UI/SDD của đợt.
- [ ] Xác minh DNS/domain Resend và gửi email thật sau deploy; AWS live, native và UAT chưa kiểm.

### AWS-02 — realtime, cloud media và push (06/11/2026)

- [x] Code singleton theo DB session, ngắt gateway/worker khi mất khóa; giữ ACL và HTTP lấy bù.
- [x] Cloud adapter giữ explicit-room probe, namespace riêng, revoke hai identity và delete room; cấu hình key server.
- [x] Mở Expo Push cho lab; TTL cuộc gọi, private key injection, profile build và project UUID.
- [x] Lệnh kiểm media trước AWS; teardown dừng task trước dọn media và giữ lỗi để retry; kiểm local/mock theo [B00-22](bao-cao/B00-22-realtime-livekit-push-lab.md).
- [ ] LiveKit project thật qua probe/revocation/audio; AWS handshake và hai chu kỳ dựng/dọn.
- [ ] Push trên Android/iOS thật và từng trạng thái app; native incoming-call UI/CallKit/PushKit chưa hoàn tất.

### AWS-02 — tài chính test và màn Ví (06/11/2026)

- [x] Chế độ lab riêng, key bền trong runtime secret, giới hạn AWS-01/local cũ giữ nguyên; bootstrap quyền đọc/duyệt cho admin lab đầu tiên.
- [x] Nạp/rút mô phỏng có quyền/MFA, audit nguồn giả và sổ tiền/hold/retry; kiểm API local và hành trình web.
- [x] Màn Ví đọc số dư/lịch sử khi ngân hàng lỗi, khóa nút tiền và phục hồi; mất quyền xóa dữ liệu. Nhãn tiền test VI/EN/JA trên app/admin.
- [x] Ảnh Expo web/admin desktop mới và hướng dẫn thử trong [B00-23](bao-cao/B00-23-tien-test-tren-lab.md).
- [ ] Dựng AWS thật, kiểm key qua restart, thử nạp/rút trên thiết bị và UAT. Không mở ngân hàng/tiền thật.

### ANDROID-CALLS — Gọi khi app chạy nền · 06/11/2026

- [x] Code capability/migration, data-only qua Expo/FCM, hết hạn/dismiss và giữ luồng push bản cũ; kiểm API local.
- [x] Nút native đọc lại quyền/trạng thái, chống sai người/giả launcher action; kiểm component và plugin.
- [x] Debug APK và assertions instrumentation API 36 với payload/HTTP DEMO; ảnh native và Mermaid trong B00-24. Không chứng nhận FCM/media thật.
- [ ] Thiết bị thật: âm thanh hai chiều khi Home/khóa máy, FCM/cold-start, token refresh, hãng tiết kiệm pin, release và UAT.
- [ ] iOS CallKit/PushKit; ngoài phạm vi Android được giao.

Bằng chứng APK/emulator, ảnh và hướng dẫn: [B00-24](bao-cao/B00-24-cuoc-goi-android.md). Không dùng kiểm mock thay provider live.
