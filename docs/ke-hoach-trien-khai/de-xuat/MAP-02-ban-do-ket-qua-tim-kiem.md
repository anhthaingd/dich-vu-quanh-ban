# MAP-02 — Ghim người cung cấp trong kết quả tìm kiếm

07/10/2026 · DELIVERY-01, chỉ repo. Chủ dự án đã chốt: **chỉ ghim địa điểm công khai; người chưa có điểm công khai vẫn hiện trong danh sách**. Triển khai sau MAP-01, trước P0-2. Giữ MapLibre + Geoapify Free, chưa billing/production.

## Phạm vi đã triển khai

Khách chọn điểm cần dịch vụ, tìm, chuyển Danh sách/Bản đồ trên cùng kết quả đã tải. Ghim xanh dương là địa điểm public, chấm xanh lá là điểm tìm. Bấm ghim hiện tên, địa chỉ và nút hồ sơ. Tọa độ trùng dùng chung ghim nhưng mở được từng hồ sơ; người không có ghim ở danh sách bên dưới. Xem thêm tiếp tục cursor và bổ sung ghim. Lỗi bản đồ cho thử lại hoặc chuyển danh sách.

GET `/v1/partners` thêm `PartnerCard.map_location`: Address `{text, point}` hoặc `null`, bắt buộc trong OpenAPI v0.1.8. Backend chọn địa điểm active/public gần nhất trong bán kính tìm, hòa khoảng cách theo created_at/id. Không có điểm thì vẫn giữ kết quả. Giữ điều kiện công bố/nhận việc/kiểm duyệt, bộ lọc, ranking và cursor. Khoảng cách xếp hạng có thể đến tâm vùng, không gắn nó vào ghim. Không migration hoặc công khai tâm vùng.

## Tiêu chí và bằng chứng

1. DB/API: không lộ private/inactive/tâm vùng; nhiều điểm chọn đúng; thiếu điểm không mất người. Integration và contract đã kiểm.
2. App: chuyển cách xem, chọn ghim/hồ sơ, trùng điểm, đổi tọa độ, lỗi/thử lại, cảnh báo còn trang. Mobile unit/UI và web E2E đã kiểm.
3. Web/native: nền Geoapify thật, ảnh DEMO và phạm vi từng nền tảng trong [B03-02](../bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md); không suy ra thiết bị thật/UAT.
4. Đồng bộ spec trong phạm vi contract, Excel v1.46, bản hiện hành và Drive cùng ID. DOC-017 giữ nguyên theo giới hạn auto-review; nguồn/HTML/ZIP kiến trúc hiện hành có MAP-02. Báo cáo/checklist/ảnh chỉ Git.

## Ngoài phạm vi

GPS theo dõi thợ, routing, ETA, polygon, gom cụm theo zoom, billing và production. Thợ chưa khai báo điểm public không có ghim; đây là hành vi đã chốt, không dùng tâm vùng thay thế.

Nguồn: [SearchService](../../../services/api/src/modules/search/search.service.ts), [SearchScreen](../../../apps/mobile/src/features/search/screens/SearchScreen.tsx), [OpenAPI](../../technical-design/openapi.json), [báo cáo](../bao-cao/B03-02-ban-do-ket-qua-tim-kiem.md).
