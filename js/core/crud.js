/* =========================================================
   CRUD DÙNG CHUNG
   7 danh mục (khách hàng, nhân viên, món, NCC, voucher, nguyên liệu, xe)
   trước đây mỗi cái chép lại một khối thêm/sửa/xóa gần y hệt nhau.
   Giờ mỗi danh mục chỉ khai báo cấu hình bằng QN.crud.define({...}).

   Cấu hình:
     key        tên bộ dữ liệu trong store (cũng là tên trang)
     label      tên gọi, viết thường ("khách hàng")
     modal      id modal chứa <form data-crud="key">
     tbody      id <tbody> của bảng
     meta       (tùy chọn) id chỗ hiện số bản ghi
     search     (tùy chọn) { input: id ô tìm, fields: r => [các trường để tìm] }
     fields     [{ id: id ô nhập, key: tên trường, type: text|raw|int|select-int|upper|phone }]
     columns    [{ className, render(r, i) }] — các cột trước cột "Thao tác"
     display    r => tên hiển thị của bản ghi
     validate   (values, existing) => { idÔNhập: 'lỗi' }
     prepare    (form, record) => đổ dữ liệu cho select phụ thuộc trước khi mở
     defaults   () => giá trị mặc định khi thêm mới
     makeId     values => id (nếu không dùng id tự tăng, ví dụ mã voucher)
     lockOnEdit [id ô nhập chỉ đọc khi sửa]
     canDelete  record => null | 'lý do không được xóa'
     afterSave / afterDelete
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const V = QN.validate;
    const { html } = U;

    const registry = {};

    function define(config) {
        registry[config.key] = config;
        QN.pages[config.key] = { render: () => render(config.key) };
    }

    function readField(field) {
        const el = U.byId(field.id);
        if (!el) return '';
        if (el.validity && el.validity.badInput) return NaN;
        const value = el.value;
        switch (field.type) {
            case 'int': return value.trim() === '' ? '' : Number(value);
            case 'select-int': return value === '' ? null : Number(value);
            case 'upper': return value.trim().toUpperCase().replace(/\s+/g, '');
            case 'phone': return value.trim().replace(/[\s.-]/g, '');
            case 'raw': return value;
            default: return value.trim().replace(/\s+/g, ' ');
        }
    }

    function render(key) {
        const c = registry[key];
        const all = S.db[c.key];
        const searchInput = c.search ? U.byId(c.search.input) : null;
        const query = searchInput ? searchInput.value.trim() : '';
        const list = query ? all.filter(r => U.matches(query, ...c.search.fields(r))) : all;

        const rows = list.map((r, i) => html`
            <tr>
                ${c.columns.map(col => html`<td${col.className ? html` class="${col.className}"` : ''}>${col.render(r, i)}</td>`)}
                <td class="num">
                    <div class="cell-actions">
                        ${UI.iconButton({ action: 'crud-edit', icon: 'fa-pen-to-square', label: 'Sửa ' + c.display(r), tone: 'info', data: { entity: key, id: r.id } })}
                        ${UI.iconButton({ action: 'crud-delete', icon: 'fa-trash', label: 'Xóa ' + c.display(r), tone: 'danger', data: { entity: key, id: r.id } })}
                    </div>
                </td>
            </tr>`);

        UI.renderRows(c.tbody, rows, query
            ? { empty: `Không tìm thấy kết quả cho “${query}”`, icon: 'fa-magnifying-glass' }
            : { empty: `Chưa có ${c.label} nào` });

        if (c.meta) UI.setText(c.meta, query ? `${list.length} / ${all.length} ${c.label}` : `${all.length} ${c.label}`);
    }

    function openForm(key, id) {
        const c = registry[key];
        const form = U.byId(c.modal).querySelector('form');
        const record = id !== undefined && id !== null && id !== '' ? S.get(c.key, id) : null;
        form.reset();
        V.clear(form);
        form.dataset.editId = record ? String(record.id) : '';
        if (c.prepare) c.prepare(form, record);
        if (record) {
            c.fields.forEach(f => {
                const el = U.byId(f.id);
                if (el) el.value = record[f.key] == null ? '' : record[f.key];
            });
        }
        (c.lockOnEdit || []).forEach(fieldId => {
            const el = U.byId(fieldId);
            if (el) el.readOnly = !!record;
        });
        UI.openModal(c.modal, { title: (record ? 'Sửa ' : 'Thêm ') + c.label });
    }

    function submit(key, form) {
        const c = registry[key];
        const existing = form.dataset.editId ? S.get(c.key, form.dataset.editId) : null;
        const values = {};
        c.fields.forEach(f => { values[f.key] = readField(f); });

        if (V.show(form, c.validate(values, existing))) return;

        let record;
        if (existing) {
            Object.assign(existing, values);
            record = existing;
            UI.toast(`Đã cập nhật ${c.label} “${c.display(record)}”`, 'success');
        } else {
            record = Object.assign(
                { id: c.makeId ? c.makeId(values) : S.nextId(c.key) },
                c.defaults ? c.defaults() : {},
                values
            );
            S.db[c.key].push(record);
            UI.toast(`Đã thêm ${c.label} “${c.display(record)}”`, 'success');
        }
        if (c.afterSave) c.afterSave(record, !existing);
        UI.closeModal(c.modal);
        render(key);
        QN.app.refreshBell();
    }

    async function remove(key, id) {
        const c = registry[key];
        const record = S.get(c.key, id);
        if (!record) return;
        const reason = c.canDelete ? c.canDelete(record) : null;
        if (reason) {
            UI.toast(reason, 'warning');
            return;
        }
        const ok = await UI.confirm({
            title: `Xóa ${c.label}?`,
            message: `“${c.display(record)}” sẽ bị xóa khỏi danh sách.`,
            confirmText: 'Xóa',
            tone: 'danger'
        });
        if (!ok) return;
        S.remove(c.key, record);
        if (c.afterDelete) c.afterDelete(record);
        UI.toast(`Đã xóa ${c.label} “${c.display(record)}”`, 'success');
        render(key);
        QN.app.refreshBell();
    }

    QN.actions['crud-add'] = d => openForm(d.entity);
    QN.actions['crud-edit'] = d => openForm(d.entity, d.id);
    QN.actions['crud-delete'] = d => remove(d.entity, d.id);

    QN.crud = { define, render, openForm, submit, remove, readField };
})(window.QN);
