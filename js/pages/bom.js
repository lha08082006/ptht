/* =========================================================
   ĐỊNH MỨC NGUYÊN VẬT LIỆU (BOM)
   - Theo món: định mức từng món — tịnh, hao hụt, gộp (lượng xuất kho), đơn giá, thành tiền, tỷ trọng
   - Theo nguyên liệu: tra ngược nguyên liệu dùng cho những món nào, tồn hiện tại đủ làm bao nhiêu phần
   - Định mức – thực tế: trong một kỳ, so lượng xuất theo định mức (bán hàng) với lượng dùng thật
     (thêm xuất tay như hủy hàng hỏng, cộng/trừ chênh lệch kiểm kê) để thấy thất thoát
   - Xuất Excel (.xlsx) cả ba bảng
   Sửa định mức của món ngay tại đây (mở hộp thoại món ăn).
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const UI = QN.ui;
    const C = QN.charts;
    const { html } = U;

    let view = 'food'; // food | ingredient | variance
    const muted = text => html`<span class="text-muted">${text}</span>`;
    const qtyText = (n, unit) => `${U.fmtNumber(n)} ${unit}`;

    function setDefaultRange() {
        const to = U.todayLocal();
        U.byId('bomFrom').value = U.addDays(to, -6);
        U.byId('bomTo').value = to;
    }

    function period() {
        if (!U.byId('bomFrom').value || !U.byId('bomTo').value) setDefaultRange();
        return { from: U.byId('bomFrom').value, to: U.byId('bomTo').value };
    }

    /** Tổng hợp một món: định mức, giá vốn, lãi gộp, số phần còn làm được */
    function summarize(food) {
        const recipe = S.recipeOf(food);
        const cost = S.foodCost(food);
        const profit = cost == null ? null : food.price - cost;
        return {
            food, recipe, cost, profit,
            margin: cost == null || !food.price ? null : profit / food.price,
            left: S.portionsLeft(food),
            lines: recipe.map(l => {
                const g = S.get('ingredients', l.ingredientId);
                const gross = S.grossQty(l);
                return { g, qty: Number(l.qty), waste: Number(l.waste) || 0, gross, value: Math.round(gross * g.price) };
            })
        };
    }

    const portionsText = left => (Number.isFinite(left) ? `${U.fmtNumber(left)} phần` : 'Không theo dõi');

    /* ---------------- THẺ SỐ LIỆU + BIỂU ĐỒ ---------------- */
    function renderStats(all, variance, range) {
        const withRecipe = all.filter(x => x.recipe.length);
        const missing = all.filter(x => !x.recipe.length);
        UI.setText('bomCovered', `${withRecipe.length}/${all.length}`);
        UI.setText('bomCoveredSub', missing.length ? `Chưa có định mức: ${missing.map(x => x.food.name).join(', ')}` : 'Mọi món đều có định mức');

        const avgCost = withRecipe.length ? Math.round(U.sum(withRecipe, x => x.cost) / withRecipe.length) : 0;
        UI.setText('bomAvgCost', U.fmtMoney(avgCost));
        UI.setText('bomAvgCostSub', `Trung bình trên ${withRecipe.length} món có định mức`);

        const priced = withRecipe.filter(x => x.margin != null);
        const avgMargin = priced.length ? U.sum(priced, x => x.margin) / priced.length : 0;
        const lowest = priced.slice().sort((a, b) => a.margin - b.margin)[0];
        UI.setText('bomAvgMargin', U.fmtPercent(avgMargin));
        UI.setText('bomAvgMarginSub', lowest ? `Thấp nhất: ${lowest.food.name} (${U.fmtPercent(lowest.margin)})` : 'Chưa có món có định mức');

        const loss = U.sum(variance.filter(v => v.overValue > 0), v => v.overValue);
        const bomValue = U.sum(variance, v => v.bomValue);
        UI.setText('bomLoss', U.fmtMoney(loss));
        UI.setText('bomLossSub', `${bomValue ? U.fmtShare(loss / bomValue) + ' so với xuất theo định mức · ' : ''}${U.fmtDateShort(range.from)} – ${U.fmtDateShort(range.to)}`);

        C.bars(U.byId('bomMarginChart'), {
            title: 'Biên lãi gộp theo món',
            data: priced.slice().sort((a, b) => a.margin - b.margin).map(x => ({
                label: x.food.name, value: Math.max(x.margin, 0) * 100,
                valueText: U.fmtPercent(x.margin), note: `· lãi ${U.fmtMoney(x.profit)}/phần`,
                tip: `${x.food.name}: giá bán ${U.fmtMoney(x.food.price)}, giá vốn ${U.fmtMoney(x.cost)}`
            })),
            emptyText: 'Chưa có món nào có định mức'
        });
    }

    /* ---------------- XEM THEO MÓN ---------------- */
    function renderFoodView(all, query) {
        const list = all.filter(x => U.matches(query, x.food.name, x.food.category, ...x.lines.map(l => l.g.name)));
        U.byId('bomHead').innerHTML = html`<tr><th>Nguyên liệu</th><th>ĐVT</th><th class="num">Định mức tịnh</th><th class="num">Hao hụt</th><th class="num">Định mức gộp</th><th class="num">Đơn giá</th><th class="num">Thành tiền</th><th class="num">Tỷ trọng</th></tr>`;
        U.byId('bomNote').textContent = 'Định mức gộp = định mức tịnh × (1 + hao hụt) là lượng xuất kho cho mỗi phần khi gửi đơn xuống bếp. Giá vốn món = tổng thành tiền các dòng.';
        const rows = [];
        list.forEach(x => {
            const f = x.food;
            rows.push(html`
                <tr class="bom-dish">
                    <td colspan="8">
                        <div class="bom-dish__head">
                            <p class="bom-dish__title"><span class="t-strong">${f.name}</span><span class="bom-dish__cat">${f.category}${f.status === 'unavailable' ? ' · Hết món' : ''}</span></p>
                            <p class="bom-dish__meta">
                                <span>Giá bán <strong>${U.fmtMoney(f.price)}</strong></span>
                                ${x.cost == null ? html`<span class="text-warning">Chưa có định mức</span>` : html`
                                    <span>Giá vốn <strong>${U.fmtMoney(x.cost)}</strong></span>
                                    <span>Lãi gộp <strong class="${x.profit <= 0 ? 'text-danger' : ''}">${U.fmtMoney(x.profit)} (${U.fmtPercent(x.margin)})</strong></span>
                                    <span>Còn làm được <strong>${portionsText(x.left)}</strong></span>`}
                            </p>
                            <button type="button" class="btn btn--ghost btn--sm" data-action="crud-edit" data-entity="foods" data-id="${f.id}"><i class="fas fa-pen-to-square" aria-hidden="true"></i>${x.recipe.length ? 'Sửa định mức' : 'Khai báo định mức'}</button>
                        </div>
                    </td>
                </tr>`);
            if (!x.lines.length) {
                rows.push(html`<tr class="bom-line"><td colspan="8" class="bom-empty">Món chưa có định mức: không tự trừ kho khi bán và giá vốn được tính bằng 0.</td></tr>`);
                return;
            }
            x.lines.forEach(l => rows.push(html`
                <tr class="bom-line">
                    <td>${l.g.name}</td>
                    <td>${l.g.unit}</td>
                    <td class="num">${U.fmtNumber(l.qty)}</td>
                    <td class="num">${l.waste ? U.fmtNumber(l.waste) + '%' : muted('—')}</td>
                    <td class="num t-strong">${U.fmtNumber(l.gross)}</td>
                    <td class="num">${U.fmtMoney(l.g.price)}</td>
                    <td class="num">${U.fmtMoney(l.value)}</td>
                    <td class="num">${U.fmtShare(x.cost ? l.value / x.cost : 0)}</td>
                </tr>`));
        });
        UI.renderRows('bomBody', rows, { paged: false, empty: query ? `Không có món hay nguyên liệu nào khớp “${query}”` : 'Chưa có món nào', icon: query ? 'fa-magnifying-glass' : 'fa-inbox' });
    }

    /* ---------------- XEM THEO NGUYÊN LIỆU (tra ngược) ---------------- */
    function renderIngredientView(all, query) {
        U.byId('bomHead').innerHTML = html`<tr><th>Nguyên liệu</th><th>ĐVT</th><th class="num">Tồn kho</th><th>Dùng trong món (định mức gộp / phần → tồn hiện tại đủ làm)</th><th class="num">Số món</th></tr>`;
        U.byId('bomNote').textContent = 'Tra ngược: một nguyên liệu dùng cho những món nào. Khi một nguyên liệu sắp hết, các món ở dòng đó sẽ bị giới hạn số phần bán được.';
        const list = S.db.ingredients.map(g => ({
            g,
            uses: all.flatMap(x => x.lines.filter(l => l.g.id === g.id).map(l => ({ food: x.food, gross: l.gross })))
        }))
            .filter(x => U.matches(query, x.g.name, S.supplierName(x.g.supplierId), ...x.uses.map(u => u.food.name)))
            .sort((a, b) => b.uses.length - a.uses.length || a.g.name.localeCompare(b.g.name, 'vi'));
        UI.renderRows('bomBody', list.map(x => html`
            <tr>
                <td><span class="t-strong">${x.g.name}</span><span class="t-sub">${S.supplierName(x.g.supplierId)}</span></td>
                <td>${x.g.unit}</td>
                <td class="num"><span class="t-strong">${U.fmtNumber(x.g.stock)}</span>${UI.statusBadge('stock', S.stockLevel(x.g))}</td>
                <td>${x.uses.length ? html`<ul class="bom-uses">${x.uses.map(u => html`
                    <li><span>${u.food.name}</span><span class="text-muted">${qtyText(u.gross, x.g.unit)} / phần → đủ ${U.fmtNumber(Math.floor(S.round3((Number(x.g.stock) || 0) / u.gross) + 1e-9))} phần</span></li>`)}</ul>`
                    : muted('Chưa dùng trong định mức món nào')}</td>
                <td class="num">${x.uses.length}</td>
            </tr>`), { paged: false, empty: query ? `Không có nguyên liệu nào khớp “${query}”` : 'Chưa có nguyên liệu', icon: query ? 'fa-magnifying-glass' : 'fa-inbox' });
    }

    /* ---------------- ĐỊNH MỨC – THỰC TẾ (theo kỳ) ---------------- */
    function varianceBadge(v) {
        if (v.over > 1e-9) {
            const ratio = v.overRatio;
            const tone = ratio == null || ratio > 0.1 ? 'danger' : (ratio > 0.05 ? 'warning' : 'neutral');
            return UI.badge(ratio == null ? 'Vượt (không bán)' : `Vượt ${U.fmtShare(ratio)}`, tone);
        }
        if (v.over < -1e-9) return UI.badge('Dùng ít hơn định mức', 'info');
        return v.bom > 0 ? UI.badge('Đúng định mức', 'success') : muted('—');
    }

    function renderVarianceView(variance, range, query) {
        U.byId('bomHead').innerHTML = html`<tr><th>Nguyên liệu</th><th class="num">Tồn đầu kỳ</th><th class="num">Nhập</th><th class="num">Xuất theo định mức</th><th class="num">Xuất tay</th><th class="num">Kiểm kê ±</th><th class="num">Tồn cuối kỳ</th><th class="num">Vượt định mức</th><th>Đánh giá</th></tr>`;
        const active = variance.filter(v => v.opening || v.imported || v.bom || v.manual || v.counted)
            .filter(v => U.matches(query, v.ingredient.name))
            .sort((a, b) => b.overValue - a.overValue || b.bomValue - a.bomValue);
        const loss = U.sum(variance.filter(v => v.overValue > 0), v => v.overValue);
        const bomValue = U.sum(variance, v => v.bomValue);
        U.byId('bomNote').innerHTML = html`Kỳ <strong>${U.fmtDate(range.from)} – ${U.fmtDate(range.to)}</strong>: xuất theo định mức <strong>${U.fmtMoney(bomValue)}</strong> · vượt định mức <strong class="${loss ? 'text-danger' : ''}">${U.fmtMoney(loss)}</strong>${bomValue ? ` (${U.fmtShare(loss / bomValue)})` : ''}. Vượt định mức = xuất tay (hàng hỏng, dùng nội bộ) + phần thiếu khi kiểm kê.`;
        const unit = v => v.ingredient.unit;
        const cell = (n, v, signedFmt) => (n ? (signedFmt && n > 0 ? '+' : '') + qtyText(n, unit(v)) : muted('—'));
        UI.renderRows('bomBody', active.map(v => html`
            <tr>
                <td><span class="t-strong">${v.ingredient.name}</span>${v.overValue > 0 ? html`<span class="t-sub">Giá trị vượt ${U.fmtMoney(v.overValue)}</span>` : ''}</td>
                <td class="num">${qtyText(v.opening, unit(v))}</td>
                <td class="num">${cell(v.imported, v)}</td>
                <td class="num">${cell(v.bom, v)}</td>
                <td class="num">${cell(v.manual, v)}</td>
                <td class="num">${cell(v.counted, v, true)}</td>
                <td class="num t-strong">${qtyText(v.closing, unit(v))}</td>
                <td class="num${v.over > 1e-9 ? ' text-danger' : ''}">${v.over ? (v.over > 0 ? '+' : '') + qtyText(v.over, unit(v)) : muted('0')}</td>
                <td>${varianceBadge(v)}</td>
            </tr>`), { paged: false, empty: query ? `Không có nguyên liệu nào khớp “${query}”` : 'Không có phát sinh kho trong kỳ này', icon: query ? 'fa-magnifying-glass' : 'fa-inbox' });
    }

    /* ---------------- VẼ TRANG ---------------- */
    function render() {
        const range = period();
        if (range.from > range.to) {
            UI.toast('“Từ ngày” phải trước hoặc bằng “Đến ngày”.', 'warning');
            return;
        }
        const all = S.db.foods.map(summarize);
        const variance = S.bomVariance(range.from, range.to);
        renderStats(all, variance, range);
        UI.syncTabs('bom', view);
        U.byId('bomRangeForm').hidden = view !== 'variance';
        const query = U.byId('searchBom').value.trim();
        U.byId('bomTable').className = 'table bom-table bom-table--' + view;
        if (view === 'ingredient') renderIngredientView(all, query);
        else if (view === 'variance') renderVarianceView(variance, range, query);
        else renderFoodView(all, query);
    }

    QN.actions['bom-view'] = d => {
        view = d.filter;
        render();
    };

    QN.forms['bom-range'] = () => render();

    /* ---------------- XUẤT EXCEL ---------------- */
    QN.actions['bom-export'] = () => {
        const range = period();
        const all = S.db.foods.map(summarize);
        const n = v => ({ v, fmt: 'qty' });
        const m = v => ({ v, fmt: 'money' });
        const bomRows = [['Mã món', 'Tên món', 'Danh mục', 'Giá bán', 'Nguyên liệu', 'ĐVT', 'Định mức tịnh', 'Hao hụt (%)', 'Định mức gộp', 'Đơn giá NL', 'Thành tiền']];
        all.forEach(x => {
            const head = [U.code('MA', x.food.id), x.food.name, x.food.category, m(x.food.price)];
            if (!x.lines.length) bomRows.push(head.concat(['(chưa có định mức)']));
            x.lines.forEach(l => bomRows.push(head.concat([l.g.name, l.g.unit, n(l.qty), l.waste, n(l.gross), m(l.g.price), m(l.value)])));
        });
        const costRows = [['Mã món', 'Tên món', 'Danh mục', 'Giá bán', 'Giá vốn', 'Lãi gộp', 'Biên lãi (%)', 'Còn làm được (phần)']];
        all.forEach(x => costRows.push([U.code('MA', x.food.id), x.food.name, x.food.category, m(x.food.price),
            x.cost == null ? 'Chưa có định mức' : m(x.cost), x.profit == null ? null : m(x.profit),
            x.margin == null ? null : Math.round(x.margin * 1000) / 10, Number.isFinite(x.left) ? x.left : 'Không theo dõi']));
        const varRows = [['Nguyên liệu', 'ĐVT', 'Tồn đầu kỳ', 'Nhập', 'Xuất theo định mức', 'Xuất tay', 'Kiểm kê (±)', 'Tồn cuối kỳ', 'Vượt định mức', 'Giá trị vượt']];
        S.bomVariance(range.from, range.to).forEach(v => varRows.push([v.ingredient.name, v.ingredient.unit,
            n(v.opening), n(v.imported), n(v.bom), n(v.manual), n(v.counted), n(v.closing), n(v.over), m(v.overValue)]));
        const filename = `dinh-muc-bom-${U.todayLocal()}.xlsx`;
        QN.xlsx.download(filename, [
            { name: 'Định mức BOM', rows: bomRows, widths: [9, 30, 12, 12, 22, 7, 13, 11, 13, 12, 13] },
            { name: 'Giá vốn món', rows: costRows, widths: [9, 30, 12, 12, 12, 12, 11, 18] },
            { name: 'Định mức - thực tế', rows: varRows.concat([[], [`Kỳ đối chiếu: ${U.fmtDate(range.from)} – ${U.fmtDate(range.to)}`]]), widths: [22, 7, 12, 10, 18, 10, 12, 12, 14, 13] }
        ]);
        UI.toast(`Đã xuất ${filename} (3 sheet: định mức BOM, giá vốn món, định mức – thực tế)`, 'success');
    };

    QN.pages.bom = { render, init: setDefaultRange };
})(window.QN);
