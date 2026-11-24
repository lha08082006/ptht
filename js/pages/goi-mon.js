/* =========================================================
   GỌI MÓN, HÓA ĐƠN & THANH TOÁN
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const V = QN.validate;
    const { html } = U;

    const CATEGORY_ORDER = ['Khai vị', 'Món nướng', 'Món xào', 'Món cá', 'Hải sản', 'Lẩu', 'Đồ uống', 'Tráng miệng'];

    let cart = []; // [{ foodId, name, category, price, qty }]
    let invoiceFilter = 'all';
    let pendingTableId = null; // bàn được chọn sẵn (ví dụ sau khi check-in)

    /* ---------------- BỐI CẢNH ĐƠN: bàn đang có hóa đơn mở? ---------------- */
    function orderContext() {
        const tableId = Number(U.byId('orderTableSelect').value) || 0;
        const open = tableId ? S.openInvoiceOfTable(tableId) : null;
        const voucherId = U.byId('orderVoucherSelect').value;
        const selected = voucherId ? S.get('vouchers', voucherId) : null;
        // Gọi thêm vào hóa đơn đã dùng voucher: món mới hưởng cùng mức giảm
        const percent = open && open.voucher ? Number(open.voucherPercent) || 0 : (selected ? selected.percent : 0);
        return { tableId, open, selected, percent };
    }

    function cartTotals() {
        const ctx = orderContext();
        const subtotal = U.sum(cart, c => c.price * c.qty);
        const discount = Math.round(subtotal * ctx.percent / 100);
        const label = ctx.open && ctx.open.voucher ? ctx.open.voucher : (ctx.selected ? ctx.selected.id : '');
        return { subtotal, discount, total: subtotal - discount, label };
    }

    function syncOrderContext() {
        const ctx = orderContext();
        const hint = U.byId('orderTableHint');
        const voucherSelect = U.byId('orderVoucherSelect');
        const voucherHint = U.byId('orderVoucherHint');
        const submitLabel = U.byId('orderSubmitLabel');
        if (ctx.open) {
            hint.textContent = `Bàn đang có ${U.code('HD', ctx.open.id)} (${U.fmtMoney(ctx.open.finalTotal)}, chưa thanh toán) — món mới sẽ được gọi thêm vào hóa đơn này.`;
            submitLabel.textContent = 'Gọi thêm vào ' + U.code('HD', ctx.open.id);
        } else {
            const hold = ctx.tableId ? S.holdsOfTable(ctx.tableId).find(r => r.date === U.todayLocal()) : null;
            hint.textContent = hold ? `Bàn đang giữ cho ${U.code('RES', hold.id)} (${hold.name}, ${hold.time}).` : '';
            submitLabel.textContent = 'Gửi đơn & tạo hóa đơn';
        }
        const locked = !!(ctx.open && ctx.open.voucher);
        voucherSelect.disabled = locked;
        if (locked) voucherSelect.value = '';
        voucherHint.textContent = locked ? `Hóa đơn đã áp dụng voucher ${ctx.open.voucher} (giảm ${ctx.open.voucherPercent}%), món gọi thêm cũng được giảm.` : '';
        renderCart();
    }

    /* ---------------- GỌI MÓN ---------------- */
    function qtyInCart(foodId) {
        const line = cart.find(c => c.foodId === foodId);
        return line ? line.qty : 0;
    }

    function menuCard(f) {
        const qty = qtyInCart(f.id);
        return html`
            <button type="button" class="menu-card${qty ? ' is-in-cart' : ''}" data-action="cart-add" data-id="${f.id}"
                aria-label="Thêm ${f.name}, ${U.fmtMoney(f.price)}${qty ? ', đã chọn ' + qty : ''}">
                <span class="menu-card__name">${f.name}</span>
                <span class="menu-card__price">${U.fmtMoney(f.price)}</span>
                <span class="menu-card__badge" aria-hidden="true">${qty ? '×' + qty : html`<i class="fas fa-plus"></i>`}</span>
            </button>`;
    }

    function renderMenu() {
        const foods = S.db.foods.filter(f => f.status === 'available');
        const categories = [...new Set(foods.map(f => f.category))]
            .sort((a, b) => {
                const ia = CATEGORY_ORDER.indexOf(a);
                const ib = CATEGORY_ORDER.indexOf(b);
                return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
            });
        UI.setText('menuMeta', `${foods.length} món đang phục vụ`);
        U.byId('menuGrid').innerHTML = categories.length
            ? categories.map(cat => {
                const list = foods.filter(f => f.category === cat);
                return html`
                    <section class="menu-section" aria-label="${cat}">
                        <h3 class="menu-section__title">${cat} <span class="menu-section__count">· ${list.length}</span></h3>
                        <div class="menu-grid">${list.map(menuCard)}</div>
                    </section>`;
            }).join('')
            : UI.emptyState('Chưa có món nào đang phục vụ', 'fa-utensils');
    }

    function renderCart() {
        const box = U.byId('cartItems');
        box.innerHTML = cart.length
            ? cart.map(c => html`
                <div class="cart-item">
                    <div>
                        <p class="cart-item__name">${c.name}</p>
                        <p class="cart-item__meta">${U.fmtMoney(c.price)} × ${c.qty}</p>
                    </div>
                    <p class="cart-item__total">${U.fmtMoney(c.price * c.qty)}</p>
                    <div class="cart-item__controls">
                        <div class="qty" role="group" aria-label="Số lượng ${c.name}">
                            <button type="button" class="qty__btn" data-action="cart-dec" data-id="${c.foodId}" aria-label="Bớt 1 ${c.name}"><i class="fas fa-minus" aria-hidden="true"></i></button>
                            <span class="qty__value">${c.qty}</span>
                            <button type="button" class="qty__btn" data-action="cart-inc" data-id="${c.foodId}" aria-label="Thêm 1 ${c.name}"><i class="fas fa-plus" aria-hidden="true"></i></button>
                        </div>
                        ${UI.iconButton({ action: 'cart-remove', icon: 'fa-trash', label: 'Bỏ ' + c.name, tone: 'danger', data: { id: c.foodId } })}
                    </div>
                </div>`).join('')
            : UI.emptyState('Chưa có món nào. Bấm vào món bên trái để thêm.', 'fa-cart-shopping');

        const t = cartTotals();
        const count = U.sum(cart, c => c.qty);
        UI.setText('cartCount', count + ' món');
        UI.setText('cartSubtotal', U.fmtMoney(t.subtotal));
        UI.setText('cartDiscount', t.discount ? `−${U.fmtMoney(t.discount)} (${t.label})` : U.fmtMoney(0));
        UI.setText('cartTotal', U.fmtMoney(t.total));

        // Thanh giỏ hàng cố định ở đáy màn hình hẹp (khi giỏ nằm dưới thực đơn)
        UI.setText('cartBarCount', count + ' món');
        UI.setText('cartBarTotal', U.fmtMoney(t.total));
        U.byId('cartBar').classList.toggle('is-empty', !cart.length);
    }

    function refreshOrderView() {
        UI.keepFocus(() => {
            renderMenu();
            renderCart();
        });
    }

    function bumpCartCount() {
        ['cartCount', 'cartBarCount'].forEach(id => {
            const el = U.byId(id);
            el.classList.remove('is-bumped');
            void el.offsetWidth; // khởi động lại hiệu ứng
            el.classList.add('is-bumped');
        });
    }

    function renderOrders() {
        const db = S.db;
        UI.fillSelect('orderTableSelect', db.tables.map(t => {
            const open = S.openInvoiceOfTable(t.id);
            return { value: t.id, label: `${t.name} — ${S.STATUS.table[t.status].label}${open ? ' ' + U.code('HD', open.id) : ''} · ${t.seats} chỗ · ${t.zone}` };
        }), { placeholder: '— Chọn bàn —' });
        if (pendingTableId) {
            U.byId('orderTableSelect').value = String(pendingTableId);
            pendingTableId = null;
        }
        UI.fillSelect('orderCustSelect', [{ value: 0, label: 'Khách lẻ' }]
            .concat(db.customers.map(c => ({ value: c.id, label: `${c.name} · ${c.phone}` }))));
        UI.fillSelect('orderEmpSelect', db.employees
            .filter(e => e.role === 'Phục vụ' || e.role === 'Quản lý')
            .map(e => ({ value: e.id, label: `${e.name} · ${e.role}` })), { placeholder: '— Chọn nhân viên —' });
        UI.fillSelect('orderVoucherSelect', db.vouchers
            .filter(v => v.qty > 0)
            .map(v => ({ value: v.id, label: `${v.id} — giảm ${v.percent}% (còn ${v.qty})` })), { placeholder: 'Không dùng voucher' });
        renderMenu();
        syncOrderContext();
    }

    function changeQty(foodId, delta) {
        const line = cart.find(c => c.foodId === foodId);
        if (!line) return;
        line.qty += delta;
        if (line.qty <= 0) cart = cart.filter(c => c !== line);
        refreshOrderView();
    }

    QN.actions['cart-add'] = d => {
        const food = S.get('foods', d.id);
        if (!food || food.status !== 'available') return;
        const line = cart.find(c => c.foodId === food.id);
        if (line) line.qty += 1;
        else cart.push({ foodId: food.id, name: food.name, category: food.category, price: food.price, qty: 1 });
        refreshOrderView();
        bumpCartCount();
    };
    QN.actions['cart-inc'] = d => changeQty(Number(d.id), 1);
    QN.actions['cart-dec'] = d => changeQty(Number(d.id), -1);
    QN.actions['cart-remove'] = d => {
        cart = cart.filter(c => c.foodId !== Number(d.id));
        refreshOrderView();
    };
    QN.actions['scroll-to-cart'] = () => {
        const cartEl = U.byId('cartTitle');
        cartEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const first = document.querySelector('#cartItems button') || U.byId('orderSubmitBtn');
        if (first) first.focus({ preventScroll: true });
    };

    function lineItems() {
        return cart.map(c => ({ foodId: c.foodId, name: c.name, category: c.category, price: c.price, qty: c.qty }));
    }

    QN.actions['order-submit'] = async () => {
        if (!cart.length) {
            UI.toast('Chưa chọn món nào.', 'warning');
            return;
        }
        const ctx = orderContext();
        const custId = Number(U.byId('orderCustSelect').value) || 0;
        const empId = Number(U.byId('orderEmpSelect').value) || 0;
        const voucher = ctx.selected;
        const errors = V.check([
            ['orderTableSelect', ctx.tableId, v => (v ? null : 'Vui lòng chọn bàn')],
            ['orderEmpSelect', empId, v => (v ? null : 'Vui lòng chọn nhân viên phục vụ')],
            ['orderVoucherSelect', voucher, v => (v && v.qty <= 0 ? 'Voucher đã hết lượt' : null)]
        ]);
        if (V.show(U.byId('orderSelectors'), errors)) {
            UI.toast('Vui lòng kiểm tra lại thông tin đơn.', 'warning');
            return;
        }

        const table = S.get('tables', ctx.tableId);
        const today = U.todayLocal();
        const time = U.nowTime();

        // Bàn đang giữ cho một đặt bàn hôm nay: hỏi có phải khách của đặt bàn đó không
        if (!ctx.open) {
            const hold = S.holdsOfTable(ctx.tableId).find(r => r.date === today);
            if (hold) {
                const answer = await UI.confirm({
                    title: `${table.name} đang giữ cho ${U.code('RES', hold.id)}`,
                    message: `${hold.name} · ${hold.time} · ${hold.guests} người. Đây có phải khách của đặt bàn này không?`,
                    confirmText: 'Đúng, khách đã đến',
                    cancelText: 'Không, khách khác',
                    tone: 'info',
                    icon: 'fa-user-check',
                    dismissValue: null
                });
                if (answer === null) return; // đóng hộp → không gửi đơn
                if (answer) await QN.reservations.checkIn(hold, { offerOrder: false });
            }
        }

        const items = lineItems();
        let invoice = ctx.open;
        if (invoice) {
            // Gọi thêm món vào hóa đơn đang mở
            items.forEach(it => {
                const line = invoice.items.find(x => Number(x.foodId) === it.foodId && x.price === it.price);
                if (line) line.qty += it.qty;
                else invoice.items.push(it);
            });
            if (!invoice.voucher && voucher) {
                invoice.voucher = voucher.id;
                invoice.voucherPercent = voucher.percent;
                voucher.qty -= 1;
            }
            if (!Number(invoice.custId) && custId) invoice.custId = custId;
            invoice.total = U.sum(invoice.items, x => x.price * x.qty);
            invoice.discount = Math.round(invoice.total * (Number(invoice.voucherPercent) || 0) / 100);
            invoice.finalTotal = invoice.total - invoice.discount;
        } else {
            const subtotal = U.sum(items, x => x.price * x.qty);
            const discount = voucher ? Math.round(subtotal * voucher.percent / 100) : 0;
            invoice = {
                id: S.nextId('invoices'), date: today, time, tableId: ctx.tableId, custId, empId, items,
                total: subtotal, voucher: voucher ? voucher.id : '', voucherPercent: voucher ? voucher.percent : 0,
                discount, finalTotal: subtotal - discount,
                status: 'pending', payMethod: '', txId: '', paidAt: ''
            };
            S.db.invoices.push(invoice);
            if (voucher) voucher.qty -= 1;
        }

        const added = U.sum(items, x => x.qty);
        S.db.kitchenOrders.push({
            id: S.nextId('kitchenOrders'), invoiceId: invoice.id, tableId: ctx.tableId, status: 'new',
            date: today, time, extra: !!ctx.open,
            items: items.map(it => ({ foodId: it.foodId, name: it.name, qty: it.qty }))
        });
        if (table) table.status = 'occupied';

        cart = [];
        U.byId('orderTableSelect').value = '';
        U.byId('orderCustSelect').value = '0';
        U.byId('orderVoucherSelect').value = '';
        UI.toast(ctx.open
            ? `Đã gọi thêm ${added} món vào ${U.code('HD', invoice.id)} (${table ? table.name : ''})`
            : `Đã gửi đơn xuống bếp và tạo hóa đơn ${U.code('HD', invoice.id)}`, 'success');
        renderOrders();
        QN.app.changed();
    };

    /* ---------------- HÓA ĐƠN ---------------- */
    function renderInvoices() {
        const all = S.db.invoices.slice().sort(S.byNewest);
        const paid = all.filter(i => i.status === 'paid');
        const pending = all.filter(i => i.status === 'pending');
        const today = U.todayLocal();

        UI.setText('invRevenue', U.fmtMoney(U.sum(paid, i => i.finalTotal)));
        UI.setText('invRevenueSub', `${paid.length} hóa đơn đã thanh toán`);
        UI.setText('invPending', U.fmtMoney(U.sum(pending, i => i.finalTotal)));
        UI.setText('invPendingSub', `${pending.length} hóa đơn đang chờ`);
        UI.setText('invCount', U.fmtNumber(all.length));
        UI.setText('invCountSub', `Hôm nay: ${all.filter(i => i.date === today).length} hóa đơn`);
        UI.syncTabs('invoices', invoiceFilter, { all: all.length, paid: paid.length, pending: pending.length });

        const query = U.byId('searchInvoice').value.trim();
        const list = (invoiceFilter === 'paid' ? paid : invoiceFilter === 'pending' ? pending : all)
            .filter(inv => U.matches(query, U.code('HD', inv.id), S.customerName(inv.custId), S.tableName(inv.tableId), S.employeeName(inv.empId), inv.voucher, inv.payMethod));
        UI.renderRows('invoiceTableBody', list.map(inv => {
            const code = U.code('HD', inv.id);
            return html`
                <tr>
                    <td class="t-code">${code}</td>
                    <td class="nowrap">${U.fmtRelativeDate(inv.date)} <span class="text-muted">${inv.time}</span></td>
                    <td class="nowrap">${S.tableName(inv.tableId)}</td>
                    <td>${S.customerName(inv.custId)}</td>
                    <td>${S.employeeName(inv.empId)}</td>
                    <td class="num">${inv.items.length}</td>
                    <td class="num t-strong">${U.fmtMoney(inv.finalTotal)}</td>
                    <td class="nowrap">${inv.voucher || html`<span class="text-muted">—</span>`}</td>
                    <td>${UI.statusBadge('invoice', inv.status)}</td>
                    <td class="num"><div class="cell-actions">
                        ${UI.iconButton({ action: 'invoice-view', icon: 'fa-eye', label: 'Xem ' + code, tone: 'info', data: { id: inv.id } })}
                        ${inv.status === 'pending' ? UI.iconButton({ action: 'invoice-pay', icon: 'fa-credit-card', label: 'Thanh toán ' + code, tone: 'success', data: { id: inv.id } }) : ''}
                    </div></td>
                </tr>`;
        }), query
            ? { empty: `Không tìm thấy hóa đơn cho “${query}”`, icon: 'fa-magnifying-glass' }
            : { empty: invoiceFilter === 'all' ? 'Chưa có hóa đơn nào' : 'Không có hóa đơn ở trạng thái này' });
    }

    QN.actions['invoice-filter'] = d => {
        invoiceFilter = d.filter;
        renderInvoices();
    };

    QN.actions['invoice-view'] = d => {
        const inv = S.get('invoices', d.id);
        if (!inv) return;
        const status = S.STATUS.invoice[inv.status];
        const paid = inv.status === 'paid';
        U.byId('invoiceDetailContent').innerHTML = html`
            <article class="invoice-sheet">
                <header class="invoice-sheet__head">
                    <p class="invoice-sheet__brand">Quán Nhậu Tự Do</p>
                    <p class="invoice-sheet__addr">505 Minh Khai, Hai Bà Trưng, Hà Nội · Hotline *1986</p>
                    <p class="invoice-sheet__code">Hóa đơn ${U.code('HD', inv.id)}</p>
                </header>
                <dl class="invoice-sheet__meta">
                    <div><dt>Thời gian</dt><dd>${U.fmtDateTime(inv.date, inv.time)}</dd></div>
                    <div><dt>Bàn</dt><dd>${S.tableName(inv.tableId)}</dd></div>
                    <div><dt>Khách hàng</dt><dd>${S.customerName(inv.custId)}</dd></div>
                    <div><dt>Nhân viên</dt><dd>${S.employeeName(inv.empId)}</dd></div>
                </dl>
                <div class="table-wrap">
                    <table class="table table--fluid table--compact">
                        <thead><tr><th>Món</th><th class="num">SL</th><th class="num">Đơn giá</th><th class="num">Thành tiền</th></tr></thead>
                        <tbody>${inv.items.map(it => html`
                            <tr><td>${it.name}</td><td class="num">${it.qty}</td><td class="num">${U.fmtMoney(it.price)}</td><td class="num">${U.fmtMoney(it.price * it.qty)}</td></tr>`)}
                        </tbody>
                    </table>
                </div>
                <div class="invoice-sheet__totals">
                    <div class="invoice-sheet__row"><span>Tiền món</span><span>${U.fmtMoney(inv.total)}</span></div>
                    ${inv.discount > 0 ? html`<div class="invoice-sheet__row invoice-sheet__row--discount"><span>Voucher ${inv.voucher}${inv.voucherPercent ? ' (' + inv.voucherPercent + '%)' : ''}</span><span>−${U.fmtMoney(inv.discount)}</span></div>` : ''}
                    <div class="invoice-sheet__row invoice-sheet__grand"><span>Tổng thanh toán</span><span>${U.fmtMoney(inv.finalTotal)}</span></div>
                </div>
                <div class="invoice-sheet__pay">
                    ${UI.badge(status.long, status.tone)}
                    ${paid
                        ? html`<span>Phương thức: <strong>${inv.payMethod}</strong></span>
                               ${inv.txId ? html`<span>Mã GD: <strong>${inv.txId}</strong></span>` : ''}
                               ${inv.paidAt ? html`<span>Lúc: <strong>${U.fmtDateTime(inv.paidAt)}</strong></span>` : ''}`
                        : html`<span>Hóa đơn chưa được thanh toán.</span>`}
                </div>
                <p class="invoice-sheet__thanks">Cảm ơn quý khách và hẹn gặp lại!</p>
            </article>`;
        UI.openModal('invoiceDetailModal', { title: 'Chi tiết hóa đơn ' + U.code('HD', inv.id) });
    };

    /** In hóa đơn: chỉ in tờ hóa đơn trong hộp thoại (xem @media print trong pages.css) */
    QN.actions['invoice-print'] = () => {
        const body = document.body;
        const cleanup = () => body.classList.remove('print-invoice');
        body.classList.add('print-invoice');
        window.addEventListener('afterprint', cleanup, { once: true });
        window.print();
    };

    /* ---------------- THANH TOÁN ---------------- */
    QN.actions['invoice-pay'] = d => {
        const inv = S.get('invoices', d.id);
        if (!inv || inv.status !== 'pending') return;
        U.byId('paymentContent').innerHTML = html`
            <div class="pay-summary">
                <p class="pay-summary__label">${U.code('HD', inv.id)} · ${S.tableName(inv.tableId)} · ${S.customerName(inv.custId)}</p>
                <p class="pay-summary__amount">${U.fmtMoney(inv.finalTotal)}</p>
            </div>
            <p class="pay-label">Chọn phương thức thanh toán</p>
            <div class="pay-methods">
                ${S.PAY_METHODS.map(m => html`
                    <button type="button" class="pay-method" data-action="pay-confirm" data-id="${inv.id}" data-method="${m.id}">
                        <i class="fas ${m.icon}" aria-hidden="true"></i>${m.id}
                    </button>`)}
            </div>`;
        UI.openModal('paymentModal', { title: 'Thanh toán ' + U.code('HD', inv.id) });
    };

    QN.actions['pay-confirm'] = d => {
        const inv = S.get('invoices', d.id);
        if (!inv || inv.status !== 'pending') return;
        inv.status = 'paid';
        inv.payMethod = d.method;
        inv.txId = 'TXN' + Date.now().toString(36).toUpperCase();
        inv.paidAt = U.nowDateTime();
        // Bàn hết hóa đơn chờ: còn đặt bàn giữ chỗ thì về "Đã đặt", không thì "Trống"
        const table = S.get('tables', inv.tableId);
        if (table && table.status === 'occupied') S.freeTable(table);
        UI.closeModal('paymentModal');
        UI.toast(`Thanh toán thành công ${U.code('HD', inv.id)} qua ${d.method} · Mã GD: ${inv.txId}`, 'success');
        UI.keepFocus(() => QN.app.rerender());
    };

    /* Đồng bộ giỏ hàng khi món bị sửa / xóa ở trang Món ăn */
    QN.orders = {
        syncFood(food) {
            const line = cart.find(c => c.foodId === food.id);
            if (!line) return;
            if (food.status !== 'available') {
                cart = cart.filter(c => c !== line);
                return;
            }
            line.name = food.name;
            line.category = food.category;
            line.price = food.price;
        },
        removeFood(foodId) {
            cart = cart.filter(c => c.foodId !== foodId);
        },
        clearCart() {
            cart = [];
        },
        preselectTable(tableId) {
            pendingTableId = tableId;
        }
    };

    QN.pages.orders = {
        render: renderOrders,
        init() {
            U.byId('orderVoucherSelect').addEventListener('change', renderCart);
            U.byId('orderTableSelect').addEventListener('change', syncOrderContext);
            // Ẩn thanh giỏ hàng khi chính giỏ hàng đang hiện trên màn hình
            if ('IntersectionObserver' in window) {
                const bar = U.byId('cartBar');
                new IntersectionObserver(entries => {
                    entries.forEach(e => bar.classList.toggle('is-cart-visible', e.isIntersecting));
                }, { threshold: 0.15 }).observe(document.querySelector('#page-orders .cart'));
            }
        }
    };
    QN.pages.invoices = { render: renderInvoices };
})(window.QN);
