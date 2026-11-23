/* =========================================================
   TRANG TỔNG QUAN
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const { html } = U;

    function render() {
        const db = S.db;
        const today = U.todayLocal();
        const count = (list, fn) => list.filter(fn).length;

        const upcoming = count(db.reservations, r => r.status !== 'cancelled' && r.date >= today);
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

    QN.pages.dashboard = { render };
})(window.QN);
