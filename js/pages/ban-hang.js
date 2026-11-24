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

    /* ---------------- MÓN ĂN ---------------- */
    QN.crud.define({
        key: 'foods',
        label: 'món',
        modal: 'foodModal',
        tbody: 'foodTableBody',
        meta: 'foodsMeta',
        search: { input: 'searchFood', fields: r => [r.name, r.category] },
        fields: [
            { id: 'foodName', key: 'name' },
            { id: 'foodCategory', key: 'category', type: 'raw' },
            { id: 'foodPrice', key: 'price', type: 'int' },
            { id: 'foodStatus', key: 'status', type: 'raw' }
        ],
        columns: [
            { render: (r, i) => i + 1 },
            { className: 't-strong', render: r => r.name },
            { className: 'nowrap', render: r => r.category },
            { className: 'num', render: r => U.fmtMoney(r.price) },
            { render: r => UI.statusBadge('food', r.status) }
        ],
        display: r => r.name,
        validate: (v, existing) => V.check([
            ['foodName', v.name, R.required('Vui lòng nhập tên món'), R.maxLength(100),
                R.unique(S.db.foods, x => x.name, existing, 'Món này đã có trong thực đơn')],
            ['foodPrice', v.price, R.required('Vui lòng nhập giá'), R.integer({ min: 1000, max: 100000000 })]
        ]),
        canDelete: r => {
            const used = S.db.invoices.filter(i => i.items.some(it => Number(it.foodId) === r.id)).length;
            return used ? `Không thể xóa “${r.name}”: món đã có trong ${used} hóa đơn. Hãy chuyển trạng thái sang “Hết món”.` : null;
        },
        afterSave: r => QN.orders.syncFood(r),
        afterDelete: r => QN.orders.removeFood(r.id)
    });

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
        const all = S.db.reservations.slice()
            .sort((a, b) => (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time) || a.id - b.id);
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
            const actions = [
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
                    <td>${UI.statusBadge('reservation', r.status)}</td>
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
