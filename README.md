# Hệ Thống Thông Tin Quản Lý — Quán Nhậu Tự Do

Hệ thống thông tin quản lý toàn diện cho mô hình nhà hàng / quán nhậu ẩm thực (Nghiên cứu trường hợp: **Quán Nhậu Tự Do - 505 Minh Khai, Hai Bà Trưng, Hà Nội**).

Đề tài bao gồm trọn bộ:
1. **Mã nguồn ứng dụng Web quản lý chạy trực tiếp trên trình duyệt** (HTML5, CSS3, JavaScript thuần — không cần cài đặt, chạy được cả khi không có mạng).
2. **Bộ sơ đồ phân tích nghiệp vụ chuẩn:** BFD (Sơ đồ phân rã chức năng) và IFD (Sơ đồ luồng thông tin 7 trang).
3. **Báo cáo Phân tích Thiết kế Hệ thống Thông tin Quản lý (PTHTTTQL)** chi tiết dạng Word (.docx) và PDF.

---

## 🌟 Các Phân Hệ Chức Năng Chính

Hệ thống được thiết kế theo luồng quy trình thực tế từ tiếp đón khách hàng, phục vụ tại bàn, điều phối bếp đến hậu cần kho bãi và xe đưa đón (menu bên trái của web chia đúng theo các phân hệ này):

### 0. Tổng quan & tiện ích chung
- **Thẻ "Hôm nay":** doanh thu đã thu trong ngày, so với **cùng giờ hôm qua** (không so với cả ngày hôm qua), biểu đồ 7 ngày gần nhất.
- **Việc cần xử lý** (trên trang Tổng quan và ở nút chuông): đơn bếp mới, đặt bàn chờ xác nhận, nguyên liệu sắp hết, yêu cầu đưa đón cần giao xe hoặc đã lỡ giờ đón, khách đặt sắp đến, hóa đơn chờ thanh toán, chuyến xe đang chạy — bấm vào là mở đúng trang.
- **Lưu dữ liệu ngay trong trình duyệt:** tải lại trang (F5) hay tắt mở lại vẫn còn dữ liệu và không bị đăng xuất; nút **Khôi phục dữ liệu mẫu** để làm lại từ đầu. Dữ liệu mẫu chưa ai sửa mà mở lại vào ngày hôm sau sẽ tự tạo lại theo ngày mới; dữ liệu đã sửa thì giữ nguyên và lúc đăng nhập web báo rõ dữ liệu được lưu lúc nào.
- **Tìm kiếm không cần gõ dấu** ở mọi danh sách (khách hàng, nhân viên, đặt bàn, món, hóa đơn, voucher, nguyên liệu, nhà cung cấp, phiếu kho, xe).
- **Dữ liệu dùng lâu không làm chậm web:** bảng dài (hóa đơn, phiếu kho…) hiện 50 dòng đầu kèm nút **Xem thêm**; bếp chỉ hiện đơn hoàn thành trong ngày; lịch đặt bàn đã qua xuống cuối danh sách và gắn nhãn *Quá hạn*.
- **Điện thoại:** menu trượt, bảng tự cuộn ngang, thanh giỏ hàng nổi ở trang Gọi món.

### 1. Quản lý khách hàng
- **Thông tin khách hàng:** Thêm, sửa, xóa, tìm kiếm (không cần gõ dấu) theo tên, SĐT hoặc hạng; mỗi khách có **số lần đến, tổng chi tiêu, lần gần nhất** và **hạng khách hàng** theo tổng chi tiêu (Thường / Bạc từ 1 triệu / Vàng từ 3 triệu / Kim cương từ 10 triệu), kèm số tiền còn thiếu để lên hạng. Ô chọn khách khi gọi món ghi hạng để nhận ra khách quen.

### 2. Quản lý nhân viên
- **Nhân viên:** Phân chia vai trò (Quản lý, Thu ngân, Bếp, Phục vụ, Tài xế); **hiệu suất làm việc**: số hóa đơn phục vụ và doanh thu phục vụ, số chuyến xe (tài xế), số phiếu kho đã lập.

### 3. Quản lý bán hàng
- **Đặt bàn:** Tạo đặt bàn theo ngày giờ và số khách; danh sách bàn chọn được lọc theo **đúng ngày giờ đặt** (đủ chỗ, không trùng lịch đặt khác trong khoảng 3 giờ). Xác nhận tự gán bàn nhỏ nhất phù hợp; hủy; **check-in khi khách đến** (bàn chuyển *Đang dùng*, mở luôn trang Gọi món với bàn và khách đã chọn sẵn); **mã QR thật**, quét được bằng điện thoại; quá giờ hẹn 3 tiếng hoặc qua ngày mà khách chưa đến thì *Quá hạn*; lọc theo trạng thái.
- **Quản lý bàn:** Sơ đồ bàn theo khu (Tầng 1, Tầng 2, Sân vườn) với trạng thái Trống / Đã đặt / Đang dùng. Bàn chỉ *Đã đặt* khi có lịch đặt **hôm nay** (bấm vào để check-in khách); lịch của ngày khác chỉ ghi chú dưới bàn, bàn vẫn dùng được hôm nay.
- **Món ăn / Thực đơn:** Cập nhật giá bán, danh mục, trạng thái còn món / hết món; **định mức nguyên liệu cho 1 phần** (ví dụ nầm nướng: 0,3 kg nầm sữa bò + 0,05 kg rau), từ đó tự tính **giá vốn, lãi gộp** và **số phần còn làm được** theo tồn kho (ghi rõ nguyên liệu đang giới hạn).
- **Gọi món:** Chọn bàn, khách, nhân viên phục vụ, voucher; thêm món vào đơn và gửi xuống bếp, đồng thời tạo hóa đơn. Thẻ món báo *Còn N phần* / *Hết nguyên liệu* theo định mức, không cho gọi vượt tồn kho; **gửi đơn là tự trừ kho** theo định mức (sinh phiếu xuất bán gắn mã hóa đơn) và cảnh báo nguyên liệu vừa chạm định mức tối thiểu. **Gọi thêm món** cho bàn đang có hóa đơn: món mới được cộng vào chính hóa đơn đó (không tách hóa đơn), bếp nhận phiếu có nhãn *Gọi thêm*. Gọi món ở bàn đang giữ cho lịch đặt hôm nay → hỏi có phải khách đã đặt không để check-in luôn.
- **Hóa đơn & thanh toán:** Tự động tính tiền, áp dụng voucher, xem chi tiết hóa đơn, thanh toán bằng Tiền mặt / Chuyển khoản / VNPay / MoMo (lưu mã giao dịch), **in hóa đơn** (chỉ in tờ hóa đơn, không in menu).
- **Voucher:** Quản lý mã giảm giá theo % và số lượt còn lại.

### 4. Quản lý nhà bếp
- **Công việc bếp (Kanban):** Đơn mới → Đang chế biến → Hoàn thành hôm nay. Phiếu còn ở *Đơn mới* có thể **hủy món** (khách đổi ý, gọi nhầm): món bị bỏ khỏi hóa đơn, nguyên liệu được hoàn kho đúng lượng đã xuất; hóa đơn hết món thì thành *Đã hủy*, trả lượt voucher và trả bàn.

### 5. Quản lý kho hàng
- **Định mức BOM (định mức nguyên vật liệu):** trang riêng cho định mức của mọi món — mỗi dòng có định mức tịnh, **tỷ lệ hao hụt** khi sơ chế và **định mức gộp** (lượng thật sự xuất kho = tịnh × (1 + hao hụt)), đơn giá, thành tiền, tỷ trọng trong giá vốn. Ba chế độ xem: *Theo món*, *Theo nguyên liệu* (tra ngược nguyên liệu dùng cho món nào, tồn hiện tại đủ làm bao nhiêu phần), *Định mức – thực tế* (theo kỳ: tồn đầu, nhập, xuất theo định mức, xuất tay, chênh lệch kiểm kê, tồn cuối, phần vượt định mức = thất thoát). Biểu đồ biên lãi gộp theo món; sửa định mức ngay trên trang; **xuất Excel (.xlsx)** 3 sheet.
- **Kiểm kê kho:** nhập số lượng đếm thực tế của từng nguyên liệu; dòng lệch sổ sách tự sinh phiếu điều chỉnh (thừa / thiếu) để tồn kho khớp thực tế và được tính vào báo cáo đối chiếu định mức.
- **Nguyên liệu:** Đơn vị tính, đơn giá, nhà cung cấp, tồn kho và **định mức tồn tối thiểu riêng từng nguyên liệu** (5 kg tôm khác 120 lon bia): *Sắp hết* khi tồn ≤ định mức, *Trung bình* khi tồn ≤ 2 × định mức; gợi ý số lượng nên nhập thêm; ghi rõ nguyên liệu đang dùng cho bao nhiêu món.
- **Nhà cung cấp:** Đối tác cung ứng thực phẩm tươi sống, bia, nước ngọt.
- **Nhập / xuất kho:** Lập phiếu nhập (nhập **đơn giá nhập thực tế**; giá mới thành đơn giá của nguyên liệu để tính giá vốn món) hoặc xuất (nhận số lẻ như 2,5 kg, có ô ghi chú); tồn kho chỉ thay đổi qua phiếu (tồn = tổng nhập − tổng xuất). Lọc theo *Nhập kho* / *Xuất tay* (hủy hàng, dùng nội bộ) / *Xuất bán* (tự động theo định mức gộp khi gửi bếp) / *Kiểm kê* (phiếu điều chỉnh).

### 6. Xe đưa đón khách
- **Quản lý xe:** Biển số, loại xe, số chỗ, trạng thái.
- **Yêu cầu đưa đón:** Tạo yêu cầu (bắt buộc giờ đón, điền sẵn khoảng 30 phút nữa, không nhận giờ đã qua), giao xe (xe sẵn sàng nhỏ nhất đủ chỗ + tài xế đang rảnh) **trong vòng 3 giờ trước giờ đón** để xe không bị giữ quá sớm, trễ giờ đón thì ghi *Trễ N phút*, quá giờ đón hơn 1 giờ mà chưa có xe thì chuyển *Quá giờ đón* và chỉ còn hủy; **hủy yêu cầu** khi khách báo không cần đón, theo dõi chuyến xe (ghi rõ ngày khi không phải hôm nay), **hoàn tất chuyến** (xe về *Sẵn sàng*, tài xế rảnh để nhận chuyến khác).

### 7. Báo cáo - Thống kê
- **Báo cáo tài chính:** Doanh thu theo khoảng ngày, **tính theo ngày thanh toán** (hóa đơn lập hôm qua nhưng trả hôm nay được tính vào hôm nay; bảng ghi cả Ngày lập và Ngày TT); **lãi gộp = doanh thu − giá vốn** (giá vốn chốt lúc bán); biểu đồ tự gom theo ngày (≤ 31 ngày), tuần hoặc tháng khi chọn khoảng dài; tỷ lệ thanh toán, phương thức thanh toán, nguyên liệu tiêu thụ (theo phiếu xuất kho), chi tiết hóa đơn.
- **Báo cáo món bán chạy:** Xếp hạng theo số phần, lãi gộp từng món, doanh thu theo danh mục và theo món.
- **Báo cáo hàng hóa & tồn kho:** Tồn kho so với định mức của từng nguyên liệu, giá trị tồn kho, lịch sử nhập / xuất, chi tiết tồn từng nguyên liệu kèm gợi ý số lượng cần nhập.

---

## 📁 Cấu Trúc Thư Mục Repository

```text
ptht/
├── index.html                  # Giao diện chính (19 trang + các hộp thoại)
├── css/
│   ├── tokens.css              # Màu thương hiệu (xanh đậm / vàng), cỡ chữ, khoảng cách, bo góc
│   ├── base.css                # Reset, chữ, tiện ích dùng chung
│   ├── layout.css              # Trang đăng nhập, sidebar, thanh trên cùng, bố cục trang
│   ├── components.css          # Nút, bảng, form, hộp thoại, thông báo, biểu đồ…
│   └── pages.css               # Phần riêng: sơ đồ bàn, gọi món, bếp, hóa đơn, báo cáo
├── js/
│   ├── core/
│   │   ├── utils.js            # Định dạng tiền / ngày (theo giờ máy), HTML an toàn chống XSS
│   │   ├── data.js             # Dữ liệu mẫu cố định, neo theo ngày hiện tại
│   │   ├── store.js            # Kho dữ liệu và quy tắc nghiệp vụ dùng chung
│   │   ├── ui.js               # Thông báo, hộp thoại, hộp xác nhận, bảng
│   │   ├── validate.js         # Kiểm tra dữ liệu nhập, báo lỗi ngay dưới ô
│   │   ├── charts.js           # Biểu đồ cột, thanh ngang, thanh tỷ lệ (không cần thư viện)
│   │   ├── crud.js             # Thêm / sửa / xóa dùng chung cho các danh mục
│   │   └── xlsx.js             # Xuất file Excel (.xlsx) không cần thư viện ngoài
│   ├── pages/                  # Mỗi phân hệ một file, đặt tên theo menu
│   │   ├── tong-quan.js
│   │   ├── khach-hang.js       # Khách hàng, nhân viên
│   │   ├── ban-hang.js         # Món ăn, voucher, quản lý bàn, đặt bàn
│   │   ├── goi-mon.js          # Gọi món, hóa đơn, thanh toán
│   │   ├── nha-bep.js
│   │   ├── kho.js              # Nguyên liệu, nhà cung cấp, nhập / xuất kho, kiểm kê
│   │   ├── bom.js              # Định mức BOM: theo món, theo nguyên liệu, định mức – thực tế, xuất Excel
│   │   ├── xe-dua-don.js
│   │   └── bao-cao.js
│   └── app.js                  # Đăng nhập, điều hướng, sidebar, khởi động
├── assets/
│   ├── fonts/                  # Font Be Vietnam Pro (lưu sẵn, chạy không cần mạng)
│   ├── vendor/fontawesome/     # Bộ icon Font Awesome Free (bản solid)
│   ├── vendor/qrcode-generator/ # Thư viện tạo mã QR (MIT), dùng cho mã check-in đặt bàn
│   └── img/                    # Ảnh nền, ảnh đại diện, favicon (đã nén)
├── docs/                       # Tài liệu học phần & báo cáo PTHTTTQL
│   ├── PTHTTTQL_Quán Nhậu Tự Do.docx   # Bản báo cáo nghiên cứu hoàn chỉnh (.docx)
│   ├── PTHTTTQL_Quán Nhậu Tự Do.pdf    # Bản báo cáo xuất định dạng (.pdf)
│   └── diagrams/               # Thư mục sơ đồ phân tích nghiệp vụ
│       ├── BFD_quannhautudo.png        # Sơ đồ phân rã chức năng (BFD)
│       ├── IFD_Trang_1.png … IFD_Trang_6.png  # Sơ đồ luồng thông tin IFD Trang 1–6
│       └── PTHTTT_Trang_7.png          # Sơ đồ luồng thông tin IFD Trang 7
├── tests/                      # Kiểm thử tự động bằng trình duyệt (Playwright) — xem tests/README.md
├── .gitignore
└── README.md
```

---

## 🚀 Hướng Dẫn Chạy Thử Ứng Dụng

Ứng dụng web được xây dựng độc lập, không yêu cầu cài đặt môi trường hay `npm install`, không cần Internet:

1. **Chạy trực tiếp từ máy cá nhân:**
   - Mở file `index.html` bằng bất kỳ trình duyệt web nào (Chrome, Edge, Firefox, Safari).
   - Đăng nhập bằng tài khoản dùng thử (có ghi ngay trên trang đăng nhập):
     - **Tên đăng nhập:** `admin`
     - **Mật khẩu:** `123456`
   - Tích **Ghi nhớ đăng nhập** để lần sau trình duyệt tự điền sẵn tên đăng nhập. (Web chỉ dành cho quản trị nên không có chức năng quên mật khẩu.)

2. **Chạy qua GitHub Pages:**
   - Truy cập vào mục **Settings** của repository trên GitHub.
   - Chọn mục **Pages** ở thanh menu bên trái.
   - Tại phần **Branch**, chọn `main` (hoặc `master`) và thư mục `/(root)`, sau đó bấm **Save**.
   - Sau 1-2 phút, web sẽ được xuất bản live tại địa chỉ: `https://lha08082006.github.io/ptht/`.

> **Lưu ý về dữ liệu:** Ứng dụng chạy hoàn toàn trên trình duyệt. Mọi thay đổi được lưu ngay vào bộ nhớ của trình duyệt (localStorage), nên tải lại trang (F5) hay tắt đi mở lại vẫn còn, và F5 không bị đăng xuất (đăng xuất hoặc đóng tab thì phải đăng nhập lại). Dữ liệu chỉ nằm trên đúng trình duyệt của máy đó — máy khác, trình duyệt khác hay cửa sổ ẩn danh sẽ có dữ liệu riêng. Muốn làm lại từ đầu: **Tổng quan → Khôi phục dữ liệu mẫu**. Dữ liệu mẫu lấy mốc theo ngày giờ lúc tạo (hóa đơn trong 7 ngày gần nhất, đặt bàn ở các ngày tới), nên các báo cáo lúc nào cũng có số liệu. Nếu chưa sửa gì mà hôm sau mới mở lại, dữ liệu mẫu tự tạo lại theo ngày mới; đã sửa dữ liệu thì web giữ nguyên (khi đó số liệu "hôm nay" có thể trống — bấm **Khôi phục dữ liệu mẫu** nếu muốn số liệu mẫu theo hôm nay).

---

## 🧪 Kiểm Thử Tự Động

Thư mục `tests/` chứa bộ kiểm thử mở thẳng `index.html` bằng trình duyệt tự động, bấm như người dùng thật và kiểm tra kết quả: đăng nhập, 19 trang, thêm / sửa / xóa, một vòng quy trình đầy đủ (đặt bàn → check-in → gọi món → bếp → thanh toán → báo cáo → xe → nhập kho), định mức món và trừ kho, lưu dữ liệu, mã QR, in hóa đơn, dữ liệu lớn 90 ngày, giao diện điện thoại… Chỉ cần khi muốn kiểm tra lại sau khi sửa code — chạy web thì không cần:

```bash
cd tests
npm install
npx playwright install chromium
npm test
```

Chi tiết từng bộ kiểm thử: xem [`tests/README.md`](tests/README.md).

---

## 🧩 Quy Tắc Nghiệp Vụ Chính Được Kiểm Tra

- SĐT gồm 10–11 chữ số, bắt đầu bằng 0; tên, mã voucher, biển số xe không được trùng.
- Giá, số lượng là số nguyên dương; xuất kho không vượt quá tồn kho; ngày lập phiếu kho không ở tương lai.
- Không đặt bàn cho ngày giờ đã qua; số khách không vượt sức chứa của bàn; một bàn không nhận hai lịch cùng ngày cách nhau dưới 3 giờ; lịch hôm nay sắp tới không xếp vào bàn đang có khách; chỉ check-in được vào đúng ngày đặt.
- Trạng thái bàn khớp với dữ liệu: gọi món / check-in → *Đang dùng*; bàn có lịch đặt hôm nay (chưa quá hạn) → *Đã đặt*; thanh toán xong chỉ trả bàn khi bàn không còn hóa đơn chờ — về *Đã đặt* nếu còn lịch hôm nay, không thì về *Trống*.
- Thanh toán hóa đơn còn phiếu bếp chưa hoàn thành phải xác nhận lại; chỉ hủy được món khi bếp chưa bắt đầu chế biến.
- Mỗi bàn chỉ có một hóa đơn đang mở: gọi thêm món được cộng vào hóa đơn đó, tổng tiền và giảm giá voucher tính lại theo toàn bộ món.
- Gửi đơn xuống bếp trừ kho theo định mức gộp (đã tính hao hụt) của từng món; không gửi được nếu kho không đủ; giá vốn từng món được chốt lúc bán (đổi định mức hay giá nhập sau này không làm sai lãi của hóa đơn cũ).
- Đối chiếu định mức: dùng thực tế = xuất theo định mức + xuất tay − chênh lệch kiểm kê; phần vượt định mức được tính tiền theo đơn giá nguyên liệu.
- Không xóa được và không đổi được đơn vị tính của nguyên liệu đang có trong định mức món; lượng định mức, định mức tồn và số lượng phiếu kho nhận tối đa 3 chữ số thập phân.
- Mỗi xe và mỗi tài xế chỉ chạy một chuyến tại một thời điểm; xe đang chạy chuyến không đổi được trạng thái cho tới khi hoàn tất chuyến; chỉ giao xe trong khoảng từ 3 giờ trước tới 1 giờ sau giờ đón.
- Doanh thu ghi nhận theo ngày thanh toán; hóa đơn chưa thanh toán chỉ hiện ở mục *Chờ thanh toán*.
- Không xóa được bản ghi đang được dùng (ví dụ: khách hàng đã có hóa đơn, nguyên liệu đã có phiếu kho); hệ thống báo rõ lý do.
