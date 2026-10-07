# MAP-01 Kế hoạch chọn địa điểm bằng địa chỉ và bản đồ

07/10/2026 · bộ kế hoạch DELIVERY-01, chỉ lưu repo. **Đã chốt thứ tự P0-1 → MAP-01 → P0-2** theo yêu cầu chủ dự án. **Đã chốt hướng thử MapLibre + Geoapify Free, chưa bật billing**, theo phản hồi chủ dự án trong phiên 07/10. API mới và hành vi chi tiết dưới đây vẫn là **đề xuất để duyệt**, chưa triển khai hoặc phát sinh chi phí. Giữ đường dẫn MAP-01 cũ để các liên kết tiếp tục hoạt động.

Mục tiêu: người dùng chọn được địa điểm bằng cách gõ địa chỉ hoặc chạm bản đồ, không cần biết kinh độ/vĩ độ. Đề xuất một bộ chọn chung cho tìm dịch vụ, sổ địa chỉ, cửa hàng và tâm vùng phục vụ, bàn giao cùng một đợt trước P0-2.

## 1. Nền đã có và phạm vi đợt

| Nơi sử dụng | Code và dữ liệu thật | Bổ sung dự kiến |
|---|---|---|
| Khách tìm dịch vụ | [SearchScreen](../../../apps/mobile/src/features/search/screens/SearchScreen.tsx), `submit`/`SavedPositions`; nhập tọa độ hoặc chọn địa chỉ đã lưu | Chọn địa điểm chung, giữ bán kính và bộ lọc |
| Sổ địa chỉ | [AddressesScreen](../../../apps/mobile/src/features/accounts/screens/AddressesScreen.tsx), `save`/`inputOf`; `address.text` + `address.point` | Chọn trên bản đồ rồi đặt nhãn Nhà/Công ty và mô tả; giữ mặc định/version/retry |
| Địa điểm cửa hàng | [PartnerEditorScreen](../../../apps/mobile/src/features/partners/screens/PartnerEditorScreen.tsx), phần `locations` | Chọn từng điểm, giữ lựa chọn công khai/riêng tư |
| Vùng phục vụ | Cùng màn trên, phần `areas`; tâm + bán kính, chưa hỗ trợ polygon | Chọn tâm, xem vòng tròn bán kính, đặt tên vùng |
| Tìm gần đây | [SearchService.list](../../../services/api/src/modules/search/search.service.ts) | Tiếp tục lọc vùng/khoảng cách bằng PostGIS trong DB dự án |

[Package app](../../../apps/mobile/package.json) đang khóa Expo `57.0.26`, React Native `0.86.3`; chưa có SDK map hoặc `expo-location`. `PartnerCard` chỉ có khoảng cách, **chưa có tọa độ ghim kết quả**. MAP-01 ưu tiên bản đồ chọn địa điểm; bản đồ toàn bộ người cung cấp/gom ghim để sau, cần contract về tọa độ được công khai. Hồ sơ public đã có `public_addresses`, có thể hiển thị các điểm cửa hàng này, không lấy dữ liệu quản lý hoặc tâm vùng riêng để làm vị trí thợ.

## 2. Trải nghiệm người dùng

**Nhập tay:** bấm Chọn địa điểm → gõ số nhà/đường/địa danh → chọn một trong tối đa 5 gợi ý có quận/tỉnh → xem ghim → chỉnh nếu cần → bấm Dùng địa điểm này. Có nút Tìm cho chuỗi địa chỉ đầy đủ. Không tự chọn kết quả đầu tiên hoặc coi chữ nhập tự do là tọa độ đã xác định.

**Chọn trực tiếp:** mở bản đồ tại điểm đang có → chạm để đặt ghim hoặc kéo bản đồ dưới ghim giữa màn → dừng kéo → tra tên địa chỉ gần điểm → người dùng kiểm/sửa mô tả → xác nhận. Tra địa chỉ ngược không được kéo ghim từ tọa độ người dùng chọn sang tọa độ nhà cung cấp suy đoán.

**Vị trí hiện tại:** chỉ xin quyền khi bấm Dùng vị trí của tôi; lấy một lần khi đang dùng app, hiển thị độ chính xác và cho chỉnh lại. Từ chối quyền, tắt GPS hoặc timeout vẫn nhập địa chỉ/chọn map được; không theo dõi nền. [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/) hỗ trợ Android/iOS/web.

**Địa chỉ đã lưu:** chọn mục của chính tài khoản → xem lại ghim → xác nhận. Tìm dịch vụ không tự thêm/sửa sổ địa chỉ. Đổi tài khoản xóa địa chỉ riêng đang giữ trong bộ chọn.

Bố cục: ô tìm/gợi ý ở trên, map ở giữa, địa chỉ và nút xác nhận ở dưới luôn nhìn thấy. Hủy trở về nguyên form ban đầu. Đổi VI/EN/JA giữ bản đang nhập; nhãn UI được dịch, địa chỉ người dùng nhập không tự dịch.

### Tránh ghép địa chỉ mới với tọa độ cũ

- Tách **chuỗi đang tìm**, **điểm đã chọn** và **mô tả sẽ lưu**. Gõ truy vấn mới làm lựa chọn chưa xác nhận; phải chọn lại kết quả/ghim trước khi dùng.
- Sửa tầng/phòng/ngõ trong mô tả điểm đã chọn không di chuyển ghim; bấm Tìm địa chỉ khác mới bắt đầu lượt tìm mới.
- Chỉ tìm được phố/phường: ghi rõ gần đúng và yêu cầu kiểm ghim, không coi đó là đúng số nhà.
- Không có kết quả: giữ chữ đã nhập và chuyển sang chọn ghim. Có điểm nhưng tra ngược rỗng/lỗi: giữ điểm, cho nhập địa chỉ thủ công rồi xác nhận.
- Offline/map lỗi: giữ form và địa chỉ đã lưu. Nếu chưa có tọa độ thì không báo thành công chỉ với chữ; có thể giữ nhập tọa độ ở mục nâng cao làm dự phòng.
- Hủy yêu cầu cũ và bỏ phản hồi đến muộn; gợi ý/tra ngược chỉ được cập nhật đúng lượt tìm và điểm hiện tại.

## 3. Phương án nhà cung cấp

**Hướng thử đã chốt: MapLibre + Geoapify**, thử local trong gói Free trước, chưa bật billing. MapLibre vẽ bản đồ, Geoapify cung cấp nền bản đồ và tra địa chỉ. Free hiện có 3.000 credits/ngày, tối đa 5 yêu cầu/giây, không cần thẻ; cho dùng thương mại trong hạn mức và phải ghi nguồn. Hạn mức ngày là dạng mềm, không coi đó là cơ chế tự chặn tiêu thụ. [Giá và điều kiện](https://www.geoapify.com/pricing/).

| API Geoapify | Dùng khi nào |
|---|---|
| Style/Map Tiles | Mở/kéo/zoom bản đồ qua MapLibre; 0,25 credit/tile. [Map Tiles](https://apidocs.geoapify.com/docs/maps/map-tiles/) |
| `GET /v1/geocode/autocomplete` | Sau khi dừng gõ; lọc quốc gia, ưu tiên gần điểm đang xem, ngôn ngữ, giới hạn kết quả. [Autocomplete](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/) |
| `GET /v1/geocode/search` | Bấm Tìm với chuỗi đầy đủ; không gọi lại nếu gợi ý đã đủ tọa độ. [Geocoding](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/) |
| `GET /v1/geocode/reverse` | Sau khi dừng kéo/chạm hoặc lấy GPS; trả địa chỉ gần điểm để kiểm lại. [Reverse geocoding](https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/) |

Ba API tra địa chỉ hiện tính 1 credit/yêu cầu. Tham số triển khai đề xuất để đo/chỉnh: tối thiểu 3 ký tự, chờ 400 ms sau khi dừng gõ, tối đa 5 gợi ý; chỉ tra ngược khi dừng kéo. Không cần Places/Place Details hoặc routing nếu API trên đủ chọn địa chỉ.

**Phương án dự phòng chưa chọn: Google Maps + Places + Geocoding.** Có nhóm API tương ứng; cần billing, quota theo dịch vụ và kiểm điều kiện lưu lâu dài địa chỉ. Nếu chọn Google thì thiết kế đồng bộ map và tra địa chỉ: kết quả Places hiển thị trên bản đồ phải dùng Google Map, không mặc định ghép Google Places lên MapLibre. Chất lượng địa chỉ Việt Nam của cả hai phương án phải thử cùng bộ mẫu. [Bảng giá](https://developers.google.com/maps/billing-and-pricing/pricing), [billing Maps SDK](https://developers.google.com/maps/documentation/android-sdk/usage-and-billing), [chính sách Places](https://developers.google.com/maps/documentation/places/web-service/policies).

Không dùng Nominatim công cộng cho autocomplete vì chính sách cấm. [Nguồn chính thức](https://operations.osmfoundation.org/policies/nominatim/). Nếu A không đạt chất lượng, báo kết quả rồi chọn lại provider trước khi mở chi phí.

## 4. App, API và dữ liệu

Luồng chung: **màn đang sửa → bộ chọn → API dự án → Geoapify → gợi ý → người dùng xác nhận → form ban đầu → API lưu hiện có → DB**. Bản đồ tải style/tiles theo cấu hình riêng, không gửi token dự án tới provider.

| Lớp | Vị trí dự kiến, chưa có code | Trách nhiệm |
|---|---|---|
| Bộ chọn | `apps/mobile/src/features/location/{models,api,state,components,screens}` | Bản nháp, tìm/ghim/GPS, hủy/xác nhận, lỗi dạng mã; dùng chung 4 nơi |
| Bản đồ từng nền tảng | `LocationMap.native.tsx`, `LocationMap.web.tsx` trong feature trên | MapLibre React Native trên Android/iOS, MapLibre GL JS cho Expo web kiểm thử; chung input/output, không chuyển app sang WebView |
| API địa điểm | `services/api/src/modules/locations/` | Kiểm input, timeout/hạn mức, chuẩn hóa phản hồi; không lưu lịch sử tìm |
| Adapter provider | `services/api/src/integrations/maps/geoapify.ts` | Kết nối hostname cố định, chuyển dữ liệu provider; không nhận URL tùy ý từ client |
| Lưu DB | Dùng API addresses/locations/service-areas hiện có | Backend kiểm quyền/version/idempotency; UI không gọi DB |

Không thêm framework, package chung hoặc microservice riêng. [MapLibre](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/) có yêu cầu React Native/new architecture; [Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/) cần plugin và rebuild native. Đạt phiên bản tối thiểu chưa chứng minh tương thích bộ Expo/RN của repo; phải build/thử cả hai nền tảng trước khi nối tất cả form.

### Contract dự kiến cần duyệt trước code

| API dự án | Body | Kết quả |
|---|---|---|
| `POST /v1/locations/autocomplete` | `{ text, locale, bias? }` | `{ items: [{ id, text, point, precision }], attribution }` |
| `POST /v1/locations/geocode` | `{ text, locale, bias? }` | Cùng dạng danh sách; người dùng chọn, không tự lấy dòng đầu |
| `POST /v1/locations/reverse` | `{ point, locale }` | `{ address: { text, point, precision } hoặc null, attribution }`; point chuẩn hóa giữ tọa độ đầu vào |

Đây là endpoint nội bộ dự kiến, khác GET của provider. Dùng body tránh địa chỉ nằm trong query access log; logger cũng không được ghi body hoặc URL provider chứa key. `id` gợi ý dùng tạm trong phiên chọn; `precision` chỉ mức gần đúng, không phải xác minh địa chỉ.

Tìm dịch vụ hiện công khai: đề xuất cho khách chưa login tra địa chỉ với rate limit theo IP/phiên ẩn danh và tổng hệ thống; đã login có hạn mức theo tài khoản. Lỗi chuẩn gồm input sai, quá hạn mức/kèm thời gian thử lại, timeout và provider thiếu cấu hình/không sẵn sàng. Bổ sung OpenAPI, giới hạn độ dài truy vấn và kiểm lạm dụng trước mở endpoint.

Bộ chọn trả `{ text, point: { latitude, longitude }, source }`; `source` chỉ ở state app. API lưu giữ `{ text, point }`, không cần migration provider ID/lịch sử GPS trong phạm vi này. Chuyển GeoJSON `[longitude, latitude]` đúng ranh giới thư viện. Không dùng tọa độ giả hoặc mặc định Hà Nội làm điểm người dùng đã xác nhận. PostGIS vẫn quyết định người cung cấp nào phù hợp.

## 5. Khóa, hạn mức và dữ liệu riêng

Khóa geocode ở server; khóa style/tiles trên app có thể bị trích xuất, cần tách môi trường/dịch vụ nếu provider hỗ trợ và kiểm giới hạn thực tế trên native. Giới hạn web origin không bảo vệ đủ native. `EXPO_PUBLIC_*` không phải bí mật. Nếu cơ chế hạn chế key chưa đủ, ghi rõ giới hạn pilot trước phát hành, không tự dựng proxy tile để né điều khoản.

Đếm autocomplete/geocode/reverse và đối chiếu dashboard cả tile tải trực tiếp; chỉ đo backend sẽ thiếu tile. Có công tắc tắt provider, timeout/retry có giới hạn; 429 không thử liên tục. Cache theo điều khoản từng API, khóa có ngôn ngữ/vùng/truy vấn; không cache chung lâu dài địa chỉ riêng hoặc ghi vào log phân tích.

Ước tính **minh họa, chưa đo**: 4 gợi ý + 1 tra ngược + 20 tiles = 10 credits/lượt; 3.000 credits tương đương khoảng 300 lượt kiểu này/ngày, không phải cam kết 300 người dùng. Zoom/kéo/retry có thể tăng nhiều. Trước tích hợp phải kiểm quyền lưu lâu dài kết quả geocode vào sổ địa chỉ/cửa hàng theo điều khoản, không suy rộng quyền cache của API khác.

Giải thích ngắn trên app rằng tìm địa chỉ/chọn ghim gửi truy vấn/tọa độ tới provider; không gửi nhãn Nhà, số điện thoại, token hoặc toàn hồ sơ. Địa chỉ riêng chỉ người có quyền được đọc. Không tự biến tâm vùng thợ thành vị trí thời gian thực công khai.

## 6. Các bước trong một đợt trước P0-2

| Bước | Công việc và phụ thuộc | Điều kiện chuyển bước |
|---|---|---|
| 1. Thử provider | Dùng Geoapify Free đã chọn, cần key local hợp lệ; kiểm lưu dữ liệu/ghi nguồn/hạn chế key. Thử 30 địa chỉ công khai ở Việt Nam: số nhà, ngõ, không dấu, trùng tên, chung cư, vùng ven; bắt đầu Hà Nội theo DEMO | Lưu từng mẫu/kết quả; đề xuất ít nhất 24/30 có gợi ý đúng khu vực trong 5 dòng, còn lại sửa ghim được; không ca âm thầm xác nhận sai. Không đạt thì chọn lại provider |
| 2. Khóa thiết kế/contract | Duyệt API/luồng, đối chiếu spec hiện hành; đồng bộ tài liệu chịu ảnh hưởng theo AGENTS khi đã chốt | OpenAPI, lỗi, quyền, dữ liệu và tiêu chí cùng phạm vi; ưu tiên không tự duyệt provider/cost |
| 3. SDK và adapter | Build MapLibre + vị trí Android/iOS development build, thử Expo web; API adapter và test input/timeout/quota | Map thật và ghi nguồn trên ba nền tảng; live provider có bằng chứng riêng với CI dùng giả lập |
| 4. Bộ chọn và tìm dịch vụ | Gợi ý, tìm cả chuỗi, ghim/tra ngược, GPS, địa chỉ lưu; nối SearchScreen | Không phải nhập tọa độ; PostGIS đổi kết quả theo điểm xác nhận; đổi điểm reset phân trang |
| 5. Lưu địa chỉ và hồ sơ | Nối cùng bộ chọn vào sổ địa chỉ, cửa hàng, tâm vùng; vòng tròn vùng và điểm cửa hàng public | Lưu/đóng/mở còn đúng điểm; Hủy không đổi form; quyền/version/retry giữ đúng |
| 6. Bàn giao trọn đợt | DB/API/app/web/native, lỗi/retry, VI/EN/JA; báo cáo `B03-01-chon-dia-diem-va-ban-do.md` có Mermaid đã render và ảnh app DEMO | Tick phần đã kiểm; phân biệt live provider/local/emulator/simulator/CI/UAT; sau đó tiếp P0-2 |

Chờ key/provider thì tiếp tục phần độc lập đã được phép trong MAP-01, không chuyển sang tiện ích tài khoản khác. P0-2 nhận điểm đã xác nhận và snapshot địa chỉ theo contract công việc sau này; MAP-01 không tự tạo contract thuê mới.

## 7. Kiểm thử và điều kiện hoàn thành

- Nhập có dấu/không dấu, tên trùng/rỗng; chọn gợi ý rồi chỉnh ghim; chọn map rồi sửa mô tả. Hai cách trả cùng dạng và lưu đúng tọa độ.
- Gõ/kéo liên tục, phản hồi đảo thứ tự, thoát/đổi tài khoản/ngôn ngữ khi đang tải: không ghi đè điểm mới, không rò địa chỉ riêng, Hủy không đổi form.
- GPS từ chối/không hỏi lại được, độ chính xác thấp, vị trí cũ, timeout/tắt dịch vụ: vẫn chọn thủ công. Web kiểm quyền trong ngữ cảnh trình duyệt hỗ trợ.
- Offline, 429/5xx, key thiếu/sai, tile lỗi nhưng tra cứu còn hoạt động và ngược lại: giữ form, lỗi rõ, không báo thành công giả.
- PostGIS ở ranh giới bán kính; tọa độ âm, 0 hợp lệ, ngoài khoảng, NaN/đảo lat-lng; đổi vùng/cửa hàng đổi kết quả đúng.
- Hai tài khoản không xem/sửa địa chỉ riêng nhau; `public=false` và tâm vùng không rò qua API public. Retry không nhân đôi, xung đột version không ghi đè.
- Android emulator, iOS simulator và Expo web đi hết 4 nơi; kiểm bàn phím/nút xác nhận/kéo/zoom/chữ lớn/VI-EN-JA. Thiết bị thật và UAT ghi riêng.
- Unit/integration/web CI dùng fixture provider, không tiêu key thật; live map/geocode và credit được kiểm riêng. Báo cáo chụp màn gợi ý, ghim, vùng tròn, địa chỉ lưu và từ chối GPS, không có key/token/dữ liệu riêng.

Không tính hoàn tất toàn B03-01: bản đồ người cung cấp/gom ghim, polygon, ranking còn ngoài đợt. Chưa chỉ đường/ETA đường bộ, theo dõi thợ, tải vùng offline hoặc OTP. Khoảng cách PostGIS không phải thời gian di chuyển.

## 8. Quyết định đã chốt và phần còn cần duyệt

1. **Đã chốt provider/budget thử nghiệm:** MapLibre + Geoapify Free, chưa bật billing. Cần tài khoản/key do chủ dự án quản lý khi bắt đầu thử live; không gửi key vào Git hoặc nội dung báo cáo. Nếu chất lượng không đạt, báo kết quả trước khi chọn lại provider; chưa duyệt Google/gói trả phí.
2. **Phạm vi theo hướng đã chọn:** bộ chọn chung 4 nơi với gợi ý địa chỉ, ghim và GPS một lần. Đề xuất kèm vòng tròn vùng và điểm cửa hàng public; bản đồ toàn bộ người cung cấp để sau. Việt Nam là vùng thử đề xuất, không đổi phạm vi thị trường hiện hành.
3. **Contract/UX:** ba endpoint, khách chưa login có hạn mức, quy tắc điểm/mô tả và dự phòng. Sau duyệt mới đồng bộ spec/API/QA theo phạm vi ảnh hưởng rồi triển khai.

Yêu cầu hiện tại đủ để ghi kế hoạch, đổi thứ tự, ghi lựa chọn thử Geoapify Free và push P0-1; chưa phải quyết định chọn dịch vụ trả phí hoặc tự tạo tài khoản provider. Đợt này bàn giao kế hoạch; chưa cài SDK, gọi API provider hoặc thay contract nghiệp vụ.
