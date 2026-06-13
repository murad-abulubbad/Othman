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

import { db, collection, query, orderBy, where, getDocs, onSnapshot } from '../../firebase.js';
import { catItems, catPageTitles, IS_MOBILE } from './state.js';
import { renderGameGrid } from './products.js';
import { buildFilterBarHtml, setupCategoryFilter, attachDropdownCloseHandler } from './filter.js';
import { applyPendingDeepLink } from './router.js';
import { initTickerVisibility } from './effects.js';

const CACHE_KEY = 'ofg_data_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Image sizes adapt to viewport — saves bandwidth & decode time on mobile.
const GRID_THUMB_WIDTH   = IS_MOBILE ? 1000 : 1200;
const DETAIL_IMAGE_WIDTH = 1200;

// ── Cache helpers ──────────────────────────────────────────────────

function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, categories } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return { categories };
  } catch { return null; }
}

function setCachedData(categories) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), categories }));
  } catch { /* localStorage full or denied — ignore */ }
}

// Admin panel can call this to bust the cache after writes.
window.bustFirestoreCache = function () {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

// ── Slug helper ─────────────────────────────────────────────────────
function toSlug(name) {
  return (name || '').trim().replace(/\s+/g, '-').replace(/[^\u0600-\u06FF\w-]/g, '');
}

// ── State ───────────────────────────────────────────────────────────

let _categories = [];
let _catsReady = false;
let _rendered = false;
let _unsubCats = null;
const _loadedCats = new Set(); // track which categoryIDs already fetched

// ── Public entry ────────────────────────────────────────────────────

export function startFirestoreLoader() {
  if (_unsubCats) { _unsubCats(); _unsubCats = null; }

  // Paint from cache for instant first frame (categories only).
  const cached = getCachedData();
  if (cached && !_rendered) {
    _categories = cached.categories;
    renderAll(_categories);
  }

  // Load Categories only — Items are fetched per-category on demand.
  _unsubCats = onSnapshot(
    query(collection(db, 'Categories'), orderBy('order', 'asc')),
    (snap) => {
      _categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCachedData(_categories);
      if (!_rendered) renderAll(_categories);
    },
    () => {
      getDocs(collection(db, 'Categories')).then(snap => {
        _categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCachedData(_categories);
        if (!_rendered) renderAll(_categories);
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
    img: mainImage,
    images: imagesArray,
    price: finalPrice,
    priceLabel,
    genre: item.genre,
    condition: item.condition || 'مستعمل',
    trailer: item.videoTrailerUrl,
    originalPrice,
    discountPrice,
    description: item.description || '',
    quantity: item.quantity !== undefined ? Number(item.quantity) : null,
    salePrice: item.salePrice || null,
    saleEndsAt: item.saleEndsAt?.toDate
      ? item.saleEndsAt.toDate().getTime()
      : (item.saleEndsAt ? new Date(item.saleEndsAt).getTime() : null)
  };
}

// ── Render the entire page from categories + items ─────────────────

function renderAll(categories) {
  _rendered = true;
  try {
    const slugMap = new Map();
    categories.forEach(cat => {
      cat.slug = toSlug(cat.name);
      slugMap.set(cat.slug, cat.id);
    });
    window._catSlugMap = slugMap;

    renderSectionCards(categories);
    renderDynamicSections(categories);
    populateCatSidebar(categories);
    populateTicker();

    applyPendingDeepLink();

  } catch (error) {
    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid) {
      sectionsGrid.innerHTML = '<div style="color: #ff6b6b; text-align: center; padding: 20px;">فشل تحميل البيانات. يرجى تحديث الصفحة.</div>';
    }
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
      <a href="#${cat.slug}" class="section-nav-card">
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

function renderDynamicSections(categories) {
  const dynamicSections = document.getElementById('dynamic-sections');
  if (!dynamicSections) return;

  // Render section shells — items will be loaded on demand.
  dynamicSections.innerHTML = categories.map(cat => {
    const titleColor = cat.color || '#3b82f6';
    return `
      <section id="${cat.slug}" class="dynamic-category-section" data-cat-id="${cat.id}">
        <h2 class="section-title visible" style="color:${titleColor};text-shadow:0 0 20px ${titleColor}40">${cat.name}</h2>
        <div class="section-line visible" style="background:${titleColor};box-shadow:0 0 15px ${titleColor}"></div>
        <div class="image-grid" id="grid-cat-${cat.id}"></div>
      </section>`;
  }).join('');

  // Observe each section — fetch + render its items only when visible.
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      lazyObserver.unobserve(entry.target);
      const catId = entry.target.dataset.catId;
      if (_loadedCats.has(catId)) return;
      _loadedCats.add(catId);
      const cat = _categories.find(c => c.id === catId);
      if (cat) _fetchAndRenderCategory(cat);
    });
  }, { rootMargin: '300px' });

  categories.forEach(cat => {
    const section = document.getElementById(cat.slug);
    if (section) lazyObserver.observe(section);
  });
}

async function _fetchAndRenderCategory(cat) {
  try {
    const snap = await getDocs(
      query(collection(db, 'Items'), where('categoryID', '==', cat.id))
    );
    const rawItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (rawItems.length === 0) {
      const grid = document.getElementById(`grid-cat-${cat.id}`);
      if (grid) grid.outerHTML = COMING_SOON_HTML(cat.name);

      return;
    }

    const formattedItems = rawItems.map(formatItem);
    catItems[cat.id] = formattedItems;
    catPageTitles[cat.slug] = cat.name;

    // Inject filter bar above the grid.
    const grid = document.getElementById(`grid-cat-${cat.id}`);
    if (grid) {
      grid.insertAdjacentHTML('beforebegin', buildFilterBarHtml(cat.id, cat.name, formattedItems));
    }

    renderGameGrid(`grid-cat-${cat.id}`, formattedItems, cat.name, cat.color);

    requestAnimationFrame(() => {
      document.querySelectorAll(`#grid-cat-${cat.id} .image-card`).forEach((el, i) => {
        el.style.transitionDelay = ((i % 6) * 0.08) + 's';
        setTimeout(() => el.classList.add('visible'), 30);
      });
    });

    setTimeout(() => setupCategoryFilter(cat.id, cat.name, formattedItems, cat.color), 0);


  } catch (err) {
    console.error(`[firestore] failed to load category ${cat.name}:`, err);
  }
}

// ── Featured ticker ─────────────────────────────────────────────────

async function populateTicker() {
  const tickerWrap = document.getElementById('news-ticker-wrap');
  const tickerTrack = document.getElementById('news-ticker-track');
  if (!tickerTrack) return;

  try {
    const snap = await getDocs(
      query(collection(db, 'Items'), where('featured', '==', true))
    );
    const featuredItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (featuredItems.length === 0) return;

    const buildItem = (item) => {
      const safeId = (item.id || '').replace(/'/g, '');
      return `<div class="ticker-item" onclick="(function(){var el=document.querySelector('[data-item-id=\\'${safeId}\\']');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});})()">
          <span class="ticker-item-badge">جديد</span>
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}">` : ''}
          <span class="ticker-item-name">${item.name}</span>
        </div>`;
    };
    const itemsHtml = featuredItems.map(buildItem).join('');
    const minCopies = Math.max(10, Math.ceil(20 / featuredItems.length));
    const copies = minCopies % 2 === 0 ? minCopies : minCopies + 1;
    tickerTrack.innerHTML = itemsHtml.repeat(copies);
    if (tickerWrap) tickerWrap.classList.add('is-populated');
    tickerTrack.style.animationDuration = Math.max(20, featuredItems.length * 7) + 's';
    initTickerVisibility();
  } catch (err) {
    console.error('[firestore] ticker fetch failed:', err);
  }
}

// ── Categories sidebar ──────────────────────────────────────────────

function populateCatSidebar(categories) {
  const list = document.getElementById('cat-sidebar-list');
  if (!list) return;
  const overlay = document.getElementById('cat-sidebar-overlay');
  const sidebar = document.getElementById('cat-sidebar');
  const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); };

  list.innerHTML = categories.map(cat => {
    const img = cat.imageUrl
      ? `<img src="${cat.imageUrl}" alt="${cat.name}">`
      : SIDEBAR_FALLBACK_ICON;
    return `<button class="cat-sidebar-item" onclick="closeCatSidebar();navigateToPage('${cat.slug}')">
      ${img}
      <span class="cat-sb-name">${cat.name}</span>
    </button>`;
  }).join('');

  window.closeCatSidebar = close;
}
