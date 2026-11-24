/* =========================================================
   KIỂM TRA DỮ LIỆU NHẬP
   Mỗi quy tắc trả về câu báo lỗi (hoặc null nếu hợp lệ).
   Lỗi hiển thị ngay dưới ô nhập, con trỏ nhảy về ô sai đầu tiên.
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;

    const isBlank = v => String(v == null ? '' : v).trim() === '';

    const rules = {
        required: (message = 'Không được để trống') => v => (isBlank(v) ? message : null),

        maxLength: n => v => (String(v == null ? '' : v).trim().length > n ? `Tối đa ${n} ký tự` : null),

        /** SĐT Việt Nam: bắt đầu bằng 0, 10–11 chữ số (cho phép dấu cách, chấm, gạch) */
        phone: () => v => {
            if (isBlank(v)) return null;
            return /^0\d{9,10}$/.test(String(v).replace(/[\s.-]/g, '')) ? null : 'SĐT gồm 10–11 chữ số, bắt đầu bằng 0';
        },

        integer: ({ min, max } = {}) => v => {
            if (isBlank(v)) return null;
            const n = Number(v);
            if (!Number.isInteger(n)) return 'Phải là số nguyên';
            if (min != null && n < min) return `Tối thiểu là ${U.fmtNumber(min)}`;
            if (max != null && n > max) return `Tối đa là ${U.fmtNumber(max)}`;
            return null;
        },

        /** Số có thể có phần thập phân (kg, lít…): tối đa `decimals` chữ số sau dấu phẩy */
        number: ({ min, max, decimals = 3, above } = {}) => v => {
            if (isBlank(v)) return null;
            const n = Number(v);
            if (!Number.isFinite(n)) return 'Phải là số';
            if (above != null && n <= above) return `Phải lớn hơn ${U.fmtNumber(above)}`;
            if (min != null && n < min) return `Tối thiểu là ${U.fmtNumber(min)}`;
            if (max != null && n > max) return `Tối đa là ${U.fmtNumber(max)}`;
            const scaled = n * Math.pow(10, decimals);
            if (Math.abs(scaled - Math.round(scaled)) > 1e-6) return `Tối đa ${decimals} chữ số sau dấu phẩy`;
            return null;
        },

        pattern: (regex, message) => v => (isBlank(v) || regex.test(String(v)) ? null : message),

        dateFrom: (minIso, message) => v => (isBlank(v) || v >= minIso ? null : message),

        dateTo: (maxIso, message) => v => (isBlank(v) || v <= maxIso ? null : message),

        /**
         * Không trùng với bản ghi khác.
         * itemKey(item) lấy giá trị cần so của từng bản ghi; normalize chuẩn hóa trước khi so
         * (mặc định: bỏ dấu, không phân biệt hoa thường).
         */
        unique: (list, itemKey, exceptItem, message, normalize = U.normalizeText) => v => {
            if (isBlank(v)) return null;
            const key = normalize(v);
            return list.some(item => item !== exceptItem && normalize(itemKey(item)) === key) ? message : null;
        },

        custom: fn => fn
    };

    /**
     * check([[idÔNhập, giáTrị, quyTắc1, quyTắc2, …], …]) → { idÔNhập: 'lỗi', … }
     * Mỗi ô dừng ở lỗi đầu tiên.
     */
    function check(spec) {
        const errors = {};
        spec.forEach(([id, value, ...fieldRules]) => {
            for (const rule of fieldRules) {
                const message = rule(value);
                if (message) {
                    errors[id] = message;
                    break;
                }
            }
        });
        return errors;
    }

    function clear(root) {
        if (!root) return;
        root.querySelectorAll('.field.is-invalid').forEach(f => f.classList.remove('is-invalid'));
        root.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
        root.querySelectorAll('.field__error').forEach(el => { el.textContent = ''; });
    }

    /** Hiện lỗi; trả về true nếu có lỗi */
    function show(root, errors) {
        clear(root);
        const ids = Object.keys(errors);
        ids.forEach(id => {
            const input = U.byId(id);
            if (!input) return;
            const field = input.closest('.field');
            input.setAttribute('aria-invalid', 'true');
            if (!field) return;
            field.classList.add('is-invalid');
            const box = field.querySelector('.field__error');
            if (box) {
                box.id = box.id || id + '-error';
                box.textContent = errors[id];
                const describedBy = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
                if (!describedBy.includes(box.id)) describedBy.push(box.id);
                input.setAttribute('aria-describedby', describedBy.join(' '));
            }
        });
        if (ids.length) {
            const first = U.byId(ids[0]);
            if (first) first.focus();
        }
        return ids.length > 0;
    }

    // Người dùng sửa ô nào thì xóa lỗi của ô đó
    function clearFieldError(e) {
        const field = e.target.closest && e.target.closest('.field.is-invalid');
        if (!field) return;
        field.classList.remove('is-invalid');
        e.target.removeAttribute('aria-invalid');
        const box = field.querySelector('.field__error');
        if (box) box.textContent = '';
    }
    document.addEventListener('input', clearFieldError);
    document.addEventListener('change', clearFieldError);

    QN.validate = { rules, check, show, clear };
})(window.QN);
