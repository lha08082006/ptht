'use strict';
/* =========================================================
   PHÂN HỆ ĐỊNH MỨC BOM
   Trang "Định mức BOM" (theo món / theo nguyên liệu / định mức – thực tế), hao hụt %,
   định mức gộp dùng để trừ kho và tính giá vốn, sửa định mức ngay trên trang BOM,
   kiểm kê kho sinh phiếu điều chỉnh, đối chiếu thất thoát theo kỳ, xuất Excel (.xlsx).
   Chạy riêng: node tests/bom.js
   ========================================================= */
const { openApp, state, go, isOpen, lastToast, submit, rowCount, shot, runStandalone } = require('./lib');

const bodyRows = page => state(page, () => [...document.querySelectorAll('#bomBody tr')].map(tr => tr.textContent.replace(/\s+/g, ' ').trim()));
const stockOf = (page, id) => state(page, i => QN.store.get('ingredients', i).stock, id);
const near = (a, b) => Math.abs(a - b) < 1e-6;

module.exports = async function bom(browser, check) {
    const p = await openApp(browser, { acceptDownloads: true });

    /* ---------- MENU + THẺ SỐ LIỆU ---------- */
    await p.click('.nav-link[data-page="bom"]');
    await p.waitForTimeout(80);
    check('Menu "Định mức BOM" nằm trong nhóm Quản lý kho hàng', (await p.textContent('#breadcrumbGroup')).includes('KHO') || (await p.textContent('#breadcrumbGroup')).toLowerCase().includes('kho'), await p.textContent('#breadcrumbGroup'));
    const kpi = await state(p, () => ['bomCovered', 'bomCoveredSub', 'bomAvgMarginSub', 'bomLoss'].map(id => document.getElementById(id).textContent));
    check('Thẻ số liệu: 11/12 món có định mức, chỉ rõ món còn thiếu', kpi[0] === '11/12' && kpi[1].includes('Gỏi sứa sốt Thái'), kpi);
    check('Thẻ số liệu: món biên lãi thấp nhất là cá dưa chua (có hao hụt cá)', kpi[2].includes('Cá dưa chua tứ xuyên'), kpi);
    check('Thẻ số liệu: vượt định mức 7 ngày = 1,8 kg rau + 2 lon bia = 87.000đ', kpi[3] === '87.000đ', kpi);
    const firstBar = await state(p, () => document.querySelector('#bomMarginChart .barlist__name').textContent);
    check('Biểu đồ biên lãi: món lãi thấp nhất ở trên cùng', firstBar === 'Cá dưa chua tứ xuyên', firstBar);

    /* ---------- THEO MÓN ---------- */
    const rows = await bodyRows(p);
    check('Bảng BOM: dòng rau của gỏi chân gà ghi tịnh 0,1 · hao hụt 10% · gộp 0,11 · 3.850đ', rows.some(t => t.startsWith('Rau xà lách kg 0,1 10% 0,11 35.000đ 3.850đ')), rows.filter(t => t.startsWith('Rau')));
    check('Đầu nhóm món ghi giá bán, giá vốn (tính theo định mức gộp), lãi gộp, còn làm được', rows.some(t => t.startsWith('Gỏi chân gà trộn thính') && t.includes('Giá vốn 29.350đ') && t.includes('Lãi gộp 99.650đ')));
    check('Món chưa có định mức được báo rõ và có nút khai báo', rows.some(t => t.includes('Gỏi sứa sốt Thái') && t.includes('Khai báo định mức')));
    const sums = await state(p, () => QN.store.db.foods.every(f => {
        const S = QN.store;
        const recipe = S.recipeOf(f);
        if (!recipe.length) return S.foodCost(f) === null;
        const total = Math.round(recipe.reduce((s, l) => s + Math.round(S.grossQty(l) * S.get('ingredients', l.ingredientId).price), 0));
        return Math.abs(total - S.foodCost(f)) <= recipe.length; // làm tròn từng dòng
    }));
    check('Giá vốn mỗi món = tổng thành tiền các dòng định mức', sums);
    await p.fill('#searchBom', 'trung ga');
    await p.waitForTimeout(50);
    const found = await state(p, () => [...document.querySelectorAll('#bomBody .bom-dish')].map(tr => tr.textContent));
    check('Tìm theo nguyên liệu (không dấu) → món có dùng nguyên liệu đó', found.length === 1 && found[0].includes('Đậu pháp xào trứng non XO'), found.length);
    await p.fill('#searchBom', '');

    /* ---------- SỬA ĐỊNH MỨC NGAY TRÊN TRANG BOM ---------- */
    await p.click('#bomBody [data-action="crud-edit"][data-id="6"]');
    check('Bấm "Sửa định mức" → mở hộp thoại món với định mức hiện tại', await isOpen(p, 'foodModal') && (await p.$$('#foodRecipe .recipe__row')).length === 1);
    const waste = await p.$('#foodRecipe .recipe__row input[id^="recipeWaste-"]');
    await waste.fill('100');
    await submit(p, 'foodModal');
    check('Hao hụt 100% → báo lỗi ngay ô', (await state(p, () => [...document.querySelectorAll('#foodRecipe .field__error')].map(e => e.textContent).join('|'))).includes('Tối đa là 99'));
    await waste.fill('5');
    check('Nhập hao hụt → hiện định mức gộp và giá vốn mới ngay', (await p.textContent('#foodRecipe [data-gross]')).includes('0,42 kg') && (await p.textContent('#foodRecipeSummary')).includes('134.400đ'));
    await submit(p, 'foodModal');
    await p.waitForTimeout(80);
    const tomRow = (await bodyRows(p)).find(t => t.startsWith('Tôm sú kg'));
    check('Lưu xong trang BOM tự cập nhật: tôm 0,4 kg · 5% · 0,42 kg · 134.400đ', !(await isOpen(p, 'foodModal')) && tomRow && tomRow.includes('0,4 5% 0,42') && tomRow.includes('134.400đ'), tomRow);
    check('Giá vốn món đổi theo: 134.400đ', await state(p, () => QN.store.foodCost(QN.store.get('foods', 6)) === 134400));

    /* ---------- TRỪ KHO THEO ĐỊNH MỨC GỘP ---------- */
    const rau0 = await stockOf(p, 8);
    const ga0 = await stockOf(p, 4);
    await go(p, 'orders');
    await p.click('.menu-card[data-id="4"]');
    await p.selectOption('#orderTableSelect', '2');
    await p.selectOption('#orderEmpSelect', '2');
    await p.click('[data-action="order-submit"]');
    await p.waitForTimeout(120);
    check('Gửi 1 gỏi chân gà → trừ rau 0,11 kg (có hao hụt) và chân gà 0,3 kg', near(await stockOf(p, 8), rau0 - 0.11) && near(await stockOf(p, 4), ga0 - 0.3), { rau: [rau0, await stockOf(p, 8)], ga: [ga0, await stockOf(p, 4)] });
    check('Hóa đơn chốt giá vốn theo định mức gộp (29.350đ)', await state(p, () => { const inv = QN.store.db.invoices[QN.store.db.invoices.length - 1]; return inv.items[0].cost === 29350; }));

    /* ---------- THEO NGUYÊN LIỆU (tra ngược) ---------- */
    await state(p, () => { QN.store.db.ingredients.push({ id: 14, name: 'Mực ống', unit: 'kg', price: 220000, supplierId: 4, minStock: 2, stock: 3 }); });
    await go(p, 'bom');
    await p.click('[data-action="bom-view"][data-filter="ingredient"]');
    const ing = await bodyRows(p);
    const rau = ing.find(t => t.startsWith('Rau xà lách'));
    check('Theo nguyên liệu: rau dùng cho 4 món, ghi định mức gộp và số phần đủ làm', rau && ['Nầm sữa nướng giềng mẻ', 'Lợn mán nướng giềng mẻ', 'Gỏi chân gà trộn thính', 'Lạp xưởng Tây Bắc xào'].every(n => rau.includes(n)) && rau.includes('0,11 kg / phần') && rau.endsWith('4'), rau);
    check('Nguyên liệu chưa dùng trong món nào được ghi rõ', ing.some(t => t.startsWith('Mực ống') && t.includes('Chưa dùng trong định mức món nào')));

    /* ---------- ĐỊNH MỨC – THỰC TẾ ---------- */
    await p.click('[data-action="bom-view"][data-filter="variance"]');
    check('Chế độ đối chiếu hiện ô chọn kỳ', await p.isVisible('#bomRangeForm'));
    const v1 = await bodyRows(p);
    check('Rau lên đầu (vượt nhiều nhất): xuất tay 1,5 kg + thiếu kiểm kê 0,3 kg = vượt 1,8 kg', v1[0].startsWith('Rau xà lách') && v1[0].includes('1,5 kg') && v1[0].includes('-0,3 kg') && v1[0].includes('+1,8 kg') && v1[0].includes('Vượt'), v1[0]);
    check('Bia: thiếu 2 lon khi kiểm kê → vượt định mức 2 lon', v1.some(t => t.startsWith('Bia Tự Do') && t.includes('-2 lon') && t.includes('+2 lon')));
    const closing = await state(p, () => {
        const U = QN.utils;
        // (bỏ qua "Mực ống" do bài kiểm thử cài tồn thẳng, không qua phiếu kho)
        return QN.store.bomVariance(U.addDays(U.todayLocal(), -6), U.todayLocal())
            .filter(v => QN.store.db.receipts.some(r => r.ingredientId === v.ingredient.id))
            .every(v => Math.abs(v.closing - v.ingredient.stock) < 1e-6);
    });
    check('Tồn cuối kỳ (đến hôm nay) khớp tồn kho hiện tại của mọi nguyên liệu', closing);
    await p.fill('#bomFrom', '2025-01-01');
    await p.fill('#bomTo', '2025-01-07');
    await p.click('#bomRangeForm button[type="submit"]');
    await p.waitForTimeout(60);
    check('Kỳ không có phát sinh → báo rõ, không để bảng trắng', (await rowCount(p, 'bomBody')) === 0 && (await p.textContent('#bomBody')).includes('Không có phát sinh'));
    await state(p, () => QN.pages.bom.init());

    /* ---------- KIỂM KÊ KHO ---------- */
    await go(p, 'inventory');
    await p.click('[data-action="stocktake-open"]');
    check('Mở phiếu kiểm kê: tồn thực tế điền sẵn bằng sổ sách, đang khớp', await isOpen(p, 'stocktakeModal') && (await p.textContent('#stocktakeSummary')).includes('khớp'));
    const bia0 = await stockOf(p, 9);
    const tom0 = await stockOf(p, 6);
    await p.fill('#stk-9', String(bia0 - 3));
    await p.fill('#stk-6', String(Math.round((tom0 + 0.2) * 1000) / 1000));
    await p.fill('#stk-8', '-1');
    check('Nhập tồn thực tế → hiện chênh lệch từng dòng và tổng tiền thiếu / thừa', (await p.textContent('#stocktakeBody tr[data-ing="9"] [data-diff]')).includes('−3 lon') && (await p.textContent('#stocktakeSummary')).includes('thiếu 36.000đ'));
    await submit(p, 'stocktakeModal');
    check('Tồn thực tế âm → báo lỗi, chưa lưu', await isOpen(p, 'stocktakeModal') && (await state(p, () => document.getElementById('stk-8').closest('.field').querySelector('.field__error').textContent)).length > 0);
    await p.fill('#stk-8', String(await stockOf(p, 8)));
    const before = await state(p, () => QN.store.db.receipts.length);
    await submit(p, 'stocktakeModal');
    await p.waitForTimeout(80);
    const adj = await state(p, n => QN.store.db.receipts.slice(n), before);
    check('Lưu kiểm kê → 2 phiếu điều chỉnh (thiếu 3 lon bia, thừa 0,2 kg tôm)', !(await isOpen(p, 'stocktakeModal')) && adj.length === 2 && adj.every(r => r.stocktake) && adj.some(r => r.ingredientId === 9 && r.type === 'export' && r.qty === 3) && adj.some(r => r.ingredientId === 6 && r.type === 'import' && near(r.qty, 0.2)), adj);
    check('Tồn kho khớp số đếm thực tế', near(await stockOf(p, 9), bia0 - 3) && near(await stockOf(p, 6), tom0 + 0.2));
    check('Thông báo ghi số dòng lệch và giá trị thiếu / thừa', (await lastToast(p)).includes('2 nguyên liệu lệch'));
    await p.click('[data-action="inventory-filter"][data-filter="stocktake"]');
    const stk = await state(p, () => [...document.querySelectorAll('#inventoryTableBody tr')].map(tr => tr.textContent.replace(/\s+/g, ' ')));
    check('Tab "Kiểm kê": 4 phiếu (2 từ dữ liệu mẫu + 2 vừa lưu), nhãn Kiểm kê +/−', stk.length === 4 && stk.some(t => t.includes('Kiểm kê −')) && stk.some(t => t.includes('Kiểm kê +')), stk.length);
    await p.click('#inventoryTableBody tr:first-child [data-action="receipt-view"]');
    check('Xem phiếu: tiêu đề "Phiếu điều chỉnh kiểm kê"', (await p.textContent('#receiptDetailModal [data-modal-title]')).includes('Phiếu điều chỉnh kiểm kê'));
    await p.keyboard.press('Escape');
    await p.click('[data-action="inventory-filter"][data-filter="all"]');
    await p.click('[data-action="stocktake-open"]');
    const count0 = await state(p, () => QN.store.db.receipts.length);
    await submit(p, 'stocktakeModal');
    check('Kiểm kê khớp sổ sách → không sinh phiếu, báo "khớp"', (await lastToast(p)).includes('khớp sổ sách') && (await state(p, () => QN.store.db.receipts.length)) === count0);

    // Thất thoát mới được tính vào đối chiếu
    await go(p, 'bom');
    check('Đối chiếu cập nhật: bia vượt 5 lon → vượt định mức 7 ngày tăng lên 123.000đ', (await p.textContent('#bomLoss')) === '123.000đ', await p.textContent('#bomLoss'));

    /* ---------- XUẤT EXCEL ---------- */
    const [download] = await Promise.all([p.waitForEvent('download'), p.click('[data-action="bom-export"]')]);
    const file = await download.path();
    const buf = require('fs').readFileSync(file);
    const text = buf.toString('utf8');
    const entries = (text.match(/PK\u0003\u0004/g) || []).length;
    check('Xuất Excel: tên file theo ngày, đúng định dạng .xlsx (gói ZIP 8 tệp)', /^dinh-muc-bom-\d{4}-\d{2}-\d{2}\.xlsx$/.test(download.suggestedFilename()) && buf.slice(0, 2).toString() === 'PK' && entries === 8, { name: download.suggestedFilename(), entries });
    check('File có 3 sheet và dữ liệu tiếng Việt đúng', ['Định mức BOM', 'Giá vốn món', 'Định mức - thực tế', 'Gỏi chân gà trộn thính', 'Định mức gộp', 'Hao hụt (%)'].every(t => text.includes(t)));
    check('Số trong file là số thật (không phải chữ): giá vốn tôm 134400', text.includes('<v>134400</v>'));

    /* ---------- ĐIỆN THOẠI ---------- */
    const m = await openApp(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await go(m, 'bom');
    const mobile = [];
    for (const v of ['food', 'ingredient', 'variance']) {
        await m.click(`[data-action="bom-view"][data-filter="${v}"]`);
        await m.waitForTimeout(60);
        mobile.push(await state(m, () => document.documentElement.scrollWidth - innerWidth));
    }
    check('Điện thoại: trang BOM không tràn ngang ở cả 3 chế độ xem', mobile.every(x => x <= 0), mobile);
    await shot(m, 'bom-dien-thoai', { fullPage: true });

    const errors = [p, m].flatMap(x => x._errors);
    check('Không có lỗi console', errors.length === 0, errors);
};

if (require.main === module) runStandalone(module.exports, 'Phân hệ định mức BOM');
