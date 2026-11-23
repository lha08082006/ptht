/* =========================================================
   KHO DỮ LIỆU & QUY TẮC NGHIỆP VỤ DÙNG CHUNG
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;

    const db = {};

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
            assigned: { label: 'Đã giao xe', tone: 'success' },
            completed: { label: 'Hoàn tất', tone: 'neutral' }
        },
        trip: {
            'Đang đón': { label: 'Đang đón', tone: 'info' }
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

    /** Ngưỡng tồn kho (trước đây lặp lại ở 4 chỗ) */
    const STOCK_LOW = 5;
    const STOCK_MEDIUM = 15;

    const PAY_METHODS = [
        { id: 'Tiền mặt', icon: 'fa-money-bill-wave' },
        { id: 'Chuyển khoản', icon: 'fa-building-columns' },
        { id: 'VNPay', icon: 'fa-credit-card' },
        { id: 'MoMo', icon: 'fa-wallet' }
    ];

    const store = {
        db,
        STATUS,
        STOCK_LOW,
        STOCK_MEDIUM,
        PAY_METHODS,

        init() {
            const seed = QN.createSeedData();
            Object.keys(seed).forEach(key => { db[key] = seed[key]; });
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

        stockLevel(ingredient) {
            const s = Number(ingredient.stock) || 0;
            if (s <= STOCK_LOW) return 'low';
            if (s <= STOCK_MEDIUM) return 'medium';
            return 'ok';
        },

        pendingInvoicesOfTable(tableId) {
            return db.invoices.filter(i => i.status === 'pending' && Number(i.tableId) === Number(tableId));
        },

        confirmedReservationsOfTable(tableId, exceptId) {
            return db.reservations.filter(r => r.status === 'confirmed' && Number(r.tableId) === Number(tableId) && r.id !== exceptId);
        },

        activeTrips() {
            return db.trips.filter(t => t.status === 'Đang đón');
        },

        /** Những việc cần xử lý — hiển thị ở chuông thông báo */
        attention() {
            const kitchenNew = db.kitchenOrders.filter(k => k.status === 'new').length;
            const reservationsPending = db.reservations.filter(r => r.status === 'pending').length;
            const lowStock = db.ingredients.filter(g => store.stockLevel(g) === 'low').length;
            return { kitchenNew, reservationsPending, lowStock, total: kitchenNew + reservationsPending + lowStock };
        },

        /** Sắp xếp mới nhất trước theo ngày, giờ, id */
        byNewest(a, b) {
            const ka = (a.date || '') + ' ' + (a.time || '');
            const kb = (b.date || '') + ' ' + (b.time || '');
            if (ka !== kb) return ka < kb ? 1 : -1;
            return b.id - a.id;
        }
    };

    QN.store = store;
})(window.QN);
