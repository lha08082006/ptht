'use strict';
/* =========================================================
   GIỜ THẬT & DỮ LIỆU ĐỂ QUA NGÀY
   - Mọi trang chạy đúng ở nhiều mốc giờ trong ngày (nửa đêm, sáng sớm, khuya): không NaN/undefined,
     không có hóa đơn/phiếu ở tương lai, không lỗi console
   - Dữ liệu mẫu chưa ai sửa mà tạo từ hôm trước → tạo lại theo hôm nay; dữ liệu đã sửa → giữ nguyên
     và báo lúc lưu khi đăng nhập; bản lưu của phiên bản trước (chưa có cờ) không bị xóa
   - Đưa đón: bắt buộc giờ đón (điền sẵn khoảng 30 phút nữa); chỉ giao xe trong vòng 3 giờ trước giờ đón;
     trễ dưới 1 giờ vẫn giao được; quá giờ đón hơn 1 giờ → "Quá giờ đón", chỉ còn hủy;
     yêu cầu cần giao xe hiện ở "Việc cần xử lý" và chuông; chuyến xe ghi ngày khi không phải hôm nay
   Chạy riêng: node tests/gio-that.js
   ========================================================= */
const { APP_URL, openApp, login, go, lastToast, submit, fieldError, runStandalone } = require('./lib');

const S = (page, fn, arg) => page.evaluate(fn, arg);
const at = (hm, day = '24') => `2026-11-${day}T${hm}:00+07:00`;

/** Đóng tab rồi mở tab mới trong cùng ngữ cảnh (chung localStorage) ở thời điểm khác, đăng nhập sẵn */
async function reopen(page, when) {
    const ctx = page.context();
    await page.close();
    const p = await ctx.newPage();
    p._errors = [];
    p.on('console', m => { if (m.type() === 'error') p._errors.push(m.text()); });
    p.on('pageerror', e => p._errors.push('PAGEERROR ' + e.message));
    await p.clock.setFixedTime(new Date(when));
    await p.goto(APP_URL, { waitUntil: 'load' });
    await login(p);
    return p;
}

const savedPayload = page => S(page, () => JSON.parse(localStorage.getItem('qntd.data') || 'null'));
const rowOf = (page, tbody, text) => page.evaluate(([id, t]) => {
    const tr = [...document.querySelectorAll(`#${id} tr`)].find(r => r.textContent.includes(t));
    return tr ? tr.textContent.replace(/\s+/g, ' ').trim() : '';
}, [tbody, text]);

module.exports = async function gioThat(browser, check) {
    /* ---------- MỌI TRANG Ở NHIỀU MỐC GIỜ ---------- */
    for (const hm of ['00:20', '07:30', '23:55']) {
        const p = await openApp(browser, { now: at(hm) });
        const pages = await S(p, () => [...document.querySelectorAll('[id^="page-"]')].map(s => s.id.slice(5)));
        const bad = [];
        for (const name of pages) {
            await go(p, name);
            const txt = await S(p, id => document.getElementById('page-' + id).innerText, name);
            const m = txt.match(/NaN|undefined|Invalid Date|Infinity|(^|\s)-\d+\s*phút/);
            if (m) bad.push(name + ': ' + m[0]);
        }
        const future = await S(p, () => {
            const U = QN.utils, db = QN.store.db, now = U.nowDateTime();
            return [].concat(
                db.invoices.map(i => i.date + 'T' + i.time),
                db.kitchenOrders.map(k => k.date + 'T' + k.time),
                db.receipts.map(r => r.date + 'T' + r.time)
            ).filter(t => t > now).length;
        });
        check(`Lúc ${hm}: cả ${pages.length} trang không có NaN/undefined/thời lượng âm`, pages.length >= 19 && !bad.length, bad);
        check(`Lúc ${hm}: dữ liệu mẫu không có hóa đơn/phiếu bếp/phiếu kho ở tương lai, không lỗi console`, future === 0 && !p._errors.length, { future, errors: p._errors });
    }

    /* ---------- DỮ LIỆU ĐỂ QUA NGÀY ---------- */
    // 1. Dữ liệu mẫu chỉ được lưu tự động (chưa ai sửa) → hôm sau tạo lại theo ngày mới
    let p = await openApp(browser, { now: at('19:00') });
    await S(p, () => { QN.store.save(); QN.store.flush(); });
    const s1 = await savedPayload(p);
    check('Bản lưu ghi ngày tạo dữ liệu mẫu và cờ "chưa sửa"', s1 && s1.seededOn === '2026-11-24' && s1.touched === false, s1 && { seededOn: s1.seededOn, touched: s1.touched });
    p = await reopen(p, at('09:00', '25'));
    const fresh = await S(p, () => {
        const db = QN.store.db, today = QN.utils.todayLocal();
        return {
            refreshed: QN.store.seedRefreshed, restored: QN.store.restoredFromStorage,
            todayInvoices: db.invoices.filter(i => i.date === today).length,
            oldPending: db.invoices.filter(i => i.status === 'pending' && i.date !== today).length,
            oldKitchen: db.kitchenOrders.filter(k => k.date !== today && k.status !== 'done').length
        };
    });
    check('Hôm sau mở lại: dữ liệu mẫu chưa sửa được tạo lại theo hôm nay (có hóa đơn hôm nay, không còn HĐ/phiếu bếp hôm qua treo)',
        fresh.refreshed && !fresh.restored && fresh.todayInvoices > 0 && fresh.oldPending === 0 && fresh.oldKitchen === 0, fresh);
    check('Lời chào báo dữ liệu mẫu đã được làm mới', (await lastToast(p)).includes('làm mới theo ngày hôm nay'));

    // 2. Cùng ngày: dữ liệu chưa sửa vẫn được khôi phục như cũ
    p = await openApp(browser, { now: at('19:00') });
    await S(p, () => { QN.store.save(); QN.store.flush(); });
    p = await reopen(p, at('21:30'));
    check('Cùng ngày mở lại: khôi phục dữ liệu đã lưu, không tạo lại', await S(p, () => QN.store.restoredFromStorage && !QN.store.seedRefreshed) && (await lastToast(p)).includes('Dữ liệu lần trước đã được khôi phục'));

    // 3. Người dùng đã sửa dữ liệu → hôm sau giữ nguyên, báo lúc lưu
    p = await openApp(browser, { now: at('19:00') });
    await go(p, 'customers');
    await p.click('[data-action="crud-add"][data-entity="customers"]');
    await p.fill('#custName', 'Khách Qua Ngày');
    await p.fill('#custPhone', '0977000222');
    await submit(p, 'customerModal');
    await S(p, () => QN.store.flush());
    check('Sửa dữ liệu → bản lưu đánh dấu "đã sửa"', (await savedPayload(p)).touched === true);
    p = await reopen(p, at('10:15', '25'));
    const kept = await S(p, () => ({
        restored: QN.store.restoredFromStorage, refreshed: QN.store.seedRefreshed,
        cust: QN.store.db.customers.some(c => c.name === 'Khách Qua Ngày'),
        pendingOld: QN.store.db.invoices.filter(i => i.status === 'pending' && i.date === '2026-11-24').length
    }));
    check('Hôm sau mở lại dữ liệu đã sửa: giữ nguyên (khách vừa thêm, hóa đơn chờ của hôm qua vẫn còn)', kept.restored && !kept.refreshed && kept.cust && kept.pendingOld === 2, kept);
    const toast = await lastToast(p);
    check('Lời chào ghi rõ lúc lưu dữ liệu và cách lấy dữ liệu mẫu mới', toast.includes('lưu lúc 19:00 ngày 24/11/2026') && toast.includes('Khôi phục dữ liệu mẫu'), toast);
    await go(p, 'delivery');
    check('Chuyến xe của hôm qua ghi rõ ngày', (await rowOf(p, 'tripTableBody', 'Đang đón')).includes('Ngày 24/11/2026'));
    check('Yêu cầu chờ giao xe của hôm qua: "Quá giờ đón", chỉ còn nút hủy',
        (await rowOf(p, 'deliveryTableBody', 'Nguyễn Văn An')).includes('Quá giờ đón') && !(await p.$('[data-action="delivery-assign"][data-id="1"]')) && !!(await p.$('[data-action="delivery-cancel"][data-id="1"]')));
    check('Việc cần xử lý nhắc yêu cầu đưa đón lỡ giờ', await S(p, () => QN.store.attentionItems().some(i => i.text.includes('quá giờ đón'))));
    check('Mở lại hôm sau không lỗi console', !p._errors.length, p._errors);

    // 4. Bản lưu của phiên bản trước (chưa có cờ seededOn/touched) không bị xóa khi qua ngày
    p = await openApp(browser, { now: at('19:00') });
    await S(p, () => {
        const db = JSON.parse(JSON.stringify(QN.store.db));
        db.customers.push({ id: 77, name: 'Khách Bản Cũ', phone: '0977000333' });
        localStorage.setItem('qntd.data', JSON.stringify({ version: 3, savedAt: new Date().toISOString(), db }));
    });
    p = await reopen(p, at('08:00', '26'));
    check('Bản lưu phiên bản trước: qua ngày vẫn giữ nguyên dữ liệu', await S(p, () => QN.store.restoredFromStorage && QN.store.db.customers.some(c => c.name === 'Khách Bản Cũ')));

    /* ---------- YÊU CẦU ĐƯA ĐÓN ---------- */
    p = await openApp(browser, { now: at('19:00') });
    check('Yêu cầu sắp đến giờ đón (20:30) hiện ở Việc cần xử lý và chuông',
        await S(p, () => QN.store.attention().deliveryDue === 1 && QN.store.attentionItems().some(i => i.text.includes('cần giao xe (đón 20:30)'))
            && document.getElementById('bellCount').textContent === String(QN.store.attention().total)));
    await go(p, 'delivery');
    await p.click('[data-action="delivery-add"]');
    const suggested = await p.inputValue('#delTime');
    check('Tạo yêu cầu: giờ đón điền sẵn khoảng 30 phút nữa', suggested === '2026-11-24T19:30', suggested);
    await p.selectOption('#delCust', '2');
    await p.fill('#delPickup', '12 Hàng Bài');
    await p.fill('#delGuests', '3');
    await p.fill('#delTime', '');
    await submit(p, 'deliveryReqModal');
    check('Bỏ trống giờ đón → báo lỗi', (await fieldError(p, 'delTime')).includes('Vui lòng chọn thời gian đón'));
    await p.fill('#delTime', '2026-11-25T18:00');
    await submit(p, 'deliveryReqModal');
    const tomorrowReq = await S(p, () => QN.store.db.deliveryReqs[QN.store.db.deliveryReqs.length - 1]);
    check('Yêu cầu đón ngày mai được tạo', tomorrowReq.time === '2026-11-25T18:00' && tomorrowReq.status === 'pending', tomorrowReq);
    check('Yêu cầu ngày mai ghi "Giao xe từ 15:00 ngày 25/11/2026"', (await rowOf(p, 'deliveryTableBody', '12 Hàng Bài')).includes('Giao xe từ 15:00 ngày 25/11/2026'));
    const tripsBefore = await S(p, () => QN.store.db.trips.length);
    await p.click(`[data-action="delivery-assign"][data-id="${tomorrowReq.id}"]`);
    await p.waitForTimeout(80);
    check('Giao xe quá sớm (ngày mai mới đón) → báo, không giữ xe',
        (await lastToast(p)).includes('Chưa đến lúc giao xe') && await S(p, ([id, n]) => QN.store.get('deliveryReqs', id).status === 'pending' && QN.store.db.trips.length === n, [tomorrowReq.id, tripsBefore]));
    check('Yêu cầu chưa đến lúc giao xe không tính vào chuông', await S(p, () => QN.store.attention().deliveryDue === 1));

    // Trễ dưới 1 giờ: vẫn giao xe được; quá 1 giờ: lỡ hẹn
    await S(p, () => {
        const db = QN.store.db;
        db.deliveryReqs.push({ id: 50, custId: 4, pickup: 'Số 5 Phố Huế', dropoff: 'Quán Nhậu Tự Do', time: '2026-11-24T18:30', guests: 2, status: 'pending', note: '' });
        db.deliveryReqs.push({ id: 51, custId: 5, pickup: 'Số 9 Bà Triệu', dropoff: 'Quán Nhậu Tự Do', time: '2026-11-24T17:00', guests: 2, status: 'pending', note: '' });
        QN.app.navigateTo('delivery');
    });
    const lateRow = await rowOf(p, 'deliveryTableBody', 'Số 5 Phố Huế');
    check('Trễ 30 phút: ghi "Trễ 30 phút", vẫn "Chờ giao xe" và có nút Giao xe', lateRow.includes('18:30Trễ 30 phút') && lateRow.includes('Chờ giao xe') && !!(await p.$('[data-action="delivery-assign"][data-id="50"]')), lateRow);
    check('Quá giờ đón 2 giờ: "Quá giờ đón", không còn nút Giao xe', (await rowOf(p, 'deliveryTableBody', 'Số 9 Bà Triệu')).includes('Quá giờ đón') && !(await p.$('[data-action="delivery-assign"][data-id="51"]')));
    await S(p, () => QN.actions['delivery-assign']({ id: '51' }));
    check('Gọi giao xe cho yêu cầu lỡ hẹn → báo, không tạo chuyến', (await lastToast(p)).includes('quá giờ đón') && await S(p, () => !QN.store.db.trips.some(t => t.reqId === 51)));
    await p.click('[data-action="delivery-assign"][data-id="50"]');
    await p.waitForTimeout(80);
    check('Giao xe cho yêu cầu trễ 30 phút thành công', await S(p, () => QN.store.get('deliveryReqs', 50).status === 'assigned' && QN.store.db.trips.some(t => t.reqId === 50)));
    await p.click('[data-action="delivery-cancel"][data-id="51"]');
    await p.click('#confirmOk');
    await p.waitForTimeout(80);
    check('Hủy yêu cầu lỡ hẹn → hết nhắc "quá giờ đón"', await S(p, () => QN.store.get('deliveryReqs', 51).status === 'cancelled' && !QN.store.attentionItems().some(i => i.text.includes('quá giờ đón'))));
    check('Đưa đón: không lỗi console', !p._errors.length, p._errors);
};

if (require.main === module) runStandalone(module.exports, 'Giờ thật & dữ liệu để qua ngày');
