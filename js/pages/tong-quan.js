/* =========================================================
   TRANG TỔNG QUAN
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const C = QN.charts;
    const { html } = U;

    /** Danh sách việc cần xử lý (dùng chung cho trang Tổng quan và bảng của chuông) */
    function attentionList(items) {
        if (!items.length) return UI.emptyState('Không có việc nào cần xử lý. Mọi thứ đang ổn!', 'fa-circle-check');
        return html`
            <ul class="attention">
                ${items.map(it => html`
                    <li>
                        <button type="button" class="attention__item" data-action="navigate" data-page="${it.page}">
                            <span class="attention__icon attention__icon--${it.tone}" aria-hidden="true"><i class="fas ${it.icon}"></i></span>
                            <span class="attention__text">${it.text}</span>
                            ${it.urgent ? UI.badge('Cần xử lý', 'danger') : ''}
                            <i class="fas fa-chevron-right attention__go" aria-hidden="true"></i>
                        </button>
                    </li>`)}
            </ul>`;
    }

    function paidOn(day) {
        return S.db.invoices.filter(i => i.status === 'paid' && S.paidDate(i) === day);
    }

    function renderToday() {
        const today = U.todayLocal();
        const yesterday = U.addDays(today, -1);
        const paidToday = paidOn(today);
        const revenue = U.sum(paidToday, i => i.finalTotal);
        const revenueYesterday = U.sum(paidOn(yesterday), i => i.finalTotal);
        const pending = S.db.invoices.filter(i => i.status === 'pending');

        UI.setText('todayRevenue', U.fmtMoney(revenue));
        UI.setText('todayRevenueSub', `${paidToday.length} hóa đơn đã thanh toán · ${pending.length} đang chờ (${U.fmtMoney(U.sum(pending, i => i.finalTotal))})`);

        // So với hôm qua TÍNH ĐẾN CÙNG GIỜ NÀY (so với cả ngày hôm qua thì buổi chiều lúc nào cũng "giảm").
        // Mũi tên + chữ, không chỉ dựa vào màu.
        const nowHM = U.nowTime();
        const paidTime = i => String(i.paidAt || '').slice(11, 16) || i.time || '';
        const yesterdaySoFar = U.sum(paidOn(yesterday).filter(i => paidTime(i) <= nowHM), i => i.finalTotal);
        const delta = U.byId('todayDelta');
        if (yesterdaySoFar > 0) {
            const change = (revenue - yesterdaySoFar) / yesterdaySoFar;
            const word = change > 0 ? 'Tăng' : change < 0 ? 'Giảm' : 'Bằng';
            delta.className = 'delta' + (change > 0 ? ' delta--up' : change < 0 ? ' delta--down' : '');
            delta.innerHTML = html`<i class="fas ${change >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}" aria-hidden="true"></i>${word}${change ? ' ' + U.fmtPercent(Math.abs(change)) : ''} so với cùng giờ hôm qua (${U.fmtMoney(yesterdaySoFar)})`;
        } else {
            delta.className = 'delta';
            delta.textContent = revenueYesterday > 0
                ? `Hôm qua đến ${nowHM} chưa thu hóa đơn nào (cả ngày: ${U.fmtMoney(revenueYesterday)})`
                : 'Hôm qua chưa có doanh thu để so sánh';
        }

        const days = [];
        for (let k = 6; k >= 0; k--) days.push(U.addDays(today, -k));
        C.columns(U.byId('todayChart'), {
            title: 'Doanh thu 7 ngày gần nhất',
            compact: true,
            data: days.map(day => {
                const value = U.sum(paidOn(day), i => i.finalTotal);
                return {
                    label: day === today ? 'Hôm nay' : U.fmtDateShort(day), tip: U.fmtDate(day),
                    value, valueText: U.fmtMoney(value), short: U.fmtShortMoney(value)
                };
            }),
            emptyText: 'Chưa có doanh thu trong 7 ngày qua'
        });
    }

    function render() {
        const db = S.db;
        const today = U.todayLocal();
        const count = (list, fn) => list.filter(fn).length;

        renderToday();
        U.byId('attentionList').innerHTML = attentionList(S.attentionItems());

        const upcoming = count(db.reservations, r => (r.status === 'pending' || r.status === 'confirmed') && r.date >= today);
        UI.setText('statCustomers', U.fmtNumber(db.customers.length));
        UI.setText('statCustomersSub', `${upcoming} lượt đặt bàn sắp tới`);

        const availableFoods = count(db.foods, f => f.status === 'available');
        UI.setText('statFoods', U.fmtNumber(db.foods.length));
        UI.setText('statFoodsSub', `${availableFoods} đang phục vụ · ${db.foods.length - availableFoods} hết món`);

        const occupied = count(db.tables, t => t.status === 'occupied');
        const reserved = count(db.tables, t => t.status === 'reserved');
        UI.setText('statTables', U.fmtNumber(db.tables.length));
        UI.setText('statTablesSub', `${occupied} đang dùng · ${reserved} đã đặt`);

        const pending = count(db.invoices, i => i.status === 'pending');
        UI.setText('statInvoices', U.fmtNumber(db.invoices.length));
        UI.setText('statInvoicesSub', `${pending} chờ thanh toán`);

        const waiters = count(db.employees, e => e.role === 'Phục vụ');
        const drivers = count(db.employees, e => e.role === 'Tài xế');
        UI.setText('statEmployees', U.fmtNumber(db.employees.length));
        UI.setText('statEmployeesSub', `${waiters} phục vụ · ${drivers} tài xế`);

        const kitchenNew = count(db.kitchenOrders, k => k.status === 'new');
        const kitchenCooking = count(db.kitchenOrders, k => k.status === 'cooking');
        UI.setText('statKitchen', U.fmtNumber(kitchenNew + kitchenCooking));
        UI.setText('statKitchenSub', `${kitchenNew} đơn mới · ${kitchenCooking} đang chế biến`);

        const recent = db.invoices.slice().sort(S.byNewest).slice(0, 5);
        UI.renderRows('recentOrders', recent.map(inv => html`
            <tr>
                <td class="t-code">${U.code('HD', inv.id)}</td>
                <td class="nowrap">${U.fmtRelativeDate(inv.date)} <span class="text-muted">${inv.time}</span></td>
                <td class="nowrap">${S.tableName(inv.tableId)}</td>
                <td>${S.customerName(inv.custId)}</td>
                <td class="num t-strong">${U.fmtMoney(inv.finalTotal)}</td>
                <td>${UI.statusBadge('invoice', inv.status)}</td>
            </tr>`), { empty: 'Chưa có hóa đơn nào' });
    }

    QN.actions['reset-data'] = async () => {
        const ok = await UI.confirm({
            title: 'Khôi phục dữ liệu mẫu?',
            message: 'Mọi thay đổi đã lưu trên trình duyệt này (khách hàng, hóa đơn, phiếu kho…) sẽ bị xóa và thay bằng dữ liệu mẫu mới.',
            confirmText: 'Khôi phục',
            tone: 'danger',
            icon: 'fa-rotate-left'
        });
        if (!ok) return;
        S.reset();
        QN.orders.clearCart();
        QN.pages['report-revenue'].init();
        QN.app.navigateTo('dashboard');
        UI.toast('Đã khôi phục dữ liệu mẫu.', 'success');
    };

    QN.pages.dashboard = { render, attentionList };
})(window.QN);
