# SDD cho toàn dự án

SDD nối yêu cầu đã chốt với code và kết quả kiểm thử. Gói mặc định [SDD-PROJECT](changes/SDD-PROJECT.json) kiểm kê toàn repository, 93 ca QA, 130 operation API và 80 tiêu chí hành vi. **Đầy đủ danh mục không có nghĩa toàn bộ sản phẩm đã đạt spec.** Mỗi QA hiện là `partial` (mới chứng minh các nhánh liên kết) hoặc `unmapped` (chưa có tiêu chí được review). Các chức năng Pending giữ nguyên.

Thiết kế [SDD-01](../de-xuat/SDD-01-quy-trinh-ai-bam-spec.md) · Lát đầu [B00-07](../bao-cao/B00-07-bo-kiem-sdd-local.md) · Mở rộng [B00-08](../bao-cao/B00-08-sdd-toan-du-an.md).

## Mỗi lần giao việc cho AI

1. Đọc AGENTS, checklist và spec liên quan. Nêu mã tiêu chí, điều được phép thay đổi, giới hạn và tiêu chí hoàn thành. Không dùng trạng thái cũ trong tài liệu làm bằng chứng mới.
2. Chạy `prepare`. Mở lỗi nguồn/liên kết/phạm vi trước khi code. Khi yêu cầu chưa rõ hoặc spec mâu thuẫn, hỏi gộp quyết định còn thiếu và tiếp tục phần độc lập đã được phép.
3. Sửa code/test theo spec. Nếu thêm/xóa/đổi tên file, route, QA hoặc criterion, review rồi cập nhật danh mục tương ứng. Không có lệnh tự chấp nhận hash/scope mới.
4. Chạy `sdd:run`. Đọc báo cáo, cập nhật checklist/báo cáo học code. Commit thay đổi đúng phạm vi được giao; GitHub chạy lại trên commit mới. `verify` của commit cũ không chứng nhận commit mới.
5. Review diff nghiệp vụ và test assertions trước merge. Required check là `SDD project`; người review vẫn phải đánh giá test có thực sự chứng minh yêu cầu không.

```sh
npm run sdd:check -- --change SDD-PROJECT --phase prepare
docker compose -f infra/compose.yaml --profile test up -d --wait db-test
npm run sdd:run -- --change SDD-PROJECT
npm run sdd:check -- --change SDD-PROJECT --phase verify
```

Lần đầu cần `npm ci`, `npm ci --prefix ui-ux/prototype` và `npx playwright install chromium`. CI tự chuẩn bị dependencies/Chromium/PostGIS. DB kiểm thử chỉ dùng `dvqb_test`, mỗi fixture có schema riêng; không dùng DB thật. Máy macOS có sandbox chặn trình duyệt cần chạy trong môi trường cho phép mở Chromium.

`prepare` chỉ xác nhận nguồn và liên kết. `sdd:run` chạy lint, typecheck, tooling, toàn bộ Jest mobile, API unit/integration với PostGIS, hai coverage gate, build app/API, toàn bộ web E2E, kiểm tải danh mục, build prototype và Storybook. `verify` cần report thật cho mọi bước, đúng file/tên test đã đăng ký và cùng dấu băm code/config/spec. Không chạy lệnh tùy ý từ manifest JSON.

## Đọc dữ liệu kiểm soát

| File | Ý nghĩa |
|---|---|
| [source-map.json](source-map.json) | Nguồn chuẩn có SHA-256 toàn file, heading hoặc JSON Pointer và giá trị ID/contract phải khớp |
| [traceability.json](traceability.json) | Criterion → requirement/QA → code → suite/file/tên test; description và gaps giới hạn điều được chứng minh |
| [project-inventory.json](project-inventory.json) | Toàn bộ file, bộ test, QA, operation, route controller, criterion bắt buộc và các phần chưa chứng minh |
| [changes/SDD-PROJECT.json](changes/SDD-PROJECT.json) | Căn cứ giao việc, baseline spec, phạm vi hồi quy toàn dự án |
| `test-results/sdd/SDD-PROJECT/` | Evidence JSON, report gốc và log từng bước; không track Git, CI upload artifact 7 ngày |

Inventory phân biệt sản phẩm, test, công cụ, hạ tầng, prototype, spec, tài liệu, tham khảo, placeholder và symlink tương thích. File mới ngoài danh sách sẽ làm kiểm tra thất bại. Nguồn kiểm kê lấy từ Git tracked và untracked không bị ignore; không quét node_modules hay artifact build. File tracked không bao giờ bị loại bởi ngoại lệ local. Ngoại lệ untracked còn lại là `.idea` của mobile. P1-01 đã được duyệt A/B ngày 13/10 và đưa vào inventory cùng code/test/báo cáo.

Dấu băm toàn dự án gồm toàn bộ file đó, kể cả workflow, config, test, runner, nguồn và tài liệu. Symlink được băm đích liên kết, không quét lại thư mục đích. Bằng chứng ghi HEAD và root máy tạo để đọc đúng đường dẫn khi tải artifact sang máy khác. Đây là đối chiếu phiên bản, không phải chữ ký chống người có quyền sửa cả checker lẫn report.

Danh sách route đọc bằng cú pháp TypeScript/Nest, gồm các action trong whitelist hiện có. Route động chưa đọc được phải review; không suy đoán từ tên file. API có controller không đồng nghĩa mọi điều kiện contract đã kiểm. Hai adapter ảnh local upload/content chưa có operation OpenAPI được ghi là gap, không tự sửa spec.

## Khi gặp lỗi

| Mã | Xử lý |
|---|---|
| `INVENTORY` | Rà file/QA/API/controller/criterion mới hoặc bị xóa; bổ sung phân loại và trạng thái có lý do sau review |
| `SCHEMA`, `TRACE`, `SOURCE`, `TEST` | Sửa tham chiếu theo nguồn thật; không xóa tiêu chí để né lỗi |
| `SOURCE_CHANGED` | Đọc diff spec và quyết định hiện hành trước khi cập nhật hash |
| `CLASSIFICATION` | Spec đổi so với baseline nhưng gói ghi implementation; chốt và đồng bộ thay đổi spec theo AGENTS |
| `SCOPE` | Review phạm vi thiếu hoặc file ngoài gói |
| `EVIDENCE`, `RESULT`, `STALE_EVIDENCE` | Mở report/log; chạy lại sau sửa, không dùng evidence cũ khi code hoặc HEAD đã đổi |
| `NO_GIT`, `INPUT` | Checkout thiếu Git/baseline/file hoặc input sai; CI checkout đủ lịch sử |

Mã thoát: 0 đạt mức đang kiểm, 1 vi phạm/test fail, 2 lỗi input/hệ thống. Lượt chạy xóa evidence cũ và khóa `run.lock`; fail giữ log để chẩn đoán. Chỉ xóa lock khi đã chắc tiến trình trước dừng. Không retry âm thầm hoặc hạ coverage threshold. Toàn suite web có giới hạn 10 phút để đủ 14 hành trình trên CI; giới hạn từng test và retries=0 giữ nguyên.

Gói [MAP-02](changes/SDD-01-MAP-02.json) còn dùng để chạy nhanh 7 tiêu chí riêng; không thay required check toàn dự án. Thêm gói mới cần recipe code đã review. `baseCommit` là mốc spec đã đối chiếu, không phải diff base PR tự động: khi có thay đổi spec được duyệt, review và cập nhật baseline riêng; không tự lấy HEAD để che drift.

Criterion hiện dùng tên test literal đang bật. Jest hỗ trợ tên đầy đủ trong `describe`; tên động/`test.each` và nested Node test chưa đăng ký thành criterion riêng. Chúng vẫn chạy trong toàn bộ suite; không có skip/todo/fail nào được coi là đạt trong chế độ toàn dự án. Khi cần truy vết từng tham số, phải thêm hỗ trợ có test trước.

## Giới hạn

- Đăng ký đủ 93 QA/130 operation không chứng nhận toàn bộ yêu cầu trong các tài liệu DOCX/Excel. Những yêu cầu chưa có QA máy đọc vẫn cần review tài liệu nghiệp vụ trước triển khai.
- Không tự hiểu nghiệp vụ hoặc chứng minh quyết định đã được chủ dự án duyệt chỉ từ trường `decision`. Mọi lần giảm criterion, sửa hash hoặc đổi checker đều cần review diff.
- Không chạy native trên thiết bị thật, provider live, UAT, production hay tiền thật. Build Expo/Storybook không chứng minh app giống thiết kế.
- QA-068 có số lượng catalog lịch sử khác seed hiện hành; giữ gap, không tự sửa nguồn. Xem thêm `knownGaps` và từng criterion.
- P1-01 A/B đã duyệt riêng verify OTP local/test; không mở OTP login/recover/provider thật, ngân hàng, gọi, thông báo, quản trị hoặc PROMO-02. CI/branch protection không tự duyệt triển khai sản phẩm.
