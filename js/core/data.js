/* =========================================================
   DỮ LIỆU MẪU
   - Cố định (không ngẫu nhiên): mở lại trang bao nhiêu lần số liệu vẫn như nhau.
   - Neo theo ngày hiện tại: hóa đơn trong 7 ngày gần nhất, đặt bàn ở các ngày tới.
   - Nhất quán: bàn có hóa đơn chờ = "Đang dùng", xe đang chạy chuyến = "Đang dùng",
     tồn kho = tổng nhập − tổng xuất của các phiếu kho.
   - Định mức BOM (recipe): lượng nguyên liệu tịnh cho 1 phần + tỷ lệ hao hụt khi sơ chế.
     Định mức gộp = tịnh × (1 + hao hụt %) là lượng thật sự xuất kho. Mỗi đơn gửi bếp tự trừ kho
     theo định mức gộp và sinh phiếu xuất "bán hàng" — dữ liệu mẫu cũng được tạo đúng như vậy.
   - Có một lần kiểm kê (2 ngày trước) lệch so với sổ sách để báo cáo đối chiếu định mức có số liệu.
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;

    /** Giờ "HH:mm" trong quá khứ của hôm nay (không lùi sang hôm qua) */
    function timeShift(minutes) {
        const now = new Date();
        const t = new Date(now.getTime() + minutes * 60000);
        if (t.toDateString() !== now.toDateString()) return '00:05';
        return U.pad2(t.getHours()) + ':' + U.pad2(t.getMinutes());
    }

    /** Mốc thời gian sắp tới: { date, time }. Qua nửa đêm thì sang ngày mai (không kẹp về giờ đã qua). */
    function futureSlot(minutes) {
        const t = new Date(Date.now() + minutes * 60000);
        return { date: U.toISODate(t), time: U.pad2(t.getHours()) + ':' + U.pad2(t.getMinutes()) };
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

        // recipe (BOM): định mức cho 1 phần — [mã nguyên liệu, lượng tịnh theo ĐVT của nguyên liệu, hao hụt %]
        const foods = [
            { id: 1, name: 'Nầm sữa nướng giềng mẻ', category: 'Món nướng', price: 189000, status: 'available', recipe: [[1, 0.3], [8, 0.05]] },
            { id: 2, name: 'Ếch sốt tiêu gừng chua cay', category: 'Món xào', price: 159000, status: 'available', recipe: [[2, 0.4]] },
            { id: 3, name: 'Lợn mán nướng giềng mẻ', category: 'Món nướng', price: 219000, status: 'available', recipe: [[3, 0.3], [8, 0.05]] },
            { id: 4, name: 'Gỏi chân gà trộn thính', category: 'Khai vị', price: 129000, status: 'available', recipe: [[4, 0.3], [8, 0.1, 10]] },
            { id: 5, name: 'Cá dưa chua tứ xuyên', category: 'Món cá', price: 249000, status: 'available', recipe: [[5, 1, 10], [13, 0.3]] },
            { id: 6, name: 'Tôm sú ủ muối thảo mộc', category: 'Hải sản', price: 289000, status: 'available', recipe: [[6, 0.4]] },
            { id: 7, name: 'Lạp xưởng Tây Bắc xào', category: 'Món xào', price: 149000, status: 'available', recipe: [[7, 0.3], [8, 0.05]] },
            { id: 8, name: 'Gỏi sứa sốt Thái', category: 'Khai vị', price: 139000, status: 'unavailable', recipe: [] },
            { id: 9, name: 'Đậu pháp xào trứng non XO', category: 'Món xào', price: 119000, status: 'available', recipe: [[11, 0.3], [12, 3]] },
            { id: 10, name: 'Bia Tự Do', category: 'Đồ uống', price: 35000, status: 'available', recipe: [[9, 1]] },
            { id: 11, name: 'Nước ngọt', category: 'Đồ uống', price: 25000, status: 'available', recipe: [[10, 1]] },
            { id: 12, name: 'Nầm sữa cháy tỏi', category: 'Món nướng', price: 199000, status: 'available', recipe: [[1, 0.3]] }
        ].map(f => Object.assign(f, { recipe: f.recipe.map(([ingredientId, qty, waste = 0]) => ({ ingredientId, qty, waste })) }));

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

        // minStock: định mức tồn tối thiểu của từng nguyên liệu (theo đơn vị tính của nó).
        // Đồ uống tính theo lon để định mức món "1 lon / phần" (nhập kho 1 thùng = 24 lon).
        const ingredients = [
            { id: 1, name: 'Nầm sữa bò', unit: 'kg', price: 180000, supplierId: 3, minStock: 8, stock: 0 },
            { id: 2, name: 'Ếch đồng', unit: 'kg', price: 120000, supplierId: 1, minStock: 5, stock: 0 },
            { id: 3, name: 'Thịt lợn mán', unit: 'kg', price: 250000, supplierId: 1, minStock: 5, stock: 0 },
            { id: 4, name: 'Chân gà rút xương', unit: 'kg', price: 85000, supplierId: 1, minStock: 5, stock: 0 },
            { id: 5, name: 'Cá diêu hồng', unit: 'kg', price: 95000, supplierId: 4, minStock: 6, stock: 0 },
            { id: 6, name: 'Tôm sú', unit: 'kg', price: 320000, supplierId: 4, minStock: 5, stock: 0 },
            { id: 7, name: 'Lạp xưởng', unit: 'kg', price: 160000, supplierId: 1, minStock: 4, stock: 0 },
            { id: 8, name: 'Rau xà lách', unit: 'kg', price: 35000, supplierId: 5, minStock: 8, stock: 0 },
            { id: 9, name: 'Bia Tự Do', unit: 'lon', price: 12000, supplierId: 2, minStock: 120, stock: 0 },
            { id: 10, name: 'Nước ngọt', unit: 'lon', price: 7500, supplierId: 2, minStock: 120, stock: 0 },
            { id: 11, name: 'Đậu Hà Lan', unit: 'kg', price: 45000, supplierId: 5, minStock: 3, stock: 0 },
            { id: 12, name: 'Trứng gà', unit: 'quả', price: 3500, supplierId: 1, minStock: 30, stock: 0 },
            { id: 13, name: 'Dưa chua', unit: 'kg', price: 30000, supplierId: 5, minStock: 3, stock: 0 }
        ];
        const round3 = x => Math.round(x * 1000) / 1000;
        const gross = l => round3(l.qty * (1 + (l.waste || 0) / 100));
        const unitCost = food => Math.round(U.sum(food.recipe, l => gross(l) * ingredients.find(g => g.id === l.ingredientId).price));

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
                return { foodId, name: f.name, category: f.category, price: f.price, cost: unitCost(f), qty };
            });
            const total = U.sum(items, it => it.price * it.qty);
            const voucher = vouchers.find(v => v.id === voucherId);
            const discount = voucher ? Math.round(total * voucher.percent / 100) : 0;
            const paid = status === 'paid';
            return {
                id, date, time, tableId, custId, empId, items, total,
                voucher: voucherId, voucherPercent: voucher ? voucher.percent : 0, discount, finalTotal: total - discount,
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
                id: k.id, invoiceId: inv.id, tableId: inv.tableId, status: k.status, date: inv.date, time: inv.time,
                items: inv.items.map(it => ({ foodId: it.foodId, name: it.name, qty: it.qty }))
            };
        });

        const partySlot = futureSlot(120);
        const reservations = [
            { id: 1, name: 'Nguyễn Văn An', phone: '0901234567', date: day(1), time: '18:00', guests: 4, tableId: 11, status: 'confirmed', note: 'Sinh nhật', qr: 'RES-001-QNTD' },
            { id: 2, name: 'Trần Thị Bình', phone: '0912345678', date: day(2), time: '19:30', guests: 6, tableId: 0, status: 'pending', note: '', qr: 'RES-002-QNTD' },
            { id: 3, name: 'Phạm Minh Dũng', phone: '0934567890', date: day(1), time: '20:00', guests: 2, tableId: 5, status: 'cancelled', note: 'Hủy do thay đổi lịch', qr: 'RES-003-QNTD' },
            { id: 4, name: 'Hoàng Thị Ánh', phone: '0945678901', date: partySlot.date, time: partySlot.time, guests: 8, tableId: 4, status: 'confirmed', note: 'Liên hoan công ty', qr: 'RES-004-QNTD' }
        ];

        const pickup1 = futureSlot(90);
        const pickup2 = futureSlot(45);
        const deliveryReqs = [
            { id: 1, custId: 1, pickup: '123 Nguyễn Trãi, Thanh Xuân', dropoff: 'Quán Nhậu Tự Do', time: pickup1.date + 'T' + pickup1.time, guests: 4, status: 'pending', note: '' },
            { id: 2, custId: 3, pickup: '45 Lê Duẩn, Đống Đa', dropoff: 'Quán Nhậu Tự Do', time: pickup2.date + 'T' + pickup2.time, guests: 6, status: 'assigned', note: 'Có trẻ em' }
        ];

        const trips = [
            { id: 1, reqId: 2, custId: 3, vehicleId: 2, driverId: 5, departure: futureSlot(15).time, status: 'Đang đón' }
        ];

        // Phiếu kho nhập tay: [ngày lệch, giờ, loại, nguyên liệu, SL, NV lập, ghi chú].
        // Nhập đầu kỳ cho cả 13 nguyên liệu, vài phiếu nhập bổ sung và một phiếu hủy hàng hỏng.
        const manualRows = [
            [-10, '08:00', 'import', 1, 30, 1, ''], [-10, '08:00', 'import', 2, 20, 1, ''], [-10, '08:00', 'import', 3, 10, 1, ''],
            [-10, '08:00', 'import', 4, 20, 1, ''], [-10, '08:00', 'import', 5, 15, 1, ''], [-10, '08:00', 'import', 6, 6, 1, ''],
            [-10, '08:00', 'import', 7, 12, 1, ''], [-10, '08:00', 'import', 8, 25, 1, ''], [-10, '08:00', 'import', 9, 480, 1, '20 thùng × 24 lon'],
            [-10, '08:00', 'import', 10, 240, 1, '10 thùng × 24 lon'], [-10, '08:00', 'import', 11, 8, 1, ''], [-10, '08:00', 'import', 12, 90, 1, ''],
            [-10, '08:00', 'import', 13, 5, 1, ''],
            [-5, '09:00', 'import', 9, 240, 1, '10 thùng × 24 lon'],
            [-3, '22:30', 'export', 8, 1.5, 4, 'Rau dập, hủy bỏ'],
            [-2, '09:00', 'import', 8, 10, 1, '']
        ];
        const draft = manualRows.map(([offset, time, type, ingredientId, qty, empId, note]) => ({ date: day(offset), time, type, ingredientId, qty, empId, note }));
        // Kiểm kê cuối ngày hôm kia: thiếu 2 lon bia và 0,3 kg rau so với sổ sách
        [[9, -2], [8, -0.3]].forEach(([ingredientId, diff]) => draft.push({
            date: day(-2), time: '23:30', type: diff > 0 ? 'import' : 'export', ingredientId, qty: Math.abs(diff), empId: 1,
            stocktake: true, note: `Kiểm kê ${U.fmtDate(day(-2))}: ${diff > 0 ? 'thừa' : 'thiếu'} so với sổ sách`
        }));

        // Mỗi đơn gửi bếp tự xuất kho theo định mức (gộp theo nguyên liệu của đơn đó)
        invoices.forEach(inv => {
            const need = new Map();
            inv.items.forEach(it => foods.find(f => f.id === it.foodId).recipe.forEach(l => {
                need.set(l.ingredientId, round3((need.get(l.ingredientId) || 0) + gross(l) * it.qty));
            }));
            need.forEach((qty, ingredientId) => draft.push({
                date: inv.date, time: inv.time, type: 'export', ingredientId, qty, empId: inv.empId,
                invoiceId: inv.id, auto: true, note: 'Xuất bán theo ' + U.code('HD', inv.id)
            }));
        });

        const receipts = draft
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
            .map((r, index) => {
                const g = ingredients.find(x => x.id === r.ingredientId);
                const receipt = {
                    id: index + 1, type: r.type, date: r.date, time: r.time, empId: r.empId,
                    supplierId: r.type === 'import' ? g.supplierId : null,
                    ingredientId: g.id, ingredientName: g.name, qty: r.qty, unitPrice: g.price, total: Math.round(r.qty * g.price),
                    note: r.note || ''
                };
                if (r.auto) Object.assign(receipt, { auto: true, invoiceId: r.invoiceId });
                if (r.stocktake) receipt.stocktake = true;
                return receipt;
            });

        // Tồn kho = tổng nhập − tổng xuất (làm tròn 3 chữ số thập phân để tránh sai số số thực)
        ingredients.forEach(g => {
            g.stock = round3(U.sum(receipts.filter(r => r.ingredientId === g.id), r => (r.type === 'import' ? r.qty : -r.qty)));
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
