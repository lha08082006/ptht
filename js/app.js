/* =========================================================
   KHỞI ĐỘNG ỨNG DỤNG: đăng nhập, điều hướng, sidebar, chuông, đồng hồ
   và bộ xử lý sự kiện chung (data-action, data-crud, data-form).
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;

    const CREDENTIALS = { username: 'admin', password: '123456' };
    const REMEMBER_KEY = 'qntd.rememberedUser';
    const SESSION_KEY = 'qntd.session';   // phiên đăng nhập của tab (F5 không bị đăng xuất)
    const PAGE_KEY = 'qntd.page';         // trang đang xem (F5 mở lại đúng trang)
    const mobileQuery = window.matchMedia('(max-width: 991.98px)');
    let currentPage = 'dashboard';

    /* ---------- Bộ nhớ trình duyệt an toàn (có thể bị chặn ở chế độ ẩn danh) ---------- */
    function storageGet(store, key) {
        try { return window[store].getItem(key); } catch (e) { return null; }
    }

    function storageSet(store, key, value) {
        try {
            if (value == null) window[store].removeItem(key);
            else window[store].setItem(key, value);
        } catch (e) { /* bỏ qua */ }
    }

    /* ---------- ĐĂNG NHẬP ---------- */
    function showLoginError(message, focusId) {
        const box = U.byId('loginError');
        UI.setText('loginErrorText', message);
        box.hidden = false;
        box.classList.remove('is-shaking');
        void box.offsetWidth;
        box.classList.add('is-shaking');
        U.byId(focusId).focus();
    }

    function prepareLoginForm() {
        const remembered = storageGet('localStorage', REMEMBER_KEY);
        U.byId('loginUsername').value = remembered || '';
        U.byId('loginPassword').value = '';
        U.byId('rememberMe').checked = !!remembered;
        U.byId('loginError').hidden = true;
        return remembered;
    }

    function enterApp(page) {
        U.byId('loginPage').hidden = true;
        U.byId('appShell').hidden = false;
        navigateTo(page || 'dashboard');
    }

    function setupLogin() {
        U.byId('loginForm').addEventListener('submit', e => {
            e.preventDefault();
            const username = U.byId('loginUsername').value.trim();
            const password = U.byId('loginPassword').value;
            if (!username || !password) {
                showLoginError('Vui lòng nhập tên đăng nhập và mật khẩu.', username ? 'loginPassword' : 'loginUsername');
                return;
            }
            if (username !== CREDENTIALS.username || password !== CREDENTIALS.password) {
                showLoginError('Sai tên đăng nhập hoặc mật khẩu.', 'loginPassword');
                return;
            }
            storageSet('localStorage', REMEMBER_KEY, U.byId('rememberMe').checked ? username : null);
            storageSet('sessionStorage', SESSION_KEY, username);
            U.byId('loginError').hidden = true;
            U.byId('loginPassword').value = '';
            enterApp('dashboard');
            UI.toast(S.restoredFromStorage
                ? 'Đăng nhập thành công. Dữ liệu lần trước đã được khôi phục.'
                : 'Đăng nhập thành công. Xin chào Admin!', 'success');
        });
    }

    QN.actions.logout = () => {
        UI.closeAllModals();
        closeAttention();
        QN.orders.clearCart();
        closeNav();
        S.flush();
        storageSet('sessionStorage', SESSION_KEY, null);
        storageSet('sessionStorage', PAGE_KEY, null);
        U.byId('appShell').hidden = true;
        U.byId('loginPage').hidden = false;
        const remembered = prepareLoginForm();
        U.byId(remembered ? 'loginPassword' : 'loginUsername').focus();
        UI.toast('Đã đăng xuất.', 'info');
    };

    /* ---------- ĐIỀU HƯỚNG ---------- */
    function setGroupCollapsed(group, collapsed) {
        group.classList.toggle('is-collapsed', collapsed);
        const toggle = group.querySelector('.nav-group__toggle');
        if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

    function navigateTo(page) {
        if (!QN.pages[page] || !U.byId('page-' + page)) page = 'dashboard';
        currentPage = page;
        storageSet('sessionStorage', PAGE_KEY, page);

        document.querySelectorAll('.page').forEach(p => p.classList.toggle('is-active', p.id === 'page-' + page));

        let activeLink = null;
        document.querySelectorAll('.nav-link').forEach(link => {
            const on = link.dataset.page === page;
            link.classList.toggle('is-active', on);
            if (on) {
                link.setAttribute('aria-current', 'page');
                activeLink = link;
            } else {
                link.removeAttribute('aria-current');
            }
        });

        // Đường dẫn: nhóm › trang; nhóm chứa trang đang xem luôn được mở
        const group = activeLink ? activeLink.closest('.nav-group') : null;
        const groupLabel = group ? group.querySelector('.nav-group__label').textContent.trim() : '';
        const title = document.querySelector('#page-' + page + ' .page-title').textContent.trim();
        UI.setText('breadcrumbGroup', groupLabel);
        U.byId('breadcrumbGroup').hidden = !groupLabel;
        U.byId('breadcrumbSep').hidden = !groupLabel;
        UI.setText('breadcrumbCurrent', title);
        document.title = title + ' · Quán Nhậu Tự Do';
        if (group) setGroupCollapsed(group, false);

        closeNav();
        closeAttention();
        window.scrollTo(0, 0);
        UI.resetPaging();
        if (S.syncTableHolds()) S.save(); // qua ngày mới / lịch quá hạn → trả bàn
        QN.pages[page].render();
        refreshBell();
    }

    QN.actions.navigate = d => navigateTo(d.page);

    QN.actions['toggle-group'] = (d, el) => {
        const group = el.closest('.nav-group');
        setGroupCollapsed(group, !group.classList.contains('is-collapsed'));
    };

    /* ---------- SIDEBAR: thu gọn (máy tính) / trượt ra (điện thoại) ---------- */
    function closeNav() {
        const app = U.byId('appShell');
        if (!app.classList.contains('is-nav-open')) return;
        app.classList.remove('is-nav-open');
        U.byId('toggleSidebar').setAttribute('aria-expanded', 'false');
    }

    QN.actions['toggle-sidebar'] = () => {
        const app = U.byId('appShell');
        const button = U.byId('toggleSidebar');
        if (mobileQuery.matches) {
            const open = !app.classList.contains('is-nav-open');
            app.classList.toggle('is-nav-open', open);
            button.setAttribute('aria-expanded', String(open));
            if (open) {
                const target = app.querySelector('.nav-link.is-active') || app.querySelector('.nav-link');
                if (target) target.focus();
            }
        } else {
            const collapsed = !app.classList.contains('is-collapsed');
            app.classList.toggle('is-collapsed', collapsed);
            button.setAttribute('aria-expanded', String(!collapsed));
        }
    };

    QN.actions['close-nav'] = closeNav;

    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', closeNav);
    else if (mobileQuery.addListener) mobileQuery.addListener(closeNav);

    /* ---------- CHUÔNG: số việc cần xử lý + bảng liệt kê ---------- */
    function refreshBell() {
        const a = S.attention();
        const count = U.byId('bellCount');
        count.textContent = a.total > 99 ? '99+' : String(a.total);
        count.hidden = a.total === 0;
        const label = a.total
            ? `Việc cần xử lý: ${a.kitchenNew} đơn bếp mới, ${a.reservationsPending} đặt bàn chờ xác nhận, ${a.lowStock} nguyên liệu sắp hết`
            : 'Việc cần xử lý: không có việc gấp';
        const bell = U.byId('bellBtn');
        bell.setAttribute('aria-label', label);
        bell.title = label;
        if (!U.byId('bellPanel').hidden) U.byId('bellList').innerHTML = QN.pages.dashboard.attentionList(S.attentionItems());
    }

    function closeAttention() {
        const panel = U.byId('bellPanel');
        if (panel.hidden) return;
        panel.hidden = true;
        U.byId('bellBtn').setAttribute('aria-expanded', 'false');
    }

    QN.actions['toggle-attention'] = () => {
        const panel = U.byId('bellPanel');
        if (!panel.hidden) {
            closeAttention();
            return;
        }
        U.byId('bellList').innerHTML = QN.pages.dashboard.attentionList(S.attentionItems());
        panel.hidden = false;
        U.byId('bellBtn').setAttribute('aria-expanded', 'true');
        const first = panel.querySelector('button');
        if (first) first.focus();
    };

    // Bấm ra ngoài bảng thì đóng
    document.addEventListener('click', e => {
        if (U.byId('bellPanel').hidden) return;
        if (!e.target.closest('.bell-wrap')) closeAttention();
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || e.defaultPrevented) return;
        if (!U.byId('bellPanel').hidden) {
            closeAttention();
            U.byId('bellBtn').focus();
            return;
        }
        closeNav();
    });

    /** Gọi sau mỗi thay đổi dữ liệu: lưu vào trình duyệt + cập nhật chuông */
    function changed() {
        S.save();
        refreshBell();
    }

    /* ---------- ĐỒNG HỒ & HIỆU ỨNG ĐĂNG NHẬP ---------- */
    function tick() {
        const now = new Date();
        UI.setText('clockTime', now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        UI.setText('clockDate', now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    }

    function createParticles() {
        const box = U.byId('loginParticles');
        if (!box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('span');
            p.className = 'particle';
            p.style.left = (i * 37 % 100) + '%';
            p.style.top = (i * 53 % 100) + '%';
            p.style.animationDelay = (i % 8) * 0.5 + 's';
            p.style.animationDuration = 3 + (i % 4) * 0.8 + 's';
            box.appendChild(p);
        }
    }

    /* ---------- BỘ XỬ LÝ SỰ KIỆN CHUNG ---------- */
    document.addEventListener('click', e => {
        const el = e.target.closest('[data-action]');
        if (!el || el.disabled) return;
        const handler = QN.actions[el.dataset.action];
        if (!handler) return;
        e.preventDefault();
        handler(el.dataset, el, e);
    });

    document.addEventListener('submit', e => {
        const form = e.target;
        if (form.id === 'loginForm') return;
        if (form.dataset.crud) {
            e.preventDefault();
            QN.crud.submit(form.dataset.crud, form);
        } else if (form.dataset.form && QN.forms[form.dataset.form]) {
            e.preventDefault();
            QN.forms[form.dataset.form](form);
        }
    });

    function rerenderFrom(el) {
        const page = QN.pages[el.dataset.rerender];
        if (page) page.render();
    }

    // Ô tìm kiếm: lọc ngay khi gõ. Ô ngày: cập nhật khi chọn xong.
    document.addEventListener('input', e => {
        if (e.target.matches && e.target.matches('input[type="search"][data-rerender]')) rerenderFrom(e.target);
    });
    document.addEventListener('change', e => {
        if (e.target.matches && e.target.matches('[data-rerender]:not([type="search"])')) rerenderFrom(e.target);
    });

    /* ---------- KHỞI ĐỘNG ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        S.init();
        Object.keys(QN.pages).forEach(name => {
            if (typeof QN.pages[name].init === 'function') QN.pages[name].init();
        });
        createParticles();
        tick();
        setInterval(tick, 1000);
        setupLogin();
        // Còn phiên đăng nhập trong tab này (ví dụ vừa bấm F5) → vào thẳng trang đang xem dở
        if (storageGet('sessionStorage', SESSION_KEY)) {
            enterApp(storageGet('sessionStorage', PAGE_KEY));
        } else {
            const remembered = prepareLoginForm();
            U.byId(remembered ? 'loginPassword' : 'loginUsername').focus();
        }
    });

    QN.app = {
        navigateTo,
        refreshBell,
        changed,
        rerender() {
            QN.pages[currentPage].render();
            changed();
        },
        currentPage: () => currentPage
    };
})(window.QN);
