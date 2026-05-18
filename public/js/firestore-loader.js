import { db, collection, query, orderBy, getDocs } from '../firebase.js';

// ════ FIRESTORE DYNAMIC LOADER ════
// Fetches Categories + Items from Firestore.
// Builds sections-nav and all product sections dynamically.

// ── Cloudinary image optimizer ──
// Inserts transformation params to serve smaller, optimized images.
// w_400 = max 400px width, q_auto = auto quality, f_auto = best format (webp/avif), c_limit = don't upscale
function optimizeCloudinaryUrl(url, width = 400) {
  if (!url || typeof url !== 'string') return url;
  // Only transform Cloudinary URLs
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  // Avoid double-transformation
  if (url.includes('/q_auto') || url.includes('/f_auto')) return url;
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`);
}

async function loadFirestoreData() {
  console.log('Starting Firestore data load...');
  try {
    // Fetch Categories (respect admin-controlled order). Fallback to unordered if empty or fails.
    let categoriesSnapshot;
    try {
      const categoriesQuery = query(collection(db, 'Categories'), orderBy('order', 'asc'));
      categoriesSnapshot = await getDocs(categoriesQuery);
      if (categoriesSnapshot.empty) throw new Error('ordered-empty');
    } catch (err) {
      console.warn('Ordered categories fetch failed or empty, falling back to unordered fetch', err.message || err);
      categoriesSnapshot = await getDocs(collection(db, 'Categories'));
    }
    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Categories loaded:', categories.length);

    // Fetch Items
    const itemsQuery = collection(db, 'Items');
    const itemsSnapshot = await getDocs(itemsQuery);
    const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Items loaded:', items.length);

    const renderSectionCards = () => {
      const sectionsGrid = document.getElementById('sections-grid');
      if (sectionsGrid) {
        if (categories.length === 0) {
          sectionsGrid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">لا توجد أقسام حالياً. أضف أقسام من لوحة الإدارة.<br><small>افتح Console (F12) للمزيد من المعلومات</small></div>';
          console.log('No categories found in Firestore');
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
          console.log('Section cards rendered:', categories.length);
        }
      } else {
        console.error('sections-grid element not found');
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
                  <span>السعر:</span>
                  <input type="number" class="cat-filter-number" min="0" max="1000" placeholder="الكل" data-cat="${cat.id}">
                  <span>دينار</span>
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

        return `
          <section id="cat-${cat.id}" class="dynamic-category-section">
            <h2 class="section-title visible">${cat.name}</h2>
            <div class="section-line visible"></div>
            ${body}
          </section>
        `;
      }).join('');

      // Render items for each non-empty category
      categories.forEach(cat => {
        const categoryItems = items.filter(item => item.categoryID === cat.id);
        if (categoryItems.length === 0) return;

        const formattedItems = categoryItems.map(item => {
          // Debug logging
          console.log('Item:', item.name, 'Raw prices:', item.originalPrice, item.discountPrice);
          // Ensure prices are numbers and formatted correctly
          let originalPrice = parseFloat(item.originalPrice) || 0;
          let discountPrice = parseFloat(item.discountPrice) || 0;
          console.log('Parsed prices:', originalPrice, discountPrice);
          // Cap prices at reasonable max (10000 JOD) to catch data errors
          const MAX_PRICE = 10000;
          if (originalPrice > MAX_PRICE || originalPrice < 0) originalPrice = 0;
          if (discountPrice > MAX_PRICE || discountPrice < 0) discountPrice = 0;
          console.log('After validation:', originalPrice, discountPrice);
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

          // Optimize images for grid (small thumbnails) and details (larger)
          const optimizedThumb = optimizeCloudinaryUrl(mainImage, 400);
          const optimizedFull = imagesArray.map(u => optimizeCloudinaryUrl(u, 900));

          const result = {
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
          console.log('Formatted item:', result.name, 'Final priceLabel:', result.priceLabel);
          return result;
        });

        if (typeof renderGameGrid === 'function') {
          // Pass the category name (instead of platform) so the small badge on each
          // product card shows the category it belongs to.
          renderGameGrid(`grid-cat-${cat.id}`, formattedItems, cat.name);
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
          // Setup filter for this category
          setupCategoryFilter(cat.id, cat.name, formattedItems);
        } else {
          console.error('renderGameGrid function not found. Make sure main.js is loaded before firestore-loader.js');
        }
      });
    } else {
      console.error('dynamic-sections element not found');
    }

    // Store category titles for page navigation
    window._catPageTitles = {};
    categories.forEach(cat => {
      window._catPageTitles[`cat-${cat.id}`] = cat.name;
    });

    console.log('Firestore data loaded successfully');
  } catch (error) {
    console.error('Error loading Firestore data:', error);
    // Show error message to user
    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid) {
      sectionsGrid.innerHTML = '<div style="color: #ff6b6b; text-align: center; padding: 20px;">فشل تحميل البيانات. يرجى تحديث الصفحة.</div>';
    }
  }
}

// Setup category filter (search + price)
function setupCategoryFilter(catId, catName, items) {
  const searchInput = document.querySelector(`.cat-filter-search[data-cat="${catId}"]`);
  const priceNumber = document.querySelector(`.cat-filter-number[data-cat="${catId}"]`);
  
  if (!searchInput || !priceNumber) return;
  
  // Fixed max price 1000
  const MAX_PRICE = 1000;
  
  const applyFilter = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const priceVal = priceNumber.value.trim();
    // Empty means no price limit (show all)
    const maxPriceFilter = priceVal === '' ? Infinity : (parseInt(priceVal) || MAX_PRICE);
    
    const filtered = items.filter(item => {
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm);
      const matchesPrice = maxPriceFilter === Infinity || item.price <= maxPriceFilter;
      return matchesSearch && matchesPrice;
    });
    
    // Re-render grid
    if (typeof renderGameGrid === 'function') {
      renderGameGrid(`grid-cat-${catId}`, filtered, catName);
      requestAnimationFrame(() => {
        document.querySelectorAll(`#grid-cat-${catId} .image-card`).forEach((el, i) => {
          el.style.transitionDelay = ((i % 6) * 0.08) + 's';
          setTimeout(() => el.classList.add('visible'), 30);
        });
      });
    }
    
    // Show "no results" message if empty
    const grid = document.getElementById(`grid-cat-${catId}`);
    if (filtered.length === 0 && grid) {
      grid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px; font-size: 0.9rem; grid-column: 1/-1;">لا توجد منتجات مطابقة للبحث</div>';
    }
  };
  
  searchInput.addEventListener('input', applyFilter);
  priceNumber.addEventListener('input', applyFilter);
  // Also trigger on change for mobile number picker
  priceNumber.addEventListener('change', applyFilter);
}

// Load data when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFirestoreData);
} else {
  loadFirestoreData();
}
