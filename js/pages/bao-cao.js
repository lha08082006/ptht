/* =========================================================
   BÁO CÁO - THỐNG KÊ: tài chính, món bán chạy, hàng hóa & tồn kho
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const C = QN.charts;
    const { html } = U;

    /* ---------------- BÁO CÁO TÀI CHÍNH ---------------- */
    function setDefaultRange() {
        const to = U.todayLocal();
        U.byId('revDateFrom').value = U.addDays(to, -6);
        U.byId('revDateTo').value = to;
    }

    function renderRevenue() {
        const fromEl = U.byId('revDateFrom');
        const toEl = U.byId('revDateTo');
        if (!fromEl.value || !toEl.value) setDefaultRange();
        const from = fromEl.value;
        const to = toEl.value;
        const invalid = from > to;
        fromEl.toggleAttribute('aria-invalid', invalid);
        toEl.toggleAttribute('aria-invalid', invalid);
        if (invalid) {
            UI.toast('“Từ ngày” phải trước hoặc bằng “Đến ngày”.', 'warning');
            return;
        }

        const list = S.db.invoices.filter(i => i.date >= from && i.date <= to).sort(S.byNewest);
        const paid = list.filter(i => i.status === 'paid');
        const pending = list.filter(i => i.status === 'pending');
        const revenue = U.sum(paid, i => i.finalTotal);
        const pendingTotal = U.sum(pending, i => i.finalTotal);
        const discount = U.sum(paid, i => i.discount);
        const span = U.daysBetween(from, to) + 1;

        UI.setText('revTotal', U.fmtMoney(revenue));
        UI.setText('revTotalSub', discount ? `Đã trừ ${U.fmtMoney(discount)} giảm giá` : 'Không có giảm giá trong kỳ');
        UI.setText('revPending', U.fmtMoney(pendingTotal));
        UI.setText('revPendingSub', `${pending.length} hóa đơn chưa thanh toán`);
        UI.setText('revCount', `${paid.length}/${list.length}`);
        UI.setText('revCountSub', `${span} ngày · ${U.fmtDateShort(from)} – ${U.fmtDateShort(to)}`);
        UI.setText('revAvg', U.fmtMoney(paid.length ? Math.round(revenue / paid.length) : 0));
        UI.setText('revAvgSub', 'Trên hóa đơn đã thanh toán');

        // Doanh thu theo ngày: khoảng ≤ 31 ngày thì hiện đủ từng ngày (kể cả ngày bằng 0)
        const byDay = {};
        paid.forEach(i => { byDay[i.date] = (byDay[i.date] || 0) + i.finalTotal; });
        let days = Object.keys(byDay).sort();
        if (span <= 31) {
            days = [];
            for (let k = 0; k < span; k++) days.push(U.addDays(from, k));
        }
        C.columns(U.byId('revenueBarChart'), {
            title: 'Doanh thu theo ngày',
            data: days.map(d => ({
                label: U.fmtDateShort(d), tip: U.fmtDate(d),
                value: byDay[d] || 0, valueText: U.fmtMoney(byDay[d] || 0), short: U.fmtMillions(byDay[d] || 0)
            })),
            emptyText: 'Chưa có doanh thu trong khoảng ngày này'
        });

        C.segments(U.byId('revenueStatusChart'), {
            title: 'Tỷ lệ thanh toán',
            hero: revenue + pendingTotal > 0 ? { value: U.fmtPercent(revenue / (revenue + pendingTotal)), label: 'giá trị hóa đơn đã thu' } : null,
            parts: [
                { label: 'Đã thanh toán', value: revenue, valueText: U.fmtMoney(revenue), color: C.COLORS.good },
                { label: 'Chờ thanh toán', value: pendingTotal, valueText: U.fmtMoney(pendingTotal), color: C.COLORS.warning, dark: true }
            ],
            note: discount ? `Giảm giá voucher trong kỳ: ${U.fmtMoney(discount)} (đã trừ vào doanh thu).` : '',
            emptyText: 'Chưa có hóa đơn trong khoảng ngày này'
        });

        // Màu gắn với từng phương thức (cố định), không đổi theo thứ hạng
        C.segments(U.byId('payMethodChart'), {
            title: 'Phương thức thanh toán',
            tall: false,
            parts: S.PAY_METHODS.map((m, i) => {
                const value = U.sum(paid.filter(p => p.payMethod === m.id), p => p.finalTotal);
                return { label: m.id, value, valueText: U.fmtMoney(value), color: C.COLORS.series[i] };
            }),
            emptyText: 'Chưa có hóa đơn đã thanh toán trong khoảng ngày này'
        });

        // Nguyên liệu tiêu thụ = phiếu xuất kho trong khoảng ngày (đúng với tên biểu đồ)
        const used = {};
        S.db.receipts.filter(r => r.type === 'export' && r.date >= from && r.date <= to).forEach(r => {
            const x = used[r.ingredientId] || (used[r.ingredientId] = { name: r.ingredientName, qty: 0, cost: 0, id: r.ingredientId });
            x.qty += r.qty;
            x.cost += r.total;
        });
        C.bars(U.byId('consumptionChart'), {
            title: 'Nguyên liệu tiêu thụ',
            data: Object.values(used).sort((a, b) => b.cost - a.cost).map(x => {
                const unit = (S.get('ingredients', x.id) || {}).unit || '';
                return { label: x.name, value: x.cost, valueText: U.fmtMoney(x.cost), note: `· ${U.fmtNumber(x.qty)} ${unit}` };
            }),
            emptyText: 'Không có phiếu xuất kho trong khoảng ngày này'
        });

        UI.setText('revenueTableMeta', `${list.length} hóa đơn`);
        UI.renderRows('revenueTableBody', list.map(inv => html`
            <tr>
                <td class="t-code">${U.code('HD', inv.id)}</td>
                <td class="nowrap">${U.fmtDate(inv.date)}</td>
                <td class="nowrap">${S.tableName(inv.tableId)}</td>
                <td>${S.customerName(inv.custId)}</td>
                <td class="num">${inv.items.length}</td>
                <td class="num t-strong">${U.fmtMoney(inv.finalTotal)}</td>
                <td class="nowrap">${inv.payMethod || html`<span class="text-muted">—</span>`}</td>
                <td>${UI.statusBadge('invoice', inv.status)}</td>
            </tr>`), { empty: 'Không có hóa đơn trong khoảng ngày này' });
    }

    QN.forms['revenue-range'] = () => renderRevenue();

    /* ---------------- BÁO CÁO MÓN BÁN CHẠY ---------------- */
    function renderBestseller() {
        const paid = S.db.invoices.filter(i => i.status === 'paid');
        // Gom theo mã món (đổi tên món vẫn đúng); danh mục lấy theo lúc bán
        const map = new Map();
        paid.forEach(inv => inv.items.forEach(it => {
            const key = it.foodId != null ? 'id:' + it.foodId : 'name:' + it.name;
            if (!map.has(key)) {
                const food = it.foodId != null ? S.get('foods', it.foodId) : null;
                map.set(key, { name: food ? food.name : it.name, category: it.category || (food && food.category) || 'Khác', qty: 0, revenue: 0, orders: 0 });
            }
            const x = map.get(key);
            x.qty += it.qty;
            x.revenue += it.price * it.qty;
            x.orders += 1;
        }));
        const list = [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
        const totalQty = U.sum(list, x => x.qty);
        const totalRevenue = U.sum(list, x => x.revenue);
        const top = list[0];

        UI.setText('bsTop', top ? top.name : '—');
        UI.setText('bsTopSub', top ? `${top.qty} phần · ${U.fmtMoney(top.revenue)}` : 'Chưa có dữ liệu');
        UI.setText('bsQty', U.fmtNumber(totalQty));
        UI.setText('bsQtySub', `Từ ${paid.length} hóa đơn đã thanh toán`);
        UI.setText('bsRevenue', U.fmtMoney(totalRevenue));
        UI.setText('bsKinds', U.fmtNumber(list.length));
        UI.setText('bsKindsSub', `Trên ${S.db.foods.length} món trong thực đơn`);

        C.bars(U.byId('bestsellerChart'), {
            title: 'Top món bán chạy theo số phần',
            data: list.slice(0, 8).map((x, i) => ({ label: x.name, value: x.qty, valueText: `${x.qty} phần`, rank: i + 1 })),
            emptyText: 'Chưa có món nào được bán'
        });

        const byCategory = {};
        list.forEach(x => { byCategory[x.category] = (byCategory[x.category] || 0) + x.revenue; });
        C.bars(U.byId('categoryChart'), {
            title: 'Doanh thu theo danh mục',
            data: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({
                label: name, value, valueText: U.fmtMoney(value), note: '· ' + U.fmtPercent(totalRevenue ? value / totalRevenue : 0)
            })),
            emptyText: 'Chưa có doanh thu'
        });

        C.bars(U.byId('foodRevenueChart'), {
            title: 'Doanh thu theo món',
            data: list.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(x => ({
                label: x.name, value: x.revenue, valueText: U.fmtMoney(x.revenue)
            })),
            emptyText: 'Chưa có doanh thu'
        });

        UI.renderRows('bestsellerTableBody', list.map((x, i) => html`
            <tr>
                <td><span class="rank${i < 3 ? ' rank--' + (i + 1) : ''}">${i + 1}</span></td>
                <td class="t-strong">${x.name}</td>
                <td class="nowrap">${x.category}</td>
                <td class="num t-strong">${U.fmtNumber(x.qty)}</td>
                <td class="num">${U.fmtMoney(x.revenue)}</td>
                <td class="num">${U.fmtPercent(totalRevenue ? x.revenue / totalRevenue : 0, 1)}</td>
                <td class="num">${(x.orders ? x.qty / x.orders : 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</td>
            </tr>`), { empty: 'Chưa có món nào được bán' });
    }

    /* ---------------- BÁO CÁO HÀNG HÓA & TỒN KHO ---------------- */
    function renderStock() {
        const ingredients = S.db.ingredients;
        const receipts = S.db.receipts;
        const imports = receipts.filter(r => r.type === 'import');
        const exports = receipts.filter(r => r.type === 'export');
        const totalValue = U.sum(ingredients, g => g.stock * g.price);
        const low = ingredients.filter(g => S.stockLevel(g) === 'low');

        UI.setText('stValue', U.fmtMoney(totalValue));
        UI.setText('stValueSub', `${ingredients.length} loại nguyên liệu`);
        UI.setText('stImport', U.fmtMoney(U.sum(imports, r => r.total)));
        UI.setText('stImportSub', `${imports.length} phiếu nhập`);
        UI.setText('stExport', U.fmtMoney(U.sum(exports, r => r.total)));
        UI.setText('stExportSub', `${exports.length} phiếu xuất`);
        UI.setText('stLow', U.fmtNumber(low.length));
        UI.setText('stLowSub', low.length ? low.map(g => g.name).join(', ') : `Không có nguyên liệu nào ≤ ${S.STOCK_LOW}`);

        // Màu thể hiện trạng thái tồn kho (kèm chú thích và nhãn chữ, không chỉ dựa vào màu)
        const levelColor = { low: C.COLORS.critical, medium: C.COLORS.warning, ok: C.COLORS.good };
        C.bars(U.byId('stockBarChart'), {
            title: 'Tồn kho theo nguyên liệu',
            legend: [
                { label: S.STATUS.stock.ok.label, color: levelColor.ok },
                { label: S.STATUS.stock.medium.label, color: levelColor.medium },
                { label: S.STATUS.stock.low.label, color: levelColor.low }
            ],
            data: ingredients.slice().sort((a, b) => a.stock - b.stock).map(g => {
                const level = S.stockLevel(g);
                return {
                    label: g.name, value: g.stock, valueText: `${U.fmtNumber(g.stock)} ${g.unit}`,
                    note: level === 'low' ? '· Sắp hết' : '', color: levelColor[level],
                    tip: `${g.name} — ${S.STATUS.stock[level].label}`
                };
            }),
            emptyText: 'Chưa có nguyên liệu'
        });

        C.bars(U.byId('stockValueChart'), {
            title: 'Phân bổ giá trị kho',
            data: ingredients.map(g => ({ name: g.name, value: g.stock * g.price }))
                .sort((a, b) => b.value - a.value)
                .map(x => ({ label: x.name, value: x.value, valueText: U.fmtMoney(x.value), note: '· ' + U.fmtPercent(totalValue ? x.value / totalValue : 0) })),
            emptyText: 'Kho đang trống'
        });

        UI.renderRows('stockHistoryBody', receipts.slice().sort(S.byNewest).map(r => html`
            <tr>
                <td class="t-code">${U.code('PK', r.id)}</td>
                <td>${UI.statusBadge('receipt', r.type)}</td>
                <td class="nowrap">${U.fmtDate(r.date)}</td>
                <td>${S.employeeName(r.empId)}</td>
                <td>${r.supplierId ? S.supplierName(r.supplierId) : html`<span class="text-muted">—</span>`}</td>
                <td>${r.ingredientName}</td>
                <td class="num">${U.fmtNumber(r.qty)}</td>
                <td class="num t-strong">${U.fmtMoney(r.total)}</td>
            </tr>`), { empty: 'Chưa có phiếu kho nào' });

        UI.renderRows('stockTableBody', ingredients.map((g, i) => {
            const own = receipts.filter(r => r.ingredientId === g.id);
            const inQty = U.sum(own.filter(r => r.type === 'import'), r => r.qty);
            const outQty = U.sum(own.filter(r => r.type === 'export'), r => r.qty);
            return html`
                <tr>
                    <td>${i + 1}</td>
                    <td class="t-strong">${g.name}</td>
                    <td>${g.unit}</td>
                    <td class="num text-success">${U.fmtNumber(inQty)}</td>
                    <td class="num text-danger">${U.fmtNumber(outQty)}</td>
                    <td class="num t-strong">${U.fmtNumber(g.stock)}</td>
                    <td class="num">${U.fmtMoney(g.price)}</td>
                    <td class="num">${U.fmtMoney(g.stock * g.price)}</td>
                    <td>${UI.statusBadge('stock', S.stockLevel(g))}</td>
                </tr>`;
        }), { empty: 'Chưa có nguyên liệu' });
    }

    QN.pages['report-revenue'] = { render: renderRevenue, init: setDefaultRange };
    QN.pages['report-bestseller'] = { render: renderBestseller };
    QN.pages['report-stock'] = { render: renderStock };
})(window.QN);
