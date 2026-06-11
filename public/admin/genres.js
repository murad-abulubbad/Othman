// ═══════════════════════════════════════════════════════════════════
//  GENRES MODULE  (admin)
//  Manages the dynamic `Genres` Firestore collection: list table,
//  add/edit/delete modals, and the selectable genre tags inside the
//  item modal.
//
//  Genres schema: { name: string, emoji: string (optional), order: number }
//  This module READS/WRITES the `Genres` collection only — it never
//  touches the `genre` field stored on Items (that stays an array of
//  strings handled by the item form in admin.js).
// ═══════════════════════════════════════════════════════════════════

import { db } from '../firebase.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const $ = (id) => document.getElementById(id);

// ── State / dependencies ────────────────────────────────────────────
let genres = [];
let _toast = (msg) => console.log(msg);

// Expose the loaded genres to the rest of the admin panel.
export function getGenres() { return genres; }

function bustStoreCache() {
  try { localStorage.removeItem('ofg_data_cache'); } catch {}
}

// ── Load ─────────────────────────────────────────────────────────────
export async function loadGenres() {
  console.log('[genres] loadGenres START');
  try {
    let snap;
    try {
      snap = await getDocs(query(collection(db, 'Genres'), orderBy('order', 'asc')));
      console.log('[genres] loaded with order, count:', snap.size);
    } catch (err) {
      console.warn('[genres] orderBy failed:', err.code, err.message);
      snap = await getDocs(collection(db, 'Genres'));
      console.log('[genres] loaded without order, count:', snap.size);
    }
    genres = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('[genres] loadGenres FAILED:', e.code, e.message);
    genres = [];
  }
  console.log('[genres] calling renderGenresTable, genres:', genres.length);
  renderGenresTable();
  console.log('[genres] renderGenresTable done, tbody:', document.getElementById('genres-tbody'));
}

// ── Render: genres table + items-table filter dropdown ───────────────
export function renderGenresTable() {
  const filterSel = $('filter-genre');
  if (filterSel) {
    const cur = filterSel.value;
    filterSel.innerHTML = '<option value="">كل الأنواع</option>' +
      genres.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
    filterSel.value = cur;
  }

  const tbody = $('genres-tbody');
  if (tbody) {
    tbody.innerHTML = genres.length
      ? genres.map(g => `<tr data-genre-id="${g.id}">
          <td>${g.name}</td>
          <td style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-edit btn-sm" data-genre-edit="${g.id}">✏️ تعديل</button>
            <button class="btn btn-danger btn-sm" data-genre-del="${g.id}">🗑 حذف</button>
          </td>
        </tr>`).join('')
      : '<tr class="empty-row"><td colspan="3">لا توجد أنواع بعد — أضف أول نوع!</td></tr>';
  }
}

// Render the selectable genre tags inside the item modal. Any value stored on
// the item that no longer exists in the Genres collection is still shown (and
// kept active) so editing/saving never silently wipes legacy data.
export function renderGenreTags(selectedValues = []) {
  const wrap = $('item-genre-wrap');
  if (!wrap) return;
  const known = genres.map(g => g.name);
  const extras = selectedValues.filter(v => v && !known.includes(v));
  const tags = [
    ...genres.map(g => ({ value: g.name, label: g.name, legacy: false })),
    ...extras.map(v => ({ value: v, label: `⚠️ ${v}`, legacy: true }))
  ];
  if (tags.length === 0) {
    wrap.innerHTML = '<div style="grid-column:1/-1;opacity:.5;font-size:.8rem;padding:6px 0">لا توجد أنواع بعد — أضفها من قسم «الأنواع» بالأسفل</div>';
    return;
  }
  wrap.innerHTML = tags.map(t =>
    `<button type="button" class="genre-tag${selectedValues.includes(t.value) ? ' active' : ''}" data-value="${t.value}"${t.legacy ? ' title="نوع قديم غير موجود بالجدول — سيُحفظ كما هو"' : ''}>${t.label}</button>`
  ).join('');
}

// ── CRUD ─────────────────────────────────────────────────────────────
async function addGenre() {
  const name = $('genre-name').value.trim();
  if (!name) return;
  if (genres.some(g => g.name === name)) { _toast('هذا النوع موجود مسبقاً', true); return; }
  const saveBtn = $('genre-save-btn');
  saveBtn.disabled = true;
  try {
    const maxOrder = genres.length ? Math.max(...genres.map(g => g.order || 0)) : 0;
    const order = maxOrder + 1;
    const docRef = await addDoc(collection(db, 'Genres'), { name, order });
    genres.push({ id: docRef.id, name, order });
    renderGenresTable();
    $('genre-add-modal').style.display = 'none';
    _toast('✅ تم إضافة النوع');
    bustStoreCache();
  } catch (e) { _toast('خطأ: ' + e.message, true); }
  saveBtn.disabled = false;
}

function openGenreEdit(g) {
  $('genre-edit-id').value   = g.id;
  $('genre-edit-name').value = g.name || '';
  $('genre-edit-modal').style.display = 'flex';
}

async function saveGenreEdit() {
  const id   = $('genre-edit-id').value;
  const name = $('genre-edit-name').value.trim();
  if (!name) return;
  if (genres.some(g => g.name === name && g.id !== id)) { _toast('هذا النوع موجود مسبقاً', true); return; }
  try {
    await updateDoc(doc(db, 'Genres', id), { name });
    const idx = genres.findIndex(g => g.id === id);
    if (idx !== -1) { genres[idx].name = name; }
    renderGenresTable();
    $('genre-edit-modal').style.display = 'none';
    _toast('✅ تم تعديل النوع');
    bustStoreCache();
  } catch (e) { _toast('خطأ: ' + e.message, true); }
}

async function deleteGenre(id) {
  if (!confirm('حذف هذا النوع؟ (لن يتأثر تخزينه على المنتجات الحالية)')) return;
  try {
    await deleteDoc(doc(db, 'Genres', id));
    genres = genres.filter(g => g.id !== id);
    renderGenresTable();
    _toast('🗑 تم حذف النوع');
    bustStoreCache();
  } catch (e) { _toast('خطأ: ' + e.message, true); }
}

// ── Wire up buttons + event delegation ───────────────────────────────
// Call once after the DOM is ready. `toast` is injected from admin.js so
// notifications stay consistent across the panel.
export function initGenres({ toast } = {}) {
  if (typeof toast === 'function') _toast = toast;

  document.addEventListener('click', (e) => {
    // Open add modal
    if (e.target.closest('#genre-add-btn')) {
      $('genre-name').value = '';
      $('genre-add-modal').style.display = 'flex';
      return;
    }
    // Close add modal
    if (e.target.closest('#genre-cancel-btn')) {
      $('genre-add-modal').style.display = 'none';
      return;
    }
    // Save new genre
    if (e.target.closest('#genre-save-btn')) {
      addGenre();
      return;
    }
    // Close edit modal
    if (e.target.closest('#genre-edit-cancel-btn')) {
      $('genre-edit-modal').style.display = 'none';
      return;
    }
    // Save genre edit
    if (e.target.closest('#genre-edit-save-btn')) {
      saveGenreEdit();
      return;
    }
    // Table row: edit
    const editBtn = e.target.closest('[data-genre-edit]');
    if (editBtn) {
      const g = genres.find(x => x.id === editBtn.dataset.genreEdit);
      if (g) openGenreEdit(g);
      return;
    }
    // Table row: delete
    const delBtn = e.target.closest('[data-genre-del]');
    if (delBtn) { deleteGenre(delBtn.dataset.genreDel); return; }

    // Toggle selectable genre tags inside the item modal.
    const genreTag = e.target.closest('#item-genre-wrap .genre-tag');
    if (genreTag) { genreTag.classList.toggle('active'); return; }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement?.id === 'genre-name') addGenre();
  });
}
