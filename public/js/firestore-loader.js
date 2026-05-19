import { db, collection, query, orderBy, getDocs } from '../firebase.js';

// ════ FIRESTORE DYNAMIC LOADER ════
// Fetches Categories + Items from Firestore.
// Builds sections-nav and all product sections dynamically.

// ── Cloudinary image optimizer ──
const _isMobile = window.innerWidth <= 768;
function optimizeCloudinaryUrl(url, width = 300) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  if (url.includes('/q_') || url.includes('/f_auto')) return url;
  // dpr_auto removed — causes 2x/3x image sizes on retina which slows loading
  return url.replace('/image/upload/', `/image/upload/c_fit,w_${width},q_85,f_auto/`);
}

const CACHE_KEY = 'ofg_data_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

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
  } catch {}
}

// Call this from admin panel after any write to bust the cache
window.bustFirestoreCache = function() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

async function loadFirestoreData() {
  try {
    let categories, items;

    const cached = getCachedData();
    if (cached) {
      // Serve from cache — zero Firestore reads
      categories = cached.categories;
      items = cached.items;
    } else {
      // Fetch Categories + Items in parallel for maximum speed
      const [categoriesSnapshot, itemsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'Categories'), orderBy('order', 'asc'))).catch(() =>
          getDocs(collection(db, 'Categories'))
        ),
        getDocs(collection(db, 'Items'))
      ]);

      categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCachedData(categories, items);
    }

    const renderSectionCards = () => {
      const sectionsGrid = document.getElementById('sections-grid');
      if (sectionsGrid) {
        if (categories.length === 0) {
          sectionsGrid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">لا توجد أقسام حالياً. أضف أقسام من لوحة الإدارة.</div>';
        } else {
          sectionsGrid.innerHTML = categories.map(cat => {
            const categoryItems = items.filter(item => item.categoryID === cat.id);
            const iconHtml = cat.imageUrl
              ? `<img class="section-nav-icon" src="${cat.imageUrl}" alt="${cat.name}" onerror="this.outerHTML='<span class=\'section-nav-icon\'><svg width=\'28\' height=\'28\' viewBox=\'0 0 24 24\' fill=\'currentColor\'><path d=\'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z\'/></svg></span>'">`
              : `<span class="section-nav-icon"><svg width='28' height='28' viewBox='0 0 24 24' fill='currentColor'><path d='M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/></svg></span>`;
            return `
              <a href="#cat-${cat.id}" class="section-nav-card">
                ${iconHtml}
                <div class="section-nav-name">${cat.name}</div>
              </a>
            `;
          }).join('');
          requestAnimationFrame(() => {
            sectionsGrid.querySelectorAll('.section-nav-card').forEach((el, i) => {
              el.style.transitionDelay = ((i % 6) * 0.08) + 's';
              setTimeout(() => el.classList.add('visible'), 30);
            });
          });
        }
      }
    };

    renderSectionCards();

    // Build dynamic sections in #dynamic-sections
    const dynamicSections = document.getElementById('dynamic-sections');
    if (dynamicSections) {
      dynamicSections.innerHTML = categories.map(cat => {
        const categoryItems = items.filter(item => item.categoryID === cat.id);
        const hasItems = categoryItems.length > 0;
        const body = hasItems
          ? `
            <div class="cat-filter-bar" id="filter-cat-${cat.id}">
              <div class="cat-filter-row">
                <input type="text" class="cat-filter-search" placeholder="بحث في ${cat.name}..." data-cat="${cat.id}">
                <div class="cat-filter-price">
                  <span>أقصى سعر:</span>
                  <input type="range" class="cat-filter-slider" min="0" max="100" value="100" data-cat="${cat.id}">
                  <span class="price-value">100 دينار</span>
                </div>
                <div class="cat-filter-selects-row">
                  <div class="custom-select-wrap" data-type="condition" data-cat="${cat.id}">
                    <button class="custom-select-btn cat-filter-condition" data-cat="${cat.id}" data-value="">الحالة: الكل ▾</button>
                    <div class="custom-select-dropdown">
                      <div class="custom-option" data-value="">الكل</div>
                      <div class="custom-option" data-value="جديد">جديد</div>
                      <div class="custom-option" data-value="مستعمل">مستعمل</div>
                    </div>
                  </div>
                  <div class="custom-select-wrap" data-type="genre" data-cat="${cat.id}">
                    <button class="custom-select-btn cat-filter-genre" data-cat="${cat.id}" data-value="">النوع: الكل ▾</button>
                    <div class="custom-select-dropdown">
                      <div class="custom-option" data-value=""><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg> الكل</div>
                      <div class="custom-option" data-value="سيارات"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg> سيارات</div>
                      <div class="custom-option" data-value="أكشن"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg> أكشن مغامرات</div>
                      <div class="custom-option" data-value="طخاخة"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9V7h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V9h2zm-4 10H4V5h14v14zM6 13h5v4H6zm6-6h4v3h-4zM6 7h5v5H6zm6 4h4v6h-4z"/></svg> طخاخة</div>
                      <div class="custom-option" data-value="رعب"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg> رعب</div>
                      <div class="custom-option" data-value="جماعية"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> جماعية</div>
                      <div class="custom-option" data-value="VR"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 6c-2.61.7-5.67 1-8.5 1s-5.89-.3-8.5-1L3 8c1.86.5 4 .83 6 1v13h2v-6h2v6h2V9c2-.17 4.14-.5 6-1l-.5-2zM12 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg> واقع افتراضي</div>
                      <div class="custom-option" data-value="عالم مفتوح"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> عالم مفتوح</div>
                      <div class="custom-option" data-value="رياضة"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z"/></svg> رياضة</div>
                      <div class="custom-option" data-value="قتال"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 2.5c0 1.5-1.5 7-1.5 7h-2C10.5 9.5 9 4 9 2.5a2.5 2.5 0 0 1 5 0zM12 11.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM5.5 8C4.12 8 3 9.12 3 10.5v1C3 12.88 4.12 14 5.5 14H7v5c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-5h1.5c1.38 0 2.5-1.12 2.5-2.5v-1C21 9.12 19.88 8 18.5 8h-13z"/></svg> قتال</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="image-grid" id="grid-cat-${cat.id}"></div>
          `
          : `
            <div class="coming-soon-block">
              <span class="big-icon"><svg width='48' height='48' viewBox='0 0 24 24' fill='rgba(255,255,255,0.2)'><path d='M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z'/></svg></span>
              <h3>قسم ${cat.name} قادم قريباً</h3>
              <p>سيتم إضافة المنتجات لهذا القسم قريباً، تابعنا على السوشيال ميديا لتصلك آخر التحديثات.</p>
              <div class="countdown">COMING SOON</div>
            </div>
          `;

        const titleColor = cat.color || '#3b82f6';
        return `
          <section id="cat-${cat.id}" class="dynamic-category-section">
            <h2 class="section-title visible" style="color:${titleColor};text-shadow:0 0 20px ${titleColor}40">${cat.name}</h2>
            <div class="section-line visible" style="background:${titleColor};box-shadow:0 0 15px ${titleColor}"></div>
            ${body}
          </section>
        `;
      }).join('');

      // Render items for each non-empty category
      categories.forEach(cat => {
        const categoryItems = items.filter(item => item.categoryID === cat.id);
        if (categoryItems.length === 0) return;

        const formattedItems = categoryItems.map(item => {
          // Ensure prices are numbers and formatted correctly
          let originalPrice = parseFloat(item.originalPrice) || 0;
          let discountPrice = parseFloat(item.discountPrice) || 0;
          // Cap prices at reasonable max (10000 JOD) to catch data errors
          const MAX_PRICE = 10000;
          if (originalPrice > MAX_PRICE || originalPrice < 0) originalPrice = 0;
          if (discountPrice > MAX_PRICE || discountPrice < 0) discountPrice = 0;
          // Use discount price if valid and less than original, otherwise use original
          const finalPrice = (discountPrice > 0 && discountPrice < originalPrice) ? discountPrice : originalPrice;
          // Format price label: show strikethrough original + discount only if discount is valid and less
          let priceLabel;
          if (finalPrice > 0 && finalPrice <= MAX_PRICE) {
            priceLabel = (discountPrice > 0 && discountPrice < originalPrice)
              ? `<span class="price-old">${originalPrice.toFixed(2)}</span><span class="price-new">${discountPrice.toFixed(2)}</span>`
              : `<span class="price-new">${originalPrice.toFixed(2)}</span>`;
          } else {
            priceLabel = 'حسب الطلب';
          }
          // Support both old (imageUrl) and new (images array) formats
          let mainImage = item.imageUrl;
          let imagesArray = [];
          if (item.images && Array.isArray(item.images) && item.images.length > 0) {
            mainImage = item.images[0];
            imagesArray = item.images;
          } else if (item.imageUrl) {
            imagesArray = [item.imageUrl];
          }

          const optimizedThumb = optimizeCloudinaryUrl(mainImage, 800);
          const optimizedFull = imagesArray.map(u => optimizeCloudinaryUrl(u, 800));

          return {
            id: item.id,
            name: item.name,
            img: optimizedThumb,
            images: optimizedFull,
            price: finalPrice,
            priceLabel: priceLabel,
            genre: item.genre,
            condition: item.condition || 'مستعمل',
            trailer: item.videoTrailerUrl,
            originalPrice: originalPrice,
            discountPrice: discountPrice,
            description: item.description || '',
            quantity: item.quantity !== undefined ? Number(item.quantity) : null
          };
        });

        if (typeof renderGameGrid === 'function') {
          // Pass the category name (instead of platform) so the small badge on each
          // product card shows the category it belongs to.
          renderGameGrid(`grid-cat-${cat.id}`, formattedItems, cat.name, cat.color);
          // Reveal cards after render
          requestAnimationFrame(() => {
            document.querySelectorAll(`#grid-cat-${cat.id} .image-card`).forEach((el, i) => {
              el.style.transitionDelay = ((i % 6) * 0.08) + 's';
              setTimeout(() => el.classList.add('visible'), 30);
            });
          });
          // Store items for filtering
          window._catItems = window._catItems || {};
          window._catItems[cat.id] = formattedItems;
          // Defer filter setup so it doesn't block initial render
          setTimeout(() => setupCategoryFilter(cat.id, cat.name, formattedItems, cat.color), 0);
        }
      });
    }

    // Store category titles for page navigation
    window._catPageTitles = {};
    categories.forEach(cat => {
      window._catPageTitles[`cat-${cat.id}`] = cat.name;
    });

    // Populate featured ticker — use items marked featured, fallback to latest 10
    let featuredItems = items.filter(i => i.featured === true);
    if (featuredItems.length === 0) {
      featuredItems = [...items].slice(0, 10);
    }
    const tickerWrap = document.getElementById('news-ticker-wrap');
    const tickerTrack = document.getElementById('news-ticker-track');
    if (tickerTrack && featuredItems.length > 0) {
      const buildItem = (item) => {
        const price = item.discountPrice || item.originalPrice || item.price || 0;
        const cat = categories.find(c => c.id === item.categoryID);
        const safeId = (item.id || '').replace(/'/g, '');
        return `<div class="ticker-item" onclick="(function(){var el=document.querySelector('[data-item-id=\\'${safeId}\\']')||document.getElementById('cat-${item.categoryID}');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});})()">
          <span class="ticker-item-badge">جديد</span>
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}">` : ''}
          <span class="ticker-item-name">${item.name}</span>
        </div>`;
      };
      const itemsHtml = featuredItems.map(buildItem).join('');
      // Repeat enough copies to always fill the screen, then -50% loops seamlessly
      // Min 10 copies so even 1-2 items fill the full width
      const minCopies = Math.max(10, Math.ceil(20 / featuredItems.length));
      // Must be even number so -50% = exactly half
      const copies = minCopies % 2 === 0 ? minCopies : minCopies + 1;
      tickerTrack.innerHTML = itemsHtml.repeat(copies);
      tickerWrap.style.display = 'flex';
      const duration = Math.max(20, featuredItems.length * 7);
      tickerTrack.style.animationDuration = duration + 's';
    }

    // Populate categories sidebar
    const catSidebarList = document.getElementById('cat-sidebar-list');
    if (catSidebarList) {
      const overlay = document.getElementById('cat-sidebar-overlay');
      const sidebar = document.getElementById('cat-sidebar');
      const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); };
      catSidebarList.innerHTML = categories.map(cat => {
        const count = items.filter(i => i.categoryID === cat.id).length;
        const img = cat.imageUrl ? `<img src="${cat.imageUrl}" alt="${cat.name}">` : `<svg width='24' height='24' viewBox='0 0 24 24' fill='rgba(255,255,255,0.5)'><path d='M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/></svg>`;
        return `<button class="cat-sidebar-item" onclick="document.getElementById('cat-${cat.id}')?.scrollIntoView({behavior:'smooth'});closeCatSidebar()">
          ${img}
          <span class="cat-sb-name">${cat.name}</span>
          <span class="cat-sb-count">${count}</span>
        </button>`;
      }).join('');
      window.closeCatSidebar = close;
    }

    // Apply deep link if page was refreshed while on a category section
    if (typeof window._applyPendingDeepLink === 'function') {
      window._applyPendingDeepLink();
    }

  } catch (error) {
    // Show error message to user
    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid) {
      sectionsGrid.innerHTML = '<div style="color: #ff6b6b; text-align: center; padding: 20px;">فشل تحميل البيانات. يرجى تحديث الصفحة.</div>';
    }
  }
}

function setupCategoryFilter(catId, catName, items, color) {
  const searchInput = document.querySelector(`.cat-filter-search[data-cat="${catId}"]`);
  const priceSlider = document.querySelector(`.cat-filter-slider[data-cat="${catId}"]`);
  const priceValue = document.querySelector(`#filter-cat-${catId} .price-value`);
  if (!searchInput) return;

  // Active filter values
  let conditionVal = '';
  let genreVal = '';

  // Set slider max based on actual item prices (display only, don't filter)
  if (priceSlider) {
    const maxItemPrice = Math.max(...items.map(i => i.price || i.originalPrice || 0), 10);
    const sliderMax = Math.ceil(maxItemPrice / 5) * 5;
    priceSlider.max = sliderMax;
    priceSlider.value = sliderMax;
    if (priceValue) priceValue.textContent = `${sliderMax} دينار`;
  }

  const applyFilter = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const sliderVal = priceSlider ? parseInt(priceSlider.value) : 999999;
    const sliderMax = priceSlider ? parseInt(priceSlider.max) : 999999;
    // Only filter by price if slider is NOT at maximum (user moved it)
    const filterByPrice = sliderVal < sliderMax;

    if (genreVal) console.log('Filter genre:', genreVal, '| Items genres:', items.map(i => i.name + ':' + JSON.stringify(i.genre)));
    const filtered = items.filter(item => {
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm);
      const itemPrice = item.price || item.originalPrice || 0;
      const matchesPrice = !filterByPrice || itemPrice <= sliderVal;
      const matchesCondition = !conditionVal || (item.condition || 'مستعمل') === conditionVal;
      const itemGenres = Array.isArray(item.genre) ? item.genre : (item.genre ? [item.genre] : []);
      const matchesGenre = !genreVal || itemGenres.includes(genreVal);
      return matchesSearch && matchesPrice && matchesCondition && matchesGenre;
    });
    if (typeof renderGameGrid === 'function') {
      renderGameGrid(`grid-cat-${catId}`, filtered, catName, color);
    }
    const grid = document.getElementById(`grid-cat-${catId}`);
    if (filtered.length === 0 && grid) {
      grid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px; font-size: 0.9rem; grid-column: 1/-1;">لا توجد منتجات مطابقة للبحث</div>';
    }
  };

  // Update price display on slider move
  if (priceSlider && priceValue) {
    priceSlider.addEventListener('input', () => {
      priceValue.textContent = `${priceSlider.value} دينار`;
      applyFilter();
    });
  }

  searchInput.addEventListener('input', applyFilter);

  // Wire custom dropdowns
  const filterBar = document.getElementById(`filter-cat-${catId}`);
  if (!filterBar) return;

  filterBar.querySelectorAll('.custom-select-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.custom-select-btn');
    const dropdown = wrap.querySelector('.custom-select-dropdown');
    const type = wrap.dataset.type;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-dropdown.open').forEach(d => {
        if (d !== dropdown) { d.classList.remove('open'); d.previousElementSibling?.classList.remove('active'); }
      });
      dropdown.classList.toggle('open');
      btn.classList.toggle('active');
    });

    wrap.querySelectorAll('.custom-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.dataset.value;
        const label = opt.textContent.trim();
        wrap.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        if (type === 'condition') {
          conditionVal = val;
          btn.textContent = val ? `${label} ▾` : 'الحالة: الكل ▾';
        } else {
          genreVal = val;
          btn.textContent = val ? `${label} ▾` : 'النوع: الكل ▾';
        }
        btn.classList.toggle('has-value', !!val);
        dropdown.classList.remove('open');
        btn.classList.remove('active');
        applyFilter();
      });
    });
  });

  document.addEventListener('click', () => {
    filterBar.querySelectorAll('.custom-select-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.previousElementSibling?.classList.remove('active');
    });
  });
}

// Load data when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFirestoreData);
} else {
  loadFirestoreData();
}
