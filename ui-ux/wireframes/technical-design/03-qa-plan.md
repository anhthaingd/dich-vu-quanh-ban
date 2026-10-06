# Kế hoạch QA, RTM và UAT

> **B01-04A · 06/10/2026 · v0.1.5: chủ dự án duyệt gộp quản lý phiên và sổ địa chỉ. Một mục phiên đại diện một lần đăng nhập (id = family_id ổn định qua refresh), có created_at, last_seen_at, is_current; state active/expired/revoked; không trả IP, token/hash. Thu hồi chặn toàn bộ family và kiểm lại quyền trong transaction. Địa chỉ thêm is_default/version; địa chỉ đầu tiên khi sổ đang rỗng tự mặc định. Chọn mặc định mới bỏ mặc định cũ và tăng version bản cũ. Gỡ mặc định để chưa có mặc định, không tự chọn mục khác. PUT yêu cầu expected_version. Mọi mutation giữ Idempotency-Key khi retry, kiểm chủ sở hữu; archive giữ dữ liệu lịch sử, không đổi snapshot công việc. Nhập địa chỉ/tọa độ thủ công, chưa chọn GPS/map provider. OTP Pending; không production/chi phí.**

> **B01-04 · 06/10/2026 · v0.1.4:** Bổ sung QA-070/071 cho `Me.version` và sửa tên: schema Session/Me, phiên bị thu hồi khi chờ khóa, chống ghi đè, retry sau mất phản hồi, rollback, bảo toàn bản nháp VI/EN/JA, lưu tên qua mở lại native. Các ca dưới đây là tiêu chí kiểm; kết quả thực tế và giới hạn ghi trong báo cáo B01-04 ở repo.

> **I18N-04 · 05/10/2026 · v0.1.3 (phạm vi danh mục đã duyệt):** Bổ sung QA-067…069 và RTM cho danh mục đa ngôn ngữ: đầy đủ cây/seed bảo toàn dữ liệu, locale/fallback/cursor, đổi ngôn ngữ khi request chậm, chữ dài và retry native. Bằng chứng mới nằm trong báo cáo I18N-04 thuộc bộ kế hoạch repo; các ca lịch sử vẫn giữ ngày cũ.


Phiên bản 0.1.2 · 28/09/2026 · Đợt 1 triển khai local danh mục Expo/NestJS/PostgreSQL/PostGIS. Chi tiết và bằng chứng tại DOC-065; phần ngoài danh mục vẫn là thiết kế, chưa production/tiền thật.

## Phân biệt thiết kế và kết quả chạy

Các ca QA-001…055 toàn sản phẩm vẫn Chưa chạy. Đợt 1 thêm QA-056…059 đã kiểm local; QA-060 native chưa chạy. Không đổi QA-007 (createSkill/admin) hoặc QA-055 rộng hơn thành đạt từ lát đọc danh mục. Kiểm parser DDL/OpenAPI và xem tài liệu không chứng minh backend an toàn, không thay kiểm thử tích hợp PostgreSQL/PostGIS hoặc UAT trên iOS/Android/web.

## Tầng kiểm thử

| Tầng | Thực hiện | Khi chạy |
|---|---|---|
| Unit | Công thức số nguyên, state guard, policy/DTO, tính reminder | Mỗi thay đổi logic |
| Contract | Mỗi operation: input/output schema, field riêng tư, lỗi, auth, version/key | Mỗi PR thay contract |
| Integration | PostgreSQL/PostGIS thật với migration mới; transaction song song, FK/unique/trigger | CI backend; không thay bằng SQLite/mock |
| E2E | App iOS/Android và web theo vai; retry/deep link/offline | Khi hoàn tất lát chức năng |
| Security | Tenant/IDOR, session revoke, signed asset ACL, không lộ thông tin | Mỗi thay đổi quyền và trước ra mắt |
| Recovery | Kill sau commit, worker chết, payout unknown, backup/restore | Trước triển khai module tiền và trước ra mắt |
| Load | Search/map/chat/confirm/queue với dữ liệu thực tế dự kiến | Đặt mục tiêu khi có quy mô; chưa tự nhận 10.000 concurrent |

## Fixtures bắt buộc

Hai doanh nghiệp A/B; một quản lý kiêm nhiều quyền; hai thợ; một người là member cả A/B; một thợ tự do; hai khách; một admin giới hạn và một admin tài chính. Có partner unverified/verified/rejected/off, vùng sát biên, hai việc cùng ví/point, invoice0/toàn point, hai phiên bản, thợ đã rời, review hidden+self-removed và payout unknown. Dữ liệu giả; không dùng thông tin ngân hàng thật trong test.

## Cách chạy ca cạnh tranh

Dùng hai kết nối DB độc lập, barrier đồng bộ trước điểm khóa, không chỉ Promise.all với một transaction. Assert kết quả DB sau cả hai commit/rollback: số settlements, entries, holds theo invoice, balance projection và outbox. Crash inject trước và sau commit. Không chỉ kiểm HTTP200 hoặc đếm callback.

## Điều kiện hoàn thành

- Mọi yêu cầu đang triển khai có FR → operation/schema → ca test → bằng chứng build/commit.
- P0 tiền/quyền chạy pass trên DB thật; không còn lỗi mở gây sai tiền, mất dữ liệu hoặc rò quyền.
- Kiểm transaction cân bằng từng unit, không chỉ số dư cuối; payout unknown không bị release từ timeout.
- iOS/Android/web có hành trình chính và lỗi thực tế; reviewer người dùng duyệt UAT.
- Test pending phải ghi lý do, phạm vi bị chặn và người quyết định; không đổi thành PASS vì mock không hỗ trợ.
- Q02/PLAN-005 chưa giải quyết thì khóa giao dịch tiền thật, kể cả các ca normal-path đã pass.

## Bộ ca nghiệp vụ

Chi tiết ở qa-cases.csv/json. Có 55 ca nghiệp vụ ưu tiên và một CT-<operationId> cho mỗi API. RTM liên kết operation với các ca chuyên sâu; operation chưa có scenario riêng vẫn phải có contract test, không coi là đủ E2E.

| Mã | Nhóm | FR / quyết định | API | Mức | Trạng thái |
|---|---|---|---|---|---|
| QA-001 | Tài khoản | FR-AUTH-001 | verifyOtp | P0 Integration | Chưa chạy |
| QA-002 | Tài khoản | FR-AUTH-001 | login | P0 Integration | Chưa chạy |
| QA-003 | Tài khoản | FR-AUTH-008 | refreshSession | P0 Integration | Chưa chạy |
| QA-004 | Tài khoản | FR-AUTH-005; FR-AUTH-006 | confirmIdentityChange | P0 Integration | Chưa chạy |
| QA-005 | Tài khoản | FR-AUTH-007; FR-ADM-024 | decideRecovery | P0 Integration | Chưa chạy |
| QA-006 | Tài khoản | FR-AUTH-003; FR-ADM-025 | requestDeletion | P0 Integration | Chưa chạy |
| QA-007 | Nguồn cung | FR-CAT-001; FR-CAT-002 | createSkill | P0 Integration | Chưa chạy |
| QA-008 | Nguồn cung | FR-PAR-001 | createPartner | P0 Integration | Chưa chạy |
| QA-009 | Nguồn cung | FR-PAR-003 | setAvailability | P0 Integration | Chưa chạy |
| QA-010 | Nguồn cung | FR-PAR-005; FR-SEARCH-002 | searchPartners | P0 Integration | Chưa chạy |
| QA-011 | Nguồn cung | FR-SEARCH-003; FR-SEARCH-005 | searchPartners | P0 Integration | Chưa chạy |
| QA-012 | Nguồn cung | FR-SEARCH-004 | getPartner | P0 Integration | Chưa chạy |
| QA-013 | Doanh nghiệp | FR-ORG-004; FR-ORG-005 | inviteMember | P0 Integration | Chưa chạy |
| QA-014 | Doanh nghiệp | FR-ORG-001; FR-CHAT-004 | assignJob | P0 Integration | Chưa chạy |
| QA-015 | Doanh nghiệp | FR-ORG-003; FR-ORG-006 | assignJob | P0 Integration | Chưa chạy |
| QA-016 | Doanh nghiệp | FR-ORG-002 | sendInvoice | P0 Integration | Chưa chạy |
| QA-017 | Công việc | FR-JOB-001 | createJob | P0 Integration | Chưa chạy |
| QA-018 | Công việc | FR-JOB-002 | acceptJob | P0 Integration | Chưa chạy |
| QA-019 | Công việc | FR-JOB-003; FR-JOB-004 | rescheduleJob | P0 Integration | Chưa chạy |
| QA-020 | Công việc | FR-JOB-005 | stopJob | P0 Integration | Chưa chạy |
| QA-021 | Liên lạc | FR-CHAT-001; FR-CHAT-006 | openConversation | P0 Integration | Chưa chạy |
| QA-022 | Liên lạc | FR-CHAT-004 | listMessages | P0 Integration | Chưa chạy |
| QA-023 | Liên lạc | FR-CHAT-005 | sendMessage | P0 Integration | Chưa chạy |
| QA-024 | Liên lạc | FR-CALL-001 | startCall | P0 Integration | Chưa chạy |
| QA-025 | Liên lạc | FR-NOT-002; FR-NOT-003 | setSettings | P0 Integration | Chưa chạy |
| QA-026 | Tài chính | FR-INV-001 | sendInvoice | P0 Integration | Chưa chạy |
| QA-027 | Tài chính | FR-INV-002 | saveInvoiceDraft | P0 Integration | Chưa chạy |
| QA-028 | Tài chính | FR-INV-003; FR-INV-004 | confirmInvoice | P0 Integration | Chưa chạy |
| QA-029 | Tài chính | FR-FEE-001; FR-POINT-003 | settleInvoice | P0 Integration | Chưa chạy |
| QA-030 | Tài chính | FR-POINT-001; FR-WAL-003 | confirmInvoice | P0 Integration | Chưa chạy |
| QA-031 | Tài chính | FR-WAL-002 | confirmInvoice | P0 Integration | Chưa chạy |
| QA-032 | Tài chính | FR-POINT-001 | confirmInvoice | P0 Integration | Chưa chạy |
| QA-033 | Tài chính | FR-WAL-002; FR-WAL-005 | createPayout | P0 Integration | Chưa chạy |
| QA-034 | Tài chính | FR-INV-006; FR-ADM-012 | completeOnBehalf | P0 Integration | Chưa chạy |
| QA-035 | Tài chính | FR-INV-006 | settleInvoice | P0 Integration | Chưa chạy |
| QA-036 | Tài chính | FR-INV-007; Q01 | reportPayment | P0 Integration | Chưa chạy |
| QA-037 | Tài chính | FR-INV-008; Q01 | settleInvoice | P0 Integration | Chưa chạy |
| QA-038 | Tài chính | FR-INV-005; Q02 | adminInvoices | P0 Integration | Chưa chạy |
| QA-039 | Tài chính | FR-ADM-012 | completeOnBehalf | P0 Integration | Chưa chạy |
| QA-040 | Tài chính | FR-WAL-004 | adminDecideTopups | P0 Integration | Chưa chạy |
| QA-041 | Tài chính | FR-WAL-005 | adminDecidePayouts | P0 Integration | Chưa chạy |
| QA-042 | Tài chính | FR-WAL-005 | createPayout | P0 Integration | Chưa chạy |
| QA-043 | Tài chính | FR-WAL-001 | getLedger | P0 Integration | Chưa chạy |
| QA-044 | Đánh giá | FR-REV-001; FR-REV-004; Q01 | createReview | P0 Integration | Chưa chạy |
| QA-045 | Đánh giá | FR-REV-005; FR-REV-006 | toggleOwnReview | P0 Integration | Chưa chạy |
| QA-046 | Đánh giá | FR-REV-007 | getJobReviews | P0 Integration | Chưa chạy |
| QA-047 | Admin | FR-SUP-001; FR-ADM-012 | decideReport | P0 Integration | Chưa chạy |
| QA-048 | Admin | FR-ADM-024 | decideUser | P0 Integration | Chưa chạy |
| QA-049 | Admin | FR-CAT-002 | editSkill | P0 Integration | Chưa chạy |
| QA-050 | Hạ tầng | FR-NOT-001 | listNotifications | P0 Integration | Chưa chạy |
| QA-051 | Hạ tầng | FR-INV-006 | getOperation | P0 Integration | Chưa chạy |
| QA-052 | Hạ tầng | FR-INV-001 | completeUpload | P0 Integration | Chưa chạy |
| QA-053 | Hạ tầng | FR-SEARCH-001 | searchPartners | P1 E2E | Chưa chạy |
| QA-054 | Hạ tầng | FR-UX-001 | getMe | P1 E2E | Chưa chạy |
| QA-055 | Hạ tầng | Q03 | getJob | P0 Integration | Chưa chạy |

## UAT theo hành trình

1. Khách chưa đăng nhập tìm vị trí10km → xem profile → đăng nhập → nhắn trước thuê.
2. Khách thuê doanh nghiệp → quản lý nhận/giao → phòng riêng dùng lại → đổi lịch/nhắc đúng.
3. Thợ chụp ảnh/gửi invoice → khách yêu cầu sửa → confirm phiên bản mới → trả trực tiếp → hai dấu → review.
4. Toàn point/0đ → không trả thêm tiền → xác nhận cả hai → review đúng điều kiện.
5. Partner thiếu phí → khách chỉ thấy chờ bổ sung → partner nạp được đối soát → retry confirm không trùng.
6. Hai việc cùng ví; đổi nhân viên; tab cũ mất quyền nhưng chat riêng lịch sử không mất.
7. Payout unknown → admin đối soát → thành công hoặc thất bại đã xác minh, không chuyển lại mù.
8. Khách report → admin xem chứng cứ/preview → hoàn tất thay → sổ đúng, không giả dấu thợ và không tự mở review.

Mẫu ghi kết quả: case_id, môi trường, build/commit, dữ liệu fixture, bước thực hiện, expected, actual, evidence, người chạy, thời gian, PASS/FAIL/BLOCKED. Chưa điền kết quả khi chưa có sản phẩm.

## Kết quả Đợt 1

[DOC-065](../implementation/dot-1.md) ghi lệnh/kết quả và ảnh smoke.

| Mã | Tầng | Kết quả |
|---|---|---|
| QA-056 | Integration | Đạt local 28/09/2026 |
| QA-057 | Integration | Đạt local 28/09/2026 |
| QA-058 | Unit/UI | Đạt local 28/09/2026 |
| QA-059 | E2E web | Đạt local 28/09/2026; không thay native |
| QA-060 | E2E native | Bị chặn: chưa có simctl/adb/thiết bị |


## LOGTEST-01 · 28/09/2026

Phương án A đã triển khai và kiểm local; chi tiết vận hành/bằng chứng tại [DOC-071](../implementation/logging-testing.md). Native còn BLOCKED; `.github/workflows/quality.yml` đã chuẩn bị, chưa push/chạy remote CI.

| Ca | Phạm vi | Kết quả |
|---|---|---|
| QA-061 | Log và correlation | Đạt local 28/09/2026 — DOC-071 |
| QA-062 | Diagnostic mobile | Đạt local 28/09/2026 — DOC-071 |
| QA-063 | DB isolation | Đạt local 28/09/2026 — DOC-071 |
| QA-064 | Log output | Đạt local 28/09/2026 — DOC-071 |
| QA-065 | Quality gates | Đạt local 28/09/2026 — DOC-071 |
| QA-066 | Local concurrency | Đạt local 28/09/2026 — DOC-071 |

API dùng Node test/c8; mobile Jest/RNTL; core ≥90% lines/85% branches, phần còn lại ≥80/70, không bỏ source chưa import. JUnit/HTML/JSON/LCOV và Playwright artifact ở coverage/test-results. Các ca QA001–055 ngoài lát này giữ trạng thái cũ.

## Tiêu chí bổ sung B01-04

- **QA-070** — Kiểm schema Me.version; hai sửa cùng phiên bản; replay cùng key; đổi payload; thu hồi phiên sau bước kiểm đầu; chèn lỗi trước commit. Kỳ vọng: Version tăng đúng một lần; 409 khi xung đột; key tách theo actor; không giả quyền/verified; rollback tên và key cùng nhau; không log tên/token.
- **QA-071** — Sửa tên; đổi tiếng; gây version conflict; tải lại giữ draft; retry cùng key/payload; mở lại native. Kỳ vọng: Không báo lưu giả; giữ draft và key khi chưa rõ kết quả; tên cập nhật header/tài khoản; phiên thu hồi ẩn form; tên đã lưu còn sau mở lại.

## B01-04A — phiên và địa chỉ

- **QA-072** — List/phân trang, thu hồi phiên khác/hiện tại, race refresh/revoke, retry và truy cập chéo. Kỳ vọng: Một mục mỗi family, đúng phiên hiện tại, không lộ token/IP; thu hồi chặn mọi token cùng family, actor khác 404; mất phiên ẩn dữ liệu riêng.
- **QA-073** — CRUD/mặc định, pagination, conflict, mất phản hồi, rollback, đổi ngôn ngữ, khởi động lại. Kỳ vọng: Tối đa một mặc định; gỡ mặc định không chọn thay; không trùng khi retry; 409 sửa cũ; rollback tên/default/key; không lộ địa chỉ; draft giữ khi đổi tiếng.
