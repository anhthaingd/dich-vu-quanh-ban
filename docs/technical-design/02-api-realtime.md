# Hợp đồng API và realtime

Phiên bản 0.1.1 · 28/09/2026 · Đợt 1 triển khai local danh mục Expo/NestJS/PostgreSQL/PostGIS. Chi tiết và bằng chứng tại DOC-065; phần ngoài danh mục vẫn là thiết kế, chưa production/tiền thật.

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
| editAddress | PUT /me/addresses/{id} | Chính mình | SavedAddressInput → SavedAddress |
| archiveAddress | POST /me/addresses/{id}/archive | Chính mình | Không body → Ack |
| listCategories | GET /categories | Public | Không body → listCategoriesPage |
| listSkills | GET /skills | Public | Không body → listSkillsPage |
| searchPartners | GET /partners | Public | Không body → searchPartnersPage |
| getPartner | GET /partners/{id} | Public; liên hệ cần đăng nhập | Không body → PartnerProfile |
| createPartner | POST /partners | User đã xác minh | PartnerCreate → PartnerProfile |
| editPartner | PUT /partners/{id}/profile | profile.manage đúng partner | PartnerEdit → PartnerProfile |
| setAvailability | PUT /partners/{id}/availability | profile.manage đúng partner | Availability → PartnerProfile |
| setSkills | PUT /partners/{id}/skills | profile.manage đúng partner | SkillsEdit → PartnerProfile |
| setAreas | PUT /partners/{id}/service-areas | profile.manage đúng partner | AreasEdit → PartnerProfile |
| setLocations | PUT /partners/{id}/locations | profile.manage đúng partner | LocationsEdit → PartnerProfile |
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
