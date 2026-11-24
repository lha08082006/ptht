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
            pending: { label: 'Chờ TT', long: 'Chờ thanh toán', tone: 'warning' },
            cancelled: { label: 'Đã hủy', long: 'Đã hủy (hủy hết món)', tone: 'neutral' }
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
            completed: { label: 'Hoàn tất', tone: 'success' },
            cancelled: { label: 'Đã hủy', tone: 'neutral' }
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

    /** Hạng khách hàng theo tổng chi tiêu ở các hóa đơn đã thanh toán (cao xuống thấp) */
    const CUSTOMER_TIERS = [
        { label: 'Kim cương', min: 10000000, tone: 'success' },
        { label: 'Vàng', min: 3000000, tone: 'warning' },
        { label: 'Bạc', min: 1000000, tone: 'info' },
        { label: 'Thường', min: 0, tone: 'neutral' }
    ];

    /** Một lịch đặt bàn giữ bàn trong khoảng 3 giờ quanh giờ hẹn (đủ cho một bữa nhậu) */
    const HOLD_MINUTES = 180;
    const toMin = hm => {
        const [h, m] = String(hm || '00:00').split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

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
        CUSTOMER_TIERS,
        restoredFromStorage: false,

        /** Nạp dữ liệu đã lưu; nếu chưa có (hoặc hỏng) thì tạo dữ liệu mẫu */
        init() {
            const saved = readSaved();
            store.restoredFromStorage = !!saved;
            replaceAll(saved || QN.createSeedData());
            store.syncTableHolds();
        },

        /**
         * Trạng thái "Đã đặt" do lịch đặt bàn của HÔM NAY quyết định: mở lại web sang ngày mới,
         * lịch đã quá hạn, lịch của ngày khác… thì bàn trống trở lại. Trả về true nếu có bàn đổi trạng thái.
         */
        syncTableHolds() {
            let changed = false;
            db.tables.forEach(t => {
                if (t.status === 'occupied') return;
                const next = store.todayHold(t.id) ? 'reserved' : 'available';
                if (t.status !== next) {
                    t.status = next;
                    changed = true;
                }
            });
            return changed;
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

        /** Định mức gộp (lượng thật sự xuất kho) = định mức tịnh × (1 + hao hụt %) */
        grossQty(line) {
            return round3((Number(line.qty) || 0) * (1 + (Number(line.waste) || 0) / 100));
        },

        /** Giá vốn 1 phần theo đơn giá nguyên liệu hiện tại (tính trên định mức gộp); null nếu món chưa có định mức */
        foodCost(food) {
            const recipe = store.recipeOf(food);
            if (!recipe.length) return null;
            return Math.round(U.sum(recipe, l => store.grossQty(l) * store.get('ingredients', l.ingredientId).price));
        },

        /** Tổng nguyên liệu cần cho các dòng món [{ foodId, qty }] → Map(mã nguyên liệu → lượng) */
        ingredientNeeds(lines) {
            const need = new Map();
            lines.forEach(line => store.recipeOf(store.get('foods', line.foodId)).forEach(l => {
                const id = Number(l.ingredientId);
                need.set(id, round3((need.get(id) || 0) + store.grossQty(l) * line.qty));
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
                return Math.floor(round3(free / store.grossQty(l)) + 1e-9);
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
        consumeForOrder(lines, { invoiceId, empId, date, time, ticketId }) {
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
                    note: 'Xuất bán theo ' + U.code('HD', invoiceId), auto: true, invoiceId, ticketId
                });
                if (!wasLow && store.stockLevel(g) === 'low') newlyLow.push(g);
            });
            return newlyLow;
        },

        /**
         * Hủy một phiếu bếp chưa chế biến (khách đổi ý / gọi nhầm):
         * bỏ đúng số món của phiếu khỏi hóa đơn và tính lại tiền; hoàn kho đúng lượng đã xuất cho phiếu đó
         * (phiếu "Hoàn kho" gắn mã HĐ); hóa đơn hết món thì thành "Đã hủy", trả lượt voucher, trả bàn.
         */
        cancelKitchenOrder(ticket) {
            const inv = ticket.invoiceId ? store.get('invoices', ticket.invoiceId) : null;
            const date = U.todayLocal();
            const time = U.nowTime();
            const lines = ticket.items.map(it => ({ foodId: Number(it.foodId), qty: Number(it.qty) }));
            if (inv && inv.status === 'pending') {
                lines.forEach(l => {
                    let left = l.qty;
                    inv.items.filter(x => Number(x.foodId) === l.foodId).forEach(x => {
                        const take = Math.min(left, x.qty);
                        x.qty -= take;
                        left -= take;
                    });
                });
                inv.items = inv.items.filter(x => x.qty > 0);
                inv.total = U.sum(inv.items, x => x.price * x.qty);
                inv.discount = Math.round(inv.total * (Number(inv.voucherPercent) || 0) / 100);
                inv.finalTotal = inv.total - inv.discount;
                if (!inv.items.length) {
                    inv.status = 'cancelled';
                    inv.cancelledAt = U.nowDateTime();
                    const voucher = inv.voucher ? store.get('vouchers', inv.voucher) : null;
                    if (voucher) voucher.qty += 1;
                }
            }
            // Lượng cần hoàn: đúng các phiếu xuất của lần gửi bếp này; dữ liệu cũ chưa gắn phiếu bếp thì theo định mức hiện tại
            const own = db.receipts.filter(r => r.auto && r.type === 'export' && r.ticketId === ticket.id);
            const back = new Map();
            if (own.length) own.forEach(r => back.set(Number(r.ingredientId), round3((back.get(Number(r.ingredientId)) || 0) + r.qty)));
            else store.ingredientNeeds(lines).forEach((qty, id) => back.set(id, qty));
            const returned = [];
            back.forEach((qty, id) => {
                const g = store.get('ingredients', id);
                if (!g || qty <= 0) return;
                g.stock = round3((Number(g.stock) || 0) + qty);
                db.receipts.push({
                    id: store.nextId('receipts'), type: 'import', date, time, empId: inv ? inv.empId : 0,
                    supplierId: null, ingredientId: g.id, ingredientName: g.name, qty, unitPrice: g.price, total: Math.round(qty * g.price),
                    note: `Hoàn kho do hủy món (${U.code('HD', ticket.invoiceId)})`, auto: true, reversal: true,
                    invoiceId: ticket.invoiceId, ticketId: ticket.id
                });
                returned.push({ ingredient: g, qty });
            });
            store.remove('kitchenOrders', ticket);
            if (inv && inv.status === 'cancelled') {
                const table = store.get('tables', inv.tableId);
                if (table && table.status === 'occupied') store.freeTable(table);
            }
            return { invoice: inv, returned };
        },

        /** Khách hàng: số lần đến, tổng chi tiêu, lần gần nhất, hạng hiện tại và hạng kế tiếp (theo HĐ đã thanh toán) */
        customerStats(custId) {
            const paid = db.invoices.filter(i => i.status === 'paid' && Number(i.custId) === Number(custId));
            const spent = U.sum(paid, i => i.finalTotal);
            return {
                visits: paid.length,
                spent,
                last: paid.map(i => store.paidDate(i)).sort().pop() || '',
                tier: CUSTOMER_TIERS.find(t => spent >= t.min),
                next: CUSTOMER_TIERS.slice().reverse().find(t => t.min > spent) || null
            };
        },

        /** Nhân viên: hóa đơn phục vụ đã thanh toán + doanh thu, chuyến xe đã chạy, phiếu kho đã lập (không tính phiếu tự động) */
        employeeStats(empId) {
            const id = Number(empId);
            const invoices = db.invoices.filter(i => i.status === 'paid' && Number(i.empId) === id);
            return {
                invoices: invoices.length,
                revenue: U.sum(invoices, i => i.finalTotal),
                trips: db.trips.filter(t => Number(t.driverId) === id).length,
                receipts: db.receipts.filter(r => !r.auto && Number(r.empId) === id).length
            };
        },

        /** Loại phiếu kho: nhập, xuất bán (tự động theo định mức), xuất tay, điều chỉnh kiểm kê (dùng cho bộ lọc phiếu kho) */
        receiptKind(r) {
            if (r.stocktake) return 'stocktake';
            if (r.auto) return 'sale'; // xuất bán tự động và phiếu hoàn kho khi hủy món
            return r.type === 'import' ? 'import' : 'export';
        },

        /**
         * Đối chiếu định mức – thực tế của từng nguyên liệu trong kỳ [from, to] (theo phiếu kho):
         *   tồn đầu + nhập − xuất theo định mức − xuất tay ± chênh lệch kiểm kê = tồn cuối
         *   dùng thực tế = xuất theo định mức + xuất tay − chênh lệch kiểm kê
         *   vượt định mức = dùng thực tế − xuất theo định mức (hàng hỏng, thất thoát…)
         */
        bomVariance(from, to) {
            const signed = r => (r.type === 'import' ? r.qty : -r.qty);
            return db.ingredients.map(g => {
                const own = db.receipts.filter(r => Number(r.ingredientId) === g.id);
                const inRange = own.filter(r => r.date >= from && r.date <= to);
                const sumKind = kind => round3(U.sum(inRange.filter(r => store.receiptKind(r) === kind), r => r.qty));
                const opening = round3(U.sum(own.filter(r => r.date < from), signed));
                const imported = sumKind('import');
                // xuất bán trừ đi phần hoàn kho khi hủy món chưa chế biến
                const bom = round3(U.sum(inRange.filter(r => store.receiptKind(r) === 'sale'), r => -signed(r)));
                const manual = sumKind('export');
                const counted = round3(U.sum(inRange.filter(r => r.stocktake), signed)); // + thừa, − thiếu
                const actual = round3(bom + manual - counted);
                const over = round3(actual - bom);
                return {
                    ingredient: g, opening, imported, bom, manual, counted, actual, over,
                    closing: round3(opening + imported - bom - manual + counted),
                    overValue: Math.round(over * g.price),
                    bomValue: Math.round(bom * g.price),
                    overRatio: bom > 0 ? over / bom : null
                };
            });
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
        /** Đặt bàn chờ / đã xác nhận nhưng đã qua ngày, hoặc quá giờ hẹn hơn 3 tiếng mà khách chưa đến */
        reservationOverdue(r) {
            if (r.status !== 'pending' && r.status !== 'confirmed') return false;
            const today = U.todayLocal();
            if (r.date < today) return true;
            return r.date === today && toMin(U.nowTime()) > toMin(r.time) + HOLD_MINUTES;
        },

        /** Các lịch đặt sắp tới (đã xác nhận, chưa quá hạn) của một bàn — để ghi chú trên sơ đồ bàn */
        holdsOfTable(tableId, exceptId) {
            const today = U.todayLocal();
            return db.reservations.filter(r => r.status === 'confirmed' && Number(r.tableId) === Number(tableId) && r.date >= today
                && r.id !== exceptId && !store.reservationOverdue(r))
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        },

        /** Lịch đặt của HÔM NAY đang giữ bàn (bàn hiện "Đã đặt"); lịch của ngày khác không chặn bàn hôm nay */
        todayHold(tableId, exceptId) {
            const today = U.todayLocal();
            return store.holdsOfTable(tableId, exceptId).find(r => r.date === today) || null;
        },

        /** Lịch đặt khác của bàn trùng giờ (cùng ngày, cách nhau dưới 3 giờ) */
        reservationConflict(tableId, date, time, exceptId) {
            return db.reservations.find(r => r.status === 'confirmed' && Number(r.tableId) === Number(tableId) && r.date === date
                && r.id !== exceptId && Math.abs(toMin(r.time) - toMin(time)) < HOLD_MINUTES) || null;
        },

        /**
         * Bàn nhận được lịch đặt { date, time, guests } không: đủ chỗ, không trùng lịch đặt khác;
         * riêng lịch hôm nay trong vòng 3 giờ tới thì bàn còn phải không có khách đang ngồi.
         * Trả về null nếu được, ngược lại là lý do.
         */
        tableBlockReason(table, { date, time, guests, exceptId }) {
            if (!table) return 'Không có bàn';
            if (guests && table.seats < guests) return `${table.name} chỉ có ${table.seats} chỗ`;
            const clash = store.reservationConflict(table.id, date, time, exceptId);
            if (clash) return `${table.name} đã có lịch ${U.code('RES', clash.id)} lúc ${clash.time} cùng ngày`;
            if (date === U.todayLocal() && toMin(time) - toMin(U.nowTime()) < HOLD_MINUTES && table.status === 'occupied') {
                return `${table.name} đang có khách`;
            }
            return null;
        },

        /** Trạng thái bàn khi không còn khách ngồi: có lịch đặt hôm nay thì "Đã đặt", không thì "Trống" */
        freeTable(table) {
            if (!table || store.pendingInvoicesOfTable(table.id).length) return;
            table.status = store.todayHold(table.id) ? 'reserved' : 'available';
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
            const reservationsPending = db.reservations.filter(r => r.status === 'pending' && !store.reservationOverdue(r)).length;
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
            const pendingRes = db.reservations.filter(r => r.status === 'pending' && !store.reservationOverdue(r));
            if (pendingRes.length) items.push({ urgent: true, icon: 'fa-calendar-check', tone: 'warning', page: 'reservations', text: `${pendingRes.length} đặt bàn chờ xác nhận` });
            const low = db.ingredients.filter(g => store.stockLevel(g) === 'low');
            if (low.length) items.push({ urgent: true, icon: 'fa-triangle-exclamation', tone: 'danger', page: 'ingredients', text: `${low.length} nguyên liệu sắp hết: ${low.map(g => `${g.name} (nên nhập thêm ${U.fmtNumber(store.reorderQty(g))} ${g.unit})`).join(', ')}` });
            const soldOut = db.foods.filter(f => f.status === 'available' && store.portionsLeft(f) === 0);
            if (soldOut.length) items.push({ urgent: false, icon: 'fa-bowl-food', tone: 'warning', page: 'foods', text: `${soldOut.length} món hết nguyên liệu, chưa bán được: ${soldOut.map(f => f.name).join(', ')}` });
            const late = db.reservations.filter(r => r.status === 'confirmed' && r.date === today && r.time <= now && !store.reservationOverdue(r));
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
