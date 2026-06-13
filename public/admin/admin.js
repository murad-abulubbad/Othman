import { app, db, auth, storage, signInWithEmailAndPassword, signOut, onAuthStateChanged, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '../firebase.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { initGenres, loadGenres, renderGenreTags } from './genres.js';

// ── STATE ──────────────────────────────────────────────
let categories = [];
let items      = [];
let selectedItemIds = new Set();
let currentRole = 'viewer'; // 'viewer' | 'editor' | 'admin'
let staffList   = [];

// ── HELPERS ────────────────────────────────────────────
function toast(msg, isErr = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('err', isErr);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function fmtDate(ts) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
}

function $ (id) { return document.getElementById(id); }

function getCategoryItemCount(categoryId) {
  return items
    .filter(item => item.categoryID === categoryId)
    .reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
}

function renderDashboardStats() {
  const statsRow = $('dashboard-stats');
  if (!statsRow) return;

  const categoryCards = categories.map(cat => {
    const count = getCategoryItemCount(cat.id);
    return `
      <div class="stat-card stat-card-category">
        <div class="s-num">${count}</div>
        <div class="s-lbl">${cat.name}</div>
      </div>
    `;
  }).join('');

  const totalCounted = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
  statsRow.innerHTML = `
    <div class="stat-card stat-card-total">
      <div class="s-num">${totalCounted}</div>
      <div class="s-lbl">إجمالي العناصر</div>
    </div>
    <div class="stat-card stat-card-total">
      <div class="s-num">${categories.length}</div>
      <div class="s-lbl">إجمالي التصنيفات</div>
    </div>
    ${categoryCards}
  `;
}

function renderCategoriesTable() {
  const sel = $('item-categoryID');
  if (sel) {
    sel.innerHTML = '<option value="">— اختر تصنيفاً —</option>' +
      categories.map(c => {
        const count = getCategoryItemCount(c.id);
        return `<option value="${c.id}">${c.name} (${count})</option>`;
      }).join('');
  }

  const filterSel = $('filter-category');
  if (filterSel) {
    const currentVal = filterSel.value;
    filterSel.innerHTML = '<option value="">كل التصنيفات</option>' +
      '<option value="__none__">⚠️ بدون تصنيف</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    filterSel.value = currentVal;
  }

  const tbody = $('cats-tbody');
  if (!tbody) return;

  tbody.innerHTML = categories.length
    ? categories.map(c => {
        const count = getCategoryItemCount(c.id);
        return `<tr data-cat-id="${c.id}">
          <td class="td-drag-handle" title="اسحب لإعادة الترتيب" style="cursor:grab">☰</td>
          <td>${c.name}</td>
          <td><span class="badge badge-other">${count}</span></td>
          <td>${c.imageUrl ? `<img src="${c.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px">` : '—'}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-edit btn-sm" data-cat-edit="${c.id}">✏️ تعديل</button>
              <button class="btn btn-danger btn-sm" data-cat-del="${c.id}">🗑 حذف</button>
            </td>
        </tr>`;
      }).join('')
    : '<tr class="empty-row"><td colspan="5">لا توجد تصنيفات بعد</td></tr>';

  // Enable drag & drop reordering for category rows
  enableCategoryDragging();
}

function enableCategoryDragging() {
  const tbody = $('cats-tbody');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr[data-cat-id]'));
  rows.forEach(row => {
    row.draggable = true;
    const id = row.dataset.catId;
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      const dropId = row.dataset.catId;
      if (!draggedId || draggedId === dropId) return;
      const draggedIdx = categories.findIndex(c => c.id === draggedId);
      const dropIdx = categories.findIndex(c => c.id === dropId);
      if (draggedIdx === -1 || dropIdx === -1) return;
      const [moved] = categories.splice(draggedIdx, 1);
      categories.splice(dropIdx, 0, moved);
      try {
        await Promise.all(categories.map((c, i) => {
          c.order = i + 1; // Update locally
          return updateDoc(doc(db, 'Categories', c.id), { order: i + 1 });
        }));
        
        // Re-render instead of reloading
        renderCategoriesTable();
        toast('✅ تم حفظ الترتيب الجديد');
        try { localStorage.removeItem('ofg_data_cache'); } catch {}
      } catch (err) { toast('خطأ في حفظ الترتيب: ' + err.message, true); }
    });
  });
}



function syncItemSelectionUI(pageItems = null) {
  const bulkBtn = $('delete-selected-items');
  if (bulkBtn) {
    const count = selectedItemIds.size;
    bulkBtn.disabled = count === 0;
    bulkBtn.textContent = count ? `حذف المحدد (${count})` : 'حذف المحدد';
  }

  const selectAll = $('select-all-items');
  if (selectAll) {
    const visibleIds = pageItems
      ? pageItems.map(item => item.id)
      : [...document.querySelectorAll('[data-item-select]')].map(cb => cb.dataset.itemSelect);
    const selectedVisible = visibleIds.filter(id => selectedItemIds.has(id)).length;
    selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  }

  document.querySelectorAll('[data-item-select]').forEach(cb => {
    cb.checked = selectedItemIds.has(cb.dataset.itemSelect);
  });
}

// ── AUTH ───────────────────────────────────────────────
async function login() {
  const email    = $('admin-user').value.trim();
  const password = $('admin-pass').value;
  const errEl    = $('login-err');
  errEl.textContent = '';

  if (!email || !password) { 
    errEl.textContent = 'الرجاء إدخال الإيميل وكلمة المرور'; 
    return; 
  }

  const btn = $('login-btn');
  btn.disabled = true; 
  btn.textContent = 'جاري التحقق...';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Auth state listener will handle UI transition
  } catch (e) {
    errEl.textContent = 'الإيميل أو كلمة المرور غير صحيحة';
    btn.disabled = false; 
    btn.textContent = 'تسجيل الدخول';
  }
}

function logout() {
  signOut(auth);
}

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  const loader = $('page-loader');
  if (loader) loader.style.display = 'none';
  if (user) {
    // Fetch role from Staff collection
    try {
      const staffDoc = await getDocs(query(collection(db, 'Staff'), where('email', '==', user.email)));
      if (!staffDoc.empty) {
        currentRole = staffDoc.docs[0].data().role || 'viewer';
      } else {
        // Not in Staff — check if it's the owner email
        const ownerEmail = 'abulubbadmorad@gmail.com';
        if (user.email === ownerEmail) {
          currentRole = 'admin';
        } else {
          // Not authorized — sign out immediately
          await signOut(auth);
          $('login-err').textContent = 'ليس لديك صلاحية للدخول';
          return;
        }
      }
    } catch { currentRole = 'admin'; }
    $('login-overlay').style.display = 'none';
    $('dashboard').style.display     = 'block';
    applyRolePermissions();
    init();
  } else {
    currentRole = 'viewer';
    $('dashboard').style.display     = 'none';
    $('login-overlay').style.display = 'flex';
    $('admin-pass').value = '';
  }
});

function applyRolePermissions() {
  const isAdmin  = currentRole === 'admin';
  const canEdit  = currentRole === 'editor' || isAdmin;
  // Show/hide write buttons
  ['add-item-btn','cat-add-btn','genre-add-btn'].forEach(id => {
    const el = $(id); if (el) el.style.display = (canEdit ? '' : 'none');
  });
  // Delete selected — admin/owner only
  const delBtn = $('delete-selected-items');
  if (delBtn) delBtn.style.display = (isAdmin ? '' : 'none');
  // Staff tab + section — owner only
  const isOwner = auth.currentUser?.email === 'abulubbadmorad@gmail.com';
  const staffTabBtn = $('staff-tab-btn');
  if (staffTabBtn) staffTabBtn.style.display = (isOwner ? '' : 'none');
  const staffAddRow = $('staff-add-row');
  if (staffAddRow) staffAddRow.style.display = (isOwner ? '' : 'none');
  // Show role badge in nav
  const badge = $('role-badge');
  if (badge) {
    badge.textContent = isOwner ? '👑 مدير' : isAdmin ? '👑 أدمن' : canEdit ? '✏️ محرر' : '👁 مشاهد';
    badge.style.color = isAdmin ? '#fbbf24' : canEdit ? '#60a5fa' : '#aaa';
  }
}

// ── INIT ───────────────────────────────────────────────
async function init() {
  await Promise.all([ loadCategories(), loadItems(), loadGenres(), loadStaff() ]);
  loadAnalytics();
}

// ══════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════
let _analyticsOrders = [];
let _analyticsPeriod = 'today';
let _revenueChart = null;
let _hourlyChart  = null;

async function loadAnalytics() {
  try {
    const snap = await getDocs(query(collection(db, 'Orders'), orderBy('createdAt', 'desc')));
    _analyticsOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAnalytics();
  } catch(e) { console.warn('analytics:', e.message); }
}

function getAnalyticsPeriodOrders() {
  const now = new Date();
  return _analyticsOrders.filter(o => {
    const ts = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
    if (_analyticsPeriod === 'today') {
      return ts.toDateString() === now.toDateString();
    } else if (_analyticsPeriod === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return ts >= weekAgo;
    } else if (_analyticsPeriod === 'month') {
      return ts.getMonth() === now.getMonth() && ts.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function renderAnalytics() {
  const orders = getAnalyticsPeriodOrders();
  const completed = orders.filter(o => o.status !== 'ملغي');
  const revenue   = completed.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const avgOrder  = completed.length ? revenue / completed.length : 0;
  const cancelled = orders.filter(o => o.status === 'ملغي').length;

  // KPI cards
  const kpis = [
    { label: 'الإيرادات', value: revenue.toFixed(2) + ' JOD', color: '#34d399' },
    { label: 'الطلبات', value: completed.length, color: '#60a5fa' },
    { label: 'الملغية', value: cancelled, color: '#f87171' },
    { label: 'متوسط الطلب', value: avgOrder.toFixed(2) + ' JOD', color: '#fbbf24' },
  ];
  $('analytics-kpis').innerHTML = kpis.map(k => `
    <div style="background:rgba(255,255,255,.04);border-radius:14px;padding:18px 16px;border:1px solid rgba(255,255,255,.06);position:relative;overflow:hidden">
      <div style="position:absolute;top:-10px;right:-10px;width:60px;height:60px;border-radius:50%;background:${k.color};opacity:.07;pointer-events:none"></div>
      <div style="font-size:.7rem;opacity:.45;margin-bottom:8px;letter-spacing:.5px">${k.label}</div>
      <div style="font-size:1.35rem;font-weight:900;color:${k.color};font-family:'Orbitron',monospace;letter-spacing:-0.5px">${k.value}</div>
    </div>`).join('');

  // Revenue last 7 days chart
  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayLabels = days.map(d => d.toLocaleDateString('ar-EG', {weekday:'short'}));
  const dayRevenue = days.map(d =>
    _analyticsOrders
      .filter(o => {
        const ts = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
        return ts.toDateString() === d.toDateString() && o.status !== 'ملغي';
      })
      .reduce((s, o) => s + (parseFloat(o.total) || 0), 0)
  );

  if (_revenueChart) _revenueChart.destroy();
  const rCtx = document.getElementById('revenue-chart')?.getContext('2d');
  if (rCtx) {
    _revenueChart = new Chart(rCtx, {
      type: 'line',
      data: {
        labels: dayLabels,
        datasets: [{
          data: dayRevenue,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96,165,250,.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#60a5fa',
          pointRadius: 4
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,.5)', font:{size:11} }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { ticks: { color: 'rgba(255,255,255,.5)', font:{size:11} }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true }
        }
      }
    });
  }

  // Top products
  const productMap = {};
  completed.forEach(o => {
    (o.items || []).forEach(it => {
      const key = it.name || '—';
      productMap[key] = (productMap[key] || 0) + (it.qty || 1);
    });
  });
  const topProducts = Object.entries(productMap).sort((a,b) => b[1]-a[1]).slice(0,7);
  $('analytics-top-products').innerHTML = topProducts.length
    ? topProducts.map(([name, qty], i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.82rem">
          <span style="opacity:.8">${i+1}. ${name}</span>
          <span style="color:#34d399;font-weight:700;font-family:'Orbitron',monospace">${qty}×</span>
        </div>`).join('')
    : '<div style="opacity:.4;font-size:.8rem;text-align:center;padding:12px">لا توجد بيانات</div>';

  // Hourly chart
  const hourCounts = Array(24).fill(0);
  _analyticsOrders.forEach(o => {
    const ts = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
    hourCounts[ts.getHours()]++;
  });
  const hourLabels = Array.from({length:24}, (_, i) => i + ':00');

  if (_hourlyChart) _hourlyChart.destroy();
  const hCtx = document.getElementById('hourly-chart')?.getContext('2d');
  if (hCtx) {
    _hourlyChart = new Chart(hCtx, {
      type: 'bar',
      data: {
        labels: hourLabels,
        datasets: [{
          data: hourCounts,
          backgroundColor: hourCounts.map(v => v === Math.max(...hourCounts) ? '#fb923c' : 'rgba(96,165,250,.35)'),
          borderRadius: 4
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,.4)', font:{size:9}, maxRotation:45 }, grid: { display: false } },
          y: { ticks: { color: 'rgba(255,255,255,.4)', font:{size:10} }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true }
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.analytics-period').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.analytics-period').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'rgba(255,255,255,.5)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(42,140,255,.8)';
      btn.style.color = '#fff';
      _analyticsPeriod = btn.dataset.period;
      renderAnalytics();
    });
  });
});

// ── CATEGORIES ─────────────────────────────────────────
async function loadCategories() {
  try {
    let snap;
    try {
      snap = await getDocs(query(collection(db, 'Categories'), orderBy('order', 'asc')));
      // If query succeeded but returned nothing, fall back to unordered fetch
      if (snap.empty) throw new Error('ordered-empty');
    } catch (err) {
      snap = await getDocs(collection(db, 'Categories'));
    }
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Auto-populate or normalize `order` field if missing/invalid so admin actions work
    try {
      let needFix = false;
      if (categories.length > 0) {
        // missing number order?
        for (const c of categories) { if (typeof c.order !== 'number') { needFix = true; break; } }
        if (!needFix) {
          const orders = categories.map(c => c.order);
          const uniq = new Set(orders);
          if (uniq.size !== categories.length) needFix = true;
          const min = Math.min(...orders);
          const max = Math.max(...orders);
          if (min !== 1 || max !== categories.length) needFix = true;
        }
      }
      if (needFix) {
        await Promise.all(categories.map((c, i) => updateDoc(doc(db, 'Categories', c.id), { order: i + 1 })));
        const fixedSnap = await getDocs(query(collection(db, 'Categories'), orderBy('order', 'asc')));
        categories = fixedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Failed to normalize category order:', err.message || err);
    }
    renderCategoriesTable();
    renderDashboardStats();
  } catch (e) {
    toast('خطأ في تحميل التصنيفات: ' + e.message, true);
  }
}

async function addCategory() {
  const inp  = $('cat-name');
  const name = inp.value.trim();
  const color = $('cat-color')?.value || '#3b82f6';
  if (!name) return;
  const fileInput = $('cat-image-file');
  const saveBtn   = $('cat-save-btn');
  let   imageUrl  = '';
  if (fileInput.files.length > 0) {
    try {
      saveBtn.textContent = '⬆ رفع...';
      imageUrl = await uploadCatImage(fileInput.files[0]);
    } catch (e) { toast('خطأ في رفع الصورة: ' + e.message, true); saveBtn.textContent = 'حفظ'; return; }
  }
  try {
    // Determine order: append to end
    const maxOrder = categories.length ? Math.max(...categories.map(c => c.order || 0)) : 0;
    const newOrder = maxOrder + 1;
    const docRef = await addDoc(collection(db, 'Categories'), { name, imageUrl, color, order: newOrder });
    
    // Update local state without re-fetching
    categories.push({ id: docRef.id, name, imageUrl, color, order: newOrder });
    renderCategoriesTable();
    renderDashboardStats();
    
    $('cat-add-modal').style.display = 'none';
    toast('✅ تم إضافة التصنيف');
    try { localStorage.removeItem('ofg_data_cache'); } catch {}
  } catch (e) { toast('خطأ: ' + e.message, true); }
  saveBtn.textContent = 'حفظ';
}

async function moveCategory(catId, direction) {
  const idx = categories.findIndex(c => c.id === catId);
  if (idx === -1) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= categories.length) return;
  const a = categories[idx];
  const b = categories[targetIdx];
  const aOrder = a.order ?? (idx + 1);
  const bOrder = b.order ?? (targetIdx + 1);
  try {
    await Promise.all([
      updateDoc(doc(db, 'Categories', a.id), { order: bOrder }),
      updateDoc(doc(db, 'Categories', b.id), { order: aOrder })
    ]);
    
    // Update local state and re-render without re-fetching
    a.order = bOrder;
    b.order = aOrder;
    categories.sort((x, y) => (x.order || 0) - (y.order || 0));
    renderCategoriesTable();
    
    toast('✅ تم تعديل ترتيب التصنيفات');
  } catch (err) { toast('خطأ في تعديل الترتيب: ' + err.message, true); }
}

async function deleteCategory(id) {
  if (!confirm('حذف هذا التصنيف؟')) return;
  try {
    await deleteDoc(doc(db, 'Categories', id));
    try { localStorage.removeItem('ofg_data_cache'); } catch {}
    // Update local state without fetching
    categories = categories.filter(c => c.id !== id);
    renderCategoriesTable();
    renderDashboardStats();
    
    toast('🗑 تم حذف التصنيف');
  } catch (e) { toast('خطأ: ' + e.message, true); }
}

// ── ITEMS ──────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;
let itemsFilters = { name:'', categoryID:'', originalPrice:'', discountPrice:'', condition:'', genre:'', quantity:'' };
let itemsPage = 1;

function getFilteredItems() {
  return items.filter(it => {
    if (itemsFilters.name && !String(it.name||'').toLowerCase().includes(itemsFilters.name.toLowerCase())) return false;
    // platform field removed from storage; skip platform filtering
    if (itemsFilters.categoryID === '__none__') {
      if (it.categoryID && it.categoryID !== '') return false;
    } else if (itemsFilters.categoryID && (it.categoryID||'') !== itemsFilters.categoryID) return false;
    if (itemsFilters.originalPrice && !String(it.originalPrice ?? '').includes(itemsFilters.originalPrice)) return false;
    if (itemsFilters.discountPrice && !String(it.discountPrice ?? '').includes(itemsFilters.discountPrice)) return false;
    if (itemsFilters.condition && (it.condition||'') !== itemsFilters.condition) return false;
    if (itemsFilters.genre) {
      const g = Array.isArray(it.genre) ? it.genre : (it.genre ? [it.genre] : []);
      if (!g.includes(itemsFilters.genre)) return false;
    }
    if (itemsFilters.quantity && !String(it.quantity ?? '').includes(itemsFilters.quantity)) return false;
    return true;
  });
}

function renderItemsTable() {
  const filtered = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (itemsPage > totalPages) itemsPage = totalPages;
  const start = (itemsPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  $('items-tbody').innerHTML = pageItems.length
    ? pageItems.map(it => {
        const hasDiscount = Number(it.discountPrice) > 0;
        const priceHtml = hasDiscount
          ? `<s style="opacity:.45">${it.originalPrice}</s> <strong style="color:var(--rb)">${it.discountPrice}</strong>`
          : `${it.originalPrice ?? '—'}`;
        const qty = Number(it.quantity ?? 0);
        const qtyBadge = qty <= 0 ? '<span class="badge badge-danger">نفذ</span>' : qty < 5 ? '<span class="badge badge-warn">'+qty+'</span>' : '<span class="badge badge-ok">'+qty+'</span>';
        const category = categories.find(c => c.id === it.categoryID);
        const categoryName = category ? category.name : '—';
        return `
        <tr class="${selectedItemIds.has(it.id) ? 'row-selected' : ''}">
          <td class="td-select">${currentRole !== 'viewer' ? `<input type="checkbox" class="row-select" data-item-select="${it.id}" ${selectedItemIds.has(it.id) ? 'checked' : ''}>` : ''}</td>
          <td><img class="item-img" src="${it.imageUrl||''}" alt="${it.name}"
               onerror="this.style.opacity='.25'"></td>
          <td>${it.name}</td>
          <td>${categoryName}</td>
          <td>${priceHtml}</td>
          <td>${hasDiscount ? it.discountPrice + ' JOD' : '—'}</td>
          <td>${it.condition||'—'}</td>
          <td>${Array.isArray(it.genre) ? (it.genre.join('، ') || '—') : (it.genre || '—')}</td>
          <td>${qtyBadge}</td>
          <td class="td-actions">
            ${currentRole !== 'viewer' ? `<button class="btn btn-edit btn-sm" data-item-edit="${it.id}">✏ تعديل</button>` : ''}
            ${currentRole !== 'viewer' ? `<button class="btn btn-sm" data-item-flash="${it.id}" style="background:rgba(251,146,60,.15);color:#fb923c;border:1px solid rgba(251,146,60,.3)">⚡ فلاش</button>` : ''}
            ${currentRole === 'admin'  ? `<button class="btn btn-danger btn-sm" data-item-del="${it.id}">🗑 حذف</button>` : ''}
          </td>
        </tr>`;
      }).join('')
    : `<tr class="empty-row"><td colspan="10">${items.length === 0 ? 'لا توجد عناصر بعد — أضف أول عنصر!' : 'لا توجد نتائج مطابقة للفلتر'}</td></tr>`;

  $('pg-info').textContent = `صفحة ${itemsPage} من ${totalPages} (${filtered.length} عنصر)`;
  $('pg-prev').disabled = itemsPage <= 1;
  $('pg-next').disabled = itemsPage >= totalPages;
  syncItemSelectionUI(pageItems);
}

async function loadItems() {
  try {
    const snap = await getDocs(collection(db, 'Items'));
    items = snap.docs.map(d => {
      const raw = d.data();
      const { platform, ...rest } = raw || {};
      return { id: d.id, ...rest };
    });
    selectedItemIds = new Set([...selectedItemIds].filter(id => items.some(item => item.id === id)));

    renderItemsTable();
    renderCategoriesTable();
    renderDashboardStats();
  } catch (e) {
    toast('خطأ في تحميل العناصر: ' + e.message, true);
  }
}

async function deleteSelectedItems() {
  const ids = [...selectedItemIds];
  if (!ids.length) return;
  if (!confirm(`هل أنت متأكد من حذف ${ids.length} عنصر${ids.length === 1 ? '' : 'ات'}؟`)) return;
  try {
    await Promise.all(ids.map(id => deleteDoc(doc(db, 'Items', id))));
    selectedItemIds.clear();
    try { localStorage.removeItem('ofg_data_cache'); } catch {}
    toast(`🗑 تم حذف ${ids.length} عنصر${ids.length === 1 ? '' : 'ات'}`);
    
    // Update local state without fetching all docs again to reduce reads
    items = items.filter(it => !ids.includes(it.id));
    renderItemsTable();
    renderCategoriesTable();
    renderDashboardStats();
  } catch (err) {
    toast('خطأ: ' + err.message, true);
  }
}

// Wire up filters and pagination once
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.filter-input').forEach(input => {
    const evt = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(evt, () => {
      itemsFilters[input.dataset.filter] = input.value.trim();
      itemsPage = 1;
      renderItemsTable();
    });
  });
  $('pg-prev')?.addEventListener('click', () => { if (itemsPage > 1) { itemsPage--; renderItemsTable(); } });
  $('pg-next')?.addEventListener('click', () => { itemsPage++; renderItemsTable(); });
});

// ── ITEM MODAL ─────────────────────────────────────────
// Global array to hold current images during editing
let currentItemImages = [];
let currentItemImagesLoaded = false;

function renderImagesGallery() {
  const mainPreview = $('main-image-preview');
  const mainItem = $('main-image-item');
  const additionalContainer = $('additional-images');
  const addMoreBtn = additionalContainer.querySelector('.add-more');
  const mainRemoveBtn = mainItem.querySelector('.main-remove');

  // Update main image
  if (currentItemImages.length > 0) {
    mainPreview.src = currentItemImages[0];
    mainPreview.style.display = 'block';
    mainItem.querySelector('.gallery-placeholder').style.display = 'none';
    if (mainRemoveBtn) mainRemoveBtn.style.display = 'block';
  } else {
    mainPreview.src = '';
    mainPreview.style.display = 'none';
    mainItem.querySelector('.gallery-placeholder').style.display = 'flex';
    if (mainRemoveBtn) mainRemoveBtn.style.display = 'none';
  }

  // Remove existing additional images (keep add-more button)
  additionalContainer.querySelectorAll('.gallery-item:not(.add-more)').forEach(el => el.remove());

  // Add additional images
  for (let i = 1; i < currentItemImages.length; i++) {
    const imgDiv = document.createElement('div');
    imgDiv.className = 'gallery-item';
    imgDiv.innerHTML = `
      <img src="${currentItemImages[i]}" alt="additional">
      <button type="button" class="gallery-remove" onclick="removeImage(${i})" title="حذف">×</button>
      <button type="button" class="gallery-set-main" onclick="setAsMain(${i})" title="تعيين كصورة رئيسية">★</button>
    `;
    additionalContainer.insertBefore(imgDiv, addMoreBtn);
  }

  // Update hidden inputs
  $('item-imageUrl').value = currentItemImages[0] || '';
  $('item-images').value = JSON.stringify(currentItemImages.slice(1));
}

function removeImage(index) {
  currentItemImages.splice(index, 1);
  renderImagesGallery();
}
window.removeImage = removeImage;

function removeMainImage() {
  if (currentItemImages.length > 0) {
    currentItemImages.splice(0, 1);
    renderImagesGallery();
  }
}
window.removeMainImage = removeMainImage;

function setAsMain(index) {
  if (index > 0 && index < currentItemImages.length) {
    // Move the selected image to the first position
    const [selectedImage] = currentItemImages.splice(index, 1);
    currentItemImages.unshift(selectedImage);
    renderImagesGallery();
  }
}
window.setAsMain = setAsMain;

function openItemModal(item = null) {
  // Restore category field visibility (may have been hidden by browse mode)
  const _cf = $('item-cat-field'); if (_cf) _cf.style.display = '';
  const _clf = $('item-cat-label-field'); if (_clf) _clf.style.display = 'none';
  $('item-modal-title').textContent = item ? 'تعديل العنصر' : 'إضافة عنصر جديد';
  $('item-id').value              = item?.id             || '';
  $('item-name').value            = item?.name           || '';

  // Handle images - support both old (imageUrl) and new (images array) formats
  currentItemImages = [];
  if (item?.images && Array.isArray(item.images) && item.images.length > 0) {
    currentItemImages = [...item.images];
  } else if (item?.imageUrl) {
    currentItemImages = [item.imageUrl];
  }
  currentItemImagesLoaded = currentItemImages.length > 0;
  renderImagesGallery();

  $('upload-fname').textContent   = '';
  $('item-image-file').value      = '';
  // platform field no longer used/stored
  $('item-categoryID').value      = item?.categoryID     || '';
  $('item-condition').value       = item?.condition      || 'مستعمل';
  // Handle genres as array or legacy string — tags rendered dynamically from Genres collection.
  const selectedGenres = Array.isArray(item?.genre) ? item.genre : (item?.genre ? [item.genre] : []);
  renderGenreTags(selectedGenres);
  $('item-quantity').value        = item?.quantity       ?? 1;
  $('item-originalPrice').value   = item?.originalPrice  ?? '';
  $('item-discountPrice').value   = item?.discountPrice  ?? 0;
  $('item-description').value     = item?.description    || '';
  $('item-videoTrailerUrl').value = item?.videoTrailerUrl || '';
  $('item-featured').checked       = item?.featured === true;
  $('form-err').textContent       = '';
  $('item-modal').classList.add('open');
}
window.openItemModal  = openItemModal;

function closeItemModal() { $('item-modal').classList.remove('open'); }
window.closeItemModal = closeItemModal;

// ── IMAGE UPLOAD (Firebase Storage) ─────────────────────────────────
function uploadToFirebase(file, folder) {
  return new Promise((resolve, reject) => {
    const fileName = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      snapshot => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes * 100).toFixed(0) + '%';
        const bar = $('upload-progress-fill');
        const wrap = $('upload-progress-bar');
        if (bar && wrap) { wrap.style.display = 'block'; bar.style.width = pct; }
      },
      error => {
        const bar = $('upload-progress-fill'), wrap = $('upload-progress-bar');
        if (bar && wrap) { wrap.style.display = 'none'; bar.style.width = '0%'; }
        reject(error);
      },
      async () => {
        const bar = $('upload-progress-fill'), wrap = $('upload-progress-bar');
        if (bar && wrap) { wrap.style.display = 'none'; bar.style.width = '0%'; }
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

function uploadCatImage(file)  { return uploadToFirebase(file, 'ofg/categories'); }
function uploadImage(file)     { return uploadToFirebase(file, 'ofg/items'); }

$('item-image-file').addEventListener('change', async e => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  $('upload-fname').textContent = files.length === 1 ? files[0].name : `${files.length} صور مختارة`;

  // Upload all selected files
  for (const file of files) {
    try {
      const imageUrl = await uploadImage(file);
      currentItemImages.push(imageUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      toast(`فشل رفع: ${file.name}`, true);
    }
  }

  renderImagesGallery();
  $('item-image-file').value = ''; // Reset for next selection
});

document.getElementById('item-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id      = $('item-id').value;
  const saveBtn = $('item-save-btn');
  const errEl   = $('form-err');
  errEl.textContent = '';

  const name          = $('item-name').value.trim();
  const originalPrice = parseFloat($('item-originalPrice').value) || 0;
  const discountPrice = parseFloat($('item-discountPrice').value) || 0;
  if (!name || originalPrice <= 0) {
    errEl.textContent = 'الرجاء تعبئة الاسم والسعر الأصلي';
    return;
  }
  if (discountPrice > originalPrice) {
    errEl.textContent = '❌ سعر الخصم لا يمكن أن يكون أكبر من السعر الأصلي';
    return;
  }
  saveBtn.disabled = true;

  // Check if at least one image exists (only required for new items)
  if (currentItemImages.length === 0 && !id) {
    errEl.textContent = 'الرجاء إضافة صورة واحدة على الأقل للمنتج';
    saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ';
    return;
  }

  // If editing and user didn't touch images, keep old ones; if user cleared them, respect that
  const existingItem = id ? items.find(i => i.id === id) : null;
  const finalImages = currentItemImages.length > 0 ? currentItemImages :
    (!currentItemImagesLoaded && existingItem?.images?.length ? existingItem.images :
     !currentItemImagesLoaded && existingItem?.imageUrl ? [existingItem.imageUrl] : []);

  // Prepare data with images array (first image is main, rest are additional)
  const data = {
    name,
    imageUrl: finalImages[0] || '', // Keep for backward compatibility
    images: finalImages, // New array format
    categoryID:      $('item-categoryID').value,
    condition:       $('item-condition').value,
    genre:           Array.from(document.querySelectorAll('.genre-tag.active')).map(btn => btn.dataset.value),
    quantity:        parseInt($('item-quantity').value) || 0,
    originalPrice,
    discountPrice,
    description:     $('item-description').value.trim(),
    videoTrailerUrl: $('item-videoTrailerUrl').value.trim(),
    featured:        $('item-featured').checked,
  };
  saveBtn.textContent = 'جاري الحفظ...';
  try {
    if (id) {
      // Delete removed Firebase Storage images
      const oldItem = items.find(i => i.id === id);
      if (oldItem) {
        const oldImgs = oldItem.images?.length ? oldItem.images : (oldItem.imageUrl ? [oldItem.imageUrl] : []);
        const removedImgs = oldImgs.filter(url => url.includes('firebasestorage') && !finalImages.includes(url));
        for (const url of removedImgs) {
          try {
            const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
            await deleteObject(ref(storage, path));
          } catch(_) {}
        }
      }
      await updateDoc(doc(db, 'Items', id), data);
      toast('✅ تم تحديث العنصر بنجاح');
      try { localStorage.removeItem('ofg_data_cache'); } catch {}
      
      // Update local state to save reads
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) items[idx] = { id, ...data };
    } else {
      const docRef = await addDoc(collection(db, 'Items'), data);
      toast('✅ تم إضافة العنصر بنجاح');
      try { localStorage.removeItem('ofg_data_cache'); } catch {}
      
      // Add to local state to save reads
      items.push({ id: docRef.id, ...data });
    }
    closeItemModal();
    
    // Refresh UI without fetching all items again
    renderItemsTable();
    renderCategoriesTable();
    renderDashboardStats();
  } catch (err) {
    errEl.textContent = 'خطأ في الحفظ: ' + err.message;
  }
  saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ';
});

// ── EVENT DELEGATION ───────────────────────────────────
document.addEventListener('click', async (e) => {
  // Edit item
  const editBtn = e.target.closest('[data-item-edit]');
  if (editBtn) {
    const item = items.find(i => i.id === editBtn.dataset.itemEdit);
    if (item) openItemModal(item);
    return;
  }
  // Delete item
  const delItemBtn = e.target.closest('[data-item-del]');
  if (delItemBtn) {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    try {
      const delId = delItemBtn.dataset.itemDel;
      selectedItemIds.delete(delId);
      const delItem = items.find(it => it.id === delId);
      console.log('delItem:', delItem);
      console.log('delItem.images:', delItem?.images);
      console.log('delItem.imageUrl:', delItem?.imageUrl);
      await deleteDoc(doc(db, 'Items', delId));
      // Delete images from Firebase Storage (only Firebase Storage URLs)
      if (delItem) {
        const allImgs = delItem.images?.length ? delItem.images : (delItem.imageUrl ? [delItem.imageUrl] : []);
        console.log('allImgs:', allImgs);
        for (const url of allImgs) {
          console.log('checking url:', url?.substring(0, 80));
          if (url && url.includes('firebasestorage')) {
            try {
              const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
              console.log('Deleting storage path:', path);
              await deleteObject(ref(storage, path));
              console.log('Deleted:', path);
            } catch(err) { console.error('Storage delete error:', err); }
          } else {
            console.log('Skipping non-firebase URL:', url?.substring(0, 60));
          }
        }
      } else {
        console.warn('delItem not found in local state!');
      }
      toast('🗑 تم حذف العنصر');
      
      // Update local state to save reads
      items = items.filter(it => it.id !== delId);
      renderItemsTable();
      renderCategoriesTable();
      renderDashboardStats();
    } catch (err) { toast('خطأ: ' + err.message, true); }
    return;
  }
  // Edit category
  const editCatBtn = e.target.closest('[data-cat-edit]');
  if (editCatBtn) {
    const cat = categories.find(c => c.id === editCatBtn.dataset.catEdit);
    if (cat) openCatEdit(cat);
    return;
  }
  // Delete category
  const delCatBtn = e.target.closest('[data-cat-del]');
  if (delCatBtn) { deleteCategory(delCatBtn.dataset.catDel); }
});

// ── WIRE STATIC BUTTONS ────────────────────────────────
$('login-btn').addEventListener('click', login);
$('admin-pass').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('logout-btn').addEventListener('click', logout);
$('cat-cancel-btn').addEventListener('click', () => { $('cat-add-modal').style.display = 'none'; });
$('cat-save-btn').addEventListener('click', addCategory);
$('cat-edit-cancel-btn').addEventListener('click', closeCatEdit);
$('cat-edit-save-btn').addEventListener('click', saveCatEdit);

// ── GENRES (modular) ───────────────────────────────────
initGenres({ toast });
$('delete-selected-items')?.addEventListener('click', deleteSelectedItems);
$('select-all-items')?.addEventListener('change', e => {
  const checked = e.target.checked;
  const visibleIds = [...document.querySelectorAll('[data-item-select]')].map(cb => cb.dataset.itemSelect);
  visibleIds.forEach(id => {
    if (checked) selectedItemIds.add(id);
    else selectedItemIds.delete(id);
  });
  renderItemsTable();
});
$('cat-add-btn').addEventListener('click', () => {
  $('cat-name').value = '';
  $('cat-color').value = '#3b82f6';
  $('cat-image-file').value = '';
  $('cat-img-fname').textContent = 'اختر صورة';
  $('cat-add-preview').style.display = 'none';
  $('cat-add-modal').style.display = 'flex';
});
$('cat-name').addEventListener('keydown', e => { if (e.key === 'Enter') addCategory(); });
$('cat-image-file').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  $('cat-img-fname').textContent = f.name.slice(0,18);
  const rd = new FileReader();
  rd.onload = ev => { const p = $('cat-add-preview'); p.src = ev.target.result; p.style.display = 'block'; };
  rd.readAsDataURL(f);
});
$('cat-edit-image-file').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  $('cat-edit-fname').textContent = f.name.slice(0,20);
  const rd = new FileReader();
  rd.onload = ev => { const p = $('cat-edit-preview'); p.src = ev.target.result; p.style.display='block'; };
  rd.readAsDataURL(f);
});

function openCatEdit(cat) {
  $('cat-edit-id').value            = cat.id;
  $('cat-edit-name').value          = cat.name || '';
  $('cat-edit-color').value         = cat.color || '#3b82f6';
  $('cat-edit-image-file').value    = '';
  $('cat-edit-fname').textContent   = '';
  const prev = $('cat-edit-preview');
  if (cat.imageUrl) { prev.src = cat.imageUrl; prev.style.display = 'block'; }
  else { prev.src = ''; prev.style.display = 'none'; }
  const m = $('cat-edit-modal');
  m.style.display = 'flex';
}
function closeCatEdit() { $('cat-edit-modal').style.display = 'none'; }
async function saveCatEdit() {
  const id   = $('cat-edit-id').value;
  const name = $('cat-edit-name').value.trim();
  if (!name) return;
  const fileInput = $('cat-edit-image-file');
  const saveBtn   = $('cat-edit-save-btn');
  let   imageUrl  = categories.find(c => c.id === id)?.imageUrl || '';
  if (fileInput.files.length > 0) {
    try {
      saveBtn.textContent = '⬆ رفع...';
      imageUrl = await uploadCatImage(fileInput.files[0]);
    } catch (e) { toast('خطأ في رفع الصورة: ' + e.message, true); saveBtn.textContent = 'حفظ التعديل'; return; }
  }
  try {
    const color = $('cat-edit-color')?.value || '#3b82f6';
    await updateDoc(doc(db, 'Categories', id), { name, imageUrl, color });
    
    // Update local state without fetching
    const catIndex = categories.findIndex(c => c.id === id);
    if (catIndex !== -1) {
      categories[catIndex].name = name;
      categories[catIndex].imageUrl = imageUrl;
      categories[catIndex].color = color;
    }
    renderCategoriesTable();
    
    toast('✅ تم تعديل التصنيف');
    try { localStorage.removeItem('ofg_data_cache'); } catch {}
    closeCatEdit();
  } catch (e) { toast('خطأ: ' + e.message, true); }
  saveBtn.textContent = 'حفظ التعديل';
};
document.addEventListener('change', e => {
  const checkbox = e.target.closest('[data-item-select]');
  if (!checkbox) return;
  if (checkbox.checked) selectedItemIds.add(checkbox.dataset.itemSelect);
  else selectedItemIds.delete(checkbox.dataset.itemSelect);
  syncItemSelectionUI();
});

// Close modal on backdrop click
$('item-modal').addEventListener('click', e => {
  if (e.target === $('item-modal')) closeItemModal();
});

// Auth state is handled by onAuthStateChanged listener above

// ── STAFF MANAGEMENT ───────────────────────────────────
const ROLE_LABELS = { admin: '👑 أدمن', editor: '✏️ محرر', viewer: '👁 مشاهد' };

async function loadStaff() {
  try {
    const snap = await getDocs(collection(db, 'Staff'));
    staffList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStaffTable();
  } catch (e) { toast('خطأ في تحميل الموظفين: ' + e.message, true); }
}

function renderStaffTable() {
  const tbody = $('staff-tbody');
  if (!tbody) return;
  if (!staffList.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="3">لا يوجد موظفون مضافون</td></tr>';
    return;
  }
  const isAdmin = currentRole === 'admin';
  tbody.innerHTML = staffList.map(s => `
    <tr>
      <td>${s.email || '—'}</td>
      <td>
        ${isAdmin ? `
          <select class="filter-input staff-role-select" data-staff-id="${s.id}" style="width:auto">
            <option value="viewer" ${s.role==='viewer'?'selected':''}>👁 مشاهد</option>
            <option value="editor" ${s.role==='editor'?'selected':''}>✏️ محرر</option>
            <option value="admin"  ${s.role==='admin' ?'selected':''}>👑 أدمن</option>
          </select>` : `<span>${ROLE_LABELS[s.role] || s.role}</span>`}
      </td>
      <td>
        ${isAdmin ? `<button class="btn btn-danger btn-sm" data-staff-del="${s.id}">حذف</button>` : '—'}
      </td>
    </tr>`).join('');
}

async function addStaff() {
  const email = $('staff-email-input')?.value.trim();
  const role  = $('staff-role-input')?.value || 'viewer';
  if (!email) { toast('أدخل البريد الإلكتروني', true); return; }
  if (staffList.some(s => s.email === email)) { toast('الموظف مضاف مسبقاً', true); return; }
  try {
    const ref = await addDoc(collection(db, 'Staff'), { email, role });
    staffList.push({ id: ref.id, email, role });
    renderStaffTable();
    $('staff-email-input').value = '';
    toast('✅ تمت إضافة الموظف');
  } catch (e) { toast('خطأ: ' + e.message, true); }
}

async function deleteStaff(id) {
  if (!confirm('حذف هذا الموظف؟')) return;
  try {
    await deleteDoc(doc(db, 'Staff', id));
    staffList = staffList.filter(s => s.id !== id);
    renderStaffTable();
    toast('🗑 تم حذف الموظف');
  } catch (e) { toast('خطأ: ' + e.message, true); }
}

async function updateStaffRole(id, role) {
  try {
    await updateDoc(doc(db, 'Staff', id), { role });
    const s = staffList.find(s => s.id === id);
    if (s) s.role = role;
    toast('✅ تم تحديث الصلاحية');
  } catch (e) { toast('خطأ: ' + e.message, true); }
}

// Wire staff buttons
document.addEventListener('click', e => {
  const delBtn = e.target.closest('[data-staff-del]');
  if (delBtn) { deleteStaff(delBtn.dataset.staffDel); return; }
});
document.addEventListener('change', e => {
  const sel = e.target.closest('.staff-role-select');
  if (sel) { updateStaffRole(sel.dataset.staffId, sel.value); return; }
});
document.addEventListener('DOMContentLoaded', () => {
  $('staff-add-btn')?.addEventListener('click', addStaff);
  $('staff-email-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') addStaff(); });
});

// Staff is loaded as part of init()

// ══════════════════════════════════════════════════
//  BROWSE BY CATEGORY
// ══════════════════════════════════════════════════
let _browseCatId   = 'all';
let _browsePage    = 1;
const BROWSE_PER_PAGE = 10;

function renderBrowsePills() {
  const pills = $('browse-cat-pills');
  if (!pills) return;
  const allPill = `<button onclick="setBrowseCat('all')" style="border:none;padding:6px 14px;border-radius:20px;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;background:${_browseCatId==='all'?'rgba(42,140,255,.8)':'rgba(255,255,255,.07)'};color:${_browseCatId==='all'?'#fff':'rgba(255,255,255,.6)'}">الكل</button>`;
  const noCatCount = items.filter(i => !i.categoryID || !categories.find(c => c.id === i.categoryID)).length;
  const noCatPill = noCatCount > 0 ? `<button onclick="setBrowseCat('__none__')" style="border:none;padding:6px 14px;border-radius:20px;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;background:${_browseCatId==='__none__'?'rgba(251,146,60,.8)':'rgba(255,255,255,.07)'};color:${_browseCatId==='__none__'?'#fff':'rgba(255,255,255,.6)'}">⚠️ بدون تصنيف (${noCatCount})</button>` : '';
  const catPills = categories.map(cat => {
    const active = _browseCatId === cat.id;
    const color  = cat.color || '#3b82f6';
    return `<button onclick="setBrowseCat('${cat.id}')" style="border:none;padding:6px 14px;border-radius:20px;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;background:${active?color+'cc':'rgba(255,255,255,.07)'};color:${active?'#fff':'rgba(255,255,255,.6)'}">${cat.name}</button>`;
  });
  pills.innerHTML = allPill + noCatPill + catPills.join('');
}

window.setBrowseCat = function(catId) {
  _browseCatId = catId;
  _browsePage  = 1;
  const filtersEl = $('browse-filters');
  if (filtersEl) filtersEl.style.display = catId === 'all' ? 'none' : 'flex';
  // Refresh genre dropdown for this category
  const genreSel = $('browse-genre');
  if (genreSel && catId !== 'all') {
    const catItems = catId === '__none__'
      ? items.filter(i => !i.categoryID || !categories.find(c => c.id === i.categoryID))
      : items.filter(i => i.categoryID === catId);
    const genres = new Set();
    catItems.forEach(it => {
      const g = Array.isArray(it.genre) ? it.genre : (it.genre ? [it.genre] : []);
      g.forEach(v => v && genres.add(v));
    });
    genreSel.innerHTML = '<option value="">كل الأنواع</option>';
    [...genres].sort().forEach(g => {
      const o = document.createElement('option');
      o.value = g; o.textContent = g;
      genreSel.appendChild(o);
    });
  }
  renderBrowsePills();
  renderBrowseItems();
};

window.onBrowseSearch = function() {
  _browsePage = 1;
  renderBrowseItems();
};

window.browseChangePage = function(dir) {
  const searchQ = ($('browse-search')?.value || '').trim().toLowerCase();
  const condQ   = $('browse-condition')?.value || '';
  let baseList  = _browseCatId === 'all' ? items : _browseCatId === '__none__' ? items.filter(i => !i.categoryID || !categories.find(c => c.id === i.categoryID)) : items.filter(i => i.categoryID === _browseCatId);
  if (searchQ) baseList = baseList.filter(i => (i.name||'').toLowerCase().includes(searchQ));
  if (condQ)   baseList = baseList.filter(i => i.condition === condQ);
  const list = baseList;
  const totalPages = Math.max(1, Math.ceil(list.length / BROWSE_PER_PAGE));
  _browsePage = Math.min(totalPages, Math.max(1, _browsePage + dir));
  renderBrowseItems();
};

function renderBrowseItems() {
  const grid    = $('browse-items-grid');
  const pgInfo  = $('browse-page-info');
  const prevBtn = $('browse-prev');
  const nextBtn = $('browse-next');
  if (!grid) return;

  // 'all' → show category cards
  if (_browseCatId === 'all') {
    if (pgInfo) pgInfo.textContent = '';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(160px,1fr))';
    grid.style.gap = '12px';
    grid.innerHTML = categories.map(cat => {
      const count = items.filter(i => i.categoryID === cat.id).length;
      const color = cat.color || '#3b82f6';
      const img = cat.imageUrl
        ? `<img src="${cat.imageUrl}" style="width:100%;height:90px;object-fit:cover;display:block" onerror="this.style.display='none'">`
        : `<div style="height:90px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;font-size:2.2rem">🎮</div>`;
      return `
        <div onclick="setBrowseCat('${cat.id}')" style="background:rgba(255,255,255,.04);border:1px solid ${color}33;border-radius:14px;overflow:hidden;cursor:pointer;transition:all .18s" onmouseover="this.style.borderColor='${color}99'" onmouseout="this.style.borderColor='${color}33'">
          ${img}
          <div style="padding:10px 12px">
            <div style="font-weight:700;font-size:.85rem;color:${color}">${cat.name}</div>
            <div style="font-size:.7rem;opacity:.4;margin-top:2px">${count} عنصر</div>
          </div>
        </div>`;
    }).join('');
    return;
  }

  // restore list layout for items
  grid.style.display = 'flex';
  grid.style.flexDirection = 'column';
  grid.style.gap = '8px';
  if (prevBtn) prevBtn.style.display = '';
  if (nextBtn) nextBtn.style.display = '';

  const searchQ   = ($('browse-search')?.value   || '').trim().toLowerCase();
  const priceQ    = ($('browse-price')?.value     || '').trim();
  const discountQ = ($('browse-discount')?.value  || '').trim();
  const condQ     = $('browse-condition')?.value  || '';
  const genreQ    = $('browse-genre')?.value      || '';
  const qtyQ      = ($('browse-qty')?.value       || '').trim();
  const sortQ     = $('browse-sort')?.value       || '';
  let list = _browseCatId === '__none__'
    ? items.filter(i => !i.categoryID || !categories.find(c => c.id === i.categoryID))
    : items.filter(i => i.categoryID === _browseCatId);
  if (searchQ)   list = list.filter(i => (i.name||'').toLowerCase().includes(searchQ));
  if (priceQ)    list = list.filter(i => String(i.originalPrice||i.price||'').includes(priceQ));
  if (discountQ) list = list.filter(i => String(i.discountPrice||'').includes(discountQ));
  if (condQ)     list = list.filter(i => i.condition === condQ);
  if (genreQ)    list = list.filter(i => { const g = Array.isArray(i.genre)?i.genre.join(','):(i.genre||''); return g.includes(genreQ); });
  if (qtyQ)      list = list.filter(i => String(i.quantity||'').includes(qtyQ));
  if (sortQ === 'price-asc')  list = [...list].sort((a,b) => parseFloat(a.discountPrice||a.originalPrice||a.price||0) - parseFloat(b.discountPrice||b.originalPrice||b.price||0));
  if (sortQ === 'price-desc') list = [...list].sort((a,b) => parseFloat(b.discountPrice||b.originalPrice||b.price||0) - parseFloat(a.discountPrice||a.originalPrice||a.price||0));
  if (sortQ === 'name-asc')   list = [...list].sort((a,b) => (a.name||'').localeCompare(b.name||'','ar'));
  const totalPages = Math.max(1, Math.ceil(list.length / BROWSE_PER_PAGE));
  if (_browsePage > totalPages) _browsePage = totalPages;
  const pageItems  = list.slice((_browsePage - 1) * BROWSE_PER_PAGE, _browsePage * BROWSE_PER_PAGE);

  if (pgInfo) pgInfo.textContent = `صفحة ${_browsePage} من ${totalPages} · ${list.length} عنصر`;
  if (prevBtn) prevBtn.disabled = _browsePage <= 1;
  if (nextBtn) nextBtn.disabled = _browsePage >= totalPages;

  // Bulk bar visibility
  const bulkBar = $('browse-bulk-bar');
  if (bulkBar) {
    bulkBar.style.display = _browseCatId === 'all' ? 'none' : 'flex';
    const isNone = _browseCatId === '__none__';
    const moveCat = $('browse-move-cat');
    const moveBtn = $('browse-move-btn');
    if (moveCat) {
      moveCat.style.display = isNone ? '' : 'none';
      if (isNone && moveCat.options.length <= 1) {
        categories.forEach(cat => {
          const o = document.createElement('option');
          o.value = cat.id; o.textContent = cat.name;
          moveCat.appendChild(o);
        });
      }
    }
    if (moveBtn) moveBtn.style.display = isNone ? '' : 'none';
  }
  const selectAllCb = $('browse-select-all');
  if (selectAllCb) selectAllCb.checked = false;
  $('browse-selected-count') && ($('browse-selected-count').textContent = '0 محدد');

  const now = Date.now();
  grid.innerHTML = pageItems.map(it => {
    const img = it.images?.[0] || it.imageUrl || '';
    const hasDiscount = it.discountPrice && it.originalPrice && it.discountPrice < it.originalPrice;
    const saleEndsAt = it.saleEndsAt?.toDate ? it.saleEndsAt.toDate().getTime() : (it.saleEndsAt ? new Date(it.saleEndsAt).getTime() : 0);
    const isFlash = it.salePrice > 0 && saleEndsAt > now;
    const cat = categories.find(c => c.id === it.categoryID);
    const catColor = cat?.color || '#3b82f6';

    let priceHtml;
    if (isFlash) {
      priceHtml = `<span style="text-decoration:line-through;opacity:.4;font-size:.75em">${it.discountPrice||it.originalPrice}</span> <span style="color:#fb923c;font-weight:900">${it.salePrice}</span> <span style="font-size:.65em;color:#fb923c">⚡</span>`;
    } else if (hasDiscount) {
      priceHtml = `<span style="text-decoration:line-through;opacity:.4;font-size:.75em">${it.originalPrice}</span> <span style="color:#ff4444">${it.discountPrice}</span>`;
    } else {
      priceHtml = `<span>${it.originalPrice || it.price || 0}</span>`;
    }

    return `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;display:flex;align-items:center;gap:12px;padding:10px 14px">
        <input type="checkbox" class="browse-item-cb" data-id="${it.id}" onchange="browseUpdateCount()" style="width:16px;height:16px;flex-shrink:0;cursor:pointer;accent-color:#2a8cff">
        ${img ? `<img src="${img}" style="width:50px;height:50px;object-fit:cover;border-radius:7px;flex-shrink:0" onerror="this.style.display='none'">` : '<div style="width:50px;height:50px;border-radius:7px;flex-shrink:0;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:1.3rem">🎮</div>'}
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.87rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.name}</div>
          <div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap;align-items:center">
            <span style="font-size:.67rem;background:${catColor}22;color:${catColor};padding:1px 6px;border-radius:4px;border:1px solid ${catColor}44">${cat?.name||'—'}</span>
            ${it.condition?`<span style="font-size:.67rem;background:${it.condition==='جديد'?'rgba(52,211,153,.12)':'rgba(251,146,60,.1)'};color:${it.condition==='جديد'?'#34d399':'#fb923c'};padding:1px 6px;border-radius:4px">${it.condition}</span>`:''}
            ${it.genre?`<span style="font-size:.67rem;opacity:.38">${Array.isArray(it.genre)?it.genre[0]:it.genre}</span>`:''}
            ${it.quantity!=null?`<span style="font-size:.67rem;opacity:.32">الكمية: ${it.quantity}</span>`:''}
            ${isFlash?'<span style="font-size:.67rem;background:rgba(251,146,60,.2);color:#fb923c;padding:1px 6px;border-radius:4px">⚡ فلاش</span>':''}
          </div>
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:.8rem;color:#60a5fa;white-space:nowrap;flex-shrink:0;text-align:left">${priceHtml} <span style="opacity:.3;font-size:.65em">JOD</span></div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          ${currentRole!=='viewer'?`<button class="btn btn-edit btn-sm" style="font-size:.72rem;padding:4px 10px" data-item-edit="${it.id}">✏</button>`:''}
          ${currentRole!=='viewer'?`<button class="btn btn-sm" style="font-size:.72rem;padding:4px 10px;background:rgba(251,146,60,.15);color:#fb923c;border:1px solid rgba(251,146,60,.3)" data-item-flash="${it.id}">⚡</button>`:''}
          ${currentRole==='admin'?`<button class="btn btn-danger btn-sm" style="font-size:.72rem;padding:4px 10px" data-item-del="${it.id}">🗑</button>`:''}
        </div>
      </div>`;
  }).join('') || '<div style="opacity:.4;grid-column:1/-1;text-align:center;padding:30px">لا توجد عناصر</div>';
}

function showConfirm({ icon = '❓', title = '', msg = '', okLabel = 'تأكيد', okColor = '#2a8cff', danger = false } = {}) {
  return new Promise(resolve => {
    const modal = $('confirm-modal');
    $('confirm-icon').textContent  = icon;
    $('confirm-title').textContent = title;
    $('confirm-msg').textContent   = msg;
    const okBtn = $('confirm-ok-btn');
    okBtn.textContent   = okLabel;
    okBtn.style.background = danger ? 'linear-gradient(135deg,#ef4444,#f87171)' : `linear-gradient(135deg,${okColor},${okColor}cc)`;
    okBtn.style.color   = '#fff';
    modal.style.display = 'flex';
    const cleanup = (val) => { modal.style.display = 'none'; resolve(val); };
    okBtn.onclick = () => cleanup(true);
    $('confirm-cancel-btn').onclick = () => cleanup(false);
    modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
  });
}

function browseGetChecked() {
  return [...document.querySelectorAll('.browse-item-cb:checked')].map(cb => cb.dataset.id);
}

window.browseUpdateCount = function() {
  const ids = browseGetChecked();
  const el = $('browse-selected-count');
  if (el) el.textContent = `${ids.length} محدد`;
  const all = document.querySelectorAll('.browse-item-cb');
  const selAll = $('browse-select-all');
  if (selAll) selAll.checked = all.length > 0 && ids.length === all.length;
};

window.browseToggleAll = function(checked) {
  document.querySelectorAll('.browse-item-cb').forEach(cb => cb.checked = checked);
  browseUpdateCount();
};

window.browseBulkMove = async function() {
  const ids = browseGetChecked();
  if (!ids.length) {
    await showConfirm({ icon: 'ℹ️', title: 'لم تحدد أي عنصر', msg: 'حدد عنصراً واحداً على الأقل أولاً', okLabel: 'حسناً', okColor: '#6366f1' });
    return;
  }
  const catId = $('browse-move-cat')?.value;
  if (!catId) {
    await showConfirm({ icon: 'ℹ️', title: 'لم تختر تصنيفاً', msg: 'اختر التصنيف المراد التحويل إليه أولاً', okLabel: 'حسناً', okColor: '#6366f1' });
    return;
  }
  const catName = categories.find(c => c.id === catId)?.name || catId;
  const ok = await showConfirm({
    icon: '↪️',
    title: 'تحويل العناصر المحددة',
    msg: `سيتم تحويل ${ids.length} عنصر إلى تصنيف "${catName}"`,
    okLabel: 'تحويل',
    okColor: '#2a8cff'
  });
  if (!ok) return;
  try {
    await Promise.all(ids.map(id => updateDoc(doc(db, 'Items', id), { categoryID: catId })));
    ids.forEach(id => { const it = items.find(i => i.id === id); if (it) it.categoryID = catId; });
    renderBrowseItems();
    renderBrowsePills();
    toast(`✅ تم تحويل ${ids.length} عنصر إلى "${catName}"`);
  } catch(e) { toast('❌ حدث خطأ: ' + e.message); }
};

window.browseBulkDelete = async function() {
  const ids = browseGetChecked();
  if (!ids.length) {
    await showConfirm({ icon: 'ℹ️', title: 'لم تحدد أي عنصر', msg: 'حدد عنصراً واحداً على الأقل أولاً', okLabel: 'حسناً', okColor: '#6366f1' });
    return;
  }
  const ok = await showConfirm({
    icon: '🗑️',
    title: 'حذف العناصر المحددة',
    msg: `سيتم حذف ${ids.length} عنصر نهائياً ولا يمكن التراجع عن هذه العملية`,
    okLabel: 'حذف نهائي',
    danger: true
  });
  if (!ok) return;
  try {
    await Promise.all(ids.map(id => deleteDoc(doc(db, 'Items', id))));
    ids.forEach(id => { const idx = items.findIndex(i => i.id === id); if (idx > -1) items.splice(idx, 1); });
    renderBrowseItems();
    renderBrowsePills();
    renderDashboardStats();
    toast(`🗑 تم حذف ${ids.length} عنصر`);
  } catch(e) { toast('❌ حدث خطأ: ' + e.message); }
};

window.clearBrowseFilters = function() {
  ['browse-search','browse-price','browse-discount','browse-qty'].forEach(id=>{const el=$(id);if(el)el.value='';});
  ['browse-condition','browse-genre','browse-sort'].forEach(id=>{const el=$(id);if(el)el.value='';});
  _browsePage=1; renderBrowseItems();
};

window.openItemModalForBrowse = function() {
  openItemModal();
  setTimeout(() => {
    const catField      = $('item-cat-field');
    const catLabelField = $('item-cat-label-field');
    const catLabelText  = $('item-cat-label-text');
    const sel           = $('item-categoryID');
    if (_browseCatId !== 'all' && _browseCatId !== '__none__') {
      const cat = categories.find(c => c.id === _browseCatId);
      if (sel) sel.value = _browseCatId;
      if (catField)      catField.style.display      = 'none';
      if (catLabelField) catLabelField.style.display  = '';
      if (catLabelText)  catLabelText.textContent     = cat ? cat.name : _browseCatId;
    } else {
      if (catField)      catField.style.display      = '';
      if (catLabelField) catLabelField.style.display  = 'none';
    }
  }, 50);
};

// Wire browse tab open
document.addEventListener('click', e => {
  if (e.target.closest('[data-tab="browse"]')) {
    setTimeout(() => {
      renderBrowsePills();
      renderBrowseItems();
    }, 50);
  }
});

// ══════════════════════════════════════════════════
//  FLASH SALE
// ══════════════════════════════════════════════════
let flashTargetId = null;

window.openFlashModal = function(itemId) {
  flashTargetId = itemId;
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  $('flash-item-name').textContent = item.name;
  const currentSale = item.saleEndsAt?.toDate ? item.saleEndsAt.toDate() : (item.saleEndsAt ? new Date(item.saleEndsAt) : null);
  const isActive = currentSale && currentSale > new Date();
  $('flash-current').style.display = isActive ? '' : 'none';
  if (isActive) {
    $('flash-current-info').textContent = `سعر الفلاش: ${item.salePrice} JOD — ينتهي: ${currentSale.toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'})}`;
  }
  $('flash-sale-price').value = '';
  $('flash-duration').value = '2';
  $('flash-modal-err').textContent = '';
  $('flash-add-modal').style.display = 'flex';
  $('flash-sale-price').focus();
};

window.cancelFlashSale = async function() {
  if (!flashTargetId) return;
  try {
    await updateDoc(doc(db, 'Items', flashTargetId), { salePrice: null, saleEndsAt: null });
    const item = items.find(i => i.id === flashTargetId);
    if (item) { item.salePrice = null; item.saleEndsAt = null; }
    try { localStorage.removeItem('ofg_data_cache'); } catch {}
    $('flash-add-modal').style.display = 'none';
    toast('✅ تم إلغاء الفلاش سيل');
  } catch(e) { $('flash-modal-err').textContent = 'خطأ: ' + e.message; }
};

document.addEventListener('DOMContentLoaded', () => {
  $('flash-save-btn')?.addEventListener('click', async () => {
    if (!flashTargetId) return;
    const salePrice = parseFloat($('flash-sale-price').value);
    const hours     = parseFloat($('flash-duration').value) || 2;
    const errEl     = $('flash-modal-err');
    errEl.textContent = '';
    const item = items.find(i => i.id === flashTargetId);
    if (!item) return;
    const origPrice = parseFloat(item.discountPrice || item.originalPrice || item.price || 0);
    if (isNaN(salePrice) || salePrice <= 0) { errEl.textContent = 'أدخل سعراً صحيحاً'; return; }
    if (origPrice > 0 && salePrice >= origPrice) { errEl.textContent = `السعر يجب أن يكون أقل من ${origPrice} JOD`; return; }

    const saveBtn = $('flash-save-btn');
    saveBtn.disabled = true; saveBtn.textContent = 'جاري الحفظ...';
    try {
      const endsAt = new Date(Date.now() + hours * 3600000);
      await updateDoc(doc(db, 'Items', flashTargetId), { salePrice, saleEndsAt: endsAt });
      item.salePrice  = salePrice;
      item.saleEndsAt = endsAt;
      try { localStorage.removeItem('ofg_data_cache'); } catch {}
      $('flash-add-modal').style.display = 'none';
      toast(`⚡ فلاش سيل مفعّل لـ ${hours} ساعة`);
    } catch(e) { errEl.textContent = 'خطأ: ' + e.message; }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'تفعيل'; }
  });
});

document.addEventListener('click', e => {
  const flashBtn = e.target.closest('[data-item-flash]');
  if (flashBtn) { window.openFlashModal(flashBtn.dataset.itemFlash); return; }
});

// ══════════════════════════════════════════════════
//  COUPONS
// ══════════════════════════════════════════════════
let coupons = [];

async function loadCoupons() {
  try {
    const snap = await getDocs(query(collection(db, 'Coupons'), orderBy('createdAt', 'desc')));
    coupons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCouponsTable();
  } catch (e) { toast('خطأ في تحميل الكوبونات: ' + e.message, true); }
}

function renderCouponsTable() {
  const tbody = $('coupons-tbody');
  if (!tbody) return;
  if (!coupons.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">لا توجد كوبونات</td></tr>';
    return;
  }
  tbody.innerHTML = coupons.map(c => {
    const typeLabel = c.type === 'percent' ? `${c.value}%` : `${c.value} JOD`;
    const minLabel  = c.minOrder > 0 ? `${c.minOrder} JOD` : '—';
    const limitLabel = c.usageLimit > 0 ? c.usageLimit : 'بلا حد';
    const usedCount  = c.usedCount || 0;
    const isExpired  = c.usageLimit > 0 && usedCount >= c.usageLimit;
    return `<tr style="${isExpired ? 'opacity:.45' : ''}">
      <td><strong style="color:#60a5fa;letter-spacing:1px">${c.code}</strong>${isExpired ? ' <span style="font-size:.7rem;color:#f87171">(منتهي)</span>' : ''}</td>
      <td>${c.type === 'percent' ? 'نسبة %' : 'مبلغ ثابت'}</td>
      <td>${typeLabel}</td>
      <td>${minLabel}</td>
      <td style="color:${isExpired?'#f87171':'#34d399'}">${usedCount}</td>
      <td>${limitLabel}</td>
      <td><button class="btn btn-danger btn-sm" data-coupon-del="${c.id}">حذف</button></td>
    </tr>`;
  }).join('');
}

window.updateCouponValueLabel = function() {
  const type = $('coupon-type-input')?.value;
  const unit = $('coupon-value-unit');
  if (unit) unit.textContent = type === 'percent' ? '%' : 'JOD';
};

async function addCoupon() {
  const code  = $('coupon-code-input').value.trim().toUpperCase();
  const type  = $('coupon-type-input').value;
  const value = parseFloat($('coupon-value-input').value);
  const min   = parseFloat($('coupon-min-input').value) || 0;
  const limit = parseInt($('coupon-limit-input').value) || 0;
  const errEl = $('coupon-modal-err');
  if (errEl) errEl.textContent = '';

  if (!code)          { if(errEl) errEl.textContent='أدخل كود الكوبون'; return; }
  if (isNaN(value) || value <= 0) { if(errEl) errEl.textContent='أدخل قيمة صحيحة'; return; }
  if (type === 'percent' && value > 100) { if(errEl) errEl.textContent='النسبة لا تتجاوز 100%'; return; }
  if (coupons.find(c => c.code === code)) { if(errEl) errEl.textContent='الكود موجود مسبقاً'; return; }

  const addBtn = $('coupon-add-btn');
  if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'جاري الإضافة...'; }
  try {
    const docRef = await addDoc(collection(db, 'Coupons'), {
      code, type, value, minOrder: min, usageLimit: limit, usedCount: 0,
      createdAt: new Date()
    });
    coupons.unshift({ id: docRef.id, code, type, value, minOrder: min, usageLimit: limit, usedCount: 0 });
    renderCouponsTable();
    $('coupon-code-input').value = '';
    $('coupon-value-input').value = '';
    $('coupon-min-input').value = '';
    $('coupon-limit-input').value = '';
    $('coupon-add-modal').style.display = 'none';
    toast('✅ تم إضافة الكوبون');
  } catch (e) { if(errEl) errEl.textContent='خطأ: '+e.message; }
  finally { if (addBtn) { addBtn.disabled = false; addBtn.textContent = '+ إضافة'; } }
}

async function deleteCoupon(id) {
  if (!confirm('حذف هذا الكوبون؟')) return;
  try {
    await deleteDoc(doc(db, 'Coupons', id));
    coupons = coupons.filter(c => c.id !== id);
    renderCouponsTable();
    toast('🗑 تم حذف الكوبون');
  } catch (e) { toast('خطأ: ' + e.message, true); }
}

document.addEventListener('click', e => {
  const delBtn = e.target.closest('[data-coupon-del]');
  if (delBtn) { deleteCoupon(delBtn.dataset.couponDel); return; }
});
document.addEventListener('DOMContentLoaded', () => {
  $('coupon-add-btn')?.addEventListener('click', addCoupon);
  $('coupon-open-modal-btn')?.addEventListener('click', () => {
    $('coupon-modal-err').textContent = '';
    $('coupon-add-modal').style.display = 'flex';
    $('coupon-code-input')?.focus();
  });
});

// Load coupons when tab is opened
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-tab="coupons"]')?.addEventListener('click', () => {
    if (!coupons.length) loadCoupons();
  });
});
