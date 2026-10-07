# B02-03 — Từ đăng dịch vụ tới khách tìm thấy

P0-1 · 06/10/2026 · DELIVERY-01. [Checklist](../01-checklist.md) · [Phạm vi đã duyệt](../de-xuat/P0-01-nguon-cung-va-tim-dich-vu.md).

## 1. Bạn đã dùng được gì?

Trước đây app mới có danh mục và tài khoản. Bây giờ, vào **Tài khoản → Cung cấp dịch vụ**, người đủ điều kiện có thể tạo hồ sơ thợ tự do/cửa hàng/doanh nghiệp, chọn kỹ năng thật, nhập giá tham khảo, vùng phục vụ và cửa hàng. Bấm **Công bố**, rồi **Bật nhận việc** thì khách tìm được hồ sơ tại vị trí phù hợp.

Khách bấm **Tìm dịch vụ**, nhập tọa độ hoặc chọn địa chỉ đã lưu, chọn bán kính và bộ lọc, rồi xem hồ sơ. Khoảng cách được tính bằng dữ liệu địa lý trong DB, không phải con số minh họa. Nhãn giao diện hỗ trợ Việt/Anh/Nhật; nội dung người dùng tự nhập không tự dịch.

Đã viết code và kiểm local, gồm Android emulator/iOS simulator. Đã push `fe35564`; [CI ngày 07/10](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37566935703) đạt cả 3 jobs. Chưa UAT của chủ dự án, chưa triển khai production. Gói này chưa có gửi/nhận yêu cầu thuê hoặc chat; đó là P0-2.

## Bổ sung 07/10 — Tìm nút nhận việc và xem giao diện

**Đường đi:** Tài khoản → Cung cấp dịch vụ → chọn hồ sơ hoặc bấm **Quản lý và bật/tắt nhận việc**. Ngay đầu màn có khối **TRẠNG THÁI NHẬN VIỆC** cùng nút **Bật nhận việc** hoặc **Tắt nhận việc**.

- Hồ sơ nháp: nút bật vẫn hiện nhưng bị khóa. Lưu kỹ năng/nơi phục vụ rồi bấm **Công bố hồ sơ**, sau đó mới bật nhận việc.
- Hồ sơ công bố: nút nhận việc luôn ở đầu màn. Chỉ đổi trạng thái khi máy chủ xác nhận lưu thành công. Tắt thì hồ sơ rời kết quả tìm kiếm; không xóa hồ sơ.
- Các ô chỉnh sửa được gom dưới **Thông tin dịch vụ**, với bốn mục xếp đều hai cột: **Giới thiệu · Kỹ năng và giá · Vùng phục vụ · Cửa hàng**. **Hồ sơ công khai**, chuyển về nháp và tải lại đặt cuối để tránh nhầm với bật/tắt nhận việc. Chọn ngôn ngữ ở cuối màn quản lý.
- Danh sách hồ sơ hiển thị cả trạng thái công bố và nhận việc. Không cần mở từng hồ sơ chỉ để biết mình đang bật hay tắt.

Đây là sửa cách trình bày trong phạm vi P0-1. Không đổi API/DB/quyền hoặc điều kiện công bố. [AccountPage](../../../apps/mobile/src/features/accounts/components/AccountPage.tsx) sắp xếp phần chung; [PartnersScreen](../../../apps/mobile/src/features/partners/screens/PartnersScreen.tsx) hiển thị trạng thái trong danh sách; `Editor` trong [PartnerEditorScreen](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx) đặt thao tác nhận việc lên đầu. [PartnerFields.Options](../../../apps/mobile/src/features/partners/components/PartnerFields.tsx) nhận `layout="sections"` để xếp bốn mục chỉnh sửa; ID test chỉ dùng tìm nút, không quyết định giao diện. Khi bấm, `save` vẫn gửi `action: 'availability'`, `accepting_jobs` và phiên bản đang xem qua luồng ở mục 4. Mất mạng vẫn giữ cùng lần gửi để thử lại, không báo thành công trước.

### Ảnh màn hình sau chỉnh sửa

Ảnh chụp trực tiếp từ app trên **Android emulator API 36** và **iPhone 18 Pro Simulator / iOS 27**, ngày **07/10/2026**. Dùng hồ sơ `Native company` trong DB test riêng; không phải doanh nghiệp thật. Các ảnh biểu diễn các bước liên tiếp nên trạng thái có thể khác nhau giữa ảnh nháp và ảnh đã công bố. Các màn dài chụp tại phần đang được mô tả, không phải ảnh toàn bộ nội dung cuộn.

| Màn/trạng thái | Android emulator | iOS Simulator |
|---|---|---|
| Đang nhận việc — nút Tắt nhận việc ở đầu màn | ![Đang nhận việc — nút Tắt nhận việc ở đầu màn — Android](anh/B02-03/android-partner-published.png) | ![Đang nhận việc — nút Tắt nhận việc ở đầu màn — iOS](anh/B02-03/ios-partner-published.png) |
| Đã công bố, đang tắt — nút Bật nhận việc | ![Đã công bố, đang tắt — nút Bật nhận việc — Android](anh/B02-03/android-partner-paused.png) | ![Đã công bố, đang tắt — nút Bật nhận việc — iOS](anh/B02-03/ios-partner-paused.png) |
| Danh sách hồ sơ và lối vào quản lý | ![Danh sách hồ sơ và lối vào quản lý — Android](anh/B02-03/android-partner-list.png) | ![Danh sách hồ sơ và lối vào quản lý — iOS](anh/B02-03/ios-partner-list.png) |
| Tạo hồ sơ — chọn loại và đặt tên | ![Tạo hồ sơ — chọn loại và đặt tên — Android](anh/B02-03/android-partner-create.png) | ![Tạo hồ sơ — chọn loại và đặt tên — iOS](anh/B02-03/ios-partner-create.png) |
| Hồ sơ nháp — hướng dẫn công bố trước khi bật | ![Hồ sơ nháp — hướng dẫn công bố trước khi bật — Android](anh/B02-03/android-partner-draft.png) | ![Hồ sơ nháp — hướng dẫn công bố trước khi bật — iOS](anh/B02-03/ios-partner-draft.png) |
| Giới thiệu và thông tin liên hệ | ![Giới thiệu và thông tin liên hệ — Android](anh/B02-03/android-partner-profile-edit.png) | ![Giới thiệu và thông tin liên hệ — iOS](anh/B02-03/ios-partner-profile-edit.png) |
| Đầu mục kỹ năng và giá — cuộn tiếp để nhập giá | ![Đầu mục kỹ năng và giá — cuộn tiếp để nhập giá — Android](anh/B02-03/android-partner-skills.png) | ![Đầu mục kỹ năng và giá — cuộn tiếp để nhập giá — iOS](anh/B02-03/ios-partner-skills.png) |
| Vùng phục vụ — tâm vùng và bán kính | ![Vùng phục vụ — tâm vùng và bán kính — Android](anh/B02-03/android-partner-areas.png) | ![Vùng phục vụ — tâm vùng và bán kính — iOS](anh/B02-03/ios-partner-areas.png) |
| Cửa hàng — trạng thái chưa thêm địa điểm | ![Cửa hàng — trạng thái chưa thêm địa điểm — Android](anh/B02-03/android-partner-locations.png) | ![Cửa hàng — trạng thái chưa thêm địa điểm — iOS](anh/B02-03/ios-partner-locations.png) |
| Khách nhập vị trí và bộ lọc tìm dịch vụ | ![Khách nhập vị trí và bộ lọc tìm dịch vụ — Android](anh/B02-03/android-partner-search-form.png) | ![Khách nhập vị trí và bộ lọc tìm dịch vụ — iOS](anh/B02-03/ios-partner-search-form.png) |
| Kết quả tìm được từ DB test | ![Kết quả tìm được từ DB test — Android](anh/B02-03/android-partner-search-results.png) | ![Kết quả tìm được từ DB test — iOS](anh/B02-03/ios-partner-search-results.png) |
| Hồ sơ công khai mà khách xem | ![Hồ sơ công khai mà khách xem — Android](anh/B02-03/android-partner-public.png) | ![Hồ sơ công khai mà khách xem — iOS](anh/B02-03/ios-partner-public.png) |

**Kiểm lại UI 07/10:** 139 bài mobile/27 bộ và gate coverage đạt; sau chỉnh prop bố cục, 6 bài màn hồ sơ kiểm lại đạt. Hành trình web P0-1 đạt; typecheck/lint đạt. Android/iOS đều qua luồng công bố → bật → tắt → bật lại → xem bốn mục chỉnh sửa → đổi ngôn ngữ → tìm → mở hồ sơ. Đây là emulator/simulator, chưa kiểm điện thoại thật hoặc CI mới. Hai bộ ảnh gốc: `test-results/native/android/partners/2026-10-07_111302/partners/takeScreenshot/`, `test-results/native/ios/partners/2026-10-07_111304/partners/takeScreenshot/`. Ảnh được sao chép nguyên bản vào repo; dữ liệu test được dọn khi kết thúc.

Các lượt thử đầu dừng vì bộ dò chữ/bước cuộn/đổi ngôn ngữ của test chưa khớp bố cục; đã sửa và chạy lại. Một lượt Android khởi động chậm bị dừng để chạy lại; không coi lượt đó là PASS. Giới hạn crash native đã ghi ở mục 6 vẫn chưa được xác định nguyên nhân gốc.


## 2. Tự thử trước khi đọc code

Đã tạo **3 tài khoản DEMO mới riêng** trong DB local: `solo`, `shop`, `company`. Mở [file đăng nhập local](../../../.local/demo-partners.json) để lấy email/mật khẩu tương ứng. File này không nằm trong Git. Hồ sơ có chữ DEMO, không phải thợ thật; ví bằng 0đ, nhãn hồ sơ vẫn **chưa xác minh**. Không sửa trạng thái tài khoản bạn đang sử dụng. Định danh điện thoại ở các tài khoản này là dữ liệu thử được bạn cho phép, không phải SMS đã xác minh thật.

1. Chạy API và Metro Android/iOS theo [README](../../../README.md); API local cần được khởi động lại sau khi thay code.
2. Từ danh mục mở **Tìm dịch vụ**, nhập vĩ độ `21.0285`, kinh độ `105.8542`, bán kính `10000` mét. Có ba hồ sơ DEMO; lọc chỉ đã xác minh sẽ rỗng vì không tự gắn huy hiệu.
3. Đăng nhập một tài khoản DEMO → Cung cấp dịch vụ → mở hồ sơ → tắt nhận việc. Quay lại tìm, hồ sơ đó biến mất. Bật lại thì xuất hiện.
4. Sửa phần giới thiệu, lưu, đóng/mở lại màn: dữ liệu còn. Thay đổi tên đang nhập rồi đổi ngôn ngữ: bản đang nhập còn nguyên.
5. Dùng tài khoản email thường chưa xác minh điện thoại: không được tạo người cung cấp. Đây là điều kiện đã chốt, không phải app bị lỗi. OTP vẫn Pending.

Lệnh `npm run db:demo-partners` dùng cho máy chưa tạo bộ DEMO. Chỉ chạy khi `NODE_ENV=development`, DB `dvqb_local` ở localhost. Có file thông tin DEMO rồi thì lệnh dừng để bạn dùng lại; không tự xóa hoặc nạp lại người cung cấp cũ. Địa điểm đang nhập thủ công; xem [đề xuất bản đồ miễn phí](../de-xuat/MAP-01-ban-do-mien-phi.md).

## 3. Theo thao tác “Công bố”

**App** là phần bạn bấm trên điện thoại. **API** là cửa nhận yêu cầu ở máy chủ. **DB** là nơi lưu dữ liệu lâu dài. Máy chủ quyết định quyền và điều kiện; màn hình chỉ gửi mong muốn của người dùng.

```mermaid
sequenceDiagram
    actor Owner as Người cung cấp
    participant Screen as Màn quản lý hồ sơ
    participant State as Bộ giữ lần lưu
    participant API as Máy chủ
    participant DB as Nơi lưu dữ liệu
    actor Customer as Khách
    Owner->>Screen: Bấm Công bố
    Screen->>State: Gửi mã hồ sơ và phiên bản đang xem
    State->>API: Gửi yêu cầu cùng mã lần lưu
    API->>DB: Kiểm phiên đăng nhập và quyền sửa
    API->>DB: Kiểm phiên bản, kỹ năng và nơi phục vụ
    DB-->>API: Hợp lệ và lưu trạng thái công bố
    API-->>Screen: Hồ sơ cùng phiên bản mới
    Screen-->>Owner: Đã công bố, chưa tự nhận việc
    Owner->>Screen: Bật nhận việc
    Screen->>API: Lưu lựa chọn nhận việc
    API->>DB: Kiểm lại điều kiện và lưu
    Customer->>API: Tìm quanh vị trí đã chọn
    API->>DB: Lọc hồ sơ và tính khoảng cách
    DB-->>API: Các hồ sơ phù hợp
    API-->>Customer: Danh sách không chứa dữ liệu riêng
```

Sơ đồ mô tả đường thành công. Nếu thiếu kỹ năng, có chế độ tại cửa hàng nhưng chưa có cửa hàng công khai, hoặc có người khác vừa sửa, máy chủ từ chối. Không hiển thị công bố thành công khi dữ liệu chưa lưu.

## 4. Mở code theo thứ tự nào?

### Khi người cung cấp lưu hồ sơ

| Bước | File và hàm thật | Nhận gì, làm gì, chuyển cho ai? |
|---|---|---|
| 1 | [PartnerEditorScreen.tsx](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx), `Editor`, `save` | Lấy nội dung các ô hoặc lựa chọn công bố, thêm version của bản đang xem, gọi bộ giữ lần lưu. Mỗi phần có nút lưu riêng; công bố dùng dữ liệu đã lưu. |
| 2 | [partner-editor.ts](../../../apps/mobile/src/features/partners/state/partner-editor.ts), `PartnerEditor.save` | Tạo mã cho lần lưu và giữ nguyên yêu cầu khi cần thử lại. Đặt màn ở trạng thái đang lưu; chỉ báo đã lưu sau khi máy chủ trả kết quả. |
| 3 | [auth-session.ts](../../../apps/mobile/src/features/auth/state/auth-session.ts), `editPartner`, `accountOperation` | Gắn phiên đăng nhập; nếu access token hết hạn thì làm mới và thử lại đúng yêu cầu. Token không nằm trong ô nhập hay dữ liệu hiển thị. |
| 4 | [partners-api.ts](../../../apps/mobile/src/features/partners/api/partners-api.ts), `createPartnersApi().edit` | Chuyển yêu cầu thành HTTP PUT. `action` chọn đường dẫn; body chứa dữ liệu + expected_version; header chứa Bearer và Idempotency-Key. Kiểm hình dạng phản hồi trước khi đưa về màn. |
| 5 | [partners.controller.ts](../../../services/api/src/modules/partners/partners.controller.ts), `edit`; [partners.input.ts](../../../services/api/src/modules/partners/partners.input.ts), `editInput` | Nhận yêu cầu từ mạng; kiểm UUID, kiểu tiền, tọa độ, trường cho phép. Ví dụ giá phải là chuỗi nguyên đồng không âm; `null` khác `"0"`. |
| 6 | [partners.service.ts](../../../services/api/src/modules/partners/partners.service.ts), `edit`, `permission`, `validProfile` | Kiểm đúng chủ/người được cấp quyền, version hiện tại, kỹ năng và nơi phục vụ. Dữ liệu hợp lệ mới được lưu; tăng version để lần sửa sau biết bản nào mới. |
| 7 | [account-transaction.ts](../../../services/api/src/modules/accounts/account-transaction.ts), `AccountTransaction.run` | Gói việc kiểm/lưu thành một giao dịch: lỗi giữa chừng thì quay về trước khi lưu. Gửi lặp cùng mã trả lại kết quả cũ sau khi kiểm lại quyền, không làm hai lần. |
| 8 | [partners.read.ts](../../../services/api/src/modules/partners/partners.read.ts), `readManagement` | Đọc lại đúng các trường dành cho màn quản lý. Kết quả đi ngược qua API → bộ giữ lần lưu → màn hình. |

`version` là số lần cập nhật của hồ sơ. `expected_version` nghĩa là “tôi đang sửa từ bản số này”. Ví dụ máy A và B cùng đọc bản 3; A lưu thành bản 4; B gửi bản 3 thì bị báo xung đột, không ghi đè A.

`Idempotency-Key` là mã riêng của **một lần lưu**. Nếu máy chủ đã lưu nhưng mạng đứt trước khi bạn nhận kết quả, gửi lại cùng mã sẽ nhận lại kết quả đó. Không tạo hồ sơ thứ hai. Không sử dụng mã cũ cho nội dung mới.

### Khi khách tìm dịch vụ

| Bước | File và hàm thật | Dữ liệu đi như thế nào? |
|---|---|---|
| 1 | [CatalogScreen.tsx](../../../apps/mobile/src/features/catalog/screens/CatalogScreen.tsx) → [SearchScreen.tsx](../../../apps/mobile/src/features/search/screens/SearchScreen.tsx), `submit` | Danh mục chuyển ID ngành/kỹ năng; màn tìm nhận tọa độ, bán kính, nơi làm và bộ lọc xác minh. Chọn địa chỉ lưu lấy tọa độ từ sổ địa chỉ của chính tài khoản. |
| 2 | [partner-search.ts](../../../apps/mobile/src/features/search/state/partner-search.ts), `PartnerSearch` | Giữ danh sách đang thấy, mã trang sau và trạng thái tải/lỗi. Tìm mới hủy lượt cũ; phản hồi cũ đến muộn không được ghi đè lượt mới. |
| 3 | [partners-api.ts](../../../apps/mobile/src/features/partners/api/partners-api.ts), `search` → [partners.controller.ts](../../../services/api/src/modules/partners/partners.controller.ts), `list` | Gửi GET `/partners` cùng các bộ lọc. Tìm công khai không gửi token. |
| 4 | [search.query.ts](../../../services/api/src/modules/search/search.query.ts), `searchInput`, `SearchCursor` | Kiểm tọa độ/bộ lọc và mã trang sau. Mã trang chỉ dùng được với đúng bộ lọc đã tạo ra nó, không ghép trang của một vị trí vào vị trí khác. |
| 5 | [search.service.ts](../../../services/api/src/modules/search/search.service.ts), `SearchService.list` | DB lọc kỹ năng, trạng thái và vùng trước, rồi tính khoảng cách bằng PostGIS. PostGIS là phần mở rộng giúp PostgreSQL hiểu tọa độ và mét. |
| 6 | [PartnerProfileScreen.tsx](../../../apps/mobile/src/features/partners/screens/PartnerProfileScreen.tsx), `Profile` → `PartnersService.publicProfile` | Bấm kết quả để đọc hồ sơ công khai. Máy chủ chọn từng trường được trả; thông tin liên hệ chỉ trả khi có phiên đăng nhập hợp lệ. |

Tại cửa hàng: khoảng cách tới điểm công khai gần nhất phù hợp. Tại khách/tùy chọn: khách phải nằm trong vùng tròn và tâm vùng nằm trong bán kính tìm; app ghi rõ đây là **khoảng cách tới tâm vùng phục vụ**. Không có theo dõi vị trí thợ hay ước tính giờ đến. Nhiều kỹ năng/địa điểm phù hợp vẫn chỉ trả một hồ sơ.

## 5. Dữ liệu và quyền được giữ ở đâu?

- Ô chưa lưu nằm tạm trong màn, mất khi rời màn/đóng app. Đổi ngôn ngữ hoặc đổi mục trong cùng màn giữ nội dung; không coi đó là đã lưu DB.
- [Migration 006](../../../services/api/migrations/006_partners.sql) thêm hồ sơ, thành viên/quyền, kỹ năng, vùng, cửa hàng và nền ví. Tạo hồ sơ + chủ + ví 0 là một giao dịch. Không có nạp/rút tiền.
- Chỉ chủ hoặc thành viên đang có `profile.manage` được quản lý; máy chủ kiểm mỗi lần, kể cả retry. Người ngoài không đọc được dữ liệu quản lý bằng cách tự thay ID.
- Nháp không có trong kết quả/hồ sơ công khai. Công bố không tự bật nhận việc. Tắt nhận việc giữ liên kết public nhưng loại khỏi tìm kiếm. Kỹ năng ngừng hoạt động, hồ sơ lưu trữ/đình chỉ không lọt kết quả.
- Địa chỉ riêng, giấy tờ, ví không vào phản hồi public. Tên/bio/contact người dùng nhập không được tự dịch. Điện thoại tài khoản verified và huy hiệu hồ sơ verified là **hai việc khác nhau**.

Khi mất mạng lúc lưu, app khóa nội dung lần gửi và cho thử lại cùng mã. Khi xung đột phiên bản, bản đang nhập còn nhưng cần xem lại trước khi lưu tiếp; **Tải lại hồ sơ** thay nội dung đang nhập bằng bản máy chủ. Khi phiên hết hiệu lực, màn quản lý ẩn và yêu cầu đăng nhập lại. Tìm lỗi có thử lại; không có kết quả là trạng thái riêng, không báo lỗi mạng.

## 6. Đã kiểm và giới hạn

Bộ kiểm tự động gồm quyền nhiều tài khoản, thu hồi quyền rồi retry, hai thiết bị sửa cùng phiên bản, thất bại giữa giao dịch, giá trống/0đ, kỹ năng và chế độ không khớp, vùng/bán kính, dữ liệu riêng, phân trang, ngôn ngữ và mất phản hồi mạng. Trình duyệt kiểm app nối API và DB thật. Android/iOS kiểm đăng nhập DEMO test, công bố/bật nhận, tìm thủ công và mở hồ sơ.

**Lưu ý Android:** một lượt khởi động development build gặp crash native trong `libreactnative.so / MountingCoordinator::pullTransaction`; không có lỗi JS trong log đã kiểm. Chạy lại độc lập đạt đầy đủ. Chưa xác định nguyên nhân gốc hoặc sửa runtime; đây là hiện tượng cần theo dõi, không được suy ra đã ổn định như bản phát hành.

<details>
<summary>Lệnh, file test và bằng chứng kỹ thuật</summary>

| Kiểm tra local 06/10/2026 | Kết quả và nơi tra |
|---|---|
| API + PostgreSQL/PostGIS | `npm run test:coverage -w services/api`; 61 bài đạt, gate coverage đạt; kết quả cuối ở `test-results/api/junit.xml`, `coverage/api/index.html` |
| App/state/component | `npm run test:coverage -w apps/mobile`; 138 bài, 27 bộ; gate coverage đạt. `test-results/mobile/junit.xml`, `coverage/mobile/index.html` |
| App/API/DB trên web | `npm run test:e2e`; 9 bài đạt; hành trình mới tại [partners.spec.mjs](../../../tests/e2e/web/partners.spec.mjs), báo cáo `test-results/web` |
| Android | `DEVICE_ID=emulator-5554 npm run test:native -- android partners`; PASS, `test-results/native/android/partners/result.json` |
| iOS | `DEVICE_ID=9B485B08-15C4-40BB-9E29-03816068E6AC npm run test:native -- ios partners`; PASS, `test-results/native/ios/partners/result.json` |
| Static/build | `npm run typecheck`, `npm run lint`, `npm run build`; không thêm thư viện sản phẩm mới |
| DEMO | [demo-partners.ts](../../../services/api/src/database/demo-partners.ts), [guard môi trường](../../../services/api/src/database/demo-options.ts); đã nạp ba tài khoản mới và kiểm API local trả ba hồ sơ |
| GitHub CI / UAT — cập nhật 07/10 | `fe35564`, [CI](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37566935703) đạt 3 jobs; chủ dự án chưa nghiệm thu P0-1 |

Kiểm sâu quyền/giao dịch tại [partners.test.ts](../../../services/api/test/integration/partners.test.ts); điều hướng/form tại [Partners.test.tsx](../../../apps/mobile/src/features/partners/screens/Partners.test.tsx); native flow tại [partners.yaml](../../../tests/e2e/native/partners.yaml). Native test dùng schema riêng trong `dvqb_test` và dọn sau khi xong, khác bộ DEMO local giữ lại cho bạn.

AuthModule được đăng ký một lần dùng chung; Me đọc trạng thái xác minh và danh sách membership thật. AccountTransaction có bước kiểm quyền tài nguyên trước cả phản hồi gửi lặp. Log chuẩn hóa đường dẫn/operation, không ghi tọa độ tìm hoặc nội dung hồ sơ. Bộ web dọn các socket của chính fixture sau bài offline để không treo teardown. Artifact test/log/coverage và mật khẩu DEMO không track Git; chạy lại lệnh tương ứng nếu artifact đã bị dọn.

API/data chuẩn tại [v0.1.6](../../technical-design/README.md), [OpenAPI](../../technical-design/openapi.json), [schema](../../technical-design/schema.sql), QA-074/075. Đã đồng bộ phần spec P0-1 được duyệt: UX/quyền/trạng thái/luồng, bản xuất và sổ quản lý v1.44. Các file Drive được cập nhật cùng ID và tải lại đối chiếu; PRD/SRS/UX/FR được đọc lại phần đã sửa. Kiểm sổ Excel không thấy thay đổi ô cũ ngoài phạm vi dự kiến. Sơ đồ báo cáo đã render và kiểm hình; báo cáo này chỉ lưu repo.

</details>

**Đã push P0-1 tại `fe35564` ngày 07/10/2026; [CI 37566935703](https://github.com/anhthaingd/dich-vu-quanh-ban/actions/runs/37566935703) đạt cả 3 jobs: static/mobile/build, API/PostGIS và web E2E.** Chưa UAT; native dùng bằng chứng emulator/simulator đã ghi, không phải thiết bị thật. Các ghi chú chưa push/CI ở mốc kiểm trước là lịch sử.

### Kiểm lại trước push ngày 07/10/2026

- `npm run lint`, `npm run typecheck`, 3 tooling, 139 mobile/27 suites và 61 API/PostGIS đạt; cả hai gate coverage đạt.
- `npm run test:e2e`: 9/9 hành trình đạt khi chạy độc lập. Lượt đầu Chromium bị sandbox macOS chặn trước test; lượt sau hai bài lỗi do build đồng thời thay thư mục `services/api/dist`. Đã chạy lại toàn bộ web riêng sau khi build kết thúc, không sửa code để che lỗi.
- `npm run build` đạt API và bundle Android/iOS/web; `npm run test:load` đạt 200 request, concurrency 20, 0 lỗi, p95 khoảng 46,9 ms. Đây là test local danh mục, không phải tải bản đồ/production SLA.
- Đọc lại hai kết quả native PASS ngày 07/10 và kiểm ảnh mẫu hiện có; phiên push này không chạy lại emulator/simulator. Giữ giới hạn crash native và chưa UAT đã ghi ở trên.
- Kiểm liên kết kế hoạch/báo cáo và `git diff --check` đạt; `.local/demo-partners.json` được ignore, không nằm trong phần push. Kế hoạch MAP-01 đã ghi hướng thử Geoapify Free được chủ dự án chọn, chưa bật billing/chưa tích hợp.

## 7. Bài thử để hiểu code

1. Vì sao bấm Công bố chưa thấy trong tìm kiếm? **Gợi ý:** tìm `accepting_jobs`; công bố và nhận việc là hai lựa chọn riêng.
2. Vì sao thử lại không tạo hai doanh nghiệp? **Gợi ý:** theo `PartnerEditor.save` tới `AccountTransaction.run`, xem nơi giữ cùng mã lần lưu và nơi lưu kết quả ở DB.
3. Vì sao chọn “tại cửa hàng” không được lấy vùng phục vụ của một kỹ năng khác? **Gợi ý:** đọc `matched_skills` và `candidates` trong `SearchService.list`; kỹ năng và mode phải khớp trên cùng dịch vụ.

## 8. Phần kế tiếp

**Cập nhật thứ tự 07/10 theo yêu cầu chủ dự án:** làm [MAP-01 chọn địa điểm bằng địa chỉ/bản đồ](../de-xuat/MAP-01-ban-do-mien-phi.md) trước P0-2; đã chọn hướng thử MapLibre + Geoapify Free, chưa bật billing; chưa có code bản đồ.

Sau MAP-01, P0-2 nối **gửi yêu cầu → thợ/chủ nhận hoặc từ chối → theo dõi việc → chat khách–người cung cấp**. Không xen tiện ích tài khoản. Cần đối chiếu contract hiện hành theo cả gói trước khi code.

B02/B03 đầy đủ vẫn còn ảnh/upload, xét xác minh, bản đồ/GPS, polygon và xếp hạng đánh giá/đề xuất. OTP chưa mở lại; chưa ngân hàng/tiền thật. [MAP-01](../de-xuat/MAP-01-ban-do-mien-phi.md) đã có kế hoạch trước P0-2; hướng thử Geoapify Free đã chốt, chưa bật billing; API mới và hành vi chi tiết vẫn là đề xuất.
