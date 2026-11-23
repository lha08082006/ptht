/* =========================================================
   DỮ LIỆU MẪU
   - Cố định (không ngẫu nhiên): mở lại trang bao nhiêu lần số liệu vẫn như nhau.
   - Neo theo ngày hiện tại: hóa đơn trong 7 ngày gần nhất, đặt bàn ở các ngày tới.
   - Nhất quán: bàn có hóa đơn chờ = "Đang dùng", xe đang chạy chuyến = "Đang dùng",
     tồn kho = tổng nhập − tổng xuất của các phiếu kho.
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;

    /** Giờ "HH:mm" lệch so với bây giờ, không vượt sang ngày khác */
    function timeShift(minutes) {
        const now = new Date();
        const t = new Date(now.getTime() + minutes * 60000);
        if (t.toDateString() !== now.toDateString()) return minutes < 0 ? '00:05' : '23:45';
        return U.pad2(t.getHours()) + ':' + U.pad2(t.getMinutes());
    }

    QN.createSeedData = function () {
        const today = U.todayLocal();
        const day = offset => U.addDays(today, offset);

        const customers = [
            { id: 1, name: 'Nguyễn Văn An', phone: '0901234567' },
            { id: 2, name: 'Trần Thị Bình', phone: '0912345678' },
            { id: 3, name: 'Lê Hoàng Cường', phone: '0923456789' },
            { id: 4, name: 'Phạm Minh Dũng', phone: '0934567890' },
            { id: 5, name: 'Hoàng Thị Ánh', phone: '0945678901' },
            { id: 6, name: 'Vũ Đức Anh', phone: '0956789012' }
        ];

        const employees = [
            { id: 1, name: 'Nguyễn Quản Lý', role: 'Quản lý' },
            { id: 2, name: 'Trần Văn Phục', role: 'Phục vụ' },
            { id: 3, name: 'Lê Thị Thu', role: 'Thu ngân' },
            { id: 4, name: 'Phạm Đầu Bếp', role: 'Bếp' },
            { id: 5, name: 'Hoàng Tài Xế', role: 'Tài xế' },
            { id: 6, name: 'Đỗ Phục Vụ', role: 'Phục vụ' },
            { id: 7, name: 'Bùi Văn Lái', role: 'Tài xế' }
        ];

        const foods = [
            { id: 1, name: 'Nầm sữa nướng giềng mẻ', category: 'Món nướng', price: 189000, status: 'available' },
            { id: 2, name: 'Ếch sốt tiêu gừng chua cay', category: 'Món xào', price: 159000, status: 'available' },
            { id: 3, name: 'Lợn mán nướng giềng mẻ', category: 'Món nướng', price: 219000, status: 'available' },
            { id: 4, name: 'Gỏi chân gà trộn thính', category: 'Khai vị', price: 129000, status: 'available' },
            { id: 5, name: 'Cá dưa chua tứ xuyên', category: 'Món cá', price: 249000, status: 'available' },
            { id: 6, name: 'Tôm sú ủ muối thảo mộc', category: 'Hải sản', price: 289000, status: 'available' },
            { id: 7, name: 'Lạp xưởng Tây Bắc xào', category: 'Món xào', price: 149000, status: 'available' },
            { id: 8, name: 'Gỏi sứa sốt Thái', category: 'Khai vị', price: 139000, status: 'unavailable' },
            { id: 9, name: 'Đậu pháp xào trứng non XO', category: 'Món xào', price: 119000, status: 'available' },
            { id: 10, name: 'Bia Tự Do', category: 'Đồ uống', price: 35000, status: 'available' },
            { id: 11, name: 'Nước ngọt', category: 'Đồ uống', price: 25000, status: 'available' },
            { id: 12, name: 'Nầm sữa cháy tỏi', category: 'Món nướng', price: 199000, status: 'available' }
        ];

        const suppliers = [
            { id: 1, name: 'NCC Tây Bắc', address: 'Sơn La', phone: '0241234567' },
            { id: 2, name: 'Nhà máy bia HN', address: 'Long Biên, Hà Nội', phone: '0242345678' },
            { id: 3, name: 'Trại bò sữa Mộc Châu', address: 'Mộc Châu, Sơn La', phone: '0243456789' },
            { id: 4, name: 'Hải sản Quảng Ninh', address: 'Bãi Cháy, Quảng Ninh', phone: '0244567890' },
            { id: 5, name: 'Rau sạch Đà Lạt', address: 'Đà Lạt, Lâm Đồng', phone: '0245678901' }
        ];

        // Mô tả voucher khớp với cách hệ thống tính (giảm % trên tổng tiền món)
        const vouchers = [
            { id: 'VC001', desc: 'Giảm 10% cho khách quen', percent: 10, qty: 50 },
            { id: 'VC002', desc: 'Giảm 20% cho sinh viên', percent: 20, qty: 30 },
            { id: 'VC003', desc: 'Giảm 15% dịp lễ', percent: 15, qty: 20 },
            { id: 'VC004', desc: 'Giảm 5% tri ân khách hàng', percent: 5, qty: 100 }
        ];

        const ingredients = [
            { id: 1, name: 'Nầm sữa bò', unit: 'kg', price: 180000, supplierId: 3, stock: 0 },
            { id: 2, name: 'Ếch đồng', unit: 'kg', price: 120000, supplierId: 1, stock: 0 },
            { id: 3, name: 'Thịt lợn mán', unit: 'kg', price: 250000, supplierId: 1, stock: 0 },
            { id: 4, name: 'Chân gà rút xương', unit: 'kg', price: 85000, supplierId: 1, stock: 0 },
            { id: 5, name: 'Cá diêu hồng', unit: 'kg', price: 95000, supplierId: 4, stock: 0 },
            { id: 6, name: 'Tôm sú', unit: 'kg', price: 320000, supplierId: 4, stock: 0 },
            { id: 7, name: 'Lạp xưởng', unit: 'kg', price: 160000, supplierId: 1, stock: 0 },
            { id: 8, name: 'Rau xà lách', unit: 'kg', price: 35000, supplierId: 5, stock: 0 },
            { id: 9, name: 'Bia Tự Do', unit: 'thùng', price: 280000, supplierId: 2, stock: 0 },
            { id: 10, name: 'Nước ngọt', unit: 'thùng', price: 180000, supplierId: 2, stock: 0 }
        ];

        const vehicles = [
            { id: 1, plate: '30A-12345', type: 'Xe 4 chỗ', seats: 4, status: 'available' },
            { id: 2, plate: '30B-67890', type: 'Xe 7 chỗ', seats: 7, status: 'in_use' },
            { id: 3, plate: '29C-11223', type: 'Xe 16 chỗ', seats: 16, status: 'available' },
            { id: 4, plate: '30D-44556', type: 'Xe 4 chỗ', seats: 4, status: 'maintenance' }
        ];

        // 20 bàn: số chỗ và khu vực lặp theo chu kỳ 5
        const seatCycle = [2, 4, 6, 8, 10];
        const zoneCycle = ['Tầng 1', 'Tầng 1', 'Tầng 2', 'Tầng 2', 'Sân vườn'];
        const tables = [];
        for (let i = 1; i <= 20; i++) {
            tables.push({ id: i, name: 'Bàn ' + i, seats: seatCycle[i % 5], zone: zoneCycle[i % 5], status: 'available' });
        }

        // Hóa đơn: [ngày lệch, giờ, bàn, khách (0 = khách lẻ), NV, [[món, SL]…], voucher, trạng thái, phương thức]
        const invoiceRows = [
            [-6, '18:20', 2, 2, 2, [[1, 2], [10, 6], [4, 1]], '', 'paid', 'Tiền mặt'],
            [-6, '19:45', 7, 0, 6, [[5, 1], [11, 3]], '', 'paid', 'Chuyển khoản'],
            [-5, '18:05', 3, 4, 2, [[3, 1], [2, 1], [10, 8]], 'VC001', 'paid', 'MoMo'],
            [-5, '20:10', 9, 1, 6, [[6, 2], [12, 1]], '', 'paid', 'Tiền mặt'],
            [-4, '17:50', 14, 0, 2, [[7, 2], [9, 1], [11, 2]], '', 'paid', 'VNPay'],
            [-4, '19:30', 12, 5, 1, [[1, 1], [3, 1], [10, 10]], 'VC003', 'paid', 'Chuyển khoản'],
            [-4, '21:00', 15, 6, 6, [[4, 2], [10, 4]], '', 'paid', 'Tiền mặt'],
            [-3, '18:40', 5, 3, 2, [[5, 1], [2, 2], [11, 4]], '', 'paid', 'Tiền mặt'],
            [-3, '20:25', 10, 0, 6, [[12, 2], [10, 6]], 'VC004', 'paid', 'MoMo'],
            [-2, '18:15', 8, 2, 2, [[6, 1], [1, 1], [9, 1]], '', 'paid', 'Chuyển khoản'],
            [-2, '19:50', 18, 4, 1, [[3, 2], [7, 1], [10, 12]], 'VC002', 'paid', 'Tiền mặt'],
            [-1, '18:30', 11, 1, 6, [[1, 2], [4, 1], [11, 3]], '', 'paid', 'VNPay'],
            [-1, '20:40', 16, 0, 2, [[5, 1], [12, 1], [10, 5]], '', 'paid', 'Tiền mặt'],
            [0, timeShift(-75), 13, 5, 6, [[2, 1], [9, 1], [11, 2]], '', 'paid', 'Chuyển khoản'],
            [0, timeShift(-40), 1, 3, 2, [[1, 1], [6, 1], [10, 6]], '', 'pending', ''],
            [0, timeShift(-12), 6, 0, 6, [[3, 1], [7, 1], [11, 2]], '', 'pending', '']
        ];

        const invoices = invoiceRows.map((row, index) => {
            const [offset, time, tableId, custId, empId, lines, voucherId, status, payMethod] = row;
            const id = index + 1;
            const date = day(offset);
            const items = lines.map(([foodId, qty]) => {
                const f = foods.find(x => x.id === foodId);
                return { foodId, name: f.name, category: f.category, price: f.price, qty };
            });
            const total = U.sum(items, it => it.price * it.qty);
            const voucher = vouchers.find(v => v.id === voucherId);
            const discount = voucher ? Math.round(total * voucher.percent / 100) : 0;
            const paid = status === 'paid';
            return {
                id, date, time, tableId, custId, empId, items, total,
                voucher: voucherId, discount, finalTotal: total - discount,
                status,
                payMethod: paid ? payMethod : '',
                txId: paid ? 'TXN' + date.replace(/-/g, '').slice(2) + U.pad2(id) : '',
                paidAt: paid ? date + 'T' + time : ''
            };
        });

        // Phiếu bếp gắn với hóa đơn trong ngày
        const kitchenOrders = [
            { id: 1, invoiceId: 14, status: 'done' },
            { id: 2, invoiceId: 15, status: 'cooking' },
            { id: 3, invoiceId: 16, status: 'new' }
        ].map(k => {
            const inv = invoices.find(i => i.id === k.invoiceId);
            return {
                id: k.id, invoiceId: inv.id, tableId: inv.tableId, status: k.status, time: inv.time,
                items: inv.items.map(it => ({ foodId: it.foodId, name: it.name, qty: it.qty }))
            };
        });

        const reservations = [
            { id: 1, name: 'Nguyễn Văn An', phone: '0901234567', date: day(1), time: '18:00', guests: 4, tableId: 11, status: 'confirmed', note: 'Sinh nhật', qr: 'RES-001-QNTD' },
            { id: 2, name: 'Trần Thị Bình', phone: '0912345678', date: day(2), time: '19:30', guests: 6, tableId: 0, status: 'pending', note: '', qr: 'RES-002-QNTD' },
            { id: 3, name: 'Phạm Minh Dũng', phone: '0934567890', date: day(1), time: '20:00', guests: 2, tableId: 5, status: 'cancelled', note: 'Hủy do thay đổi lịch', qr: 'RES-003-QNTD' },
            { id: 4, name: 'Hoàng Thị Ánh', phone: '0945678901', date: day(0), time: timeShift(120), guests: 8, tableId: 4, status: 'confirmed', note: 'Liên hoan công ty', qr: 'RES-004-QNTD' }
        ];

        const deliveryReqs = [
            { id: 1, custId: 1, pickup: '123 Nguyễn Trãi, Thanh Xuân', dropoff: 'Quán Nhậu Tự Do', time: today + 'T' + timeShift(90), guests: 4, status: 'pending', note: '' },
            { id: 2, custId: 3, pickup: '45 Lê Duẩn, Đống Đa', dropoff: 'Quán Nhậu Tự Do', time: today + 'T' + timeShift(45), guests: 6, status: 'assigned', note: 'Có trẻ em' }
        ];

        const trips = [
            { id: 1, reqId: 2, custId: 3, vehicleId: 2, driverId: 5, departure: timeShift(15), status: 'Đang đón' }
        ];

        // Phiếu kho: [ngày lệch, loại, nguyên liệu, SL, NV lập]. 10 phiếu đầu là nhập đầu kỳ.
        const receiptRows = [
            [-10, 'import', 1, 30, 1], [-10, 'import', 2, 20, 1], [-10, 'import', 3, 15, 1],
            [-10, 'import', 4, 20, 1], [-10, 'import', 5, 15, 1], [-10, 'import', 6, 10, 1],
            [-10, 'import', 7, 12, 1], [-10, 'import', 8, 25, 1], [-10, 'import', 9, 40, 1],
            [-10, 'import', 10, 30, 1],
            [-6, 'export', 1, 5, 4], [-5, 'import', 9, 20, 1], [-4, 'export', 6, 6, 4],
            [-3, 'export', 9, 15, 4], [-2, 'import', 8, 10, 1], [-2, 'export', 2, 8, 4],
            [-1, 'export', 3, 5, 4], [-1, 'export', 10, 8, 4], [0, 'export', 5, 4, 4]
        ];

        const receipts = receiptRows.map(([offset, type, ingredientId, qty, empId], index) => {
            const g = ingredients.find(x => x.id === ingredientId);
            return {
                id: index + 1, type, date: day(offset), empId,
                supplierId: type === 'import' ? g.supplierId : null,
                ingredientId: g.id, ingredientName: g.name, qty, unitPrice: g.price, total: qty * g.price
            };
        });

        // Tồn kho = tổng nhập − tổng xuất
        ingredients.forEach(g => {
            g.stock = U.sum(receipts.filter(r => r.ingredientId === g.id), r => (r.type === 'import' ? r.qty : -r.qty));
        });

        // Trạng thái bàn suy ra từ hóa đơn chờ và đặt bàn đã xác nhận
        invoices.filter(i => i.status === 'pending').forEach(i => {
            tables.find(t => t.id === i.tableId).status = 'occupied';
        });
        reservations.filter(r => r.status === 'confirmed' && r.tableId).forEach(r => {
            const t = tables.find(x => x.id === r.tableId);
            if (t.status === 'available') t.status = 'reserved';
        });

        return {
            customers, employees, foods, suppliers, vouchers, ingredients, vehicles, tables,
            invoices, kitchenOrders, reservations, deliveryReqs, trips, receipts
        };
    };
})(window.QN);
