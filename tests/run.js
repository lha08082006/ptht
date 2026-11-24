'use strict';
/* =========================================================
   Chạy toàn bộ kiểm thử:  npm test   (trong thư mục tests)
   Chạy một vài bộ:        node run.js chuc-nang loi-review
   ========================================================= */
const { chromium } = require('playwright');
const { runSuite } = require('./lib');

const SUITES = [
    ['hoi-quy', 'Hồi quy (toàn bộ chức năng)'],
    ['loi-review', '9 lỗi đã sửa'],
    ['chuc-nang', 'Chức năng mới'],
    ['dinh-muc', 'Định mức món ăn & trừ kho'],
    ['bom', 'Phân hệ định mức BOM'],
    ['du-lieu-lon', 'Dữ liệu lớn (90 ngày)'],
    ['quy-trinh', 'Một vòng quy trình đầy đủ'],
    ['ra-soat', 'Rà soát logic & giao diện'],
    ['gio-that', 'Giờ thật & dữ liệu để qua ngày']
];

(async () => {
    const only = process.argv.slice(2);
    const chosen = only.length ? SUITES.filter(([file]) => only.includes(file)) : SUITES;
    if (!chosen.length) {
        console.error('Không có bộ kiểm thử nào tên: ' + only.join(', ') + '. Có: ' + SUITES.map(s => s[0]).join(', '));
        process.exit(2);
    }
    const browser = await chromium.launch();
    const summary = [];
    for (const [file, title] of chosen) summary.push(await runSuite(browser, require('./' + file), title));
    await browser.close();

    console.log('\n== TỔNG KẾT ==');
    summary.forEach(s => console.log(`${s.failed ? 'FAIL' : 'PASS'} ${s.title}: ${s.total - s.failed}/${s.total}`));
    const total = summary.reduce((n, s) => n + s.total, 0);
    const failed = summary.reduce((n, s) => n + s.failed, 0);
    console.log(`\n${total - failed}/${total} PASS`);
    process.exit(failed ? 1 : 0);
})().catch(err => { console.error(err); process.exit(2); });
