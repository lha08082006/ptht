/* =========================================================
   BIỂU ĐỒ (HTML/CSS thuần, không cần thư viện)
   - columns(): cột dọc một chuỗi (doanh thu theo ngày)
   - bars():    thanh ngang xếp hạng (top món, tiêu thụ, tồn kho)
   - segments(): một tổng chia thành phần (tỷ lệ thanh toán, phương thức)
   Màu lấy từ biến CSS (--series-*, --status-*), không ghi cứng mã màu.
   Mọi giá trị đều đọc được không cần rê chuột (nhãn / chú thích / bảng ẩn
   cho trình đọc màn hình); tooltip chỉ để xem nhanh.
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const { html } = U;

    const COLORS = {
        series: ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'],
        good: 'var(--status-good)',
        warning: 'var(--status-warning)',
        serious: 'var(--status-serious)',
        critical: 'var(--status-critical)',
        other: 'var(--chart-other)'
    };

    function empty(el, text) {
        el.innerHTML = QN.ui.emptyState(text || 'Chưa có dữ liệu trong khoảng thời gian này', 'fa-chart-simple');
    }

    /** Bảng ẩn tương đương biểu đồ, dành cho trình đọc màn hình */
    function srTable(caption, headers, rows) {
        return html`<table class="sr-only"><caption>${caption}</caption><thead><tr>${headers.map(h => html`<th scope="col">${h}</th>`)}</tr></thead><tbody>${rows.map(r => html`<tr>${r.map(c => html`<td>${c}</td>`)}</tr>`)}</tbody></table>`;
    }

    /**
     * Cột dọc một chuỗi.
     * data: [{ label, value, valueText, short }]
     */
    function columns(el, { data, title, color = COLORS.series[0], emptyText }) {
        if (!el) return;
        if (!data.length || data.every(d => !d.value)) return empty(el, emptyText);
        const max = Math.max(...data.map(d => d.value), 1);
        const dense = data.length > 12;
        el.innerHTML = html`
            <figure class="colchart${dense ? ' colchart--dense' : ''}" role="img" aria-label="${title}">
                <div class="colchart__plot">
                    ${data.map(d => html`
                        <div class="colchart__col" tabindex="0" data-tip="${d.tip || d.label}" data-tip-value="${d.valueText}">
                            <span class="colchart__value">${d.value ? d.short : ''}</span>
                            <span class="colchart__bar" style="--hf:${(d.value / max).toFixed(4)};--c:${color}"></span>
                        </div>`)}
                </div>
                <div class="colchart__axis" aria-hidden="true">
                    ${data.map(d => html`<span class="colchart__label">${d.label}</span>`)}
                </div>
            </figure>
            ${srTable(title, ['Mục', 'Giá trị'], data.map(d => [d.label, d.valueText]))}`;
    }

    /**
     * Thanh ngang xếp hạng (một màu, lớn nhất lên đầu do bên gọi sắp xếp).
     * data: [{ label, value, valueText, note, color, rank, tip }]
     */
    function bars(el, { data, title, color = COLORS.series[0], emptyText, legend }) {
        if (!el) return;
        if (!data.length || data.every(d => !d.value)) return empty(el, emptyText);
        const max = Math.max(...data.map(d => d.value), 1);
        // Chừa đủ chỗ cho nhãn giá trị dài nhất ở đầu thanh (không để nhãn tràn khỏi thẻ)
        const reserve = Math.max(8, ...data.map(d => String(d.valueText).length + (d.note ? String(d.note).length + 1 : 0))) + 2;
        const reserveSmall = Math.max(8, ...data.map(d => String(d.valueText).length)) + 2;
        el.innerHTML = html`
            ${legend ? html`<div class="chart-legend-inline" aria-hidden="true">${legend.map(l => html`<span style="--c:${l.color}">${l.label}</span>`)}</div>` : ''}
            <div class="barlist" role="list" aria-label="${title}" style="--reserve:${reserve}ch;--reserve-sm:${reserveSmall}ch">
                ${data.map(d => html`
                    <div class="barlist__row" role="listitem" tabindex="0" data-tip="${d.tip || d.label}" data-tip-value="${d.valueText}${d.note ? ' ' + d.note : ''}">
                        <span class="barlist__label">
                            ${d.rank ? html`<span class="rank${d.rank <= 3 ? ' rank--' + d.rank : ''}" aria-hidden="true">${d.rank}</span>` : ''}
                            <span class="barlist__name" title="${d.label}">${d.label}</span>
                        </span>
                        <span class="barlist__track">
                            <span class="barlist__bar" style="--p:${(Math.max(d.value, 0) / max).toFixed(4)};--c:${d.color || color}"></span>
                            <span class="barlist__value">${d.valueText}${d.note ? html` <span class="barlist__note">${d.note}</span>` : ''}</span>
                        </span>
                    </div>`)}
            </div>`;
    }

    /**
     * Một tổng chia thành phần.
     * parts: [{ label, value, valueText, color, dark }]  (dark: chữ tối trên nền sáng)
     * tall = true: thanh 28px có in % bên trong; false: thanh mảnh 8px + danh sách bên dưới
     */
    function segments(el, { parts, title, tall = true, hero, note, emptyText }) {
        if (!el) return;
        const total = parts.reduce((s, p) => s + Math.max(p.value, 0), 0);
        if (!total) return empty(el, emptyText);
        const visible = parts.filter(p => p.value > 0);
        el.innerHTML = html`
            <div class="segchart">
                ${hero ? html`<div class="chart-hero"><span class="chart-hero__value">${hero.value}</span><span class="chart-hero__label">${hero.label}</span></div>` : ''}
                <div class="segbar ${tall ? 'segbar--tall' : 'segbar--thin'}" role="img" aria-label="${title}: ${visible.map(p => p.label + ' ' + U.fmtPercent(p.value / total)).join(', ')}">
                    ${visible.map(p => {
                        const share = p.value / total;
                        return html`<span class="segbar__part${p.dark ? ' segbar__part--dark' : ''}" style="--w:${(share * 100).toFixed(3)};--c:${p.color}" tabindex="0" data-tip="${p.label}" data-tip-value="${p.valueText} · ${U.fmtPercent(share)}">${tall && share >= 0.16 ? html`<span class="segbar__text">${U.fmtPercent(share)}</span>` : ''}</span>`;
                    })}
                </div>
                <ul class="legend">
                    ${parts.map(p => html`
                        <li class="legend__item">
                            <span class="legend__swatch" style="--c:${p.color}" aria-hidden="true"></span>
                            <span class="legend__name">${p.label}</span>
                            <span class="legend__value">${p.valueText}</span>
                            <span class="legend__pct">${U.fmtPercent(Math.max(p.value, 0) / total)}</span>
                        </li>`)}
                </ul>
                ${note ? html`<p class="chart-note">${note}</p>` : ''}
            </div>`;
    }

    /* ---------- Tooltip dùng chung (giá trị đậm trước, nhãn sau) ---------- */
    let tip = null;

    function showTip(target) {
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'chart-tip';
            tip.setAttribute('role', 'tooltip');
            tip.innerHTML = '<span class="chart-tip__value"></span><span class="chart-tip__label"></span>';
            document.body.appendChild(tip);
        }
        tip.querySelector('.chart-tip__value').textContent = target.dataset.tipValue || '';
        tip.querySelector('.chart-tip__label').textContent = target.dataset.tip || '';
        tip.classList.add('is-visible');
        const r = target.getBoundingClientRect();
        const t = tip.getBoundingClientRect();
        const left = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, window.innerWidth - t.width - 8));
        let top = r.top - t.height - 8;
        if (top < 8) top = r.bottom + 8;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    function hideTip() {
        if (tip) tip.classList.remove('is-visible');
    }

    document.addEventListener('mouseover', e => {
        const target = e.target.closest && e.target.closest('[data-tip-value]');
        if (target) showTip(target);
        else hideTip();
    });
    document.addEventListener('focusin', e => {
        const target = e.target.closest && e.target.closest('[data-tip-value]');
        if (target) showTip(target);
        else hideTip();
    });
    document.addEventListener('focusout', hideTip);
    window.addEventListener('scroll', hideTip, true);

    QN.charts = { COLORS, columns, bars, segments };
})(window.QN);
