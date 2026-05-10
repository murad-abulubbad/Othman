import { db } from '../firebase.js';
import {
  collection, getDocs, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Show skeleton while loading
(function(){
  const g = document.getElementById('sections-grid');
  if (g) g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;opacity:.4;font-size:.95rem">⏳ جاري تحميل الأقسام...</div>';
})();

(async () => {
  try {
    const [catSnap, itemSnap] = await Promise.all([
      getDocs(query(collection(db, 'Categories'), orderBy('createdAt', 'asc'))),
      getDocs(query(collection(db, 'Items'),      orderBy('createdAt', 'desc')))
    ]);

    const categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (categories.length === 0) return;

    // Register titles so the page-transition overlay can display them
    window._catPageTitles = {};
    categories.forEach(cat => { window._catPageTitles[`cat-${cat.id}`] = cat.name; });

    const ICONS = {
      PS5:'🚀', PS4:'⚡', PS3:'🏆', PS2:'💿', PS1:'💿',
      Xbox:'🟢', Nintendo:'🔴', Wii:'🎯', UMD:'💽', VR:'🥽'
    };

    // ── Map Firestore items → renderGameGrid format
    const allItems = itemSnap.docs.map(docSnap => {
      const d = docSnap.data();
      const hasDiscount = Number(d.discountPrice) > 0;
      return {
        id:          docSnap.id,
        name:        d.name || '',
        img:         d.imageUrl || '',
        price:       hasDiscount ? Number(d.discountPrice) : Number(d.originalPrice),
        priceLabel:  hasDiscount
          ? `<div style="display:flex;flex-direction:column;line-height:1.2"><s style="font-size:.68em;opacity:.6;color:rgba(255,255,255,.7);text-decoration-color:#ff2d55">${d.originalPrice} JOD</s><span>${d.discountPrice} <span style="font-size:.58em;opacity:.6">JOD</span></span></div>`
          : '',
        genre:       d.genre || '',
        condition:   d.condition || 'مستعمل',
        trailer:     d.videoTrailerUrl || '',
        description: d.description || '',
        platform:    d.platform || '',
        categoryID:  d.categoryID || ''
      };
    });

    // ── Build top navbar links
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
      const homeItem = navLinks.querySelector('li:first-child');
      navLinks.innerHTML = '';
      if (homeItem) navLinks.appendChild(homeItem);
      categories.forEach((cat, i) => {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href  = `#cat-${cat.id}`;
        a.textContent = cat.name;
        a.style.animationDelay = `-${(i + 1) * 1.1}s`;
        li.appendChild(a);
        navLinks.appendChild(li);
      });
    }

    // ── Build sections-nav
    const navGrid = document.getElementById('sections-grid');
    if (navGrid) {
      navGrid.innerHTML = categories.map(cat => {
        const iconHtml = cat.imageUrl
          ? `<img src="${cat.imageUrl}" class="section-nav-icon" style="width:64px;height:64px;object-fit:cover;border-radius:10px;display:block;margin:0 auto 12px">`
          : `<span class="section-nav-icon">${ICONS[cat.platform] || '📦'}</span>`;
        return `<a href="#cat-${cat.id}" class="section-nav-card">
          ${iconHtml}
          <div class="section-nav-name">${cat.name}</div>
          <div class="section-nav-sub">${cat.platform || ''}</div>
        </a>`;
      }).join('');

      // Animate nav cards in
      navGrid.querySelectorAll('.section-nav-card').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 60);
      });
    }

    // ── Build one <section> per category
    const container = document.getElementById('dynamic-sections');
    if (!container) return;

    container.innerHTML = categories.map(cat => {
      const gridId = `cat-grid-${cat.id}`;
      return `
      <section id="cat-${cat.id}">
        <h2 class="section-title">${cat.name}${(cat.platform && cat.platform !== 'Other' && cat.platform !== 'أخرى') ? ` <span>${cat.platform}</span>` : ''}</h2>
        <div class="section-line"></div>
        <div class="section-search">
          <div class="section-search-top">
            <span class="section-search-icon">🔍</span>
            <input type="text" placeholder="ابحث في ${cat.name}..." class="search-input" data-target="#${gridId}">
            <input type="number" placeholder="أقصى سعر" class="price-max" min="0">
          </div>
        </div>
        <div class="image-grid" id="${gridId}"></div>
      </section>`;
    }).join('');

    // ── Render items per category
    categories.forEach(cat => {
      const catItems = allItems.filter(i => i.categoryID === cat.id);
      if (catItems.length > 0) {
        renderGameGrid(`cat-grid-${cat.id}`, catItems, cat.platform || cat.name);
      } else {
        const grid = document.getElementById(`cat-grid-${cat.id}`);
        if (grid) {
          grid.style.display = 'block';
          grid.innerHTML = `
            <div class="coming-soon-block">
              ${cat.imageUrl
                ? `<img src="${cat.imageUrl}" style="width:90px;height:90px;object-fit:cover;border-radius:12px;display:block;margin:0 auto 20px;filter:drop-shadow(0 0 18px rgba(204,0,0,0.5))">`
                : `<span class="big-icon">${ICONS[cat.platform] || '📦'}</span>`}
              <h3>قسم ${cat.name} قادم قريباً</h3>
              <p>سيتم إضافة منتجات هذا القسم قريباً بأسعار خاصة</p>
              <p class="countdown">⏳ COMING SOON ⏳</p>
            </div>`;
        }
      }
    });

    // Clear skeleton
    const skeletonMsg = document.querySelector('#sections-grid div[style*="جاري تحميل"]');
    if (skeletonMsg) skeletonMsg.remove();

    typeof renderFavorites       === 'function' && renderFavorites();
    typeof updateFavoriteButtons === 'function' && updateFavoriteButtons();
    typeof updateFavoriteBadge   === 'function' && updateFavoriteBadge();

  } catch (err) {
    console.warn('[OFG] Firestore unavailable.', err.message);
  }
})();
