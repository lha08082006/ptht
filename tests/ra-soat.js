'use strict';
/* =========================================================
   RÀ SOÁT LOGIC & GIAO DIỆN (đợt sau BOM)
   - Đăng nhập không còn "Quên mật khẩu"; menu có nhóm "Quản lý nhân viên" riêng (đúng sơ đồ BFD)
   - Đặt bàn theo ngày giờ: bàn chỉ "Đã đặt" khi có lịch hôm nay; xếp bàn kiểm tra trùng lịch (3 giờ);
     lịch quá giờ 3 tiếng thì quá hạn; bấm bàn "Đã đặt" để check-in; check-in chọn sẵn khách theo SĐT
   - Hủy phiếu bếp chưa chế biến: bỏ món khỏi hóa đơn, hoàn kho đúng lượng đã xuất, HĐ hết món thì "Đã hủy"
   - Hỏi lại khi thanh toán lúc bếp chưa làm xong; hủy yêu cầu đưa đón
   - Hạng khách hàng, hiệu suất nhân viên, đơn giá nhập thực tế
   Chạy riêng: node tests/ra-soat.js
   ========================================================= */
const { APP_URL, newPage, openApp, state, go, isOpen, lastToast, submit, rowCount, runStandalone } = require('./lib');

const S = (page, fn, arg) => page.evaluate(fn, arg);
const near = (a, b) => Math.abs(a - b) < 1e-6;
const cardText = (page, id) => page.evaluate(i => document.querySelector(`.table-card[data-id="${i}"]`).textContent.replace(/\s+/g, ' ').trim(), id);

module.exports = async function raSoat(browser, check) {
    /* ---------- ĐĂNG NHẬP + MENU ---------- */
    const login = await newPage(browser);
    await login.goto(APP_URL, { waitUntil: 'load' });
    check('Trang đăng nhập admin không còn "Quên mật khẩu"', !(await login.$('[data-action="forgot-password"]')) && !(await login.textContent('#loginPage')).includes('Quên mật khẩu'));

    const p = await openApp(browser);
    const group = await S(p, () => document.querySelector('.nav-link[data-page="employees"]').closest('.nav-group').querySelector('.nav-group__label').textContent.trim());
    check('Menu: "Nhân viên" nằm trong nhóm "Quản lý nhân viên" riêng (như sơ đồ BFD)', group === 'Quản lý nhân viên', group);
    await p.click('.nav-link[data-page="employees"]');
    check('Đường dẫn trên cùng ghi đúng nhóm Quản lý nhân viên', (await p.textContent('#breadcrumbGroup')).trim().toLowerCase() === 'quản lý nhân viên');

    /* ---------- ĐẶT BÀN THEO NGÀY GIỜ ---------- */
    await go(p, 'tables');
    check('Bàn có lịch NGÀY MAI vẫn "Trống" hôm nay, chỉ ghi chú lịch đặt', (await cardText(p, 11)).includes('Trống') && (await cardText(p, 11)).includes('Lịch đặt RES001'));
    check('Bàn có lịch HÔM NAY hiện "Đã đặt" kèm giờ giữ', (await cardText(p, 4)).includes('Đã đặt') && (await cardText(p, 4)).includes('Giữ cho RES004 · 21:00'));
    const plan = await S(p, () => {
        const st = QN.store, U = QN.utils;
        const today = U.todayLocal(), tomorrow = U.addDays(today, 1);
        return {
            t4At2030: st.tableBlockReason(st.get('tables', 4), { date: today, time: '20:30', guests: 6 }),
            t4At1730Tomorrow: st.tableBlockReason(st.get('tables', 4), { date: tomorrow, time: '17:30', guests: 6 }),
            t1Soon: st.tableBlockReason(st.get('tables', 1), { date: today, time: '20:00', guests: 2 }),
            t1Tomorrow: st.tableBlockReason(st.get('tables', 1), { date: tomorrow, time: '20:00', guests: 2 })
        };
    });
    check('Xếp bàn: trùng lịch cùng ngày trong vòng 3 giờ → báo rõ lịch nào', (plan.t4At2030 || '').includes('RES004'), plan);
    check('Xếp bàn: lịch ngày khác không bị chặn bởi lịch hôm nay', plan.t4At1730Tomorrow === null, plan);
    check('Xếp bàn: lịch hôm nay sắp tới không xếp vào bàn đang có khách', (plan.t1Soon || '').includes('đang có khách'), plan);
    check('Xếp bàn: lịch ngày mai được dùng bàn hôm nay đang có khách', plan.t1Tomorrow === null, plan);

    // Quá giờ hẹn hơn 3 tiếng (15:00, bây giờ 19:00) → quá hạn, không giữ bàn
    await S(p, () => {
        const st = QN.store;
        st.db.reservations.push({ id: 50, name: 'Khách Trễ', phone: '0977111222', date: QN.utils.todayLocal(), time: '15:00', guests: 2, tableId: 10, status: 'confirmed', note: '', qr: 'RES-050-QNTD' });
        st.get('tables', 10).status = 'reserved';
    });
    await go(p, 'reservations');
    const late = await S(p, () => [...document.querySelectorAll('#reservationTableBody tr')].find(tr => tr.textContent.includes('Khách Trễ')).textContent.replace(/\s+/g, ' '));
    check('Lịch hôm nay quá giờ hẹn 3 tiếng → "Quá hạn", chỉ còn nút Hủy', late.includes('Quá hạn') && !late.includes('Check-in'), late);
    check('Chuyển trang thì bàn của lịch quá hạn tự trả về "Trống"', await S(p, () => QN.store.get('tables', 10).status === 'available'));

    // Bấm bàn "Đã đặt" → hỏi check-in; check-in xong chọn sẵn cả bàn lẫn khách (SĐT có trong danh sách khách)
    await go(p, 'tables');
    await p.click('.table-card[data-id="4"]');
    check('Bấm bàn "Đã đặt" → hỏi check-in khách của lịch đó', await isOpen(p, 'confirmModal') && (await p.textContent('#confirmTitle')).includes('RES004'));
    await p.click('#confirmOk');
    await p.waitForTimeout(100);
    check('Check-in từ sơ đồ bàn: lịch "Đã đến", bàn "Đang dùng"', await S(p, () => QN.store.get('reservations', 4).status === 'checked_in' && QN.store.get('tables', 4).status === 'occupied'));
    await p.click('#confirmOk'); // "Gọi món ngay"
    await p.waitForTimeout(120);
    check('Gọi món ngay: chọn sẵn bàn 4 và khách Hoàng Thị Ánh (khớp SĐT đặt bàn)', (await p.inputValue('#orderTableSelect')) === '4' && (await p.inputValue('#orderCustSelect')) === '5');
    check('Ô chọn khách ghi hạng cho khách quen (để phục vụ ưu tiên)', await S(p, () => [...document.getElementById('orderCustSelect').options].some(o => /khách (Bạc|Vàng|Kim cương)/.test(o.textContent))));
    // Bàn trống bấm → Đang dùng → bấm lại → Trống
    await go(p, 'tables');
    await p.click('.table-card[data-id="20"]');
    const t20a = await S(p, () => QN.store.get('tables', 20).status);
    await p.click('.table-card[data-id="20"]');
    const t20b = await S(p, () => QN.store.get('tables', 20).status);
    check('Đổi tay: Trống → Đang dùng → Trống (không còn tự đặt "Đã đặt" bằng tay)', t20a === 'occupied' && t20b === 'available', { t20a, t20b });

    /* ---------- HỦY PHIẾU BẾP CHƯA CHẾ BIẾN ---------- */
    const tom0 = await S(p, () => QN.store.get('ingredients', 6).stock);
    const vc0 = await S(p, () => QN.store.get('vouchers', 'VC002').qty);
    await go(p, 'orders');
    await p.click('.menu-card[data-id="6"]');
    await p.click('.menu-card[data-id="6"]');
    await p.selectOption('#orderTableSelect', '2');
    await p.selectOption('#orderEmpSelect', '2');
    await p.selectOption('#orderVoucherSelect', 'VC002');
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(120);
    const inv = await S(p, () => QN.store.db.invoices[QN.store.db.invoices.length - 1]);
    const ticket = await S(p, id => QN.store.db.kitchenOrders.find(k => k.invoiceId === id).id, inv.id);
    await go(p, 'kitchen');
    check('Phiếu "Đơn mới" có nút Hủy món, phiếu đang chế biến thì không', !!(await p.$(`[data-action="kitchen-cancel"][data-id="${ticket}"]`)) && (await p.$$('#kanbanCooking [data-action="kitchen-cancel"]')).length === 0);
    await p.click(`[data-action="kitchen-cancel"][data-id="${ticket}"]`);
    check('Hủy món hỏi xác nhận, ghi rõ món và hóa đơn', await isOpen(p, 'confirmModal') && (await p.textContent('#confirmMessage')).includes('2 × Tôm sú ủ muối thảo mộc'));
    await p.click('#confirmOk');
    await p.waitForTimeout(120);
    const cancelled = await S(p, ([id, t]) => {
        const st = QN.store;
        return { status: st.get('invoices', id).status, ticket: !!st.get('kitchenOrders', t), tom: st.get('ingredients', 6).stock, vc: st.get('vouchers', 'VC002').qty, table: st.get('tables', 2).status, rev: st.db.receipts.filter(r => r.reversal && r.invoiceId === id).map(r => r.ingredientId + ':' + r.qty) };
    }, [inv.id, ticket]);
    check('Hủy hết món → hóa đơn "Đã hủy", phiếu bếp được bỏ', cancelled.status === 'cancelled' && !cancelled.ticket, cancelled);
    check('Hoàn kho đúng lượng đã xuất (0,8 kg tôm) bằng phiếu hoàn kho gắn HĐ', near(cancelled.tom, tom0) && cancelled.rev.length === 1 && cancelled.rev[0] === '6:0.8', { tom0, cancelled });
    check('Trả lại lượt voucher và trả bàn', cancelled.vc === vc0 && cancelled.table === 'available', cancelled);
    await go(p, 'invoices');
    check('Danh sách hóa đơn: HĐ hiện "Đã hủy", không còn nút thanh toán', await S(p, code => { const tr = [...document.querySelectorAll('#invoiceTableBody tr')].find(x => x.textContent.includes(code)); return !!tr && tr.textContent.includes('Đã hủy') && !tr.querySelector('[data-action="invoice-pay"]'); }, await S(p, id => QN.utils.code('HD', id), inv.id)));
    await go(p, 'inventory');
    check('Phiếu kho: phiếu hoàn kho có nhãn "Hoàn kho" và ghi "Hủy món · HĐ"', (await p.textContent('#inventoryTableBody tr:first-child')).includes('Hoàn kho') && (await p.textContent('#inventoryTableBody tr:first-child')).includes('Hủy món'));
    const tomVar = await S(p, () => {
        const t = QN.utils.todayLocal();
        const v = QN.store.bomVariance(t, t).find(x => x.ingredient.id === 6);
        return { bom: v.bom, over: v.over };
    });
    // chỉ còn 1 phần tôm (0,4 kg) của HD015 hôm nay; 2 phần vừa hủy không tính
    check('Đối chiếu định mức: món đã hủy không bị tính là xuất theo định mức', near(tomVar.bom, 0.4) && near(tomVar.over, 0), tomVar);

    // Hủy một phần: hóa đơn còn món khác thì chỉ tính lại tiền
    await go(p, 'orders');
    await p.click('.menu-card[data-id="10"]');
    await p.selectOption('#orderTableSelect', '1');   // HD015 đang mở: gọi thêm 1 bia
    await p.selectOption('#orderEmpSelect', '2');
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(120);
    const extra = await S(p, () => QN.store.db.kitchenOrders.find(k => k.invoiceId === 15 && k.extra).id);
    const totalWithBeer = await S(p, () => QN.store.get('invoices', 15).finalTotal);
    await go(p, 'kitchen');
    await p.click(`[data-action="kitchen-cancel"][data-id="${extra}"]`);
    await p.click('#confirmOk');
    await p.waitForTimeout(120);
    const partial = await S(p, () => { const i = QN.store.get('invoices', 15); return { status: i.status, total: i.finalTotal, beer: i.items.find(x => x.foodId === 10).qty }; });
    check('Hủy phần gọi thêm: hóa đơn vẫn chờ thanh toán, bớt đúng 1 bia và 35.000đ', partial.status === 'pending' && partial.beer === 6 && partial.total === totalWithBeer - 35000, { partial, totalWithBeer });

    /* ---------- THANH TOÁN KHI BẾP CHƯA XONG ---------- */
    await go(p, 'invoices');
    await p.click('[data-action="invoice-pay"][data-id="15"]');
    await p.waitForTimeout(80);
    check('Thanh toán HĐ còn phiếu bếp đang chế biến → hỏi lại', await isOpen(p, 'confirmModal') && (await p.textContent('#confirmMessage')).includes('chưa hoàn thành'));
    await p.click('#confirmCancel');
    await p.waitForTimeout(80);
    check('Chọn "Chưa" → không mở thanh toán', !(await isOpen(p, 'paymentModal')) && await S(p, () => QN.store.get('invoices', 15).status === 'pending'));

    /* ---------- HỦY YÊU CẦU ĐƯA ĐÓN ---------- */
    await go(p, 'delivery');
    await p.click('[data-action="delivery-cancel"][data-id="1"]');
    check('Hủy yêu cầu đưa đón hỏi xác nhận', await isOpen(p, 'confirmModal'));
    await p.click('#confirmOk');
    await p.waitForTimeout(80);
    check('Yêu cầu chuyển "Đã hủy", không còn nút Giao xe', await S(p, () => QN.store.get('deliveryReqs', 1).status === 'cancelled') && !(await p.$('[data-action="delivery-assign"][data-id="1"]')));

    /* ---------- HẠNG KHÁCH HÀNG + HIỆU SUẤT NHÂN VIÊN ---------- */
    await go(p, 'customers');
    const cust = await S(p, () => {
        const st = QN.store, U = QN.utils;
        return st.db.customers.map(c => {
            const tr = [...document.querySelectorAll('#customerTableBody tr')].find(x => x.textContent.includes(c.name));
            const s = st.customerStats(c.id);
            return { ok: !!tr && tr.textContent.includes(U.fmtMoney(s.spent)) && tr.textContent.includes(s.tier.label) && (!s.next || tr.textContent.includes('lên hạng ' + s.next.label)), tier: s.tier.label };
        });
    });
    check('Khách hàng: số lần đến, tổng chi tiêu, hạng, số tiền còn thiếu để lên hạng', cust.every(c => c.ok) && cust.some(c => c.tier !== 'Thường'), cust);
    await p.fill('#searchCustomer', 'bac');
    await p.waitForTimeout(50);
    const silver = await S(p, () => QN.store.db.customers.filter(c => QN.store.customerStats(c.id).tier.label === 'Bạc').length);
    check('Tìm khách theo hạng ("bac" → khách hạng Bạc)', (await rowCount(p, 'customerTableBody')) === silver && silver > 0, silver);
    await p.fill('#searchCustomer', '');
    await go(p, 'employees');
    const emp = await S(p, () => {
        const st = QN.store, U = QN.utils;
        const row = name => [...document.querySelectorAll('#employeeTableBody tr')].find(x => x.textContent.includes(name)).textContent.replace(/\s+/g, ' ');
        const phuc = st.employeeStats(2);
        return { phuc: row('Trần Văn Phục').includes(U.fmtMoney(phuc.revenue)) && phuc.invoices > 0, driver: st.employeeStats(5).trips >= 1 };
    });
    check('Nhân viên: hóa đơn phục vụ + doanh thu, chuyến xe của tài xế', emp.phuc && emp.driver, emp);

    /* ---------- ĐƠN GIÁ NHẬP THỰC TẾ ---------- */
    await go(p, 'inventory');
    await p.click('[data-action="receipt-add"]');
    await p.selectOption('#rcpIngredient', '6');
    check('Phiếu nhập: điền sẵn đơn giá hiện tại của nguyên liệu', (await p.inputValue('#rcpPrice')) === '320000');
    await p.fill('#rcpQty', '5');
    await p.fill('#rcpPrice', '300000');
    check('Xem trước dùng giá nhập mới (so với giá đang dùng)', (await p.textContent('#rcpPreview')).includes('300.000đ') && (await p.textContent('#rcpPreview')).includes('đang 320.000đ') && (await p.textContent('#rcpPreview')).includes('1.500.000đ'));
    await submit(p, 'receiptModal');
    const imp = await S(p, () => { const st = QN.store; const r = st.db.receipts[st.db.receipts.length - 1]; return { unit: r.unitPrice, total: r.total, price: st.get('ingredients', 6).price, cost: st.foodCost(st.get('foods', 6)) }; });
    check('Lưu: phiếu ghi giá nhập 300.000đ, đơn giá nguyên liệu cập nhật, giá vốn món tôm đổi theo (0,4 kg × 300.000đ)', imp.unit === 300000 && imp.total === 1500000 && imp.price === 300000 && imp.cost === 120000, imp);
    await p.click('[data-action="receipt-add"]');
    await p.selectOption('#rcpType', 'export');
    check('Phiếu xuất: không có ô đơn giá nhập', await p.isHidden('#rcpPriceField'));
    await p.keyboard.press('Escape');

    const errors = [login, p].flatMap(x => x._errors);
    check('Không có lỗi console', errors.length === 0, errors);
};

if (require.main === module) runStandalone(module.exports, 'Rà soát logic & giao diện');
