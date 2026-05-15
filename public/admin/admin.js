import { app, db } from '../firebase.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
// ── CLOUDINARY ─────────────────────────────────────────
const CLD_CLOUD  = 'dpo1udlqv';
const CLD_PRESET = 'ofg_store'; // unsigned upload preset — create in Cloudinary dashboard

// ── STATE ──────────────────────────────────────────────
let categories = [];
let items      = [];
let selectedItemIds = new Set();

// ── HELPERS ────────────────────────────────────────────
async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  return items.filter(item => item.categoryID === categoryId).length;
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

  statsRow.innerHTML = `
    <div class="stat-card stat-card-total">
      <div class="s-num">${items.length}</div>
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
        await Promise.all(categories.map((c, i) => updateDoc(doc(db, 'Categories', c.id), { order: i + 1 })));
        toast('✅ تم حفظ الترتيب الجديد');
        await loadCategories();
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
  const u    = $('admin-user').value.trim();
  const p    = $('admin-pass').value;
  const errEl = $('login-err');
  errEl.textContent = '';

  if (!u || !p) { errEl.textContent = 'الرجاء إدخال بيانات الدخول'; return; }

  const btn = $('login-btn');
  btn.disabled = true; btn.textContent = 'جاري التحقق...';

  try {
    const hash = await sha256(p);
    const snap = await getDocs(
      query(collection(db, 'AdminUsers'), where('username', '==', u))
    );
    const userData    = snap.empty ? null : snap.docs[0].data();
    // Support both field name spellings: passhash (correct) and passhesh (typo)
    const storedValue = userData?.passhash ?? userData?.passhesh ?? null;
    // Auto-detect: if it's a 64-char hex string treat it as SHA-256, otherwise compare plaintext
    const isHashed    = /^[0-9a-f]{64}$/i.test(storedValue ?? '');
    const matches     = isHashed ? storedValue === hash : storedValue === p;
    if (!snap.empty && matches) {
      sessionStorage.setItem('ofg-admin', '1');
      $('login-overlay').style.display = 'none';
      $('dashboard').style.display     = 'block';
      init();
    } else {
      errEl.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
  } catch (e) {
    errEl.textContent = 'خطأ في الاتصال: ' + e.message;
  }
  btn.disabled = false; btn.textContent = 'تسجيل الدخول';
}

function logout() {
  sessionStorage.removeItem('ofg-admin');
  $('dashboard').style.display     = 'none';
  $('login-overlay').style.display = 'flex';
  $('admin-pass').value = '';
}

// ── INIT ───────────────────────────────────────────────
async function init() {
  await Promise.all([ loadCategories(), loadItems() ]);
}

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
      await addDoc(collection(db, 'Categories'), { name, imageUrl, order: newOrder });
    $('cat-add-modal').style.display = 'none';
    toast('✅ تم إضافة التصنيف');
    loadCategories();
  } catch (e) { toast('خطأ: ' + e.message, true); }
  saveBtn.textContent = 'حفظ';

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
      await loadCategories();
      toast('✅ تم تعديل ترتيب التصنيفات');
    } catch (err) { toast('خطأ في تعديل الترتيب: ' + err.message, true); }
  }
}

async function deleteCategory(id) {
  if (!confirm('حذف هذا التصنيف؟')) return;
  try {
    await deleteDoc(doc(db, 'Categories', id));
    toast('🗑 تم حذف التصنيف');
    loadCategories();
  } catch (e) { toast('خطأ: ' + e.message, true); }
}

// ── ITEMS ──────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;
let itemsFilters = { name:'', categoryID:'', originalPrice:'', discountPrice:'', condition:'', quantity:'' };
let itemsPage = 1;

function getFilteredItems() {
  return items.filter(it => {
    if (itemsFilters.name && !String(it.name||'').toLowerCase().includes(itemsFilters.name.toLowerCase())) return false;
    // platform field removed from storage; skip platform filtering
    if (itemsFilters.categoryID && (it.categoryID||'') !== itemsFilters.categoryID) return false;
    if (itemsFilters.originalPrice && !String(it.originalPrice ?? '').includes(itemsFilters.originalPrice)) return false;
    if (itemsFilters.discountPrice && !String(it.discountPrice ?? '').includes(itemsFilters.discountPrice)) return false;
    if (itemsFilters.condition && (it.condition||'') !== itemsFilters.condition) return false;
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
          <td class="td-select"><input type="checkbox" class="row-select" data-item-select="${it.id}" ${selectedItemIds.has(it.id) ? 'checked' : ''}></td>
          <td><img class="item-img" src="${it.imageUrl||''}" alt="${it.name}"
               onerror="this.style.opacity='.25'"></td>
          <td>${it.name}</td>
          <td>${categoryName}</td>
          <td>${priceHtml}</td>
          <td>${hasDiscount ? it.discountPrice + ' JOD' : '—'}</td>
          <td>${it.condition||'—'}</td>
          <td>${qtyBadge}</td>
          <td class="td-actions">
            <button class="btn btn-edit btn-sm" data-item-edit="${it.id}">✏ تعديل</button>
            <button class="btn btn-danger btn-sm" data-item-del="${it.id}">🗑 حذف</button>
          </td>
        </tr>`;
      }).join('')
    : `<tr class="empty-row"><td colspan="9">${items.length === 0 ? 'لا توجد عناصر بعد — أضف أول عنصر!' : 'لا توجد نتائج مطابقة للفلتر'}</td></tr>`;

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
    toast(`🗑 تم حذف ${ids.length} عنصر${ids.length === 1 ? '' : 'ات'}`);
    loadItems();
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
  renderImagesGallery();

  $('upload-fname').textContent   = '';
  $('item-image-file').value      = '';
  // platform field no longer used/stored
  $('item-categoryID').value      = item?.categoryID     || '';
  $('item-condition').value       = item?.condition      || 'مستعمل';
  $('item-quantity').value        = item?.quantity       ?? 1;
  $('item-originalPrice').value   = item?.originalPrice  ?? '';
  $('item-discountPrice').value   = item?.discountPrice  ?? 0;
  $('item-description').value     = item?.description    || '';
  $('item-videoTrailerUrl').value = item?.videoTrailerUrl || '';
  $('form-err').textContent       = '';
  $('item-modal').classList.add('open');
}
window.openItemModal  = openItemModal;

function closeItemModal() { $('item-modal').classList.remove('open'); }
window.closeItemModal = closeItemModal;

// ── IMAGE UPLOAD (Cloudinary) ─────────────────────────────────
function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLD_PRESET);
    form.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`);

    xhr.upload.onprogress = ev => {
      if (!ev.lengthComputable) return;
      const pct = (ev.loaded / ev.total * 100).toFixed(0) + '%';
      const bar = $('upload-progress-fill');
      const wrap = $('upload-progress-bar');
      if (bar && wrap) { wrap.style.display = 'block'; bar.style.width = pct; }
    };
    xhr.onload = () => {
      const bar = $('upload-progress-fill'), wrap = $('upload-progress-bar');
      if (bar && wrap) { wrap.style.display = 'none'; bar.style.width = '0%'; }
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else {
        const msg = JSON.parse(xhr.responseText)?.error?.message || 'Upload failed';
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form);
  });
}

function uploadCatImage(file)  { return uploadToCloudinary(file, 'ofg/categories'); }
function uploadImage(file)     { return uploadToCloudinary(file, 'ofg/items'); }

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

  // Check if at least one image exists
  if (currentItemImages.length === 0) {
    errEl.textContent = 'الرجاء إضافة صورة واحدة على الأقل للمنتج';
    saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ';
    return;
  }

  // Prepare data with images array (first image is main, rest are additional)
  const data = {
    name,
    imageUrl: currentItemImages[0], // Keep for backward compatibility
    images: currentItemImages, // New array format
    categoryID:      $('item-categoryID').value,
    condition:       $('item-condition').value,
    quantity:        parseInt($('item-quantity').value) || 0,
    originalPrice,
    discountPrice,
    description:     $('item-description').value.trim(),
    videoTrailerUrl: $('item-videoTrailerUrl').value.trim(),
  };
  saveBtn.textContent = 'جاري الحفظ...';
  try {
    if (id) {
      await updateDoc(doc(db, 'Items', id), data);
      toast('✅ تم تحديث العنصر بنجاح');
    } else {
      await addDoc(collection(db, 'Items'), data);
      toast('✅ تم إضافة العنصر بنجاح');
    }
    closeItemModal();
    loadItems();
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
      selectedItemIds.delete(delItemBtn.dataset.itemDel);
      await deleteDoc(doc(db, 'Items', delItemBtn.dataset.itemDel));
      toast('🗑 تم حذف العنصر');
      loadItems();
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
    await updateDoc(doc(db, 'Categories', id), { name, imageUrl });
    toast('✅ تم تعديل التصنيف');
    closeCatEdit();
    loadCategories();
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

// ── AUTO-RESTORE SESSION ───────────────────────────────
if (sessionStorage.getItem('ofg-admin') === '1') {
  $('login-overlay').style.display = 'none';
  $('dashboard').style.display     = 'block';
  init();
}
