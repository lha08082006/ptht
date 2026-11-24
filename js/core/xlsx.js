/* =========================================================
   XUẤT FILE EXCEL (.xlsx) — tự viết, không cần thư viện ngoài
   File .xlsx là một gói ZIP chứa vài tệp XML (chuẩn Office Open XML).
   Ở đây đóng gói ZIP kiểu "store" (không nén) nên chỉ cần tính CRC32.
   Ưu điểm so với CSV: mở đúng tiếng Việt và đúng số ở mọi máy
   (không phụ thuộc dấu phân cách "," hay ";" của Windows).

   QN.xlsx.download('ten-file.xlsx', [{ name: 'Tên sheet', rows: [[...], ...], widths: [30, 10, ...] }])
   - Dòng đầu mỗi sheet là tiêu đề (in đậm, cố định khi cuộn).
   - Ô: chuỗi | số | null | { v: số, fmt: 'money' | 'qty' } để định dạng 1.234.567 / 0,125.
   ========================================================= */
(function (QN) {
    'use strict';

    /* ---------- CRC32 (bắt buộc cho từng tệp trong ZIP) ---------- */
    const CRC_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            table[n] = c >>> 0;
        }
        return table;
    })();

    function crc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    /** Gói ZIP không nén: files = [{ name, data: Uint8Array }] */
    function zip(files) {
        const enc = new TextEncoder();
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
        const locals = [];
        const centrals = [];
        let offset = 0;
        files.forEach(f => {
            const name = enc.encode(f.name);
            const crc = crc32(f.data);
            const local = new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034b50, true);   // chữ ký tệp
            local.setUint16(4, 20, true);           // phiên bản cần để giải nén
            local.setUint16(6, 0x0800, true);       // tên tệp UTF-8
            local.setUint16(8, 0, true);            // không nén
            local.setUint16(10, dosTime, true);
            local.setUint16(12, dosDate, true);
            local.setUint32(14, crc, true);
            local.setUint32(18, f.data.length, true);
            local.setUint32(22, f.data.length, true);
            local.setUint16(26, name.length, true);
            local.setUint16(28, 0, true);
            locals.push(new Uint8Array(local.buffer), name, f.data);

            const central = new DataView(new ArrayBuffer(46));
            central.setUint32(0, 0x02014b50, true);
            central.setUint16(4, 20, true);
            central.setUint16(6, 20, true);
            central.setUint16(8, 0x0800, true);
            central.setUint16(10, 0, true);
            central.setUint16(12, dosTime, true);
            central.setUint16(14, dosDate, true);
            central.setUint32(16, crc, true);
            central.setUint32(20, f.data.length, true);
            central.setUint32(24, f.data.length, true);
            central.setUint16(28, name.length, true);
            central.setUint32(42, offset, true);    // vị trí tệp trong gói
            centrals.push(new Uint8Array(central.buffer), name);
            offset += 30 + name.length + f.data.length;
        });
        const centralSize = centrals.reduce((s, part) => s + part.length, 0);
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(8, files.length, true);
        end.setUint16(10, files.length, true);
        end.setUint32(12, centralSize, true);
        end.setUint32(16, offset, true);
        return new Blob(locals.concat(centrals, [new Uint8Array(end.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    /* ---------- Bảng tính ---------- */
    const escapeXml = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&apos;' }[ch]))
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    function columnName(index) {
        let name = '';
        for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
        return name;
    }

    // Kiểu ô (thứ tự khớp <cellXfs> trong styles.xml): 0 thường · 1 tiêu đề đậm · 2 tiền #,##0 · 3 số lượng #,##0.###
    const STYLE = { header: 1, money: 2, qty: 3 };

    function cellXml(value, ref, header) {
        if (value === null || value === undefined || value === '') return '';
        const fmt = value && typeof value === 'object' ? value.fmt : null;
        const raw = value && typeof value === 'object' ? value.v : value;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            const s = header ? STYLE.header : (STYLE[fmt] || 0);
            return `<c r="${ref}"${s ? ` s="${s}"` : ''}><v>${raw}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"${header ? ` s="${STYLE.header}"` : ''}><is><t xml:space="preserve">${escapeXml(raw)}</t></is></c>`;
    }

    function sheetXml(sheet) {
        const cols = (sheet.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
        const rows = sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cellXml(v, columnName(c) + (r + 1), r === 0)).join('')}</row>`).join('');
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            + (cols ? `<cols>${cols}</cols>` : '')
            + `<sheetData>${rows}</sheetData></worksheet>`;
    }

    const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.###"/></numFmts>'
        + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
        + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
        + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        + '<cellXfs count="4">'
        + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
        + '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
        + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
        + '</cellXfs>'
        + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        + '</styleSheet>';

    /** Tên sheet: tối đa 31 ký tự, không chứa : \ / ? * [ ] */
    const sheetName = name => String(name).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';

    function build(sheets) {
        const enc = new TextEncoder();
        const file = (name, text) => ({ name, data: enc.encode(text) });
        const n = sheets.length;
        const range = Array.from({ length: n }, (_, i) => i + 1);
        return zip([
            file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                + '<Default Extension="xml" ContentType="application/xml"/>'
                + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                + range.map(i => `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
                + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                + '</Types>'),
            file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                + '</Relationships>'),
            file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                + '<sheets>' + sheets.map((s, i) => `<sheet name="${escapeXml(sheetName(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>'
                + '</workbook>'),
            file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + range.map(i => `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`).join('')
                + `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
                + '</Relationships>'),
            file('xl/styles.xml', STYLES_XML)
        ].concat(sheets.map((s, i) => file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)))));
    }

    /** Tạo file và tải về máy */
    function download(filename, sheets) {
        const blob = build(sheets);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return blob;
    }

    QN.xlsx = { build, download };
})(window.QN);
