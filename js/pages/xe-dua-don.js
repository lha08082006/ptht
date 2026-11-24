/* =========================================================
   XE ĐƯA ĐÓN KHÁCH: quản lý xe, yêu cầu đưa đón, chuyến xe
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
    const plateKey = s => String(s || '').toUpperCase().replace(/[\s.-]/g, '');

    /* ---------------- XE ---------------- */
    QN.crud.define({
        key: 'vehicles',
        label: 'xe',
        modal: 'vehicleModal',
        tbody: 'vehicleTableBody',
        meta: 'vehiclesMeta',
        search: { input: 'searchVehicle', fields: r => [r.plate, r.type] },
        fields: [
            { id: 'vehPlate', key: 'plate', type: 'upper' },
            { id: 'vehType', key: 'type' },
            { id: 'vehSeats', key: 'seats', type: 'int' },
            { id: 'vehStatus', key: 'status', type: 'raw' }
        ],
        columns: [
            { render: (r, i) => i + 1 },
            { className: 't-code', render: r => r.plate },
            { render: r => r.type || html`<span class="text-muted">—</span>` },
            { className: 'num', render: r => r.seats },
            { render: r => UI.statusBadge('vehicle', r.status) }
        ],
        display: r => r.plate,
        validate: (v, existing) => {
            const trip = existing ? S.activeTripOfVehicle(existing.id) : null;
            return V.check([
                ['vehPlate', v.plate, R.required('Vui lòng nhập biển số'), R.maxLength(15),
                    R.unique(S.db.vehicles, x => x.plate, existing, 'Biển số này đã có trong danh sách', plateKey)],
                ['vehType', v.type, R.maxLength(40)],
                ['vehSeats', v.seats, R.required('Vui lòng nhập số chỗ'), R.integer({ min: 1, max: 50 })],
                // Xe đang chạy chuyến chỉ được về "Sẵn sàng" khi chuyến đã hoàn tất
                ['vehStatus', v.status, s => (trip && s !== 'in_use'
                    ? `Xe đang chạy chuyến đón ${S.customerName(trip.custId)} — bấm “Hoàn tất” ở trang Yêu cầu đưa đón trước`
                    : null)]
            ]);
        },
        canDelete: r => {
            const used = S.db.trips.filter(t => Number(t.vehicleId) === r.id).length;
            return used ? `Không thể xóa xe ${r.plate}: xe đã có ${used} chuyến đưa đón.` : null;
        }
    });

    /* ---------------- YÊU CẦU ĐƯA ĐÓN & CHUYẾN XE ---------------- */
    function renderDelivery() {
        UI.renderRows('deliveryTableBody', S.db.deliveryReqs.map((d, i) => html`
            <tr>
                <td>${i + 1}</td>
                <td><span class="t-strong">${S.customerName(d.custId)}</span>${d.note ? html`<span class="t-sub">${d.note}</span>` : ''}</td>
                <td>${d.pickup}</td>
                <td>${d.dropoff}</td>
                <td class="nowrap">${d.time ? U.fmtDateTime(d.time) : html`<span class="text-muted">—</span>`}</td>
                <td class="num">${d.guests}</td>
                <td>${UI.statusBadge('delivery', d.status)}</td>
                <td class="num"><div class="cell-actions">
                    ${d.status === 'pending'
                        ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="delivery-assign" data-id="${d.id}"><i class="fas fa-car" aria-hidden="true"></i>Giao xe</button>`
                        : html`<span class="text-muted">—</span>`}
                </div></td>
            </tr>`), { empty: 'Chưa có yêu cầu đưa đón nào' });

        UI.renderRows('tripTableBody', S.db.trips.map((t, i) => html`
            <tr>
                <td>${i + 1}</td>
                <td class="t-strong">${S.customerName(t.custId)}</td>
                <td class="t-code">${S.vehiclePlate(t.vehicleId)}</td>
                <td>${S.employeeName(t.driverId)}</td>
                <td class="nowrap">${t.departure}${t.completedAt ? html`<span class="t-sub">Xong lúc ${U.fmtDateTime(t.completedAt)}</span>` : ''}</td>
                <td>${UI.statusBadge('trip', t.status)}</td>
                <td class="num"><div class="cell-actions">
                    ${t.status === 'Đang đón'
                        ? html`<button type="button" class="btn btn--ghost btn--sm" data-action="trip-complete" data-id="${t.id}"><i class="fas fa-flag-checkered" aria-hidden="true"></i>Hoàn tất</button>`
                        : html`<span class="text-muted">—</span>`}
                </div></td>
            </tr>`), { empty: 'Chưa có chuyến xe nào' });
    }

    QN.actions['delivery-add'] = () => {
        const form = document.querySelector('#deliveryReqModal form');
        form.reset();
        V.clear(form);
        UI.fillSelect('delCust', S.db.customers.map(c => ({ value: c.id, label: `${c.name} · ${c.phone}` })), { placeholder: '— Chọn khách hàng —', value: '' });
        U.byId('delTime').min = U.todayLocal() + 'T00:00';
        UI.openModal('deliveryReqModal', { title: 'Tạo yêu cầu đưa đón' });
    };

    QN.forms.delivery = form => {
        const guestsEl = U.byId('delGuests');
        const v = {
            custId: Number(val('delCust')) || 0,
            pickup: val('delPickup').trim().replace(/\s+/g, ' '),
            dropoff: val('delDropoff').trim().replace(/\s+/g, ' ') || 'Quán Nhậu Tự Do',
            time: val('delTime'),
            guests: guestsEl.validity.badInput ? NaN : (guestsEl.value.trim() === '' ? '' : Number(guestsEl.value)),
            note: val('delNote').trim()
        };
        const maxSeats = Math.max(0, ...S.db.vehicles.map(x => x.seats));
        const errors = V.check([
            ['delCust', v.custId, x => (x ? null : 'Vui lòng chọn khách hàng')],
            ['delPickup', v.pickup, R.required('Vui lòng nhập điểm đón'), R.maxLength(150)],
            ['delDropoff', v.dropoff, R.maxLength(150)],
            ['delTime', v.time, t => (t && t.slice(0, 10) < U.todayLocal() ? 'Thời gian đón đã qua' : null)],
            ['delGuests', v.guests, R.required('Vui lòng nhập số người'), R.integer({ min: 1, max: 50 }),
                g => (maxSeats && Number(g) > maxSeats ? `Xe lớn nhất chỉ có ${maxSeats} chỗ` : null)],
            ['delNote', v.note, R.maxLength(200)]
        ]);
        if (V.show(form, errors)) return;

        const id = S.nextId('deliveryReqs');
        S.db.deliveryReqs.push({ id, custId: v.custId, pickup: v.pickup, dropoff: v.dropoff, time: v.time, guests: Number(v.guests), status: 'pending', note: v.note });
        UI.closeModal('deliveryReqModal');
        UI.toast(`Đã tạo yêu cầu đưa đón cho ${S.customerName(v.custId)}`, 'success');
        renderDelivery();
        QN.app.changed();
    };

    QN.actions['delivery-assign'] = d => {
        const req = S.get('deliveryReqs', d.id);
        if (!req || req.status !== 'pending') return;
        // Xe sẵn sàng (không đang chạy chuyến nào) nhỏ nhất mà vẫn đủ chỗ
        const busyVehicles = new Set(S.activeTrips().map(t => Number(t.vehicleId)));
        const vehicle = S.db.vehicles
            .filter(x => x.status === 'available' && !busyVehicles.has(x.id) && x.seats >= req.guests)
            .sort((a, b) => a.seats - b.seats || a.id - b.id)[0];
        if (!vehicle) {
            UI.toast(`Không có xe sẵn sàng đủ ${req.guests} chỗ.`, 'error');
            return;
        }
        // Chỉ gán tài xế không đang chạy chuyến khác
        const busyDrivers = new Set(S.activeTrips().map(t => Number(t.driverId)));
        const driver = S.db.employees.find(e => e.role === 'Tài xế' && !busyDrivers.has(e.id));
        if (!driver) {
            UI.toast('Tất cả tài xế đang chạy chuyến khác. Hãy hoàn tất một chuyến trước.', 'error');
            return;
        }
        req.status = 'assigned';
        vehicle.status = 'in_use';
        S.db.trips.push({
            id: S.nextId('trips'), reqId: req.id, custId: req.custId, vehicleId: vehicle.id, driverId: driver.id,
            departure: req.time ? req.time.slice(11, 16) : '—', status: 'Đang đón'
        });
        UI.toast(`Đã giao xe ${vehicle.plate} (${vehicle.seats} chỗ), tài xế ${driver.name} cho ${S.customerName(req.custId)}`, 'success');
        renderDelivery();
        UI.focusFallback();
        QN.app.changed();
    };

    /** Hoàn tất chuyến: trả xe về "Sẵn sàng", tài xế rảnh, yêu cầu đưa đón "Hoàn tất" */
    QN.actions['trip-complete'] = d => {
        const trip = S.get('trips', d.id);
        if (!trip || trip.status !== 'Đang đón') return;
        trip.status = 'Hoàn tất';
        trip.completedAt = U.nowDateTime();
        const vehicle = S.get('vehicles', trip.vehicleId);
        if (vehicle && vehicle.status === 'in_use') vehicle.status = 'available';
        const req = trip.reqId ? S.get('deliveryReqs', trip.reqId) : null;
        if (req && req.status === 'assigned') req.status = 'completed';
        UI.toast(`Đã hoàn tất chuyến đón ${S.customerName(trip.custId)} — xe ${S.vehiclePlate(trip.vehicleId)} sẵn sàng`, 'success');
        renderDelivery();
        UI.focusFallback();
        QN.app.changed();
    };

    QN.pages.delivery = { render: renderDelivery };
})(window.QN);
