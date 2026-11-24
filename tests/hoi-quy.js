'use strict';
/* =========================================================
   BỘ KIỂM THỬ HỒI QUY: đăng nhập, 18 trang, CRUD + kiểm tra dữ liệu nhập,
   gọi món → bếp → thanh toán, kho, xe đưa đón, báo cáo, điện thoại.
   Chạy riêng: node tests/hoi-quy.js
   ========================================================= */
const { APP_URL, newPage, login, state, go, isOpen, fieldError, fieldDbg, lastToast, submit, shot, runStandalone } = require('./lib');

module.exports = async function hoiQuy(browser, check) {
    const page = await newPage(browser);
    await page.goto(APP_URL, { waitUntil: 'load' });

    /* ---------- ĐĂNG NHẬP ---------- */
    await page.click('#loginForm button[type="submit"]');
    check('Đăng nhập trống báo lỗi', await page.isVisible('#loginError') && (await page.textContent('#loginErrorText')).includes('Vui lòng'));
    await page.fill('#loginUsername', 'admin'); await page.fill('#loginPassword', 'sai');
    await page.click('#loginForm button[type="submit"]');
    check('Sai mật khẩu báo lỗi', (await page.textContent('#loginErrorText')).includes('Sai'));
    await page.check('#rememberMe');
    await login(page);
    check('Đăng nhập đúng vào Tổng quan', await page.isVisible('#appShell') && await page.isVisible('#page-dashboard'));
    check('Breadcrumb Tổng quan', (await page.textContent('#breadcrumbCurrent')) === 'Tổng quan');
    check('Chuông hiển thị số thật', await state(page, () => { const a = QN.store.attention(); return document.getElementById('bellCount').textContent === String(a.total) && a.total > 0; }));
    check('Dashboard có số liệu', (await page.textContent('#statTables')) === '20' && (await page.textContent('#statTablesSub')).includes('đang dùng'));

    /* ---------- DỮ LIỆU MẪU NHẤT QUÁN ---------- */
    check('Dữ liệu mẫu: tồn = nhập − xuất (kể cả phiếu xuất bán theo định mức)', await state(page, () => QN.store.db.ingredients.every(g => Math.abs(g.stock - QN.store.db.receipts.filter(r => r.ingredientId === g.id).reduce((s, r) => s + (r.type === 'import' ? r.qty : -r.qty), 0)) < 1e-6)));
    check('Dữ liệu mẫu: bàn có HĐ chờ = Đang dùng', await state(page, () => QN.store.db.invoices.filter(i => i.status === 'pending').every(i => QN.store.get('tables', i.tableId).status === 'occupied')));
    check('Dữ liệu mẫu: xe đang chạy chuyến = Đang dùng', await state(page, () => QN.store.activeTrips().every(t => QN.store.get('vehicles', t.vehicleId).status === 'in_use')));
    check('Dữ liệu mẫu: HĐ chờ không ghi sẵn phương thức (L9)', await state(page, () => QN.store.db.invoices.filter(i => i.status === 'pending').every(i => i.payMethod === '')));
    check('Dữ liệu mẫu: ngày theo giờ máy, hóa đơn mới nhất là hôm nay (L7)', await state(page, () => QN.store.db.invoices.some(i => i.date === QN.utils.todayLocal())));

    /* ---------- ĐIỀU HƯỚNG 18 TRANG ---------- */
    const pages = ['dashboard', 'customers', 'employees', 'reservations', 'tables', 'foods', 'orders', 'invoices', 'vouchers', 'kitchen', 'ingredients', 'suppliers', 'inventory', 'vehicles', 'delivery', 'report-revenue', 'report-bestseller', 'report-stock'];
    for (const p of pages) {
        await page.click(`.nav-link[data-page="${p}"]`);
        await page.waitForTimeout(60);
        const ok = await state(page, n => document.getElementById('page-' + n).classList.contains('is-active') && document.querySelector(`.nav-link[data-page="${n}"]`).classList.contains('is-active'), p);
        check('Mở trang ' + p, ok);
    }
    check('Breadcrumb có nhóm', (await page.textContent('#breadcrumbGroup')) === 'Báo cáo - Thống kê');

    /* ---------- SIDEBAR MÁY TÍNH (L1) ---------- */
    const w0 = await state(page, () => document.getElementById('sidebar').getBoundingClientRect().width);
    await page.click('#toggleSidebar'); await page.waitForTimeout(350);
    const w1 = await state(page, () => document.getElementById('sidebar').getBoundingClientRect().width);
    await page.click('#toggleSidebar'); await page.waitForTimeout(350);
    check('Nút ☰ thu gọn sidebar trên máy tính (L1)', w0 === 264 && w1 === 76, { w0, w1 });

    /* ---------- XSS (L5) ---------- */
    await go(page, 'customers');
    await page.click('[data-action="crud-add"][data-entity="customers"]');
    await page.fill('#custName', '<img src=x onerror="window.__xss=1">');
    await page.fill('#custPhone', '0987654321');
    await submit(page, 'customerModal');
    await page.waitForTimeout(200);
    check('Tên chứa HTML không chạy script (L5)', !(await state(page, () => window.__xss)) && (await page.textContent('#customerTableBody')).includes('<img src=x'));

    /* ---------- KHÁCH HÀNG: kiểm tra dữ liệu, sửa, form sạch (L4), tìm không dấu ---------- */
    await page.click('[data-action="crud-add"][data-entity="customers"]');
    await submit(page, 'customerModal');
    check('Bỏ trống họ tên/SĐT → lỗi tại ô', (await fieldError(page, 'custName')).length > 0 && (await fieldError(page, 'custPhone')).length > 0);
    await page.fill('#custName', 'Test'); await page.fill('#custPhone', '12345');
    await submit(page, 'customerModal');
    check('SĐT sai định dạng → lỗi', (await fieldError(page, 'custPhone')).includes('SĐT'));
    await page.fill('#custPhone', '0901234567');
    await submit(page, 'customerModal');
    check('SĐT trùng → lỗi', (await fieldError(page, 'custPhone')).includes('đã thuộc'));
    await page.keyboard.press('Escape');
    check('Esc đóng modal', !(await isOpen(page, 'customerModal')));
    await page.click('#customerTableBody tr:first-child [data-action="crud-edit"]');
    check('Sửa: điền sẵn dữ liệu + tiêu đề Sửa', (await page.inputValue('#custName')) === 'Nguyễn Văn An' && (await page.textContent('#customerModalTitle')).includes('Sửa'));
    await page.click('#customerModal [data-close]');
    await page.click('[data-action="crud-add"][data-entity="customers"]');
    check('Thêm sau Sửa→Hủy: form trống (L4)', (await page.inputValue('#custName')) === '' && (await page.textContent('#customerModalTitle')).includes('Thêm'));
    await page.keyboard.press('Escape');
    await page.fill('#searchCustomer', 'nguyen van');
    check('Tìm không dấu tìm ra "Nguyễn Văn An"', (await page.textContent('#customerTableBody')).includes('Nguyễn Văn An'));
    await page.fill('#searchCustomer', 'zzzz');
    check('Tìm không thấy → thông báo, không để trắng', (await page.textContent('#customerTableBody')).includes('Không tìm thấy'));
    await page.fill('#searchCustomer', '');
    await page.dispatchEvent('#searchCustomer', 'input');
    await page.click('#customerTableBody tr:first-child [data-action="crud-delete"]');
    check('Xóa khách đã có hóa đơn bị chặn (L16)', (await lastToast(page)).includes('Không thể xóa') && !(await isOpen(page, 'confirmModal')));
    // xóa khách mới thêm → có hộp xác nhận riêng
    const nCust = await state(page, () => QN.store.db.customers.length);
    await page.click('#customerTableBody tr:last-child [data-action="crud-delete"]');
    check('Xóa dùng hộp xác nhận riêng', await isOpen(page, 'confirmModal'));
    await page.click('#confirmOk'); await page.waitForTimeout(80);
    check('Xóa xong giảm 1 bản ghi', (await state(page, () => QN.store.db.customers.length)) === nCust - 1);

    /* ---------- NGUYÊN LIỆU: sửa không mất NCC (L3), không đổi ĐVT khi có phiếu ---------- */
    await go(page, 'ingredients');
    await page.click('#ingredientTableBody tr:first-child [data-action="crud-edit"]');
    check('Sửa nguyên liệu hiển thị đúng NCC (L3)', (await page.inputValue('#ingSupplier')) === '3');
    await page.fill('#ingPrice', '185000');
    await submit(page, 'ingredientModal');
    const ingDbg = await state(page, () => ({ ing: QN.store.get('ingredients', 1), open: document.getElementById('ingredientModal').classList.contains('is-open'), errs: [...document.querySelectorAll('#ingredientModal .field__error')].map(e => e.textContent).filter(Boolean), vals: ['ingName','ingPrice','ingUnit','ingSupplier'].map(i => document.getElementById(i).value) }));
    check('Lưu xong vẫn giữ NCC (L3)', ingDbg.ing.supplierId === 3 && ingDbg.ing.price === 185000, ingDbg);
    await page.click('#ingredientTableBody tr:nth-child(9) [data-action="crud-edit"]');
    check('ĐVT "lon" hiển thị đúng khi sửa (không bị đổi thành "kg")', (await page.inputValue('#ingUnit')) === 'lon');
    await page.selectOption('#ingUnit', 'kg');
    await submit(page, 'ingredientModal');
    check('Không đổi được ĐVT khi đã có phiếu kho', (await fieldError(page, 'ingUnit')).includes('Không đổi được'));
    await page.keyboard.press('Escape');

    /* ---------- VOUCHER (L6) ---------- */
    await go(page, 'vouchers');
    await page.click('[data-action="crud-add"][data-entity="vouchers"]');
    await page.fill('#vcId', 'vc001'); await page.fill('#vcPercent', '150'); await page.fill('#vcQty', '');
    await submit(page, 'voucherModal');
    const vcDbg = await state(page, () => ({ err: document.querySelector('#vcId').closest('.field').querySelector('.field__error').textContent, val: document.getElementById('vcId').value, ro: document.getElementById('vcId').readOnly, open: document.getElementById('voucherModal').classList.contains('is-open'), active: document.activeElement && document.activeElement.id }));
    check('Voucher trùng mã (không phân biệt hoa thường) → lỗi', vcDbg.err.includes('đã tồn tại'), vcDbg);
    check('Voucher giảm 150% → lỗi', (await fieldError(page, 'vcPercent')).length > 0);
    check('Voucher thiếu số lượng → lỗi', (await fieldError(page, 'vcQty')).length > 0);
    await page.fill('#vcId', 'tet2027'); await page.fill('#vcPercent', '12'); await page.fill('#vcQty', '5');
    await submit(page, 'voucherModal');
    check('Voucher hợp lệ lưu với mã in hoa', await state(page, () => !!QN.store.get('vouchers', 'TET2027')));
    await page.click('#voucherTableBody tr:last-child [data-action="crud-edit"]');
    check('Sửa voucher: mã chỉ đọc', await page.$eval('#vcId', el => el.readOnly));
    await page.keyboard.press('Escape');

    /* ---------- MÓN ĂN ---------- */
    await go(page, 'foods');
    await page.click('[data-action="crud-add"][data-entity="foods"]');
    await page.fill('#foodName', 'Lẩu thử'); await page.fill('#foodPrice', '-5');
    await submit(page, 'foodModal');
    const fpDbg = await fieldDbg(page, 'foodPrice');
    check('Giá món âm → lỗi', (fpDbg.err || '').length > 0, fpDbg);
    await page.keyboard.press('Escape');

    /* ---------- XE ---------- */
    await go(page, 'vehicles');
    await page.click('[data-action="crud-add"][data-entity="vehicles"]');
    await page.fill('#vehPlate', '30a 12345'); await page.fill('#vehSeats', '4');
    await submit(page, 'vehicleModal');
    const plDbg = await fieldDbg(page, 'vehPlate');
    check('Biển số trùng (khác cách viết) → lỗi', (plDbg.err || '').includes('đã có'), plDbg);
    await page.keyboard.press('Escape');

    /* ---------- GỌI MÓN → BẾP → HÓA ĐƠN → THANH TOÁN ---------- */
    await go(page, 'orders');
    await page.click('[data-action="order-submit"]');
    check('Gửi đơn khi chưa có món → nhắc', (await lastToast(page)).includes('Chưa chọn món'));
    await page.click('.menu-card[data-id="1"]'); await page.click('.menu-card[data-id="1"]'); await page.click('.menu-card[data-id="10"]');
    check('Giỏ hàng: 3 món, thành tiền đúng', (await page.textContent('#cartCount')) === '3 món' && (await page.textContent('#cartTotal')).replace(/\D/g, '') === String(189000 * 2 + 35000));
    check('Thẻ món hiển thị số lượng đã chọn', (await page.textContent('.menu-card[data-id="1"] .menu-card__badge')).includes('×2'));
    await page.click('.cart-item [data-action="cart-dec"][data-id="1"]');
    check('Giảm số lượng trong giỏ', (await page.textContent('#cartCount')) === '2 món');
    await page.click('[data-action="order-submit"]');
    check('Thiếu bàn/NV → lỗi tại ô chọn', (await fieldError(page, 'orderTableSelect')).length > 0 && (await fieldError(page, 'orderEmpSelect')).length > 0);
    const freeTable = await state(page, () => QN.store.db.tables.find(t => t.status === 'available').id);
    await page.selectOption('#orderTableSelect', String(freeTable));
    await page.selectOption('#orderEmpSelect', '2');
    await page.selectOption('#orderVoucherSelect', 'VC001');
    const qtyBefore = await state(page, () => QN.store.get('vouchers', 'VC001').qty);
    check('Voucher trừ tiền trong giỏ', (await page.textContent('#cartDiscount')).includes('VC001'));
    await page.click('[data-action="order-submit"]');
    const inv = await state(page, () => QN.store.db.invoices[QN.store.db.invoices.length - 1]);
    check('Tạo hóa đơn chờ, ngày hôm nay, chưa có phương thức', inv.status === 'pending' && inv.payMethod === '' && inv.date === (await state(page, () => QN.utils.todayLocal())) && inv.discount === Math.round(224000 * 0.1), inv);
    check('Bàn chuyển Đang dùng, voucher giảm 1, giỏ trống', await state(page, ([t, q]) => QN.store.get('tables', t).status === 'occupied' && QN.store.get('vouchers', 'VC001').qty === q - 1, [freeTable, qtyBefore]) && (await page.textContent('#cartCount')) === '0 món');
    check('Phiếu bếp mới gắn hóa đơn', await state(page, id => QN.store.db.kitchenOrders.some(k => k.invoiceId === id && k.status === 'new'), inv.id));

    // Gọi thêm món cho bàn đang có hóa đơn mở → gộp vào chính hóa đơn đó
    const invCount = await state(page, () => QN.store.db.invoices.length);
    await page.click('.menu-card[data-id="11"]');
    await page.selectOption('#orderTableSelect', String(freeTable));
    check('Chọn bàn đang có HĐ mở → báo sẽ gọi thêm vào HĐ đó', (await page.textContent('#orderTableHint')).includes('HD' + String(inv.id).padStart(3, '0')) && (await page.textContent('#orderSubmitLabel')).includes('Gọi thêm'));
    check('HĐ đã áp dụng voucher → khóa ô voucher', await page.$eval('#orderVoucherSelect', el => el.disabled));
    await page.click('[data-action="order-submit"]');
    await page.waitForTimeout(80);
    const merged = await state(page, id => QN.store.get('invoices', id), inv.id);
    check('Gọi thêm món gộp vào HĐ đang mở, tính lại tổng và giảm giá', (await state(page, () => QN.store.db.invoices.length)) === invCount && merged.items.some(it => it.foodId === 11) && merged.total === 224000 + 25000 && merged.discount === Math.round((224000 + 25000) * 0.1), merged);
    check('Món gọi thêm có phiếu bếp riêng gắn nhãn "Gọi thêm"', await state(page, id => QN.store.db.kitchenOrders.some(k => k.invoiceId === id && k.extra && k.items.length === 1 && k.items[0].foodId === 11), inv.id));
    // Dữ liệu cũ có 2 HĐ chờ cùng bàn: thanh toán 1 HĐ thì bàn vẫn "Đang dùng" (L12)
    const inv2 = await state(page, t => { const S = QN.store; const id = S.nextId('invoices'); S.db.invoices.push({ id, date: QN.utils.todayLocal(), time: '00:01', tableId: t, custId: 0, empId: 2, items: [{ foodId: 10, name: 'Bia Tự Do', category: 'Đồ uống', price: 35000, qty: 1 }], total: 35000, voucher: '', voucherPercent: 0, discount: 0, finalTotal: 35000, status: 'pending', payMethod: '', txId: '', paidAt: '' }); return id; }, freeTable);

    await go(page, 'kitchen');
    await page.click(`[data-action="kitchen-move"][data-to="cooking"]`);
    check('Bếp: chuyển sang Đang chế biến', await state(page, () => QN.store.db.kitchenOrders.filter(k => k.status === 'cooking').length >= 2));

    await go(page, 'invoices');
    await page.click('[data-action="invoice-filter"][data-filter="pending"]');
    check('Lọc hóa đơn chờ', await state(page, () => [...document.querySelectorAll('#invoiceTableBody tr')].every(tr => tr.textContent.includes('Chờ TT'))));
    await page.click(`[data-action="invoice-view"][data-id="${inv.id}"]`);
    check('Xem chi tiết hóa đơn (HĐ chờ ghi rõ chưa thanh toán)', await isOpen(page, 'invoiceDetailModal') && (await page.textContent('#invoiceDetailContent')).includes('chưa được thanh toán'));
    await page.keyboard.press('Escape');
    await page.click(`[data-action="invoice-pay"][data-id="${inv.id}"]`);
    await page.click('[data-action="pay-confirm"][data-method="MoMo"]');
    const paidInv = await state(page, id => QN.store.get('invoices', id), inv.id);
    check('Thanh toán: lưu phương thức + mã GD', paidInv.status === 'paid' && paidInv.payMethod === 'MoMo' && /^TXN/.test(paidInv.txId) && !!paidInv.paidAt);
    check('Bàn còn HĐ khác → vẫn Đang dùng (L12)', await state(page, t => QN.store.get('tables', t).status === 'occupied', freeTable));
    await page.click('[data-action="invoice-filter"][data-filter="all"]');
    await page.click(`[data-action="invoice-pay"][data-id="${inv2}"]`);
    await page.click('[data-action="pay-confirm"][data-method="Tiền mặt"]');
    check('Trả hết HĐ → bàn Trống', await state(page, t => QN.store.get('tables', t).status === 'available', freeTable));
    await page.click(`[data-action="invoice-view"][data-id="${inv.id}"]`);
    check('Chi tiết hiện mã GD', (await page.textContent('#invoiceDetailContent')).includes(paidInv.txId));
    await page.keyboard.press('Escape');

    /* ---------- ĐẶT BÀN ---------- */
    await go(page, 'reservations');
    await page.click('[data-action="reservation-add"]');
    const yesterday = await state(page, () => QN.utils.addDays(QN.utils.todayLocal(), -1));
    const tomorrow = await state(page, () => QN.utils.addDays(QN.utils.todayLocal(), 1));
    await page.fill('#resName', 'Khách Test'); await page.fill('#resPhone', '0911111111');
    await page.fill('#resDate', yesterday); await page.fill('#resTime', '19:00'); await page.fill('#resGuests', '30');
    await submit(page, 'reservationModal');
    check('Đặt bàn ngày đã qua → lỗi', (await fieldError(page, 'resDate')).length > 0);
    check('Số người vượt bàn lớn nhất → lỗi', (await fieldError(page, 'resGuests')).includes('10 chỗ'));
    await page.fill('#resDate', tomorrow); await page.fill('#resGuests', '3');
    check('Dropdown bàn chỉ hiện bàn trống đủ chỗ', await state(page, () => [...document.getElementById('resTable').options].filter(o => o.value).every(o => { const t = QN.store.get('tables', o.value); return t.status === 'available' && t.seats >= 3; })));
    await submit(page, 'reservationModal');
    const res = await state(page, () => QN.store.db.reservations[QN.store.db.reservations.length - 1]);
    check('Tạo đặt bàn chờ xác nhận', res.name === 'Khách Test' && res.status === 'pending');
    await page.click(`[data-action="reservation-confirm"][data-id="${res.id}"]`);
    const resAfter = await state(page, id => { const r = QN.store.get('reservations', id); return { r, seats: QN.store.get('tables', r.tableId).seats, status: QN.store.get('tables', r.tableId).status }; }, res.id);
    check('Xác nhận: gán bàn nhỏ nhất đủ chỗ (4 chỗ cho 3 khách)', resAfter.r.status === 'confirmed' && resAfter.seats === 4 && resAfter.status === 'reserved', resAfter);
    // đặt bàn chọn sẵn bàn, rồi bàn đó bị dùng → xác nhận phải chuyển bàn, không ghi đè (L10)
    const t2 = await state(page, () => QN.store.db.tables.find(t => t.status === 'available' && t.seats >= 2).id);
    await page.click('[data-action="reservation-add"]');
    await page.fill('#resName', 'Khách B'); await page.fill('#resPhone', '0922222222'); await page.fill('#resDate', tomorrow); await page.fill('#resGuests', '2');
    await page.dispatchEvent('#resGuests', 'input');
    await page.selectOption('#resTable', String(t2));
    await submit(page, 'reservationModal');
    const resB = await state(page, () => QN.store.db.reservations[QN.store.db.reservations.length - 1].id);
    await state(page, t => { QN.store.get('tables', t).status = 'occupied'; }, t2);
    await page.click(`[data-action="reservation-confirm"][data-id="${resB}"]`);
    check('Bàn đã chọn bị dùng → không ghi đè, chuyển bàn khác (L10)', await state(page, ([t, id]) => QN.store.get('tables', t).status === 'occupied' && QN.store.get('reservations', id).tableId !== t, [t2, resB]));
    await page.click(`[data-action="reservation-qr"][data-id="${res.id}"]`);
    check('Xem mã QR', await isOpen(page, 'qrModal') && (await page.textContent('#qrContent')).includes(res.qr));
    await page.keyboard.press('Escape');
    await page.click(`[data-action="reservation-cancel"][data-id="${res.id}"]`);
    await page.click('#confirmOk'); await page.waitForTimeout(80);
    check('Hủy đặt bàn trả bàn về Trống', await state(page, id => { const r = QN.store.get('reservations', id); return r.status === 'cancelled' && QN.store.get('tables', r.tableId).status === 'available'; }, res.id));

    /* ---------- NHẬP / XUẤT KHO (L2, L6) ---------- */
    await go(page, 'reservations');
    await page.click('[data-action="reservation-filter"][data-filter="pending"]');
    await go(page, 'inventory');
    await page.click('[data-action="inventory-filter"][data-filter="import"]');
    await page.click('[data-action="inventory-filter"][data-filter="all"]');
    const tabs = await state(page, () => ({
        inv: [...document.querySelectorAll('[data-tabs="inventory"] .tab.is-active')].map(b => b.dataset.filter),
        res: [...document.querySelectorAll('[data-tabs="reservations"] .tab.is-active')].map(b => b.dataset.filter)
    }));
    check('Tab kho không ảnh hưởng tab đặt bàn (L2)', tabs.inv.join() === 'all' && tabs.res.join() === 'pending', tabs);
    await page.click('[data-action="receipt-add"]');
    await page.selectOption('#rcpIngredient', '2');
    check('Phiếu nhập: tự chọn NCC của nguyên liệu', (await page.inputValue('#rcpSupplier')) === '1');
    await page.fill('#rcpQty', '-10');
    await submit(page, 'receiptModal');
    check('Nhập số lượng âm → lỗi (L6)', (await fieldError(page, 'rcpQty')).length > 0);
    await page.selectOption('#rcpType', 'export');
    check('Phiếu xuất: ẩn ô NCC', await page.isHidden('#rcpSupplierField'));
    await page.fill('#rcpQty', '999');
    await submit(page, 'receiptModal');
    check('Xuất vượt tồn → lỗi', (await fieldError(page, 'rcpQty')).includes('Không đủ'));
    await page.selectOption('#rcpType', 'import');
    await page.fill('#rcpQty', '5');
    check('Xem trước tồn sau phiếu', (await page.textContent('#rcpPreview')).includes('Tồn sau phiếu'));
    const s0 = await state(page, () => QN.store.get('ingredients', 2).stock);
    await submit(page, 'receiptModal');
    check('Nhập kho cộng tồn', (await state(page, () => QN.store.get('ingredients', 2).stock)) === s0 + 5);

    /* ---------- ĐƯA ĐÓN (L11) ---------- */
    await go(page, 'delivery');
    await page.click('[data-action="delivery-add"]');
    await page.selectOption('#delCust', '2'); await page.fill('#delPickup', '1 Tràng Tiền'); await page.fill('#delGuests', '40');
    await submit(page, 'deliveryReqModal');
    check('Số người vượt xe lớn nhất → lỗi', (await fieldError(page, 'delGuests')).includes('16 chỗ'));
    await page.fill('#delGuests', '3');
    await submit(page, 'deliveryReqModal');
    await page.click('[data-action="delivery-assign"][data-id="1"]');
    let trip = await state(page, () => QN.store.db.trips[QN.store.db.trips.length - 1]);
    check('Giao xe: xe nhỏ nhất đủ chỗ + tài xế rảnh', trip.vehicleId === 1 && trip.driverId === 7, trip);
    const lastReq = await state(page, () => QN.store.db.deliveryReqs[QN.store.db.deliveryReqs.length - 1].id);
    await page.click(`[data-action="delivery-assign"][data-id="${lastReq}"]`);
    check('Hết tài xế rảnh → báo, không gán trùng (L11)', (await lastToast(page)).includes('tài xế') && (await state(page, () => QN.store.activeTrips().length)) === 2);

    /* ---------- QUẢN LÝ BÀN ---------- */
    await go(page, 'tables');
    const occ = await state(page, () => QN.store.db.tables.find(t => t.status === 'occupied' && QN.store.pendingInvoicesOfTable(t.id).length).id);
    await page.click(`[data-action="table-toggle"][data-id="${occ}"]`);
    check('Đổi bàn còn HĐ chờ → hỏi xác nhận', await isOpen(page, 'confirmModal'));
    await page.click('#confirmCancel');
    check('Hủy xác nhận → giữ nguyên trạng thái', await state(page, t => QN.store.get('tables', t).status === 'occupied', occ));

    /* ---------- BÁO CÁO ---------- */
    await go(page, 'report-revenue');
    const range = await state(page, () => [document.getElementById('revDateFrom').value, document.getElementById('revDateTo').value, QN.utils.todayLocal()]);
    check('Báo cáo mặc định 7 ngày đến hôm nay (L8)', range[1] === range[2] && range[0] === (await state(page, () => QN.utils.addDays(QN.utils.todayLocal(), -6))), range);
    check('Hóa đơn mới tạo có trong báo cáo (L8)', (await page.textContent('#revenueTableBody')).includes('HD' + String(inv.id).padStart(3, '0')));
    check('Biểu đồ tỷ lệ thanh toán vẽ đúng (thanh phân đoạn, G1)', await state(page, () => document.querySelectorAll('#revenueStatusChart .segbar__part').length === 2 && !document.querySelector('.donut-svg')));
    check('Biểu đồ nguyên liệu tiêu thụ lấy từ phiếu xuất (L14)', (await page.textContent('#consumptionChart')).includes('Tôm sú') || (await page.textContent('#consumptionChart')).includes('Cá diêu hồng'));
    check('HĐ chờ hiện "—" ở cột thanh toán (L9)', await state(page, () => [...document.querySelectorAll('#revenueTableBody tr')].filter(tr => tr.textContent.includes('Chờ TT')).every(tr => tr.children[7].textContent.trim() === '—')));
    await page.fill('#revDateFrom', range[2]);
    await page.fill('#revDateTo', range[0]);
    await page.click('#revRangeForm button[type="submit"]');
    check('Từ > Đến → cảnh báo', (await lastToast(page)).includes('Từ ngày'));
    await go(page, 'report-bestseller');
    check('Báo cáo món bán chạy có xếp hạng', (await page.$$('#bestsellerTableBody tr')).length > 5);
    await go(page, 'report-stock');
    check('Báo cáo tồn kho: Nhập − Xuất = Tồn từng dòng', await state(page, () => [...document.querySelectorAll('#stockTableBody tr')].every(tr => {
        const n = i => Number(tr.children[i].textContent.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
        return Math.abs(n(3) - n(4) - n(5)) < 1e-6;
    })));

    /* ---------- ĐĂNG XUẤT + GHI NHỚ ---------- */
    await page.click('#logoutBtn');
    check('Đăng xuất về trang đăng nhập, nhớ tên đăng nhập', await page.isVisible('#loginPage') && (await page.inputValue('#loginUsername')) === 'admin' && (await page.inputValue('#loginPassword')) === '');
    await page.fill('#loginPassword', '123456');
    await page.click('#loginForm button[type="submit"]');
    await page.waitForTimeout(150);
    check('Đăng nhập lại về Tổng quan (L17)', await state(page, () => document.getElementById('page-dashboard').classList.contains('is-active')));

    check('Không có lỗi console', page._errors.length === 0, page._errors);
    check('Không tải tài nguyên ngoài (chạy offline)', page._external.length === 0, page._external);

    /* ---------- GIỜ SÁNG SỚM (L7): 02:00 giờ VN ---------- */
    const early = await newPage(browser, { now: '2026-11-24T02:00:00+07:00' });
    await early.goto(APP_URL, { waitUntil: 'load' });
    await login(early);
    const e = await state(early, () => ({ today: QN.utils.todayLocal(), latest: QN.store.db.invoices.map(i => i.date).sort().pop() }));
    check('Lúc 02:00 sáng vẫn lấy đúng ngày hôm nay (L7)', e.today === '2026-11-24' && e.latest === '2026-11-24', e);

    /* ---------- ĐIỆN THOẠI ---------- */
    const m = await newPage(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await m.goto(APP_URL, { waitUntil: 'load' });
    await shot(m, 'dt-dang-nhap', { fullPage: true });
    await login(m);
    const hiddenBefore = await state(m, () => document.getElementById('sidebar').getBoundingClientRect().right <= 0);
    await m.click('#toggleSidebar'); await m.waitForTimeout(350);
    const shown = await state(m, () => document.getElementById('sidebar').getBoundingClientRect().left === 0);
    await shot(m, 'dt-menu');
    await m.click('.nav-link[data-page="invoices"]'); await m.waitForTimeout(350);
    const closed = await state(m, () => document.getElementById('sidebar').getBoundingClientRect().right <= 0);
    check('Điện thoại: mở menu được và tự đóng khi chọn trang (L1)', hiddenBefore && shown && closed, { hiddenBefore, shown, closed });
    const overflow = [];
    for (const p of pages) {
        await go(m, p); await m.waitForTimeout(80);
        const o = await state(m, () => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
        if (o.sw > o.w) overflow.push(p + ':' + o.sw);
    }
    check('Điện thoại: không trang nào bị tràn ngang (G4)', overflow.length === 0, overflow);
    for (const p of ['dashboard', 'orders', 'invoices', 'report-revenue']) {
        await go(m, p); await m.waitForTimeout(150);
        await shot(m, 'dt-' + p, { fullPage: true });
    }
    check('Điện thoại: không có lỗi console', m._errors.length === 0, m._errors);
};

if (require.main === module) runStandalone(module.exports, 'Hồi quy');
