// ============================================
// QUÁN NHẬU TỰ DO - HỆ THỐNG QUẢN LÝ NHÀ HÀNG
// Consolidated version – matches index.html IDs
// ============================================

// ===================== SAMPLE DATA =====================
const sampleData = {
    customers: [
        { id: 1, name: 'Nguyễn Văn An', phone: '0901234567' },
        { id: 2, name: 'Trần Thị Bình', phone: '0912345678' },
        { id: 3, name: 'Lê Hoàng Cường', phone: '0923456789' },
        { id: 4, name: 'Phạm Minh Dũng', phone: '0934567890' },
        { id: 5, name: 'Hoàng Thị Ánh', phone: '0945678901' },
        { id: 6, name: 'Vũ Đức Anh', phone: '0956789012' },
    ],
    employees: [
        { id: 1, name: 'Nguyễn Quản Lý', role: 'Quản lý' },
        { id: 2, name: 'Trần Văn Phục', role: 'Phục vụ' },
        { id: 3, name: 'Lê Thị Thu', role: 'Thu ngân' },
        { id: 4, name: 'Phạm Đầu Bếp', role: 'Bếp' },
        { id: 5, name: 'Hoàng Tài Xế', role: 'Tài xế' },
        { id: 6, name: 'Đỗ Phục Vụ', role: 'Phục vụ' },
    ],
    foods: [
        { id: 1, name: 'Nầm sữa nướng giềng mẻ', category: 'Món nướng', price: 189000, status: 'available' },
        { id: 2, name: 'Ếch sốt tiêu gừng chua cay', category: 'Món xào', price: 159000, status: 'available' },
        { id: 3, name: 'Lợn mán nướng giềng mẻ', category: 'Món nướng', price: 219000, status: 'available' },
        { id: 4, name: 'Gỏi chân gà trộn thính', category: 'Khai vị', price: 129000, status: 'available' },
        { id: 5, name: 'Cá dưa chua tứ xuyên', category: 'Món cá', price: 249000, status: 'available' },
        { id: 6, name: 'Tôm sú ủ muối thảo mộc', category: 'Hải sản', price: 289000, status: 'available' },
        { id: 7, name: 'Lạp xưởng Tây Bắc xào', category: 'Món xào', price: 149000, status: 'available' },
        { id: 8, name: 'Gỏi sứa sốt Thái', category: 'Khai vị', price: 139000, status: 'unavailable' },
        { id: 9, name: 'Đậu pháp xào trứng non XO', category: 'Món xào', price: 119000, status: 'available' },
        { id: 10, name: 'Bia Tự Do', category: 'Đồ uống', price: 35000, status: 'available' },
        { id: 11, name: 'Nước ngọt', category: 'Đồ uống', price: 25000, status: 'available' },
        { id: 12, name: 'Nầm sữa cháy tỏi', category: 'Món nướng', price: 199000, status: 'available' },
    ],
    suppliers: [
        { id: 1, name: 'NCC Tây Bắc', address: 'Sơn La', phone: '0241234567' },
        { id: 2, name: 'Nhà máy bia HN', address: 'Long Biên, Hà Nội', phone: '0242345678' },
        { id: 3, name: 'Trại bò sữa Mộc Châu', address: 'Mộc Châu, Sơn La', phone: '0243456789' },
        { id: 4, name: 'Hải sản Quảng Ninh', address: 'Bãi Cháy, Quảng Ninh', phone: '0244567890' },
        { id: 5, name: 'Rau sạch Đà Lạt', address: 'Đà Lạt, Lâm Đồng', phone: '0245678901' },
    ],
    vouchers: [
        { id: 'VC001', desc: 'Giảm 10% đơn trên 500k', percent: 10, qty: 50 },
        { id: 'VC002', desc: 'Giảm 20% cho SV', percent: 20, qty: 30 },
        { id: 'VC003', desc: 'Giảm 15% ngày lễ', percent: 15, qty: 20 },
        { id: 'VC004', desc: 'Giảm 5% đơn trên 1tr', percent: 5, qty: 100 },
    ],
    ingredients: [
        { id: 1, name: 'Nầm sữa bò', unit: 'kg', price: 180000, supplierId: 3, stock: 25 },
        { id: 2, name: 'Ếch đồng', unit: 'kg', price: 120000, supplierId: 1, stock: 15 },
        { id: 3, name: 'Thịt lợn mán', unit: 'kg', price: 250000, supplierId: 1, stock: 10 },
        { id: 4, name: 'Chân gà rút xương', unit: 'kg', price: 85000, supplierId: 1, stock: 20 },
        { id: 5, name: 'Cá diêu hồng', unit: 'kg', price: 95000, supplierId: 4, stock: 12 },
        { id: 6, name: 'Tôm sú', unit: 'kg', price: 320000, supplierId: 4, stock: 8 },
        { id: 7, name: 'Lạp xưởng', unit: 'kg', price: 160000, supplierId: 1, stock: 10 },
        { id: 8, name: 'Rau xà lách', unit: 'kg', price: 35000, supplierId: 5, stock: 30 },
        { id: 9, name: 'Bia Tự Do', unit: 'thùng', price: 280000, supplierId: 2, stock: 50 },
        { id: 10, name: 'Nước ngọt', unit: 'thùng', price: 180000, supplierId: 2, stock: 40 },
    ],
    vehicles: [
        { id: 1, plate: '30A-12345', type: 'Xe 4 chỗ', seats: 4, status: 'available' },
        { id: 2, plate: '30B-67890', type: 'Xe 7 chỗ', seats: 7, status: 'available' },
        { id: 3, plate: '29C-11223', type: 'Xe 16 chỗ', seats: 16, status: 'in_use' },
        { id: 4, plate: '30D-44556', type: 'Xe 4 chỗ', seats: 4, status: 'maintenance' },
    ],
};

// Generate tables
const sampleTables = [];
for (let i = 1; i <= 20; i++) {
    const sts = ['available', 'available', 'available', 'occupied', 'reserved'];
    const zns = ['Tầng 1', 'Tầng 1', 'Tầng 2', 'Tầng 2', 'Sân vườn'];
    sampleTables.push({ id: i, name: 'Bàn ' + i, seats: [2, 4, 6, 8, 10][i % 5], zone: zns[i % 5], status: sts[Math.floor(Math.random() * 5)] });
}

// Generate invoices
const sampleInvoices = [];
for (let i = 1; i <= 15; i++) {
    const d = new Date(2026, 3, 14 + Math.floor(i / 3));
    const items = [];
    const numItems = 2 + Math.floor(Math.random() * 4);
    for (let j = 0; j < numItems; j++) {
        const f = sampleData.foods[Math.floor(Math.random() * sampleData.foods.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        items.push({ foodId: f.id, name: f.name, price: f.price, qty });
    }
    const total = items.reduce((s, x) => s + x.price * x.qty, 0);
    const empId = sampleData.employees[Math.floor(Math.random() * sampleData.employees.length)].id;
    const custId = Math.random() > 0.3 ? sampleData.customers[Math.floor(Math.random() * sampleData.customers.length)].id : 0;
    const vcUsed = Math.random() > 0.7 ? sampleData.vouchers[Math.floor(Math.random() * sampleData.vouchers.length)] : null;
    const discount = vcUsed ? Math.round(total * vcUsed.percent / 100) : 0;
    sampleInvoices.push({
        id: i, date: d.toISOString().slice(0, 10), tableId: (i % 20) + 1, custId, empId, items, total,
        voucher: vcUsed ? vcUsed.id : '', discount, finalTotal: total - discount,
        status: Math.random() > 0.2 ? 'paid' : 'pending', payMethod: Math.random() > 0.5 ? 'Tiền mặt' : 'Chuyển khoản'
    });
}

// Generate receipts
const sampleReceipts = [];
for (let i = 1; i <= 10; i++) {
    const ing = sampleData.ingredients[Math.floor(Math.random() * sampleData.ingredients.length)];
    const type = i <= 7 ? 'import' : 'export';
    const qty = 5 + Math.floor(Math.random() * 20);
    sampleReceipts.push({
        id: i, type, date: `2026-04-${String(10 + i).padStart(2, '0')}`,
        empId: sampleData.employees[Math.floor(Math.random() * sampleData.employees.length)].id,
        supplierId: type === 'import' ? ing.supplierId : null,
        ingredientId: ing.id, ingredientName: ing.name, qty, unitPrice: ing.price,
        total: qty * ing.price
    });
}

// Kitchen orders
const sampleKitchen = [
    { id: 1, tableId: 3, items: [{ name: 'Nầm sữa nướng giềng mẻ', qty: 2 }, { name: 'Bia Tự Do', qty: 5 }], status: 'new', time: '19:30' },
    { id: 2, tableId: 7, items: [{ name: 'Ếch sốt tiêu gừng chua cay', qty: 1 }, { name: 'Lạp xưởng Tây Bắc xào', qty: 1 }], status: 'cooking', time: '19:35' },
    { id: 3, tableId: 12, items: [{ name: 'Tôm sú ủ muối thảo mộc', qty: 2 }], status: 'done', time: '19:20' },
    { id: 4, tableId: 5, items: [{ name: 'Cá dưa chua tứ xuyên', qty: 1 }, { name: 'Gỏi chân gà trộn thính', qty: 1 }], status: 'new', time: '19:45' },
];

// Delivery
const sampleDeliveryReqs = [
    { id: 1, custId: 1, pickup: '123 Nguyễn Trãi', dropoff: 'Quán Nhậu Tự Do', time: '2026-04-20T18:00', guests: 4, status: 'pending', note: '' },
    { id: 2, custId: 3, pickup: '456 Lê Lợi', dropoff: 'Quán Nhậu Tự Do', time: '2026-04-20T19:30', guests: 6, status: 'assigned', note: 'Có trẻ em' },
];

const sampleTrips = [
    { id: 1, custId: 3, vehicleId: 2, driverId: 5, departure: '19:00', status: 'Đang đón' },
];

// Reservations
const sampleReservations = [
    { id: 1, name: 'Nguyễn Văn An', phone: '0901234567', date: '2026-04-25', time: '18:00', guests: 4, tableId: 3, status: 'confirmed', note: 'Sinh nhật', qr: 'RES-001-QNTD' },
    { id: 2, name: 'Trần Thị Bình', phone: '0912345678', date: '2026-04-26', time: '19:30', guests: 6, tableId: 0, status: 'pending', note: '', qr: 'RES-002-QNTD' },
    { id: 3, name: 'Phạm Minh Dũng', phone: '0934567890', date: '2026-04-24', time: '20:00', guests: 2, tableId: 5, status: 'cancelled', note: 'Hủy do thay đổi lịch', qr: 'RES-003-QNTD' },
];

// ===================== APP STATE =====================
let customers = JSON.parse(JSON.stringify(sampleData.customers));
let employees = JSON.parse(JSON.stringify(sampleData.employees));
let foods = JSON.parse(JSON.stringify(sampleData.foods));
let tables = JSON.parse(JSON.stringify(sampleTables));
let suppliers = JSON.parse(JSON.stringify(sampleData.suppliers));
let vouchers = JSON.parse(JSON.stringify(sampleData.vouchers));
let ingredients = JSON.parse(JSON.stringify(sampleData.ingredients));
let vehicles = JSON.parse(JSON.stringify(sampleData.vehicles));
let invoices = JSON.parse(JSON.stringify(sampleInvoices));
let receipts = JSON.parse(JSON.stringify(sampleReceipts));
let kitchenOrders = JSON.parse(JSON.stringify(sampleKitchen));
let deliveryReqs = JSON.parse(JSON.stringify(sampleDeliveryReqs));
let trips = JSON.parse(JSON.stringify(sampleTrips));
let reservations = JSON.parse(JSON.stringify(sampleReservations));
let cart = [];
let editingId = null;
let invFilter = 'all';
let invTabFilter = 'all';
let resFilter = 'all';
let currentPage = 'dashboard';

// ===================== HELPERS =====================
function fmt(n) { return Number(n).toLocaleString('vi-VN') + 'đ'; }
function showToast(msg, type) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    const icons = { success: 'check-circle', warning: 'exclamation-triangle', error: 'times-circle', info: 'info-circle' };
    t.innerHTML = '<i class="fas fa-' + (icons[type] || 'info-circle') + '"></i> ' + msg;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}
function getCustName(id) { const c = customers.find(x => x.id == id); return c ? c.name : 'Khách lẻ'; }
function getEmpName(id) { const e = employees.find(x => x.id == id); return e ? e.name : 'N/A'; }
function getTableName(id) { const t = tables.find(x => x.id == id); return t ? t.name : 'N/A'; }
function getSupName(id) { const s = suppliers.find(x => x.id == id); return s ? s.name : '—'; }
function getIngName(id) { const g = ingredients.find(x => x.id == id); return g ? g.name : 'N/A'; }

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    setupLogin();
    setupNavigation();
    setupSidebar();
    setupModals();
    updateClock();
    setInterval(updateClock, 1000);
});

function updateClock() {
    const el = document.getElementById('currentTime');
    if (el) el.textContent = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function createParticles() {
    const c = document.getElementById('loginParticles');
    if (!c) return;
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 4 + 's';
        p.style.animationDuration = (3 + Math.random() * 3) + 's';
        c.appendChild(p);
    }
}

// ===================== LOGIN =====================
function setupLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        if (u === 'admin' && p === '123456') {
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            showToast('Đăng nhập thành công!', 'success');
            renderDashboard();
        } else {
            const err = document.getElementById('loginError');
            if (err) { err.classList.add('show'); setTimeout(() => err.classList.remove('show'), 3000); }
        }
    });
    const logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', () => {
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
        showToast('Đã đăng xuất', 'warning');
    });
}

// ===================== SIDEBAR =====================
function setupSidebar() {
    const btn = document.getElementById('toggleSidebar');
    const sb = document.getElementById('sidebar');
    if (btn && sb) btn.addEventListener('click', () => sb.classList.toggle('collapsed'));
}

function toggleNavGroup(header) {
    const group = header.parentElement;
    if (group) group.classList.toggle('collapsed');
}

// ===================== NAVIGATION =====================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
    });
}

function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (nav) nav.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById('page-' + page);
    if (pg) pg.classList.add('active');
    const titles = {
        dashboard: 'Tổng quan', customers: 'Quản Lý Khách Hàng', employees: 'Quản Lý Nhân Viên',
        foods: 'Quản Lý Món Ăn', tables: 'Quản Lý Bàn', orders: 'Gọi Món & Tạo Hóa Đơn',
        kitchen: 'Quản Lý Bếp', invoices: 'Hóa Đơn & Thanh Toán', vouchers: 'Quản Lý Voucher',
        ingredients: 'Nguyên Liệu', suppliers: 'Nhà Cung Cấp', inventory: 'Nhập / Xuất Kho',
        vehicles: 'Quản Lý Xe', delivery: 'Yêu Cầu Đưa Đón', reservations: 'Quản Lý Đặt Bàn',
        'report-revenue': 'Báo Cáo Doanh Thu', 'report-bestseller': 'Báo Cáo Món Bán Chạy', 'report-stock': 'Báo Cáo Tồn Kho'
    };
    const pt = document.getElementById('pageTitle');
    if (pt) pt.textContent = titles[page] || page;
    const renderMap = {
        dashboard: renderDashboard, customers: renderCustomers, employees: renderEmployees,
        foods: renderFoods, tables: renderTables, orders: renderOrders, kitchen: renderKitchen,
        invoices: renderInvoices, vouchers: renderVouchers, ingredients: renderIngredients,
        suppliers: renderSuppliers, inventory: renderInventory, vehicles: renderVehicles,
        delivery: renderDelivery, reservations: renderReservations,
        'report-revenue': renderReportRevenue,
        'report-bestseller': renderReportBestseller, 'report-stock': renderReportStock
    };
    if (renderMap[page]) renderMap[page]();
}

// ===================== MODALS =====================
function setupModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
    });
}
function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('active'); editingId = null; }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); editingId = null; }

// ===================== DASHBOARD =====================
function renderDashboard() {
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('statCustomers', customers.length);
    el('statFoods', foods.length);
    el('statTables', tables.length);
    el('statInvoices', invoices.length);
    el('statEmployees', employees.length);
    el('statKitchen', kitchenOrders.filter(k => k.status !== 'done').length);
    const tbody = document.getElementById('recentOrders');
    if (!tbody) return;
    const recent = invoices.slice(-5).reverse();
    tbody.innerHTML = recent.map(inv => {
        const stClass = inv.status === 'paid' ? 'badge-green' : 'badge-orange';
        const stText = inv.status === 'paid' ? 'Đã TT' : 'Chờ TT';
        return '<tr><td>HD' + String(inv.id).padStart(3, '0') + '</td><td>' + getTableName(inv.tableId) +
            '</td><td>' + getCustName(inv.custId) + '</td><td>' + fmt(inv.finalTotal) +
            '</td><td><span class="badge-status ' + stClass + '"><span class="badge-dot"></span> ' + stText + '</span></td></tr>';
    }).join('');
}

// ===================== CUSTOMERS =====================
function renderCustomers() {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;
    const q = (document.getElementById('searchCustomer') || {}).value || '';
    const filtered = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
    tbody.innerHTML = filtered.map((c, i) =>
        '<tr><td>' + (i + 1) + '</td><td>' + c.name + '</td><td>' + c.phone + '</td><td>' +
        '<button class="btn-edit" onclick="editCustomer(' + c.id + ')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteCustomer(' + c.id + ')"><i class="fas fa-trash"></i></button></td></tr>'
    ).join('');
}
function saveCustomer() {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    if (!name || !phone) return showToast('Vui lòng nhập đầy đủ!', 'warning');
    if (editingId) {
        const c = customers.find(x => x.id === editingId);
        if (c) { c.name = name; c.phone = phone; }
        showToast('Đã cập nhật khách hàng', 'success');
    } else {
        customers.push({ id: Date.now(), name, phone });
        showToast('Thêm khách hàng thành công', 'success');
    }
    closeModal('customerModal');
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    renderCustomers();
}
function editCustomer(id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    editingId = id;
    document.getElementById('custName').value = c.name;
    document.getElementById('custPhone').value = c.phone;
    openModal('customerModal');
    editingId = id;
}
function deleteCustomer(id) {
    if (!confirm('Xóa khách hàng này?')) return;
    customers = customers.filter(x => x.id !== id);
    showToast('Đã xóa khách hàng', 'warning');
    renderCustomers();
}

// ===================== EMPLOYEES =====================
function renderEmployees() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;
    const q = (document.getElementById('searchEmployee') || {}).value || '';
    const filtered = employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
    tbody.innerHTML = filtered.map((e, i) =>
        '<tr><td>' + (i + 1) + '</td><td>' + e.name + '</td><td>' + e.role + '</td><td>' +
        '<button class="btn-edit" onclick="editEmployee(' + e.id + ')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteEmployee(' + e.id + ')"><i class="fas fa-trash"></i></button></td></tr>'
    ).join('');
}
function saveEmployee() {
    const name = document.getElementById('empName').value.trim();
    const role = document.getElementById('empRole').value;
    if (!name) return showToast('Vui lòng nhập tên!', 'warning');
    if (editingId) {
        const e = employees.find(x => x.id === editingId);
        if (e) { e.name = name; e.role = role; }
        showToast('Đã cập nhật nhân viên', 'success');
    } else {
        employees.push({ id: Date.now(), name, role });
        showToast('Thêm nhân viên thành công', 'success');
    }
    closeModal('employeeModal');
    document.getElementById('empName').value = '';
    renderEmployees();
}
function editEmployee(id) {
    const e = employees.find(x => x.id === id);
    if (!e) return;
    editingId = id;
    document.getElementById('empName').value = e.name;
    document.getElementById('empRole').value = e.role;
    openModal('employeeModal');
    editingId = id;
}
function deleteEmployee(id) {
    if (!confirm('Xóa nhân viên này?')) return;
    employees = employees.filter(x => x.id !== id);
    showToast('Đã xóa nhân viên', 'warning');
    renderEmployees();
}

// ===================== FOODS =====================
function renderFoods() {
    const tbody = document.getElementById('foodTableBody');
    if (!tbody) return;
    const q = (document.getElementById('searchFood') || {}).value || '';
    const filtered = foods.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    tbody.innerHTML = filtered.map((f, i) => {
        const stClass = f.status === 'available' ? 'badge-green' : 'badge-red';
        const stText = f.status === 'available' ? 'Có sẵn' : 'Hết';
        return '<tr><td>' + (i + 1) + '</td><td>' + f.name + '</td><td>' + f.category + '</td><td>' + fmt(f.price) +
            '</td><td><span class="badge-status ' + stClass + '"><span class="badge-dot"></span> ' + stText + '</span></td><td>' +
            '<button class="btn-edit" onclick="editFood(' + f.id + ')"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-delete" onclick="deleteFood(' + f.id + ')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('');
}
function saveFood() {
    const name = document.getElementById('foodName').value.trim();
    const category = document.getElementById('foodCategory').value;
    const price = parseInt(document.getElementById('foodPrice').value);
    const status = document.getElementById('foodStatus').value;
    if (!name || !price) return showToast('Vui lòng nhập đầy đủ!', 'warning');
    if (editingId) {
        const f = foods.find(x => x.id === editingId);
        if (f) { f.name = name; f.category = category; f.price = price; f.status = status; }
        showToast('Đã cập nhật món ăn', 'success');
    } else {
        foods.push({ id: Date.now(), name, category, price, status });
        showToast('Thêm món ăn thành công', 'success');
    }
    closeModal('foodModal');
    document.getElementById('foodName').value = '';
    document.getElementById('foodPrice').value = '';
    renderFoods();
}
function editFood(id) {
    const f = foods.find(x => x.id === id);
    if (!f) return;
    editingId = id;
    document.getElementById('foodName').value = f.name;
    document.getElementById('foodCategory').value = f.category;
    document.getElementById('foodPrice').value = f.price;
    document.getElementById('foodStatus').value = f.status;
    openModal('foodModal');
    editingId = id;
}
function deleteFood(id) {
    if (!confirm('Xóa món ăn này?')) return;
    foods = foods.filter(x => x.id !== id);
    showToast('Đã xóa món ăn', 'warning');
    renderFoods();
}

// ===================== TABLES =====================
function renderTables() {
    const grid = document.getElementById('tablesGrid');
    if (!grid) return;
    grid.innerHTML = tables.map(t => {
        const colors = { available: '#27ae60', reserved: '#f39c12', occupied: '#e74c3c' };
        const labels = { available: 'Trống', reserved: 'Đã đặt', occupied: 'Đang dùng' };
        return '<div class="table-card" style="border-top:4px solid ' + (colors[t.status] || '#888') + '" onclick="toggleTableStatus(' + t.id + ')">' +
            '<div class="table-icon"><i class="fas fa-chair"></i></div>' +
            '<h4>' + t.name + '</h4>' +
            '<p>' + t.seats + ' chỗ • ' + t.zone + '</p>' +
            '<span class="badge-status badge-' + (t.status === 'available' ? 'green' : t.status === 'reserved' ? 'orange' : 'red') + '">' +
            '<span class="badge-dot"></span> ' + (labels[t.status] || t.status) + '</span></div>';
    }).join('');
}
function toggleTableStatus(id) {
    const t = tables.find(x => x.id === id);
    if (!t) return;
    const next = { available: 'reserved', reserved: 'occupied', occupied: 'available' };
    t.status = next[t.status] || 'available';
    showToast(t.name + ' → ' + ({ available: 'Trống', reserved: 'Đã đặt', occupied: 'Đang dùng' }[t.status]), 'info');
    renderTables();
}

// ===================== ORDERS =====================
function renderOrders() {
    // Populate selects
    const tblSel = document.getElementById('orderTableSelect');
    const custSel = document.getElementById('orderCustSelect');
    const empSel = document.getElementById('orderEmpSelect');
    const vcSel = document.getElementById('orderVoucherSelect');
    if (tblSel) tblSel.innerHTML = '<option value="">-- Chọn bàn --</option>' + tables.map(t => '<option value="' + t.id + '">' + t.name + ' (' + t.zone + ')</option>').join('');
    if (custSel) custSel.innerHTML = '<option value="0">Khách lẻ</option>' + customers.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
    if (empSel) empSel.innerHTML = '<option value="">-- NV phục vụ --</option>' + employees.filter(e => e.role === 'Phục vụ' || e.role === 'Quản lý').map(e => '<option value="' + e.id + '">' + e.name + '</option>').join('');
    if (vcSel) vcSel.innerHTML = '<option value="">Không voucher</option>' + vouchers.filter(v => v.qty > 0).map(v => '<option value="' + v.id + '">' + v.id + ' - ' + v.desc + ' (' + v.percent + '%)</option>').join('');
    // Menu grid
    const mg = document.getElementById('menuGrid');
    if (mg) {
        mg.innerHTML = foods.filter(f => f.status === 'available').map(f =>
            '<div class="menu-item-card" onclick="addToCart(' + f.id + ')">' +
            '<div class="menu-item-name">' + f.name + '</div>' +
            '<div class="menu-item-cat">' + f.category + '</div>' +
            '<div class="menu-item-price">' + fmt(f.price) + '</div></div>'
        ).join('');
    }
    renderCart();
}

function addToCart(foodId) {
    const f = foods.find(x => x.id === foodId);
    if (!f) return;
    const existing = cart.find(c => c.foodId === foodId);
    if (existing) { existing.qty++; } else { cart.push({ foodId, name: f.name, price: f.price, qty: 1 }); }
    showToast('Đã thêm: ' + f.name, 'success');
    renderCart();
}

function removeFromCart(foodId) { cart = cart.filter(c => c.foodId !== foodId); renderCart(); }
function changeCartQty(foodId, delta) {
    const item = cart.find(c => c.foodId === foodId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(c => c.foodId !== foodId);
    renderCart();
}

function renderCart() {
    const ci = document.getElementById('cartItems');
    const cc = document.getElementById('cartCount');
    const cs = document.getElementById('cartSubtotal');
    const cd = document.getElementById('cartDiscount');
    const ct = document.getElementById('cartTotal');
    if (!ci) return;
    if (cart.length === 0) {
        ci.innerHTML = '<div class="empty-state" style="padding:30px"><i class="fas fa-shopping-cart"></i><p>Chưa có món nào</p></div>';
    } else {
        ci.innerHTML = cart.map(c =>
            '<div class="cart-item"><div class="cart-item-info"><span class="cart-item-name">' + c.name + '</span>' +
            '<span class="cart-item-price">' + fmt(c.price) + '</span></div>' +
            '<div class="cart-item-controls">' +
            '<button onclick="changeCartQty(' + c.foodId + ',-1)">−</button><span>' + c.qty + '</span>' +
            '<button onclick="changeCartQty(' + c.foodId + ',1)">+</button>' +
            '<button class="btn-remove" onclick="removeFromCart(' + c.foodId + ')"><i class="fas fa-trash"></i></button></div></div>'
        ).join('');
    }
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const vcId = (document.getElementById('orderVoucherSelect') || {}).value;
    const vc = vouchers.find(v => v.id === vcId);
    const discount = vc ? Math.round(subtotal * vc.percent / 100) : 0;
    if (cc) cc.textContent = cart.reduce((s, c) => s + c.qty, 0) + ' món';
    if (cs) cs.textContent = fmt(subtotal);
    if (cd) cd.textContent = '-' + fmt(discount);
    if (ct) ct.textContent = fmt(subtotal - discount);
}

function submitOrder() {
    if (cart.length === 0) return showToast('Chưa chọn món nào!', 'warning');
    const tableId = parseInt((document.getElementById('orderTableSelect') || {}).value);
    const custId = parseInt((document.getElementById('orderCustSelect') || {}).value) || 0;
    const empId = parseInt((document.getElementById('orderEmpSelect') || {}).value);
    if (!tableId) return showToast('Vui lòng chọn bàn!', 'warning');
    if (!empId) return showToast('Vui lòng chọn nhân viên!', 'warning');
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const vcId = (document.getElementById('orderVoucherSelect') || {}).value;
    const vc = vouchers.find(v => v.id === vcId);
    const discount = vc ? Math.round(subtotal * vc.percent / 100) : 0;
    const inv = {
        id: invoices.length + 1, date: new Date().toISOString().slice(0, 10),
        tableId, custId, empId, items: [...cart], total: subtotal,
        voucher: vcId || '', discount, finalTotal: subtotal - discount,
        status: 'pending', payMethod: 'Tiền mặt'
    };
    invoices.push(inv);
    // Add kitchen order
    kitchenOrders.push({ id: kitchenOrders.length + 1, tableId, items: cart.map(c => ({ name: c.name, qty: c.qty })), status: 'new', time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) });
    // Update table status
    const tbl = tables.find(t => t.id === tableId);
    if (tbl) tbl.status = 'occupied';
    // Use voucher
    if (vc) vc.qty--;
    cart = [];
    showToast('Đã tạo hóa đơn #HD' + String(inv.id).padStart(3, '0'), 'success');
    renderOrders();
}

// ===================== KITCHEN =====================
function renderKitchen() {
    const kn = document.getElementById('kanbanNew');
    const kc = document.getElementById('kanbanCooking');
    const kd = document.getElementById('kanbanDone');
    if (!kn || !kc || !kd) return;
    const renderCard = (o) =>
        '<div class="kanban-card"><div class="kanban-card-header"><strong>' + getTableName(o.tableId) + '</strong><span>' + o.time + '</span></div>' +
        '<ul>' + o.items.map(it => '<li>' + it.name + ' x' + it.qty + '</li>').join('') + '</ul>' +
        '<div class="kanban-card-actions">' +
        (o.status === 'new' ? '<button class="btn-primary" onclick="moveKitchen(' + o.id + ',\'cooking\')"><i class="fas fa-fire"></i> Chế biến</button>' : '') +
        (o.status === 'cooking' ? '<button class="btn-primary" style="background:var(--green-accent)" onclick="moveKitchen(' + o.id + ',\'done\')"><i class="fas fa-check"></i> Xong</button>' : '') +
        '</div></div>';
    kn.innerHTML = kitchenOrders.filter(o => o.status === 'new').map(renderCard).join('') || '<div class="empty-state"><p>Không có đơn mới</p></div>';
    kc.innerHTML = kitchenOrders.filter(o => o.status === 'cooking').map(renderCard).join('') || '<div class="empty-state"><p>Đang trống</p></div>';
    kd.innerHTML = kitchenOrders.filter(o => o.status === 'done').map(renderCard).join('') || '<div class="empty-state"><p>Chưa có</p></div>';
}
function moveKitchen(id, status) {
    const o = kitchenOrders.find(x => x.id === id);
    if (o) { o.status = status; showToast('Đã cập nhật trạng thái bếp', 'success'); renderKitchen(); }
}

// ===================== INVOICES =====================
function renderInvoices() {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) return;
    const paid = invoices.filter(i => i.status === 'paid');
    const pending = invoices.filter(i => i.status === 'pending');
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('invRevenue', fmt(paid.reduce((s, i) => s + i.finalTotal, 0)));
    el('invPending', fmt(pending.reduce((s, i) => s + i.finalTotal, 0)));
    el('invCount', invoices.length);
    let filtered = invoices;
    if (invFilter === 'paid') filtered = paid;
    else if (invFilter === 'pending') filtered = pending;
    tbody.innerHTML = filtered.map(inv => {
        const stClass = inv.status === 'paid' ? 'badge-green' : 'badge-orange';
        const stText = inv.status === 'paid' ? 'Đã TT' : 'Chờ TT';
        return '<tr><td>HD' + String(inv.id).padStart(3, '0') + '</td><td>' + inv.date + '</td><td>' + getTableName(inv.tableId) +
            '</td><td>' + getCustName(inv.custId) + '</td><td>' + getEmpName(inv.empId) + '</td><td>' + inv.items.length +
            '</td><td>' + fmt(inv.finalTotal) + '</td><td>' + (inv.voucher || '—') +
            '</td><td><span class="badge-status ' + stClass + '"><span class="badge-dot"></span> ' + stText + '</span></td>' +
            '<td><button class="btn-edit" onclick="viewInvoice(' + inv.id + ')"><i class="fas fa-eye"></i></button>' +
            (inv.status === 'pending' ? ' <button class="btn-edit" style="background:#27ae60;color:#fff" onclick="openPaymentModal(' + inv.id + ')"><i class="fas fa-credit-card"></i></button>' : '') +
            '</td></tr>';
    }).join('');
}
function filterInvoices(f) {
    invFilter = f;
    document.querySelectorAll('.inv-filter-tab').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.inv-filter-tab[data-filter="' + f + '"]');
    if (btn) btn.classList.add('active');
    renderInvoices();
}
function payInvoice(id) {
    const inv = invoices.find(x => x.id === id);
    if (inv) { inv.status = 'paid'; showToast('Đã thanh toán HD' + String(id).padStart(3, '0'), 'success'); renderInvoices(); }
}
function viewInvoice(id) {
    const inv = invoices.find(x => x.id === id);
    if (!inv) return;
    const content = document.getElementById('invoiceDetailContent');
    if (!content) return;
    content.innerHTML =
        '<div class="invoice-print"><div style="text-align:center;margin-bottom:20px"><h2 style="color:var(--orange-primary)">QUÁN NHẬU TỰ DO</h2><p>Hóa đơn: <strong>HD' + String(inv.id).padStart(3, '0') + '</strong></p><p>Ngày: ' + inv.date + '</p></div>' +
        '<table class="data-table"><thead><tr><th>Món</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>' +
        inv.items.map(it => '<tr><td>' + it.name + '</td><td>' + it.qty + '</td><td>' + fmt(it.price) + '</td><td>' + fmt(it.price * it.qty) + '</td></tr>').join('') +
        '</tbody></table>' +
        '<div style="margin-top:16px;text-align:right"><p>Tiền món: <strong>' + fmt(inv.total) + '</strong></p>' +
        (inv.discount > 0 ? '<p>Voucher (' + inv.voucher + '): <strong style="color:#e74c3c">-' + fmt(inv.discount) + '</strong></p>' : '') +
        '<p style="font-size:1.2em">Tổng: <strong style="color:var(--orange-primary)">' + fmt(inv.finalTotal) + '</strong></p>' +
        '<p>Thanh toán: ' + inv.payMethod + ' | Trạng thái: ' + (inv.status === 'paid' ? '✅ Đã TT' : '⏳ Chờ TT') + '</p></div>' +
        '<div style="margin-top:16px"><p>Bàn: ' + getTableName(inv.tableId) + ' | KH: ' + getCustName(inv.custId) + ' | NV: ' + getEmpName(inv.empId) + '</p></div></div>';
    openModal('invoiceDetailModal');
    editingId = null;
}

// ===================== VOUCHERS =====================
function renderVouchers() {
    const tbody = document.getElementById('voucherTableBody');
    if (!tbody) return;
    tbody.innerHTML = vouchers.map(v =>
        '<tr><td>' + v.id + '</td><td>' + v.desc + '</td><td>' + v.percent + '%</td><td>' + v.qty + '</td><td>' +
        '<button class="btn-edit" onclick="editVoucher(\'' + v.id + '\')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteVoucher(\'' + v.id + '\')"><i class="fas fa-trash"></i></button></td></tr>'
    ).join('');
}
function saveVoucher() {
    const id = document.getElementById('vcId').value.trim();
    const desc = document.getElementById('vcDesc').value.trim();
    const percent = parseInt(document.getElementById('vcPercent').value);
    const qty = parseInt(document.getElementById('vcQty').value);
    if (!id || !percent) return showToast('Vui lòng nhập đầy đủ!', 'warning');
    if (editingId) {
        const v = vouchers.find(x => x.id === editingId);
        if (v) { v.id = id; v.desc = desc; v.percent = percent; v.qty = qty; }
        showToast('Đã cập nhật voucher', 'success');
    } else {
        vouchers.push({ id, desc, percent, qty });
        showToast('Thêm voucher thành công', 'success');
    }
    closeModal('voucherModal');
    document.getElementById('vcId').value = '';
    document.getElementById('vcDesc').value = '';
    document.getElementById('vcPercent').value = '';
    document.getElementById('vcQty').value = '';
    renderVouchers();
}
function editVoucher(id) {
    const v = vouchers.find(x => x.id === id);
    if (!v) return;
    editingId = id;
    document.getElementById('vcId').value = v.id;
    document.getElementById('vcDesc').value = v.desc;
    document.getElementById('vcPercent').value = v.percent;
    document.getElementById('vcQty').value = v.qty;
    openModal('voucherModal');
    editingId = id;
}
function deleteVoucher(id) {
    if (!confirm('Xóa voucher này?')) return;
    vouchers = vouchers.filter(x => x.id !== id);
    showToast('Đã xóa voucher', 'warning');
    renderVouchers();
}

// ===================== INGREDIENTS =====================
function renderIngredients() {
    const tbody = document.getElementById('ingredientTableBody');
    if (!tbody) return;
    tbody.innerHTML = ingredients.map((g, i) => {
        const stClass = g.stock <= 5 ? 'badge-red' : g.stock <= 15 ? 'badge-orange' : 'badge-green';
        const stText = g.stock <= 5 ? 'Sắp hết' : g.stock <= 15 ? 'Trung bình' : 'Đủ dùng';
        return '<tr><td>' + (i + 1) + '</td><td>' + g.name + '</td><td>' + g.unit + '</td><td>' + fmt(g.price) +
            '</td><td>' + getSupName(g.supplierId) + '</td><td>' + g.stock + ' ' + g.unit +
            '</td><td><span class="badge-status ' + stClass + '"><span class="badge-dot"></span> ' + stText + '</span></td><td>' +
            '<button class="btn-edit" onclick="editIngredient(' + g.id + ')"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-delete" onclick="deleteIngredient(' + g.id + ')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('');
}
function saveIngredient() {
    const name = document.getElementById('ingName').value.trim();
    const price = parseInt(document.getElementById('ingPrice').value);
    const unit = document.getElementById('ingUnit').value;
    const supplierId = parseInt(document.getElementById('ingSupplier').value) || null;
    if (!name || !price) return showToast('Vui lòng nhập đầy đủ!', 'warning');
    if (editingId) {
        const g = ingredients.find(x => x.id === editingId);
        if (g) { g.name = name; g.price = price; g.unit = unit; g.supplierId = supplierId; }
        showToast('Đã cập nhật nguyên liệu', 'success');
    } else {
        ingredients.push({ id: Date.now(), name, unit, price, supplierId, stock: 0 });
        showToast('Thêm nguyên liệu thành công', 'success');
    }
    closeModal('ingredientModal');
    document.getElementById('ingName').value = '';
    document.getElementById('ingPrice').value = '';
    renderIngredients();
}
function editIngredient(id) {
    const g = ingredients.find(x => x.id === id);
    if (!g) return;
    editingId = id;
    document.getElementById('ingName').value = g.name;
    document.getElementById('ingPrice').value = g.price;
    document.getElementById('ingUnit').value = g.unit;
    // Populate supplier dropdown
    const sel = document.getElementById('ingSupplier');
    if (sel) {
        sel.innerHTML = '<option value="">-- Chọn --</option>' + suppliers.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
        sel.value = g.supplierId || '';
    }
    openModal('ingredientModal');
    editingId = id;
}
function deleteIngredient(id) {
    if (!confirm('Xóa nguyên liệu này?')) return;
    ingredients = ingredients.filter(x => x.id !== id);
    showToast('Đã xóa nguyên liệu', 'warning');
    renderIngredients();
}

// ===================== SUPPLIERS =====================
function renderSuppliers() {
    const tbody = document.getElementById('supplierTableBody');
    if (!tbody) return;
    tbody.innerHTML = suppliers.map((s, i) =>
        '<tr><td>' + (i + 1) + '</td><td>' + s.name + '</td><td>' + s.address + '</td><td>' + s.phone + '</td><td>' +
        '<button class="btn-edit" onclick="editSupplier(' + s.id + ')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteSupplier(' + s.id + ')"><i class="fas fa-trash"></i></button></td></tr>'
    ).join('');
}
function saveSupplier() {
    const name = document.getElementById('supName').value.trim();
    const address = document.getElementById('supAddress').value.trim();
    const phone = document.getElementById('supPhone').value.trim();
    if (!name) return showToast('Vui lòng nhập tên NCC!', 'warning');
    if (editingId) {
        const s = suppliers.find(x => x.id === editingId);
        if (s) { s.name = name; s.address = address; s.phone = phone; }
        showToast('Đã cập nhật NCC', 'success');
    } else {
        suppliers.push({ id: Date.now(), name, address, phone });
        showToast('Thêm NCC thành công', 'success');
    }
    closeModal('supplierModal');
    document.getElementById('supName').value = '';
    document.getElementById('supAddress').value = '';
    document.getElementById('supPhone').value = '';
    renderSuppliers();
}
function editSupplier(id) {
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    editingId = id;
    document.getElementById('supName').value = s.name;
    document.getElementById('supAddress').value = s.address;
    document.getElementById('supPhone').value = s.phone;
    openModal('supplierModal');
    editingId = id;
}
function deleteSupplier(id) {
    if (!confirm('Xóa NCC này?')) return;
    suppliers = suppliers.filter(x => x.id !== id);
    showToast('Đã xóa NCC', 'warning');
    renderSuppliers();
}

// ===================== INVENTORY (RECEIPTS) =====================
function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    let filtered = receipts;
    if (invTabFilter === 'import') filtered = receipts.filter(r => r.type === 'import');
    else if (invTabFilter === 'export') filtered = receipts.filter(r => r.type === 'export');
    tbody.innerHTML = filtered.map((r, i) => {
        const typeClass = r.type === 'import' ? 'badge-green' : 'badge-red';
        const typeText = r.type === 'import' ? 'Nhập' : 'Xuất';
        return '<tr><td>' + (i + 1) + '</td><td><span class="badge-status ' + typeClass + '"><span class="badge-dot"></span> ' + typeText + '</span></td>' +
            '<td>' + r.date + '</td><td>' + getEmpName(r.empId) + '</td><td>' + (r.supplierId ? getSupName(r.supplierId) : '—') +
            '</td><td>' + r.ingredientName + ' (' + r.qty + ')</td><td>' + fmt(r.total) + '</td><td>' +
            '<button class="btn-edit" onclick="viewReceipt(' + r.id + ')"><i class="fas fa-eye"></i></button></td></tr>';
    }).join('');
}
function filterInventory(type) {
    invTabFilter = type;
    document.querySelectorAll('.inv-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.inv-tab-btn[data-type="' + type + '"]');
    if (btn) btn.classList.add('active');
    renderInventory();
}
function saveReceipt() {
    const type = document.getElementById('rcpType').value;
    const date = document.getElementById('rcpDate').value || new Date().toISOString().slice(0, 10);
    const empId = parseInt(document.getElementById('rcpEmp').value);
    const supplierId = parseInt(document.getElementById('rcpSupplier').value) || null;
    const ingredientId = parseInt(document.getElementById('rcpIngredient').value);
    const qty = parseInt(document.getElementById('rcpQty').value);
    if (!ingredientId || !qty) return showToast('Vui lòng nhập đầy đủ!', 'warning');
    const ing = ingredients.find(g => g.id === ingredientId);
    if (!ing) return showToast('NL không tồn tại!', 'error');
    if (type === 'export' && ing.stock < qty) return showToast('Không đủ tồn kho!', 'error');
    // Update stock
    if (type === 'import') ing.stock += qty; else ing.stock -= qty;
    receipts.push({
        id: receipts.length + 1, type, date, empId, supplierId,
        ingredientId, ingredientName: ing.name, qty, unitPrice: ing.price,
        total: qty * ing.price
    });
    showToast((type === 'import' ? 'Nhập' : 'Xuất') + ' kho thành công', 'success');
    closeModal('receiptModal');
    renderInventory();
}
function viewReceipt(id) {
    const r = receipts.find(x => x.id === id);
    if (!r) return;
    const content = document.getElementById('receiptDetailContent');
    if (!content) return;
    content.innerHTML =
        '<h3 style="color:var(--orange-primary)">Phiếu ' + (r.type === 'import' ? 'Nhập' : 'Xuất') + ' Kho #' + r.id + '</h3>' +
        '<p><strong>Ngày:</strong> ' + r.date + '</p>' +
        '<p><strong>NV thực hiện:</strong> ' + getEmpName(r.empId) + '</p>' +
        (r.supplierId ? '<p><strong>NCC:</strong> ' + getSupName(r.supplierId) + '</p>' : '') +
        '<table class="data-table"><thead><tr><th>Nguyên liệu</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>' +
        '<tr><td>' + r.ingredientName + '</td><td>' + r.qty + '</td><td>' + fmt(r.unitPrice) + '</td><td>' + fmt(r.total) + '</td></tr>' +
        '</tbody></table>';
    openModal('receiptDetailModal');
    editingId = null;
}

// Populate receipt modal dropdowns on open
const origOpenModal = openModal;
openModal = function (id) {
    origOpenModal(id);
    if (id === 'receiptModal') {
        const rcpEmp = document.getElementById('rcpEmp');
        const rcpSup = document.getElementById('rcpSupplier');
        const rcpIng = document.getElementById('rcpIngredient');
        if (rcpEmp) rcpEmp.innerHTML = employees.map(e => '<option value="' + e.id + '">' + e.name + '</option>').join('');
        if (rcpSup) rcpSup.innerHTML = '<option value="">— Không —</option>' + suppliers.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
        if (rcpIng) rcpIng.innerHTML = ingredients.map(g => '<option value="' + g.id + '">' + g.name + ' (' + g.stock + ' ' + g.unit + ')</option>').join('');
        const rcpDate = document.getElementById('rcpDate');
        if (rcpDate) rcpDate.value = new Date().toISOString().slice(0, 10);
    }
    if (id === 'ingredientModal') {
        const sel = document.getElementById('ingSupplier');
        if (sel && !editingId) sel.innerHTML = '<option value="">-- Chọn --</option>' + suppliers.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
    }
    if (id === 'deliveryReqModal') {
        const sel = document.getElementById('delCust');
        if (sel) sel.innerHTML = customers.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
    }
};

// ===================== VEHICLES =====================
function renderVehicles() {
    const tbody = document.getElementById('vehicleTableBody');
    if (!tbody) return;
    tbody.innerHTML = vehicles.map((v, i) => {
        const stMap = { available: ['badge-green', 'Sẵn sàng'], in_use: ['badge-orange', 'Đang dùng'], maintenance: ['badge-red', 'Bảo trì'] };
        const [cls, txt] = stMap[v.status] || ['badge-green', v.status];
        return '<tr><td>' + (i + 1) + '</td><td>' + v.plate + '</td><td>' + v.type + '</td><td>' + v.seats +
            '</td><td><span class="badge-status ' + cls + '"><span class="badge-dot"></span> ' + txt + '</span></td><td>' +
            '<button class="btn-edit" onclick="editVehicle(' + v.id + ')"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-delete" onclick="deleteVehicle(' + v.id + ')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('');
}
function saveVehicle() {
    const plate = document.getElementById('vehPlate').value.trim();
    const type = document.getElementById('vehType').value.trim();
    const seats = parseInt(document.getElementById('vehSeats').value) || 4;
    const status = document.getElementById('vehStatus').value;
    if (!plate) return showToast('Vui lòng nhập biển số!', 'warning');
    if (editingId) {
        const v = vehicles.find(x => x.id === editingId);
        if (v) { v.plate = plate; v.type = type; v.seats = seats; v.status = status; }
        showToast('Đã cập nhật xe', 'success');
    } else {
        vehicles.push({ id: Date.now(), plate, type, seats, status });
        showToast('Thêm xe thành công', 'success');
    }
    closeModal('vehicleModal');
    document.getElementById('vehPlate').value = '';
    document.getElementById('vehType').value = '';
    document.getElementById('vehSeats').value = '';
    renderVehicles();
}
function editVehicle(id) {
    const v = vehicles.find(x => x.id === id);
    if (!v) return;
    editingId = id;
    document.getElementById('vehPlate').value = v.plate;
    document.getElementById('vehType').value = v.type;
    document.getElementById('vehSeats').value = v.seats;
    document.getElementById('vehStatus').value = v.status;
    openModal('vehicleModal');
    editingId = id;
}
function deleteVehicle(id) {
    if (!confirm('Xóa xe này?')) return;
    vehicles = vehicles.filter(x => x.id !== id);
    showToast('Đã xóa xe', 'warning');
    renderVehicles();
}

// ===================== DELIVERY =====================
function renderDelivery() {
    const tbody = document.getElementById('deliveryTableBody');
    const ttbody = document.getElementById('tripTableBody');
    if (tbody) {
        tbody.innerHTML = deliveryReqs.map((d, i) => {
            const stMap = { pending: ['badge-orange', 'Chờ'], assigned: ['badge-green', 'Đã giao xe'], completed: ['badge-green', 'Hoàn tất'] };
            const [cls, txt] = stMap[d.status] || ['badge-orange', d.status];
            return '<tr><td>' + (i + 1) + '</td><td>' + getCustName(d.custId) + '</td><td>' + d.pickup + '</td><td>' + d.dropoff +
                '</td><td>' + d.time.replace('T', ' ') + '</td><td>' + d.guests + '</td><td><span class="badge-status ' + cls + '"><span class="badge-dot"></span> ' + txt + '</span></td>' +
                '<td>' + (d.status === 'pending' ? '<button class="btn-edit" onclick="assignDelivery(' + d.id + ')"><i class="fas fa-car"></i> Giao xe</button>' : '✓') + '</td></tr>';
        }).join('');
    }
    if (ttbody) {
        ttbody.innerHTML = trips.map((t, i) => {
            const veh = vehicles.find(v => v.id === t.vehicleId);
            return '<tr><td>' + (i + 1) + '</td><td>' + getCustName(t.custId) + '</td><td>' + (veh ? veh.plate : 'N/A') +
                '</td><td>' + getEmpName(t.driverId) + '</td><td>' + t.departure + '</td><td><span class="badge-status badge-green"><span class="badge-dot"></span> ' + t.status + '</span></td></tr>';
        }).join('');
    }
}
function saveDeliveryReq() {
    const custId = parseInt(document.getElementById('delCust').value);
    const pickup = document.getElementById('delPickup').value.trim();
    const dropoff = document.getElementById('delDropoff').value.trim();
    const time = document.getElementById('delTime').value;
    const guests = parseInt(document.getElementById('delGuests').value) || 1;
    const note = document.getElementById('delNote').value.trim();
    if (!custId || !pickup) return showToast('Vui lòng nhập đầy đủ!', 'warning');
    deliveryReqs.push({ id: deliveryReqs.length + 1, custId, pickup, dropoff: dropoff || 'Quán Nhậu Tự Do', time, guests, status: 'pending', note });
    showToast('Tạo yêu cầu đưa đón thành công', 'success');
    closeModal('deliveryReqModal');
    renderDelivery();
}
function assignDelivery(id) {
    const d = deliveryReqs.find(x => x.id === id);
    if (!d) return;
    const avail = vehicles.filter(v => v.status === 'available' && v.seats >= d.guests);
    if (avail.length === 0) return showToast('Không có xe phù hợp!', 'error');
    const veh = avail[0];
    const driver = employees.find(e => e.role === 'Tài xế');
    if (!driver) return showToast('Không có tài xế!', 'error');
    d.status = 'assigned';
    veh.status = 'in_use';
    trips.push({ id: trips.length + 1, custId: d.custId, vehicleId: veh.id, driverId: driver.id, departure: d.time.split('T')[1] || '—', status: 'Đang đón' });
    showToast('Đã giao xe ' + veh.plate + ' cho ' + getCustName(d.custId), 'success');
    renderDelivery();
}

// ===================== REPORT: REVENUE =====================
function renderReportRevenue() {
    const from = document.getElementById('revDateFrom').value;
    const to = document.getElementById('revDateTo').value;
    const filtered = invoices.filter(inv => inv.date >= from && inv.date <= to);
    const paid = filtered.filter(i => i.status === 'paid');
    const totalRev = paid.reduce((s, i) => s + i.finalTotal, 0);
    const totalPending = filtered.filter(i => i.status === 'pending').reduce((s, i) => s + i.finalTotal, 0);
    const avgPerInv = paid.length > 0 ? Math.round(totalRev / paid.length) : 0;
    const totalDiscount = paid.reduce((s, i) => s + (i.discount || 0), 0);

    const statsEl = document.getElementById('revenueStats');
    if (statsEl) {
        statsEl.innerHTML =
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#27ae60,#2ecc71)"><i class="fas fa-money-bill-wave"></i></div><div class="report-stat-info"><h3>' + fmt(totalRev) + '</h3><p>Tổng doanh thu</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#f39c12,#e67e22)"><i class="fas fa-hourglass-half"></i></div><div class="report-stat-info"><h3>' + fmt(totalPending) + '</h3><p>Chờ thanh toán</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#3498db,#2980b9)"><i class="fas fa-file-invoice"></i></div><div class="report-stat-info"><h3>' + paid.length + '/' + filtered.length + '</h3><p>Đã TT / Tổng HĐ</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#9b59b6,#8e44ad)"><i class="fas fa-calculator"></i></div><div class="report-stat-info"><h3>' + fmt(avgPerInv) + '</h3><p>Trung bình / HĐ</p></div></div>';
    }

    // Bar chart - revenue by day with gradient bars
    const dailyMap = {};
    paid.forEach(inv => { dailyMap[inv.date] = (dailyMap[inv.date] || 0) + inv.finalTotal; });
    const days = Object.keys(dailyMap).sort();
    const maxRev = Math.max(...Object.values(dailyMap), 1);
    const barChart = document.getElementById('revenueBarChart');
    if (barChart) {
        const barColors = ['#f39c12','#e67e22','#27ae60','#3498db','#9b59b6','#1abc9c','#e74c3c','#2c3e50'];
        barChart.innerHTML = '<div class="bar-chart">' + days.map((d, i) => {
            const pct = Math.round(dailyMap[d] / maxRev * 100);
            const c = barColors[i % barColors.length];
            return '<div class="bar-group"><div class="bar-wrapper"><div class="bar" style="height:' + pct + '%;background:linear-gradient(to top,' + c + ',' + c + '99);border-radius:6px 6px 0 0;transition:height 0.6s ease ' + (i*0.08) + 's"></div></div><div class="bar-label">' + d.slice(5) + '</div><div class="bar-value">' + (dailyMap[d]/1000000).toFixed(1) + 'tr</div></div>';
        }).join('') + '</div>';
    }

    // Donut chart - paid vs pending with better visual
    const donutChart = document.getElementById('revenueDonutChart');
    if (donutChart) {
        const total = totalRev + totalPending;
        const paidPct = total > 0 ? Math.round(totalRev / total * 100) : 0;
        const pendPct = 100 - paidPct;
        donutChart.innerHTML =
            '<div class="donut-chart"><svg viewBox="0 0 42 42" class="donut-svg">' +
            '<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#eee" stroke-width="5"></circle>' +
            '<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#27ae60" stroke-width="5" stroke-dasharray="' + paidPct + ' ' + pendPct + '" stroke-dashoffset="25" stroke-linecap="round" style="transition:stroke-dasharray 1s ease"></circle>' +
            '<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f39c12" stroke-width="5" stroke-dasharray="' + pendPct + ' ' + paidPct + '" stroke-dashoffset="' + (25 - paidPct) + '" stroke-linecap="round"></circle>' +
            '</svg><div class="donut-center"><strong style="font-size:1.5em;color:#27ae60">' + paidPct + '%</strong><br><span style="font-size:0.75em;color:#888">Đã thanh toán</span></div></div>' +
            '<div class="donut-legend"><div class="legend-item"><span class="legend-dot" style="background:#27ae60"></span> Đã TT: <strong>' + fmt(totalRev) + '</strong></div>' +
            '<div class="legend-item"><span class="legend-dot" style="background:#f39c12"></span> Chờ TT: <strong>' + fmt(totalPending) + '</strong></div>' +
            '<div class="legend-item"><span class="legend-dot" style="background:#e74c3c"></span> Giảm giá: <strong>' + fmt(totalDiscount) + '</strong></div></div>';
    }

    // Payment method breakdown
    const pmChart = document.getElementById('payMethodChart');
    if (pmChart) {
        const pmMap = {};
        paid.forEach(inv => { pmMap[inv.payMethod] = (pmMap[inv.payMethod] || 0) + inv.finalTotal; });
        const pmEntries = Object.entries(pmMap).sort((a,b) => b[1] - a[1]);
        const pmColors = {
            'Tiền mặt': '#27ae60', 'Chuyển khoản': '#3498db',
            'VNPay': '#e74c3c', 'MoMo': '#9b59b6'
        };
        const pmIcons = {
            'Tiền mặt': 'money-bill-wave', 'Chuyển khoản': 'university',
            'VNPay': 'credit-card', 'MoMo': 'wallet'
        };
        let pmOffset = 25;
        const pmSegs = pmEntries.map(([m, v]) => {
            const pct = totalRev > 0 ? v / totalRev * 100 : 0;
            const c = pmColors[m] || '#888';
            const seg = '<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="' + c + '" stroke-width="5" stroke-dasharray="' + pct + ' ' + (100 - pct) + '" stroke-dashoffset="' + pmOffset + '" stroke-linecap="round"></circle>';
            pmOffset -= pct;
            return seg;
        }).join('');
        pmChart.innerHTML =
            '<div class="donut-chart"><svg viewBox="0 0 42 42" class="donut-svg"><circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#eee" stroke-width="5"></circle>' + pmSegs +
            '</svg><div class="donut-center"><i class="fas fa-credit-card" style="font-size:1.2em;color:var(--orange-primary)"></i><br><span style="font-size:0.7em;color:#888">Phương thức</span></div></div>' +
            '<div class="donut-legend">' + pmEntries.map(([m, v]) => {
                const pct = totalRev > 0 ? (v / totalRev * 100).toFixed(0) : 0;
                return '<div class="legend-item"><span class="legend-dot" style="background:' + (pmColors[m]||'#888') + '"></span> <i class="fas fa-' + (pmIcons[m]||'circle') + '" style="margin-right:4px"></i>' + m + ': <strong>' + pct + '%</strong></div>';
            }).join('') + '</div>';
    }

    // Consumption horizontal bar chart
    const consChart = document.getElementById('consumptionChart');
    if (consChart) {
        const foodSales = {};
        paid.forEach(inv => inv.items.forEach(it => {
            if (!foodSales[it.name]) foodSales[it.name] = { qty: 0, rev: 0 };
            foodSales[it.name].qty += it.qty;
            foodSales[it.name].rev += it.price * it.qty;
        }));
        const entries = Object.entries(foodSales).sort((a, b) => b[1].rev - a[1].rev).slice(0, 6);
        const maxC = entries.length > 0 ? entries[0][1].rev : 1;
        const cColors = ['#e74c3c','#f39c12','#27ae60','#3498db','#9b59b6','#1abc9c'];
        consChart.innerHTML = '<div class="hbar-chart">' + entries.map(([name, data], i) => {
            const pct = Math.round(data.rev / maxC * 100);
            return '<div class="hbar-group"><div class="hbar-label">' + name.substring(0, 18) + '</div><div class="hbar-wrapper"><div class="hbar" style="width:' + pct + '%;background:linear-gradient(to right,' + cColors[i % cColors.length] + ',' + cColors[i % cColors.length] + '88);transition:width 0.6s ease ' + (i*0.1) + 's"></div></div><div class="hbar-value">' + fmt(data.rev) + '</div></div>';
        }).join('') + '</div>';
    }

    // Invoice detail table
    const revBody = document.getElementById('revenueTableBody');
    if (revBody) {
        revBody.innerHTML = filtered.map(inv => {
            const stClass = inv.status === 'paid' ? 'badge-green' : 'badge-orange';
            const stText = inv.status === 'paid' ? 'Đã TT' : 'Chờ TT';
            return '<tr><td>HD' + String(inv.id).padStart(3, '0') + '</td><td>' + inv.date + '</td><td>' + getTableName(inv.tableId) +
                '</td><td>' + getCustName(inv.custId) + '</td><td>' + inv.items.length + '</td><td>' + fmt(inv.finalTotal) +
                '</td><td>' + inv.payMethod + '</td><td><span class="badge-status ' + stClass + '"><span class="badge-dot"></span> ' + stText + '</span></td></tr>';
        }).join('');
    }
}

// ===================== REPORT: BESTSELLER =====================
function renderReportBestseller() {
    const paid = invoices.filter(i => i.status === 'paid');
    const foodMap = {};
    paid.forEach(inv => inv.items.forEach(it => {
        if (!foodMap[it.name]) foodMap[it.name] = { qty: 0, rev: 0, category: '', count: 0 };
        foodMap[it.name].qty += it.qty;
        foodMap[it.name].rev += it.price * it.qty;
        foodMap[it.name].count++;
        const f = foods.find(x => x.name === it.name);
        if (f) foodMap[it.name].category = f.category;
    }));
    const sorted = Object.entries(foodMap).sort((a, b) => b[1].qty - a[1].qty);
    const totalQty = sorted.reduce((s, [, d]) => s + d.qty, 0);
    const totalRev = sorted.reduce((s, [, d]) => s + d.rev, 0);

    // Stats
    const statsEl = document.getElementById('bestsellerStats');
    if (statsEl) {
        statsEl.innerHTML =
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#e74c3c,#c0392b)"><i class="fas fa-fire"></i></div><div class="report-stat-info"><h3>' + (sorted.length > 0 ? sorted[0][0] : 'N/A') + '</h3><p>Top 1 bán chạy</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#27ae60,#2ecc71)"><i class="fas fa-shopping-bag"></i></div><div class="report-stat-info"><h3>' + totalQty + '</h3><p>Tổng SL bán</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#f39c12,#e67e22)"><i class="fas fa-coins"></i></div><div class="report-stat-info"><h3>' + fmt(totalRev) + '</h3><p>Tổng doanh thu</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#9b59b6,#8e44ad)"><i class="fas fa-utensils"></i></div><div class="report-stat-info"><h3>' + sorted.length + '</h3><p>Loại món bán</p></div></div>';
    }

    // Bestseller bar chart (top 8) with medal icons
    const top8 = sorted.slice(0, 8);
    const maxQty = top8.length > 0 ? top8[0][1].qty : 1;
    const bsChart = document.getElementById('bestsellerChart');
    if (bsChart) {
        const medals = ['🥇','🥈','🥉'];
        const colors = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50'];
        bsChart.innerHTML = '<div class="hbar-chart">' + top8.map(([name, data], i) => {
            const pct = Math.round(data.qty / maxQty * 100);
            const medal = i < 3 ? medals[i] + ' ' : '';
            return '<div class="hbar-group"><div class="hbar-label">' + medal + name + '</div><div class="hbar-wrapper"><div class="hbar" style="width:' + pct + '%;background:linear-gradient(to right,' + colors[i % colors.length] + ',' + colors[i % colors.length] + '99);border-radius:6px;transition:width 0.6s ease ' + (i*0.1) + 's"></div></div><div class="hbar-value"><strong>' + data.qty + '</strong> phần</div></div>';
        }).join('') + '</div>';
    }

    // Category donut with improved visual
    const catMap = {};
    sorted.forEach(([, data]) => { catMap[data.category || 'Khác'] = (catMap[data.category || 'Khác'] || 0) + data.rev; });
    const catDonut = document.getElementById('categoryDonutChart');
    if (catDonut) {
        const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const catColors = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50'];
        let offset = 25;
        const segments = catEntries.map(([cat, rev], i) => {
            const pct = totalRev > 0 ? rev / totalRev * 100 : 0;
            const seg = '<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="' + catColors[i % catColors.length] + '" stroke-width="5" stroke-dasharray="' + pct + ' ' + (100 - pct) + '" stroke-dashoffset="' + offset + '" stroke-linecap="round"></circle>';
            offset -= pct;
            return seg;
        }).join('');
        catDonut.innerHTML =
            '<div class="donut-chart"><svg viewBox="0 0 42 42" class="donut-svg"><circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#eee" stroke-width="5"></circle>' + segments + '</svg><div class="donut-center"><strong style="font-size:1.3em">' + catEntries.length + '</strong><br><span style="font-size:0.7em;color:#888">Danh mục</span></div></div>' +
            '<div class="donut-legend">' + catEntries.map(([cat, rev], i) => {
                const pct = totalRev > 0 ? (rev / totalRev * 100).toFixed(0) : 0;
                return '<div class="legend-item"><span class="legend-dot" style="background:' + catColors[i % catColors.length] + '"></span> ' + cat + ': <strong>' + pct + '%</strong></div>';
            }).join('') + '</div>';
    }

    // Food revenue chart with animated bars
    const frChart = document.getElementById('foodRevenueChart');
    if (frChart) {
        const maxFR = sorted.length > 0 ? sorted[0][1].rev : 1;
        const frColors = ['#e74c3c','#f39c12','#27ae60','#3498db','#9b59b6','#1abc9c','#e67e22','#2c3e50','#16a085','#c0392b'];
        frChart.innerHTML = '<div class="hbar-chart">' + sorted.slice(0, 10).map(([name, data], i) => {
            const pct = Math.round(data.rev / maxFR * 100);
            return '<div class="hbar-group"><div class="hbar-label">' + name + '</div><div class="hbar-wrapper"><div class="hbar" style="width:' + pct + '%;background:linear-gradient(to right,' + frColors[i % frColors.length] + ',' + frColors[i % frColors.length] + '88);border-radius:6px;transition:width 0.6s ease ' + (i*0.08) + 's"></div></div><div class="hbar-value">' + fmt(data.rev) + '</div></div>';
        }).join('') + '</div>';
    }

    // Detail table with rank badges
    const bsBody = document.getElementById('bestsellerTableBody');
    if (bsBody) {
        const medals = ['🥇','🥈','🥉'];
        bsBody.innerHTML = sorted.map(([name, data], i) => {
            const revPct = totalRev > 0 ? (data.rev / totalRev * 100).toFixed(1) : 0;
            const avg = data.count > 0 ? (data.qty / data.count).toFixed(1) : 0;
            const rank = i < 3 ? medals[i] : '#' + (i + 1);
            return '<tr><td><strong>' + rank + '</strong></td><td>' + name + '</td><td>' + (data.category || '—') + '</td><td><strong>' + data.qty +
                '</strong></td><td>' + fmt(data.rev) + '</td><td>' + revPct + '%</td><td>' + avg + '</td></tr>';
        }).join('');
    }
}

// ===================== REPORT: STOCK =====================
function renderReportStock() {
    const totalValue = ingredients.reduce((s, g) => s + g.stock * g.price, 0);
    const totalImport = receipts.filter(r => r.type === 'import').reduce((s, r) => s + r.total, 0);
    const totalExport = receipts.filter(r => r.type === 'export').reduce((s, r) => s + r.total, 0);
    const lowStock = ingredients.filter(g => g.stock <= 5).length;

    // Stats
    const statsEl = document.getElementById('stockStats');
    if (statsEl) {
        statsEl.innerHTML =
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#3498db,#2980b9)"><i class="fas fa-warehouse"></i></div><div class="report-stat-info"><h3>' + fmt(totalValue) + '</h3><p>Giá trị tồn kho</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#27ae60,#2ecc71)"><i class="fas fa-arrow-down"></i></div><div class="report-stat-info"><h3>' + fmt(totalImport) + '</h3><p>Tổng nhập</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#e74c3c,#c0392b)"><i class="fas fa-arrow-up"></i></div><div class="report-stat-info"><h3>' + fmt(totalExport) + '</h3><p>Tổng xuất</p></div></div>' +
            '<div class="report-stat-card"><div class="report-stat-icon" style="background:linear-gradient(135deg,#f39c12,#e67e22)"><i class="fas fa-exclamation-triangle"></i></div><div class="report-stat-info"><h3>' + lowStock + '</h3><p>Sắp hết hàng</p></div></div>';
    }

    // Stock bar chart with color-coded gradient bars
    const sbc = document.getElementById('stockBarChart');
    if (sbc) {
        const maxStock = Math.max(...ingredients.map(g => g.stock), 1);
        sbc.innerHTML = '<div class="bar-chart">' + ingredients.map((g, i) => {
            const pct = Math.round(g.stock / maxStock * 100);
            const color = g.stock <= 5 ? '#e74c3c' : g.stock <= 15 ? '#f39c12' : '#27ae60';
            const icon = g.stock <= 5 ? '⚠️' : '';
            return '<div class="bar-group"><div class="bar-wrapper"><div class="bar" style="height:' + pct + '%;background:linear-gradient(to top,' + color + ',' + color + '99);border-radius:6px 6px 0 0;transition:height 0.6s ease ' + (i*0.08) + 's"></div></div><div class="bar-label">' + g.name.substring(0, 6) + '</div><div class="bar-value">' + icon + g.stock + '</div></div>';
        }).join('') + '</div>';
    }

    // Stock value donut with improved visual
    const sdc = document.getElementById('stockDonutChart');
    if (sdc) {
        const top5 = [...ingredients].sort((a, b) => (b.stock * b.price) - (a.stock * a.price)).slice(0, 5);
        const colors = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];
        let offset = 25;
        const segments = top5.map((g, i) => {
            const pct = totalValue > 0 ? (g.stock * g.price) / totalValue * 100 : 0;
            const seg = '<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="' + colors[i] + '" stroke-width="5" stroke-dasharray="' + pct + ' ' + (100 - pct) + '" stroke-dashoffset="' + offset + '" stroke-linecap="round"></circle>';
            offset -= pct;
            return seg;
        }).join('');
        sdc.innerHTML =
            '<div class="donut-chart"><svg viewBox="0 0 42 42" class="donut-svg"><circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#eee" stroke-width="5"></circle>' + segments + '</svg><div class="donut-center"><strong style="font-size:1.3em">' + ingredients.length + '</strong><br><span style="font-size:0.7em;color:#888">Loại NL</span></div></div>' +
            '<div class="donut-legend">' + top5.map((g, i) => {
                const pct = totalValue > 0 ? ((g.stock * g.price) / totalValue * 100).toFixed(0) : 0;
                return '<div class="legend-item"><span class="legend-dot" style="background:' + colors[i] + '"></span> ' + g.name + ': <strong>' + pct + '%</strong></div>';
            }).join('') + '</div>';
    }

    // Import/Export history
    const shBody = document.getElementById('stockHistoryBody');
    if (shBody) {
        shBody.innerHTML = receipts.map(r => {
            const typeClass = r.type === 'import' ? 'badge-green' : 'badge-red';
            const typeText = r.type === 'import' ? 'Nhập' : 'Xuất';
            return '<tr><td>PK' + String(r.id).padStart(3, '0') + '</td><td><span class="badge-status ' + typeClass + '"><span class="badge-dot"></span> ' + typeText + '</span></td>' +
                '<td>' + r.date + '</td><td>' + getEmpName(r.empId) + '</td><td>' + (r.supplierId ? getSupName(r.supplierId) : '—') +
                '</td><td>' + r.ingredientName + '</td><td>' + r.qty + '</td><td>' + fmt(r.total) + '</td></tr>';
        }).join('');
    }

    // Stock detail table
    const stBody = document.getElementById('stockTableBody');
    if (stBody) {
        stBody.innerHTML = ingredients.map((g, i) => {
            const impQty = receipts.filter(r => r.ingredientId === g.id && r.type === 'import').reduce((s, r) => s + r.qty, 0);
            const expQty = receipts.filter(r => r.ingredientId === g.id && r.type === 'export').reduce((s, r) => s + r.qty, 0);
            const value = g.stock * g.price;
            const stClass = g.stock <= 5 ? 'badge-red' : g.stock <= 15 ? 'badge-orange' : 'badge-green';
            const stText = g.stock <= 5 ? '⚠️ Sắp hết' : g.stock <= 15 ? '⏳ TB' : '✅ Đủ';
            return '<tr><td>' + (i + 1) + '</td><td>' + g.name + '</td><td>' + g.unit + '</td><td style="color:#27ae60">' + impQty +
                '</td><td style="color:#e74c3c">' + expQty + '</td><td><strong>' + g.stock + '</strong></td><td>' + fmt(g.price) +
                '</td><td>' + fmt(value) + '</td><td><span class="badge-status ' + stClass + '"><span class="badge-dot"></span> ' + stText + '</span></td></tr>';
        }).join('');
    }
}

// ===================== RESERVATIONS =====================
function renderReservations() {
    const tbody = document.getElementById('reservationTableBody');
    if (!tbody) return;
    // Populate table select in modal
    const resSel = document.getElementById('resTable');
    if (resSel) {
        resSel.innerHTML = '<option value="">Tự động</option>' + tables.filter(t => t.status === 'available').map(t => '<option value="' + t.id + '">' + t.name + ' (' + t.seats + ' chỗ - ' + t.zone + ')</option>').join('');
    }
    let filtered = reservations;
    if (resFilter !== 'all') filtered = reservations.filter(r => r.status === resFilter);
    tbody.innerHTML = filtered.map(r => {
        const stColors = { pending: 'badge-orange', confirmed: 'badge-green', cancelled: 'badge-red' };
        const stTexts = { pending: 'Chờ XN', confirmed: 'Đã XN', cancelled: 'Đã hủy' };
        const tableName = r.tableId ? getTableName(r.tableId) : 'Chưa gán';
        return '<tr><td>RES' + String(r.id).padStart(3, '0') + '</td><td>' + r.name + '</td><td>' + r.phone +
            '</td><td>' + r.date + ' ' + r.time + '</td><td>' + r.guests + '</td><td>' + tableName +
            '</td><td><span class="badge-status ' + (stColors[r.status] || '') + '"><span class="badge-dot"></span> ' + (stTexts[r.status] || r.status) + '</span></td>' +
            '<td>' + (r.status === 'confirmed' ? '<button class="btn-edit" onclick="showQR(' + r.id + ')" title="Xem QR"><i class="fas fa-qrcode"></i></button>' : '—') + '</td>' +
            '<td>' +
            (r.status === 'pending' ? '<button class="btn-edit" style="background:#27ae60;color:#fff" onclick="confirmReservation(' + r.id + ')" title="Xác nhận"><i class="fas fa-check"></i></button> ' : '') +
            (r.status !== 'cancelled' ? '<button class="btn-delete" onclick="cancelReservation(' + r.id + ')" title="Hủy"><i class="fas fa-ban"></i></button>' : '') +
            '</td></tr>';
    }).join('');
}

function filterReservations(f) {
    resFilter = f;
    document.querySelectorAll('#page-reservations .inv-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('#page-reservations .inv-tab-btn[data-type="' + f + '"]');
    if (btn) btn.classList.add('active');
    renderReservations();
}

function saveReservation() {
    const name = document.getElementById('resName').value.trim();
    const phone = document.getElementById('resPhone').value.trim();
    const date = document.getElementById('resDate').value;
    const time = document.getElementById('resTime').value;
    const guests = parseInt(document.getElementById('resGuests').value);
    const tableId = parseInt(document.getElementById('resTable').value) || 0;
    const note = document.getElementById('resNote').value.trim();
    if (!name || !phone || !date || !time || !guests) return showToast('Vui lòng nhập đầy đủ thông tin!', 'warning');
    // Check table availability
    if (tableId) {
        const tbl = tables.find(t => t.id === tableId);
        if (tbl && tbl.status !== 'available') return showToast('Bàn ' + tbl.name + ' không khả dụng!', 'error');
    }
    const id = reservations.length > 0 ? Math.max(...reservations.map(r => r.id)) + 1 : 1;
    const qr = 'RES-' + String(id).padStart(3, '0') + '-QNTD';
    reservations.push({ id, name, phone, date, time, guests, tableId, status: 'pending', note, qr });
    showToast('Đặt bàn thành công! Đang chờ xác nhận...', 'success');
    closeModal('reservationModal');
    document.getElementById('resName').value = '';
    document.getElementById('resPhone').value = '';
    document.getElementById('resGuests').value = '';
    document.getElementById('resNote').value = '';
    renderReservations();
}

function confirmReservation(id) {
    const r = reservations.find(x => x.id === id);
    if (!r) return;
    // Auto-assign table if not set
    if (!r.tableId) {
        const available = tables.find(t => t.status === 'available' && t.seats >= r.guests);
        if (!available) return showToast('Không còn bàn phù hợp! Gợi ý thay đổi thời gian.', 'error');
        r.tableId = available.id;
    }
    // Update table status
    const tbl = tables.find(t => t.id === r.tableId);
    if (tbl) tbl.status = 'reserved';
    r.status = 'confirmed';
    showToast('Đã xác nhận đặt bàn RES' + String(id).padStart(3, '0') + ' - ' + getTableName(r.tableId), 'success');
    renderReservations();
}

function cancelReservation(id) {
    if (!confirm('Hủy đặt bàn này?')) return;
    const r = reservations.find(x => x.id === id);
    if (!r) return;
    // Free up the table
    if (r.tableId) {
        const tbl = tables.find(t => t.id === r.tableId);
        if (tbl && tbl.status === 'reserved') tbl.status = 'available';
    }
    r.status = 'cancelled';
    showToast('Đã hủy đặt bàn', 'warning');
    renderReservations();
}

function showQR(id) {
    const r = reservations.find(x => x.id === id);
    if (!r) return;
    const content = document.getElementById('qrContent');
    if (!content) return;
    // Generate a simple QR-like visual using SVG
    content.innerHTML =
        '<div style="background:white;padding:24px;border-radius:16px;border:3px dashed var(--orange-primary)">' +
        '<div style="width:160px;height:160px;background:linear-gradient(135deg,var(--green-dark),var(--green-primary));border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
        '<i class="fas fa-qrcode" style="font-size:80px;color:var(--orange-primary)"></i></div>' +
        '<p style="font-weight:700;font-size:18px;color:var(--green-dark)">' + r.qr + '</p>' +
        '<p style="font-size:13px;color:var(--gray-600);margin-top:8px">' + r.name + ' - ' + r.phone + '</p>' +
        '<p style="font-size:13px;color:var(--gray-500)">' + r.date + ' ' + r.time + ' | ' + r.guests + ' người | ' + getTableName(r.tableId) + '</p>' +
        '</div>' +
        '<p style="font-size:12px;color:var(--gray-500);margin-top:12px">Quét mã QR tại quầy lễ tân để check-in</p>';
    openModal('qrModal');
    editingId = null;
}

// ===================== ENHANCED PAYMENT =====================
function openPaymentModal(invId) {
    const inv = invoices.find(x => x.id === invId);
    if (!inv) return;
    const content = document.getElementById('paymentContent');
    if (!content) return;
    content.innerHTML =
        '<div style="text-align:center;margin-bottom:20px"><h3 style="color:var(--green-dark)">Hóa đơn HD' + String(inv.id).padStart(3, '0') + '</h3>' +
        '<p style="font-size:28px;font-weight:900;color:var(--orange-primary);margin:12px 0">' + fmt(inv.finalTotal) + '</p></div>' +
        '<div style="display:flex;flex-direction:column;gap:12px">' +
        '<button class="btn-primary" style="width:100%;justify-content:center;background:linear-gradient(135deg,#27ae60,#2ecc71)" onclick="processPayment(' + inv.id + ',\'Tiền mặt\')"><i class="fas fa-money-bill-wave"></i> Tiền mặt</button>' +
        '<button class="btn-primary" style="width:100%;justify-content:center;background:linear-gradient(135deg,#3498db,#2980b9)" onclick="processPayment(' + inv.id + ',\'Chuyển khoản\')"><i class="fas fa-university"></i> Chuyển khoản</button>' +
        '<button class="btn-primary" style="width:100%;justify-content:center;background:linear-gradient(135deg,#e74c3c,#c0392b)" onclick="processPayment(' + inv.id + ',\'VNPay\')"><i class="fas fa-credit-card"></i> VNPay</button>' +
        '<button class="btn-primary" style="width:100%;justify-content:center;background:linear-gradient(135deg,#9b59b6,#8e44ad)" onclick="processPayment(' + inv.id + ',\'MoMo\')"><i class="fas fa-wallet"></i> MoMo</button>' +
        '</div>';
    openModal('paymentModal');
    editingId = null;
}

function processPayment(invId, method) {
    const inv = invoices.find(x => x.id === invId);
    if (!inv) return;
    inv.status = 'paid';
    inv.payMethod = method;
    const txId = 'TXN' + Date.now().toString(36).toUpperCase();
    closeModal('paymentModal');
    showToast('✅ Thanh toán thành công qua ' + method + ' | Mã GD: ' + txId, 'success');
    // Free up the table
    const tbl = tables.find(t => t.id === inv.tableId);
    if (tbl) tbl.status = 'available';
    renderInvoices();
}
