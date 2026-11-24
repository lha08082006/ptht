'use strict';
/* =========================================================
   ĐỊNH MỨC MÓN ĂN & TRỪ KHO TỰ ĐỘNG
   Định mức 1 phần, giá vốn / lãi gộp, số phần còn làm được, gửi bếp tự trừ kho
   (phiếu xuất bán gắn mã HĐ), chặn gọi vượt tồn, cảnh báo chạm định mức,
   ràng buộc nguyên liệu đang dùng trong định mức, báo cáo lãi gộp,
   gom doanh thu theo tuần / tháng, phiếu kho có số lẻ và ghi chú.
   Chạy riêng: node tests/dinh-muc.js
   ========================================================= */
const { openApp, state, go, isOpen, fieldError, lastToast, submit, rowCount, shot, runStandalone } = require('./lib');

const rowText = (page, tbody, text) => page.evaluate(([id, t]) => {
    const tr = [...document.querySelectorAll(`#${id} tr`)].find(x => x.textContent.includes(t));
    return tr ? tr.textContent.replace(/\s+/g, ' ').trim() : '';
}, [tbody, text]);
const ing = (page, id) => state(page, i => Object.assign({}, QN.store.get('ingredients', i)), id);
const money = (page, n) => state(page, x => QN.utils.fmtMoney(x), n);

module.exports = async function dinhMuc(browser, check) {
    const p = await openApp(browser);

    /* ---------- BẢNG MÓN: GIÁ VỐN, LÃI GỘP, CÒN LÀM ĐƯỢC ---------- */
    await go(p, 'foods');
    const nam = await rowText(p, 'foodTableBody', 'Nầm sữa nướng giềng mẻ');
    check('Bảng món: hiện định mức, giá vốn, lãi gộp, số phần còn làm được', nam.includes('Nầm sữa bò 0,3 kg') && nam.includes('55.750đ') && nam.includes('71%') && nam.includes('89 phần'), nam);
    check('Món chưa có định mức được ghi rõ, không theo dõi số phần', (await rowText(p, 'foodTableBody', 'Gỏi sứa')).includes('Chưa có định mức') && (await rowText(p, 'foodTableBody', 'Gỏi sứa')).includes('Không theo dõi'));
    await p.fill('#searchFood', 'tom su');
    await p.waitForTimeout(50);
    check('Tìm món theo nguyên liệu trong định mức ("tom su" → món tôm)', (await rowCount(p, 'foodTableBody')) === 1 && (await p.textContent('#foodTableBody')).includes('Tôm sú ủ muối'));
    await p.fill('#searchFood', '');

    /* ---------- HỘP THOẠI ĐỊNH MỨC ---------- */
    await p.click('[data-action="crud-edit"][data-entity="foods"][data-id="6"]');
    check('Sửa món: hiện đủ dòng định mức + giá vốn / lãi gộp', (await p.$$('#foodRecipe .recipe__row')).length === 1 && (await p.textContent('#foodRecipeSummary')).includes('128.000đ') && (await p.textContent('#foodRecipeSummary')).includes('161.000đ'));
    await p.fill('#foodPrice', '120000');
    check('Giá bán thấp hơn giá vốn → cảnh báo ngay khi nhập', (await p.getAttribute('#foodRecipeSummary', 'class')).includes('is-danger') && (await p.textContent('#foodRecipeSummary')).includes('cao hơn giá bán'));
    await p.keyboard.press('Escape');

    await p.click('[data-action="crud-add"][data-entity="foods"]');
    check('Thêm món: chưa có dòng định mức nào', (await p.$$('#foodRecipe .recipe__row')).length === 0 && await p.isVisible('#foodRecipeEmpty'));
    await p.fill('#foodName', 'Gỏi đậu trứng non');
    await p.selectOption('#foodCategory', 'Khai vị');
    await p.fill('#foodPrice', '99000');
    const rows = () => p.$$('#foodRecipe .recipe__row');
    await p.click('#foodRecipeAdd');
    await p.click('#foodRecipeAdd');
    await p.click('#foodRecipeAdd');
    let r = await rows();
    await (await r[0].$('select')).selectOption('11');
    await (await r[0].$('input')).fill('0.2');
    await (await r[1].$('select')).selectOption('11');
    await (await r[1].$('input')).fill('0');
    // dòng 3 để trống: bỏ qua khi lưu
    check('Chọn nguyên liệu → hiện đơn vị tính ngay trong ô', (await (await r[0].$('[data-unit]')).textContent()) === 'kg');
    await submit(p, 'foodModal');
    const errs = await state(p, () => [...document.querySelectorAll('#foodRecipe .field__error')].map(e => e.textContent).filter(Boolean));
    check('Định mức: báo nguyên liệu trùng và lượng phải > 0', await isOpen(p, 'foodModal') && errs.some(e => e.includes('đã có ở dòng khác')) && errs.some(e => e.includes('lớn hơn 0')), errs);
    await (await r[1].$('select')).selectOption('12');
    await (await r[1].$('input')).fill('2.12345');
    await submit(p, 'foodModal');
    check('Định mức: quá 3 chữ số thập phân → báo lỗi', (await state(p, () => [...document.querySelectorAll('#foodRecipe .field__error')].map(e => e.textContent).join('|'))).includes('3 chữ số'));
    await (await r[1].$('input')).fill('2');
    await p.click(`#foodRecipe .recipe__row:nth-child(3) [data-action="recipe-remove-row"]`);
    check('Bỏ một dòng định mức', (await rows()).length === 2);
    check('Giá vốn món mới tính đúng: 0,2 kg đậu + 2 quả trứng = 16.000đ', (await p.textContent('#foodRecipeSummary')).includes('16.000đ'));
    await submit(p, 'foodModal');
    const newFood = await state(p, () => QN.store.db.foods.find(f => f.name === 'Gỏi đậu trứng non'));
    check('Lưu món mới kèm định mức', !await isOpen(p, 'foodModal') && newFood && JSON.stringify(newFood.recipe) === JSON.stringify([{ ingredientId: 11, qty: 0.2 }, { ingredientId: 12, qty: 2 }]), newFood);
    await shot(p, 'dm-bang-mon', { fullPage: true });

    /* ---------- NGUYÊN LIỆU ĐANG DÙNG TRONG ĐỊNH MỨC ---------- */
    await go(p, 'ingredients');
    check('Nguyên liệu ghi số món đang dùng', (await rowText(p, 'ingredientTableBody', 'Rau xà lách')).includes('Dùng cho 4 món'));
    await p.click('[data-action="crud-delete"][data-entity="ingredients"][data-id="6"]');
    check('Không xóa được nguyên liệu đang có trong định mức', (await lastToast(p)).includes('định mức') && !(await isOpen(p, 'confirmModal')));
    // Nguyên liệu mới chưa có phiếu kho nhưng đã nằm trong định mức → không đổi được ĐVT
    await state(p, () => {
        const S = QN.store;
        S.db.ingredients.push({ id: 14, name: 'Mực ống', unit: 'kg', price: 220000, supplierId: 4, minStock: 2, stock: 3 });
        S.get('foods', 8).recipe = [{ ingredientId: 14, qty: 0.25 }];
        QN.app.rerender();
    });
    await p.click('[data-action="crud-edit"][data-entity="ingredients"][data-id="14"]');
    await p.selectOption('#ingUnit', 'lít');
    await submit(p, 'ingredientModal');
    check('Không đổi được ĐVT khi định mức món đang tính theo ĐVT cũ', (await fieldError(p, 'ingUnit')).includes('định mức'));
    await p.selectOption('#ingUnit', 'kg');
    await p.fill('#ingMinStock', '2.5');
    await submit(p, 'ingredientModal');
    check('Định mức tồn tối thiểu nhận số lẻ (2,5 kg)', await state(p, () => QN.store.get('ingredients', 14).minStock === 2.5));

    /* ---------- GỬI BẾP → TỰ TRỪ KHO ---------- */
    const tom0 = await ing(p, 6);
    await go(p, 'orders');
    await p.click('.menu-card[data-id="6"]');
    await p.click('.menu-card[data-id="6"]');
    await p.selectOption('#orderTableSelect', '2');
    await p.selectOption('#orderEmpSelect', '2');
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(120);
    const after = await state(p, () => {
        const S = QN.store;
        const inv = S.db.invoices[S.db.invoices.length - 1];
        return { inv, stock: S.get('ingredients', 6).stock, receipts: S.db.receipts.filter(r => r.auto && r.invoiceId === inv.id) };
    });
    check('Gửi đơn 2 phần tôm → tồn tôm giảm 0,8 kg', Math.abs(tom0.stock - 0.8 - after.stock) < 1e-9, { before: tom0.stock, after: after.stock });
    check('Tạo phiếu xuất bán tự động gắn mã hóa đơn', after.receipts.length === 1 && after.receipts[0].qty === 0.8 && after.receipts[0].ingredientId === 6, after.receipts);
    check('Hóa đơn chốt giá vốn từng món lúc bán', after.inv.items[0].cost === 128000, after.inv.items);
    await go(p, 'inventory');
    await p.click('[data-action="inventory-filter"][data-filter="sale"]');
    const saleTab = await state(p, () => ({ first: document.querySelector('#inventoryTableBody tr').textContent, all: [...document.querySelectorAll('#inventoryTableBody tr:not(.table__more)')].every(tr => tr.textContent.includes('Bán ·')) }));
    check('Tab "Xuất bán": phiếu mới nhất ghi "Bán · HĐ"', saleTab.all && saleTab.first.includes('Bán · ' + await state(p, id => QN.utils.code('HD', id), after.inv.id)) && saleTab.first.includes('0,8 kg'), saleTab);
    await p.click('[data-action="inventory-filter"][data-filter="export"]');
    check('Tab "Xuất tay" chỉ có phiếu xuất nhập tay (hủy hàng hỏng)', (await rowCount(p, 'inventoryTableBody')) === 1 && (await p.textContent('#inventoryTableBody')).includes('Rau dập, hủy bỏ'));
    await p.click('[data-action="inventory-filter"][data-filter="all"]');

    /* ---------- CÒN ÍT PHẦN / HẾT NGUYÊN LIỆU ---------- */
    // Xuất tay bớt tôm để chỉ còn đủ 1 phần (0,4 kg / phần), có ghi chú + số lẻ
    await p.click('[data-action="receipt-add"]');
    await p.selectOption('#rcpType', 'export');
    await p.selectOption('#rcpIngredient', '6');
    await p.fill('#rcpQty', String(Math.round((after.stock - 0.5) * 1000) / 1000));
    await p.fill('#rcpNote', 'Tôm không đạt, trả lại');
    await submit(p, 'receiptModal');
    check('Phiếu xuất tay: nhận số lẻ và lưu ghi chú', await state(p, () => { const r = QN.store.db.receipts[QN.store.db.receipts.length - 1]; return r.note === 'Tôm không đạt, trả lại' && !r.auto && Math.abs(QN.store.get('ingredients', 6).stock - 0.5) < 1e-9; }));
    await go(p, 'orders');
    const card = () => state(p, () => { const c = document.querySelector('.menu-card[data-id="6"]'); return { cls: c.className, text: c.textContent.replace(/\s+/g, ' ') }; });
    check('Thẻ món báo "Còn 1 phần" khi nguyên liệu chỉ đủ 1 phần', (await card()).text.includes('Còn 1 phần'));
    await p.click('.menu-card[data-id="6"]');
    check('Đã chọn hết số phần làm được → thẻ báo rõ', (await card()).text.includes('Đã hết phần làm được'));
    await p.click('.menu-card[data-id="6"]');
    check('Bấm thêm nữa → báo thiếu nguyên liệu, giỏ vẫn 1 phần', (await lastToast(p)).includes('Không đủ nguyên liệu') && (await lastToast(p)).includes('Tôm sú') && await state(p, () => document.getElementById('cartCount').textContent === '1 món'));
    await p.click('#cartItems [data-action="cart-inc"]');
    check('Nút + trong giỏ cũng bị chặn khi hết nguyên liệu', await state(p, () => document.getElementById('cartCount').textContent === '1 món'));
    // Kho đổi trong lúc đang chọn món (ví dụ máy khác vừa xuất kho) → chặn khi gửi
    await state(p, () => { QN.store.get('ingredients', 6).stock = 0.1; });
    await p.selectOption('#orderTableSelect', '3');
    await p.selectOption('#orderEmpSelect', '2');
    const invCount = await state(p, () => QN.store.db.invoices.length);
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(100);
    check('Gửi đơn khi kho không còn đủ → chặn, không tạo hóa đơn', (await lastToast(p)).includes('Không đủ nguyên liệu') && (await state(p, () => QN.store.db.invoices.length)) === invCount);
    await p.click('#cartItems [data-action="cart-remove"]');
    check('Hết nguyên liệu → thẻ món mờ, ghi "Hết nguyên liệu"', (await card()).cls.includes('is-sold-out') && (await card()).text.includes('Hết nguyên liệu'));
    await p.click('.menu-card[data-id="6"]', { force: true }); // thẻ có aria-disabled nhưng người dùng vẫn bấm được
    check('Không thêm được món đã hết nguyên liệu (bấm vào chỉ hiện lý do)', await state(p, () => document.getElementById('cartCount').textContent === '0 món') && (await lastToast(p)).includes('Không đủ nguyên liệu'));
    await shot(p, 'dm-goi-mon', { fullPage: true });
    await go(p, 'dashboard');
    check('Tổng quan nhắc món hết nguyên liệu', (await p.textContent('#attentionList')).includes('hết nguyên liệu') && (await p.textContent('#attentionList')).includes('Tôm sú ủ muối'));
    check('Nhắc nhập thêm kho kèm số lượng gợi ý', (await p.textContent('#attentionList')).includes('nên nhập thêm'));

    /* ---------- CẢNH BÁO CHẠM ĐỊNH MỨC SAU KHI BÁN ---------- */
    const dua0 = await ing(p, 13);   // Dưa chua 4,1 kg, tối thiểu 3 kg
    await go(p, 'orders');
    for (let k = 0; k < 4; k++) await p.click('.menu-card[data-id="5"]'); // 4 × cá dưa chua = 1,2 kg dưa
    await p.selectOption('#orderTableSelect', '3');
    await p.selectOption('#orderEmpSelect', '2');
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(120);
    const toasts = await state(p, () => [...document.querySelectorAll('.toast')].map(t => t.textContent));
    check('Bán làm nguyên liệu chạm định mức → cảnh báo nên nhập thêm', dua0.stock === 4.1 && toasts.some(t => t.includes('Dưa chua') && t.includes('định mức')), { dua0: dua0.stock, toasts });

    /* ---------- BÁO CÁO: GIÁ VỐN, LÃI GỘP, GOM TUẦN / THÁNG ---------- */
    await go(p, 'report-revenue');
    const rev = await state(p, () => {
        const S = QN.store, U = QN.utils;
        const from = document.getElementById('revDateFrom').value, to = document.getElementById('revDateTo').value;
        const paid = S.db.invoices.filter(i => i.status === 'paid' && S.paidDate(i) >= from && S.paidDate(i) <= to);
        const revenue = U.sum(paid, i => i.finalTotal);
        const cogs = U.sum(paid, i => U.sum(i.items, it => it.cost * it.qty));
        return { shown: document.getElementById('revProfit').textContent, expected: U.fmtMoney(revenue - cogs), sub: document.getElementById('revProfitSub').textContent, cogs: U.fmtMoney(cogs) };
    });
    check('Báo cáo tài chính: lãi gộp = doanh thu − giá vốn đã chốt', rev.shown === rev.expected && rev.sub.includes(rev.cogs) && rev.sub.includes('biên lãi'), rev);
    const range = async (days) => {
        await state(p, d => { const U = QN.utils; document.getElementById('revDateFrom').value = U.addDays(U.todayLocal(), -(d - 1)); document.getElementById('revDateTo').value = U.todayLocal(); }, days);
        await p.click('#revRangeForm button[type="submit"]');
        await p.waitForTimeout(60);
        return state(p, () => ({ title: document.getElementById('revChartTitle').textContent, cols: document.querySelectorAll('#revenueBarChart .colchart__col').length, sum: [...document.querySelectorAll('#revenueBarChart .colchart__col')].reduce((s, c) => s + Number(c.dataset.tipValue.replace(/\D/g, '')), 0), total: Number(document.getElementById('revTotal').textContent.replace(/\D/g, '')) }));
    };
    const d31 = await range(31);
    check('31 ngày: hiện từng ngày (31 cột)', d31.title === 'Doanh thu theo ngày' && d31.cols === 31, d31);
    const w60 = await range(60);
    check('60 ngày: gom theo tuần, đủ mọi tuần, tổng các cột = tổng doanh thu', w60.title === 'Doanh thu theo tuần' && w60.cols >= 9 && w60.cols <= 10 && w60.sum === w60.total, w60);
    const m365 = await range(365);
    check('365 ngày: gom theo tháng (13 cột), tổng khớp', m365.title === 'Doanh thu theo tháng' && m365.cols === 13 && m365.sum === m365.total, m365);
    await go(p, 'report-bestseller');
    const bs = await rowText(p, 'bestsellerTableBody', 'Bia Tự Do');
    check('Báo cáo món bán chạy có cột lãi gộp (bia: 35.000đ − 12.000đ mỗi lon)', bs.includes(await money(p, await state(p, () => { const S = QN.store; return QN.utils.sum(S.db.invoices.filter(i => i.status === 'paid'), i => QN.utils.sum(i.items.filter(it => it.foodId === 10), it => (it.price - it.cost) * it.qty)); }))), bs);
    await go(p, 'report-stock');
    check('Báo cáo tồn kho gợi ý số lượng cần nhập cho nguyên liệu sắp hết', (await rowText(p, 'stockTableBody', 'Tôm sú')).includes('Nên nhập thêm') && (await p.textContent('#stLowSub')).includes('nhập thêm'));

    /* ---------- DỮ LIỆU MẪU NHẤT QUÁN ---------- */
    const fresh = await openApp(browser);
    const seed = await state(fresh, () => {
        const S = QN.store;
        const soldUsage = new Map();
        S.db.invoices.forEach(inv => inv.items.forEach(it => S.recipeOf(S.get('foods', it.foodId)).forEach(l => soldUsage.set(l.ingredientId, (soldUsage.get(l.ingredientId) || 0) + l.qty * it.qty))));
        const autoUsage = new Map();
        S.db.receipts.filter(r => r.auto).forEach(r => autoUsage.set(r.ingredientId, (autoUsage.get(r.ingredientId) || 0) + r.qty));
        return {
            match: [...soldUsage].every(([id, q]) => Math.abs((autoUsage.get(id) || 0) - q) < 1e-6),
            costs: S.db.invoices.every(i => i.items.every(it => typeof it.cost === 'number')),
            beer: S.get('ingredients', 9).unit
        };
    });
    check('Dữ liệu mẫu: phiếu xuất bán khớp đúng định mức × số phần đã bán', seed.match && seed.costs && seed.beer === 'lon', seed);

    const errors = [p, fresh].flatMap(x => x._errors);
    check('Không có lỗi console', errors.length === 0, errors);
};

if (require.main === module) runStandalone(module.exports, 'Định mức món ăn & trừ kho');
