/* =========================================================
   QUẢN LÝ NHÀ BẾP (Kanban: Đơn mới → Đang chế biến → Hoàn thành)
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const { html } = U;

    const COLUMNS = [
        { status: 'new', list: 'kanbanNew', count: 'kanbanNewCount', empty: 'Không có đơn mới' },
        { status: 'cooking', list: 'kanbanCooking', count: 'kanbanCookingCount', empty: 'Chưa có món đang chế biến' },
        { status: 'done', list: 'kanbanDone', count: 'kanbanDoneCount', empty: 'Chưa có đơn hoàn thành' }
    ];
    const NEXT = { new: 'cooking', cooking: 'done' };

    /** Khóa sắp xếp theo ngày + giờ (phiếu cũ có thể từ hôm trước) */
    const sortKey = k => (k.date || '') + ' ' + (k.time || '');

    function ticket(k) {
        const today = U.todayLocal();
        const when = k.date && k.date !== today ? U.fmtRelativeDate(k.date) + ' ' + k.time : k.time;
        return html`
            <article class="ticket">
                <div class="ticket__head">
                    <span class="ticket__table">${S.tableName(k.tableId)}</span>
                    <span class="ticket__time"><i class="fas fa-clock" aria-hidden="true"></i>${when}</span>
                </div>
                ${k.invoiceId ? html`<p class="ticket__sub">${k.extra ? html`<span class="badge badge--info">Gọi thêm</span> ` : ''}Hóa đơn ${U.code('HD', k.invoiceId)}</p>` : ''}
                <ul class="ticket__items">
                    ${k.items.map(it => html`<li class="ticket__item"><span class="ticket__qty">×${it.qty}</span><span>${it.name}</span></li>`)}
                </ul>
                ${k.status === 'new' ? html`
                    <div class="ticket__actions">
                        <button type="button" class="btn btn--primary btn--sm" data-action="kitchen-move" data-id="${k.id}" data-to="cooking"><i class="fas fa-fire" aria-hidden="true"></i>Bắt đầu chế biến</button>
                        <button type="button" class="btn btn--ghost btn--sm" data-action="kitchen-cancel" data-id="${k.id}"><i class="fas fa-ban" aria-hidden="true"></i>Hủy món</button>
                    </div>` : ''}
                ${k.status === 'cooking' ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="kitchen-move" data-id="${k.id}" data-to="done"><i class="fas fa-check" aria-hidden="true"></i>Hoàn thành</button>` : ''}
            </article>`;
    }

    function render() {
        const today = U.todayLocal();
        COLUMNS.forEach(col => {
            const items = S.db.kitchenOrders
                // đơn đang chờ / đang làm luôn hiện (kể cả từ hôm qua); đơn xong chỉ hiện của hôm nay
                .filter(k => k.status === col.status && (col.status !== 'done' || (k.date || today) === today))
                // Đơn đang chờ: cũ nhất lên trước; đơn xong: mới nhất lên trước
                .sort((a, b) => (col.status === 'done' ? -1 : 1) * (sortKey(a).localeCompare(sortKey(b)) || a.id - b.id));
            UI.setText(col.count, items.length);
            U.byId(col.list).innerHTML = items.length ? items.map(ticket).join('') : UI.emptyState(col.empty, 'fa-mug-hot');
        });
    }

    /** Hủy phiếu chưa chế biến: bỏ món khỏi hóa đơn + hoàn kho (đã chế biến thì không hủy được) */
    QN.actions['kitchen-cancel'] = async d => {
        const k = S.get('kitchenOrders', d.id);
        if (!k || k.status !== 'new') return;
        const code = k.invoiceId ? U.code('HD', k.invoiceId) : '';
        const ok = await UI.confirm({
            title: `Hủy phiếu bếp của ${S.tableName(k.tableId)}?`,
            message: `${k.items.map(it => `${it.qty} × ${it.name}`).join(', ')} sẽ bị bỏ khỏi ${code || 'đơn'} và nguyên liệu được hoàn lại kho. Chỉ hủy được khi bếp chưa bắt đầu chế biến.`,
            confirmText: 'Hủy món',
            cancelText: 'Không',
            tone: 'danger',
            icon: 'fa-ban'
        });
        if (!ok) return;
        const { invoice, returned } = S.cancelKitchenOrder(k);
        const back = returned.length ? ` Hoàn kho: ${returned.map(x => `${x.ingredient.name} ${U.fmtNumber(x.qty)} ${x.ingredient.unit}`).join(', ')}.` : '';
        UI.toast(invoice && invoice.status === 'cancelled'
            ? `Đã hủy phiếu bếp — ${code} không còn món nên đã chuyển sang “Đã hủy”, ${S.tableName(invoice.tableId)} được trả.${back}`
            : `Đã hủy phiếu bếp — ${code} còn ${invoice ? U.fmtMoney(invoice.finalTotal) : ''}.${back}`, 'success');
        UI.keepFocus(render);
        UI.focusFallback();
        QN.app.changed();
    };

    QN.actions['kitchen-move'] = d => {
        const k = S.get('kitchenOrders', d.id);
        if (!k || NEXT[k.status] !== d.to) return;
        k.status = d.to;
        UI.toast(`${S.tableName(k.tableId)}: ${d.to === 'cooking' ? 'bắt đầu chế biến' : 'đã hoàn thành'}`, 'success');
        render();
        UI.focusFallback();
        QN.app.changed();
    };

    QN.actions['kitchen-refresh'] = () => {
        render();
        UI.toast('Đã làm mới danh sách bếp', 'info');
    };

    QN.pages.kitchen = { render };
})(window.QN);
