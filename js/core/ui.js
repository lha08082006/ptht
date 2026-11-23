/* =========================================================
   GIAO DIỆN DÙNG CHUNG: toast, modal, hộp xác nhận, badge, bảng
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const { html } = U;

    /* ---------- TOAST ---------- */
    const TOAST_ICONS = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    function toast(message, type = 'info') {
        const stack = U.byId('toastStack');
        if (!stack) return;
        while (stack.children.length >= 4) stack.firstElementChild.remove();
        const el = document.createElement('div');
        el.className = 'toast toast--' + type;
        el.innerHTML = html`<i class="fas ${TOAST_ICONS[type] || TOAST_ICONS.info}" aria-hidden="true"></i><span></span>`;
        el.querySelector('span').textContent = message;
        stack.appendChild(el);
        requestAnimationFrame(() => el.classList.add('is-visible'));
        setTimeout(() => {
            el.classList.remove('is-visible');
            setTimeout(() => el.remove(), 250);
        }, type === 'error' || type === 'warning' ? 4500 : 3200);
    }

    /* ---------- MODAL ---------- */
    const openStack = [];
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const FIRST_FIELD = ['input:not([disabled]):not([readonly]):not([type="hidden"])', 'select:not([disabled])', 'textarea:not([disabled])', 'button:not([disabled])']
        .map(sel => '.modal__body ' + sel).join(', ');

    function openModal(id, options = {}) {
        const modal = U.byId(id);
        if (!modal) return null;
        if (options.title) {
            const title = modal.querySelector('[data-modal-title]');
            if (title) title.textContent = options.title;
        }
        if (!modal.classList.contains('is-open')) {
            modal._returnFocus = document.activeElement;
            modal.classList.add('is-open');
            openStack.push(modal);
        }
        modal._onClose = options.onClose || null;
        document.body.classList.add('has-modal');
        // Focus ngay (không chờ khung hình sau) để không giành focus khi người dùng đã bắt đầu gõ
        if (!modal.contains(document.activeElement)) {
            const target = (options.focus && modal.querySelector(options.focus)) ||
                modal.querySelector(FIRST_FIELD) ||
                modal.querySelector('.modal__dialog');
            if (target) target.focus();
        }
        return modal;
    }

    function closeModal(idOrEl) {
        const modal = typeof idOrEl === 'string' ? U.byId(idOrEl) : idOrEl;
        if (!modal || !modal.classList.contains('is-open')) return;
        modal.classList.remove('is-open');
        const index = openStack.indexOf(modal);
        if (index >= 0) openStack.splice(index, 1);
        if (!openStack.length) document.body.classList.remove('has-modal');
        const back = modal._returnFocus;
        if (back && document.contains(back) && typeof back.focus === 'function') back.focus();
        const onClose = modal._onClose;
        modal._onClose = null;
        if (onClose) onClose();
    }

    function closeAllModals() {
        openStack.slice().forEach(closeModal);
    }

    function topModal() {
        return openStack[openStack.length - 1] || null;
    }

    // Đóng bằng nút [data-close] hoặc bấm ra vùng tối bên ngoài
    let pointerDownOnBackdrop = false;
    document.addEventListener('mousedown', e => {
        pointerDownOnBackdrop = e.target.classList && e.target.classList.contains('modal');
    });
    document.addEventListener('click', e => {
        const closer = e.target.closest('[data-close]');
        if (closer) {
            const modal = closer.closest('.modal');
            if (modal) closeModal(modal);
            return;
        }
        if (pointerDownOnBackdrop && e.target.classList && e.target.classList.contains('modal')) closeModal(e.target);
        pointerDownOnBackdrop = false;
    });

    // Esc để đóng, Tab không thoát ra ngoài modal
    document.addEventListener('keydown', e => {
        const modal = topModal();
        if (!modal) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeModal(modal);
            return;
        }
        if (e.key !== 'Tab') return;
        const items = [...modal.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        } else if (!modal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
        }
    });

    /* ---------- HỘP XÁC NHẬN (thay confirm()) ---------- */
    function confirmDialog({ title = 'Xác nhận', message = '', confirmText = 'Đồng ý', cancelText = 'Hủy', tone = 'danger', icon } = {}) {
        return new Promise(resolve => {
            const ok = U.byId('confirmOk');
            const iconBox = U.byId('confirmIcon');
            U.byId('confirmTitle').textContent = title;
            U.byId('confirmMessage').textContent = message;
            U.byId('confirmCancel').textContent = cancelText;
            ok.textContent = confirmText;
            ok.className = 'btn ' + (tone === 'danger' ? 'btn--danger' : 'btn--secondary');
            iconBox.className = 'confirm__icon' + (tone === 'danger' ? '' : ' confirm__icon--info');
            iconBox.innerHTML = html`<i class="fas ${icon || (tone === 'danger' ? 'fa-trash' : 'fa-circle-question')}"></i>`;
            let confirmed = false;
            ok.onclick = () => {
                confirmed = true;
                closeModal('confirmModal');
            };
            openModal('confirmModal', { focus: '#confirmCancel', onClose: () => resolve(confirmed) });
        });
    }

    /* ---------- MẢNH HTML DÙNG CHUNG ---------- */
    function badge(label, tone = 'neutral') {
        return html`<span class="badge badge--${tone}"><span class="badge__dot" aria-hidden="true"></span>${label}</span>`;
    }

    function statusBadge(group, key) {
        const s = QN.store.STATUS[group] && QN.store.STATUS[group][key];
        return s ? badge(s.label, s.tone) : badge(key || '—', 'neutral');
    }

    /** Nút chỉ có icon — luôn kèm aria-label và tooltip */
    function iconButton({ action, icon, label, tone = 'neutral', data = {} }) {
        const attrs = Object.keys(data).map(key => html` data-${key}="${data[key]}"`);
        return html`<button type="button" class="icon-btn icon-btn--${tone}" data-action="${action}"${attrs} aria-label="${label}" title="${label}"><i class="fas ${icon}" aria-hidden="true"></i></button>`;
    }

    function emptyState(text, icon = 'fa-inbox') {
        return html`<div class="empty"><i class="fas ${icon}" aria-hidden="true"></i><p>${text}</p></div>`;
    }

    /** Đổ dòng vào tbody; bảng rỗng thì hiện thông báo thay vì để trắng */
    function renderRows(tbodyOrId, rows, { empty = 'Chưa có dữ liệu', icon = 'fa-inbox' } = {}) {
        const tbody = typeof tbodyOrId === 'string' ? U.byId(tbodyOrId) : tbodyOrId;
        if (!tbody) return;
        if (!rows.length) {
            const cols = tbody.closest('table').querySelectorAll('thead th').length || 1;
            tbody.innerHTML = html`<tr class="table__empty"><td colspan="${cols}"><i class="fas ${icon}" aria-hidden="true"></i>${empty}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows.join('');
    }

    /** Đổ option vào select, giữ lựa chọn cũ nếu còn hợp lệ */
    function fillSelect(selectOrId, options, { placeholder, value } = {}) {
        const select = typeof selectOrId === 'string' ? U.byId(selectOrId) : selectOrId;
        if (!select) return;
        const keep = value !== undefined ? String(value) : select.value;
        const parts = [];
        if (placeholder !== undefined) parts.push(html`<option value="">${placeholder}</option>`);
        options.forEach(o => parts.push(html`<option value="${o.value}"${o.disabled ? U.raw(' disabled') : ''}>${o.label}</option>`));
        select.innerHTML = parts.join('');
        if ([...select.options].some(o => o.value === keep && !o.disabled)) select.value = keep;
    }

    function setText(id, text) {
        const el = U.byId(id);
        if (el) el.textContent = text;
    }

    /**
     * Vẽ lại một vùng mà không làm mất vị trí focus của bàn phím:
     * nếu đang focus vào một nút có data-action/data-id thì focus lại nút tương ứng sau khi vẽ.
     */
    function keepFocus(fn) {
        const active = document.activeElement;
        const action = active && active.dataset ? active.dataset.action : null;
        const id = active && active.dataset ? active.dataset.id : null;
        fn();
        if (!action) return;
        const selector = '[data-action="' + action + '"]' + (id != null ? '[data-id="' + id + '"]' : '');
        const again = document.querySelector(selector);
        if (again && again !== active) again.focus();
    }

    /** Cập nhật nhóm tab lọc: trạng thái chọn + số đếm */
    function syncTabs(group, active, counts = {}) {
        const box = document.querySelector('[data-tabs="' + group + '"]');
        if (!box) return;
        box.querySelectorAll('.tab').forEach(tab => {
            const on = tab.dataset.filter === active;
            tab.classList.toggle('is-active', on);
            tab.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        Object.keys(counts).forEach(key => {
            const el = box.querySelector('[data-count="' + key + '"]');
            if (el) el.textContent = counts[key];
        });
    }

    QN.ui = {
        toast,
        openModal,
        closeModal,
        closeAllModals,
        confirm: confirmDialog,
        badge,
        statusBadge,
        iconButton,
        emptyState,
        renderRows,
        fillSelect,
        setText,
        syncTabs,
        keepFocus
    };
})(window.QN);
