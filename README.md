# Hệ Thống Thông Tin Quản Lý — Quán Nhậu Tự Do

Hệ thống thông tin quản lý toàn diện cho mô hình nhà hàng / quán nhậu ẩm thực (Nghiên cứu trường hợp: **Quán Nhậu Tự Do - 505 Minh Khai, Hai Bà Trưng, Hà Nội**).

Đề tài bao gồm trọn bộ:
1. **Mã nguồn ứng dụng Web quản lý chạy trực tiếp trên trình duyệt** (HTML5, CSS3, JavaScript Vanilla).
2. **Bộ sơ đồ phân tích nghiệp vụ chuẩn:** BFD (Sơ đồ phân rã chức năng) và IFD (Sơ đồ luồng thông tin 7 trang).
3. **Báo cáo Phân tích Thiết kế Hệ thống Thông tin Quản lý (PTHTTTQL)** chi tiết dạng Word (.docx) và PDF.

---

## 🌟 Các Phân Hệ Chức Năng Chính

Hệ thống được thiết kế theo luồng quy trình thực tế từ tiếp đón khách hàng, phục vụ tại bàn, điều phối bếp đến hậu cần kho bãi và giao vận:

### 1. Phân hệ Vận hành & Phục vụ (Front-of-House)
- **Sơ đồ bàn & Đặt bàn:** Theo dõi trạng thái bàn (Trống, Đang phục vụ, Đã đặt trước), đặt bàn theo thời gian và số lượng khách.
- **Quản lý Đơn hàng (Order):** Nhân viên phục vụ tạo và cập nhật order theo bàn với danh mục món ăn phong phú (Món nướng, món xào, khai vị, hải sản, bia Tự Do...).
- **Màn hình điều phối Bếp (Kitchen Bar / KDS):** Tiếp nhận thông tin order tức thời, cập nhật trạng thái chế biến (Đang làm, Hoàn thành).
- **Thanh toán & Hóa đơn (Invoices):** Tự động tính toán tổng tiền, áp dụng chương trình khuyến mãi / Voucher giảm giá, in hóa đơn thanh toán.

### 2. Phân hệ Hậu cần & Kho bãi (Back-of-House)
- **Quản lý Thực đơn (Foods):** Cập nhật giá bán, trạng thái còn món/hết món.
- **Quản lý Nguyên vật liệu (Ingredients):** Theo dõi số lượng tồn, đơn vị tính, định mức tồn an toàn.
- **Nhà cung cấp (Suppliers):** Quản lý đối tác cung ứng thực phẩm tươi sống, bia nước ngọt từ các vùng miền.
- **Nhập kho (Inventory Receipts):** Lập phiếu nhập kho nguyên liệu, tính toán giá trị nhập hàng.

### 3. Phân hệ Nhân sự & Giao vận
- **Quản lý Nhân sự (Employees):** Phân chia vai trò rõ ràng (Quản lý, Thu ngân, Bếp, Phục vụ, Tài xế).
- **Đội xe & Giao hàng (Delivery):** Quản lý phương tiện giao vận và đơn hàng mang đi / giao tận nơi.

### 4. Báo cáo & Thống kê Quản trị
- **Báo cáo Doanh thu:** Thống kê doanh thu theo mốc thời gian, món ăn bán chạy nhất, phân tích cơ cấu doanh số.

---

## 📁 Cấu Trúc Thư Mục Repository

```text
ptht/
├── index.html                 # Giao diện chính hệ thống quản lý Quán Nhậu Tự Do
├── style.css                  # Toàn bộ CSS phong cách thương hiệu quán nhậu (Be Vietnam Pro, tone vàng/xanh đậm)
├── app.js                     # Toàn bộ logic tương tác, dữ liệu mẫu và điều khiển giao diện
├── admin_avatar.png           # Avatar tài khoản quản trị
├── background.jpg             # Ảnh nền nhà hàng
├── docs/                      # Tài liệu học phần & báo cáo PTHTTTQL
│   ├── PTHTTTQL_Quán Nhậu Tự Do.docx   # Bản báo cáo nghiên cứu hoàn chỉnh (.docx)
│   ├── PTHTTTQL_Quán Nhậu Tự Do.pdf    # Bản báo cáo xuất định dạng (.pdf)
│   └── diagrams/              # Thư mục sơ đồ phân tích nghiệp vụ
│       ├── BFD_quannhautudo.png        # Sơ đồ phân rã chức năng (BFD)
│       ├── IFD_Trang_1.png             # Sơ đồ luồng thông tin IFD Trang 1
│       ├── IFD_Trang_2.png             # Sơ đồ luồng thông tin IFD Trang 2
│       ├── IFD_Trang_3.png             # Sơ đồ luồng thông tin IFD Trang 3
│       ├── IFD_Trang_4.png             # Sơ đồ luồng thông tin IFD Trang 4
│       ├── IFD_Trang_5.png             # Sơ đồ luồng thông tin IFD Trang 5
│       ├── IFD_Trang_6.png             # Sơ đồ luồng thông tin IFD Trang 6
│       └── PTHTTT_Trang_7.png          # Sơ đồ luồng thông tin IFD Trang 7
├── .gitignore
└── README.md
```

---

## 🚀 Hướng Dẫn Chạy Thử Ứng Dụng

Ứng dụng web được xây dựng độc lập, không yêu cầu cài đặt môi trường phức tạp hay `npm install`:

1. **Chạy trực tiếp từ máy cá nhân:**
   - Mở file `index.html` bằng bất kỳ trình duyệt web nào (Chrome, Edge, Firefox, Safari).
   - Đăng nhập hệ thống bằng tài khoản mặc định:
     - **Tên đăng nhập:** `admin`
     - **Mật khẩu:** `123456` (hoặc bấm trực tiếp nút Đăng nhập)

2. **Chạy qua GitHub Pages:**
   - Truy cập vào mục **Settings** của repository trên GitHub.
   - Chọn mục **Pages** ở thanh menu bên trái.
   - Tại phần **Branch**, chọn `main` (hoặc `master`) và thư mục `/(root)`, sau đó bấm **Save**.
   - Sau 1-2 phút, web sẽ được xuất bản live tại địa chỉ: `https://lha08082006.github.io/ptht/`.
