'use strict';
/* =========================================================
   Hàm dùng chung cho các bộ kiểm thử (Playwright).
   Web được mở thẳng bằng file:// giống cách người dùng mở index.html,
   không cần máy chủ.
   ========================================================= */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// Mặc định mở file index.html trong repo; đặt APP_URL để kiểm thử trang đã deploy
// (ví dụ APP_URL=https://ptht-gold.vercel.app/ npm test)
const APP_URL = process.env.APP_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const APP_ORIGIN = APP_URL.startsWith('file:') ? 'file:' : new URL(APP_URL).origin;
/** Tài nguyên "ngoài" = khác nguồn với web (file:// thì mọi thứ không phải file:/data:) */
const isExternal = url => !url.startsWith('data:') && (APP_ORIGIN === 'file:' ? !url.startsWith('file:') : !url.startsWith(APP_ORIGIN));

// Mọi trang kiểm thử chạy ở cùng một giờ cố định (19:00 ngày 24/11/2026, giờ Việt Nam)
// để kết quả không phụ thuộc vào lúc chạy. Truyền { now: null } để dùng giờ thật của máy.
const DEFAULT_NOW = '2026-11-24T19:00:00+07:00';

// Đặt biến môi trường SHOTS_DIR=thu-muc để lưu ảnh chụp màn hình khi chạy kiểm thử
const SHOTS_DIR = process.env.SHOTS_DIR ? path.resolve(process.env.SHOTS_DIR) : '';

/** Bộ ghi kết quả: check(tên, đúng/sai, chi tiết khi sai) */
function reporter() {
    const results = [];
    function check(name, ok, detail) {
        results.push({ name, ok: !!ok });
        console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  → ' + JSON.stringify(detail)));
    }
    return { check, results };
}

const contexts = [];

/** Mở một tab mới (ngữ cảnh riêng: localStorage/sessionStorage trống) và ghi lại lỗi console */
async function newPage(browser, opts = {}) {
    const { now = DEFAULT_NOW, ...ctxOpts } = opts;
    const ctx = await browser.newContext(Object.assign({
        viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
        timezoneId: 'Asia/Ho_Chi_Minh', locale: 'vi-VN'
    }, ctxOpts));
    contexts.push(ctx);
    const page = await ctx.newPage();
    if (now) await page.clock.setFixedTime(new Date(now));
    page._errors = [];
    page._external = [];
    page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
    page.on('pageerror', e => page._errors.push('PAGEERROR ' + e.message));
    page.on('request', r => { if (isExternal(r.url())) page._external.push(r.url()); });
    page.on('requestfailed', r => page._errors.push('FAILED ' + r.url()));
    return page;
}

async function login(page) {
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', '123456');
    await page.click('#loginForm button[type="submit"]');
    await page.waitForTimeout(150);
}

/** Mở web + đăng nhập sẵn */
async function openApp(browser, opts) {
    const page = await newPage(browser, opts);
    await page.goto(APP_URL, { waitUntil: 'load' });
    await login(page);
    return page;
}

const state = (page, fn, arg) => page.evaluate(fn, arg);
const go = (page, name) => page.evaluate(n => QN.app.navigateTo(n), name);
const isOpen = (page, id) => page.evaluate(i => document.getElementById(i).classList.contains('is-open'), id);
const fieldError = (page, id) => page.evaluate(i => {
    const f = document.getElementById(i).closest('.field');
    const e = f && f.querySelector('.field__error');
    return e ? e.textContent : '';
}, id);
const fieldDbg = (page, id) => page.evaluate(i => {
    const el = document.getElementById(i);
    const f = el.closest('.field');
    return {
        id: i, val: el.value,
        err: f && f.querySelector('.field__error') ? f.querySelector('.field__error').textContent : null,
        invalid: f && f.classList.contains('is-invalid'),
        active: document.activeElement && (document.activeElement.id || document.activeElement.tagName),
        openModals: [...document.querySelectorAll('.modal.is-open')].map(m => m.id),
        toasts: [...document.querySelectorAll('.toast')].map(t => t.textContent.trim())
    };
}, id);
const lastToast = page => page.evaluate(() => {
    const t = [...document.querySelectorAll('.toast')];
    return t.length ? t[t.length - 1].textContent.trim() : '';
});
async function submit(page, modalId) {
    await page.click(`#${modalId} button[type="submit"]`);
    await page.waitForTimeout(80);
}
/** Số dòng dữ liệu đang hiện trong bảng (bỏ dòng "không có dữ liệu") */
const rowCount = (page, tbodyId) => page.evaluate(id => [...document.querySelectorAll(`#${id} tr`)].filter(tr => !tr.classList.contains('table__empty') && !tr.classList.contains('table__more')).length, tbodyId);

/** Chụp màn hình khi có SHOTS_DIR (không thì bỏ qua) */
async function shot(target, name, opts = {}) {
    if (!SHOTS_DIR) return;
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    await target.screenshot(Object.assign({ path: path.join(SHOTS_DIR, name + '.png') }, opts));
}

/** Đóng mọi tab đã mở (gọi sau mỗi bộ kiểm thử) */
async function closeContexts() {
    await Promise.all(contexts.splice(0).map(ctx => ctx.close().catch(() => {})));
}

/** Chạy một bộ kiểm thử, trả về { total, failed } */
async function runSuite(browser, suite, title) {
    const { check, results } = reporter();
    console.log(`\n== ${title} ==`);
    try {
        await suite(browser, check);
    } catch (err) {
        check('Bộ kiểm thử chạy hết, không bị dừng giữa chừng', false, String(err && err.stack || err));
    }
    await closeContexts();
    const failed = results.filter(r => !r.ok).length;
    console.log(`-- ${results.length - failed}/${results.length} PASS`);
    return { title, total: results.length, failed };
}

/** Cho phép chạy riêng từng bộ: node tests/ten-bo.js */
function runStandalone(suite, title) {
    const { chromium } = require('playwright');
    (async () => {
        const browser = await chromium.launch();
        const { failed } = await runSuite(browser, suite, title);
        await browser.close();
        process.exit(failed ? 1 : 0);
    })().catch(err => { console.error(err); process.exit(2); });
}

module.exports = {
    APP_URL, DEFAULT_NOW, SHOTS_DIR,
    reporter, newPage, login, openApp, state, go, isOpen, fieldError, fieldDbg, lastToast, submit, rowCount, shot,
    closeContexts, runSuite, runStandalone
};
