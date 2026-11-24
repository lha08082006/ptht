'use strict';
/* =========================================================
   DỮ LIỆU LỚN (giả lập quán chạy 90 ngày ≈ 1.000 hóa đơn, 4.000 phiếu kho)
   Dữ liệu được lưu lâu dài trên trình duyệt nên các danh sách lớn dần theo thời gian:
   bảng dài phải phân trang, bếp chỉ hiện đơn xong của hôm nay, đặt bàn đã qua xuống dưới,
   số liệu dài vẫn vừa thẻ, tỷ trọng nhỏ không hiện "0%", báo khi không lưu được.
   Chạy riêng: node tests/du-lieu-lon.js
   ========================================================= */
const { openApp, state, go, lastToast, rowCount, shot, runStandalone } = require('./lib');

/** Bán hàng 90 ngày qua bằng chính các hàm nghiệp vụ của web (trừ kho theo định mức, nhập bù khi chạm định mức) */
function simulate(page) {
    return page.evaluate(() => {
        const S = QN.store, U = QN.utils;
        let seed = 7;
        const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
        const foods = S.db.foods.filter(f => f.status === 'available');
        const methods = S.PAY_METHODS.map(m => m.id);
        for (let off = -90; off <= -1; off++) {
            const date = U.addDays(U.todayLocal(), off);
            S.db.ingredients.forEach(g => {
                if (S.stockLevel(g) === 'ok') return;
                const qty = S.minStock(g) * 4;
                g.stock = S.round3(g.stock + qty);
                S.db.receipts.push({ id: S.nextId('receipts'), type: 'import', date, time: '08:00', empId: 1, supplierId: g.supplierId, ingredientId: g.id, ingredientName: g.name, qty, unitPrice: g.price, total: Math.round(qty * g.price), note: '' });
            });
            const n = 8 + rnd(7);
            for (let k = 0; k < n; k++) {
                const lines = [];
                const kinds = 2 + rnd(3);
                for (let j = 0; j < kinds; j++) {
                    const f = foods[rnd(foods.length)];
                    if (lines.some(l => l.foodId === f.id)) continue;
                    lines.push({ foodId: f.id, name: f.name, category: f.category, price: f.price, cost: S.foodCost(f) || 0, qty: f.category === 'Đồ uống' ? 2 + rnd(8) : 1 + rnd(2) });
                }
                if (S.shortages(lines).length) continue;
                const time = U.pad2(17 + rnd(5)) + ':' + U.pad2(rnd(60));
                const id = S.nextId('invoices');
                const total = U.sum(lines, l => l.price * l.qty);
                S.db.invoices.push({ id, date, time, tableId: 1 + rnd(20), custId: rnd(7), empId: [2, 6][rnd(2)], items: lines, total, voucher: '', voucherPercent: 0, discount: 0, finalTotal: total, status: 'paid', payMethod: methods[rnd(4)], txId: 'TX' + id, paidAt: date + 'T' + time });
                S.consumeForOrder(lines, { invoiceId: id, empId: 2, date, time });
                S.db.kitchenOrders.push({ id: S.nextId('kitchenOrders'), invoiceId: id, tableId: 1, status: 'done', date, time, items: lines.map(l => ({ foodId: l.foodId, name: l.name, qty: l.qty })) });
            }
            if (off % 9 === 0) S.db.reservations.push({ id: S.nextId('reservations'), name: 'Khách cũ ' + -off, phone: '09000' + String(10000 + -off).slice(-5), date, time: '19:00', guests: 4, tableId: 3, status: off % 18 === 0 ? 'pending' : 'confirmed', note: '', qr: 'RES-OLD-' + -off });
        }
        QN.app.changed();
        S.flush();
        return { invoices: S.db.invoices.length, receipts: S.db.receipts.length, bytes: (localStorage.getItem('qntd.data') || '').length };
    });
}

module.exports = async function duLieuLon(browser, check) {
    const p = await openApp(browser);
    const size = await simulate(p);
    check('Giả lập 90 ngày: ~1.000 hóa đơn, ~4.000 phiếu kho, vẫn lưu được (dưới 4,5 MB)', size.invoices > 900 && size.receipts > 3000 && size.bytes > 0 && size.bytes < 4.5e6, size);
    await p.reload({ waitUntil: 'load' });

    /* ---------- BẢNG DÀI: 50 DÒNG + "XEM THÊM" ---------- */
    const t0 = await state(p, () => { const t = performance.now(); QN.app.navigateTo('inventory'); return performance.now() - t; });
    check('Trang phiếu kho (4.000 phiếu) vẽ dưới 0,5 giây', t0 < 500, Math.round(t0) + 'ms');
    check('Phiếu kho chỉ hiện 50 dòng đầu + nút "Xem thêm"', (await rowCount(p, 'inventoryTableBody')) === 50 && (await p.textContent('#inventoryTableBody .table__more')).includes('Xem thêm 50 dòng'));
    await go(p, 'invoices');
    check('Hóa đơn: 50 dòng đầu, ghi rõ đang hiện bao nhiêu / tổng', (await rowCount(p, 'invoiceTableBody')) === 50 && (await p.textContent('#invoiceTableBody .table__more')).includes('/ ' + await state(p, () => QN.utils.fmtNumber(QN.store.db.invoices.length))));
    await p.click('#invoiceTableBody [data-action="table-more"]');
    check('Bấm "Xem thêm" → hiện thêm 50 dòng, focus vẫn ở nút', (await rowCount(p, 'invoiceTableBody')) === 100 && await state(p, () => document.activeElement.dataset.action === 'table-more'));
    await go(p, 'dashboard');
    await go(p, 'invoices');
    check('Chuyển trang rồi quay lại → về 50 dòng đầu', (await rowCount(p, 'invoiceTableBody')) === 50);
    await p.fill('#searchInvoice', 'HD015');
    await p.waitForTimeout(50);
    check('Tìm kiếm vẫn tìm trên toàn bộ dữ liệu (không chỉ 50 dòng đang hiện)', (await rowCount(p, 'invoiceTableBody')) === 1);
    await p.fill('#searchInvoice', '');

    /* ---------- BẾP: CHỈ ĐƠN XONG CỦA HÔM NAY ---------- */
    await go(p, 'kitchen');
    const kitchen = await state(p, () => ({
        done: document.querySelectorAll('#kanbanDone .ticket').length,
        doneToday: QN.store.db.kitchenOrders.filter(k => k.status === 'done' && k.date === QN.utils.todayLocal()).length,
        title: document.getElementById('kanbanDoneTitle').textContent,
        count: document.getElementById('kanbanDoneCount').textContent
    }));
    check('Bếp: cột "Hoàn thành hôm nay" không kéo theo ~1.000 đơn cũ', kitchen.done === kitchen.doneToday && kitchen.title === 'Hoàn thành hôm nay' && kitchen.count === String(kitchen.doneToday), kitchen);

    /* ---------- ĐẶT BÀN: SẮP TỚI LÊN TRƯỚC, LỊCH ĐÃ QUA "QUÁ HẠN" ---------- */
    await go(p, 'reservations');
    const res = await state(p, () => {
        const rows = [...document.querySelectorAll('#reservationTableBody tr')].map(tr => tr.textContent.replace(/\s+/g, ' '));
        const overdue = [...document.querySelectorAll('#reservationTableBody tr')].filter(tr => tr.textContent.includes('Quá hạn'));
        return {
            first: rows[0],
            overdue: overdue.length,
            overdueActions: overdue.every(tr => [...tr.querySelectorAll('[data-action]')].map(b => b.dataset.action).join() === 'reservation-cancel'),
            lastIsOld: rows[rows.length - 1].includes('Khách cũ 90')
        };
    });
    check('Đặt bàn: lịch hôm nay / sắp tới lên đầu, lịch cũ nhất xuống cuối', res.first.includes('Hôm nay') && res.lastIsOld, res);
    check('Lịch đã qua mà khách chưa đến → "Quá hạn", chỉ còn nút Hủy', res.overdue === 10 && res.overdueActions, res);
    check('Chuông không đếm đặt bàn "chờ xác nhận" đã qua ngày', await state(p, () => QN.store.attention().reservationsPending === 1));

    /* ---------- BÁO CÁO 90 NGÀY ---------- */
    await state(p, () => { const U = QN.utils; document.getElementById('revDateFrom').value = U.addDays(U.todayLocal(), -89); document.getElementById('revDateTo').value = U.todayLocal(); QN.app.navigateTo('report-revenue'); });
    await p.waitForTimeout(150);
    const rev = await state(p, () => {
        const fits = [...document.querySelectorAll('.page.is-active .stat__value--fit')].map(el => {
            const r = document.createRange();
            r.selectNodeContents(el);
            return { id: el.id, text: el.textContent, width: r.getBoundingClientRect().width, box: el.clientWidth };
        });
        return {
            title: document.getElementById('revChartTitle').textContent,
            overflow: fits.filter(f => f.width > f.box + 0.5),
            pendingPct: [...document.querySelectorAll('#revenueStatusChart .legend__item')].map(li => li.textContent.replace(/\s+/g, ' ').trim())
        };
    });
    check('90 ngày: biểu đồ gom theo tuần', rev.title === 'Doanh thu theo tuần', rev.title);
    check('Số liệu hàng trăm triệu vẫn nằm gọn trong thẻ (không bị cắt "…")', rev.overflow.length === 0, rev.overflow);
    check('Tỷ trọng rất nhỏ hiện "<1%", gần trọn hiện ">99%" (không hiện 0% / 100%)', rev.pendingPct.some(t => t.includes('Chờ thanh toán') && t.endsWith('<1%')) && rev.pendingPct.some(t => t.includes('Đã thanh toán') && t.endsWith('>99%')), rev.pendingPct);
    await shot(p, 'dll-bao-cao');

    const m = await openApp(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await simulate(m);
    await state(m, () => { const U = QN.utils; document.getElementById('revDateFrom').value = U.addDays(U.todayLocal(), -89); document.getElementById('revDateTo').value = U.todayLocal(); QN.app.navigateTo('report-revenue'); });
    await m.waitForTimeout(150);
    const mobile = await state(m, () => {
        const btn = document.querySelector('#revenueTableBody [data-action="table-more"]').getBoundingClientRect();
        return { height: document.documentElement.scrollHeight, btnLeft: btn.left, btnRight: btn.right, vw: innerWidth };
    });
    check('Điện thoại: báo cáo 90 ngày không dài hàng chục nghìn pixel', mobile.height < 8000, mobile);
    check('Điện thoại: nút "Xem thêm" nằm trong màn hình dù bảng cuộn ngang', mobile.btnLeft >= 0 && mobile.btnRight <= mobile.vw, mobile);

    /* ---------- BÁO KHI KHÔNG LƯU ĐƯỢC ---------- */
    await state(p, () => {
        Storage.prototype._setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function () { throw new DOMException('Quota', 'QuotaExceededError'); };
        QN.store.db.customers.push({ id: 999, name: 'Khách thử bộ nhớ', phone: '0999999999' });
        QN.app.changed();
        QN.store.flush();
    });
    check('Bộ nhớ trình duyệt đầy → báo rõ cho người dùng (không im lặng mất dữ liệu)', (await lastToast(p)).includes('Không lưu được dữ liệu'));
    await state(p, () => { Storage.prototype.setItem = Storage.prototype._setItem; });

    const errors = [p, m].flatMap(x => x._errors);
    check('Không có lỗi console', errors.length === 0, errors);
};

if (require.main === module) runStandalone(module.exports, 'Dữ liệu lớn');
