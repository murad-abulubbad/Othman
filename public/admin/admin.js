import { app, db } from '../firebase.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
// ── CLOUDINARY ─────────────────────────────────────────
const CLD_CLOUD  = 'dpo1udlqv';
const CLD_PRESET = 'ofg_store'; // unsigned upload preset — create in Cloudinary dashboard

// ── STATE ──────────────────────────────────────────────
let categories = [];
let items      = [];

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
    const snap = await getDocs(
      query(collection(db, 'Categories'), orderBy('createdAt', 'desc'))
    );
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('stat-cats').textContent = categories.length;

    // Populate the item-form dropdown (show platform next to name)
    const sel = $('item-categoryID');
    sel.innerHTML = '<option value="">— اختر تصنيفاً —</option>' +
      categories.map(c =>
        `<option value="${c.id}" data-platform="${c.platform||''}">${c.name}${c.platform?' ('+c.platform+')':''}</option>`
      ).join('');

    // Render cats table
    $('cats-tbody').innerHTML = categories.length
      ? categories.map(c => {
          const pl = (c.platform||'').toLowerCase();
          const bc = ['ps4','ps5'].includes(pl) ? `badge-${pl}` : 'badge-other';
          return `<tr>
            <td>${c.name}</td>
            <td><span class="badge ${bc}">${c.platform||'—'}</span></td>
            <td>${c.imageUrl ? `<img src="${c.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px">` : '—'}</td>
            <td>${fmtDate(c.createdAt)}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-edit btn-sm" data-cat-edit="${c.id}">✏️ تعديل</button>
              <button class="btn btn-danger btn-sm" data-cat-del="${c.id}">🗑 حذف</button>
            </td>
          </tr>`;
        }).join('')
      : '<tr class="empty-row"><td colspan="4">لا توجد تصنيفات بعد</td></tr>';
  } catch (e) {
    toast('خطأ في تحميل التصنيفات: ' + e.message, true);
  }
}

async function addCategory() {
  const inp  = $('cat-name');
  const name = inp.value.trim();
  if (!name) return;
  const platform  = $('cat-platform').value;
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
    await addDoc(collection(db, 'Categories'), { name, platform, imageUrl, createdAt: serverTimestamp() });
    $('cat-add-modal').style.display = 'none';
    toast('✅ تم إضافة التصنيف');
    loadCategories();
  } catch (e) { toast('خطأ: ' + e.message, true); }
  saveBtn.textContent = 'حفظ';
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
let itemsFilters = { name:'', platform:'', originalPrice:'', discountPrice:'', condition:'', quantity:'' };
let itemsPage = 1;

function getFilteredItems() {
  return items.filter(it => {
    if (itemsFilters.name && !String(it.name||'').toLowerCase().includes(itemsFilters.name.toLowerCase())) return false;
    if (itemsFilters.platform && (it.platform||'') !== itemsFilters.platform) return false;
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
        return `
        <tr>
          <td><img class="item-img" src="${it.imageUrl||''}" alt="${it.name}"
               onerror="this.style.opacity='.25'"></td>
          <td>${it.name}</td>
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
    : `<tr class="empty-row"><td colspan="7">${items.length === 0 ? 'لا توجد عناصر بعد — أضف أول عنصر!' : 'لا توجد نتائج مطابقة للفلتر'}</td></tr>`;

  $('pg-info').textContent = `صفحة ${itemsPage} من ${totalPages} (${filtered.length} عنصر)`;
  $('pg-prev').disabled = itemsPage <= 1;
  $('pg-next').disabled = itemsPage >= totalPages;
}

async function loadItems() {
  try {
    const snap = await getDocs(
      query(collection(db, 'Items'), orderBy('createdAt', 'desc'))
    );
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    $('stat-total').textContent = items.length;
    $('stat-ps4').textContent   = items.filter(i => i.platform === 'PS4').length;
    $('stat-ps5').textContent   = items.filter(i => i.platform === 'PS5').length;

    renderItemsTable();
  } catch (e) {
    toast('خطأ في تحميل العناصر: ' + e.message, true);
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
function openItemModal(item = null) {
  $('item-modal-title').textContent = item ? 'تعديل العنصر' : 'إضافة عنصر جديد';
  $('item-id').value              = item?.id             || '';
  $('item-name').value            = item?.name           || '';
  $('item-imageUrl').value        = item?.imageUrl       || '';
  const pw = $('img-preview-wrap');
  pw.innerHTML = item?.imageUrl
    ? `<img src="${item.imageUrl}" alt="preview">`
    : '<div class="img-preview-ph">🖼<br>اضغط هنا لاختيار صورة من جهازك</div>';
  $('upload-fname').textContent   = '';
  $('item-image-file').value      = '';
  $('item-platform').value        = item?.platform       || 'PS4';
  $('item-categoryID').value      = item?.categoryID     || '';
  $('item-genre').value           = item?.genre          || '';
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

$('item-image-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  $('upload-fname').textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    $('img-preview-wrap').innerHTML = `<img src="${ev.target.result}" alt="preview">`;
  };
  reader.readAsDataURL(file);
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

  // Upload image from device if a new file was chosen
  let imageUrl = $('item-imageUrl').value;
  const fileInput = $('item-image-file');
  if (fileInput.files.length > 0) {
    try {
      saveBtn.textContent = '⬆ جاري رفع الصورة...';
      imageUrl = await uploadImage(fileInput.files[0]);
      $('item-imageUrl').value = imageUrl;
    } catch (uploadErr) {
      errEl.textContent = 'خطأ في رفع الصورة: ' + uploadErr.message;
      saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ';
      return;
    }
  }
  if (!imageUrl) {
    errEl.textContent = 'الرجاء اختيار صورة للمنتج';
    saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ';
    return;
  }

  const data = {
    name,
    imageUrl,
    platform:        $('item-platform').value,
    categoryID:      $('item-categoryID').value,
    genre:           $('item-genre').value.trim(),
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
      await addDoc(collection(db, 'Items'), { ...data, createdAt: serverTimestamp() });
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
$('cat-add-btn').addEventListener('click', () => {
  $('cat-name').value = '';
  $('cat-platform').value = 'PS4';
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
  $('cat-edit-platform').value      = cat.platform || 'PS4';
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
  const platform  = $('cat-edit-platform').value;
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
    await updateDoc(doc(db, 'Categories', id), { name, platform, imageUrl });
    toast('✅ تم تعديل التصنيف');
    closeCatEdit();
    loadCategories();
  } catch (e) { toast('خطأ: ' + e.message, true); }
  saveBtn.textContent = 'حفظ التعديل';
};
// Auto-fill platform when a category is selected
$('item-categoryID').addEventListener('change', () => {
  const opt = $('item-categoryID').selectedOptions[0];
  const pl  = opt?.dataset?.platform;
  if (pl) $('item-platform').value = pl;
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
