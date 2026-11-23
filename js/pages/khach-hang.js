/* =========================================================
   QUẢN LÝ KHÁCH HÀNG: thông tin khách hàng, nhân viên
   ========================================================= */
(function (QN) {
    'use strict';
    const U = QN.utils;
    const S = QN.store;
    const V = QN.validate;
    const R = V.rules;

    /** "3 hóa đơn và 1 yêu cầu đưa đón" — bỏ qua phần bằng 0 */
    function joinCounts(parts) {
        return parts.filter(p => p[0] > 0).map(p => p[0] + ' ' + p[1]).join(' và ');
    }

    QN.crud.define({
        key: 'customers',
        label: 'khách hàng',
        modal: 'customerModal',
        tbody: 'customerTableBody',
        meta: 'customersMeta',
        search: { input: 'searchCustomer', fields: r => [r.name, r.phone] },
        fields: [
            { id: 'custName', key: 'name' },
            { id: 'custPhone', key: 'phone', type: 'phone' }
        ],
        columns: [
            { render: (r, i) => i + 1 },
            { className: 't-strong', render: r => r.name },
            { className: 'nowrap', render: r => r.phone }
        ],
        display: r => r.name,
        validate: (v, existing) => V.check([
            ['custName', v.name, R.required('Vui lòng nhập họ tên'), R.maxLength(80)],
            ['custPhone', v.phone, R.required('Vui lòng nhập SĐT'), R.phone(),
                R.unique(S.db.customers, x => x.phone, existing, 'SĐT này đã thuộc về khách hàng khác', U.digitsOnly)]
        ]),
        canDelete: r => {
            const used = joinCounts([
                [S.db.invoices.filter(i => Number(i.custId) === r.id).length, 'hóa đơn'],
                [S.db.deliveryReqs.filter(d => Number(d.custId) === r.id).length, 'yêu cầu đưa đón']
            ]);
            return used ? `Không thể xóa “${r.name}”: khách hàng đã có ${used}.` : null;
        }
    });

    QN.crud.define({
        key: 'employees',
        label: 'nhân viên',
        modal: 'employeeModal',
        tbody: 'employeeTableBody',
        meta: 'employeesMeta',
        search: { input: 'searchEmployee', fields: r => [r.name, r.role] },
        fields: [
            { id: 'empName', key: 'name' },
            { id: 'empRole', key: 'role', type: 'raw' }
        ],
        columns: [
            { render: (r, i) => i + 1 },
            { className: 't-strong', render: r => r.name },
            { render: r => r.role }
        ],
        display: r => r.name,
        validate: v => V.check([
            ['empName', v.name, R.required('Vui lòng nhập họ tên'), R.maxLength(80)]
        ]),
        canDelete: r => {
            const used = joinCounts([
                [S.db.invoices.filter(i => Number(i.empId) === r.id).length, 'hóa đơn'],
                [S.db.receipts.filter(x => Number(x.empId) === r.id).length, 'phiếu kho'],
                [S.db.trips.filter(t => Number(t.driverId) === r.id).length, 'chuyến xe']
            ]);
            return used ? `Không thể xóa “${r.name}”: nhân viên đã có ${used}.` : null;
        }
    });
})(window.QN);
