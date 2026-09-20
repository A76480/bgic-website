/* ================= API HELPERS ================= */
const API = '/api';

function getAdminPassword() {
  return localStorage.getItem('bgic_admin_pass') || '';
}

function getCustomer() {
  const raw = localStorage.getItem('bgic_customer');
  return raw ? JSON.parse(raw) : null;
}
function setCustomer(customer) {
  localStorage.setItem('bgic_customer', JSON.stringify(customer));
}
function clearCustomer() {
  localStorage.removeItem('bgic_customer');
}

async function apiGet(path, admin) {
  const headers = {};
  if (admin) headers['x-admin-password'] = getAdminPassword();
  const res = await fetch(API + path, { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

async function apiSend(method, path, body, admin) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers['x-admin-password'] = getAdminPassword();
  const customer = getCustomer();
  if (customer && !admin) headers['x-customer-id'] = customer.id;
  const res = await fetch(API + path, { method, headers, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

/* ================= STATE ================= */
let products = [];
let rentals = [];
let orders = [];
let contracts = [];
let cart = JSON.parse(localStorage.getItem('bgic_cart') || '[]');

function saveCart() { localStorage.setItem('bgic_cart', JSON.stringify(cart)); }
function money(n) { return '₦' + Number(n).toLocaleString(); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= INIT ================= */
async function init() {
  await refreshCatalog();
  updateCartCount();
  renderCart();
  bindNav();
  bindStaticButtons();
  renderAccountState();

  // If already logged in as admin (password cached), show panel straight away
  if (getAdminPassword()) {
    try {
      await apiGet('/orders', true); // validates the cached password still works
      document.getElementById('adminGateWrap').style.display = 'none';
      document.getElementById('adminPanelWrap').style.display = 'block';
      await loadAdminData();
    } catch (e) {
      localStorage.removeItem('bgic_admin_pass');
    }
  }
}

async function refreshCatalog() {
  products = await apiGet('/products');
  rentals = await apiGet('/rentals');
  renderMaterials();
  renderRentals();
}

/* ================= NAV ================= */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('nav button[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindNav() {
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });
}

/* ================= MATERIALS / RENTALS DISPLAY ================= */
function renderMaterials() {
  const cats = ['All', ...new Set(products.map(p => p.category))];
  const chipsEl = document.getElementById('materialChips');
  const activeCat = chipsEl.dataset.active || 'All';
  chipsEl.innerHTML = cats.map(c => `<button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
  chipsEl.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', () => { chipsEl.dataset.active = ch.dataset.cat; renderMaterials(); });
  });

  const list = activeCat === 'All' ? products : products.filter(p => p.category === activeCat);
  document.getElementById('materialsCount').textContent = list.length + ' items';
  document.getElementById('materialsGrid').innerHTML = list.map(p => productCard(p)).join('') || `<div class="empty-note">No materials in this category yet.</div>`;
  bindCardButtons('materialsGrid');
}

function renderRentals() {
  document.getElementById('rentalsCount').textContent = rentals.length + ' items';
  document.getElementById('rentalsGrid').innerHTML = rentals.map(p => productCard(p)).join('') || `<div class="empty-note">No rental equipment listed yet.</div>`;
  bindCardButtons('rentalsGrid');
}

function productCard(p) {
  const stockClass = p.stock <= 0 ? 'stock-out' : p.stock < 10 ? 'stock-low' : 'stock-ok';
  const stockLabel = p.stock <= 0 ? 'Out of stock' : p.stock < 10 ? p.stock + ' left' : 'In stock';
  return `
    <div class="card">
      <div class="card-media">${p.category}</div>
      <div class="card-body">
        <div class="card-cat">${p.category}</div>
        <div class="card-name">${p.icon ? p.icon + ' ' : ''}${p.name}${p.localName ? ' <span style="font-weight:400;color:var(--concrete);font-size:14px;">(' + p.localName + ')</span>' : ''}</div>
        <div class="card-desc">${p.desc || ''}</div>
        <div class="card-foot">
          <div class="card-price">${money(p.price)}<small> / ${p.unit}</small></div>
          <span class="stock-tag ${stockClass}">${stockLabel}</span>
        </div>
        <div class="qty-row">
          <input type="number" min="1" value="1" id="qty-${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
          <button class="btn btn-amber btn-small" data-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
        </div>
      </div>
    </div>`;
}

function bindCardButtons(gridId) {
  document.getElementById(gridId).querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.add;
      const qtyInput = document.getElementById('qty-' + id);
      const qty = Math.max(1, parseInt(qtyInput.value) || 1);
      const existing = cart.find(c => c.productId === id);
      if (existing) { existing.qty += qty; } else { cart.push({ productId: id, qty }); }
      saveCart();
      updateCartCount();
      toast('Added to cart');
    });
  });
}

function findAnyProduct(id) {
  return products.find(p => p.id === id) || rentals.find(p => p.id === id);
}

/* ================= CART ================= */
function updateCartCount() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartCount').textContent = count;
}

function renderCart() {
  const area = document.getElementById('cartArea');
  if (cart.length === 0) {
    area.innerHTML = `<div class="empty-note">Your cart is empty. <br><br><button class="btn btn-amber" data-view="materials">Browse Materials</button></div>`;
    bindNav();
    return;
  }
  let total = 0;
  const itemsHtml = cart.map(c => {
    const p = findAnyProduct(c.productId);
    if (!p) return '';
    const lineTotal = p.price * c.qty;
    total += lineTotal;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="name">${p.name}</div>
          <div class="meta">${money(p.price)} / ${p.unit} · ${p.type === 'rental' ? 'Rental' : 'Material'}</div>
        </div>
        <div class="cart-qty">
          <button data-dec="${c.productId}">−</button>
          <span>${c.qty}</span>
          <button data-inc="${c.productId}">+</button>
        </div>
        <div style="width:100px;text-align:right;font-weight:700;">${money(lineTotal)}</div>
        <button class="btn btn-ghost btn-small" data-remove="${c.productId}">Remove</button>
      </div>`;
  }).join('');

  area.innerHTML = `
    <div class="cart-list">${itemsHtml}</div>
    <div class="cart-summary">
      <div class="row"><span>Items</span><span>${cart.reduce((s, c) => s + c.qty, 0)}</span></div>
      <div class="row total"><span>Total</span><span>${money(total)}</span></div>
    </div>
    <div style="text-align:right;margin-top:16px;">
      <button class="btn btn-amber" id="goCheckoutBtn">Proceed to Checkout</button>
    </div>
  `;

  area.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => {
    const c = cart.find(x => x.productId === b.dataset.inc); c.qty++;
    saveCart(); renderCart(); updateCartCount();
  }));
  area.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => {
    const c = cart.find(x => x.productId === b.dataset.dec); c.qty = Math.max(1, c.qty - 1);
    saveCart(); renderCart(); updateCartCount();
  }));
  area.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
    cart = cart.filter(x => x.productId !== b.dataset.remove);
    saveCart(); renderCart(); updateCartCount();
  }));
  document.getElementById('goCheckoutBtn').addEventListener('click', () => {
    if (!requireLogin('check out')) return;
    renderCheckout();
    showView('checkout');
  });
}

/* ================= CHECKOUT ================= */
function renderCheckout() {
  const customer = getCustomer();
  if (customer) {
    document.getElementById('chkName').value = customer.name;
    document.getElementById('chkPhone').value = customer.phone;
  }
  let total = 0;
  const rows = cart.map(c => {
    const p = findAnyProduct(c.productId);
    const lineTotal = p.price * c.qty;
    total += lineTotal;
    return `<div class="row"><span>${p.name} × ${c.qty}</span><span>${money(lineTotal)}</span></div>`;
  }).join('');
  document.getElementById('checkoutSummary').innerHTML = `
    ${rows}
    <div class="row total"><span>Total</span><span>${money(total)}</span></div>
    <button class="btn btn-amber" id="payNowBtn" style="width:100%;margin-top:16px;">Pay Now (Online)</button>
    <p style="font-size:11px;color:#B8B2A6;margin-top:10px;">Payment gateway placeholder — connect your Paystack/Flutterwave public key here before going live. See README.</p>
  `;
  document.getElementById('payNowBtn').addEventListener('click', placeOrder);
}

async function placeOrder() {
  if (!requireLogin('check out')) return;
  const customerName = document.getElementById('chkName').value.trim();
  const phone = document.getElementById('chkPhone').value.trim();
  const address = document.getElementById('chkAddress').value.trim();
  if (!customerName || !phone || !address) { toast('Please fill in all delivery details'); return; }

  const items = cart.map(c => ({ productId: c.productId, qty: c.qty }));

  try {
    const order = await apiSend('POST', '/orders', { customerName, phone, address, items });
    cart = [];
    saveCart();
    updateCartCount();
    await refreshCatalog(); // stock changed server-side
    document.getElementById('confOrderId').textContent = order.id;
    showView('confirmation');
  } catch (e) {
    toast('Order failed: ' + e.message);
  }
}

/* ================= CUSTOMER ACCOUNT ================= */
function renderAccountState() {
  const customer = getCustomer();
  const navBtn = document.getElementById('accountNavBtn');
  if (customer) {
    navBtn.textContent = customer.name.split(' ')[0];
    document.getElementById('accountLoggedOut').style.display = 'none';
    document.getElementById('accountLoggedIn').style.display = 'block';
    document.getElementById('accountName').textContent = customer.name + ' (' + customer.phone + ')';
  } else {
    navBtn.textContent = 'Login / Register';
    document.getElementById('accountLoggedOut').style.display = 'block';
    document.getElementById('accountLoggedIn').style.display = 'none';
  }
}

function requireLogin(actionLabel) {
  if (!getCustomer()) {
    toast('Please log in or register first to ' + actionLabel);
    showView('account');
    return false;
  }
  return true;
}

/* ================= CONTRACTS + ADMIN LOGIN ================= */
function bindStaticButtons() {
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!phone || !password) { toast('Enter phone and password'); return; }
    try {
      const customer = await apiSend('POST', '/customers/login', { phone, password });
      setCustomer(customer);
      renderAccountState();
      toast('Welcome back, ' + customer.name.split(' ')[0]);
      showView('home');
    } catch (e) { toast(e.message); }
  });

  document.getElementById('registerBtn').addEventListener('click', async () => {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    if (!name || !phone || !password) { toast('Name, phone and password are required'); return; }
    try {
      const customer = await apiSend('POST', '/customers/register', { name, phone, email, password });
      setCustomer(customer);
      renderAccountState();
      toast('Account created — welcome, ' + customer.name.split(' ')[0]);
      showView('home');
    } catch (e) { toast(e.message); }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearCustomer();
    renderAccountState();
    toast('Logged out');
    showView('home');
  });

  document.getElementById('submitContractBtn').addEventListener('click', async () => {
    if (!requireLogin('submit a contract request')) return;
    const name = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const type = document.getElementById('cType').value;
    const location = document.getElementById('cLocation').value.trim();
    const budget = document.getElementById('cBudget').value.trim();
    const desc = document.getElementById('cDesc').value.trim();
    if (!name || !phone || !location || !desc) { toast('Please fill in all required fields'); return; }

    try {
      await apiSend('POST', '/contracts', { name, phone, type, location, budget, desc });
      ['cName', 'cPhone', 'cLocation', 'cBudget', 'cDesc'].forEach(id => document.getElementById(id).value = '');
      toast('Contract request submitted — our team will contact you.');
    } catch (e) {
      toast('Submission failed: ' + e.message);
    }
  });

  document.getElementById('adminLoginBtn').addEventListener('click', async () => {
    const pass = document.getElementById('adminPass').value;
    localStorage.setItem('bgic_admin_pass', pass);
    try {
      await apiGet('/orders', true);
      document.getElementById('adminGateWrap').style.display = 'none';
      document.getElementById('adminPanelWrap').style.display = 'block';
      await loadAdminData();
    } catch (e) {
      localStorage.removeItem('bgic_admin_pass');
      toast('Incorrect password');
    }
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    localStorage.removeItem('bgic_admin_pass');
    document.getElementById('adminGateWrap').style.display = 'block';
    document.getElementById('adminPanelWrap').style.display = 'none';
    document.getElementById('adminPass').value = '';
  });

  document.querySelectorAll('.admin-nav [data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('toggleAddProductForm').addEventListener('click', () => {
    const form = document.getElementById('addProductForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('toggleAddRentalForm').addEventListener('click', () => {
    const form = document.getElementById('addRentalForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('submitAddProduct').addEventListener('click', () => submitAddItem('material'));
  document.getElementById('submitAddRental').addEventListener('click', () => submitAddItem('rental'));

  document.getElementById('bulkApproveBtn').addEventListener('click', () => bulkOrderAction('approved'));
  document.getElementById('bulkCancelBtn').addEventListener('click', () => bulkOrderAction('cancelled'));
  document.getElementById('selectAllOrders').addEventListener('change', (e) => {
    document.querySelectorAll('.order-select').forEach(cb => cb.checked = e.target.checked);
  });
}

/* ================= ADMIN DATA LOADING ================= */
async function loadAdminData() {
  orders = await apiGet('/orders', true);
  contracts = await apiGet('/contracts', true);
  renderAdminProducts();
  renderAdminRentals();
  renderAdminOrders();
  renderAdminContracts();
  renderDashboard();
}

/* ================= ADMIN: PRODUCTS / RENTALS ================= */
function renderAdminProducts() {
  document.getElementById('productsTable').innerHTML = products.map(p => adminRow(p)).join('');
  bindAdminRowEvents('material');
}
function renderAdminRentals() {
  document.getElementById('rentalsTable').innerHTML = rentals.map(p => adminRow(p)).join('');
  bindAdminRowEvents('rental');
}

function adminRow(p) {
  return `<tr data-id="${p.id}">
    <td>${p.name}</td>
    <td>${p.category}</td>
    <td><input class="inline-edit" data-field="price" type="number" value="${p.price}"></td>
    <td><input class="inline-edit" data-field="stock" type="number" value="${p.stock}"></td>
    <td class="row-actions">
      <button class="btn btn-ghost btn-small" data-save="${p.id}">Save</button>
      <button class="btn btn-danger btn-small" data-delete="${p.id}">Delete</button>
    </td>
  </tr>`;
}

function bindAdminRowEvents(type) {
  const tableId = type === 'material' ? 'productsTable' : 'rentalsTable';
  const endpoint = type === 'material' ? '/products' : '/rentals';

  document.getElementById(tableId).querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const id = tr.dataset.id;
      const price = parseFloat(tr.querySelector('[data-field="price"]').value);
      const stock = parseInt(tr.querySelector('[data-field="stock"]').value);
      try {
        await apiSend('PUT', endpoint + '/' + id, { price, stock }, true);
        await refreshCatalog();
        renderAdminProducts(); renderAdminRentals();
        toast('Saved');
      } catch (e) { toast('Save failed: ' + e.message); }
    });
  });
  document.getElementById(tableId).querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this item permanently?')) return;
      try {
        await apiSend('DELETE', endpoint + '/' + btn.dataset.delete, null, true);
        await refreshCatalog();
        renderAdminProducts(); renderAdminRentals();
        toast('Item deleted');
      } catch (e) { toast('Delete failed: ' + e.message); }
    });
  });
}

async function submitAddItem(type) {
  const prefix = type === 'material' ? 'p' : 'r';
  const name = document.getElementById(prefix + 'Name').value.trim();
  const localName = document.getElementById(prefix + 'LocalName').value.trim();
  const desc = document.getElementById(prefix + 'Desc').value.trim();
  const category = document.getElementById(prefix + 'Category').value.trim() || 'General';
  const icon = document.getElementById(prefix + 'Icon').value.trim();
  const price = parseFloat(document.getElementById(prefix + 'Price').value) || 0;
  const stock = parseInt(document.getElementById(prefix + 'Stock').value) || 0;
  const unit = type === 'material' ? (document.getElementById('pUnit').value.trim() || 'unit') : 'day';
  const deposit = type === 'rental' ? (parseFloat(document.getElementById('rDeposit').value) || 0) : 0;

  if (!name) { toast('Item name is required'); return; }

  const endpoint = type === 'material' ? '/products' : '/rentals';
  try {
    await apiSend('POST', endpoint, { name, localName, category, icon, price, deposit, stock, unit, desc }, true);
    await refreshCatalog();
    renderAdminProducts(); renderAdminRentals();
    toast('Item added: ' + name);

    // Clear and hide the form
    const formId = type === 'material' ? 'addProductForm' : 'addRentalForm';
    document.querySelectorAll('#' + formId + ' input, #' + formId + ' textarea').forEach(el => el.value = '');
    document.getElementById(formId).style.display = 'none';
  } catch (e) { toast('Add failed: ' + e.message); }
}

/* ================= ADMIN: ORDERS ================= */
function renderAdminOrders() {
  document.getElementById('ordersTable').innerHTML = orders.map(o => `
    <tr data-id="${o.id}">
      <td class="checkbox-cell"><input type="checkbox" class="order-select" data-id="${o.id}"></td>
      <td>${o.id}</td>
      <td>${o.customerName}<br><span style="color:var(--concrete);font-size:12px;">${o.phone}</span></td>
      <td>${o.items.map(i => i.name + ' ×' + i.qty).join(', ')}</td>
      <td>${money(o.total)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td class="row-actions">
        <button class="btn btn-ghost btn-small" data-status="${o.id}|approved">Approve</button>
        <button class="btn btn-ghost btn-small" data-status="${o.id}|cancelled">Cancel</button>
        <button class="btn btn-ghost btn-small" data-status="${o.id}|returned">Returned</button>
        <button class="btn btn-ghost btn-small" data-status="${o.id}|completed">Completed</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--concrete);">No orders yet.</td></tr>`;

  document.getElementById('ordersTable').querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const [id, status] = btn.dataset.status.split('|');
      try {
        await apiSend('PATCH', '/orders/' + id, { status }, true);
        orders = await apiGet('/orders', true);
        renderAdminOrders(); renderDashboard();
        toast('Order ' + id + ' marked ' + status);
      } catch (e) { toast('Update failed: ' + e.message); }
    });
  });
}

async function bulkOrderAction(status) {
  const ids = Array.from(document.querySelectorAll('.order-select:checked')).map(cb => cb.dataset.id);
  if (ids.length === 0) { toast('Select at least one order'); return; }
  try {
    await apiSend('PATCH', '/orders', { ids, status }, true);
    orders = await apiGet('/orders', true);
    renderAdminOrders(); renderDashboard();
    toast(ids.length + ' order(s) marked ' + status);
  } catch (e) { toast('Bulk update failed: ' + e.message); }
}

/* ================= ADMIN: CONTRACTS ================= */
function renderAdminContracts() {
  document.getElementById('contractsTable').innerHTML = contracts.map(c => `
    <tr>
      <td>${c.name}<br><span style="color:var(--concrete);font-size:12px;">${c.phone}</span></td>
      <td>${c.type}</td>
      <td>${c.location}</td>
      <td>${c.budget && c.budget !== 'Not specified' ? money(c.budget) : (c.budget || 'Not specified')}</td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td class="row-actions">
        <button class="btn btn-ghost btn-small" data-cstatus="${c.id}|approved">Approve</button>
        <button class="btn btn-ghost btn-small" data-cstatus="${c.id}|cancelled">Reject</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--concrete);">No contract requests yet.</td></tr>`;

  document.getElementById('contractsTable').querySelectorAll('[data-cstatus]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const [id, status] = btn.dataset.cstatus.split('|');
      try {
        await apiSend('PATCH', '/contracts/' + id, { status }, true);
        contracts = await apiGet('/contracts', true);
        renderAdminContracts();
        toast('Contract request ' + status);
      } catch (e) { toast('Update failed: ' + e.message); }
    });
  });
}

/* ================= ADMIN: DASHBOARD ================= */
function renderDashboard() {
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const pendingContracts = contracts.filter(c => c.status === 'pending').length;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="num">${orders.length}</div><div class="label">Total Orders</div></div>
    <div class="stat-card"><div class="num">${pendingOrders}</div><div class="label">Pending Orders</div></div>
    <div class="stat-card"><div class="num">${money(totalRevenue)}</div><div class="label">Total Revenue</div></div>
    <div class="stat-card"><div class="num">${products.length + rentals.length}</div><div class="label">Listed Items</div></div>
    <div class="stat-card"><div class="num">${pendingContracts}</div><div class="label">New Contract Requests</div></div>
  `;

  document.getElementById('dashRecentOrders').innerHTML = orders.slice(0, 6).map(o => `
    <tr><td>${o.id}</td><td>${o.customerName}</td><td>${money(o.total)}</td><td><span class="badge badge-${o.status}">${o.status}</span></td></tr>
  `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--concrete);">No orders yet.</td></tr>`;
}

init();
