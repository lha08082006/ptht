/* =========================================================
   QUÁN NHẬU TỰ DO — TIỆN ÍCH DÙNG CHUNG
   Toàn bộ ứng dụng dùng một không gian tên duy nhất: window.QN
   (không dùng ES module để vẫn mở được index.html bằng file://)
   ========================================================= */
window.QN = window.QN || {};

(function (QN) {
    'use strict';

    QN.pages = {};    // các trang: QN.pages[tên] = { render(), init() }
    QN.actions = {};  // thao tác bấm nút: data-action="tên"
    QN.forms = {};    // xử lý form riêng: data-form="tên"

    /* ---------- HTML an toàn (chống XSS) ----------
       html`<td>${ten}</td>` tự thoát ký tự đặc biệt của mọi giá trị chèn vào.
       Kết quả của html`` lồng nhau được giữ nguyên, không bị thoát lần hai. */
    class SafeHtml {
        constructor(str) { this.str = str; }
        toString() { return this.str; }
    }

    const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

    function escapeHtml(value) {
        return value == null ? '' : String(value).replace(/[&<>"']/g, ch => ESCAPES[ch]);
    }

    function toHtml(value) {
        if (value == null || value === false || value === true) return '';
        if (value instanceof SafeHtml) return value.str;
        if (Array.isArray(value)) return value.map(toHtml).join('');
        return escapeHtml(value);
    }

    function html(strings, ...values) {
        let out = strings[0];
        for (let i = 0; i < values.length; i++) out += toHtml(values[i]) + strings[i + 1];
        return new SafeHtml(out);
    }

    function raw(str) {
        return new SafeHtml(String(str));
    }

    /* ---------- Số & tiền ---------- */
    const numberFormat = new Intl.NumberFormat('vi-VN');

    function fmtNumber(n) {
        const x = Number(n);
        return Number.isFinite(x) ? numberFormat.format(x) : '0';
    }

    function fmtMoney(n) {
        return fmtNumber(Math.round(Number(n) || 0)) + 'đ';
    }

    /**
     * Tiền dạng ngắn cho nhãn biểu đồ (dấu phẩy thập phân kiểu Việt Nam):
     * 2.400.000.000 → "2,4tỷ" · 1.250.000 → "1,3tr" · 328.000 → "328k" · 25.000 → "25k" · 800 → "800đ"
     */
    function fmtShortMoney(n) {
        const x = Number(n) || 0;
        const abs = Math.abs(x);
        if (abs >= 1e9) return (x / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tỷ';
        if (abs >= 1e6) return (x / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tr';
        if (abs >= 1e3) return Math.round(x / 1e3).toLocaleString('vi-VN') + 'k';
        return fmtNumber(x) + 'đ';
    }

    function fmtPercent(ratio, digits = 0) {
        const x = (Number(ratio) || 0) * 100;
        return x.toLocaleString('vi-VN', { maximumFractionDigits: digits }) + '%';
    }

    /** Tỷ trọng: phần rất nhỏ hiện "<1%" (không phải "0%"), gần trọn hiện ">99%" (không phải "100%") */
    function fmtShare(ratio) {
        const r = Number(ratio) || 0;
        if (r > 0 && r < 0.005) return '<1%';
        if (r < 1 && r >= 0.995) return '>99%';
        return fmtPercent(r);
    }

    /* ---------- Ngày giờ (luôn theo giờ máy, không dùng toISOString) ---------- */
    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function toISODate(d) {
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }

    function todayLocal() {
        return toISODate(new Date());
    }

    function nowTime() {
        const d = new Date();
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    function nowDateTime() {
        return todayLocal() + 'T' + nowTime();
    }

    function parseISODate(iso) {
        const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    }

    function addDays(iso, days) {
        const d = parseISODate(iso);
        d.setDate(d.getDate() + days);
        return toISODate(d);
    }

    function daysBetween(fromIso, toIso) {
        return Math.round((parseISODate(toIso) - parseISODate(fromIso)) / 86400000);
    }

    /** "2026-04-25" → "25/04/2026" */
    function fmtDate(iso) {
        if (!iso) return '—';
        const [y, m, d] = String(iso).slice(0, 10).split('-');
        return y && m && d ? `${d}/${m}/${y}` : String(iso);
    }

    /** "2026-04-25" → "25/04" */
    function fmtDateShort(iso) {
        if (!iso) return '—';
        const [, m, d] = String(iso).slice(0, 10).split('-');
        return `${d}/${m}`;
    }

    /** Hôm nay / Hôm qua / dd/mm/yyyy */
    function fmtRelativeDate(iso) {
        if (!iso) return '—';
        const diff = daysBetween(iso, todayLocal());
        if (diff === 0) return 'Hôm nay';
        if (diff === 1) return 'Hôm qua';
        return fmtDate(iso);
    }

    /** ("2026-04-25", "18:00") hoặc ("2026-04-25T18:00") → "25/04/2026 18:00" */
    function fmtDateTime(dateOrDateTime, time) {
        if (!dateOrDateTime) return '—';
        const s = String(dateOrDateTime);
        const date = s.slice(0, 10);
        const t = time || (s.length > 10 ? s.slice(11, 16) : '');
        return fmtDate(date) + (t ? ' ' + t : '');
    }

    /* ---------- Mã & ID ---------- */
    /** code('HD', 7) → "HD007" */
    function code(prefix, id, len = 3) {
        return prefix + String(id).padStart(len, '0');
    }

    /** ID mới = ID lớn nhất + 1 (không trùng kể cả sau khi xóa) */
    function nextId(list) {
        return list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    }

    /* ---------- Chữ ---------- */
    /** Bỏ dấu tiếng Việt, viết thường: "Nầm Sữa" → "nam sua" */
    function normalizeText(s) {
        return String(s == null ? '' : s)
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .trim();
    }

    /** Tìm kiếm không phân biệt hoa thường và dấu */
    function matches(query, ...fields) {
        const q = normalizeText(query);
        if (!q) return true;
        return fields.some(f => normalizeText(f).includes(q));
    }

    function digitsOnly(s) {
        return String(s == null ? '' : s).replace(/\D/g, '');
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function sum(list, fn) {
        return list.reduce((s, x) => s + (Number(fn(x)) || 0), 0);
    }

    QN.utils = {
        SafeHtml, escapeHtml, html, raw,
        fmtNumber, fmtMoney, fmtShortMoney, fmtPercent, fmtShare,
        pad2, toISODate, todayLocal, nowTime, nowDateTime, parseISODate, addDays, daysBetween,
        fmtDate, fmtDateShort, fmtDateTime, fmtRelativeDate,
        code, nextId, normalizeText, matches, digitsOnly, byId, sum
    };
})(window.QN);
