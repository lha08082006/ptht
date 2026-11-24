'use strict';
/* =========================================================
   MỘT VÒNG QUY TRÌNH ĐẦY ĐỦ (chỉ thao tác trên giao diện, như người dùng thật)
   Đặt bàn → xác nhận → mã QR → check-in → gọi món (voucher) → bếp → gọi thêm →
   thanh toán → in hóa đơn → báo cáo / tổng quan cập nhật → xe đưa đón → nhập kho → F5.
   Mỗi bước kiểm tra cả màn hình lẫn dữ liệu liên quan ở các phân hệ khác.
   Chạy riêng: node tests/quy-trinh.js
   ========================================================= */
const { openApp, state, go, isOpen, fieldError, lastToast, submit, shot, runStandalone } = require('./lib');

const S = (page, fn, arg) => page.evaluate(fn, arg);
const stockOf = (page, id) => S(page, i => QN.store.get('ingredients', i).stock, id);
const near = (a, b) => Math.abs(a - b) < 1e-6;

module.exports = async function quyTrinh(browser, check) {
    const p = await openApp(browser);
    const base = await S(p, () => {
        const st = QN.store, U = QN.utils;
        const today = U.todayLocal();
        return {
            revenueToday: U.sum(st.db.invoices.filter(i => i.status === 'paid' && st.paidDate(i) === today), i => i.finalTotal),
            beerSold: U.sum(st.db.invoices.filter(i => i.status === 'paid'), i => U.sum(i.items.filter(it => it.foodId === 10), it => it.qty)),
            receipts: st.db.receipts.length
        };
    });
    const stock0 = { nam: await stockOf(p, 1), rau: await stockOf(p, 8), bia: await stockOf(p, 9), nuoc: await stockOf(p, 10), tom: await stockOf(p, 6) };

    /* 1. ĐẶT BÀN */
    await go(p, 'reservations');
    await p.click('[data-action="reservation-add"]');
    await p.fill('#resName', 'Khách Quy Trình');
    await p.fill('#resPhone', '0988777666');
    await p.fill('#resGuests', '4');
    await p.fill('#resTime', '20:00');
    await submit(p, 'reservationModal');
    const res = await S(p, () => QN.store.db.reservations.find(r => r.name === 'Khách Quy Trình'));
    check('1. Tạo đặt bàn hôm nay 20:00 → "Chờ xác nhận"', res && res.status === 'pending' && res.date === await S(p, () => QN.utils.todayLocal()) && !(await isOpen(p, 'reservationModal')), res);
    check('   Chuông tăng 1 việc "đặt bàn chờ xác nhận"', await S(p, () => QN.store.attention().reservationsPending === 2));

    /* 2. XÁC NHẬN → tự gán bàn trống nhỏ nhất đủ 4 chỗ */
    await p.click(`[data-action="reservation-confirm"][data-id="${res.id}"]`);
    const confirmed = await S(p, id => { const r = QN.store.get('reservations', id); const t = QN.store.get('tables', r.tableId); return { status: r.status, table: t && { id: t.id, seats: t.seats, status: t.status } }; }, res.id);
    check('2. Xác nhận → gán bàn 4 chỗ, bàn chuyển "Đã đặt"', confirmed.status === 'confirmed' && confirmed.table && confirmed.table.seats === 4 && confirmed.table.status === 'reserved', confirmed);
    const tableId = confirmed.table.id;

    /* 3. MÃ QR → CHECK-IN → GỌI MÓN NGAY */
    await p.click(`[data-action="reservation-qr"][data-id="${res.id}"]`);
    check('3. Mã QR hiện đúng mã đặt bàn', await isOpen(p, 'qrModal') && (await p.textContent('#qrModal')).includes(`RES-${String(res.id).padStart(3, '0')}-QNTD`));
    await p.click('#qrModal .qr-checkin');
    await p.waitForTimeout(80);
    check('   Check-in → "Đã đến", bàn "Đang dùng"', await S(p, ([id, t]) => QN.store.get('reservations', id).status === 'checked_in' && QN.store.get('tables', t).status === 'occupied', [res.id, tableId]));
    await p.click('#confirmOk');
    await p.waitForTimeout(120);
    check('   "Gọi món ngay" → trang Gọi món, bàn chọn sẵn', await S(p, () => document.getElementById('page-orders').classList.contains('is-active')) && (await p.inputValue('#orderTableSelect')) === String(tableId));

    /* 4. GỌI MÓN + VOUCHER */
    await p.click('.menu-card[data-id="1"]');
    await p.click('.menu-card[data-id="1"]');
    for (let k = 0; k < 6; k++) await p.click('.menu-card[data-id="10"]');
    await p.selectOption('#orderEmpSelect', '2');
    await p.selectOption('#orderVoucherSelect', 'VC001');
    check('4. Giỏ: 2 nầm + 6 bia, giảm 10% hiện ngay', (await p.textContent('#cartCount')) === '8 món' && (await p.textContent('#cartDiscount')).includes('VC001') && (await p.textContent('#cartTotal')) === await S(p, () => QN.utils.fmtMoney(Math.round((189000 * 2 + 35000 * 6) * 0.9))));
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(120);
    const inv = await S(p, () => QN.store.db.invoices[QN.store.db.invoices.length - 1]);
    check('   Tạo hóa đơn chờ với voucher, khách gắn bàn', inv.tableId === tableId && inv.status === 'pending' && inv.voucher === 'VC001' && inv.discount === Math.round(588000 * 0.1) && inv.finalTotal === 588000 - 58800, inv);
    check('   Trừ kho theo định mức: nầm −0,6 kg, rau −0,1 kg, bia −6 lon', near(await stockOf(p, 1), stock0.nam - 0.6) && near(await stockOf(p, 8), stock0.rau - 0.1) && near(await stockOf(p, 9), stock0.bia - 6));
    check('   Sinh 3 phiếu xuất bán gắn hóa đơn', await S(p, id => QN.store.db.receipts.filter(r => r.auto && r.invoiceId === id).length === 3, inv.id));

    /* 5. BẾP */
    await go(p, 'kitchen');
    const ticket = await S(p, id => QN.store.db.kitchenOrders.find(k => k.invoiceId === id).id, inv.id);
    check('5. Bếp nhận phiếu mới của bàn', (await p.textContent('#kanbanNew')).includes(await S(p, t => QN.store.tableName(t), tableId)));
    await p.click(`[data-action="kitchen-move"][data-id="${ticket}"][data-to="cooking"]`);
    await p.click(`[data-action="kitchen-move"][data-id="${ticket}"][data-to="done"]`);
    check('   Chuyển Đang chế biến → Hoàn thành hôm nay', await S(p, id => QN.store.get('kitchenOrders', id).status === 'done', ticket) && (await p.textContent('#kanbanDone')).includes(await S(p, id => QN.utils.code('HD', id), inv.id)));

    /* 6. GỌI THÊM */
    await go(p, 'orders');
    await p.click('.menu-card[data-id="11"]');
    await p.click('.menu-card[data-id="11"]');
    await p.selectOption('#orderTableSelect', String(tableId));
    await p.selectOption('#orderEmpSelect', '2');
    check('6. Chọn lại bàn → báo gọi thêm vào hóa đơn đang mở', (await p.textContent('#orderSubmitLabel')).includes('Gọi thêm'));
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(120);
    const merged = await S(p, id => QN.store.get('invoices', id), inv.id);
    check('   Gộp vào cùng hóa đơn, voucher tính lại trên tổng mới', merged.items.length === 3 && merged.total === 638000 && merged.discount === 63800 && merged.finalTotal === 574200, merged);
    check('   Trừ thêm 2 lon nước ngọt', near(await stockOf(p, 10), stock0.nuoc - 2));

    /* 7. THANH TOÁN VNPAY */
    await go(p, 'invoices');
    await p.click(`[data-action="invoice-pay"][data-id="${inv.id}"]`);
    await p.click('[data-action="pay-confirm"][data-method="VNPay"]');
    await p.waitForTimeout(100);
    const paid = await S(p, id => QN.store.get('invoices', id), inv.id);
    check('7. Thanh toán VNPay: lưu phương thức, mã giao dịch, giờ thanh toán', paid.status === 'paid' && paid.payMethod === 'VNPay' && !!paid.txId && !!paid.paidAt, paid);
    check('   Bàn trả về "Trống" (không còn lịch giữ chỗ)', await S(p, t => QN.store.get('tables', t).status === 'available', tableId));

    /* 8. IN HÓA ĐƠN */
    await S(p, () => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
    await p.click(`[data-action="invoice-view"][data-id="${inv.id}"]`);
    const detail = await p.textContent('#invoiceDetailContent');
    check('8. Chi tiết hóa đơn đủ món, voucher, mã giao dịch', ['Nầm sữa nướng', 'Bia Tự Do', 'Nước ngọt', 'VC001', paid.txId].every(t => detail.includes(t)), detail.slice(0, 300));
    await p.click('#invoicePrintBtn');
    check('   In hóa đơn gọi lệnh in', await S(p, () => window.__printed === 1));
    await S(p, () => window.dispatchEvent(new Event('afterprint')));
    await p.keyboard.press('Escape');

    /* 9. BÁO CÁO & TỔNG QUAN CẬP NHẬT */
    await go(p, 'dashboard');
    check('9. Tổng quan: doanh thu hôm nay cộng thêm đúng số tiền', (await p.textContent('#todayRevenue')) === await S(p, x => QN.utils.fmtMoney(x), base.revenueToday + 574200));
    await go(p, 'report-revenue');
    check('   Báo cáo tài chính có hóa đơn vừa trả, ghi VNPay', (await p.textContent('#revenueTableBody')).includes(await S(p, id => QN.utils.code('HD', id), inv.id)) && (await p.textContent('#payMethodChart')).includes('VNPay'));
    const profitOk = await S(p, id => {
        const st = QN.store, i = st.get('invoices', id);
        return i.finalTotal - st.invoiceCost(i) === 574200 - (55750 * 2 + 12000 * 6 + 7500 * 2);
    }, inv.id);
    check('   Lãi gộp hóa đơn = tiền thu − giá vốn theo định mức', profitOk);
    await go(p, 'report-bestseller');
    const beerRow = await S(p, () => [...document.querySelectorAll('#bestsellerTableBody tr')].find(tr => tr.textContent.includes('Bia Tự Do')).children[3].textContent.trim());
    check('   Món bán chạy: bia tăng đúng 6 lon', beerRow === await S(p, x => QN.utils.fmtNumber(x), base.beerSold + 6), { beerRow, expected: base.beerSold + 6 });
    await go(p, 'report-stock');
    check('   Báo cáo tồn kho: tồn bia khớp sau khi bán', (await S(p, () => [...document.querySelectorAll('#stockTableBody tr')].find(tr => tr.textContent.includes('Bia Tự Do')).children[5].textContent.trim())) === await S(p, x => QN.utils.fmtNumber(x), stock0.bia - 6));

    /* 10. XE ĐƯA ĐÓN */
    await go(p, 'delivery');
    await p.click('[data-action="delivery-add"]');
    await p.selectOption('#delCust', '1');
    await p.fill('#delPickup', '12 Phố Huế, Hai Bà Trưng');
    await p.fill('#delGuests', '3');
    await p.fill('#delTime', await S(p, () => QN.utils.todayLocal() + 'T08:00'));
    await submit(p, 'deliveryReqModal');
    check('10. Giờ đón đã qua trong hôm nay → báo lỗi', (await fieldError(p, 'delTime')).includes('đã qua'));
    await p.fill('#delTime', await S(p, () => QN.utils.todayLocal() + 'T21:30'));
    await submit(p, 'deliveryReqModal');
    const req = await S(p, () => QN.store.db.deliveryReqs[QN.store.db.deliveryReqs.length - 1]);
    check('    Tạo yêu cầu đưa đón "Chờ giao xe"', req.pickup === '12 Phố Huế, Hai Bà Trưng' && req.status === 'pending', req);
    await p.click(`[data-action="delivery-assign"][data-id="${req.id}"]`);
    const trip = await S(p, id => QN.store.db.trips.find(t => t.reqId === id), req.id);
    check('    Giao xe 4 chỗ còn trống + tài xế rảnh', trip && trip.vehicleId === 1 && trip.driverId === 7 && await S(p, () => QN.store.get('vehicles', 1).status === 'in_use'), trip);
    await p.click(`[data-action="trip-complete"][data-id="${trip.id}"]`);
    check('    Hoàn tất chuyến → xe sẵn sàng, yêu cầu hoàn tất', await S(p, ([t, r]) => QN.store.get('trips', t).status === 'Hoàn tất' && QN.store.get('vehicles', 1).status === 'available' && QN.store.get('deliveryReqs', r).status === 'completed', [trip.id, req.id]));

    /* 11. NHẬP KHO TÔM ĐANG SẮP HẾT */
    check('11. Trước khi nhập: chuông báo tôm sắp hết', (await S(p, () => QN.store.attentionItems().map(i => i.text).join('|'))).includes('Tôm sú'));
    await go(p, 'inventory');
    await p.click('[data-action="receipt-add"]');
    await p.selectOption('#rcpIngredient', '6');
    await p.fill('#rcpQty', '7.5');
    await p.fill('#rcpNote', 'Nhập bổ sung cuối tuần');
    check('    Xem trước tồn sau phiếu (số lẻ)', (await p.textContent('#rcpPreview')).includes(await S(p, x => QN.utils.fmtNumber(x), Math.round((stock0.tom + 7.5) * 1000) / 1000)));
    await submit(p, 'receiptModal');
    check('    Nhập 7,5 kg: tồn tôm tăng, hết cảnh báo sắp hết', near(await stockOf(p, 6), stock0.tom + 7.5) && !(await S(p, () => QN.store.attentionItems().map(i => i.text).join('|'))).includes('Tôm sú'));
    check('    Phiếu nhập ghi đúng NCC và ghi chú', await S(p, () => { const r = QN.store.db.receipts[QN.store.db.receipts.length - 1]; return r.type === 'import' && r.supplierId === 4 && r.note === 'Nhập bổ sung cuối tuần'; }));
    await shot(p, 'qt-kho', { fullPage: true });

    /* 12. F5: MỌI THỨ VẪN CÒN */
    await p.waitForTimeout(250);
    await p.reload({ waitUntil: 'load' });
    const kept = await S(p, ([invId, resId, reqId]) => {
        const st = QN.store;
        return {
            page: document.querySelector('.page.is-active').id,
            inv: st.get('invoices', invId) && st.get('invoices', invId).status,
            res: st.get('reservations', resId) && st.get('reservations', resId).status,
            req: st.get('deliveryReqs', reqId) && st.get('deliveryReqs', reqId).status,
            tom: st.get('ingredients', 6).stock
        };
    }, [inv.id, res.id, req.id]);
    check('12. F5: vẫn ở trang kho, hóa đơn / đặt bàn / chuyến xe / tồn kho còn nguyên', kept.page === 'page-inventory' && kept.inv === 'paid' && kept.res === 'checked_in' && kept.req === 'completed' && near(kept.tom, stock0.tom + 7.5), kept);
    check('    Số phiếu kho tăng đúng: 3 + 1 phiếu xuất bán, 1 phiếu nhập', (await S(p, () => QN.store.db.receipts.length)) === base.receipts + 5);

    check('Không có lỗi console trong cả vòng quy trình', p._errors.length === 0, p._errors);
};

if (require.main === module) runStandalone(module.exports, 'Một vòng quy trình đầy đủ');
