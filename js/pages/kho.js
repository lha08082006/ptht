/* =========================================================
   QUẢN LÝ KHO: nguyên liệu, nhà cung cấp, phiếu nhập / xuất kho
   Quy tắc: tồn kho chỉ thay đổi qua phiếu, tồn = tổng nhập − tổng xuất.
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const V = QN.validate;
    const R = V.rules;
    const { html } = U;

    const val = id => U.byId(id).value;
    const unitOf = ingredientId => (S.get('ingredients', ingredientId) || {}).unit || '';

    /* ---------------- NGUYÊN LIỆU ---------------- */
    QN.crud.define({
        key: 'ingredients',
        label: 'nguyên liệu',
        modal: 'ingredientModal',
        tbody: 'ingredientTableBody',
        meta: 'ingredientsMeta',
        search: { input: 'searchIngredient', fields: r => [r.name, r.unit, S.supplierName(r.supplierId)] },
        fields: [
            { id: 'ingName', key: 'name' },
            { id: 'ingPrice', key: 'price', type: 'int' },
            { id: 'ingUnit', key: 'unit', type: 'raw' },
            { id: 'ingMinStock', key: 'minStock', type: 'number' },
            { id: 'ingSupplier', key: 'supplierId', type: 'select-int' }
        ],
        defaults: () => ({ stock: 0 }),
        prepare: () => {
            UI.fillSelect('ingSupplier', S.db.suppliers.map(s => ({ value: s.id, label: s.name })), { placeholder: '— Không chọn —', value: '' });
        },
        columns: [
            { render: (r, i) => i + 1 },
            { render: r => {
                const used = S.foodsUsing(r.id);
                return html`<span class="t-strong">${r.name}</span>${used.length
                    ? html`<span class="t-sub" title="${used.map(f => f.name).join(', ')}">Dùng cho ${used.length} món</span>`
                    : html`<span class="t-sub">Chưa dùng trong định mức món</span>`}`;
            } },
            { render: r => r.unit },
            { className: 'num', render: r => U.fmtMoney(r.price) },
            { render: r => S.supplierName(r.supplierId) },
            { className: 'num t-strong', render: r => `${U.fmtNumber(r.stock)} ${r.unit}` },
            { className: 'num', render: r => `${U.fmtNumber(S.minStock(r))} ${r.unit}` },
            { render: r => UI.statusBadge('stock', S.stockLevel(r)) }
        ],
        display: r => r.name,
        validate: (v, existing) => {
            const hasReceipts = existing && S.db.receipts.some(r => r.ingredientId === existing.id);
            const usedIn = existing ? S.foodsUsing(existing.id) : [];
            const unitRule = u => {
                if (!existing || u === existing.unit) return null;
                if (hasReceipts) return `Không đổi được đơn vị vì đã có phiếu kho tính theo “${existing.unit}”`;
                if (usedIn.length) return `Không đổi được đơn vị vì định mức của ${usedIn.length} món đang tính theo “${existing.unit}”`;
                return null;
            };
            return V.check([
                ['ingName', v.name, R.required('Vui lòng nhập tên nguyên liệu'), R.maxLength(80),
                    R.unique(S.db.ingredients, x => x.name, existing, 'Nguyên liệu này đã có')],
                ['ingPrice', v.price, R.required('Vui lòng nhập đơn giá'), R.integer({ min: 1, max: 100000000 })],
                ['ingUnit', v.unit, unitRule],
                ['ingMinStock', v.minStock, R.required('Vui lòng nhập định mức tồn tối thiểu'), R.number({ min: 0, max: 100000, decimals: 3 })]
            ]);
        },
        canDelete: r => {
            const receipts = S.db.receipts.filter(x => x.ingredientId === r.id).length;
            const foods = S.foodsUsing(r.id);
            const parts = [];
            if (foods.length) parts.push(`đang có trong định mức của ${foods.length} món (${foods.map(f => f.name).join(', ')})`);
            if (receipts) parts.push(`đã có ${receipts} phiếu nhập / xuất kho`);
            return parts.length ? `Không thể xóa “${r.name}”: ${parts.join(' và ')}.` : null;
        }
    });

    /* ---------------- NHÀ CUNG CẤP ---------------- */
    QN.crud.define({
        key: 'suppliers',
        label: 'nhà cung cấp',
        modal: 'supplierModal',
        tbody: 'supplierTableBody',
        meta: 'suppliersMeta',
        search: { input: 'searchSupplier', fields: r => [r.name, r.address, r.phone] },
        fields: [
            { id: 'supName', key: 'name' },
            { id: 'supAddress', key: 'address' },
            { id: 'supPhone', key: 'phone', type: 'phone' }
        ],
        columns: [
            { render: (r, i) => i + 1 },
            { className: 't-strong', render: r => r.name },
            { render: r => r.address || html`<span class="text-muted">—</span>` },
            { className: 'nowrap', render: r => r.phone || html`<span class="text-muted">—</span>` }
        ],
        display: r => r.name,
        validate: (v, existing) => V.check([
            ['supName', v.name, R.required('Vui lòng nhập tên nhà cung cấp'), R.maxLength(100),
                R.unique(S.db.suppliers, x => x.name, existing, 'Nhà cung cấp này đã có')],
            ['supAddress', v.address, R.maxLength(150)],
            ['supPhone', v.phone, R.phone()]
        ]),
        canDelete: r => {
            const ingredients = S.db.ingredients.filter(g => Number(g.supplierId) === r.id).length;
            const receipts = S.db.receipts.filter(x => Number(x.supplierId) === r.id).length;
            const parts = [];
            if (ingredients) parts.push(`đang cung cấp ${ingredients} nguyên liệu`);
            if (receipts) parts.push(`có ${receipts} phiếu nhập kho`);
            return parts.length ? `Không thể xóa “${r.name}”: ${parts.join(' và ')}.` : null;
        }
    });

    /* ---------------- PHIẾU NHẬP / XUẤT KHO ---------------- */
    let inventoryFilter = 'all';

    function renderInventory() {
        const all = S.db.receipts.slice().sort(S.byNewest);
        // Xuất tay (hủy hàng, dùng nội bộ…) tách khỏi xuất bán tự động theo định mức món và điều chỉnh kiểm kê
        const kindOf = S.receiptKind;
        UI.syncTabs('inventory', inventoryFilter, {
            all: all.length,
            import: all.filter(r => kindOf(r) === 'import').length,
            export: all.filter(r => kindOf(r) === 'export').length,
            sale: all.filter(r => kindOf(r) === 'sale').length,
            stocktake: all.filter(r => kindOf(r) === 'stocktake').length
        });
        const query = val('searchReceipt').trim();
        const list = (inventoryFilter === 'all' ? all : all.filter(r => kindOf(r) === inventoryFilter))
            .filter(r => U.matches(query, U.code('PK', r.id), r.ingredientName, S.supplierName(r.supplierId), S.employeeName(r.empId), r.note || '', r.invoiceId ? U.code('HD', r.invoiceId) : ''));
        UI.renderRows('inventoryTableBody', list.map(r => html`
            <tr>
                <td class="t-code">${U.code('PK', r.id)}</td>
                <td>${receiptBadge(r)}${receiptSub(r)}</td>
                <td class="nowrap">${U.fmtDate(r.date)}</td>
                <td>${S.employeeName(r.empId)}</td>
                <td>${r.supplierId ? S.supplierName(r.supplierId) : html`<span class="text-muted">—</span>`}</td>
                <td class="t-strong">${r.ingredientName}</td>
                <td class="num">${U.fmtNumber(r.qty)} ${unitOf(r.ingredientId)}</td>
                <td class="num t-strong">${U.fmtMoney(r.total)}</td>
                <td class="num"><div class="cell-actions">${UI.iconButton({ action: 'receipt-view', icon: 'fa-eye', label: 'Xem phiếu ' + U.code('PK', r.id), tone: 'info', data: { id: r.id } })}</div></td>
            </tr>`), query
            ? { empty: `Không tìm thấy phiếu kho cho “${query}”`, icon: 'fa-magnifying-glass' }
            : { empty: inventoryFilter === 'all' ? 'Chưa có phiếu kho nào' : 'Không có phiếu ở loại này' });
    }

    /** Phiếu điều chỉnh kiểm kê có nhãn riêng (không lẫn với nhập / xuất thường) */
    function receiptBadge(r) {
        if (r.stocktake) return UI.badge(r.type === 'import' ? 'Kiểm kê +' : 'Kiểm kê −', r.type === 'import' ? 'info' : 'warning');
        return UI.statusBadge('receipt', r.type);
    }

    /** Dòng phụ dưới loại phiếu: phiếu xuất bán tự động ghi mã hóa đơn, phiếu tay / kiểm kê ghi chú */
    function receiptSub(r) {
        if (r.auto && r.invoiceId) return html`<span class="t-sub">Bán · ${U.code('HD', r.invoiceId)}</span>`;
        return r.note ? html`<span class="t-sub" title="${r.note}">${r.note}</span>` : '';
    }

    const parseQty = el => (el.validity.badInput ? NaN : (el.value.trim() === '' ? '' : Number(el.value)));

    /** Ẩn/hiện ô NCC theo loại phiếu, tự chọn NCC của nguyên liệu, xem trước tồn kho */
    function syncReceiptForm(changed) {
        const type = val('rcpType');
        const ingredient = S.get('ingredients', val('rcpIngredient'));
        U.byId('rcpSupplierField').hidden = type === 'export';
        if (type === 'import' && ingredient && (changed === 'ingredient' || changed === 'type')) {
            U.byId('rcpSupplier').value = ingredient.supplierId ? String(ingredient.supplierId) : '';
        }
        const preview = U.byId('rcpPreview');
        if (!ingredient) {
            preview.textContent = 'Chọn nguyên liệu để xem tồn kho hiện tại.';
            return;
        }
        const qty = parseQty(U.byId('rcpQty'));
        const validQty = qty !== '' && Number.isFinite(qty) && qty > 0;
        const after = S.round3(type === 'import' ? ingredient.stock + qty : ingredient.stock - qty);
        preview.innerHTML = html`
            <span>Tồn hiện tại: <strong>${U.fmtNumber(ingredient.stock)} ${ingredient.unit}</strong></span>
            <span>Đơn giá: <strong>${U.fmtMoney(ingredient.price)}</strong></span>
            ${validQty ? html`
                <span>Thành tiền: <strong>${U.fmtMoney(qty * ingredient.price)}</strong></span>
                <span>Tồn sau phiếu: <strong class="${after < 0 ? 'text-danger' : ''}">${U.fmtNumber(after)} ${ingredient.unit}</strong></span>` : ''}`;
    }

    QN.actions['inventory-filter'] = d => {
        inventoryFilter = d.filter;
        renderInventory();
    };

    QN.actions['receipt-add'] = () => {
        const form = document.querySelector('#receiptModal form');
        form.reset();
        V.clear(form);
        const today = U.todayLocal();
        const date = U.byId('rcpDate');
        date.max = today;
        date.value = today;
        const manager = S.db.employees.find(e => e.role === 'Quản lý') || S.db.employees[0];
        UI.fillSelect('rcpEmp', S.db.employees.map(e => ({ value: e.id, label: `${e.name} · ${e.role}` })), { value: manager ? manager.id : '' });
        UI.fillSelect('rcpIngredient', S.db.ingredients.map(g => ({ value: g.id, label: `${g.name} (tồn ${U.fmtNumber(g.stock)} ${g.unit})` })), { placeholder: '— Chọn nguyên liệu —', value: '' });
        UI.fillSelect('rcpSupplier', S.db.suppliers.map(s => ({ value: s.id, label: s.name })), { placeholder: '— Không chọn —', value: '' });
        syncReceiptForm();
        UI.openModal('receiptModal', { title: 'Tạo phiếu nhập / xuất kho' });
    };

    QN.forms.receipt = form => {
        const type = val('rcpType');
        const date = val('rcpDate');
        const empId = Number(val('rcpEmp')) || 0;
        const ingredient = S.get('ingredients', val('rcpIngredient'));
        const qty = parseQty(U.byId('rcpQty'));
        const note = val('rcpNote').trim().replace(/\s+/g, ' ');
        const today = U.todayLocal();
        const errors = V.check([
            ['rcpDate', date, R.required('Vui lòng chọn ngày lập phiếu'), R.dateTo(today, 'Ngày lập phiếu không được ở tương lai')],
            ['rcpEmp', empId, v => (v ? null : 'Vui lòng chọn nhân viên')],
            ['rcpIngredient', ingredient, v => (v ? null : 'Vui lòng chọn nguyên liệu')],
            ['rcpQty', qty, R.required('Vui lòng nhập số lượng'), R.number({ above: 0, max: 100000, decimals: 3 }),
                v => (type === 'export' && ingredient && Number(v) > ingredient.stock + 1e-9
                    ? `Không đủ tồn kho (còn ${U.fmtNumber(ingredient.stock)} ${ingredient.unit})` : null)],
            ['rcpNote', note, R.maxLength(120)]
        ]);
        if (V.show(form, errors)) return;

        const supplierId = type === 'import' ? (Number(val('rcpSupplier')) || null) : null;
        ingredient.stock = S.round3(ingredient.stock + (type === 'import' ? qty : -qty));
        const id = S.nextId('receipts');
        S.db.receipts.push({
            id, type, date, time: date === today ? U.nowTime() : '', empId, supplierId,
            ingredientId: ingredient.id, ingredientName: ingredient.name,
            qty: S.round3(qty), unitPrice: ingredient.price, total: Math.round(qty * ingredient.price), note
        });
        UI.closeModal('receiptModal');
        UI.toast(`Đã lưu phiếu ${type === 'import' ? 'nhập' : 'xuất'} ${U.code('PK', id)}: ${ingredient.name} ${type === 'import' ? '+' : '−'}${U.fmtNumber(qty)} ${ingredient.unit}`, 'success');
        renderInventory();
        QN.app.changed();
    };

    QN.actions['receipt-view'] = d => {
        const r = S.get('receipts', d.id);
        if (!r) return;
        const unit = unitOf(r.ingredientId);
        U.byId('receiptDetailContent').innerHTML = html`
            <dl class="detail-list">
                <div><dt>Mã phiếu</dt><dd>${U.code('PK', r.id)}</dd></div>
                <div><dt>Loại phiếu</dt><dd>${receiptBadge(r)}</dd></div>
                <div><dt>Ngày lập</dt><dd>${U.fmtDate(r.date)}</dd></div>
                <div><dt>Nhân viên lập</dt><dd>${S.employeeName(r.empId)}</dd></div>
                ${r.supplierId ? html`<div><dt>Nhà cung cấp</dt><dd>${S.supplierName(r.supplierId)}</dd></div>` : ''}
                ${r.auto && r.invoiceId ? html`<div><dt>Nguồn</dt><dd>Tự động trừ kho theo định mức khi gửi đơn ${U.code('HD', r.invoiceId)} xuống bếp</dd></div>` : ''}
                ${r.note && !r.auto ? html`<div><dt>Ghi chú</dt><dd>${r.note}</dd></div>` : ''}
            </dl>
            <div class="table-wrap">
                <table class="table table--fluid table--compact">
                    <thead><tr><th>Nguyên liệu</th><th class="num">Số lượng</th><th class="num">Đơn giá</th><th class="num">Thành tiền</th></tr></thead>
                    <tbody><tr>
                        <td class="t-strong">${r.ingredientName}</td>
                        <td class="num">${U.fmtNumber(r.qty)} ${unit}</td>
                        <td class="num">${U.fmtMoney(r.unitPrice)}</td>
                        <td class="num t-strong">${U.fmtMoney(r.total)}</td>
                    </tr></tbody>
                </table>
            </div>`;
        UI.openModal('receiptDetailModal', { title: `${r.stocktake ? 'Phiếu điều chỉnh kiểm kê' : (r.type === 'import' ? 'Phiếu nhập kho' : 'Phiếu xuất kho')} ${U.code('PK', r.id)}` });
    };

    /* ---------------- KIỂM KÊ KHO ----------------
       Đếm tồn thực tế từng nguyên liệu; dòng lệch sổ sách sinh phiếu điều chỉnh (thừa: nhập, thiếu: xuất)
       để tồn kho khớp thực tế và báo cáo "Định mức – thực tế" thấy được phần thất thoát. */
    function stocktakeRows() {
        return S.db.ingredients.map(g => {
            const el = U.byId('stk-' + g.id);
            const actual = el ? parseQty(el) : '';
            // Ô trống / không phải số / âm: chưa tính chênh lệch (sẽ báo lỗi khi lưu)
            const valid = actual !== '' && Number.isFinite(actual) && actual >= 0;
            return { g, el, actual, diff: valid ? S.round3(actual - g.stock) : null };
        });
    }

    function syncStocktake() {
        let short = 0;
        let extra = 0;
        let count = 0;
        stocktakeRows().forEach(x => {
            const cell = document.querySelector(`#stocktakeBody tr[data-ing="${x.g.id}"] [data-diff]`);
            if (!cell) return;
            if (x.diff === null) { cell.textContent = '—'; cell.className = 'num'; return; }
            if (Math.abs(x.diff) < 1e-9) { cell.textContent = 'Khớp'; cell.className = 'num text-muted'; return; }
            count += 1;
            if (x.diff < 0) short += -x.diff * x.g.price; else extra += x.diff * x.g.price;
            cell.textContent = (x.diff > 0 ? '+' : '−') + U.fmtNumber(Math.abs(x.diff)) + ' ' + x.g.unit;
            cell.className = 'num t-strong ' + (x.diff < 0 ? 'text-danger' : 'text-info');
        });
        U.byId('stocktakeSummary').textContent = count
            ? `${count} nguyên liệu lệch sổ sách · thiếu ${U.fmtMoney(short)} · thừa ${U.fmtMoney(extra)}`
            : 'Tồn thực tế đang khớp sổ sách.';
    }

    QN.actions['stocktake-open'] = () => {
        const form = document.querySelector('#stocktakeModal form');
        form.reset();
        V.clear(form);
        UI.setText('stkDateText', `${U.fmtDate(U.todayLocal())} (hôm nay)`);
        const manager = S.db.employees.find(e => e.role === 'Quản lý') || S.db.employees[0];
        UI.fillSelect('stkEmp', S.db.employees.map(e => ({ value: e.id, label: `${e.name} · ${e.role}` })), { value: manager ? manager.id : '' });
        U.byId('stocktakeBody').innerHTML = S.db.ingredients.map(g => html`
            <tr data-ing="${g.id}">
                <td><span class="t-strong">${g.name}</span><span class="t-sub">${S.supplierName(g.supplierId)}</span></td>
                <td class="num">${U.fmtNumber(g.stock)} ${g.unit}</td>
                <td class="num">
                    <div class="field stocktake-field">
                        <label class="sr-only" for="stk-${g.id}">Tồn thực tế ${g.name}</label>
                        <div class="input-unit"><input class="input" type="number" id="stk-${g.id}" min="0" step="any" inputmode="decimal" value="${g.stock}"><span class="input-unit__suffix">${g.unit}</span></div>
                        <p class="field__error"></p>
                    </div>
                </td>
                <td class="num text-muted" data-diff>Khớp</td>
            </tr>`).join('');
        syncStocktake();
        UI.openModal('stocktakeModal', { title: 'Kiểm kê kho' });
    };

    QN.forms.stocktake = form => {
        const note = val('stkNote').trim().replace(/\s+/g, ' ');
        const rows = stocktakeRows();
        const errors = V.check([['stkNote', note, R.maxLength(120)]].concat(rows.map(x => [
            'stk-' + x.g.id, x.actual, R.required('Nhập tồn thực tế'), R.number({ min: 0, max: 1000000, decimals: 3 })
        ])));
        if (V.show(form, errors)) return;

        const today = U.todayLocal();
        const time = U.nowTime();
        const empId = Number(val('stkEmp')) || 0;
        const changed = rows.filter(x => Math.abs(x.diff) > 1e-9);
        if (!changed.length) {
            UI.closeModal('stocktakeModal');
            UI.toast('Tồn thực tế khớp sổ sách — không cần phiếu điều chỉnh.', 'success');
            return;
        }
        let short = 0;
        let extra = 0;
        changed.forEach(x => {
            const qty = Math.abs(x.diff);
            if (x.diff < 0) short += qty * x.g.price; else extra += qty * x.g.price;
            S.db.receipts.push({
                id: S.nextId('receipts'), type: x.diff > 0 ? 'import' : 'export', date: today, time, empId, supplierId: null,
                ingredientId: x.g.id, ingredientName: x.g.name, qty, unitPrice: x.g.price, total: Math.round(qty * x.g.price),
                stocktake: true, note: `Kiểm kê ${U.fmtDate(today)}: ${x.diff > 0 ? 'thừa' : 'thiếu'} so với sổ sách${note ? ' · ' + note : ''}`
            });
            x.g.stock = S.round3(x.actual);
        });
        UI.closeModal('stocktakeModal');
        UI.toast(`Đã lưu kiểm kê: ${changed.length} nguyên liệu lệch sổ sách (thiếu ${U.fmtMoney(short)}, thừa ${U.fmtMoney(extra)}). Tồn kho đã khớp thực tế.`, 'success');
        renderInventory();
        QN.app.changed();
    };

    QN.pages.inventory = {
        render: renderInventory,
        init() {
            U.byId('rcpType').addEventListener('change', () => syncReceiptForm('type'));
            U.byId('rcpIngredient').addEventListener('change', () => syncReceiptForm('ingredient'));
            U.byId('rcpQty').addEventListener('input', () => syncReceiptForm('qty'));
            U.byId('stocktakeBody').addEventListener('input', syncStocktake);
        }
    };
})(window.QN);
