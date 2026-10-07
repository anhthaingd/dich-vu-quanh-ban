# Hợp đồng API và realtime

> **P0-1 · 06/10/2026 · v0.1.6 · Đã duyệt: hồ sơ quản lý riêng có version; draft/published, công bố không tự bật nhận việc; phone_verified trước tạo partner, owner và ví rỗng cùng transaction. Tìm theo distance mặc định, vùng tròn đo tới tâm và phải bao phủ khách; cursor theo distance_m/created_at/id, gắn bộ lọc. Tài khoản/provider test tách biệt được phép tạo trực tiếp; OTP, polygon, bản đồ và xếp hạng recommended/rating chưa triển khai. Không production/tiền thật.**

> **B01-04A · 06/10/2026 · v0.1.5: chủ dự án duyệt gộp quản lý phiên và sổ địa chỉ. Một mục phiên đại diện một lần đăng nhập (id = family_id ổn định qua refresh), có created_at, last_seen_at, is_current; state active/expired/revoked; không trả IP, token/hash. Thu hồi chặn toàn bộ family và kiểm lại quyền trong transaction. Địa chỉ thêm is_default/version; địa chỉ đầu tiên khi sổ đang rỗng tự mặc định. Chọn mặc định mới bỏ mặc định cũ và tăng version bản cũ. Gỡ mặc định để chưa có mặc định, không tự chọn mục khác. PUT yêu cầu expected_version. Mọi mutation giữ Idempotency-Key khi retry, kiểm chủ sở hữu; archive giữ dữ liệu lịch sử, không đổi snapshot công việc. Nhập địa chỉ/tọa độ thủ công, chưa chọn GPS/map provider. OTP Pending; không production/chi phí.**

> **B01-04 · 06/10/2026 · v0.1.4:** Chủ dự án duyệt bổ sung `Me.version` bắt buộc, integer ≥ 1. Áp dụng cho GET/PATCH `/me` và `Session.user` từ register/login/refresh. `PATCH /me` dùng `expected_version` và UUID `Idempotency-Key` theo thiết kế hiện có. Sai phiên bản trả 409 `VERSION_CONFLICT`; cùng actor/operation/key nhưng payload khác trả 409 `IDEMPOTENCY_MISMATCH`. Cùng key/payload trả kết quả đã lưu, không tăng version lần hai. Kiểm phiên/quyền lại trước trả kết quả, kể cả replay. Lát hiện tại chỉ sửa tên: trim, 1–100 ký tự theo giới hạn đăng ký, không ký tự điều khiển. Locale tài khoản vẫn `vi`; không mở I18N-03/OTP. Bảng idempotency dùng thiết kế PLAN-001 hiện hành, chưa đặt retention mới. Bằng chứng triển khai nằm trong báo cáo B01-04 ở repo, không suy ra production/UAT.

> **I18N-04 · 05/10/2026 · v0.1.3 (phạm vi danh mục đã duyệt):** I18N-04 (05/10/2026): locale=vi|en|ja, mặc định vi; trả name và name_locale, giữ name_vi. Thiếu tên dịch/giá trị không phải chuỗi hoặc chỉ khoảng trắng thì dùng name_vi, name_locale=vi. Cursor gắn endpoint/bộ lọc/locale; locale sai/lặp trả 400. Không trả object translations ra public.


Phiên bản 0.1.2 · 28/09/2026 · Đợt 1 triển khai local danh mục Expo/NestJS/PostgreSQL/PostGIS. Chi tiết và bằng chứng tại DOC-065; phần ngoài danh mục vẫn là thiết kế, chưa production/tiền thật.

## Contract đã triển khai local

OpenAPI0.1.1 giữ GET `/v1/categories` và `/v1/skills`. Category thêm `parent_id`; categories nhận `parent_id=root|UUID` hoặc bỏ trống lấy mọi cấp. Skills nhận `category_id` gồm các con; một skill N–N chỉ xuất hiện một lần và chỉ trả category_ids được chọn. Tất cả tổ tiên phải active. UUID không tồn tại/ngừng trả trang rỗng; input lạ/lặp/sai400. Cursor ký theo endpoint/filter/actor public,20/max100. GET `/v1/health` trả ok; `/v1/ready` kiểm DB/PostGIS/bảng, lỗi503 có cấu trúc. Local dùng HTTP loopback/LAN tin cậy; TLS là yêu cầu trước phát hành. Các mutation/auth/realtime dưới đây chưa triển khai.

## Quy ước chung

- Base path `/v1`, JSON UTF-8, TLS; user_id/partner_id từ session và membership đối chiếu server, không tin actor_id trong body.
- Tiền/point là chuỗi số nguyên; UTC RFC3339 cho thời gian; UUID cho tài nguyên; không nhận fee/reward từ client.
- Mutation sau đăng nhập có Idempotency-Key. Update aggregate có expected_version. Key gắn actor+operation+request_hash; cùng key khác payload409; retry cùng payload trả resource đã commit sau tái kiểm quyền. Unique nghiệp vụ vẫn bảo vệ sau retention key.
- GET không đổi nghiệp vụ. Preview token được sinh có TTL nhưng không mutate tiền và không thay recheck quyền/version lúc submit.
- Phân trang cursor ký, limit đề xuất20/max100; cursor gắn filter/sort/actor. Tìm kiếm cần snapshot hoặc keyset theo sort để không lặp khi rating thay đổi; không dùng OFFSET làm bảo đảm ổn định.
- 401 đăng nhập lại;403 không quyền;404 có thể che tài nguyên riêng;409 tải lại version hoặc state conflict;422 lỗi nghiệp vụ;429 theo Retry-After;503 và mất mạng tra operation trước retry.
- Khách thiếu phí partner chỉ nhận PARTNER_FUNDING_REQUIRED và câu chờ bổ sung. Không trả balance, debt, shortfall hay ngân hàng của partner trong error khách.
- OTP/refresh/recovery public không dùng idempotency tài khoản; challenge/token một lần, rate limit và rotation là hàng rào. Challenge purpose login trả Session, recover trả RecoveryGrant chỉ scope recovery, verify trả Ack.
- Quyền admin kiểm riêng, không đồng nghĩa được đọc mọi chat. Fresh authentication dùng cho đổi định danh/ngân hàng, rút, cấp quyền nhạy cảm và quyết định tiền; phương thức cụ thể cần chốt trước implement Auth.

## Ví dụ confirm

```json
{"expected_version":3,"version_id":"00000000-0000-4000-8000-000000000001","points_used":"50000"}
```

Server tính lại L/M/F/C/Q, không nhận các số này từ body. Trước khóa point mặc định0. Nếu invoice3 đã được sửa sang4 thì409; giữ form nhưng không tự confirm bản4. Khách báo đã thanh toán có thể thực hiện sau worker settle, không tạo tiền lần hai.

## Sequence quyết toán và review

```mermaid
sequenceDiagram
 participant C as Khách
 participant W as Thợ
 participant API as NestJS
 participant DB as PostgreSQL
 C->>API: Confirm(version,R,key)
 API->>DB: Lock + giữ F/R + confirmation + outbox
 DB-->>API: Commit
 C->>W: Trả C trực tiếp nếu C>0
 C->>API: Payment-reported
 API->>DB: Dấu khách đã trả, chưa ledger
 W->>API: Receipt + settle
 API->>DB: Unique settlement + entries + consume holds + worker receipt
 DB-->>API: Commit nguyên tử
 API-->>C: Đủ hai dấu và settled mới được đánh giá
 Note over C,DB: Worker có thể bấm trước khách; review vẫn phải chờ cả hai.
```

## Realtime

WebSocket là lớp truyền thông đề xuất; chưa chốt Socket.IO/provider. REST là nguồn phục hồi trạng thái. Subscribe phải xác thực và kiểm ACL tài nguyên, không cho client tự join room tenant hoặc room của user khác. Mỗi reconnect kiểm token/quyền mới; revoke membership không đợi socket tự disconnect mới có hiệu lực.

Envelope: event_id, type có version, occurred_at UTC, aggregate_version, correlation_id và data tối thiểu. Event chứa ID để fetch theo quyền, không chứa số dư/ngân hàng/chứng cứ/chat trên kênh chung. Bảo đảm at-least-once phía worker; client dedupe event_id, bỏ version cũ và fetch khi có khoảng trống. Không tuyên bố exactly-once push hoặc luôn nhận được thông báo.

Tin nhắn: ACK sau DB commit; sender_id+client_message_id unique; sequence đơn điệu trong từng phòng. Retry cùng ID khác body phải409, không âm thầm thay tin đã gửi. Reconnect GET messages after_sequence; unread dùng last_sequence đọc tăng dần. Event không tự cộng tiền hoặc point trên client.

| Event | Người nhận | Payload | Phục hồi |
|---|---|---|---|
| job.accepted.v1 | Khách và partner đúng quyền | job_id, job_version, conversation_id | GET /jobs/{id} |
| job.assigned.v1 | Khách, nhân viên mới; người cũ nhận revocation không nhận chat mới | job_id, job_version, assignment_id, conversation_id | GET job; API thu hồi quyền người cũ ngay, không chờ event |
| job.schedule_changed.v1 | Khách và người có quyền việc | job_id, schedule_version, scheduled_at | GET job; bỏ reminder version cũ |
| invoice.sent.v1 | Khách của việc | invoice_id, version_id, resource_version | GET invoice; point mặc định 0 |
| invoice.locked.v1 | Khách/thợ, DTO theo vai | invoice_id, version_id, resource_version | GET invoice; không phát wallet balance vào room khách |
| invoice.payment_reported.v1 | Người thực hiện và khách | invoice_id, resource_version | GET invoice; không gọi settle từ event |
| invoice.settled.v1 | Hai bên, thông tin ví ở kênh riêng | invoice_id, settlement_id, actor_kind, review_eligible | GET invoice/points/wallet theo quyền; không tự mở review nếu thiếu dấu |
| conversation.message_created.v1 | Chính participant direct hoặc inbox partner theo quyền | conversation_id, message_id, sequence | GET messages after_sequence; message body chỉ fetch theo ACL |
| conversation.read.v1 | Participant phòng | conversation_id, user_id, last_sequence | Lưu max cursor; sự kiện cũ không làm unread tăng lại |
| call.ringing.v1 | Đúng recipient nếu call_push bật | call_id, job_id, caller_id | GET/accept qua API, token ngắn hạn; không gửi credential qua push |
| call.ended.v1 | Caller và recipient | call_id, reason | Dọn UI; không retry gọi mới tự động |
| wallet.changed.v1 | Chủ ví/người wallet.read đúng tenant | partner_id, account_version | GET wallet; không phát sang phòng công việc |
| points.changed.v1 | Đúng user | user_id, account_version | GET /me/points; không cộng delta từ event |
| report.updated.v1 | Participant case theo visibility | report_id, version | GET report với filter admin_only |
| notification.created.v1 | Đúng user | notification_id | GET inbox; kiểm quyền tài nguyên lại khi mở |

## Danh mục API

OpenAPI JSON đi kèm có schema request/response, quyền, parameters và lỗi cho từng operation. Bảng này là chỉ mục đọc nhanh. Không có endpoint hủy/đảo/release tiền invoice đã khóa, chuyển chủ/đóng doanh nghiệp hoặc OAuth xã hội trong đợt hiện tại.

| Operation | Method và path | Quyền | Request → Response |
|---|---|---|---|
| register | POST /auth/register | Public, rate limit | Registration → Session |
| login | POST /auth/login | Public, rate limit | Login → Session |
| requestOtp | POST /auth/challenges | Public, rate limit | OtpRequest → Challenge |
| verifyOtp | POST /auth/challenges/verify | Public, challenge hợp lệ | OtpVerify → ChallengeResult |
| resetPassword | POST /auth/password/reset | Public, verified recovery challenge | PasswordReset → Ack |
| refreshSession | POST /auth/refresh | Refresh token hợp lệ | Refresh → Session |
| logout | POST /auth/logout | Chính session | Không body → Ack |
| getMe | GET /me | Chính mình | Không body → Me |
| editMe | PATCH /me | Chính mình | ProfileEdit → Me |
| listSessions | GET /me/sessions | Chính mình | Không body → listSessionsPage |
| revokeSession | POST /me/sessions/{id}/revoke | Chính mình | Không body → Ack |
| requestDeletion | POST /me/deletion-request | Chính mình, fresh auth | ReasonInput → Ack |
| listAddresses | GET /me/addresses | Chính mình | Không body → listAddressesPage |
| addAddress | POST /me/addresses | Chính mình | SavedAddressInput → SavedAddress |
| editAddress | PUT /me/addresses/{id} | Chính mình | SavedAddressEdit → SavedAddress |
| archiveAddress | POST /me/addresses/{id}/archive | Chính mình | Không body → Ack |
| listCategories | GET /categories | Public | Không body → listCategoriesPage |
| listSkills | GET /skills | Public | Không body → listSkillsPage |
| searchPartners | GET /partners | Public | Không body → searchPartnersPage |
| getPartner | GET /partners/{id} | Public; liên hệ cần đăng nhập | Không body → PartnerProfile |
| createPartner | POST /partners | User có điện thoại đã xác minh | PartnerCreate → PartnerManagement |
| editPartner | PUT /partners/{id}/profile | profile.manage đúng partner | PartnerEdit → PartnerManagement |
| setAvailability | PUT /partners/{id}/availability | profile.manage đúng partner | Availability → PartnerManagement |
| setSkills | PUT /partners/{id}/skills | profile.manage đúng partner | SkillsEdit → PartnerManagement |
| setAreas | PUT /partners/{id}/service-areas | profile.manage đúng partner | AreasEdit → PartnerManagement |
| setLocations | PUT /partners/{id}/locations | profile.manage đúng partner | LocationsEdit → PartnerManagement |
| submitVerification | POST /partners/{id}/verification | profile.manage | VerificationInput → Ack |
| listMembers | GET /partners/{id}/members | members.manage / jobs.assign | Không body → listMembersPage |
| inviteMember | POST /partners/{id}/invitations | members.manage | Invite → Ack |
| acceptInvitation | POST /invitations/accept | Đúng liên hệ đã xác minh | InviteAccept → Member |
| editGrants | PUT /memberships/{id}/grants | members.manage đúng partner | GrantsEdit → Member |
| deactivateMember | POST /memberships/{id}/deactivate | members.manage đúng partner | ReasonInput → Member |
| setCallContact | PUT /partners/{id}/call-contact | members.manage | ContactEdit → Ack |
| createJob | POST /jobs | Khách có phone verified | JobCreate → Job |
| listJobs | GET /jobs | Theo vai và tenant | Không body → listJobsPage |
| getJob | GET /jobs/{id} | Khách / partner quản lý / nhân viên đang giao | Không body → Job |
| acceptJob | POST /jobs/{id}/accept | jobs.accept | AcceptJob → Job |
| declineJob | POST /jobs/{id}/decline | jobs.accept | ReasonInput → Job |
| withdrawJob | POST /jobs/{id}/withdraw | Đúng khách | ReasonInput → Job |
| assignJob | POST /jobs/{id}/assignments | jobs.assign | AssignmentInput → AssignmentResult |
| rescheduleJob | POST /jobs/{id}/reschedule | Khách / người có quyền việc | Reschedule → Job |
| stopJob | POST /jobs/{id}/stop | Khách / người có quyền việc | StopJob → Job |
| getInvoice | GET /jobs/{id}/invoice | Đúng khách / người có quyền việc | Không body → Invoice |
| saveInvoiceDraft | PUT /jobs/{id}/invoice-draft | Người thực hiện hiện tại | InvoiceDraft → Invoice |
| sendInvoice | POST /invoices/{id}/send | Người thực hiện hiện tại | InvoiceSend → Invoice |
| requestInvoiceRevision | POST /invoices/{id}/revision-requests | Đúng khách | ReasonInput → Invoice |
| confirmInvoice | POST /invoices/{id}/confirm | Đúng khách | InvoiceConfirm → Invoice |
| reportPayment | POST /invoices/{id}/payment-reported | Đúng khách | PaymentReport → Invoice |
| settleInvoice | POST /invoices/{id}/settle | Người thực hiện hiện tại | WorkerReceipt → Settlement |
| getWallet | GET /partners/{id}/wallet | wallet.read | Không body → Wallet |
| getLedger | GET /partners/{id}/ledger | wallet.read | Không body → getLedgerPage |
| getPoints | GET /me/points | Đúng khách | Không body → PointWallet |
| getPointLedger | GET /me/points/ledger | Đúng khách | Không body → getPointLedgerPage |
| createTopup | POST /topups | wallet.topup | TopupInput → MoneyRequest |
| createPayout | POST /payouts | wallet.withdraw | PayoutInput → MoneyRequest |
| getPayout | GET /payouts/{id} | wallet.read đúng partner | Không body → MoneyRequest |
| getBank | GET /partners/{id}/bank | wallet.read | Không body → Bank |
| setBank | PUT /partners/{id}/bank | bank.manage | BankInput → Bank |
| openConversation | POST /conversations | User đã đăng nhập | ConversationCreate → Conversation |
| listConversations | GET /conversations | Participant hoặc inbox doanh nghiệp theo quyền | Không body → listConversationsPage |
| listMessages | GET /conversations/{id}/messages | ACL phòng, không chỉ job membership | Không body → listMessagesPage |
| sendMessage | POST /conversations/{id}/messages | ACL phòng | MessageInput → Message |
| readConversation | PUT /conversations/{id}/read | ACL phòng | ReadCursor → Ack |
| startCall | POST /calls | Khách/thợ có quan hệ việc đã nhận | CallRequest → CallGrant |
| actOnCall | POST /calls/{id}/actions | Đúng caller/recipient | CallAction → Ack |
| listPartnerReviews | GET /partners/{id}/reviews | Public | Không body → listPartnerReviewsPage |
| getJobReviews | GET /jobs/{id}/reviews | Theo quan hệ việc; đánh giá khách riêng tư | Không body → getJobReviewsPage |
| createReview | POST /jobs/{id}/reviews | Khách hoặc nhân viên đại diện partner | ReviewInput → Review |
| editReview | PATCH /reviews/{id} | Tác giả theo quyền hiện hành | ReviewEdit → Review |
| toggleOwnReview | POST /reviews/{id}/visibility | Tác giả | ReviewVisibility → Review |
| replyReview | PUT /reviews/{id}/reply | Bên nhận hoặc reviews.respond | ReplyInput → Ack |
| createReport | POST /reports | User và tài nguyên đúng quyền | ReportInput → Report |
| listReports | GET /reports | Reporter/participant theo case | Không body → listReportsPage |
| getReport | GET /reports/{id} | Reporter/participant; lọc admin_only | Không body → Report |
| addReportUpdate | POST /reports/{id}/updates | Participant case | ReportReply → Report |
| adminReports | GET /admin/reports | support.read | Không body → adminReportsPage |
| decideReport | POST /admin/reports/{id}/decision | support.manage | ReportDecision → Report |
| previewCompletion | GET /admin/reports/{id}/completion-preview | finance.review + fresh auth | Không body → CompletionPreview |
| completeOnBehalf | POST /admin/reports/{id}/complete-on-behalf | finance.review + fresh auth | AdminCompletion → Settlement |
| adminListTopups | GET /admin/topups | finance.read | Không body → adminListTopupsPage |
| adminDecideTopups | POST /admin/topups/{id}/decision | finance.review + fresh auth | AdminFinanceDecision → MoneyRequest |
| adminListPayouts | GET /admin/payouts | finance.read | Không body → adminListPayoutsPage |
| adminDecidePayouts | POST /admin/payouts/{id}/decision | finance.review + fresh auth | AdminFinanceDecision → MoneyRequest |
| queueBank | GET /admin/bank-accounts | finance.review | Không body → queueBankPage |
| decideBank | POST /admin/bank-accounts/{id}/decision | finance.review | ModerationInput → Bank |
| queueVerification | GET /admin/verifications | moderation.manage | Không body → queueVerificationPage |
| decideVerification | POST /admin/verifications/{id}/decision | moderation.manage | ModerationInput → Ack |
| queuePartner | GET /admin/partners | moderation.manage | Không body → queuePartnerPage |
| decidePartner | POST /admin/partners/{id}/decision | moderation.manage | ModerationInput → Ack |
| queueUser | GET /admin/users | accounts.manage | Không body → queueUserPage |
| decideUser | POST /admin/users/{id}/decision | accounts.manage | ModerationInput → Ack |
| queueReview | GET /admin/reviews | moderation.manage | Không body → queueReviewPage |
| decideReview | POST /admin/reviews/{id}/decision | moderation.manage | ModerationInput → Review |
| editCategory | PUT /admin/categories/{id} | catalog.manage | CatalogInput → Category |
| editSkill | PUT /admin/skills/{id} | catalog.manage | CatalogInput → Skill |
| getAudit | GET /admin/audit | audit.read | Không body → getAuditPage |
| getMetrics | GET /admin/metrics | reports.read | Không body → getMetricsPage |
| adminInvoices | GET /admin/invoices | finance.read | Không body → adminInvoicesPage |
| createUpload | POST /assets/upload-grants | User đã đăng nhập | AssetRequest → UploadGrant |
| completeUpload | POST /assets/{id}/complete | Uploader | VersionInput → Asset |
| getAsset | GET /assets/{id} | ACL theo mục đích và tài nguyên | Không body → Asset |
| getSettings | GET /me/notification-settings | Chính mình | Không body → Settings |
| setSettings | PUT /me/notification-settings | Chính mình | Settings → Settings |
| registerDevice | POST /me/devices | Chính mình | Device → Ack |
| listNotifications | GET /me/notifications | Chính mình | Không body → listNotificationsPage |
| readNotification | POST /me/notifications/{id}/read | Chính mình | Không body → Ack |
| getOperation | GET /operations/{key} | Đúng actor | Không body → IdempotencyResult |
| changeIdentity | POST /me/identity-change | Chính mình + fresh auth | IdentityChange → Challenge |
| confirmIdentityChange | POST /me/identity-change/confirm | Chính mình + new contact challenge | IdentityConfirm → Me |
| openRecovery | POST /auth/recovery-reports | Public; challenge chống spam; chứng cứ riêng | RecoveryReport → Ack |
| decideRecovery | POST /admin/recovery-reports/{id}/decision | accounts.manage + fresh auth; không tự chuyển chủ | RecoveryDecision → Ack |
| deactivatePartner | POST /partners/{id}/deactivation | profile.manage; giữ ví/việc cũ | ReasonInput → Ack |
| leavePartner | POST /memberships/{id}/leave | Chính member không phải owner; báo việc cần bàn giao | ReasonInput → Ack |
| editAdminGrants | POST /admin/users/{id}/grants | Admin có grant.manage; fresh auth; không tự nâng quyền | GrantsEdit → Ack |
| createCategory | POST /admin/categories | catalog.manage | CategoryCreate → Category |
| createSkill | POST /admin/skills | catalog.manage | SkillCreate → Skill |

## Các điểm cần khóa trước triển khai

- Quota/TTL OTP, session, signed URL, upload, idempotency và retention: cấu hình đề xuất trong backlog; chưa gán số kinh doanh chưa được duyệt.
- Chặn chính khách thuê hồ sơ của mình hoặc doanh nghiệp khách đang là thành viên; kiểm lại membership hiện hành tại API.
- Đổi lịch chỉ thay đổi giờ hẹn, không dùng để gia hạn việc. Việc đã nhận không tự hết hạn hay hoàn tất theo thời gian. Không có luồng đổi lịch qua report/admin.
- Adapter OTP/map/push/call/bank mới là interface; chưa có credentials, webhook signature của provider hoặc ngân sách.
- Recovery public cần kênh tiếp nhận chứng cứ hạn chế riêng; không dùng upload grant của người đăng nhập hoặc mở asset công khai. Đặc tả adapter chống spam và xác minh reachable contact ở B01.

Nguồn định dạng: [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0.html).

| liveness | GET /health | Public | Không body → Health |
| readiness | GET /ready | Public | Không body → Ready |


## LOGTEST-01 · 28/09/2026

Phương án A đã triển khai và kiểm local; chi tiết vận hành/bằng chứng tại [DOC-071](../implementation/logging-testing.md). Native còn BLOCKED; `.github/workflows/quality.yml` đã chuẩn bị, chưa push/chạy remote CI.

Bốn GET danh mục/health/ready trả `X-Request-Id`; lỗi có `correlation_id` bằng header. `X-Client-Request-Id` UUID hợp lệ được ghi metadata, không xác thực. CORS expose ID cho app web. Lỗi input400, không tìm thấy404, nội bộ500 (`INTERNAL`), DB unavailable/timeout503; không trả stack/SQL. OpenAPI0.1.2 phản ánh header và lỗi; không mở endpoint ngoài phạm vi.

## P0-1 — hồ sơ quản lý và công bố

| Thao tác | API | Quyền | Input → Output |
|---|---|---|---|
| getPartnerManagement | GET /partners/{id}/management | owner hoặc profile.manage | Không body → PartnerManagement |
| setPublication | PUT /partners/{id}/publication | owner hoặc profile.manage | PublicationInput → PartnerManagement |

Công bố cần tên, ít nhất một kỹ năng active và nơi phục vụ theo mọi mode; ảnh năng lực chưa bắt buộc. Công bố không tự bật nhận việc. Sửa làm hồ sơ published thiếu điều kiện trả400 và rollback; chuyển draft tắt nhận việc. Một version chung cho mọi phần. GET public hỗ trợ locale VI/EN/JA cho tên kỹ năng, signed-in contact không làm lộ dữ liệu quản lý. Ảnh/giấy tờ và xác minh partner không được tự đánh dấu hoàn tất.

## MAP-01 — chọn địa điểm, thử local ngày 07/10/2026

Theo yêu cầu triển khai tiếp sau khi chốt MapLibre + Geoapify Free: bộ chọn chung cho tìm dịch vụ, sổ địa chỉ, cửa hàng và tâm vùng. Có nhập địa chỉ/gợi ý, tìm cả chuỗi, chạm/kéo bản đồ, GPS khi bấm nút và địa chỉ đã lưu. Theo yêu cầu MAP-03 ngày 07/10/2026, bỏ nút và ô nhập tọa độ thủ công ở cả bốn nơi; tọa độ vẫn được lấy từ địa điểm đã chọn để tìm/lưu theo API hiện có. Người dùng chọn kết quả và xác nhận; không tự lấy dòng đầu. Gõ truy vấn khác hủy lựa chọn cũ, sửa mô tả tầng/phòng giữ ghim. Hủy không sửa form. Đổi tài khoản xóa bản nháp riêng; phản hồi cũ không ghi đè điểm mới.

Ba POST `/v1/locations/autocomplete`, `/geocode`, `/reverse` nhận JSON body theo OpenAPI v0.1.7. Query 3–300 ký tự, locale vi/en/ja, tối đa 5 gợi ý. Tra ngược giữ chính điểm yêu cầu, rỗng/lỗi vẫn cho nhập mô tả sau khi có điểm. Khách chưa đăng nhập được tra cứu với hạn mức IP; bearer hợp lệ dùng tài khoản. Pilot một tiến trình: 4 lookup/giây, 30/actor/phút, 1000/24h; restart reset bộ đếm. 429 có Retry-After; timeout provider 6 giây trả 504 TIMEOUT. Các giới hạn này không bao gồm tile và không phải bảo đảm chặn chi phí toàn project.

Key tra cứu ở server; key tile công khai ở app. Chưa billing/production, chưa dùng Google. Không ghi log địa chỉ/tọa độ/key, không lưu lịch sử GPS. Geoapify và OpenStreetMap được ghi nguồn. Bản đồ nền do app tải trực tiếp; không gửi token dự án tới Geoapify.

Không migration: giữ `{text, point}` và quyền/version/idempotency của API lưu hiện hành. `source` chỉ ở state app, ID gợi ý chỉ tạm. Tâm vùng không thành vị trí thợ công khai; chỉ điểm cửa hàng đã công khai được vẽ trong hồ sơ. Polygon, gom ghim toàn bộ kết quả, routing/ETA và theo dõi thợ ngoài đợt. Bằng chứng code/local/native ở báo cáo B03-01 trong repo; không suy ra UAT/production.

## MAP-02 — bản đồ kết quả, API v0.1.8

MAP-02 — 07/10/2026, quyết định đã chốt: chỉ ghim địa điểm đã đánh dấu công khai; người chưa có điểm công khai vẫn hiện trong danh sách. Mở rộng bản đồ kết quả sau MAP-01, trước P0-2; thay phần loại trừ bản đồ kết quả của MAP-01. Giữ MapLibre + Geoapify Free, chưa billing/production.

Sau khi tìm, khách chuyển Danh sách/Bản đồ trên cùng kết quả và bộ lọc. Điểm cần dịch vụ màu xanh lá, địa điểm công khai màu xanh dương; bấm ghim xem tên, địa chỉ và mở hồ sơ. Ghim trùng tọa độ gom chung nhưng vẫn chọn được từng người. Người không có ghim nằm trong danh sách bên dưới; có thể chuyển về danh sách đầy đủ. Chỉ vẽ các kết quả đã tải; Xem thêm bổ sung cả danh sách và ghim. Đổi điểm hoặc gửi tìm mới bỏ kết quả cũ. Lỗi nền bản đồ cho thử lại hoặc chuyển danh sách.

OpenAPI v0.1.8: GET /v1/partners thêm PartnerCard.map_location bắt buộc, giá trị Address {text, point} hoặc null. Với mỗi người đủ điều kiện tìm kiếm, lấy địa điểm active=true, public=true gần điểm tìm nhất và nằm trong bán kính; hòa khoảng cách chọn created_at rồi id. Không có điểm phù hợp trả null, không loại người khỏi kết quả. Giữ nguyên điều kiện công bố/nhận việc/kiểm duyệt, thứ tự, bộ lọc và cursor. distance_m/distance_kind tiếp tục phục vụ xếp hạng theo cửa hàng hoặc tâm vùng, không suy ra khoảng cách tới ghim.

Không dùng hoặc trả service_areas.center làm ghim; không lộ địa điểm private/đã lưu trữ. Đây là địa điểm khai báo công khai, không phải GPS trực tiếp của thợ. Không migration, không đổi quyền ghi public/private. Không thêm tra cứu provider theo từng thợ, routing, ETA hoặc tracking. Bằng chứng và ảnh chạy app ở báo cáo B03-02 trong repo; kiểm local/simulator không thay UAT hoặc phê duyệt production.

## MAP-03 / P0-2 — phạm vi đã duyệt ngày 07/10/2026

MAP-03 và P0-2 — quyết định chủ dự án ngày 07/10/2026, API v0.1.9.
Bỏ nút và ô nhập tọa độ thủ công trong tìm kiếm, sổ địa chỉ, cửa hàng, vùng phục vụ và form thuê. Người dùng chọn địa chỉ/gợi ý, ghim bản đồ, GPS theo nút hoặc địa chỉ đã lưu; tọa độ vẫn là dữ liệu nội bộ/API. Phần mô tả nhập tọa độ trong các mốc trước là lịch sử đã được thay thế.
Job bổ sung service_mode, time_mode, location_id (null ngoài cửa hàng), note và eta (null trước nhận/hẹn trước). Làm ngay bắt buộc ETA khi nhận; lưu thời điểm dự kiến đến và lịch ban đầu, không thêm nút Bắt đầu. Đổi lịch cập nhật scheduled_at, giữ eta ban đầu và tăng schedule_version/lịch sử. PartnerProfile bổ sung public_locations gồm id + address chỉ cho địa điểm active/public, và service_modes theo skill_id; không trả tâm vùng hoặc điểm riêng. Máy chủ đối chiếu location_id với cửa hàng hiện hành và lấy địa chỉ từ DB, không tin địa chỉ cửa hàng do client gửi.
Gói P0-2 local/test: khách tạo/đọc/rút yêu cầu, partner nhận/từ chối, đổi lịch/dừng trước hóa đơn khóa, phân công theo quyền. Có chi phí đã thỏa thuận thì dừng vẫn giữ accepted để tiếp tục hóa đơn ở P0-3; lưu cờ và lý do, không tạo hóa đơn giả. Không có chi phí chuyển stopped. Không tự hết hạn, hủy hay hoàn tất theo giờ. Giữ xác minh điện thoại ở backend khi gửi/nhận; chỉ dùng tài khoản DEMO local/test đã được duyệt, OTP thật Pending.
Chat tối thiểu dùng API HTTP: tạo/mở lại phòng trước thuê, gửi/đọc tin văn bản, thứ tự sequence, chống trùng client_message_id và idempotency, mốc đã đọc chỉ tăng, tải lại khi quay lại màn/app hoặc bấm cập nhật. Khách–cửa hàng/doanh nghiệp tách khách–nhân viên; phân công thêm tin hệ thống trong phòng riêng. Đổi người không sao chép lịch sử; người cũ giữ chat của mình nhưng mất quyền việc sau thu hồi/phân công lại. Ghi sự kiện bền vững cùng transaction; WebSocket/worker phát sự kiện, push/nhắc lịch, gọi và file đính kèm chưa nghiệm thu trong gói HTTP này. Các yêu cầu sản phẩm đầy đủ vẫn giữ, không coi phần chưa triển khai đã hoàn tất.
Bằng chứng code/local, web và native nằm trong báo cáo B03-03/B03-04 ở repo; không thay CI từ xa, UAT, production hoặc tiền thật.
