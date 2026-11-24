'use strict';
/* =========================================================
   CHỨC NĂNG MỚI
   Lưu dữ liệu + giữ phiên khi F5, khôi phục dữ liệu mẫu, check-in đặt bàn,
   mã QR thật, hoàn tất chuyến xe, in hóa đơn, định mức tồn kho,
   doanh thu theo ngày thanh toán, gọi thêm món, tìm kiếm,
   chuông "việc cần xử lý", thẻ "Hôm nay", thanh giỏ hàng trên điện thoại.
   Giờ chạy cố định 19:00 (xem lib.js) nên đặt bàn RES004 luôn là 21:00 hôm nay.
   Chạy riêng: node tests/chuc-nang.js
   ========================================================= */
const { openApp, login, state, go, isOpen, fieldError, lastToast, submit, rowCount, shot, payInvoice, runStandalone } = require('./lib');

/** Đọc mã QR từ ảnh chụp màn hình (gói jsqr + pngjs) */
function decodeQr(png) {
    const jsQR = require('jsqr');
    const { PNG } = require('pngjs');
    const img = PNG.sync.read(png);
    const result = jsQR(new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length), img.width, img.height);
    return result ? result.data : null;
}

const activePage = (page, name) => state(page, n => document.getElementById('page-' + n).classList.contains('is-active'), name);

module.exports = async function chucNang(browser, check) {
    const pages = [];
    const open = async opts => { const p = await openApp(browser, opts); pages.push(p); return p; };

    /* ---------- LƯU DỮ LIỆU + GIỮ PHIÊN KHI F5 ---------- */
    const a = await open();
    check('Lần đầu mở: chưa có dữ liệu cũ → dùng dữ liệu mẫu', await state(a, () => !QN.store.restoredFromStorage));
    await go(a, 'customers');
    await a.click('[data-action="crud-add"][data-entity="customers"]');
    await a.fill('#custName', 'Khách Lưu Trữ');
    await a.fill('#custPhone', '0977000111');
    await submit(a, 'customerModal');
    await a.waitForTimeout(250); // các thay đổi được gộp lại rồi ghi sau 150ms
    check('Thêm khách → dữ liệu được ghi vào trình duyệt', await state(a, () => (localStorage.getItem('qntd.data') || '').includes('Khách Lưu Trữ')));

    await a.reload({ waitUntil: 'load' });
    await a.waitForTimeout(100);
    check('F5: vẫn đăng nhập và mở lại đúng trang đang xem', await a.isVisible('#appShell') && await activePage(a, 'customers'));
    check('F5: khách vừa thêm vẫn còn', await state(a, () => QN.store.restoredFromStorage && QN.store.db.customers.some(c => c.name === 'Khách Lưu Trữ')) && (await a.textContent('#customerTableBody')).includes('Khách Lưu Trữ'));

    await a.click('#logoutBtn');
    await a.reload({ waitUntil: 'load' });
    check('Đăng xuất rồi F5 → phải đăng nhập lại', await a.isVisible('#loginPage') && !(await a.isVisible('#appShell')));
    await login(a);
    check('Đăng nhập lại: báo đã khôi phục dữ liệu, khách vẫn còn', (await lastToast(a)).includes('khôi phục') && await state(a, () => QN.store.db.customers.some(c => c.name === 'Khách Lưu Trữ')));

    // Mở lại sau vài ngày: bàn giữ cho lịch đặt đã qua tự trả về "Trống"
    await state(a, () => {
        const S = QN.store;
        S.get('reservations', 1).date = QN.utils.addDays(QN.utils.todayLocal(), -2); // RES001 đang giữ Bàn 11
        S.save();
        S.flush();
    });
    await a.reload({ waitUntil: 'load' });
    check('Dữ liệu cũ: lịch đặt đã qua → bàn tự trả về "Trống"', await state(a, () => QN.store.get('tables', 11).status === 'available'));

    // Khôi phục dữ liệu mẫu
    await go(a, 'dashboard');
    await a.click('[data-action="reset-data"]');
    check('Khôi phục dữ liệu mẫu: hỏi xác nhận trước', await isOpen(a, 'confirmModal'));
    await a.click('#confirmCancel');
    await a.waitForTimeout(80);
    check('Bấm Hủy → dữ liệu giữ nguyên', await state(a, () => QN.store.db.customers.some(c => c.name === 'Khách Lưu Trữ')));
    await a.click('[data-action="reset-data"]');
    await a.click('#confirmOk');
    await a.waitForTimeout(150);
    check('Đồng ý → quay về dữ liệu mẫu', await state(a, () => !QN.store.db.customers.some(c => c.name === 'Khách Lưu Trữ') && QN.store.db.customers.length === QN.createSeedData().customers.length && QN.store.get('tables', 4).status === 'reserved' && QN.store.get('reservations', 1).tableId === 11));
    await a.reload({ waitUntil: 'load' });
    check('F5 sau khi khôi phục: vẫn là dữ liệu mẫu', await state(a, () => !QN.store.db.customers.some(c => c.name === 'Khách Lưu Trữ')));

    // Dữ liệu lưu bị hỏng → tự dùng dữ liệu mẫu, không báo lỗi
    await state(a, () => localStorage.setItem('qntd.data', '{hỏng'));
    await a.reload({ waitUntil: 'load' });
    check('Dữ liệu lưu bị hỏng → tự dùng dữ liệu mẫu, không lỗi', await a.isVisible('#appShell') && await state(a, () => !QN.store.restoredFromStorage && QN.store.db.invoices.length > 0) && a._errors.length === 0, a._errors);

    /* ---------- CHECK-IN ĐẶT BÀN ---------- */
    const b = await open();
    await go(b, 'reservations');
    const checkinIds = await state(b, () => [...document.querySelectorAll('#reservationTableBody [data-action="reservation-checkin"]')].map(x => x.dataset.id));
    check('Chỉ đặt bàn đã xác nhận của hôm nay mới có nút Check-in', checkinIds.length === 1 && checkinIds[0] === '4', checkinIds);
    await b.click('#reservationTableBody [data-action="reservation-checkin"][data-id="4"]');
    await b.waitForTimeout(100);
    const ci = await state(b, () => ({ r: QN.store.get('reservations', 4), table: QN.store.get('tables', 4).status }));
    check('Check-in: đặt bàn → "Đã đến", bàn → "Đang dùng"', ci.r.status === 'checked_in' && !!ci.r.checkedInAt && ci.table === 'occupied', ci);
    check('Check-in xong hỏi có gọi món ngay không', await isOpen(b, 'confirmModal') && (await b.textContent('#confirmOk')).includes('Gọi món ngay'));
    await b.click('#confirmOk');
    await b.waitForTimeout(150);
    check('"Gọi món ngay" → mở trang Gọi món, chọn sẵn bàn của khách', await activePage(b, 'orders') && (await b.inputValue('#orderTableSelect')) === '4');
    await go(b, 'reservations');
    await b.click('[data-action="reservation-filter"][data-filter="checked_in"]');
    check('Tab "Đã đến" lọc đúng khách đã check-in', (await rowCount(b, 'reservationTableBody')) === 1 && (await b.textContent('#reservationTableBody')).includes('Hoàng Thị Ánh'));
    await b.click('[data-action="reservation-filter"][data-filter="all"]');
    await b.click('[data-action="reservation-qr"][data-id="1"]');
    check('Mã QR của lịch ngày mai: có mã, chưa cho check-in', await isOpen(b, 'qrModal') && await b.isVisible('#qrModal .qr-svg') && !(await b.isVisible('#qrModal .qr-checkin')));
    await b.keyboard.press('Escape');

    // Mã QR thật: chụp lại rồi giải mã
    const q = await open({ deviceScaleFactor: 2 });
    await go(q, 'reservations');
    await q.click('[data-action="reservation-qr"][data-id="4"]');
    await q.waitForTimeout(350); // chờ hiệu ứng mở hộp thoại
    const decoded = decodeQr(await q.locator('#qrModal .qr-svg').screenshot());
    check('Mã QR quét được và đúng mã đặt bàn (RES-004-QNTD)', decoded === 'RES-004-QNTD', decoded);
    await shot(q, 'ma-qr');
    await q.click('#qrModal .qr-checkin');
    await q.waitForTimeout(100);
    check('Check-in ngay trong hộp mã QR', await state(q, () => QN.store.get('reservations', 4).status === 'checked_in') && !(await isOpen(q, 'qrModal')));
    await q.click('#confirmCancel');
    await q.waitForTimeout(80);
    check('"Để sau" → vẫn ở trang Đặt bàn', await activePage(q, 'reservations'));

    // Gọi món ở bàn đang giữ cho lịch hôm nay → hỏi có phải khách đó không
    const h = await open();
    await go(h, 'orders');
    await h.click('.menu-card[data-id="10"]');
    await h.selectOption('#orderTableSelect', '4');
    await h.selectOption('#orderEmpSelect', '2');
    await h.click('[data-action="order-submit"]');
    await h.waitForTimeout(100);
    check('Gọi món ở bàn đang giữ cho lịch hôm nay → hỏi có phải khách đó không', await isOpen(h, 'confirmModal') && (await h.textContent('#confirmTitle')).includes('RES004'));
    await h.keyboard.press('Escape');
    await h.waitForTimeout(80);
    check('Đóng hộp hỏi → không gửi đơn, giỏ hàng còn nguyên', await state(h, () => QN.store.pendingInvoicesOfTable(4).length === 0) && (await h.textContent('#cartItems')).includes('Bia'));
    await h.click('[data-action="order-submit"]');
    await h.waitForTimeout(100);
    await h.click('#confirmOk');
    await h.waitForTimeout(150);
    check('"Đúng, khách đã đến" → check-in luôn và tạo hóa đơn cho bàn', await state(h, () => QN.store.get('reservations', 4).status === 'checked_in' && QN.store.pendingInvoicesOfTable(4).length === 1 && QN.store.get('tables', 4).status === 'occupied'));

    /* ---------- HOÀN TẤT CHUYẾN XE ---------- */
    await go(b, 'delivery');
    await b.click('[data-action="trip-complete"][data-id="1"]');
    await b.waitForTimeout(100);
    const trip = await state(b, () => ({ t: QN.store.get('trips', 1), vehicle: QN.store.get('vehicles', 2).status, req: QN.store.get('deliveryReqs', 2).status }));
    check('Hoàn tất chuyến: chuyến "Hoàn tất", xe về "Sẵn sàng", yêu cầu "Hoàn tất"', trip.t.status === 'Hoàn tất' && !!trip.t.completedAt && trip.vehicle === 'available' && trip.req === 'completed', trip);
    check('Chuyến đã xong: hết nút Hoàn tất, hiện giờ xong', !(await b.$('[data-action="trip-complete"][data-id="1"]')) && (await b.textContent('#tripTableBody')).includes('Xong lúc'));
    const reqId = await state(b, () => QN.store.db.deliveryReqs.find(d => d.status === 'pending').id);
    await b.click(`[data-action="delivery-assign"][data-id="${reqId}"]`);
    await b.waitForTimeout(100);
    const newTrip = await state(b, () => QN.store.db.trips[QN.store.db.trips.length - 1]);
    check('Tài xế vừa xong chuyến được giao chuyến mới', newTrip.reqId === reqId && newTrip.driverId === 5, newTrip);

    // Xe đang chạy chuyến không đổi sang trạng thái khác được
    await go(q, 'vehicles');
    await q.click('[data-action="crud-edit"][data-id="2"]');
    await q.selectOption('#vehStatus', 'available');
    await submit(q, 'vehicleModal');
    check('Xe đang chạy chuyến: không cho đổi sang "Sẵn sàng" (báo lỗi ngay ô)', await isOpen(q, 'vehicleModal') && (await fieldError(q, 'vehStatus')).length > 0 && await state(q, () => QN.store.get('vehicles', 2).status === 'in_use'));
    await q.keyboard.press('Escape');

    /* ---------- IN HÓA ĐƠN ---------- */
    await go(q, 'invoices');
    await state(q, () => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
    const paidId = await state(q, () => QN.store.db.invoices.find(i => i.status === 'paid').id);
    await q.click(`[data-action="invoice-view"][data-id="${paidId}"]`);
    await q.click('#invoicePrintBtn');
    check('In hóa đơn: gọi lệnh in của trình duyệt', await state(q, () => window.__printed === 1 && document.body.classList.contains('print-invoice')));
    await q.emulateMedia({ media: 'print' });
    const printView = await state(q, () => ({
        shell: getComputedStyle(document.getElementById('appShell')).display,
        modal: getComputedStyle(document.getElementById('invoiceDetailModal')).display,
        footer: getComputedStyle(document.querySelector('#invoiceDetailModal .modal__footer')).display,
        height: document.getElementById('invoiceDetailContent').getBoundingClientRect().height
    }));
    check('Bản in chỉ có tờ hóa đơn (ẩn menu, ẩn nút)', printView.shell === 'none' && printView.modal !== 'none' && printView.footer === 'none' && printView.height > 100, printView);
    await shot(q, 'ban-in-hoa-don', { fullPage: true });
    await q.emulateMedia({ media: 'screen' });
    await state(q, () => window.dispatchEvent(new Event('afterprint')));
    check('In xong: trả lại giao diện bình thường', await state(q, () => !document.body.classList.contains('print-invoice')));
    await q.keyboard.press('Escape');

    /* ---------- ĐỊNH MỨC TỒN KHO ---------- */
    await go(q, 'ingredients');
    const before = await state(q, () => { const g = QN.store.get('ingredients', 8); return { low: QN.store.attention().lowStock, stock: g.stock, level: QN.store.stockLevel(g) }; });
    await q.click('[data-action="crud-edit"][data-id="8"]');
    check('Sửa nguyên liệu: hiện định mức tối thiểu đang dùng', (await q.inputValue('#ingMinStock')) === '8');
    await q.fill('#ingMinStock', '-1');
    await submit(q, 'ingredientModal');
    check('Định mức âm → báo lỗi', (await fieldError(q, 'ingMinStock')).length > 0 && await isOpen(q, 'ingredientModal'));
    const newMin = Math.ceil(before.stock) + 5;
    await q.fill('#ingMinStock', String(newMin));
    await submit(q, 'ingredientModal');
    const after = await state(q, () => {
        const g = QN.store.get('ingredients', 8);
        const tr = [...document.querySelectorAll('#ingredientTableBody tr')].find(x => x.textContent.includes('Rau xà lách'));
        return { low: QN.store.attention().lowStock, level: QN.store.stockLevel(g), row: tr.textContent, bell: document.getElementById('bellCount').textContent, total: QN.store.attention().total };
    });
    check('Nâng định mức lên trên tồn hiện có → "Sắp hết", chuông thêm 1 việc', before.level !== 'low' && after.level === 'low' && after.low === before.low + 1 && after.row.includes('Sắp hết') && after.bell === String(after.total), { before, after });
    await go(q, 'report-stock');
    const meter = await state(q, () => {
        const row = [...document.querySelectorAll('#stockBarChart .meter__row')].find(x => x.textContent.includes('Rau xà lách'));
        const fill = row.querySelector('.meter__fill');
        const tr = [...document.querySelectorAll('#stockTableBody tr')].find(x => x.textContent.includes('Rau xà lách'));
        return { ratio: fill.getBoundingClientRect().width / fill.parentElement.getBoundingClientRect().width, min: tr.children[6].textContent.trim() };
    });
    check('Báo cáo tồn kho dùng định mức mới (thanh dưới vạch nửa, cột Tối thiểu)', meter.ratio < 0.5 && meter.min.startsWith(String(newMin)), meter);

    /* ---------- DOANH THU THEO NGÀY THANH TOÁN ---------- */
    const r = await open();
    const inj = await state(r, () => {
        const S = QN.store, U = QN.utils;
        const today = U.todayLocal();
        const yesterday = U.addDays(today, -1);
        const table = S.db.tables.find(t => t.status === 'available');
        table.status = 'occupied';
        const id = S.nextId('invoices');
        S.db.invoices.push({
            id, date: yesterday, time: '23:30', tableId: table.id, custId: 0, empId: 2,
            items: [{ foodId: 10, name: 'Bia Tự Do', category: 'Đồ uống', price: 35000, qty: 2 }],
            total: 70000, voucher: '', voucherPercent: 0, discount: 0, finalTotal: 70000,
            status: 'pending', payMethod: '', txId: '', paidAt: ''
        });
        const paidToday = U.sum(S.db.invoices.filter(i => i.status === 'paid' && S.paidDate(i) === today), i => i.finalTotal);
        return { id, code: U.code('HD', id), today, yesterday, todayText: U.fmtDate(today), yesterdayText: U.fmtDate(yesterday), expected: U.fmtMoney(paidToday + 70000) };
    });
    await go(r, 'invoices');
    await payInvoice(r, inj.id, 'Tiền mặt');
    await r.waitForTimeout(100);
    check('Thanh toán HĐ lập hôm qua → ngày thanh toán là hôm nay', await state(r, x => { const i = QN.store.get('invoices', x.id); return i.status === 'paid' && QN.store.paidDate(i) === x.today; }, inj));
    await go(r, 'dashboard');
    check('Thẻ "Hôm nay" tính cả HĐ đó (theo ngày thanh toán)', (await r.textContent('#todayRevenue')) === inj.expected, { shown: await r.textContent('#todayRevenue'), expected: inj.expected });
    await go(r, 'report-revenue');
    const range = async (from, to) => {
        await r.fill('#revDateFrom', from);
        await r.fill('#revDateTo', to);
        await r.click('#revRangeForm button[type="submit"]');
        await r.waitForTimeout(80);
        return state(r, code => {
            const tr = [...document.querySelectorAll('#revenueTableBody tr')].find(x => x.children[0] && x.children[0].textContent.includes(code));
            return tr ? [...tr.children].map(td => td.textContent.trim()) : null;
        }, inj.code);
    };
    const rowToday = await range(inj.today, inj.today);
    check('Báo cáo hôm nay có HĐ đó: Ngày lập = hôm qua, Ngày TT = hôm nay', rowToday && rowToday[1].includes(inj.yesterdayText) && rowToday[2].includes(inj.todayText), rowToday);
    check('Báo cáo riêng hôm qua không tính HĐ đó', (await range(inj.yesterday, inj.yesterday)) === null);

    /* ---------- GỌI THÊM MÓN: NHÃN Ở BẾP ---------- */
    await go(r, 'orders');
    const open1 = await state(r, () => QN.store.db.invoices.find(i => i.status === 'pending' && !QN.store.holdsOfTable(i.tableId).length));
    await r.click('.menu-card[data-id="10"]');
    await r.selectOption('#orderTableSelect', String(open1.tableId));
    await r.selectOption('#orderEmpSelect', '2');
    await r.click('[data-action="order-submit"]');
    await r.waitForTimeout(100);
    check('Gọi thêm món: không tạo hóa đơn mới', await state(r, x => QN.store.pendingInvoicesOfTable(x.tableId).length === 1 && QN.store.get('invoices', x.id).items.some(it => it.foodId === 10), open1));
    await go(r, 'kitchen');
    check('Bếp: phiếu gọi thêm có nhãn "Gọi thêm" kèm mã hóa đơn', await state(r, x => [...document.querySelectorAll('#kanbanNew .ticket')].some(t => t.textContent.includes('Gọi thêm') && t.textContent.includes(QN.utils.code('HD', x.id))), open1));

    /* ---------- TÌM KIẾM ---------- */
    await go(r, 'invoices');
    await r.fill('#searchInvoice', 'HD015');
    await r.waitForTimeout(50);
    check('Tìm hóa đơn theo mã', (await rowCount(r, 'invoiceTableBody')) === 1 && (await r.textContent('#invoiceTableBody')).includes('HD015'));
    await r.fill('#searchInvoice', 'không có hóa đơn này');
    await r.waitForTimeout(50);
    check('Tìm không thấy → hiện thông báo thay vì bảng trắng', (await rowCount(r, 'invoiceTableBody')) === 0 && (await r.textContent('#invoiceTableBody')).trim().length > 0);
    await r.fill('#searchInvoice', '');
    await go(r, 'ingredients');
    await r.fill('#searchIngredient', 'tom');
    await r.waitForTimeout(50);
    check('Tìm không cần gõ dấu ("tom" → Tôm sú), dòng đếm cập nhật', (await rowCount(r, 'ingredientTableBody')) === 1 && (await r.textContent('#ingredientTableBody')).includes('Tôm sú') && (await r.textContent('#ingredientsMeta')).startsWith('1 / '));
    await r.fill('#searchIngredient', '');
    await go(r, 'reservations');
    await r.fill('#searchReservation', '0912345678');
    await r.waitForTimeout(50);
    check('Tìm đặt bàn theo SĐT', (await rowCount(r, 'reservationTableBody')) === 1 && (await r.textContent('#reservationTableBody')).includes('Trần Thị Bình'));
    await r.fill('#searchReservation', '');
    for (const [pg, input, tbody, term, expectText] of [
        ['vouchers', 'searchVoucher', 'voucherTableBody', 'sinh vien', 'VC002'],
        ['suppliers', 'searchSupplier', 'supplierTableBody', 'quang ninh', 'Hải sản Quảng Ninh'],
        ['vehicles', 'searchVehicle', 'vehicleTableBody', '30b', '30B-67890'],
        ['inventory', 'searchReceipt', 'inventoryTableBody', 'tom su', 'Tôm sú']
    ]) {
        await go(r, pg);
        const total = await rowCount(r, tbody);
        await r.fill('#' + input, term);
        await r.waitForTimeout(50);
        const found = await state(r, id => [...document.querySelectorAll(`#${id} tr`)].map(tr => tr.textContent), tbody);
        await r.fill('#' + input, '');
        await r.waitForTimeout(50);
        const restored = await rowCount(r, tbody);
        check(`Tìm kiếm ở trang ${pg} ("${term}")`, found.length >= 1 && found.length < total && found.every(t => t.includes(expectText)) && restored === total, { total, found: found.length, restored });
    }

    /* ---------- CHUÔNG "VIỆC CẦN XỬ LÝ" ---------- */
    await go(r, 'dashboard');
    await r.click('#bellBtn');
    const bell = await state(r, () => ({
        hidden: document.getElementById('bellPanel').hidden,
        expanded: document.getElementById('bellBtn').getAttribute('aria-expanded'),
        items: document.querySelectorAll('#bellList .attention__item').length,
        expected: QN.store.attentionItems().length,
        focus: document.activeElement.classList.contains('attention__item')
    }));
    check('Chuông: mở bảng việc cần xử lý, đủ mục, focus vào mục đầu', !bell.hidden && bell.expanded === 'true' && bell.items === bell.expected && bell.items > 0 && bell.focus, bell);
    await shot(r, 'chuong');
    await r.keyboard.press('Escape');
    check('Chuông: Esc đóng bảng, focus về nút chuông', await state(r, () => document.getElementById('bellPanel').hidden && document.activeElement.id === 'bellBtn'));
    await r.click('#bellBtn');
    await r.click('#breadcrumbCurrent');
    check('Chuông: bấm ra ngoài thì đóng', await state(r, () => document.getElementById('bellPanel').hidden));
    await r.click('#bellBtn');
    const target = await state(r, () => document.querySelector('#bellList .attention__item').dataset.page);
    await r.click('#bellList .attention__item');
    await r.waitForTimeout(80);
    check('Chuông: bấm một việc → mở đúng trang, bảng tự đóng', await activePage(r, target) && await state(r, () => document.getElementById('bellPanel').hidden), target);

    /* ---------- THẺ "HÔM NAY" + VIỆC CẦN XỬ LÝ ---------- */
    await go(r, 'dashboard');
    const today = await state(r, () => {
        const S = QN.store, U = QN.utils;
        const t = U.todayLocal();
        const labels = [...document.querySelectorAll('#todayChart .colchart__label')];
        const nowHM = U.nowTime();
        const soFar = U.sum(S.db.invoices.filter(i => i.status === 'paid' && S.paidDate(i) === U.addDays(t, -1) && (i.paidAt || '').slice(11, 16) <= nowHM), i => i.finalTotal);
        return {
            soFar: U.fmtMoney(soFar),
            shown: document.getElementById('todayRevenue').textContent,
            expected: U.fmtMoney(U.sum(S.db.invoices.filter(i => i.status === 'paid' && S.paidDate(i) === t), i => i.finalTotal)),
            cols: document.querySelectorAll('#todayChart .colchart__col').length,
            last: labels.length ? labels[labels.length - 1].textContent : '',
            delta: document.getElementById('todayDelta').textContent,
            items: document.querySelectorAll('#attentionList .attention__item').length,
            expectedItems: S.attentionItems().length
        };
    });
    check('Thẻ "Hôm nay": doanh thu đúng, biểu đồ 7 ngày kết thúc ở "Hôm nay"', today.shown === today.expected && today.cols === 7 && today.last === 'Hôm nay', today);
    check('So sánh với hôm qua tính đến cùng giờ (không so với cả ngày hôm qua)', today.delta.includes('cùng giờ hôm qua') && today.delta.includes(today.soFar), today);
    check('Khung "Việc cần xử lý" khớp với chuông', today.items === today.expectedItems && today.items > 0, today);
    await r.click('#attentionList .attention__item');
    await r.waitForTimeout(80);
    check('Bấm một việc ở Tổng quan → mở trang tương ứng', !(await activePage(r, 'dashboard')));

    /* ---------- THANH GIỎ HÀNG TRÊN ĐIỆN THOẠI ---------- */
    const m = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await go(m, 'orders');
    await m.waitForTimeout(100);
    check('Điện thoại: giỏ trống thì không hiện thanh giỏ hàng', !(await m.isVisible('#cartBar')));
    await m.click('.menu-card[data-id="1"]');
    await m.waitForTimeout(300);
    const bar = await state(m, () => {
        const el = document.getElementById('cartBar');
        const rect = el.getBoundingClientRect();
        return { inView: rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight, count: document.getElementById('cartBarCount').textContent, total: document.getElementById('cartBarTotal').textContent };
    });
    check('Điện thoại: thêm món → thanh giỏ hàng hiện ở đáy màn hình (số món + tổng tiền)', await m.isVisible('#cartBar') && bar.inView && bar.count === '1 món' && /\d/.test(bar.total), bar);
    await shot(m, 'dt-thanh-gio-hang');
    await m.click('[data-action="scroll-to-cart"]');
    await m.waitForTimeout(900); // cuộn mượt
    const cartView = await state(m, () => ({
        top: document.getElementById('cartTitle').getBoundingClientRect().top,
        barHidden: getComputedStyle(document.getElementById('cartBar')).visibility === 'hidden',
        focusInCart: !!document.activeElement.closest('.cart')
    }));
    check('Điện thoại: "Xem đơn" cuộn tới giỏ hàng, thanh tự ẩn, focus vào giỏ', cartView.top > -5 && cartView.top < 420 && cartView.barHidden && cartView.focusInCart, cartView);
    const overflow = await state(m, () => document.documentElement.scrollWidth - innerWidth);
    check('Điện thoại: trang Gọi món không tràn ngang', overflow <= 0, overflow);

    // Nhãn trục biểu đồ cột: đủ chữ (không bị cắt "…"), không chồng nhau, không tràn khỏi thẻ
    const axisProblems = async () => state(m, () => {
        const out = [];
        document.querySelectorAll('.page.is-active .colchart').forEach(fig => {
            const card = fig.closest('.card').getBoundingClientRect();
            const rects = [...fig.querySelectorAll('.colchart__label')].filter(l => l.textContent).map(l => {
                const range = document.createRange();
                range.selectNodeContents(l);
                const r = range.getBoundingClientRect();
                return { text: l.textContent, left: r.left, right: r.right, clipped: getComputedStyle(l).overflow !== 'visible' };
            });
            rects.forEach((r, i) => {
                if (r.clipped) out.push(r.text + ' bị cắt');
                if (r.left < card.left || r.right > card.right) out.push(r.text + ' tràn khỏi thẻ');
                if (i && r.left < rects[i - 1].right + 2) out.push(rects[i - 1].text + ' chồng ' + r.text);
            });
        });
        return out;
    });
    await go(m, 'dashboard');
    await m.waitForTimeout(80);
    const dashAxis = await axisProblems();
    await state(m, () => { const U = QN.utils; document.getElementById('revDateFrom').value = U.addDays(U.todayLocal(), -29); document.getElementById('revDateTo').value = U.todayLocal(); QN.app.navigateTo('report-revenue'); });
    await m.waitForTimeout(80);
    const revAxis = await axisProblems();
    check('Điện thoại: nhãn trục biểu đồ (7 và 30 ngày) đủ chữ, không chồng nhau', !dashAxis.length && !revAxis.length && await state(m, () => document.querySelectorAll('#revenueBarChart .colchart__label').length === 30), { dashAxis, revAxis });

    const errors = pages.flatMap(p => p._errors);
    check('Không có lỗi console', errors.length === 0, errors);
    check('Không tải tài nguyên ngoài (chạy offline)', pages.every(p => p._external.length === 0), pages.flatMap(p => p._external));
};

if (require.main === module) runStandalone(module.exports, 'Chức năng mới');
