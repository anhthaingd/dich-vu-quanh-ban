# Tài khoản AWS và cách hiểu credit

[Mục lục](README.md) · Phần 02 · 09/11/2026

## Bạn đang dùng account nào

Trong AWS Settings ban đầu bạn có project `Ctrl Shift Create`. Sau khi bật advanced features, giao diện cho thấy thêm tài khoản quản lý danh tính và management account. Đây là các account có mục đích khác nhau, không phải ba bản deploy ứng dụng.

| Account | Dùng khi nào? |
|---|---|
| `Ctrl Shift Create` — `857146995969` | Chạy app, API, database, ACM và hạ tầng lab |
| `dvqb-learning Management Account` — `215009180804` | Billing tổng và chính sách AWS Organizations |
| `dvqb-learning Identity Delegated Admin` | Quản trị đăng nhập và phân quyền; chưa ghi account ID vì chưa có bằng chứng cần dùng |

**AWS Organizations** là nơi quản lý nhóm account. **IAM** quản lý danh tính/quyền trong AWS; **role** là bộ quyền bạn nhận khi đăng nhập. **MFA** yêu cầu yếu tố xác minh bổ sung khi đăng nhập hoặc thao tác nhạy cảm. Profile CLI lưu cách chọn phiên, không phải một account mới.

Root của management account là lối quản trị khẩn cấp. Tài khoản project do Builder ID sở hữu không có quy trình đăng nhập root bằng email riêng như account truyền thống. MFA bạn đã bật trước đó không đủ để suy ra root management mới đã được bảo vệ; kiểm riêng khi thiết lập quyền root. Dùng role cho công việc thường ngày. [AWS mô tả account sau activation](https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html).

## Credit 200 USD có nghĩa gì

Trong ảnh đã gửi, Billing hiển thị **Available credits $200**, gồm credit khởi đầu và phần onboarding bạn đã kiếm. Đây là số dư tại mốc ảnh, không phải số dư live tại thời điểm đọc tài liệu.

Credit khởi đầu không tự nạp lại 100 USD mỗi tháng. Khi dùng dịch vụ đủ điều kiện, AWS áp credit theo điều khoản và hạn của khoản credit. Chuyển Paid plan giữ credit còn hạn; chi phí vượt phần được bù hoặc không đủ điều kiện sẽ phải thanh toán. Kiểm ngày hết hạn và dịch vụ áp dụng của từng khoản ở Billing; không suy ra thời hạn mới chỉ từ ngày nâng cấp. [AWS Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/).

Ví dụ để hiểu, không phải dự toán lab: nếu có 200 USD credit hợp lệ và một kỳ phát sinh 12 USD đều đủ điều kiện bù, còn 188 USD sau khi ghi nhận. Sang tháng không quay lại 200 USD. Con số **Amount due $0** không chứng minh không có tài nguyên đang tiêu tiền: có thể credit đang bù hoặc dữ liệu billing chưa cập nhật.

## Các bài onboarding đã đi qua

Mục Explore AWS trong ảnh của bạn có năm hoạt động, mỗi hoạt động hiển thị thưởng 20 USD. Chúng giúp làm quen AWS, không thay các tài nguyên Terraform của ứng dụng. AWS nêu các bài có sử dụng dịch vụ có thể phát sinh chi phí vào credit. [Các hoạt động onboarding](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans-activities.html).

| Hoạt động | Bạn học được gì? | Ghi chú từ hành trình |
|---|---|---|
| AWS Budgets | Theo dõi số tiền sử dụng và nhận cảnh báo | Ảnh xác nhận Completed, là khoản 20 USD đầu tiên được thấy |
| EC2 | Máy ảo, trạng thái running, ổ EBS gắn vào máy | `onboarding-ec2`, t3.micro ở Sydney; EC2/EBS đã được xác nhận dọn trong phiên trước |
| Bedrock playground | Gửi một prompt tới mô hình nền tảng | Không cần giữ máy chủ riêng chỉ để làm bài này |
| Lambda web app | Chạy một hàm và mở qua Function URL | `onboarding-hello`, Node.js 24; lỗi trùng handler đã được sửa và người dùng báo chạy được |
| RDS/Aurora | Tạo database được AWS quản lý | Người dùng báo đủ credit; chưa có cấu hình/tên DB cuối để xác nhận cleanup |

Sau bài EC2, `Stop` chỉ dừng máy, còn ổ đĩa có thể tồn tại. Trong phiên trước instance `i-0adf69d0fe57761f3` đã `terminated` và volume `vol-0ab35e30450e7963e` không còn được tìm thấy. Đây là kết quả lịch sử, không phải quét lại toàn account ngày 09/11.

Với Lambda demo, Function URL dùng `NONE` để mở trình duyệt thử. Đây là endpoint công khai của bài Hello World, không phải mẫu cấp quyền cho API sản phẩm. Khi không còn dùng, kiểm function, URL, log group `/aws/lambda/onboarding-hello` và role riêng. Không xóa role dùng chung chỉ vì có tên tương tự.

## Tra lại các thao tác onboarding

Phần này giúp nhớ cách đã học, không yêu cầu tạo lại tài nguyên. Bạn đã báo đủ credit và đã bật advanced features; chương trình không cho kiếm tiếp onboarding credit sau activation. [Điều kiện credit](https://aws.amazon.com/free/free-tier-faqs/).

### Budget cảnh báo

Từ Explore AWS, chọn **Set up a cost budget using AWS Budgets** rồi mở bước tạo budget. Dùng budget chi phí theo tháng, điền tên dễ nhận biết, ngưỡng 20 USD và email bạn đọc thường xuyên. Sau khi lưu, kiểm budget có trong danh sách và email nhận cảnh báo đúng. Mục đích là học cách nhìn chi phí trước khi vượt mức dự định; budget thông báo thông thường không phải nút cắt toàn bộ dịch vụ.

Ảnh đã thấy trạng thái Completed và reward 20 USD. Không cần tạo thêm nhiều budget giống nhau để chờ credit. Giữ budget cần dùng, kiểm lại bộ lọc credit/refund để hiểu số tiền cảnh báo là trước hay sau bù credit.

### EC2 và ổ EBS

Trong Sydney, EC2 → Instances → Launch instances. Hướng đã dùng là tên `onboarding-ec2`, Amazon Linux, loại `t3.micro`, ổ gp3 8 GiB. Bài học chỉ cần tạo máy nên không cần mở SSH/HTTP ra Internet. Đợi instance Running và kiểm trạng thái sức khỏe; `Initializing` trong vài thời điểm đầu không tự có nghĩa tạo thất bại.

EC2 là phần chạy hệ điều hành; EBS là ổ đĩa gắn vào máy. Ảnh Volumes với `In-use` nghĩa ổ còn gắn vào instance, kể cả khi instance đã Stop. Để dọn máy học không còn dữ liệu cần giữ: chọn đúng instance → Instance state → Terminate; kiểm ổ root có `Delete on termination`, rồi kiểm lại Volumes. Chỉ xóa ổ Available đã xác định không cần dùng; không force-detach ổ đang dùng để dọn cho nhanh.

### Bedrock playground

Từ hoạt động **Use a foundation model in the Amazon Bedrock playground**, mở playground và chọn mô hình có sẵn cho account/region. Hướng đã gợi ý dùng Amazon Nova Micro với On-demand và một prompt ngắn. Đọc phản hồi để hiểu request được xử lý bởi dịch vụ mô hình, không phải máy EC2 của mình. Không cần tạo Provisioned Throughput cho bài thử này. Tên lựa chọn/khả dụng có thể khác khi đọc lại; theo hoạt động và màn hình thực tế.

### Lambda và Function URL

1. Lambda → Create function → **Author from scratch**, tên `onboarding-hello`, Node.js 24.x như màn hình đã gửi.
2. Giữ Durable execution và EC2 capacity provider tắt cho hàm Hello World; dùng quyền thực thi cơ bản cần ghi log.
3. Trong code, chỉ giữ một handler, ví dụ:

```js
export const handler = async () => ({
  statusCode: 200,
  headers: { "Content-Type": "text/html; charset=utf-8" },
  body: "<h1>Hello from AWS Lambda!</h1>"
});
```

4. Với `index.mjs`, handler là `index.handler`. Bấm **Deploy** để bản code mới có hiệu lực.
5. Tạo Function URL với Auth type **NONE** cho demo công khai. Console đã hiển thị hai quyền `lambda:InvokeFunctionUrl` và `lambda:InvokeFunction` với điều kiện gọi qua URL. Không chỉ nhìn thấy URL mà kết luận quyền đã đúng.
6. Mở URL và thấy Hello World. Nếu lỗi, chạy Test/đọc CloudWatch log của function trước khi sửa.

Lần thực tế bị `Internal Server Error` do có hai khai báo `handler`; sửa bằng thay toàn bộ nội dung demo, Deploy lại, người dùng xác nhận đã ổn. URL Hello World không được dùng làm `PUBLIC_API_ORIGIN` cho project: API NestJS của lab sẽ chạy trên ECS.

### RDS cho bài làm quen

Hướng cấu hình đã được đưa ra là RDS → Create database → PostgreSQL, tạo database nhỏ Single-AZ, template Free tier/Sandbox nếu Console có, không public, không nối EC2 tự động hay thêm RDS Proxy. Dùng storage nhỏ phù hợp lựa chọn, tắt storage autoscaling cho bài ngắn nếu màn hình cho phép; đọc lại phần Monitoring/backup trước Create.

Không có ảnh cấu hình RDS cuối trong chuỗi bằng chứng, nên không ghi tên DB, class hoặc cleanup là đã xác nhận. Khi dọn bài này, xác định đúng DB chỉ dùng onboarding và không còn dữ liệu cần giữ; kiểm lựa chọn final snapshot/retained backups vì chúng có thể còn sau khi DB bị xóa. RDS này không tự trở thành database lab: Terraform sẽ quản lý DB riêng qua state.

## Vì sao chuyển Paid plan rồi mới bật advanced features

Bạn chọn học kiến trúc nhiều dịch vụ, trong khi tài khoản đăng ký mới ban đầu có các cấu hình do AWS quản lý. Paid plan và advanced features là hai bước khác nhau: nâng cấp hình thức sử dụng trước, rồi nhận quyền quản trị tổ chức và cấu hình đa region. Sau activation vẫn cần xem SCP hiện có trước khi sử dụng region mới. [AWS activation](https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html).

Trình tự đã làm: kiếm onboarding credit → Paid plan → đặt spend limit 20 USD → bật advanced features → kiểm chính sách region. Không cần thực hiện lại các bước này khi deploy lần sau.

Đường thao tác để nhớ lại: **AWS Settings → Billing → Upgrade**, đọc điều kiện và hoàn tất nâng cấp. Trong bước spend limit, bạn chọn 20 USD; màn hình tiếp theo có ba lựa chọn: dừng tạo tài nguyên mới, tạm dừng tài nguyên rảnh, tạm dừng tài nguyên chi phí cao. Đó là các cơ chế của trải nghiệm trước activation, không phải cấu hình đang bảo vệ lab sau activation.

Tiếp theo **Projects → Continue to activation / Explore advanced features**, đặt team `dvqb-learning`, email management account, xác minh email và hoàn tất Review/Activate. Banner xanh xác nhận thành công là mốc chuyển sang quản lý tổ chức trực tiếp. Đây là lịch sử thao tác, không cần bấm tạo project hoặc activation lần nữa.

## Phân biệt ba loại con số chi phí

| Loại | Ý nghĩa trong hành trình |
|---|---|
| Credit 200 USD | Khoản bù chi phí đủ điều kiện còn hạn; không phải trần bảo đảm hóa đơn |
| Spend limit 20 USD trong AWS Settings | Bạn đã đặt trước activation; **AWS đã gỡ khi bật advanced features** |
| `monthly_budget_usd: 20` trong config lab | Ngưỡng cảnh báo dự định tạo qua Terraform; không tự dừng mọi dịch vụ |

Advanced features không thể đảo ngược về trải nghiệm cũ; không tiếp tục dựa vào spend limit $20 để bảo vệ chi phí. [AWS xác nhận spend limits bị gỡ](https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html).

Trước apply, vào Billing kiểm credits, ngày hết hạn, Cost Explorer và budget/địa chỉ nhận cảnh báo đang hoạt động. Xác nhận email SNS khi lab tạo subscription. Có email cảnh báo vẫn cần tự hành động khi nhận cảnh báo.

Lý do vẫn cần dọn lab: ECS, RDS, ALB và các thành phần khác có thể tính tiền theo thời gian tồn tại hoặc dung lượng dù bạn không mở app. Các dự toán giờ học cũ trong [B00-20](../bao-cao/B00-20-lab-aws02.md) là ước tính theo giả định, chưa phải hóa đơn thực của account. Khi chạy thật, ghi giờ bắt đầu/dọn và đối chiếu usage để biết một buổi học tốn bao nhiêu.

Tiếp: [Đăng nhập CLI và mở region](03-cli-region.md).
