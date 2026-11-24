# Kiểm thử tự động

Bộ kiểm thử mở thẳng `../index.html` (qua `file://`, giống cách người dùng mở web) bằng trình duyệt Chromium do [Playwright](https://playwright.dev) điều khiển, bấm như người dùng thật rồi kiểm tra kết quả trên màn hình và trong dữ liệu. Không cần máy chủ, không sửa gì trong web.

| Tệp | Nội dung |
|---|---|
| `hoi-quy.js` | Đăng nhập, mở đủ 18 trang, thêm / sửa / xóa và kiểm tra dữ liệu nhập ở các danh mục, gọi món → bếp → thanh toán, đặt bàn, kho, xe đưa đón, báo cáo, giao diện điện thoại |
| `loi-review.js` | 9 lỗi tìm được khi rà soát mã — mỗi mục dựng lại đúng tình huống từng gây lỗi để chắc lỗi không quay lại |
| `chuc-nang.js` | Lưu dữ liệu + F5, khôi phục dữ liệu mẫu, check-in, mã QR (chụp màn hình rồi giải mã), hoàn tất chuyến xe, in hóa đơn, định mức tồn, doanh thu theo ngày thanh toán, gọi thêm món, tìm kiếm, chuông, thẻ "Hôm nay", thanh giỏ hàng và nhãn biểu đồ trên điện thoại |
| `dinh-muc.js` | Định mức món ăn: giá vốn, lãi gộp, số phần còn làm được, hộp thoại định mức, gửi bếp tự trừ kho (phiếu xuất bán), chặn gọi vượt tồn, cảnh báo chạm định mức, báo cáo lãi gộp, gom doanh thu theo tuần / tháng |
| `bom.js` | Phân hệ định mức BOM: trang BOM 3 chế độ xem, hao hụt % và định mức gộp, sửa định mức ngay trên trang, trừ kho theo định mức gộp, kiểm kê kho (phiếu điều chỉnh), đối chiếu định mức – thực tế, xuất Excel (.xlsx) |
| `du-lieu-lon.js` | Giả lập quán chạy 90 ngày (~1.000 hóa đơn, ~4.000 phiếu kho): phân trang "Xem thêm", bếp chỉ hiện đơn xong hôm nay, đặt bàn quá hạn, số liệu dài vẫn vừa thẻ, báo khi bộ nhớ trình duyệt đầy |
| `quy-trinh.js` | Một vòng quy trình đầy đủ chỉ bằng thao tác giao diện: đặt bàn → xác nhận → mã QR → check-in → gọi món + voucher → bếp → gọi thêm → thanh toán → in → báo cáo → xe đưa đón → nhập kho → F5 |
| `lib.js` | Hàm dùng chung (mở trang, đăng nhập, đọc lỗi dưới ô, chụp màn hình…) |
| `run.js` | Chạy lần lượt các bộ và in tổng kết |

## Cách chạy

Cần [Node.js](https://nodejs.org) 18 trở lên. Lần đầu cài thư viện và trình duyệt kiểm thử:

```bash
cd tests
npm install
npx playwright install chromium
```

Chạy tất cả:

```bash
npm test
```

Chạy riêng một hoặc vài bộ:

```bash
node run.js quy-trinh dinh-muc
```

Mỗi mục in ra một dòng `PASS` hoặc `FAIL` (kèm chi tiết khi sai), cuối cùng là tổng số mục đạt. Có mục sai thì lệnh kết thúc với mã lỗi 1.

Kiểm thử thẳng trên trang đã deploy (thay vì file `index.html` trong máy), đặt biến môi trường `APP_URL`:

```bash
APP_URL=https://ptht-gold.vercel.app/ npm test
```

Muốn lưu ảnh chụp màn hình trong lúc chạy, đặt biến môi trường `SHOTS_DIR`:

```bash
SHOTS_DIR=anh-chup npm test
```

(PowerShell trên Windows: `$env:SHOTS_DIR="anh-chup"; npm test`)

## Ghi chú

- Mọi trang kiểm thử chạy ở **giờ cố định 19:00 ngày 24/11/2026 (giờ Việt Nam)**, nên kết quả không phụ thuộc lúc chạy; dữ liệu mẫu luôn được tạo theo mốc đó. Riêng một vài mục cố ý đổi giờ (02:00 sáng, 20:05, 23:55) để kiểm tra các trường hợp sát nửa đêm.
- Mỗi lần mở trang là một hồ sơ trình duyệt mới (bộ nhớ trình duyệt trống), nên các bộ không ảnh hưởng lẫn nhau và không đụng tới dữ liệu bạn đang dùng trên trình duyệt của mình.
- Bộ kiểm thử cũng bắt lỗi JavaScript trên console và mọi yêu cầu tải tài nguyên từ Internet (web phải chạy được khi không có mạng).
