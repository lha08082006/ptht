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
            { id: 'ingMinStock', key: 'minStock', type: 'int' },
            { id: 'ingSupplier', key: 'supplierId', type: 'select-int' }
        ],
        defaults: () => ({ stock: 0 }),
        prepare: () => {
            UI.fillSelect('ingSupplier', S.db.suppliers.map(s => ({ value: s.id, label: s.name })), { placeholder: '— Không chọn —', value: '' });
        },
        columns: [
            { render: (r, i) => i + 1 },
            { className: 't-strong', render: r => r.name },
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
            return V.check([
                ['ingName', v.name, R.required('Vui lòng nhập tên nguyên liệu'), R.maxLength(80),
                    R.unique(S.db.ingredients, x => x.name, existing, 'Nguyên liệu này đã có')],
                ['ingPrice', v.price, R.required('Vui lòng nhập đơn giá'), R.integer({ min: 1, max: 100000000 })],
                ['ingUnit', v.unit, u => (hasReceipts && u !== existing.unit ? `Không đổi được đơn vị vì đã có phiếu kho tính theo “${existing.unit}”` : null)],
                ['ingMinStock', v.minStock, R.required('Vui lòng nhập định mức tồn tối thiểu'), R.integer({ min: 0, max: 100000 })]
            ]);
        },
        canDelete: r => {
            const used = S.db.receipts.filter(x => x.ingredientId === r.id).length;
            return used ? `Không thể xóa “${r.name}”: đã có ${used} phiếu nhập / xuất kho.` : null;
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
        UI.syncTabs('inventory', inventoryFilter, {
            all: all.length,
            import: all.filter(r => r.type === 'import').length,
            export: all.filter(r => r.type === 'export').length
        });
        const query = val('searchReceipt').trim();
        const list = (inventoryFilter === 'all' ? all : all.filter(r => r.type === inventoryFilter))
            .filter(r => U.matches(query, U.code('PK', r.id), r.ingredientName, S.supplierName(r.supplierId), S.employeeName(r.empId)));
        UI.renderRows('inventoryTableBody', list.map(r => html`
            <tr>
                <td class="t-code">${U.code('PK', r.id)}</td>
                <td>${UI.statusBadge('receipt', r.type)}</td>
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
        const qtyRaw = val('rcpQty');
        const qty = Number(qtyRaw);
        const validQty = qtyRaw !== '' && Number.isInteger(qty) && qty > 0;
        const after = type === 'import' ? ingredient.stock + qty : ingredient.stock - qty;
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
        const qtyEl = U.byId('rcpQty');
        const qty = qtyEl.validity.badInput ? NaN : (qtyEl.value.trim() === '' ? '' : Number(qtyEl.value));
        const today = U.todayLocal();
        const errors = V.check([
            ['rcpDate', date, R.required('Vui lòng chọn ngày lập phiếu'), R.dateTo(today, 'Ngày lập phiếu không được ở tương lai')],
            ['rcpEmp', empId, v => (v ? null : 'Vui lòng chọn nhân viên')],
            ['rcpIngredient', ingredient, v => (v ? null : 'Vui lòng chọn nguyên liệu')],
            ['rcpQty', qty, R.required('Vui lòng nhập số lượng'), R.integer({ min: 1, max: 100000 }),
                v => (type === 'export' && ingredient && Number(v) > ingredient.stock
                    ? `Không đủ tồn kho (còn ${U.fmtNumber(ingredient.stock)} ${ingredient.unit})` : null)]
        ]);
        if (V.show(form, errors)) return;

        const supplierId = type === 'import' ? (Number(val('rcpSupplier')) || null) : null;
        ingredient.stock += type === 'import' ? qty : -qty;
        const id = S.nextId('receipts');
        S.db.receipts.push({
            id, type, date, empId, supplierId,
            ingredientId: ingredient.id, ingredientName: ingredient.name,
            qty, unitPrice: ingredient.price, total: qty * ingredient.price
        });
        UI.closeModal('receiptModal');
        UI.toast(`Đã lưu phiếu ${type === 'import' ? 'nhập' : 'xuất'} ${U.code('PK', id)}: ${ingredient.name} ${type === 'import' ? '+' : '−'}${qty} ${ingredient.unit}`, 'success');
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
                <div><dt>Loại phiếu</dt><dd>${UI.statusBadge('receipt', r.type)}</dd></div>
                <div><dt>Ngày lập</dt><dd>${U.fmtDate(r.date)}</dd></div>
                <div><dt>Nhân viên lập</dt><dd>${S.employeeName(r.empId)}</dd></div>
                ${r.supplierId ? html`<div><dt>Nhà cung cấp</dt><dd>${S.supplierName(r.supplierId)}</dd></div>` : ''}
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
        UI.openModal('receiptDetailModal', { title: `Phiếu ${r.type === 'import' ? 'nhập' : 'xuất'} kho ${U.code('PK', r.id)}` });
    };

    QN.pages.inventory = {
        render: renderInventory,
        init() {
            U.byId('rcpType').addEventListener('change', () => syncReceiptForm('type'));
            U.byId('rcpIngredient').addEventListener('change', () => syncReceiptForm('ingredient'));
            U.byId('rcpQty').addEventListener('input', () => syncReceiptForm('qty'));
        }
    };
})(window.QN);
