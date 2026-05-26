// ═══════════════════════════════════════════════════════════════════
//  FIRESTORE LOADER MODULE
//  Subscribes to Categories + Items collections and renders the page.
//
//  IMPORTANT: This module READS Firestore data only — never writes.
//  Field names are exactly those used by the admin panel:
//    Categories: name, platform, color, imageUrl, order, createdAt
//    Items:      name, imageUrl, images[], platform, categoryID,
//                originalPrice, discountPrice, genre, condition,
//                videoTrailerUrl, description, quantity, featured, createdAt
// ═══════════════════════════════════════════════════════════════════

import { db, collection, query, orderBy, getDocs, onSnapshot } from '../../firebase.js';
import { catItems, catPageTitles, IS_MOBILE } from './state.js';
import { optimizeCloudinaryUrl } from './utils.js';
import { renderGameGrid } from './products.js';
import { buildFilterBarHtml, setupCategoryFilter, attachDropdownCloseHandler } from './filter.js';
import { applyPendingDeepLink } from './router.js';
import { initTickerVisibility } from './effects.js';

const CACHE_KEY = 'ofg_data_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Image sizes adapt to viewport — saves bandwidth & decode time on mobile.
const GRID_THUMB_WIDTH   = IS_MOBILE ? 1000 : 1200;
const DETAIL_IMAGE_WIDTH = 1200;

// ── Cache helpers ──────────────────────────────────────────────────

function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, categories, items } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return { categories, items };
  } catch { return null; }
}

function setCachedData(categories, items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), categories, items }));
  } catch { /* localStorage full or denied — ignore */ }
}

// Admin panel can call this to bust the cache after writes.
window.bustFirestoreCache = function () {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

// ── State ───────────────────────────────────────────────────────────

let _categories = [];
let _items = [];
let _catsReady = false;
let _itemsReady = false;
let _rendered = false;
let _unsubCats = null;
let _unsubItems = null;

function tryRender() {
  if (!_catsReady || !_itemsReady) return;
  setCachedData(_categories, _items);
  renderAll(_categories, _items);
}

// ── Public entry ────────────────────────────────────────────────────

export function startFirestoreLoader() {
  // Paint from cache for instant first frame.
  const cached = getCachedData();
  if (cached && !_rendered) {
    _categories = cached.categories;
    _items = cached.items;
    _catsReady = true;
    _itemsReady = true;
    renderAll(_categories, _items);
  }

  if (_unsubCats) { _unsubCats(); _unsubCats = null; }
  if (_unsubItems) { _unsubItems(); _unsubItems = null; }

  // Realtime listener — Categories.
  _unsubCats = onSnapshot(
    query(collection(db, 'Categories'), orderBy('order', 'asc')),
    (snap) => {
      _categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _catsReady = true;
      tryRender();
    },
    () => {
      // Fallback if listener fails (e.g. offline).
      getDocs(collection(db, 'Categories')).then(snap => {
        _categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _catsReady = true;
        tryRender();
      });
    }
  );

  // Realtime listener — Items.
  _unsubItems = onSnapshot(
    collection(db, 'Items'),
    (snap) => {
      _items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _itemsReady = true;
      tryRender();
    },
    () => {
      getDocs(collection(db, 'Items')).then(snap => {
        _items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _itemsReady = true;
        tryRender();
      });
    }
  );

  attachDropdownCloseHandler();
}

// ── SVG/Icon helpers ───────────────────────────────────────────────

const PLACEHOLDER_NAV_ICON = `<span class='section-nav-icon'><svg width='28' height='28' viewBox='0 0 24 24' fill='currentColor'><path d='M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/></svg></span>`;

const SIDEBAR_FALLBACK_ICON = `<svg width='24' height='24' viewBox='0 0 24 24' fill='rgba(255,255,255,0.5)'><path d='M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/></svg>`;

const COMING_SOON_HTML = (catName) => `
  <div class="coming-soon-block">
    <span class="big-icon">
      <svg width='48' height='48' viewBox='0 0 24 24' fill='rgba(255,255,255,0.2)'><path d='M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z'/></svg>
    </span>
    <h3>قسم ${catName} قادم قريباً</h3>
    <p>سيتم إضافة المنتجات لهذا القسم قريباً، تابعنا على السوشيال ميديا لتصلك آخر التحديثات.</p>
    <div class="countdown">COMING SOON</div>
  </div>`;

// ── Item formatting ─────────────────────────────────────────────────

const MAX_PRICE = 10000;

function formatItem(item) {
  let originalPrice = parseFloat(item.originalPrice) || 0;
  let discountPrice = parseFloat(item.discountPrice) || 0;
  if (originalPrice > MAX_PRICE || originalPrice < 0) originalPrice = 0;
  if (discountPrice > MAX_PRICE || discountPrice < 0) discountPrice = 0;
  const finalPrice = (discountPrice > 0 && discountPrice < originalPrice) ? discountPrice : originalPrice;

  let priceLabel;
  if (finalPrice > 0 && finalPrice <= MAX_PRICE) {
    priceLabel = (discountPrice > 0 && discountPrice < originalPrice)
      ? `<span class="price-old">${originalPrice.toFixed(2)}</span><span class="price-new">${discountPrice.toFixed(2)}</span>`
      : `<span class="price-new">${originalPrice.toFixed(2)}</span>`;
  } else {
    priceLabel = 'حسب الطلب';
  }

  // Support both old (imageUrl) and new (images[]) shapes — backward compatible.
  let mainImage = item.imageUrl;
  let imagesArray = [];
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    mainImage = item.images[0];
    imagesArray = item.images;
  } else if (item.imageUrl) {
    imagesArray = [item.imageUrl];
  }

  return {
    id: item.id,
    name: item.name,
    img: optimizeCloudinaryUrl(mainImage, GRID_THUMB_WIDTH),
    images: imagesArray.map(u => optimizeCloudinaryUrl(u, DETAIL_IMAGE_WIDTH)),
    price: finalPrice,
    priceLabel,
    genre: item.genre,
    condition: item.condition || 'مستعمل',
    trailer: item.videoTrailerUrl,
    originalPrice,
    discountPrice,
    description: item.description || '',
    quantity: item.quantity !== undefined ? Number(item.quantity) : null
  };
}

// ── Render the entire page from categories + items ─────────────────

function renderAll(categories, items) {
  _rendered = true;
  try {
    const itemsByCategory = new Map();
    const categoriesById = new Map();
    const categoryCounts = new Map();

    categories.forEach(cat => {
      categoriesById.set(cat.id, cat);
      itemsByCategory.set(cat.id, []);
      categoryCounts.set(cat.id, 0);
    });

    items.forEach(item => {
      const catId = item.categoryID;
      if (!itemsByCategory.has(catId)) itemsByCategory.set(catId, []);
      itemsByCategory.get(catId).push(item);
      categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
    });

    renderSectionCards(categories);
    renderDynamicSections(categories, items, itemsByCategory);
    populateTicker(items, categoriesById);
    populateCatSidebar(categories, categoryCounts);

    // Apply any deep-link the user landed on.
    applyPendingDeepLink();

  } catch (error) {
    // Surface a friendly error if anything breaks.
    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid) {
      sectionsGrid.innerHTML = '<div style="color: #ff6b6b; text-align: center; padding: 20px;">فشل تحميل البيانات. يرجى تحديث الصفحة.</div>';
    }
    // Log to console for debugging but never throw.
    console.error('[firestore] renderAll failed:', error);
  }
}

// ── Section nav cards (homepage) ───────────────────────────────────

function renderSectionCards(categories) {
  const sectionsGrid = document.getElementById('sections-grid');
  if (!sectionsGrid) return;

  if (categories.length === 0) {
    sectionsGrid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">لا توجد أقسام حالياً. أضف أقسام من لوحة الإدارة.</div>';
    return;
  }

  sectionsGrid.innerHTML = categories.map(cat => {
    const iconHtml = cat.imageUrl
      ? `<img class="section-nav-icon" src="${cat.imageUrl}" alt="${cat.name}" onerror="this.outerHTML='${PLACEHOLDER_NAV_ICON.replace(/'/g, "\\'")}'">`
      : PLACEHOLDER_NAV_ICON;
    return `
      <a href="#cat-${cat.id}" class="section-nav-card">
        ${iconHtml}
        <div class="section-nav-name">${cat.name}</div>
      </a>`;
  }).join('');

  requestAnimationFrame(() => {
    sectionsGrid.querySelectorAll('.section-nav-card').forEach((el, i) => {
      el.style.transitionDelay = ((i % 6) * 0.08) + 's';
      setTimeout(() => el.classList.add('visible'), 30);
    });
  });
}

// ── Dynamic per-category sections ───────────────────────────────────

function renderDynamicSections(categories, items, itemsByCategory) {
  const dynamicSections = document.getElementById('dynamic-sections');
  if (!dynamicSections) return;

  dynamicSections.innerHTML = categories.map(cat => {
    const categoryItems = itemsByCategory.get(cat.id) || [];
    const hasItems = categoryItems.length > 0;
    const body = hasItems
      ? `${buildFilterBarHtml(cat.id, cat.name, categoryItems)}<div class="image-grid" id="grid-cat-${cat.id}"></div>`
      : COMING_SOON_HTML(cat.name);

    const titleColor = cat.color || '#3b82f6';
    return `
      <section id="cat-${cat.id}" class="dynamic-category-section">
        <h2 class="section-title visible" style="color:${titleColor};text-shadow:0 0 20px ${titleColor}40">${cat.name}</h2>
        <div class="section-line visible" style="background:${titleColor};box-shadow:0 0 15px ${titleColor}"></div>
        ${body}
      </section>`;
  }).join('');

  // Render items per category + wire filter setup.
  categories.forEach(cat => {
    const categoryItems = items.filter(item => item.categoryID === cat.id);
    if (categoryItems.length === 0) return;

    const formattedItems = categoryItems.map(formatItem);
    renderGameGrid(`grid-cat-${cat.id}`, formattedItems, cat.name, cat.color);

    // Reveal newly-rendered cards.
    requestAnimationFrame(() => {
      document.querySelectorAll(`#grid-cat-${cat.id} .image-card`).forEach((el, i) => {
        el.style.transitionDelay = ((i % 6) * 0.08) + 's';
        setTimeout(() => el.classList.add('visible'), 30);
      });
    });

    catItems[cat.id] = formattedItems;
    // Wire filter listeners on next tick to keep the main paint fast.
    setTimeout(() => setupCategoryFilter(cat.id, cat.name, formattedItems, cat.color), 0);

    // Map for router titles.
    catPageTitles[`cat-${cat.id}`] = cat.name;
  });
}

// ── Featured ticker ─────────────────────────────────────────────────

function populateTicker(items, categoriesById) {
  const tickerWrap = document.getElementById('news-ticker-wrap');
  const tickerTrack = document.getElementById('news-ticker-track');
  if (!tickerTrack) return;

  let featuredItems = items.filter(i => i.featured === true);
  if (featuredItems.length === 0) featuredItems = [...items].slice(0, 10);
  if (featuredItems.length === 0) return;

  const buildItem = (item) => {
    const safeId = (item.id || '').replace(/'/g, '');
    return `<div class="ticker-item" onclick="(function(){var el=document.querySelector('[data-item-id=\\'${safeId}\\']')||document.getElementById('cat-${item.categoryID}');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});})()">
        <span class="ticker-item-badge">جديد</span>
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}">` : ''}
        <span class="ticker-item-name">${item.name}</span>
      </div>`;
  };
  const itemsHtml = featuredItems.map(buildItem).join('');

  // Ensure the loop fills the viewport seamlessly.
  const minCopies = Math.max(10, Math.ceil(20 / featuredItems.length));
  const copies = minCopies % 2 === 0 ? minCopies : minCopies + 1;
  tickerTrack.innerHTML = itemsHtml.repeat(copies);
  // Use a class instead of inline style so CSS can still hide the ticker
  // on inner pages (body.in-page-mode). Inline style.display always wins
  // over CSS rules \u2014 that's why the ticker was leaking onto category pages.
  if (tickerWrap) tickerWrap.classList.add('is-populated');
  tickerTrack.style.animationDuration = Math.max(20, featuredItems.length * 7) + 's';

  // Pause the ticker animation when it scrolls off-screen — saves the
  // compositor a continuous layer update on mobile.
  initTickerVisibility();
}

// ── Categories sidebar ──────────────────────────────────────────────

function populateCatSidebar(categories, categoryCounts) {
  const list = document.getElementById('cat-sidebar-list');
  if (!list) return;
  const overlay = document.getElementById('cat-sidebar-overlay');
  const sidebar = document.getElementById('cat-sidebar');
  const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); };

  list.innerHTML = categories.map(cat => {
    const count = categoryCounts.get(cat.id) || 0;
    const img = cat.imageUrl
      ? `<img src="${cat.imageUrl}" alt="${cat.name}">`
      : SIDEBAR_FALLBACK_ICON;
    return `<button class="cat-sidebar-item" onclick="closeCatSidebar();navigateToPage('cat-${cat.id}')">
      ${img}
      <span class="cat-sb-name">${cat.name}</span>
      <span class="cat-sb-count">${count}</span>
    </button>`;
  }).join('');

  window.closeCatSidebar = close;
}
