'use strict';
/* =========================================================
   9 LỖI ĐÃ SỬA (từ lần rà soát mã): mỗi mục tái hiện đúng tình huống gây lỗi.
   Chạy riêng: node tests/loi-review.js
   ========================================================= */
const { openApp, payInvoice, runStandalone } = require('./lib');

const ev = (p, fn, a) => p.evaluate(fn, a);
const open = (browser, now) => openApp(browser, now ? { now } : {});

module.exports = async function loiReview(browser, check) {
    let p = await open(browser);

    // 1. Xe đang chạy chuyến bị giao thêm chuyến
    await ev(p, () => QN.app.navigateTo('vehicles'));
    await p.click('[data-action="crud-edit"][data-id="2"]');
    await p.selectOption('#vehStatus', 'available');
    await p.click('#vehicleModal button[type="submit"]');
    await p.waitForTimeout(80);
    await ev(p, () => { QN.store.db.deliveryReqs.push({ id: 90, custId: 2, pickup: 'X', dropoff: 'Q', time: '', guests: 6, status: 'pending', note: '' }); QN.app.navigateTo('delivery'); });
    await p.click('[data-action="delivery-assign"][data-id="90"]').catch(() => {});
    const dup = await ev(p, () => { const a = QN.store.db.trips.filter(t => t.status === 'Đang đón').map(t => t.vehicleId); return a.length !== new Set(a).size; });
    check('1. Xe đang chạy chuyến không bị giao trùng', !dup, { dup });

    // 2. Gọi món ở bàn đã đặt → thanh toán → bàn phải trở lại "Đã đặt"
    p = await open(browser);
    await ev(p, () => QN.app.navigateTo('orders'));
    await p.click('.menu-card[data-id="10"]');
    await p.selectOption('#orderTableSelect', '11');
    await p.selectOption('#orderEmpSelect', '2');
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(100);
    if (await ev(p, () => document.getElementById('confirmModal').classList.contains('is-open'))) await p.click('#confirmCancel');
    await p.waitForTimeout(100);
    const invId = await ev(p, () => QN.store.pendingInvoicesOfTable(11).map(i => i.id).pop());
    await ev(p, () => QN.app.navigateTo('invoices'));
    await payInvoice(p, invId, 'Tiền mặt');
    const after2 = await ev(p, () => {
        const S = QN.store, U = QN.utils;
        const tomorrow = U.addDays(U.todayLocal(), 1);
        const r = S.get('reservations', 1);
        return { t11: S.get('tables', 11).status, res1: r.status + ':' + r.tableId, clash: S.tableBlockReason(S.get('tables', 11), { date: tomorrow, time: '19:00', guests: 2 }) };
    });
    // Lịch của RES001 là ngày mai: hôm nay bàn dùng bình thường, nhưng lịch ngày mai vẫn giữ và không bị xếp trùng giờ
    check('2. Bàn có lịch đặt ngày mai: thanh toán xong vẫn giữ lịch, không xếp trùng giờ', after2.t11 === 'available' && after2.res1 === 'confirmed:11' && !!after2.clash, after2);

    // 3. Nhãn doanh thu nhỏ không hiện "0tr"
    const lbl = await ev(p, () => (QN.utils.fmtShortMoney || QN.utils.fmtMillions)(25000));
    check('3. 25.000đ không hiện "0tr"', lbl !== '0tr', { lbl });

    // 4. Tạo đặt bàn lúc 20:05 không bị báo giờ đã qua
    const today = await ev(p, () => QN.utils.todayLocal());
    p = await open(browser, `${today}T20:05:00+07:00`);
    await ev(p, () => QN.app.navigateTo('reservations'));
    await p.click('[data-action="reservation-add"]');
    await p.fill('#resName', 'Khách tối'); await p.fill('#resPhone', '0933333333'); await p.fill('#resGuests', '2');
    await p.click('#reservationModal button[type="submit"]');
    await p.waitForTimeout(80);
    const timeErr = await ev(p, () => document.querySelector('#resTime').closest('.field').querySelector('.field__error').textContent);
    check('4. Giờ mặc định khi tạo đặt bàn buổi tối hợp lệ', !timeErr, { timeErr });

    // 5. Phiếu bếp từ hôm qua lên trước phiếu hôm nay
    p = await open(browser);
    await ev(p, () => {
        const U = QN.utils, db = QN.store.db;
        db.kitchenOrders.forEach(k => { if (k.status === 'new') k.status = 'done'; });
        db.kitchenOrders.push({ id: 101, invoiceId: null, tableId: 2, status: 'new', time: '00:10', date: U.todayLocal(), items: [{ name: 'A', qty: 1 }] });
        db.kitchenOrders.push({ id: 102, invoiceId: null, tableId: 3, status: 'new', time: '23:50', date: U.addDays(U.todayLocal(), -1), items: [{ name: 'B', qty: 1 }] });
        QN.app.navigateTo('kitchen');
    });
    const firstTable = await ev(p, () => document.querySelector('#kanbanNew .ticket__table').textContent);
    check('5. Phiếu bếp cũ nhất (hôm qua 23:50) lên đầu', firstTable === 'Bàn 3', { firstTable });

    // 6. Nhãn trục X khi chọn khoảng 30 ngày
    await ev(p, () => { const U = QN.utils; document.getElementById('revDateFrom').value = U.addDays(U.todayLocal(), -29); document.getElementById('revDateTo').value = U.todayLocal(); QN.app.navigateTo('report-revenue'); });
    const labels = await ev(p, () => [...document.querySelectorAll('#revenueBarChart .colchart__label')].filter(l => l.textContent.trim()).length);
    check('6. Khoảng 30 ngày chỉ in nhãn thưa (≤ 10)', labels <= 10, { labels });

    // 7. Focus quay về nút Sửa sau khi lưu
    await ev(p, () => QN.app.navigateTo('customers'));
    await p.focus('[data-action="crud-edit"][data-id="3"]');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(80);
    await p.keyboard.press('Enter'); // focus đang ở ô Họ tên → Enter để lưu
    await p.waitForTimeout(120);
    const focused = await ev(p, () => { const a = document.activeElement; return a && a.dataset ? a.dataset.action + ':' + a.dataset.id : a && a.tagName; });
    check('7. Lưu xong focus quay về nút Sửa của dòng đó', focused === 'crud-edit:3', { focused });

    // 8. Dữ liệu mẫu mở lúc 23:55 không có giờ hẹn đã qua
    p = await open(browser, `${today}T23:55:00+07:00`);
    const past = await ev(p, () => {
        const nowKey = QN.utils.todayLocal() + 'T' + QN.utils.nowTime();
        const req = QN.store.db.deliveryReqs.filter(d => d.status === 'pending').filter(d => d.time && d.time < nowKey);
        const res = QN.store.db.reservations.filter(r => r.status === 'confirmed' && (r.date + 'T' + r.time) < nowKey);
        return { req: req.length, res: res.length };
    });
    check('8. Dữ liệu mẫu lúc 23:55 không có giờ hẹn đã qua', past.req === 0 && past.res === 0, past);

    // 9. Biểu đồ tồn kho so với ngưỡng của từng nguyên liệu (không so kg với thùng)
    p = await open(browser);
    await ev(p, () => QN.app.navigateTo('report-stock'));
    const meter = await ev(p, () => {
        const rows = [...document.querySelectorAll('#stockBarChart .meter__row')];
        if (!rows.length) return null;
        const frac = name => { const r = rows.find(x => x.textContent.includes(name)); const f = r.querySelector('.meter__fill'); return f.getBoundingClientRect().width / f.parentElement.getBoundingClientRect().width; };
        return { tom: frac('Tôm sú'), bia: frac('Bia Tự Do'), rau: frac('Rau xà lách') };
    });
    check('9. Tồn kho hiển thị theo ngưỡng từng món (đủ dùng = đầy, sắp hết ≤ nửa)', meter && meter.bia > 0.99 && meter.rau > 0.99 && meter.tom <= 0.5, meter);
};

if (require.main === module) runStandalone(module.exports, '9 lỗi đã sửa');
