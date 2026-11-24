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

    /* ---------------- BÁO CÁO TÀI CHÍNH ----------------
       Doanh thu tính theo NGÀY THANH TOÁN (tiền thực thu);
       hóa đơn chờ thanh toán tính theo ngày lập. */
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

        const inRange = d => d >= from && d <= to;
        const paid = S.db.invoices.filter(i => i.status === 'paid' && inRange(S.paidDate(i)));
        const pending = S.db.invoices.filter(i => i.status === 'pending' && inRange(i.date));
        const sortKey = i => (i.status === 'paid' ? String(i.paidAt || i.date) : i.date + 'T' + i.time);
        const list = paid.concat(pending).sort((a, b) => sortKey(b).localeCompare(sortKey(a)) || b.id - a.id);
        const revenue = U.sum(paid, i => i.finalTotal);
        const pendingTotal = U.sum(pending, i => i.finalTotal);
        const discount = U.sum(paid, i => i.discount);
        const cogs = U.sum(paid, i => S.invoiceCost(i));
        const profit = revenue - cogs;
        const span = U.daysBetween(from, to) + 1;

        UI.setText('revTotal', U.fmtMoney(revenue));
        UI.setText('revTotalSub', discount ? `Đã trừ ${U.fmtMoney(discount)} giảm giá` : 'Không có giảm giá trong kỳ');
        UI.setText('revPending', U.fmtMoney(pendingTotal));
        UI.setText('revPendingSub', `${pending.length} hóa đơn chưa thanh toán`);
        UI.setText('revCount', `${paid.length}/${list.length}`);
        UI.setText('revCountSub', `Trung bình ${U.fmtMoney(paid.length ? Math.round(revenue / paid.length) : 0)} / hóa đơn`);
        UI.setText('revProfit', U.fmtMoney(profit));
        UI.setText('revProfitSub', revenue ? `Giá vốn ${U.fmtMoney(cogs)} · biên lãi ${U.fmtPercent(profit / revenue)}` : 'Chưa có doanh thu trong kỳ');

        // Doanh thu theo thời gian: ≤ 31 ngày hiện từng ngày; dài hơn thì gom theo tuần (≤ 26 tuần) hoặc tháng,
        // luôn đủ mọi mốc kể cả mốc bằng 0 để trục thời gian không bị co lại
        const buckets = timeBuckets(from, to, span);
        const sums = new Map(buckets.map(bk => [bk.key, 0]));
        paid.forEach(i => {
            const bk = buckets.find(x => S.paidDate(i) >= x.start && S.paidDate(i) <= x.end);
            if (bk) sums.set(bk.key, sums.get(bk.key) + i.finalTotal);
        });
        const unitName = { day: 'ngày', week: 'tuần', month: 'tháng' }[buckets.unit];
        UI.setText('revChartTitle', 'Doanh thu theo ' + unitName);
        UI.setText('revChartSubtitle', 'Theo ngày thanh toán' + (buckets.unit === 'day' ? '' : ` · gom theo ${unitName}`));
        C.columns(U.byId('revenueBarChart'), {
            title: 'Doanh thu theo ' + unitName + ' (theo ngày thanh toán)',
            data: buckets.map(bk => {
                const value = sums.get(bk.key);
                return { label: bk.label, tip: bk.tip, value, valueText: U.fmtMoney(value), short: U.fmtShortMoney(value) };
            }),
            emptyText: 'Chưa có doanh thu trong khoảng ngày này'
        });

        C.segments(U.byId('revenueStatusChart'), {
            title: 'Tỷ lệ thanh toán',
            hero: revenue + pendingTotal > 0 ? { value: U.fmtShare(revenue / (revenue + pendingTotal)), label: 'giá trị hóa đơn đã thu' } : null,
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
        // (phiếu hoàn kho khi hủy món chưa chế biến được trừ ra)
        S.db.receipts.filter(r => (r.type === 'export' || r.reversal) && inRange(r.date)).forEach(r => {
            const x = used[r.ingredientId] || (used[r.ingredientId] = { name: r.ingredientName, qty: 0, cost: 0, id: r.ingredientId });
            const sign = r.reversal ? -1 : 1;
            x.qty = S.round3(x.qty + sign * r.qty);
            x.cost += sign * r.total;
        });
        C.bars(U.byId('consumptionChart'), {
            title: 'Nguyên liệu tiêu thụ',
            data: Object.values(used).filter(x => x.qty > 0).sort((a, b) => b.cost - a.cost).map(x => {
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
                <td class="nowrap">${inv.status === 'paid' ? U.fmtDate(S.paidDate(inv)) : html`<span class="text-muted">—</span>`}</td>
                <td class="nowrap">${S.tableName(inv.tableId)}</td>
                <td>${S.customerName(inv.custId)}</td>
                <td class="num">${inv.items.length}</td>
                <td class="num t-strong">${U.fmtMoney(inv.finalTotal)}</td>
                <td class="nowrap">${inv.payMethod || html`<span class="text-muted">—</span>`}</td>
                <td>${UI.statusBadge('invoice', inv.status)}</td>
            </tr>`), { empty: 'Không có hóa đơn trong khoảng ngày này' });
    }

    /** Chia khoảng ngày thành các mốc liên tục: ngày (≤ 31 ngày), tuần thứ Hai–Chủ nhật (≤ 26 tuần) hoặc tháng */
    function timeBuckets(from, to, span) {
        const out = [];
        if (span <= 31) {
            for (let k = 0; k < span; k++) {
                const d = U.addDays(from, k);
                out.push({ key: d, start: d, end: d, label: U.fmtDateShort(d), tip: U.fmtDate(d) });
            }
            out.unit = 'day';
            return out;
        }
        if (span <= 7 * 26) {
            const weekday = (U.parseISODate(from).getDay() + 6) % 7; // 0 = thứ Hai
            for (let start = U.addDays(from, -weekday); start <= to; start = U.addDays(start, 7)) {
                const s = start < from ? from : start;
                const e = U.addDays(start, 6) > to ? to : U.addDays(start, 6);
                out.push({ key: start, start: s, end: e, label: U.fmtDateShort(s), tip: `Tuần ${U.fmtDateShort(s)} – ${U.fmtDate(e)}` });
            }
            out.unit = 'week';
            return out;
        }
        let y = Number(from.slice(0, 4));
        let m = Number(from.slice(5, 7));
        for (;;) {
            const first = `${y}-${U.pad2(m)}-01`;
            if (first > to) break;
            const next = m === 12 ? `${y + 1}-01-01` : `${y}-${U.pad2(m + 1)}-01`;
            const last = U.addDays(next, -1);
            out.push({
                key: first, start: first < from ? from : first, end: last > to ? to : last,
                label: `${U.pad2(m)}/${String(y).slice(2)}`, tip: `Tháng ${m}/${y}`
            });
            if (m === 12) { y += 1; m = 1; } else { m += 1; }
        }
        out.unit = 'month';
        return out;
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
                map.set(key, { name: food ? food.name : it.name, category: it.category || (food && food.category) || 'Khác', qty: 0, revenue: 0, cost: 0, orders: 0 });
            }
            const x = map.get(key);
            x.qty += it.qty;
            x.revenue += it.price * it.qty;
            x.cost += S.lineCost(it);
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
                label: name, value, valueText: U.fmtMoney(value), note: '· ' + U.fmtShare(totalRevenue ? value / totalRevenue : 0)
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
                <td class="num">${U.fmtMoney(x.revenue - x.cost)}<span class="t-sub">${U.fmtPercent(x.revenue ? (x.revenue - x.cost) / x.revenue : 0)}</span></td>
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
        UI.setText('stLowSub', low.length ? low.map(g => `${g.name} (nhập thêm ${U.fmtNumber(S.reorderQty(g))} ${g.unit})`).join(', ') : 'Không có nguyên liệu nào chạm định mức');

        // Mỗi thanh so với định mức của chính nguyên liệu đó (đầy = gấp đôi định mức = "Đủ dùng"),
        // nên không so kg với thùng. Vạch mờ ở giữa = định mức tối thiểu.
        const levelColor = { low: C.COLORS.critical, medium: C.COLORS.warning, ok: C.COLORS.good };
        const rows = ingredients.map(g => {
            const min = S.minStock(g);
            const level = S.stockLevel(g);
            const target = Math.max(min * 2, 1);
            return { g, min, level, ratio: g.stock / target };
        }).sort((a, b) => a.ratio - b.ratio);
        C.meters(U.byId('stockBarChart'), {
            title: 'Tồn kho so với định mức',
            legend: [
                { label: `${S.STATUS.stock.ok.label} (trên 2× định mức)`, color: levelColor.ok },
                { label: S.STATUS.stock.medium.label, color: levelColor.medium },
                { label: `${S.STATUS.stock.low.label} (≤ định mức)`, color: levelColor.low }
            ],
            data: rows.map(x => ({
                label: x.g.name,
                ratio: x.ratio,
                markAt: x.min > 0 ? 0.5 : null,
                valueText: `${U.fmtNumber(x.g.stock)} ${x.g.unit}`,
                note: `tối thiểu ${U.fmtNumber(x.min)}`,
                color: levelColor[x.level],
                tip: `${x.g.name} — ${S.STATUS.stock[x.level].label}`
            })),
            emptyText: 'Chưa có nguyên liệu'
        });

        C.bars(U.byId('stockValueChart'), {
            title: 'Phân bổ giá trị kho',
            data: ingredients.map(g => ({ name: g.name, value: g.stock * g.price }))
                .sort((a, b) => b.value - a.value)
                .map(x => ({ label: x.name, value: x.value, valueText: U.fmtMoney(x.value), note: '· ' + U.fmtShare(totalValue ? x.value / totalValue : 0) })),
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
                    <td class="num">${U.fmtNumber(S.minStock(g))}</td>
                    <td class="num">${U.fmtMoney(g.price)}</td>
                    <td class="num">${U.fmtMoney(g.stock * g.price)}</td>
                    <td>${UI.statusBadge('stock', S.stockLevel(g))}${S.reorderQty(g) ? html`<span class="t-sub">Nên nhập thêm ${U.fmtNumber(S.reorderQty(g))} ${g.unit}</span>` : ''}</td>
                </tr>`;
        }), { empty: 'Chưa có nguyên liệu' });
    }

    QN.pages['report-revenue'] = { render: renderRevenue, init: setDefaultRange };
    QN.pages['report-bestseller'] = { render: renderBestseller };
    QN.pages['report-stock'] = { render: renderStock };
})(window.QN);
