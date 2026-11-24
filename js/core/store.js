/* =========================================================
   KHO DỮ LIỆU & QUY TẮC NGHIỆP VỤ DÙNG CHUNG
   Dữ liệu được lưu vào trình duyệt (localStorage) để F5 không mất;
   nút "Khôi phục dữ liệu mẫu" ở trang Tổng quan đưa về dữ liệu ban đầu.
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;

    const db = {};
    const STORAGE_KEY = 'qntd.data';
    const STORAGE_VERSION = 3; // 3: thêm định mức món ăn, phiếu xuất bán tự động (dữ liệu cũ hơn → tạo lại dữ liệu mẫu)
    const COLLECTIONS = [
        'customers', 'employees', 'foods', 'suppliers', 'vouchers', 'ingredients', 'vehicles', 'tables',
        'invoices', 'kitchenOrders', 'reservations', 'deliveryReqs', 'trips', 'receipts'
    ];

    /** Nhãn + tông màu cho từng trạng thái (một nơi duy nhất) */
    const STATUS = {
        table: {
            available: { label: 'Trống', tone: 'success' },
            reserved: { label: 'Đã đặt', tone: 'warning' },
            occupied: { label: 'Đang dùng', tone: 'danger' }
        },
        invoice: {
            paid: { label: 'Đã TT', long: 'Đã thanh toán', tone: 'success' },
            pending: { label: 'Chờ TT', long: 'Chờ thanh toán', tone: 'warning' }
        },
        reservation: {
            pending: { label: 'Chờ xác nhận', tone: 'warning' },
            confirmed: { label: 'Đã xác nhận', tone: 'success' },
            checked_in: { label: 'Đã đến', tone: 'info' },
            cancelled: { label: 'Đã hủy', tone: 'danger' }
        },
        food: {
            available: { label: 'Có sẵn', tone: 'success' },
            unavailable: { label: 'Hết món', tone: 'danger' }
        },
        vehicle: {
            available: { label: 'Sẵn sàng', tone: 'success' },
            in_use: { label: 'Đang dùng', tone: 'warning' },
            maintenance: { label: 'Bảo trì', tone: 'danger' }
        },
        delivery: {
            pending: { label: 'Chờ giao xe', tone: 'warning' },
            assigned: { label: 'Đã giao xe', tone: 'info' },
            completed: { label: 'Hoàn tất', tone: 'success' }
        },
        trip: {
            'Đang đón': { label: 'Đang đón', tone: 'info' },
            'Hoàn tất': { label: 'Hoàn tất', tone: 'success' }
        },
        receipt: {
            import: { label: 'Nhập', tone: 'success' },
            export: { label: 'Xuất', tone: 'danger' }
        },
        stock: {
            low: { label: 'Sắp hết', tone: 'danger' },
            medium: { label: 'Trung bình', tone: 'warning' },
            ok: { label: 'Đủ dùng', tone: 'success' }
        }
    };

    /** Định mức tồn mặc định khi nguyên liệu chưa khai báo */
    const DEFAULT_MIN_STOCK = 5;

    /** Làm tròn 3 chữ số thập phân (0,1 + 0,2 không thành 0,30000000000000004) */
    const round3 = x => Math.round((Number(x) || 0) * 1000) / 1000;

    const PAY_METHODS = [
        { id: 'Tiền mặt', icon: 'fa-money-bill-wave' },
        { id: 'Chuyển khoản', icon: 'fa-building-columns' },
        { id: 'VNPay', icon: 'fa-credit-card' },
        { id: 'MoMo', icon: 'fa-wallet' }
    ];

    /* ---------- Lưu / đọc trình duyệt (có thể bị chặn ở chế độ ẩn danh) ---------- */
    function readSaved() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const saved = JSON.parse(raw);
            if (!saved || saved.version !== STORAGE_VERSION || !saved.db) return null;
            if (!COLLECTIONS.every(key => Array.isArray(saved.db[key]))) return null;
            return saved.db;
        } catch (e) {
            return null;
        }
    }

    let saveTimer = null;
    let storageWarned = false;

    function writeNow() {
        clearTimeout(saveTimer);
        saveTimer = null;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, savedAt: new Date().toISOString(), db }));
        } catch (e) {
            // Hết dung lượng hoặc trình duyệt chặn lưu: vẫn chạy trong phiên, nhưng phải báo cho người dùng biết
            if (!storageWarned && QN.ui) {
                storageWarned = true;
                QN.ui.toast('Không lưu được dữ liệu vào trình duyệt (bộ nhớ đầy hoặc bị chặn). Các thay đổi mới sẽ mất khi tải lại trang.', 'error');
            }
        }
    }

    function replaceAll(data) {
        Object.keys(db).forEach(key => { delete db[key]; });
        COLLECTIONS.forEach(key => { db[key] = data[key]; });
    }

    const store = {
        db,
        STATUS,
        DEFAULT_MIN_STOCK,
        PAY_METHODS,
        restoredFromStorage: false,

        /** Nạp dữ liệu đã lưu; nếu chưa có (hoặc hỏng) thì tạo dữ liệu mẫu */
        init() {
            const saved = readSaved();
            store.restoredFromStorage = !!saved;
            replaceAll(saved || QN.createSeedData());
            if (saved) store.releaseExpiredHolds();
        },

        /** Mở lại dữ liệu cũ sau vài ngày: bàn "Đã đặt" mà lịch đặt đã qua (không còn ai giữ chỗ) → "Trống" */
        releaseExpiredHolds() {
            db.tables.forEach(t => { if (t.status === 'reserved') store.freeTable(t); });
        },

        /** Ghi lại sau mỗi thay đổi (gộp các thay đổi liên tiếp) */
        save() {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(writeNow, 150);
        },

        /** Ghi ngay (khi đóng / ẩn trang) */
        flush() {
            if (saveTimer) writeNow();
        },

        /** Xóa dữ liệu đã lưu, quay về dữ liệu mẫu mới */
        reset() {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* bỏ qua */ }
            replaceAll(QN.createSeedData());
            store.restoredFromStorage = false;
            writeNow();
        },

        /** Tìm theo id (chấp nhận cả số lẫn chuỗi, vì data-id luôn là chuỗi) */
        get(collection, id) {
            if (id === null || id === undefined || id === '') return null;
            const key = String(id);
            return db[collection].find(item => String(item.id) === key) || null;
        },

        nextId(collection) {
            return U.nextId(db[collection]);
        },

        remove(collection, item) {
            const list = db[collection];
            const index = list.indexOf(item);
            if (index >= 0) list.splice(index, 1);
        },

        customerName(id) {
            if (!Number(id)) return 'Khách lẻ';
            const c = store.get('customers', id);
            return c ? c.name : 'Khách (đã xóa)';
        },

        employeeName(id) {
            const e = store.get('employees', id);
            return e ? e.name : '—';
        },

        tableName(id) {
            const t = store.get('tables', id);
            return t ? t.name : '—';
        },

        supplierName(id) {
            const s = store.get('suppliers', id);
            return s ? s.name : '—';
        },

        vehiclePlate(id) {
            const v = store.get('vehicles', id);
            return v ? v.plate : '—';
        },

        /** Định mức tồn tối thiểu của nguyên liệu */
        minStock(ingredient) {
            const m = Number(ingredient.minStock);
            return ingredient.minStock !== '' && ingredient.minStock != null && Number.isFinite(m) ? m : DEFAULT_MIN_STOCK;
        },

        /** Sắp hết: ≤ định mức · Trung bình: ≤ 2 lần định mức · Đủ dùng: còn lại */
        stockLevel(ingredient) {
            const stock = Number(ingredient.stock) || 0;
            const min = store.minStock(ingredient);
            if (stock <= min) return 'low';
            if (stock <= min * 2) return 'medium';
            return 'ok';
        },

        /** Nên nhập thêm bao nhiêu để về mức "Đủ dùng" (gấp đôi định mức); 0 nếu chưa cần */
        reorderQty(ingredient) {
            if (store.stockLevel(ingredient) !== 'low') return 0;
            return round3(Math.max(store.minStock(ingredient) * 2 - (Number(ingredient.stock) || 0), 0));
        },

        round3,

        /* ---------- ĐỊNH MỨC MÓN ĂN ---------- */

        /** Định mức của món: [{ ingredientId, qty }] cho 1 phần (bỏ dòng lỗi, nguyên liệu đã xóa) */
        recipeOf(food) {
            return (food && Array.isArray(food.recipe) ? food.recipe : [])
                .filter(l => Number(l.qty) > 0 && store.get('ingredients', l.ingredientId));
        },

        /** Các món đang dùng nguyên liệu này trong định mức */
        foodsUsing(ingredientId) {
            return db.foods.filter(f => store.recipeOf(f).some(l => Number(l.ingredientId) === Number(ingredientId)));
        },

        /** Giá vốn 1 phần theo đơn giá nguyên liệu hiện tại; null nếu món chưa có định mức */
        foodCost(food) {
            const recipe = store.recipeOf(food);
            if (!recipe.length) return null;
            return Math.round(U.sum(recipe, l => l.qty * store.get('ingredients', l.ingredientId).price));
        },

        /** Tổng nguyên liệu cần cho các dòng món [{ foodId, qty }] → Map(mã nguyên liệu → lượng) */
        ingredientNeeds(lines) {
            const need = new Map();
            lines.forEach(line => store.recipeOf(store.get('foods', line.foodId)).forEach(l => {
                const id = Number(l.ingredientId);
                need.set(id, round3((need.get(id) || 0) + l.qty * line.qty));
            }));
            return need;
        },

        /**
         * Còn làm được bao nhiêu phần với tồn kho hiện tại (Infinity: món chưa có định mức nên không giới hạn).
         * reserved: Map lượng nguyên liệu đã dành cho các món khác đang nằm trong đơn.
         */
        portionsLeft(food, reserved) {
            const recipe = store.recipeOf(food);
            if (!recipe.length) return Infinity;
            return Math.max(0, Math.min(...recipe.map(l => {
                const g = store.get('ingredients', l.ingredientId);
                const free = (Number(g.stock) || 0) - (reserved ? reserved.get(Number(g.id)) || 0 : 0);
                return Math.floor(round3(free / l.qty) + 1e-9);
            })));
        },

        /** Nguyên liệu không đủ cho các dòng món: [{ ingredient, need, stock }] */
        shortages(lines) {
            const out = [];
            store.ingredientNeeds(lines).forEach((need, id) => {
                const g = store.get('ingredients', id);
                const stock = Number(g && g.stock) || 0;
                if (g && need > stock + 1e-9) out.push({ ingredient: g, need, stock });
            });
            return out;
        },

        /**
         * Trừ kho theo định mức cho một lần gửi bếp: mỗi nguyên liệu một phiếu xuất tự động gắn mã hóa đơn.
         * Trả về các nguyên liệu vừa rơi xuống mức "Sắp hết" (để cảnh báo).
         */
        consumeForOrder(lines, { invoiceId, empId, date, time }) {
            const newlyLow = [];
            store.ingredientNeeds(lines).forEach((qty, id) => {
                const g = store.get('ingredients', id);
                if (!g || qty <= 0) return;
                const wasLow = store.stockLevel(g) === 'low';
                g.stock = round3((Number(g.stock) || 0) - qty);
                db.receipts.push({
                    id: store.nextId('receipts'), type: 'export', date, time, empId,
                    supplierId: null, ingredientId: g.id, ingredientName: g.name,
                    qty, unitPrice: g.price, total: Math.round(qty * g.price),
                    note: 'Xuất bán theo ' + U.code('HD', invoiceId), auto: true, invoiceId
                });
                if (!wasLow && store.stockLevel(g) === 'low') newlyLow.push(g);
            });
            return newlyLow;
        },

        /** Giá vốn của một dòng món trên hóa đơn (giá vốn chốt lúc bán; dữ liệu cũ thì tính theo định mức hiện tại) */
        lineCost(item) {
            const unit = item.cost != null && item.cost !== '' && Number.isFinite(Number(item.cost))
                ? Number(item.cost)
                : store.foodCost(store.get('foods', item.foodId)) || 0;
            return unit * (Number(item.qty) || 0);
        },

        invoiceCost(invoice) {
            return U.sum(invoice.items, it => store.lineCost(it));
        },

        /** Ngày thanh toán (với hóa đơn đã thanh toán) */
        paidDate(invoice) {
            return String(invoice.paidAt || invoice.date || '').slice(0, 10);
        },

        pendingInvoicesOfTable(tableId) {
            return db.invoices.filter(i => i.status === 'pending' && Number(i.tableId) === Number(tableId));
        },

        /** Hóa đơn đang mở (chưa thanh toán) mới nhất của bàn */
        openInvoiceOfTable(tableId) {
            return store.pendingInvoicesOfTable(tableId).sort(store.byNewest)[0] || null;
        },

        /** Đặt bàn đã xác nhận, chưa đến, từ hôm nay trở đi đang giữ bàn này */
        holdsOfTable(tableId, exceptId) {
            const today = U.todayLocal();
            return db.reservations.filter(r => r.status === 'confirmed' && Number(r.tableId) === Number(tableId) && r.date >= today && r.id !== exceptId)
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        },

        /** Trạng thái bàn khi không còn khách ngồi: còn đặt bàn giữ chỗ thì "Đã đặt", không thì "Trống" */
        freeTable(table) {
            if (!table || store.pendingInvoicesOfTable(table.id).length) return;
            table.status = store.holdsOfTable(table.id).length ? 'reserved' : 'available';
        },

        activeTrips() {
            return db.trips.filter(t => t.status === 'Đang đón');
        },

        activeTripOfVehicle(vehicleId) {
            return store.activeTrips().find(t => Number(t.vehicleId) === Number(vehicleId)) || null;
        },

        /** Số việc cần xử lý ngay — hiển thị trên chuông */
        attention() {
            const kitchenNew = db.kitchenOrders.filter(k => k.status === 'new').length;
            const today = U.todayLocal();
            const reservationsPending = db.reservations.filter(r => r.status === 'pending' && r.date >= today).length;
            const lowStock = db.ingredients.filter(g => store.stockLevel(g) === 'low').length;
            return { kitchenNew, reservationsPending, lowStock, total: kitchenNew + reservationsPending + lowStock };
        },

        /** Danh sách việc cần xử lý (trang Tổng quan và bảng của chuông) */
        attentionItems() {
            const today = U.todayLocal();
            const now = U.nowTime();
            const items = [];
            const kitchenNew = db.kitchenOrders.filter(k => k.status === 'new');
            if (kitchenNew.length) items.push({ urgent: true, icon: 'fa-fire', tone: 'danger', page: 'kitchen', text: `${kitchenNew.length} đơn bếp mới chờ chế biến` });
            const pendingRes = db.reservations.filter(r => r.status === 'pending' && r.date >= today);
            if (pendingRes.length) items.push({ urgent: true, icon: 'fa-calendar-check', tone: 'warning', page: 'reservations', text: `${pendingRes.length} đặt bàn chờ xác nhận` });
            const low = db.ingredients.filter(g => store.stockLevel(g) === 'low');
            if (low.length) items.push({ urgent: true, icon: 'fa-triangle-exclamation', tone: 'danger', page: 'ingredients', text: `${low.length} nguyên liệu sắp hết: ${low.map(g => `${g.name} (nên nhập thêm ${U.fmtNumber(store.reorderQty(g))} ${g.unit})`).join(', ')}` });
            const soldOut = db.foods.filter(f => f.status === 'available' && store.portionsLeft(f) === 0);
            if (soldOut.length) items.push({ urgent: false, icon: 'fa-bowl-food', tone: 'warning', page: 'foods', text: `${soldOut.length} món hết nguyên liệu, chưa bán được: ${soldOut.map(f => f.name).join(', ')}` });
            const late = db.reservations.filter(r => r.status === 'confirmed' && r.date === today && r.time <= now);
            if (late.length) items.push({ urgent: false, icon: 'fa-user-clock', tone: 'warning', page: 'reservations', text: `${late.length} khách đặt bàn đã đến giờ nhưng chưa check-in` });
            const arriving = db.reservations.filter(r => r.status === 'confirmed' && r.date === today && r.time > now);
            if (arriving.length) items.push({ urgent: false, icon: 'fa-clock', tone: 'info', page: 'reservations', text: `${arriving.length} lượt đặt bàn sắp đến hôm nay (${arriving.map(r => r.time).sort().join(', ')})` });
            const pendingInv = db.invoices.filter(i => i.status === 'pending');
            if (pendingInv.length) items.push({ urgent: false, icon: 'fa-hourglass-half', tone: 'info', page: 'invoices', text: `${pendingInv.length} hóa đơn chờ thanh toán` });
            const trips = store.activeTrips();
            if (trips.length) items.push({ urgent: false, icon: 'fa-van-shuttle', tone: 'info', page: 'delivery', text: `${trips.length} chuyến xe đang đón khách` });
            return items;
        },

        /** Sắp xếp mới nhất trước theo ngày, giờ, id */
        byNewest(a, b) {
            const ka = (a.date || '') + ' ' + (a.time || '');
            const kb = (b.date || '') + ' ' + (b.time || '');
            if (ka !== kb) return ka < kb ? 1 : -1;
            return b.id - a.id;
        }
    };

    window.addEventListener('pagehide', store.flush);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') store.flush();
    });

    QN.store = store;
})(window.QN);
