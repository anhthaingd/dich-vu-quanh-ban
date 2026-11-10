# Vận hành dọn lab và tự xử lý lỗi

[Mục lục](README.md) · Phần 06 · 09/11/2026

## Khi nào mới gọi là deploy dùng được

Kiểm từ bên ngoài theo hành trình thật. Không dùng việc Terraform apply thành công thay cho kiểm API hoặc email.

| Kiểm | Kết quả cần thấy |
|---|---|
| HTTPS của app/admin | Đúng domain, không lỗi chứng chỉ, tải được giao diện |
| API `/v1/ready` | Trả HTTP thành công; tiếp tục kiểm nghiệp vụ |
| Đăng ký bằng email allowlist | Nhận thư thật, mã hợp lệ, xác minh thành công |
| Đăng nhập và quyền | Người dùng thường không gọi được thao tác admin |
| Luồng dịch vụ | Tạo dữ liệu DEMO, tải lại vẫn đọc được; API ghi/đọc đúng RDS |
| Ảnh/file | Upload và đọc qua luồng app đúng quyền |
| Chat realtime | Hai phiên khác nhau nhận cập nhật, xử lý mất mạng/kết nối lại |
| Gọi thoại | Hai thiết bị/phiên phù hợp nghe được, mute/end/logout đúng |
| Push native | Gửi tới app trên nền tảng và trạng thái cụ thể; token có trong DB chưa chứng minh đã nhận |
| Tiền test | Thấy nhãn tiền test, duyệt đúng quyền/MFA, không chuyển tiền thật |

Có thể kiểm HTTPS chỉ đọc bằng `curl -i https://api.iimissher.com/v1/ready`. Chỉ chạy khi đã deploy và DNS phục vụ API đã tồn tại. Không dùng dữ liệu cá nhân/tiền thật cho bài lab.

## State và journal là gì

Terraform **state** ghi mối liên hệ giữa khai báo và tài nguyên AWS đã tạo. **Journal** ghi tiến độ runner, image digest và giai đoạn đang làm. Chúng nằm trong `.local/aws-lab/learn/`, là dữ liệu vận hành cần giữ cả khi lệnh lỗi.

State có thể chứa secret, ví dụ token bảo vệ origin. Không đưa state vào chat/Git. Backup mã hóa cùng config và thông tin cần phục hồi. Xóa thư mục state không xóa tài nguyên AWS và có thể làm mất khả năng dọn đúng phạm vi.

## Kết thúc buổi học

Nếu cần giữ dữ liệu, xuất database/ảnh và các khóa cần thiết về bản sao mã hóa, rồi kiểm phục hồi **trước khi dọn**. Runner hiện không tự export/restore. Cấu hình RDS lab không giữ final snapshot; S3 cho phép dọn dữ liệu. Buổi sau mặc định bắt đầu database mới.

Lập kế hoạch xóa trước:

```sh
npm run lab:down -- --lab learn
```

Sau khi kiểm đúng account/lab và đồng ý mất dữ liệu thử, lệnh dưới **thực sự xóa**:

```sh
npm run lab:down -- --lab learn --apply --confirm 857146995969/learn --accept-data-loss
```

Kiểm lại tài nguyên theo audit:

```sh
npm run lab:status -- --lab learn --live
```

`status` thường chỉ đọc local; `--live` mới gọi AWS kiểm thật. Runner dọn record DNS thuộc lab, task, DB, buckets, ECR, mạng, log, secrets, WAF/CloudFront và các tài nguyên trong phạm vi quản lý. Xem chi tiết [runbook cleanup](../../../infra/aws/lab/README.md).

Domain, CNAME xác minh ACM, chứng chỉ ngoài state và provider account được giữ riêng. Tài nguyên onboarding hoặc tài nguyên bạn tạo thủ công ngoài lab cũng cần kiểm riêng; `lab:down` không phải lệnh xóa toàn bộ account.

Thông báo `resources-removed-billing-pending` chỉ nói các phép quét bắt buộc chưa thấy tài nguyên lab còn lại. Kiểm Cost Explorer/Billing khi dữ liệu cập nhật và xem usage **sau thời điểm dọn**, không chỉ tổng tiền tháng. Chi phí trước khi dọn vẫn xuất hiện là bình thường.

## Buổi sau dựng lại

1. Kiểm credit/hạn/budget, đăng nhập lại `dvqb-learn` và kiểm account.
2. Giữ lab ID/config/state cũ, kiểm chứng chỉ còn hợp lệ, nạp lại key trong terminal.
3. Kiểm code/SDD theo phiên bản định deploy, chạy plan rồi apply theo [phần 05](05-chuan-bi-deploy.md).
4. Tạo lại dữ liệu DEMO và xác minh tài khoản trên database mới nếu lab trước đã dọn.

Runner hiện phục vụ dựng/dọn lab, không tự nâng cấp tại chỗ sang commit khác khi lab còn hoạt động. Nếu code mới khác commit đang chạy, thực hiện quy trình bảo toàn dữ liệu và dọn đã thống nhất trước khi dựng lại. Không đổi lab ID tùy tiện để né kiểm soát.

## Tra lỗi theo dấu hiệu

| Dấu hiệu | Kiểm gì trước? | Cách xử lý |
|---|---|---|
| `Your session has expired` | Profile đang dùng | Login lại đúng profile, không tạo access key root |
| `aws login` hỏi region ngoài dự kiến | Có thiếu `--profile` không? | Ctrl+C, dùng lệnh đã ghi ở phần 03 |
| `AccessDenied` tại Singapore | Account, role, region và SCP áp dụng | Xác định đúng action bị chặn; không tắt toàn bộ SCP |
| ACM Pending lâu | CNAME có đúng name/value và DNS only không? | Kiểm `dig`, zone/nameserver, trạng thái ACM; không đoán chuỗi bị cắt |
| CLI chạy nhưng Terraform lỗi credentials | Session và hỗ trợ SDK/provider | Kiểm lỗi cụ thể, dùng profile tương thích khi cần; không xuất secret vào log |
| DNS ownership conflict | Record có thuộc lab không? | Đối chiếu record hiện có, không xóa dịch vụ khác để vượt guard |
| `LIVEKIT_EXPLICIT_ROOMS_REQUIRED` | Chính sách auto-create của project LiveKit | Sửa chính sách hoặc ghi nhận chưa hỗ trợ; không bỏ probe |
| Working tree/SDD không đạt | Có thay đổi chưa commit hoặc evidence cũ không? | Review, kiểm lại và commit khi được phép; không bỏ kiểm |
| Apply lỗi giữa chừng | Journal/state và tài nguyên đã tạo | Giữ cùng lab ID, sửa nguyên nhân rồi chạy lại; phần đã tạo có thể vẫn tính phí |
| ECS rollback / health check lỗi | Task revision, stopped reason, CloudWatch log | Kiểm DB TLS, secret, image và health; rollback không tính là deploy bản mới thành công |
| Web mở nhưng API lỗi | API URL, CORS, DNS, API health | Kiểm từng tầng theo sơ đồ; không quy mọi lỗi cho chứng chỉ |
| Email không tới | Sender Verified, key, allowlist, provider log | Kiểm hộp thư thật; provider nhận request chưa chứng minh inbox đã nhận |
| Cleanup còn tài nguyên | `.local/aws-lab/learn/audit.json` và quyền audit | Xử lý đúng phần còn lại, chạy lại; giữ state/journal |
| Billing vẫn hiện phí | Thời gian usage thuộc trước hay sau dọn | Phân biệt phí đã phát sinh, độ trễ báo cáo và tài nguyên ngoài lab |

Lỗi Lambda onboarding đã gặp là `Identifier 'handler' has already been declared`: file có hai khai báo handler. Thay toàn bộ code demo bằng một handler rồi Deploy đã giải quyết theo xác nhận người dùng. Đây là ví dụ đọc log để tìm nguyên nhân; HTTP 500 trong API lab sau này có thể có nguyên nhân khác.

## Đọc code theo đường đi của lệnh

| Thứ tự | File và hàm/tài nguyên | Nhận gì và làm gì? |
|---|---|---|
| 1 | [package.json](../../../package.json), scripts `lab:*` | Chuyển lệnh npm sang runner |
| 2 | [lab.mjs](../../../scripts/aws/lab.mjs), `parseArgs`, `main`, `validatePrerequisites` | Đọc action/config, kiểm điều kiện, điều phối plan/apply/bootstrap/publish/dọn |
| 3 | [lab-core.mjs](../../../scripts/aws/lab-core.mjs), `validateConfig`, `assertIdentity`, `requireConfirmation` | Chặn config/account/xác nhận không đúng |
| 4 | Cùng file, `runner`, `terraformVariables`, `cloudflare` | Chọn profile/env, truyền biến Terraform, kiểm quyền sở hữu DNS |
| 5 | [versions.tf](../../../infra/aws/lab/versions.tf), [network.tf](../../../infra/aws/lab/network.tf), [compute.tf](../../../infra/aws/lab/compute.tf) | Tạo tài nguyên đúng account/region, nối mạng và task |
| 6 | [database.mjs](../../../scripts/aws/database.mjs) | Thao tác database theo task vận hành do runner gọi |
| 7 | [lab-media.mjs](../../../scripts/aws/lab-media.mjs) | Kiểm và dọn media theo phạm vi lab |
| 8 | [lab-core.mjs](../../../scripts/aws/lab-core.mjs), `auditResources`, `assertCleanState`, `assertStateIdentity` | Kiểm tài nguyên còn lại và tính nhất quán của state |

## Tự kiểm hiểu sau khi học

1. **Tại sao có 200 USD vẫn cần dọn?** Credit giảm theo sử dụng và có hạn; dịch vụ đang tồn tại vẫn có thể tính phí khi không có người truy cập.
2. **Vì sao quản trị AWS khác quản trị app?** Một bên quản lý hạ tầng, một bên quản lý dữ liệu/quyền nghiệp vụ trong database.
3. **Tại sao chỉ sửa RegionFloor?** Mở region cần dùng mà giữ các kiểm soát khác; SCP không thay IAM permission.
4. **Tại sao lưu state sau lỗi?** Nó giúp nhận diện tài nguyên đã tạo và tiếp tục/dọn đúng, tránh tài nguyên bị bỏ quên.
5. **Issued đã đủ để mở app chưa?** Chưa, cần CloudFront gắn chứng chỉ, DNS phục vụ app, file web và API chạy đúng.
6. **Xóa EC2 có dọn lab này không?** Không, lab dùng nhiều dịch vụ độc lập; dùng vòng đời runner và audit.
7. **Test local xanh có chứng minh email/push thật không?** Không; cần kiểm provider và thiết bị tương ứng.

Quay lại [checklist thực tế](README.md) và ghi mốc đạt khi có bằng chứng.
