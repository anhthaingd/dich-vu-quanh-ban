# Thư viện và plugin cho UI — khảo sát 23/09/2026

Mục tiêu: giao diện dịch vụ gần người dùng, đọc nhanh, rõ chi phí và mức xác minh. Cập nhật v0.2: chủ dự án đã chọn React + Storybook và hướng Dịch vụ khu phố; thư viện khác dưới đây vẫn là lựa chọn tham khảo, không tự đổi stack. Nghiên cứu giao diện Taskrabbit, Urban Company, Airbnb Services và kết quả áp dụng nằm trong [ui-direction-v0.2.md](ui-direction-v0.2.md).

| Công cụ | Nguồn chính | Chi phí / giấy phép | Phù hợp |
|---|---|---|---|
| shadcn/ui | https://github.com/shadcn-ui/ui | MIT; kiểm tra riêng block bên thứ ba | Sở hữu mã component, tùy biến sâu. Tránh dùng nguyên template dashboard. |
| shadcn MCP | https://ui.shadcn.com/docs/mcp | Công cụ mã nguồn mở; registry trả phí có thể có điều kiện riêng | Tra cứu và thêm component; chưa cài vào cấu hình Codex. |
| Radix Primitives | https://github.com/radix-ui/primitives | MIT | Dialog, menu, focus và thao tác bàn phím. Bản thử dùng Dialog. |
| React Aria | https://github.com/adobe/react-spectrum | Apache-2.0 | Component không áp phong cách, hỗ trợ accessibility; phù hợp khi đầu tư hệ thống riêng. |
| Mantine | https://github.com/mantinedev/mantine | MIT | Nhiều form, bảng, control cho admin; không cần cài đồng thời với mọi thư viện khác. |
| Lucide | https://github.com/lucide-icons/lucide | ISC | Icon nhất quán, rõ nghĩa. Bản React đang sử dụng. |
| Storybook + addon a11y | https://storybook.js.org/ | MIT | Xem component/trạng thái và hỗ trợ kiểm tra; không tự quyết định thẩm mỹ. |
| Penpot Libraries & Templates | https://penpot.app/libraries-templates | Kiểm tra giấy phép từng bộ | Trong dự án đã thấy Pencil Design System, token starter kit, wireframe library và Lucide. Chưa nhập thư viện ngoài. |
| Penpot MCP | https://help.penpot.app/mcp/ | Mã nguồn mở; cần kết nối tài khoản/file | Đọc/sửa thiết kế native. Hiện chưa cấu hình MCP, bản thử được nhập qua UI. |

Danh mục plugin Codex đã được tìm với Penpot/UI design: trả Figma, Canva, Adobe Express, Webflow; không tìm thấy plugin Penpot. Canva/Adobe Express hợp asset marketing hơn luồng nghiệp vụ; chưa cài thêm plugin nào.

## Chọn cho dự án

Đề xuất React + CSS token riêng + Radix (hoặc React Aria, chọn một hướng) + Lucide + Storybook. Cân nhắc Mantine riêng cho admin khi cần tốc độ. shadcn/ui là lựa chọn khởi đầu component, không phải phong cách mặc định phải giữ.

Để tránh cảm giác giao diện AI: tên dịch vụ và giá thật khi ra mắt; không dùng số liệu quảng cáo giả; không có gradient trang trí, thẻ thống kê vô nghĩa hay lời hứa chất lượng. Bản thử ghi rõ dữ liệu minh họa. Đánh giá, xác minh, khoảng cách và giá tham khảo có vị trí ổn định. Không biến mọi nút thành hành động cùng độ nổi bật.
