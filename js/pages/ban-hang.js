/* =========================================================
   QUẢN LÝ BÁN HÀNG: món ăn, voucher, quản lý bàn, đặt bàn
   (gọi món, hóa đơn, thanh toán nằm ở goi-mon.js)
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const V = QN.validate;
    const C = QN.charts;
    const R = V.rules;
    const { html } = U;

    /* ---------------- MÓN ĂN + ĐỊNH MỨC ----------------
       Định mức = lượng từng nguyên liệu cho 1 phần (theo đơn vị tính của nguyên liệu).
       Dùng để tự trừ kho khi gửi bếp, tính giá vốn / lãi gộp và số phần còn làm được. */
    const muted = text => html`<span class="text-muted">${text}</span>`;
    let recipeSeq = 0;

    function recipeText(food) {
        const recipe = S.recipeOf(food);
        if (!recipe.length) return html`<span class="t-sub text-warning">Chưa có định mức</span>`;
        return html`<span class="t-sub">${recipe.map(l => {
            const g = S.get('ingredients', l.ingredientId);
            return `${g.name} ${U.fmtNumber(l.qty)} ${g.unit}${Number(l.waste) ? ` (+${U.fmtNumber(l.waste)}% hao hụt)` : ''}`;
        }).join(' · ')}</span>`;
    }

    /** Nguyên liệu đang giới hạn số phần làm được (ít nhất) */
    function limitingIngredient(food) {
        let worst = null;
        S.recipeOf(food).forEach(l => {
            const g = S.get('ingredients', l.ingredientId);
            const portions = (Number(g.stock) || 0) / S.grossQty(l);
            if (!worst || portions < worst.portions) worst = { g, portions };
        });
        return worst ? worst.g : null;
    }

    function marginCell(food) {
        const cost = S.foodCost(food);
        if (cost == null) return muted('—');
        const profit = food.price - cost;
        return html`<span class="t-strong${profit <= 0 ? ' text-danger' : ''}">${U.fmtPercent(food.price ? profit / food.price : 0)}</span><span class="t-sub">${U.fmtMoney(profit)}</span>`;
    }

    function portionsCell(food) {
        const left = S.portionsLeft(food);
        if (!Number.isFinite(left)) return muted('Không theo dõi');
        const limit = limitingIngredient(food);
        const by = limit ? html`<span class="t-sub">Giới hạn bởi ${limit.name}</span>` : '';
        if (left === 0) return html`${UI.badge('Hết nguyên liệu', 'danger')}${by}`;
        if (left <= 5) return html`${UI.badge(`Còn ${left} phần`, 'warning')}${by}`;
        return html`<span class="t-strong">${U.fmtNumber(left)}</span> phần`;
    }

    function recipeRowHtml(line) {
        const n = ++recipeSeq;
        const current = line ? S.get('ingredients', line.ingredientId) : null;
        return html`
            <div class="recipe__row" data-row="${n}">
                <div class="field recipe__ing">
                    <label class="sr-only" for="recipeIng-${n}">Nguyên liệu</label>
                    <select class="input" id="recipeIng-${n}">
                        <option value="">— Chọn nguyên liệu —</option>
                        ${S.db.ingredients.map(g => html`<option value="${g.id}"${current && current.id === g.id ? U.raw(' selected') : ''}>${g.name} (${g.unit})</option>`)}
                    </select>
                    <p class="field__error"></p>
                </div>
                <div class="field recipe__qty">
                    <label class="sr-only" for="recipeQty-${n}">Định mức tịnh cho 1 phần</label>
                    <div class="input-unit">
                        <input class="input" type="number" id="recipeQty-${n}" min="0" step="any" inputmode="decimal" placeholder="0,3" value="${line ? line.qty : ''}">
                        <span class="input-unit__suffix" data-unit>${current ? current.unit : ''}</span>
                    </div>
                    <p class="field__error"></p>
                </div>
                <div class="field recipe__waste">
                    <label class="sr-only" for="recipeWaste-${n}">Hao hụt khi sơ chế (%)</label>
                    <div class="input-unit input-unit--short">
                        <input class="input" type="number" id="recipeWaste-${n}" min="0" max="99" step="any" inputmode="decimal" placeholder="0" value="${line && Number(line.waste) ? line.waste : ''}">
                        <span class="input-unit__suffix">%</span>
                    </div>
                    <p class="field__error"></p>
                </div>
                ${UI.iconButton({ action: 'recipe-remove-row', icon: 'fa-xmark', label: 'Bỏ dòng nguyên liệu này', tone: 'danger', data: { row: n } })}
                <p class="recipe__gross" data-gross></p>
            </div>`;
    }

    function readRecipeRows() {
        return [...document.querySelectorAll('#foodRecipe .recipe__row')].map(row => {
            const n = row.dataset.row;
            const qtyEl = U.byId('recipeQty-' + n);
            const wasteEl = U.byId('recipeWaste-' + n);
            const ingredient = U.byId('recipeIng-' + n).value;
            const qty = qtyEl.value.trim();
            const waste = wasteEl.value.trim();
            return {
                row: n,
                ingredientId: ingredient ? Number(ingredient) : null,
                qty: qtyEl.validity.badInput ? NaN : (qty === '' ? '' : Number(qty)),
                waste: wasteEl.validity.badInput ? NaN : (waste === '' ? 0 : Number(waste))
            };
        });
    }

    function syncRecipeSummary() {
        const all = readRecipeRows();
        document.querySelectorAll('#foodRecipe .recipe__row').forEach((row, i) => {
            const g = S.get('ingredients', U.byId('recipeIng-' + row.dataset.row).value);
            row.querySelector('[data-unit]').textContent = g ? g.unit : '';
            // Có hao hụt thì ghi rõ lượng thật sự xuất kho cho mỗi phần
            const r = all[i];
            const wasteOk = Number.isFinite(r.waste) && r.waste > 0 && r.waste < 100;
            row.querySelector('[data-gross]').textContent = g && Number(r.qty) > 0 && wasteOk
                ? `Định mức gộp (xuất kho): ${U.fmtNumber(S.grossQty(r))} ${g.unit} / phần` : '';
        });
        const rows = all.filter(r => r.ingredientId && Number(r.qty) > 0);
        const hasRows = !!document.querySelector('#foodRecipe .recipe__row');
        U.byId('foodRecipeEmpty').hidden = hasRows;
        U.byId('foodRecipeCols').hidden = !hasRows;
        const box = U.byId('foodRecipeSummary');
        if (!rows.length) {
            box.className = 'recipe__summary';
            box.textContent = 'Món chưa có định mức sẽ không tự trừ kho khi bán và giá vốn được tính bằng 0.';
            return;
        }
        const cost = Math.round(U.sum(rows, r => S.grossQty({ qty: r.qty, waste: Number.isFinite(r.waste) ? r.waste : 0 }) * ((S.get('ingredients', r.ingredientId) || {}).price || 0)));
        const price = Number(U.byId('foodPrice').value) || 0;
        const profit = price - cost;
        const loss = price > 0 && profit <= 0;
        box.className = 'recipe__summary' + (loss ? ' is-danger' : '');
        box.innerHTML = html`Giá vốn <strong>${U.fmtMoney(cost)}</strong> / phần${price ? html` · Lãi gộp <strong>${U.fmtMoney(profit)}</strong> (${U.fmtPercent(profit / price)})` : ''}${loss ? ' — giá vốn đang cao hơn giá bán!' : ''}`;
    }

    function renderRecipeEditor(recipe) {
        U.byId('foodRecipe').innerHTML = (recipe || [])
            .filter(l => S.get('ingredients', l.ingredientId))
            .map(recipeRowHtml).join('');
        syncRecipeSummary();
    }

    function recipeErrors(rows) {
        const errors = {};
        const seen = new Set();
        rows.forEach(r => {
            if (!r.ingredientId && r.qty === '') return; // dòng để trống: bỏ qua
            const ingId = 'recipeIng-' + r.row;
            if (!r.ingredientId) errors[ingId] = 'Chọn nguyên liệu';
            else if (seen.has(r.ingredientId)) errors[ingId] = 'Nguyên liệu này đã có ở dòng khác';
            if (r.ingredientId) seen.add(r.ingredientId);
            const qtyError = r.qty === '' ? 'Nhập lượng cho 1 phần' : R.number({ above: 0, max: 1000, decimals: 3 })(r.qty);
            if (qtyError) errors['recipeQty-' + r.row] = qtyError;
            const wasteError = R.number({ min: 0, max: 99, decimals: 2 })(r.waste);
            if (wasteError) errors['recipeWaste-' + r.row] = wasteError;
        });
        return errors;
    }

    QN.actions['recipe-add-row'] = () => {
        const box = U.byId('foodRecipe');
        box.insertAdjacentHTML('beforeend', recipeRowHtml(null));
        syncRecipeSummary();
        box.lastElementChild.querySelector('select').focus();
    };

    QN.actions['recipe-remove-row'] = d => {
        const row = document.querySelector(`#foodRecipe .recipe__row[data-row="${d.row}"]`);
        if (!row) return;
        const next = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        syncRecipeSummary();
        (next ? next.querySelector('select') : U.byId('foodRecipeAdd')).focus();
    };

    QN.crud.define({
        key: 'foods',
        label: 'món',
        modal: 'foodModal',
        tbody: 'foodTableBody',
        meta: 'foodsMeta',
        search: { input: 'searchFood', fields: r => [r.name, r.category, ...S.recipeOf(r).map(l => S.get('ingredients', l.ingredientId).name)] },
        fields: [
            { id: 'foodName', key: 'name' },
            { id: 'foodCategory', key: 'category', type: 'raw' },
            { id: 'foodPrice', key: 'price', type: 'int' },
            { id: 'foodStatus', key: 'status', type: 'raw' },
            { id: 'foodRecipe', key: 'recipe', read: readRecipeRows, fill: renderRecipeEditor }
        ],
        defaults: () => ({ recipe: [] }),
        columns: [
            { render: (r, i) => i + 1 },
            { render: r => html`<span class="t-strong">${r.name}</span>${recipeText(r)}` },
            { className: 'nowrap', render: r => r.category },
            { className: 'num', render: r => U.fmtMoney(r.price) },
            { className: 'num', render: r => { const cost = S.foodCost(r); return cost == null ? muted('—') : U.fmtMoney(cost); } },
            { className: 'num', render: marginCell },
            { className: 'nowrap', render: portionsCell },
            { render: r => UI.statusBadge('food', r.status) }
        ],
        display: r => r.name,
        validate: (v, existing) => Object.assign(V.check([
            ['foodName', v.name, R.required('Vui lòng nhập tên món'), R.maxLength(100),
                R.unique(S.db.foods, x => x.name, existing, 'Món này đã có trong thực đơn')],
            ['foodPrice', v.price, R.required('Vui lòng nhập giá'), R.integer({ min: 1000, max: 100000000 })]
        ]), recipeErrors(v.recipe)),
        normalize: v => Object.assign({}, v, {
            recipe: v.recipe
                .filter(r => r.ingredientId && Number(r.qty) > 0)
                .map(r => ({ ingredientId: r.ingredientId, qty: S.round3(r.qty), waste: Math.round((Number(r.waste) || 0) * 100) / 100 }))
        }),
        canDelete: r => {
            const used = S.db.invoices.filter(i => i.items.some(it => Number(it.foodId) === r.id)).length;
            return used ? `Không thể xóa “${r.name}”: món đã có trong ${used} hóa đơn. Hãy chuyển trạng thái sang “Hết món”.` : null;
        },
        afterSave: r => QN.orders.syncFood(r),
        afterDelete: r => QN.orders.removeFood(r.id)
    });

    QN.pages.foods.init = () => {
        U.byId('foodRecipe').addEventListener('input', syncRecipeSummary);
        U.byId('foodRecipe').addEventListener('change', syncRecipeSummary);
        U.byId('foodPrice').addEventListener('input', syncRecipeSummary);
    };

    /* ---------------- VOUCHER ---------------- */
    QN.crud.define({
        key: 'vouchers',
        label: 'voucher',
        modal: 'voucherModal',
        tbody: 'voucherTableBody',
        meta: 'vouchersMeta',
        search: { input: 'searchVoucher', fields: r => [r.id, r.desc] },
        fields: [
            { id: 'vcId', key: 'id', type: 'upper' },
            { id: 'vcPercent', key: 'percent', type: 'int' },
            { id: 'vcDesc', key: 'desc' },
            { id: 'vcQty', key: 'qty', type: 'int' }
        ],
        makeId: v => v.id,
        lockOnEdit: ['vcId'],
        columns: [
            { className: 't-code', render: r => r.id },
            { render: r => r.desc || html`<span class="text-muted">—</span>` },
            { className: 'num', render: r => r.percent + '%' },
            { className: 'num', render: r => (r.qty > 0 ? U.fmtNumber(r.qty) : UI.badge('Hết lượt', 'neutral')) }
        ],
        display: r => r.id,
        prepare: (form, record) => {
            UI.setText('vcIdHint', record ? 'Mã voucher không đổi được sau khi tạo.' : 'Chữ in hoa, số, “-” hoặc “_”; không dấu cách.');
        },
        validate: (v, existing) => V.check([
            ['vcId', v.id, R.required('Vui lòng nhập mã voucher'),
                R.pattern(/^[A-Z0-9_-]{2,20}$/, 'Chỉ gồm chữ in hoa không dấu, số, “-” hoặc “_” (2–20 ký tự)'),
                R.unique(S.db.vouchers, x => x.id, existing, 'Mã voucher này đã tồn tại', s => String(s).toUpperCase())],
            ['vcPercent', v.percent, R.required('Vui lòng nhập % giảm'), R.integer({ min: 1, max: 100 })],
            ['vcDesc', v.desc, R.maxLength(120)],
            ['vcQty', v.qty, R.required('Vui lòng nhập số lượng'), R.integer({ min: 0, max: 100000 })]
        ])
    });

    /* ---------------- QUẢN LÝ BÀN ---------------- */
    const NEXT_TABLE_STATUS = { available: 'reserved', reserved: 'occupied', occupied: 'available' };

    function tableCard(t) {
        const st = S.STATUS.table[t.status];
        const hold = S.holdsOfTable(t.id)[0];
        const holdText = hold ? `Giữ cho ${U.code('RES', hold.id)} · ${hold.date === U.todayLocal() ? hold.time : U.fmtDateShort(hold.date) + ' ' + hold.time}` : '';
        return html`
            <button type="button" class="table-card table-card--${t.status}" data-action="table-toggle" data-id="${t.id}"
                aria-label="${t.name}, ${t.seats} chỗ, ${t.zone}: ${st.label}${holdText ? '. ' + holdText : ''}. Bấm để đổi trạng thái">
                <span class="table-card__icon" aria-hidden="true"><i class="fas fa-chair"></i></span>
                <span class="table-card__name">${t.name}</span>
                <span class="table-card__meta">${t.seats} chỗ · ${t.zone}</span>
                ${UI.badge(st.label, st.tone)}
                ${holdText ? html`<span class="table-card__hold">${holdText}</span>` : ''}
            </button>`;
    }

    function renderTables() {
        const tables = S.db.tables;
        const counts = { available: 0, reserved: 0, occupied: 0 };
        tables.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
        U.byId('tableLegend').innerHTML = Object.keys(counts)
            .map(k => UI.badge(`${S.STATUS.table[k].label}: ${counts[k]}`, S.STATUS.table[k].tone)).join('');

        const zones = [...new Set(tables.map(t => t.zone))];
        U.byId('tablesGrid').innerHTML = zones.map(zone => {
            const list = tables.filter(t => t.zone === zone);
            return html`
                <section class="zone" aria-label="${zone}">
                    <h2 class="zone__title">${zone} <span class="zone__count">· ${list.length} bàn</span></h2>
                    <div class="table-grid">${list.map(tableCard)}</div>
                </section>`;
        }).join('');
    }

    QN.actions['table-toggle'] = async d => {
        const t = S.get('tables', d.id);
        if (!t) return;
        const next = NEXT_TABLE_STATUS[t.status] || 'available';
        if (next === 'available') {
            const pending = S.pendingInvoicesOfTable(t.id);
            if (pending.length) {
                const ok = await UI.confirm({
                    title: `Chuyển ${t.name} sang “Trống”?`,
                    message: `Bàn còn ${pending.length} hóa đơn chưa thanh toán (${pending.map(i => U.code('HD', i.id)).join(', ')}). Vẫn đổi trạng thái?`,
                    confirmText: 'Vẫn đổi',
                    tone: 'info',
                    icon: 'fa-triangle-exclamation'
                });
                if (!ok) return;
            }
        }
        t.status = next;
        UI.toast(`${t.name} → ${S.STATUS.table[next].label}`, 'info');
        UI.keepFocus(renderTables);
        QN.app.changed();
    };

    /* ---------------- ĐẶT BÀN ---------------- */
    let reservationFilter = 'all';
    const val = id => U.byId(id).value;

    /** Bàn trống nhỏ nhất mà vẫn đủ chỗ */
    function pickTable(guests) {
        return S.db.tables
            .filter(t => t.status === 'available' && t.seats >= guests)
            .sort((a, b) => a.seats - b.seats || a.id - b.id)[0] || null;
    }

    /** Ngày giờ mặc định khi tạo đặt bàn: 18:00 hôm nay, hoặc mốc nửa giờ kế tiếp nếu đã muộn */
    function defaultSlot() {
        const today = U.todayLocal();
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        if (minutes + 30 <= 18 * 60) return { date: today, time: '18:00' };
        const next = Math.ceil((minutes + 30) / 30) * 30;
        if (next > 23 * 60) return { date: U.addDays(today, 1), time: '18:00' };
        return { date: today, time: U.pad2(Math.floor(next / 60)) + ':' + U.pad2(next % 60) };
    }

    function renderReservations() {
        const today = U.todayLocal();
        // Lịch sắp tới lên trước (gần nhất trước), lịch đã qua xuống dưới (mới nhất trước)
        const past = r => r.date < today;
        const all = S.db.reservations.slice().sort((a, b) => {
            if (past(a) !== past(b)) return past(a) ? 1 : -1;
            const ka = a.date + ' ' + a.time;
            const kb = b.date + ' ' + b.time;
            return (past(a) ? kb.localeCompare(ka) : ka.localeCompare(kb)) || a.id - b.id;
        });
        const count = st => all.filter(r => r.status === st).length;
        UI.syncTabs('reservations', reservationFilter, {
            all: all.length, pending: count('pending'), confirmed: count('confirmed'),
            checked_in: count('checked_in'), cancelled: count('cancelled')
        });
        const query = val('searchReservation').trim();
        const list = all
            .filter(r => reservationFilter === 'all' || r.status === reservationFilter)
            .filter(r => U.matches(query, U.code('RES', r.id), r.name, r.phone, r.note));

        UI.renderRows('reservationTableBody', list.map(r => {
            const code = U.code('RES', r.id);
            // Lịch đã qua ngày mà khách chưa đến: không xác nhận / check-in được nữa, chỉ còn hủy để đóng lại
            const overdue = past(r) && (r.status === 'pending' || r.status === 'confirmed');
            const actions = overdue ? [
                UI.iconButton({ action: 'reservation-cancel', icon: 'fa-ban', label: 'Hủy ' + code + ' (khách không đến)', tone: 'danger', data: { id: r.id } })
            ] : [
                r.status === 'confirmed' && r.date === today ? UI.iconButton({ action: 'reservation-checkin', icon: 'fa-user-check', label: 'Check-in ' + code, tone: 'success', data: { id: r.id } }) : '',
                r.status === 'confirmed' ? UI.iconButton({ action: 'reservation-qr', icon: 'fa-qrcode', label: 'Xem mã QR ' + code, data: { id: r.id } }) : '',
                r.status === 'pending' ? UI.iconButton({ action: 'reservation-confirm', icon: 'fa-check', label: 'Xác nhận ' + code, tone: 'success', data: { id: r.id } }) : '',
                r.status === 'pending' || r.status === 'confirmed' ? UI.iconButton({ action: 'reservation-cancel', icon: 'fa-ban', label: 'Hủy ' + code, tone: 'danger', data: { id: r.id } }) : ''
            ].filter(Boolean);
            return html`
                <tr>
                    <td class="t-code">${code}</td>
                    <td><span class="t-strong">${r.name}</span>${r.note ? html`<span class="t-sub">${r.note}</span>` : ''}</td>
                    <td class="nowrap">${r.phone}</td>
                    <td class="nowrap">${r.date === today ? html`Hôm nay <span class="text-muted">${r.time}</span>` : U.fmtDateTime(r.date, r.time)}</td>
                    <td class="num">${r.guests}</td>
                    <td class="nowrap">${r.tableId ? S.tableName(r.tableId) : html`<span class="text-muted">Chưa gán</span>`}</td>
                    <td>${overdue ? html`${UI.badge('Quá hạn', 'neutral')}<span class="t-sub">${S.STATUS.reservation[r.status].label}, khách chưa đến</span>` : UI.statusBadge('reservation', r.status)}</td>
                    <td class="num"><div class="cell-actions">${actions.length ? actions : html`<span class="text-muted">—</span>`}</div></td>
                </tr>`;
        }), query
            ? { empty: `Không tìm thấy đặt bàn cho “${query}”`, icon: 'fa-magnifying-glass' }
            : { empty: reservationFilter === 'all' ? 'Chưa có đặt bàn nào' : 'Không có đặt bàn ở trạng thái này' });
    }

    function refreshReservationTables() {
        const guests = Number(val('resGuests')) || 0;
        const options = S.db.tables
            .filter(t => t.status === 'available' && (!guests || t.seats >= guests))
            .sort((a, b) => a.seats - b.seats || a.id - b.id)
            .map(t => ({ value: t.id, label: `${t.name} · ${t.seats} chỗ · ${t.zone}` }));
        UI.fillSelect('resTable', options, { placeholder: 'Tự động chọn khi xác nhận' });
        UI.setText('resTableHint', options.length
            ? 'Chỉ hiện bàn đang trống và đủ chỗ.'
            : 'Hiện không có bàn trống đủ chỗ — hệ thống sẽ gán bàn khi xác nhận.');
    }

    /** Khách đặt bàn đã đến: đặt bàn → "Đã đến", bàn → "Đang dùng" */
    async function checkIn(r, { offerOrder = true } = {}) {
        if (!r || r.status !== 'confirmed') return false;
        const today = U.todayLocal();
        if (r.date !== today) {
            UI.toast(`Chỉ check-in được vào đúng ngày đặt (${U.fmtDate(r.date)}).`, 'warning');
            return false;
        }
        r.status = 'checked_in';
        r.checkedInAt = U.nowDateTime();
        const table = S.get('tables', r.tableId);
        if (table) table.status = 'occupied';
        UI.closeModal('qrModal');
        QN.app.changed();
        if (QN.app.currentPage() === 'reservations') UI.keepFocus(renderReservations);
        UI.toast(`${U.code('RES', r.id)}: khách đã đến${table ? ' — ' + table.name + ' chuyển sang “Đang dùng”' : ''}`, 'success');
        if (!offerOrder || !table) return true;
        const go = await UI.confirm({
            title: 'Gọi món cho khách vừa đến?',
            message: `Mở trang Gọi món với ${table.name} đã được chọn sẵn.`,
            confirmText: 'Gọi món ngay',
            cancelText: 'Để sau',
            tone: 'info',
            icon: 'fa-utensils'
        });
        if (go) {
            QN.orders.preselectTable(table.id);
            QN.app.navigateTo('orders');
        }
        return true;
    }

    QN.actions['reservation-filter'] = d => {
        reservationFilter = d.filter;
        renderReservations();
    };

    QN.actions['reservation-add'] = () => {
        const form = document.querySelector('#reservationModal form');
        form.reset();
        V.clear(form);
        const slot = defaultSlot();
        const date = U.byId('resDate');
        date.min = U.todayLocal();
        date.value = slot.date;
        U.byId('resTime').value = slot.time;
        refreshReservationTables();
        UI.openModal('reservationModal', { title: 'Tạo đặt bàn' });
    };

    QN.forms.reservation = form => {
        const today = U.todayLocal();
        const guestsEl = U.byId('resGuests');
        const v = {
            name: val('resName').trim().replace(/\s+/g, ' '),
            phone: val('resPhone').trim().replace(/[\s.-]/g, ''),
            date: val('resDate'),
            time: val('resTime'),
            guests: guestsEl.validity.badInput ? NaN : (guestsEl.value.trim() === '' ? '' : Number(guestsEl.value)),
            tableId: Number(val('resTable')) || 0,
            note: val('resNote').trim()
        };
        const maxSeats = Math.max(...S.db.tables.map(t => t.seats));
        const table = v.tableId ? S.get('tables', v.tableId) : null;
        const errors = V.check([
            ['resName', v.name, R.required('Vui lòng nhập tên khách hàng'), R.maxLength(80)],
            ['resPhone', v.phone, R.required('Vui lòng nhập SĐT'), R.phone()],
            ['resDate', v.date, R.required('Vui lòng chọn ngày'), R.dateFrom(today, 'Không thể đặt bàn cho ngày đã qua')],
            ['resTime', v.time, R.required('Vui lòng chọn giờ'),
                t => (v.date === today && t < U.nowTime() ? 'Giờ này đã qua' : null)],
            ['resGuests', v.guests, R.required('Vui lòng nhập số người'), R.integer({ min: 1 }),
                g => (Number(g) > maxSeats ? `Bàn lớn nhất chỉ có ${maxSeats} chỗ` : null)],
            ['resTable', v.tableId,
                () => (table && table.status !== 'available' ? `${table.name} không còn trống` : null),
                () => (table && Number(v.guests) > table.seats ? `${table.name} chỉ có ${table.seats} chỗ` : null)],
            ['resNote', v.note, R.maxLength(200)]
        ]);
        if (V.show(form, errors)) return;

        const id = S.nextId('reservations');
        S.db.reservations.push({
            id, name: v.name, phone: v.phone, date: v.date, time: v.time, guests: Number(v.guests),
            tableId: v.tableId, status: 'pending', note: v.note, qr: 'RES-' + String(id).padStart(3, '0') + '-QNTD'
        });
        UI.closeModal('reservationModal');
        UI.toast(`Đã tạo đặt bàn ${U.code('RES', id)} — đang chờ xác nhận`, 'success');
        renderReservations();
        QN.app.changed();
    };

    QN.actions['reservation-confirm'] = d => {
        const r = S.get('reservations', d.id);
        if (!r || r.status !== 'pending') return;
        const code = U.code('RES', r.id);
        let table = r.tableId ? S.get('tables', r.tableId) : null;
        let movedFrom = null;
        if (table && (table.status !== 'available' || table.seats < r.guests)) {
            movedFrom = table;
            table = null;
        }
        if (!table) table = pickTable(r.guests);
        if (!table) {
            UI.toast(`Không còn bàn trống đủ ${r.guests} chỗ. Hãy gợi ý khách đổi thời gian.`, 'error');
            return;
        }
        r.tableId = table.id;
        r.status = 'confirmed';
        table.status = 'reserved';
        UI.toast(movedFrom
            ? `${movedFrom.name} không còn trống — đã xác nhận ${code} và chuyển sang ${table.name}`
            : `Đã xác nhận ${code} — ${table.name}`, 'success');
        UI.keepFocus(renderReservations);
        QN.app.changed();
    };

    QN.actions['reservation-cancel'] = async d => {
        const r = S.get('reservations', d.id);
        if (!r || (r.status !== 'pending' && r.status !== 'confirmed')) return;
        const code = U.code('RES', r.id);
        const ok = await UI.confirm({
            title: `Hủy đặt bàn ${code}?`,
            message: `${r.name} · ${U.fmtDateTime(r.date, r.time)} · ${r.guests} người`,
            confirmText: 'Hủy đặt bàn',
            cancelText: 'Không',
            tone: 'danger',
            icon: 'fa-ban'
        });
        if (!ok) return;
        const wasConfirmed = r.status === 'confirmed';
        r.status = 'cancelled';
        if (wasConfirmed && r.tableId) {
            const t = S.get('tables', r.tableId);
            // Chỉ trả bàn khi bàn đang được giữ và không còn đặt bàn nào khác giữ nó
            if (t && t.status === 'reserved' && !S.holdsOfTable(t.id).length) t.status = 'available';
        }
        UI.toast(`Đã hủy đặt bàn ${code}`, 'success');
        UI.keepFocus(renderReservations);
        QN.app.changed();
    };

    QN.actions['reservation-checkin'] = d => checkIn(S.get('reservations', d.id));

    QN.actions['reservation-qr'] = d => {
        const r = S.get('reservations', d.id);
        if (!r) return;
        const canCheckIn = r.status === 'confirmed' && r.date === U.todayLocal();
        const qr = C.qrSvg(r.qr);
        U.byId('qrContent').innerHTML = html`
            <div class="qr-ticket">
                <div class="qr-ticket__box">${qr || html`<i class="fas fa-qrcode" aria-hidden="true"></i>`}</div>
                <p class="qr-ticket__code">${r.qr}</p>
                <p class="qr-ticket__info">${r.name} · ${r.phone}</p>
                <p class="qr-ticket__info">${U.fmtDateTime(r.date, r.time)} · ${r.guests} người · ${S.tableName(r.tableId)}</p>
                <p class="qr-ticket__hint">Quét mã tại quầy lễ tân để check-in.</p>
            </div>
            ${canCheckIn ? html`<button type="button" class="btn btn--secondary btn--block qr-checkin" data-action="reservation-checkin" data-id="${r.id}"><i class="fas fa-user-check" aria-hidden="true"></i>Check-in khách đã đến</button>` : ''}`;
        UI.openModal('qrModal', { title: 'Mã QR check-in ' + U.code('RES', r.id) });
    };

    QN.reservations = { checkIn };
    QN.pages.tables = { render: renderTables };
    QN.pages.reservations = {
        render: renderReservations,
        init() {
            U.byId('resGuests').addEventListener('input', refreshReservationTables);
        }
    };
})(window.QN);
