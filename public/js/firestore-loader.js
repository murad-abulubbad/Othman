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

async function loadFirestoreData() {
  try {
    // Fetch Categories + Items in parallel for maximum speed
    const [categoriesSnapshot, itemsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'Categories'), orderBy('order', 'asc'))).catch(() =>
        getDocs(collection(db, 'Categories'))
      ),
      getDocs(collection(db, 'Items'))
    ]);

    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const renderSectionCards = () => {
      const sectionsGrid = document.getElementById('sections-grid');
      if (sectionsGrid) {
        if (categories.length === 0) {
          sectionsGrid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">لا توجد أقسام حالياً. أضف أقسام من لوحة الإدارة.</div>';
        } else {
          sectionsGrid.innerHTML = categories.map(cat => {
            const categoryItems = items.filter(item => item.categoryID === cat.id);
            const iconHtml = cat.imageUrl
              ? `<img class="section-nav-icon" src="${cat.imageUrl}" alt="${cat.name}" onerror="this.outerHTML='<span class=\'section-nav-icon\'>🎮</span>'">`
              : `<span class="section-nav-icon">🎮</span>`;
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
                <input type="text" class="cat-filter-search" placeholder="🔍 بحث في ${cat.name}..." data-cat="${cat.id}">
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
                      <div class="custom-option" data-value="جديد">✨ جديد</div>
                      <div class="custom-option" data-value="مستعمل">🔧 مستعمل</div>
                    </div>
                  </div>
                  <div class="custom-select-wrap" data-type="genre" data-cat="${cat.id}">
                    <button class="custom-select-btn cat-filter-genre" data-cat="${cat.id}" data-value="">النوع: الكل ▾</button>
                    <div class="custom-select-dropdown">
                      <div class="custom-option" data-value="">الكل</div>
                      <div class="custom-option" data-value="ألعاب سيارات">🚗 سيارات</div>
                      <div class="custom-option" data-value="أكشن مغامرات">💥 أكشن مغامرات</div>
                      <div class="custom-option" data-value="ألعاب طخاخة">🔫 طخاخة</div>
                      <div class="custom-option" data-value="ألعاب رعب">👻 رعب</div>
                      <div class="custom-option" data-value="ألعاب جماعية">👥 جماعية</div>
                      <div class="custom-option" data-value="واقع افتراضي">🥽 واقع افتراضي</div>
                      <div class="custom-option" data-value="عالم مفتوح">🌍 عالم مفتوح</div>
                      <div class="custom-option" data-value="رياضة">⚽ رياضة</div>
                      <div class="custom-option" data-value="قتال">🥊 قتال</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="image-grid" id="grid-cat-${cat.id}"></div>
          `
          : `
            <div class="coming-soon-block">
              <span class="big-icon">🏆</span>
              <h3>قسم ${cat.name} قادم قريباً</h3>
              <p>سيتم إضافة المنتجات لهذا القسم قريباً، تابعنا على السوشيال ميديا لتصلك آخر التحديثات.</p>
              <div class="countdown">⌛ COMING SOON</div>
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
            description: item.description || ''
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

    const filtered = items.filter(item => {
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm);
      const itemPrice = item.price || item.originalPrice || 0;
      const matchesPrice = !filterByPrice || itemPrice <= sliderVal;
      const matchesCondition = !conditionVal || (item.condition || 'مستعمل') === conditionVal;
      const matchesGenre = !genreVal || (item.genre || '') === genreVal;
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
