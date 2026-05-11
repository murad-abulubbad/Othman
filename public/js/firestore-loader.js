import { db, collection, query, orderBy, getDocs } from '../firebase.js';

// ════ FIRESTORE DYNAMIC LOADER ════
// Fetches Categories + Items from Firestore.
// Builds sections-nav and all product sections dynamically.

async function loadFirestoreData() {
  console.log('Starting Firestore data load...');
  try {
    // Fetch Categories (ordered by createdAt asc)
    const categoriesQuery = query(collection(db, 'Categories'), orderBy('createdAt', 'asc'));
    const categoriesSnapshot = await getDocs(categoriesQuery);
    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Categories loaded:', categories.length);

    // Build nav cards in #sections-grid
    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid) {
      if (categories.length === 0) {
        sectionsGrid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">لا توجد أقسام حالياً. أضف أقسام من لوحة الإدارة.<br><small>افتح Console (F12) للمزيد من المعلومات</small></div>';
        console.log('No categories found in Firestore');
      } else {
        sectionsGrid.innerHTML = categories.map(cat => {
          const iconHtml = cat.imageUrl
            ? `<img class="section-nav-icon" src="${cat.imageUrl}" alt="${cat.name}" onerror="this.outerHTML='<span class=\\'section-nav-icon\\'>🎮</span>'">`
            : `<span class="section-nav-icon">🎮</span>`;
          return `
            <a href="#cat-${cat.id}" class="section-nav-card">
              ${iconHtml}
              <div class="section-nav-name">${cat.name}</div>
              <div class="section-nav-sub">${cat.platform || ''}</div>
            </a>
          `;
        }).join('');
        // Reveal cards (stagger). CSS keeps them at opacity:0 until .visible is added.
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

    // Fetch Items (ordered by createdAt desc)
    const itemsQuery = query(collection(db, 'Items'), orderBy('createdAt', 'desc'));
    const itemsSnapshot = await getDocs(itemsQuery);
    const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Items loaded:', items.length);

    // Build dynamic sections in #dynamic-sections
    const dynamicSections = document.getElementById('dynamic-sections');
    if (dynamicSections) {
      dynamicSections.innerHTML = categories.map(cat => {
        const categoryItems = items.filter(item => item.categoryID === cat.id);
        const platformLabel = cat.platform && cat.platform !== 'Other' ? cat.platform : '';
        const body = categoryItems.length > 0
          ? `<div class="image-grid" id="grid-cat-${cat.id}"></div>`
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
            <h2 class="section-title visible">${cat.name} ${platformLabel ? `<span>${platformLabel}</span>` : ''}</h2>
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
              ? `<span style="text-decoration:line-through;opacity:0.6;font-size:0.8em">${originalPrice.toFixed(2)}</span> ${discountPrice.toFixed(2)}`
              : originalPrice.toFixed(2);
          } else {
            priceLabel = 'حسب الطلب';
          }
          const result = {
            name: item.name,
            img: item.imageUrl,
            price: finalPrice,
            priceLabel: priceLabel,
            genre: item.genre,
            condition: item.condition || 'مستعمل',
            trailer: item.videoTrailerUrl,
            originalPrice: originalPrice,
            discountPrice: discountPrice
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

// Load data when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFirestoreData);
} else {
  loadFirestoreData();
}
