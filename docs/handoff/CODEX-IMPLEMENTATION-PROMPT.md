# DOC-064 — Prompt bàn giao triển khai cho Codex

Phiên bản 1.1 · 28/09/2026 · Dự án **Dịch vụ quanh bạn**.

Tài liệu này là hướng dẫn cho phiên triển khai tiếp theo. Việc tạo tài liệu chưa khởi chạy triển khai. Khi chủ dự án yêu cầu Codex làm theo tài liệu này, phạm vi thực hiện là **Đợt 1** bên dưới; không tự mở toàn bộ roadmap.

> Cập nhật triển khai 28/09/2026: Đợt 1 đã được kích hoạt. Đọc [DOC-065](../implementation/dot-1.md) và [ADR-001](../implementation/ADR-001-foundation.md) để tiếp tục từ hiện trạng, không dựng lại hoặc reset dữ liệu. Các mốc baseline bên dưới giữ để đối chiếu; native/remote CI chưa nghiệm thu.

## Cách chủ dự án sử dụng

Mở Codex tại thư mục `/Users/j2866/Documents/anhthai/dich-vu-quanh-ban`, gửi:

> Đọc AGENTS.md và docs/handoff/CODEX-IMPLEMENTATION-PROMPT.md. Thực hiện Đợt 1 theo tài liệu này. Kiểm tra hiện trạng trước, bảo toàn dữ liệu và thay đổi đang có. Làm đến khi các tiêu chí hoàn thành đạt hoặc chỉ rõ phần bị chặn; đồng bộ tài liệu theo sổ Excel. Chưa triển khai production hay kết nối tiền thật.

Nếu chuyển máy, dùng đường dẫn dự án tương ứng. Các đường dẫn phía dưới tính từ gốc dự án.

---

## Chỉ dẫn dành cho Codex

Bạn là kỹ sư triển khai cho dự án này. Trao đổi bằng tiếng Việt, chủ động thực hiện phần đã được giao, không chỉ đưa kế hoạch rồi dừng. Không hỏi lại các quyết định đã chốt. Chỉ gom câu hỏi khi thiếu quyết định nghiệp vụ, quyền truy cập hoặc có thao tác vượt phạm vi.

### 1. Đọc nguồn đúng thứ tự

1. `AGENTS.md` và mọi hướng dẫn áp dụng trong thư mục sẽ sửa.
2. `docs/project-control/So-quan-ly-tai-lieu.xlsx`: đọc Danh muc, Quyet dinh, Anh huong, Dong bo. Đây là sổ quản lý và liên kết, không thay thế tài liệu gốc. Bản hiện tại khi bàn giao là v1.28; luôn kiểm phiên bản thực tế mới hơn.
3. `README.md`, `ui-ux/specs/ux-scope-current.md`, `ui-ux/specs/flow-review.md`.
4. BRD/FR/NFR/SRS hiện hành theo liên kết trong Excel. Một số tài liệu gốc chỉ có trên Drive, ô đường dẫn local ghi “Chưa có”; không tự tạo nội dung thay thế hoặc coi đó là chưa có yêu cầu. Nếu chưa đọc được, ghi rõ và tiếp tục những phần không phụ thuộc; dừng nhánh nghiệp vụ chưa đủ căn cứ.
5. `docs/project-docs/architecture-v0.1.md`, `02-user-flow.md`, `03-screen-flow.md`, `04-sequence-diagrams.md` trong cùng thư mục.
6. `docs/technical-design/README.md`, `01-data-design.md`, `schema.sql`, `02-api-realtime.md`, `openapi.json`, `03-qa-plan.md`, `04-backlog.md`. Tra nguồn JSON/CSV tương ứng khi sửa các bản xuất.
7. Spec UI liên quan tại `ui-ux/specs`, đặc biệt `design-system.md`, `customer-journey.md`, `partner-journey.md`; đọc code prototype để hiểu tương tác, không lấy mock làm quy tắc sản phẩm.

Quyết định mới nhất của chủ dự án ưu tiên hơn tài liệu cũ. “Mới nhất” nghĩa là bản hiện hành, không có nghĩa mọi đề xuất trong tài liệu đã được duyệt. Nếu gặp mâu thuẫn không giải được từ quyết định đã ghi, nêu hai nguồn và hỏi gộp trước khi viết nhánh phụ thuộc.

### 2. Hiện trạng cần kiểm lại

- Đã có prototype React + Storybook trong `ui-ux/prototype`, snapshot bàn giao React v0.15, 52 stories, 49 model tests. Các số này là mốc tham khảo; chạy kiểm tra lại trước khi báo cáo.
- Prototype dùng dữ liệu trong bộ nhớ, vai trò/OTP giả, bản đồ và liên lạc mô phỏng. Nó không có backend, xác thực thật hoặc thanh toán thật.
- `apps/mobile`, `apps/web`, `apps/admin`, `services/api`, `packages` đang dành chỗ; không giả định đã có ứng dụng sản phẩm.
- Git root quan sát lúc bàn giao là `/Users/j2866/Documents/anhthai`, bao gồm dự án khác. Chạy kiểm tra Git trước khi sửa cấu hình repository. Không stage toàn bộ thư mục cha, không chuyển/xóa `.git`, không tự tạo branch/commit/push. Nếu CI/repository độc lập cần quyết định, chuẩn bị cấu hình trong dự án và hỏi một lần; không tự sửa repository cha.
- Có symlink tương thích `outputs`, `work`, `apps/ui`; một số nguồn kỹ thuật có bản phục vụ localhost. Dùng đường dẫn chính, kiểm realpath và nguồn trước khi sửa. Không tạo hai nguồn nội dung độc lập hoặc quét đệ quy symlink sang dự án khác.
- Không làm hỏng Storybook, prototype nghiệp vụ, file Excel hoặc tài liệu đang dùng. Không chạy lại builder cũ để ghi đè chỉnh sửa hiện hành.

### 3. Các hướng đã chốt

| Hạng mục | Hướng triển khai |
|---|---|
| Mobile | Expo / React Native, Android và iOS; ưu tiên app |
| Backend | NestJS; ưu tiên một ứng dụng chia module theo miền nghiệp vụ |
| Dữ liệu | PostgreSQL + PostGIS |
| Website | React responsive, triển khai sau luồng app; không bắt buộc làm web/admin thật trong Đợt 1 |
| UI | Hướng “Dịch vụ khu phố”, cobalt; bám các màn đã duyệt |
| Phạm vi thị trường | Hà Nội, cấu trúc ngành → nhóm → kỹ năng có thể mở rộng |
| Tiền thật | Không trong đợt nền tảng |

ORM, phiên bản runtime/framework, công cụ workspace, nhà cung cấp dịch vụ và ngân sách chưa được chốt toàn bộ. Kiểm tương thích bằng tài liệu chính thức tại thời điểm triển khai; chọn cấu hình tối thiểu phù hợp một người phát triển, ghi quyết định và lý do trong ADR. Không tự mua dịch vụ. Các lựa chọn kỹ thuật thông thường không cần hỏi từng mục; lựa chọn phát sinh phí, thay nền tảng đã chốt hoặc thao tác ảnh hưởng dự án khác phải nêu rõ.

Có thể chia sẻ API types, validation/domain thuần và design tokens khi có nhu cầu thật. Không coi component DOM/CSS của React web là component React Native dùng nguyên trạng. Không dựng microservices, Kubernetes hoặc nhiều package trống chỉ để trông đầy đủ.

### 4. Đợt 1 — phạm vi được giao khi prompt này được kích hoạt

**Mục tiêu:** trên app, người dùng xem được danh mục ngành/nhóm/kỹ năng lấy từ API và PostgreSQL thật; môi trường local có thể dựng lại và kiểm thử tự động.

#### A. Kiểm tra và lập kế hoạch ngắn

- Kiểm cây thư mục, Git, package manager/lockfile, runtime, Docker, khả năng chạy thiết bị/simulator và các sửa đổi hiện có.
- Ghi baseline, phần sẽ sửa, các nguồn liên quan và thứ tự thực hiện. Không xóa, reset hoặc dọn file ngoài phạm vi.
- Đối chiếu B00 của backlog. Luồng danh mục chỉ là lát kiểm chứng nền tảng, không tuyên bố hoàn thành toàn bộ B02/nguồn cung.

#### B. Dựng workspace sản phẩm

- Đặt app tại `apps/mobile`, API tại `services/api`; cấu hình local/test tại `infra` nếu phù hợp.
- Tách prototype khỏi ứng dụng thật; giữ scripts/lockfile đang dùng cho thiết kế nếu chưa có lý do di chuyển.
- Có scripts rõ ràng cho cài đặt, lint, typecheck, test, build, chạy API và mobile.
- Có `.env.example` chỉ chứa giá trị mẫu; không ghi secrets vào code/log/repository.

#### C. Database và migration

- Dựng PostgreSQL/PostGIS local, healthcheck và hướng dẫn khởi động/dừng. Không tự phá volume hoặc dữ liệu đang có.
- Dùng migration có phiên bản cho ngành, nhóm và kỹ năng; đối chiếu thiết kế hiện hành trước khi tạo schema. Không chạy toàn bộ DDL đề xuất một cách mù quáng.
- Dùng ID ổn định, foreign key, trường trạng thái và ràng buộc phù hợp. Không dùng tên hiển thị làm khóa nối dữ liệu.
- Seed ngành/kỹ năng từ nguồn đã thống nhất, chạy lặp không nhân đôi, không ghi đè dữ liệu người dùng. Dữ liệu demo chỉ ở local/test.
- Có cách kiểm migration/seed trên DB test trống, kiểm extension PostGIS và quan hệ dữ liệu. Database test tách biệt DB làm việc.

#### D. API danh mục

- Theo OpenAPI hiện hành; nếu contract thiếu/chưa phù hợp, ghi thay đổi kỹ thuật và đồng bộ trước khi bàn giao. Không phát minh endpoint trùng chức năng đã thiết kế.
- API đọc ngành/nhóm/kỹ năng từ DB; danh mục ngừng hoạt động không hiện trong lựa chọn mới, không xóa lịch sử.
- Có kiểm tra input, lỗi có cấu trúc, cấu hình môi trường và health/readiness phù hợp. Không trả stack trace/secrets cho client.
- Chưa làm CRUD admin, đăng nhập thật, thuê dịch vụ, ví, chat hoặc các tích hợp ngoài trong đợt này.

#### E. App kết nối thật

- Dựng màn chọn ngành và danh sách kỹ năng theo hướng UI đã duyệt, điều hướng đủ để thử luồng.
- Hiển thị loading, rỗng, lỗi và nút thử lại. Khi API lỗi phải báo lỗi, không âm thầm hiện mock như dữ liệu thật.
- Cấu hình API base URL theo môi trường, ghi cách dùng với thiết bị thật/simulator; không giả định localhost trên điện thoại là máy phát triển.
- Không đưa nút chọn vai trò mẫu, OTP 123456/654321 hoặc số dư giả từ prototype vào lớp sản phẩm.

#### F. Kiểm thử và CI

- Unit test quy tắc lọc danh mục; integration test HTTP → service → PostgreSQL test thật.
- Kiểm migration/seed lặp lại; API không trả mục ngừng ở cả cấp cha/con; lỗi input và quan hệ không hợp lệ.
- Kiểm màn app tải, rỗng, lỗi/thử lại bằng công cụ phù hợp; smoke test luồng app → API → DB trên môi trường có thể chạy.
- CI chạy lint, typecheck, tests, migration test và build/check app phù hợp. Pin runtime và dùng lockfile.
- Chuẩn bị CI trong dự án; không commit/push hoặc tuyên bố đã chạy CI từ xa khi mới chạy lệnh tương đương ở local. iOS build ký số/app-store release không thuộc yêu cầu này.
- Nếu thiếu Docker/simulator/credentials, ghi đúng kiểm tra bị chặn và tác động. Mock test không được báo là integration thật.

### 5. Tiêu chí hoàn thành Đợt 1

- [ ] Cài từ lockfile và chạy theo README mới trên môi trường được mô tả.
- [ ] Migration chạy trên DB test trống; PostGIS sẵn sàng; seed chạy hai lần không nhân đôi.
- [ ] API đọc dữ liệu DB thật, có test tích hợp và contract tương ứng.
- [ ] App hiển thị dữ liệu API và thể hiện đúng trạng thái tải/rỗng/lỗi.
- [ ] Lint/typecheck/test/build hoặc kiểm tra bundle phù hợp đạt; ghi tên lệnh và kết quả thực tế.
- [ ] Prototype cũ vẫn build được nếu thay đổi workspace có thể tác động đến nó.
- [ ] Không có secrets, thanh toán thật, deployment công khai hoặc thay đổi dự án ngoài phạm vi.
- [ ] Tài liệu triển khai, ADR, các nguồn bị ảnh hưởng và sổ Excel được đồng bộ/kiểm lại; phần bị chặn ghi rõ.

Nếu một mục chưa đạt, báo phần hoàn thành và việc còn thiếu; không đổi tiêu chí để có trạng thái xanh. Dừng ở điểm bàn giao Đợt 1, không tự triển khai toàn bộ roadmap.

### 6. Quy tắc nghiệp vụ phải bảo toàn cho các đợt sau

Đây là bảng nhắc, không thay SRS và Quyet dinh:

- Partner gồm thợ tự do/cửa hàng/doanh nghiệp; một tài khoản có thể thuê và cung cấp dịch vụ. Quyền theo năng lực thao tác, không bắt cửa hàng nhỏ có người điều phối riêng.
- Chat được mở trước thuê; phòng theo cặp tài khoản, dùng lại khi thuê tiếp. Phân công nhân viên nối vào phòng riêng khách–nhân viên, quản lý không mặc nhiên đọc được.
- Partner tắt nhận việc/đình chỉ không nhận yêu cầu mới; việc cũ giữ theo quyền hiện hành. Kiểm trạng thái tại thời điểm gửi, không chỉ lúc mở màn.
- Hóa đơn sau ảnh kết quả; vật tư và tiền công tách biệt. Phí 10% tiền công. Khách duyệt/áp point, báo thanh toán; người thực hiện xác nhận nhận tiền. Hai phía xác nhận mới mở đánh giá.
- Hóa đơn đã khóa không tự sửa/hủy; ngoại lệ qua báo cáo/admin. Không tự kết thúc công việc theo thời gian.
- Point 1=1đ, dùng trên tổng hóa đơn, không rút/chuyển/đáo hạn. Cách tính thưởng, giữ phí, quyết toán lấy từ quyết định tài chính mới nhất; không suy ra chỉ từ ví dụ 2% cũ. Prototype hiện minh họa thưởng 2% phần tiền công phân bổ vào khoản trả trực tiếp.
- Âm ví tối đa 100.000đ phục vụ phí, không dùng để rút. Mỗi partner một ngân hàng nhận tiền; duyệt nạp/rút thủ công lúc đầu.
- Tiếng Việt mặc định. Giữ khả năng mở rộng Anh/Nhật, không ưu tiên bản dịch trong đợt này.
- Banner/quảng cáo/voucher, chuyển chủ/đóng doanh nghiệp vẫn pending. Khoản giữ treo phải có xử lý được kiểm chứng trước khi chạy tiền thật, không tự mở lại trong đợt nền tảng.

### 7. Đồng bộ và bàn giao mỗi đợt

- Kiểm Excel local và Drive trước sửa, bảo toàn chỉnh sửa người dùng. Drive registry ID `18eWx9ObcWbpRNSIsxKs7YTwBpR-ZPjQq`; thư mục dự án `1msYKneD2-9yZMUXU0qlWQjzrCVE9gcO7`.
- Tra Anh huong rồi tìm kiếm chéo. Cập nhật đúng các nguồn bị tác động: hợp đồng API, dữ liệu, UX, kế hoạch QA, backlog, runbook… Không sửa mọi file theo cách thay phiên bản hàng loạt.
- Cập nhật Quyet dinh / Dong bo / Danh muc, người kiểm tra, bằng chứng và giới hạn. Đăng ký tài liệu mới; bản xuất phải có nguồn và phiên bản.
- Drive không truy cập được thì ghi “chưa đồng bộ Drive” cùng lý do, không tạo sổ quản lý thay thế hoặc báo đã đồng bộ toàn bộ.
- Báo cáo cuối: đã làm gì, cách chạy, test đã chạy/chưa chạy, phần còn thiếu, thay đổi tài liệu và câu hỏi thực sự cần quyết định.
- Không sửa trí nhớ cá nhân, tạo task mới, branch/commit/push, triển khai production hoặc nhắn người khác khi chưa được yêu cầu.

## Bước sau Đợt 1 — chỉ tham khảo

Tài khoản/quyền → hồ sơ partner → tìm/thuê → doanh nghiệp/phân công → chat/lịch → hóa đơn → ví/point thử nghiệm → ngân hàng sandbox → hỗ trợ/admin → UAT/vận hành. Luôn theo backlog hiện hành và quyết định mới nhất; chưa có hạn ra mắt hoặc ngân sách được ấn định.
