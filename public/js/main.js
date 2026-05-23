// ═══ COMING SOON ═══
function showComingSoon(section) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = `قسم "${section}" قريباً! تابعنا على السوشيال ميديا`;
  document.getElementById('toast').querySelector('.toast-icon').textContent = '🚧';
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    t.querySelector('.toast-icon').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z"/></svg>';
  }, 3500);
}

// ═══ GAME CATALOG — populated dynamically from Firestore ═══
const PS4_GAMES = [];
// Static fallback removed. Items are fetched from the Firestore "Items" collection.
const PS5_GAMES = [];

// Global store for item images to avoid encoding issues
window._itemImagesMap = window._itemImagesMap || {};

let _favoritesCache = null;

function getFavorites() {
  if (Array.isArray(_favoritesCache)) return _favoritesCache;
  try {
    _favoritesCache = JSON.parse(localStorage.getItem('othman_favorites') || '[]');
  } catch {
    _favoritesCache = [];
  }
  return _favoritesCache;
}

function saveFavorites(favorites) {
  _favoritesCache = favorites;
  localStorage.setItem('othman_favorites', JSON.stringify(favorites));
  updateFavoriteBadge();
}

function getFavoriteLookup() {
  return new Set(getFavorites().map(f => `${f.name}::${f.platform || ''}`));
}

function renderGameGrid(targetId, games, platform, color) {
  const grid = document.getElementById(targetId);
  if (!grid) return;
  const isPS5 = platform === 'PS5';
  const platformColor = color || (isPS5 ? '#2A8CFF' : '#CC0000');
  const platformStyle = platform ? `style="background:${platformColor};color:#fff;box-shadow:0 0 10px ${platformColor}80"` : '';
  const favoriteLookup = getFavoriteLookup();
  grid.innerHTML = games.map(g => {
    const condition = g.condition || 'مستعمل';
    const conditionClass = condition === 'جديد' ? ' is-new' : '';
    const isOutOfStock = g.quantity !== null && g.quantity !== undefined && Number(g.quantity) === 0;
    // Store images in global map
    const itemKey = g.name + '_' + (g.img || '').slice(-20);
    const imagesArray = g.images || [g.img];
    window._itemImagesMap[itemKey] = imagesArray;
    // Build detail data without images array (too large for encoding)
    const detailObj = {
      name: g.name,
      img: g.img,
      _imgKey: itemKey, // Reference to images in global map
      price: g.price,
      priceLabel: g.priceLabel,
      genre: g.genre,
      condition: condition,
      trailer: g.trailer,
      originalPrice: g.originalPrice,
      discountPrice: g.discountPrice,
      description: g.description,
      platform: platform
    };
    const detailData = encodeURIComponent(JSON.stringify(detailObj)).replace(/'/g, '%27');
    const cartData = encodeURIComponent(JSON.stringify({name:g.name, price:g.price, priceLabel:g.priceLabel || '', img:g.img, icon:'', kind:'game', platform, condition})).replace(/'/g, '%27');
    const trailerData = encodeURIComponent(JSON.stringify({id:g.trailer, title:g.name, provider:g.trailerProvider || 'youtube'})).replace(/'/g, '%27');
    const trailerButton = g.trailer
      ? `<button class="image-card-trailer" onclick="openTrailerFromEncoded('${trailerData}'); event.stopPropagation();"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> تريلر</button>`
      : '';
    const hasDiscount = g.originalPrice && g.discountPrice && g.discountPrice < g.originalPrice;
    const priceHtml = g.priceLabel
      ? `<div class="image-card-price image-card-price-text">${g.priceLabel}</div>`
      : hasDiscount
        ? `<div class="image-card-price"><span style="text-decoration:line-through;opacity:.6;font-size:.85em">${g.originalPrice}</span> <span style="color:#ff4444;font-weight:bold">${g.discountPrice}</span> <span style="font-size:.55em;opacity:.55">JOD</span></div>`
        : `<div class="image-card-price">${g.price} <span style="font-size:.55em;opacity:.55">JOD</span></div>`;
    const addButton = (g.price > 0 || g.priceLabel) && !isOutOfStock
      ? `<button class="image-card-add"
                    onclick="addGameToCartFromEncoded('${cartData}', this); event.stopPropagation();">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z"/></svg> أضف
            </button>`
      : '';
    return `
    <div class="image-card${isPS5 ? ' is-ps5' : ''}${isOutOfStock ? ' is-out-of-stock' : ''}" data-item-id="${g.id || ''}" onclick="openGameDetails(JSON.parse(decodeURIComponent('${detailData}')))">
      <div class="image-card-imgwrap">
        ${(platform && platform !== 'Other' && platform !== 'أخرى') ? `<span class="image-card-platform" ${platformStyle}>${platform}</span>` : ''}
        <span class="product-condition-badge${conditionClass}">${condition}</span>
        ${isOutOfStock ? '<span class="out-of-stock-badge">نفذت الكمية</span>' : ''}
        <img class="image-card-img" src="${g.img}" alt="${g.name}" loading="lazy" decoding="async" fetchpriority="low"
             onerror="this.style.objectFit='cover';this.src='images/logo.jpg'"/>
      </div>
      <div class="image-card-body">
        <div class="image-card-title">${g.name}</div>
        <div class="image-card-genre">${Array.isArray(g.genre) ? g.genre.join(' · ') : (g.genre || ' ')}</div>
        <div class="image-card-bottom">
          ${priceHtml}
          <div class="image-card-actions">
            <button class="favorite-btn${favoriteLookup.has(`${g.name}::${platform || ''}`) ? ' active' : ''}" onclick="toggleFavorite(this, '${detailData}'); event.stopPropagation();"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
            ${trailerButton}
            ${addButton}
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');
  // Make all cards visible immediately after render
  requestAnimationFrame(() => {
    grid.querySelectorAll('.image-card').forEach((el, i) => {
      el.style.transitionDelay = (i * 0.05) + 's';
      el.classList.add('visible');
    });
  });
}

function addGameToCartFromEncoded(encodedItem, button) {
  const item = JSON.parse(decodeURIComponent(encodedItem));
  addToCart(item);
  if (button) {
    button.classList.add('just-added');
    setTimeout(() => button.classList.remove('just-added'), 350);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function parsePriceValue(priceText) {
  const match = String(priceText || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

// Global for current detail view images
let currentDetailImages = [];
let currentDetailImageIndex = 0;

function showDetailImage(index) {
  if (!currentDetailImages.length) return;
  currentDetailImageIndex = index;
  const mainImg = document.getElementById('detail-main-image');
  const thumbs = document.querySelectorAll('.detail-thumb');
  if (mainImg) mainImg.src = currentDetailImages[index];
  thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
}
window.showDetailImage = showDetailImage;

function openGameDetails(game) {
  const modal = document.getElementById('game-detail-modal');
  const box = document.getElementById('game-detail-box');
  const hasNumericPrice = Number(game.price || 0) > 0;
  const priceText = game.priceText || game.priceLabel || (hasNumericPrice ? `${Number(game.price || 0).toFixed(2)} JOD` : 'حسب الطلب');
  const rawLabel = game.platform || game.category || game.section || '';
  const detailLabel = (rawLabel === 'Other' || rawLabel === 'أخرى') ? '' : rawLabel;
  const genreText = (Array.isArray(game.genre) ? game.genre.join(' · ') : game.genre) || game.sub || game.specs || game.kindLabel || 'Othman For Gaming';
  const descText = game.desc || game.description || '';
  const iconText = game.icon || '';

  // Get images from global map or fallback to single image
  let images = game.images;
  if (!images && game._imgKey && window._itemImagesMap && window._itemImagesMap[game._imgKey]) {
    images = window._itemImagesMap[game._imgKey];
  }
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch(e) { images = null; }
  }
  currentDetailImages = Array.isArray(images) && images.length > 0 ? images : (game.img ? [game.img] : []);
  currentDetailImageIndex = 0;

  // Build gallery HTML if multiple images exist
  let galleryHtml = '';
  if (currentDetailImages.length > 1) {
    const thumbsHtml = currentDetailImages.map((img, i) => `
      <img src="${escapeHtml(img)}" class="detail-thumb${i === 0 ? ' active' : ''}" onclick="showDetailImage(${i})" alt=""/>
    `).join('');
    galleryHtml = `
      <div class="detail-gallery">
        <div class="detail-gallery-main">
          <img id="detail-main-image" src="${escapeHtml(currentDetailImages[0])}" alt="${escapeHtml(game.name)}"
               onerror="this.closest('.game-detail-cover').classList.add('no-image');this.outerHTML='<span class=&quot;game-detail-cover-icon&quot;>${escapeHtml(iconText)}</span>'"/>
        </div>
        <div class="detail-gallery-thumbs">${thumbsHtml}</div>
      </div>
    `;
  } else {
    // Single image (original behavior)
    galleryHtml = game.img
      ? `<img src="${escapeHtml(game.img)}" alt="${escapeHtml(game.name)}" onerror="this.closest('.game-detail-cover').classList.add('no-image');this.outerHTML='<span class=&quot;game-detail-cover-icon&quot;>${escapeHtml(iconText)}</span>'"/>`
      : `<span class="game-detail-cover-icon">${escapeHtml(iconText)}</span>`;
  }

  const cartData = encodeURIComponent(JSON.stringify({
    name: game.name,
    price: hasNumericPrice ? Number(game.price || 0) : parsePriceValue(priceText),
    priceLabel: game.priceLabel || (!hasNumericPrice && priceText ? priceText : ''),
    img: currentDetailImages[0] || game.img,
    icon: iconText,
    kind: game.kind || 'item',
    platform: game.platform || null,
    section: game.section || game.category || null,
    condition: game.condition || ''
  })).replace(/'/g, '%27');
  const trailerAction = game.trailer
    ? `<button class="image-card-trailer" onclick="openTrailerFromEncoded('${encodeURIComponent(JSON.stringify({id:game.trailer, title:game.name, provider:game.trailerProvider || 'youtube'})).replace(/'/g, '%27')}'); event.stopPropagation();"><svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'><path d='M8 5v14l11-7z'/></svg> مشاهدة التريلر</button>`
    : '';
  const addAction = game.canAdd !== false && (hasNumericPrice || game.priceLabel || game.addable)
    ? `<button class="image-card-add" onclick="addGameToCartFromEncoded('${cartData}', this); event.stopPropagation();"><svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'><path d='M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z'/></svg> أضف للسلة</button>`
    : '';
  box.innerHTML = `
    <button class="game-detail-close" onclick="closeGameDetails()">×</button>
    <div class="game-detail-cover${game.img ? '' : ' no-image'}${currentDetailImages.length > 1 ? ' has-gallery' : ''}">
      ${detailLabel ? `<span class="game-detail-platform">${escapeHtml(detailLabel)}</span>` : ''}
      ${galleryHtml}
    </div>
    <div class="game-detail-content">
      ${detailLabel ? `<div class="game-detail-kicker">${escapeHtml(detailLabel)}</div>` : ''}
      ${game.condition ? `<div class="game-detail-condition${game.condition === 'جديد' ? ' is-new' : ''}">${escapeHtml(game.condition)}</div>` : ''}
      <div class="game-detail-name">${escapeHtml(game.name)}</div>
      <div class="game-detail-genre">${escapeHtml(genreText)}</div>
      <div class="game-detail-price">${game.priceLabel ? priceText : escapeHtml(priceText)}</div>
      ${descText ? `<div class="game-detail-desc">${escapeHtml(descText)}</div>` : ''}
      <div class="game-detail-actions">
        ${trailerAction}
        ${addAction}
      </div>
    </div>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeGameDetails(event) {
  if (event && event.target.id !== 'game-detail-modal') return;
  const modal = document.getElementById('game-detail-modal');
  const box = document.getElementById('game-detail-box');
  modal.classList.remove('active');
  box.innerHTML = '';
  if (!document.getElementById('trailer-modal')?.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}

function productCardText(card, selectors) {
  for (const selector of selectors) {
    const el = card.querySelector(selector);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return '';
}

function getProductSection(card) {
  const section = card.closest('section');
  if (!section) return 'Othman For Gaming';
  if (section.id && PAGE_TITLES[section.id]) return PAGE_TITLES[section.id];
  return section.querySelector('.section-title')?.textContent.trim().replace(/\s+/g, ' ') || 'Othman For Gaming';
}

function getProductKind(card) {
  if (card.classList.contains('device-showcase') || card.classList.contains('device-card')) return 'device';
  if (card.classList.contains('beauty-card')) return 'beauty';
  if (card.classList.contains('acc-card')) return 'accessory';
  return 'item';
}

function extractProductDetailsFromCard(card) {
  const name = card.dataset.name || productCardText(card, [
    '.device-name-big',
    '.device-name',
    '.acc-name',
    '.beauty-name',
    '.ps5-title',
    '.ps4-title',
    '.ps3-title',
    '.game-title'
  ]);
  if (!name) return null;
  const sub = card.dataset.sub || productCardText(card, [
    '.device-tag',
    '.device-sub',
    '.acc-sub',
    '.beauty-sub',
    '.ps5-genre',
    '.ps4-info',
    '.ps3-genre',
    '.game-genre'
  ]);
  const specs = [...card.querySelectorAll('.device-specs span')].map(el => el.textContent.trim()).filter(Boolean).join(' | ');
  let priceText = card.dataset.price || productCardText(card, [
    '.device-price-big',
    '.price-tag',
    '.acc-price',
    '.beauty-price',
    '.ps5-price',
    '.ps4-price',
    '.ps3-price',
    '.game-price-back'
  ]);
  const numericPrice = parsePriceValue(priceText);
  if (numericPrice > 0 && !/JOD|دينار|السعر|حسب/i.test(priceText)) priceText = `${numericPrice.toFixed(2)} JOD`;
  const img = card.dataset.img || card.querySelector('img')?.getAttribute('src') || '';
  const icon = card.dataset.icon || productCardText(card, [
    '.acc-icon',
    '.beauty-icon',
    '.device-icon',
    '.ps5-icon',
    '.ps4-icon',
    '.ps3-icon',
    '.game-icon'
  ]) || '🎮';
  const section = getProductSection(card);
  const canAdd = !!card.querySelector('.add-btn, .image-card-add');
  const condition = card.dataset.condition || productCardText(card, ['.product-condition-badge']);
  return {
    name,
    img,
    icon,
    price: numericPrice,
    priceText: priceText || 'حسب الطلب',
    priceLabel: numericPrice > 0 ? '' : (priceText || 'حسب الطلب'),
    sub,
    specs,
    desc: card.dataset.desc || card.dataset.description || sub || specs,
    category: section,
    section,
    kind: getProductKind(card),
    kindLabel: section,
    condition,
    canAdd,
    addable: canAdd
  };
}

function markUsedProducts() {
  document.querySelectorAll('.device-showcase, #playstation-devices .acc-card, #xbox-devices .acc-card, #nintendo-devices .acc-card, #wii-devices .acc-card, #vr-devices .acc-card').forEach(card => {
    if (!card.dataset.condition) card.dataset.condition = 'مستعمل';
    if (!card.querySelector('.product-condition-badge')) {
      card.insertAdjacentHTML('afterbegin', `<span class="product-condition-badge${card.dataset.condition === 'جديد' ? ' is-new' : ''}">${card.dataset.condition}</span>`);
    }
  });
}
markUsedProducts();

// ════════════════ FAVORITES / WISHLIST ════════════════
function toggleFavorite(btn, productData) {
  const product = JSON.parse(decodeURIComponent(productData));
  const favorites = getFavorites();
  const index = favorites.findIndex(f => f.name === product.name && f.platform === product.platform);
  
  if (index > -1) {
    favorites.splice(index, 1);
    btn.classList.remove('active');
  } else {
    favorites.push(product);
    btn.classList.add('active');
  }
  
  saveFavorites(favorites);
  renderFavorites();
}

function isFavorite(product) {
  return getFavorites().some(f => f.name === product.name && f.platform === product.platform);
}

function removeFavorite(name, platform) {
  const favorites = getFavorites();
  const index = favorites.findIndex(f => f.name === name && f.platform === platform);
  if (index > -1) {
    favorites.splice(index, 1);
    saveFavorites(favorites);
    renderFavorites();
    updateFavoriteButtons();
  }
}

function updateFavoriteButtons() {
  const favorites = getFavorites();
  document.querySelectorAll('.favorite-btn').forEach(btn => {
    const card = btn.closest('.image-card, .device-showcase, .acc-card, .beauty-card');
    if (card) {
      const name = card.querySelector('.image-card-title, .device-name-big, .device-name, .acc-name, .beauty-name')?.textContent;
      const platform = card.querySelector('.image-card-platform')?.textContent || '';
      if (name) {
        const isFav = favorites.some(f => f.name === name && f.platform === platform);
        btn.classList.toggle('active', isFav);
      }
    }
  });
}

function updateFavoriteBadge() {
  const favorites = getFavorites();
  const badge = document.querySelector('.favorite-toggle-badge');
  if (badge) {
    badge.textContent = favorites.length;
    badge.style.display = favorites.length > 0 ? 'flex' : 'none';
  }
}

function renderFavorites() {
  const favorites = getFavorites();
  const content = document.querySelector('.favorite-sidebar-content');
  if (!content) return;
  
  if (favorites.length === 0) {
    content.innerHTML = `
      <div class="favorite-sidebar-empty">
        <div class="favorite-sidebar-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
        <p>لا توجد مفضلات بعد</p>
        <p style="font-size:0.85rem;margin-top:8px;">اضغط على القلب لحفظ المنتجات</p>
      </div>
    `;
    return;
  }
  
  content.innerHTML = favorites.map(f => {
    const cartData = encodeURIComponent(JSON.stringify({
      name: f.name, price: f.price || 0, priceLabel: f.priceLabel || '',
      img: f.img || '', icon: '', kind: f.kind || 'item',
      platform: f.platform || '', condition: f.condition || ''
    })).replace(/'/g, '%27');
    const canAdd = f.price > 0 || f.priceLabel;
    return `
    <div class="favorite-item">
      ${f.img ? `<img class="favorite-item-img" src="${f.img}" alt="${f.name}" onerror="this.style.display='none'"/>` : ''}
      <div class="favorite-item-info">
        <div class="favorite-item-name">${f.name}</div>
        ${f.price ? `<div class="favorite-item-price">${f.price} JOD</div>` : ''}
        ${f.platform ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-top:2px;">${f.platform}</div>` : ''}
        ${canAdd ? `<button class="image-card-add" style="margin-top:8px;width:100%;justify-content:center;" onclick="addGameToCartFromEncoded('${cartData}', this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z"/></svg> أضف للسلة</button>` : ''}
      </div>
      <button class="favorite-item-remove" onclick="removeFavorite('${f.name.replace(/'/g, "\\'")}', '${f.platform || ''}')">✕</button>
    </div>`;
  }).join('');
}

function goToFavoriteItem(name) {
  // Close sidebar
  document.querySelector('.favorite-sidebar')?.classList.remove('active');

  // Find which category section contains this item
  let targetSection = null;
  let targetCard = null;
  document.querySelectorAll('section[id^="cat-"]').forEach(section => {
    section.querySelectorAll('.image-card').forEach(card => {
      const title = card.querySelector('.image-card-title');
      if (title && title.textContent.trim() === name) {
        targetSection = section;
        targetCard = card;
      }
    });
  });

  if (!targetSection) return;

  const sectionId = targetSection.id;

  // Navigate to the section page, then scroll to card
  navigateToPage(sectionId);

  // After transition finishes, scroll to the card and highlight it
  setTimeout(() => {
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.style.transition = 'box-shadow 0.3s';
      targetCard.style.boxShadow = '0 0 35px rgba(0,255,136,0.8)';
      setTimeout(() => targetCard.style.boxShadow = '', 1800);
    }
  }, 1400);
}
window.goToFavoriteItem = goToFavoriteItem;

function toggleFavoriteSidebar() {
  document.querySelector('.favorite-sidebar').classList.toggle('active');
}

function closeFavoriteSidebar() {
  document.querySelector('.favorite-sidebar').classList.remove('active');
}

function searchInSection(input) {
  const targetSelector = input.dataset.target;
  if (!targetSelector) return;
  const section = input.closest('section');
  if (!section) return;
  const container = section.querySelector(targetSelector);
  if (!container) return;
  const query = input.value.trim().toLowerCase();
  const maxPriceInput = section.querySelector('.price-max');
  const maxPrice = maxPriceInput ? parseFloat(maxPriceInput.value) || Infinity : Infinity;
  const cards = container.querySelectorAll('.image-card, .device-showcase, .acc-card, .beauty-card');
  cards.forEach(card => {
    const name = card.querySelector('.image-card-title, .device-name-big, .device-name, .acc-name, .beauty-name, .ps5-title, .ps4-title, .ps3-title, .game-title')?.textContent.toLowerCase() || '';
    const genre = card.querySelector('.image-card-genre, .device-tag, .device-sub, .acc-sub, .beauty-sub, .ps5-genre, .ps4-info, .ps3-genre, .game-genre')?.textContent.toLowerCase() || '';
    const specs = [...card.querySelectorAll('.device-specs span')].map(el => el.textContent.toLowerCase()).join(' ');
    const priceText = card.querySelector('.image-card-price, .device-price-big, .price-tag, .acc-price, .beauty-price, .ps5-price, .ps4-price, .ps3-price, .game-price-back')?.textContent || '';
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
    const textMatch = query === '' || name.includes(query) || genre.includes(query) || specs.includes(query);
    const priceMatch = price <= maxPrice;
    const match = textMatch && priceMatch;
    card.style.display = match ? '' : 'none';
  });
}

document.addEventListener('click', (event) => {
  if (event.target.closest('button, a, input, textarea, select, .color-dot')) return;
  const card = event.target.closest('.device-showcase, .device-card, .acc-card, .beauty-card, .game-card, .ps3-card, .ps4-card, .ps5-card');
  if (!card || card.closest('#game-detail-modal, #trailer-modal, #cart-sidebar')) return;
  const details = extractProductDetailsFromCard(card);
  if (details) openGameDetails(details);
});

function extractYouTubeId(url) {
  if (!url) return '';
  // Handle youtu.be short links
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];
  // Handle youtube.com/watch?v= links
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return watchMatch[1];
  // Handle youtube.com/embed/ links
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];
  // If it's already just an ID (11 characters, no slashes)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return url;
}

function openTrailerFromEncoded(encodedTrailer) {
  const trailer = JSON.parse(decodeURIComponent(encodedTrailer));
  // Extract YouTube ID from various URL formats
  const cleanId = extractYouTubeId(trailer.id);
  openTrailer(cleanId, trailer.title, trailer.provider);
}

function openTrailer(videoId, title, provider = 'youtube') {
  const modal = document.getElementById('trailer-modal');
  const frameWrap = document.getElementById('trailer-frame-wrap');
  const isDailymotion = provider === 'dailymotion';
  const params = new URLSearchParams(isDailymotion ? {
    autoplay: '1',
    mute: '0'
  } : {
    autoplay: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    origin: window.location.origin
  });
  const src = isDailymotion
    ? `https://www.dailymotion.com/embed/video/${videoId}?${params.toString()}`
    : `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  document.getElementById('trailer-title').textContent = title;
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  frameWrap.innerHTML = `
    <iframe src="${src}" title="${title}" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture; web-share" allowfullscreen onerror="this.nextElementSibling.style.display='flex'"></iframe>
    <div class="trailer-error-fallback" id="trailer-error">
      <strong>⚠️ لم يتم تشغيل الفيديو</strong>
      <span>قد يكون الفيديو محظور من التشغيل داخل الموقع أو غير متاح</span>
      <a href="${youtubeWatchUrl}" target="_blank" rel="noopener" class="trailer-external-btn"><svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor'><path d='M8 5v14l11-7z'/></svg> فتح في يوتيوب</a>
    </div>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Auto-show fallback after 4 seconds if iframe fails to load
  setTimeout(() => {
    const iframe = frameWrap.querySelector('iframe');
    const fallback = document.getElementById('trailer-error');
    if (iframe && fallback) {
      // Check if iframe is accessible (cross-origin safe check)
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) fallback.style.display = 'flex';
      } catch (e) {
        // Cross-origin restriction means it loaded (good)
        // If we can't access it after 4s, likely blocked
      }
    }
  }, 4000);
}

function closeTrailer(event) {
  if (event && event.target.id !== 'trailer-modal') return;
  const modal = document.getElementById('trailer-modal');
  const frameWrap = document.getElementById('trailer-frame-wrap');
  modal.classList.remove('active');
  frameWrap.innerHTML = '';
  if (!document.getElementById('game-detail-modal')?.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}

// ═══ SHARED CART SYSTEM ═══
let cart = JSON.parse(localStorage.getItem('ofg-cart') || '[]');

function saveCart() { localStorage.setItem('ofg-cart', JSON.stringify(cart)); }

function getCurrentCartSection() {
  const activeSection = document.querySelector('section.page-active');
  const hashId = (location.hash || '').replace('#', '');
  const pageId = activeSection?.id || hashId;
  if (pageId && PAGE_TITLES[pageId]) return PAGE_TITLES[pageId];
  return 'الرئيسية';
}

// Accepts EITHER (name, price, icon) OR an object {name, price, icon, img, kind, platform, section}
function addToCart(arg1, price, icon) {
  let item;
  if (typeof arg1 === 'object' && arg1 !== null) {
    item = arg1;
  } else {
    item = { name: arg1, price: price, icon: icon };
  }
  const itemSection = item.section || getCurrentCartSection();
  const itemPlatform = item.platform || null;
  const triggerCard = (window.event?.target || document.activeElement)?.closest?.('.device-showcase, .device-card, .acc-card, .beauty-card, .image-card, .game-card, .ps3-card, .ps4-card, .ps5-card');
  const itemCondition = item.condition || triggerCard?.dataset.condition || triggerCard?.querySelector?.('.product-condition-badge')?.textContent.trim() || null;
  const existing = cart.find(i =>
    i.name === item.name &&
    (i.section || '') === itemSection &&
    (i.platform || null) === itemPlatform &&
    (i.condition || null) === itemCondition
  );
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({
      name: item.name,
      price: parseFloat(item.price),
      priceLabel: item.priceLabel || null,
      icon: item.icon || '',
      img: item.img || null,
      kind: item.kind || 'item',
      platform: itemPlatform,
      section: itemSection,
      condition: itemCondition,
      qty: 1
    });
  }
  saveCart(); updateCartUI(); showToast(item.name);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart(); updateCartUI();
}

function increaseQty(index) {
  cart[index].qty = (cart[index].qty || 1) + 1;
  saveCart(); updateCartUI();
}

function decreaseQty(index) {
  const currentQty = cart[index].qty || 1;
  if (currentQty <= 1) {
    cart.splice(index, 1); // Remove if qty becomes 0
  } else {
    cart[index].qty = currentQty - 1;
  }
  saveCart(); updateCartUI();
}

function showToast(name) {
  document.getElementById('toast-msg').textContent = `تمت إضافة "${name}"`;
  const t = document.getElementById('toast');
  t.querySelector('.toast-icon').textContent = '🛒';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * (i.qty||1), 0);
  const count = cart.reduce((s, i) => s + (i.qty||1), 0);
  const hasPriceRequest = cart.some(i => i.priceLabel);
  document.getElementById('nav-cart-count').textContent = count;
  const list = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-footer');
  if (cart.length === 0) {
    list.innerHTML = '<div class="cart-empty"><span class="cart-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg></span><p>السلة فارغة</p><p style="font-size:0.8rem;margin-top:8px;color:rgba(255,255,255,0.3)">أضف منتجات من أي قسم</p></div>';
    footer.style.display = 'none';
  } else {
    list.innerHTML = cart.map((item, i) => {
      const visual = item.img
        ? `<img class="cart-item-img" src="${item.img}" alt="${item.name}" onerror="this.style.display='none'"/>`
        : `<span class="cart-item-icon"><svg width='24' height='24' viewBox='0 0 24 24' fill='rgba(255,255,255,0.3)'><path d='M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/></svg></span>`;
      const platformBadge = item.platform
        ? `<span style="font-family:'Orbitron',monospace;font-size:0.55rem;background:rgba(204,0,0,0.2);color:#ff8080;padding:2px 6px;border-radius:8px;margin-right:6px;letter-spacing:1px;">${item.platform}</span>`
        : '';
      const sectionName = item.section || item.platform || 'غير محدد';
      const sectionBadge = `<div style="font-size:0.72rem;color:rgba(255,255,255,0.45);margin-top:4px;">القسم: ${sectionName}</div>`;
      const conditionColor = item.condition === 'جديد' ? '#00d65a' : '#ffb366';
      const conditionBadge = item.condition ? `<div style="font-size:0.72rem;color:${conditionColor};margin-top:3px;">الحالة: ${item.condition}</div>` : '';
      return `
        <div class="cart-item">
          ${visual}
          <div class="cart-item-info">
            <div class="cart-item-name">${platformBadge}${item.name}</div>
            ${sectionBadge}
            ${conditionBadge}
            <div class="cart-item-price">${item.priceLabel || `${(item.price * (item.qty||1)).toFixed(2)} JOD`}</div>
          </div>
          <div class="cart-item-actions">
            <button class="cart-qty-btn" onclick="decreaseQty(${i})">−</button>
            <span class="cart-qty-num">${item.qty || 1}</span>
            <button class="cart-qty-btn" onclick="increaseQty(${i})">+</button>
          </div>
        </div>`;
    }).join('');
    document.getElementById('cart-count').textContent = count;
    document.getElementById('cart-total').textContent = hasPriceRequest ? `${total.toFixed(2)}+` : total.toFixed(2);
    footer.style.display = 'block';
  }
}

function openCart() {
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('active');
}
function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('active');
}

function sendCartToWhatsApp() {
  if (!cart.length) {
    showToast('السلة فارغة');
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const hasPriceRequest = cart.some(i => i.priceLabel);
  const e = {
    game: '\uD83C\uDFAE',
    sparkle: '\u2728',
    wave: '\uD83D\uDC4B',
    product: '\uD83D\uDED2',
    qty: '\uD83D\uDD22',
    price: '\uD83D\uDCB0',
    box: '\uD83D\uDCE6',
    money: '\uD83D\uDCB5',
    check: '\u2705',
    truck: '\uD83D\uDE9A',
    heart: '\u2764\uFE0F'
  };
  const orderLines = cart.map((item, index) => {
    const qty = item.qty || 1;
    const lineTotal = item.price * qty;
    const platform = item.platform ? `\n   ${e.game} النوع: ${item.platform}` : '';
    const section = item.section || item.platform || 'غير محدد';
    const condition = item.condition ? `\n   ${e.check} الحالة: ${item.condition}` : '';
    // Format price: show original with strikethrough + discount, or just original
    let priceText;
    if (item.priceLabel && item.originalPrice && item.discountPrice) {
      // Has discount: show original with ~strikethrough~ + discount price
      priceText = `~${item.originalPrice}~ ${item.discountPrice} JOD`;
    } else if (item.priceLabel && item.originalPrice) {
      // Has priceLabel but extract just the numbers
      const cleanPrice = item.originalPrice || lineTotal.toFixed(2);
      priceText = `${cleanPrice} JOD`;
    } else {
      // No discount, just show the calculated price
      priceText = `${lineTotal.toFixed(2)} JOD`;
    }
    return `#${index + 1}
   ${e.product} المنتج: ${item.name}${platform}${condition}
   ${e.qty} الكمية: ${qty}
   ${e.price} السعر: ${priceText}`;
  }).join('\n────────────────\n');

  const message = `${e.game}${e.sparkle} طلب جديد من موقع Othman For Gaming ${e.sparkle}${e.game}

السلام عليكم ${e.wave}
حبيت أطلب المنتجات التالية:

────────────────
${orderLines}
────────────────

${e.box} عدد القطع: ${count}
${e.money} المجموع الكلي: ${total.toFixed(2)} JOD

${e.check} يرجى تأكيد توفر الطلب
${e.truck} وطريقة الاستلام أو التوصيل

شكراً لكم ${e.heart}`;

  const encoded = encodeURIComponent(message.normalize('NFC'));
  const url = `https://wa.me/962775560404?text=${encoded}`;
  // Use location.href on mobile to avoid popup blocker
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

// ════════════════ PAGE-AS-PAGE ROUTER ════════════════
const PAGE_IDS = [];
const PAGE_TITLES = { home: 'الرئيسية' };

let _pageTransitionLock = false;

// Cycle the section-title color through the 3 brand colors on every click
const TRANS_TITLE_COLORS = [
  { name: 'red',   c: '#D6002A' },  // O
  { name: 'green', c: '#00B83A' },  // F
  { name: 'blue',  c: '#1E6FE6' }   // G
];
let _transColorIdx = 0;

function navigateToPage(pageId, push = true) {
  if (_pageTransitionLock) return;
  const isDynCat = pageId.startsWith('cat-');
  if (pageId !== 'home' && !PAGE_IDS.includes(pageId) && !isDynCat) pageId = 'home';

  const overlay = document.getElementById('page-transition');
  const transLogo = overlay.querySelector('.trans-logo');
  transLogo.textContent = PAGE_TITLES[pageId] || (window._catPageTitles || {})[pageId] || 'O.F.G';

  // Pick next color from the 3-color cycle and apply via CSS variable
  const pick = TRANS_TITLE_COLORS[_transColorIdx % TRANS_TITLE_COLORS.length];
  _transColorIdx++;
  overlay.style.setProperty('--trans-title-color', pick.c);
  overlay.dataset.titleColor = pick.name;

  _pageTransitionLock = true;

  // Phase 1 — slide bars across, console logos pop in, page title appears
  overlay.classList.remove('exit');
  overlay.classList.add('show');

  setTimeout(() => {
    // Phase 2 — swap content while screen is covered
    if (pageId === 'home') {
      document.body.classList.remove('in-page-mode');
      document.querySelectorAll('section').forEach(s => s.classList.remove('page-active'));
    } else {
      document.body.classList.add('in-page-mode');
      document.querySelectorAll('section').forEach(s => {
        s.classList.toggle('page-active', s.id === pageId);
      });
      const target = document.getElementById(pageId);
      if (target) {
        // Reset & re-trigger entrance animations
        target.querySelectorAll('.image-card, .section-title, .section-line').forEach(el => {
          el.classList.remove('visible');
        });
        void target.offsetHeight;
        target.querySelectorAll('.section-title, .section-line').forEach(el => el.classList.add('visible'));
        const cards = target.querySelectorAll('.image-card');
        cards.forEach((el, i) => {
          setTimeout(() => el.classList.add('visible'), 200 + i * 55);
        });
        target.querySelectorAll('.image-card-price').forEach(el => animatePrice(el));
        syncAddedButtons();
      }
    }
    if (push) {
      const newHash = pageId === 'home' ? ' ' : '#' + pageId;
      if (location.hash !== newHash && !(pageId === 'home' && !location.hash)) {
        history.pushState({page: pageId}, '', pageId === 'home' ? location.pathname : '#' + pageId);
      }
    }
    window.scrollTo(0, 0);

    // Phase 3 — bars exit
    overlay.classList.add('exit');
    setTimeout(() => {
      overlay.classList.remove('show', 'exit');
      _pageTransitionLock = false;
    }, 700);
  }, 1200); // hold long enough for the console logos to fully appear
}
window.navigateToPage = navigateToPage;

// Intercept clicks on internal anchor links (#devices, #ps4, etc.)
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href').slice(1);
  const target = href || 'home';
  if (target === 'home' || PAGE_IDS.includes(target) || target.startsWith('cat-')) {
    e.preventDefault();
    navigateToPage(target);
  } else if (target === 'sections') {
    // 'sections' is the navigator on home page, smooth scroll
    e.preventDefault();
    if (document.body.classList.contains('in-page-mode')) {
      navigateToPage('home');
      setTimeout(() => document.getElementById('sections')?.scrollIntoView({behavior:'smooth'}), 1300);
    } else {
      document.getElementById('sections')?.scrollIntoView({behavior:'smooth'});
    }
  }
});

window.addEventListener('popstate', (e) => {
  const target = location.hash.replace('#','') || 'home';
  navigateToPage(target, false);
});

// Initial-load deep link
(function initRouter(){
  const initial = location.hash.replace('#','') || 'home';
  if (initial !== 'home' && (PAGE_IDS.includes(initial) || initial.startsWith('cat-'))) {
    // Store for after Firestore loads dynamic sections
    window._pendingDeepLink = initial;
    document.body.classList.add('in-page-mode');
  } else {
    document.body.classList.remove('in-page-mode');
  }
})();

// Called by firestore-loader after all sections are rendered
window._applyPendingDeepLink = function() {
  const id = window._pendingDeepLink;
  if (!id) return;
  window._pendingDeepLink = null;
  document.querySelectorAll('section').forEach(s => s.classList.toggle('page-active', s.id === id));
  const target = document.getElementById(id);
  if (target) {
    target.querySelectorAll('.section-title, .section-line').forEach(el => el.classList.add('visible'));
    const cards = target.querySelectorAll('.image-card');
    cards.forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 55));
  }
};

// ════════════════ PRICE COUNTER ANIMATION ════════════════
function animatePrice(el) {
  if (!el || el.dataset.animating === '1') return;
  // If the element contains a dual-price layout (.price-old + .price-new),
  // animate ONLY the .price-new child so we don't destroy the strikethrough span.
  const newPriceEl = el.querySelector('.price-new');
  const targetEl = newPriceEl || el;
  if (!targetEl.dataset.targetPrice) {
    const raw = (targetEl.textContent || '').trim();
    const match = raw.match(/\d+(?:\.\d+)?/);
    if (!match) return;
    targetEl.dataset.targetPrice = match[0];
  }
  const target = parseFloat(targetEl.dataset.targetPrice);
  if (isNaN(target)) return;
  const hasJOD = !newPriceEl && (el.textContent || '').includes('JOD');
  el.dataset.animating = '1';
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = eased * target;
    targetEl.textContent = (target % 1 === 0 ? Math.round(v) : v.toFixed(2)) + (hasJOD ? ' JOD' : '');
    if (t < 1) requestAnimationFrame(tick);
    else el.dataset.animating = '0';
  }
  requestAnimationFrame(tick);
}

const priceObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) animatePrice(e.target);
  });
}, { threshold: 0.4 });
function watchPrices() {
  document.querySelectorAll('.image-card-price').forEach(el => priceObserver.observe(el));
}

// ════════════════ BIG BACKGROUND SYMBOLS ════════════════
function generateBgSymbols() {
  const wrap = document.getElementById('bg-symbols');
  if (!wrap) return;
  const variants = [
    { ch: '✕', cls: 's-x' },
    { ch: '○', cls: 's-circle' },
    { ch: '□', cls: 's-square' },
    { ch: '△', cls: 's-triangle' }
  ];
  const total = window.innerWidth < 768 ? 4 : 12; // Reduced on mobile for performance
  for (let i = 0; i < total; i++) {
    const v = variants[Math.floor(Math.random() * variants.length)];
    const bright = Math.random() < 0.35;
    const big = Math.random() < 0.25;
    const el = document.createElement('span');
    el.className = `bg-symbol ${v.cls}${bright ? ' bright' : ''}`;
    el.textContent = v.ch;
    el.style.left = (Math.random() * 100) + '%';
    el.style.fontSize = (big ? (60 + Math.random() * 100) : (24 + Math.random() * 50)) + 'px';
    el.style.setProperty('--xOff', '0px');
    el.style.setProperty('--xDrift', ((Math.random() - 0.5) * 200) + 'px');
    el.style.animationDuration = (12 + Math.random() * 18) + 's';
    el.style.animationDelay = -(Math.random() * 25) + 's';
    wrap.appendChild(el);
  }
}
generateBgSymbols();

// ════════════════ PS5-STYLE 3D CARD TILT + PARALLAX + HOLOGRAPHIC GLARE ════════════════
// Targets: .image-card, .device-showcase, .acc-card, .beauty-card.
// Sets   --rx/--ry  → rotation
//        --mx/--my  → glare position (also reused by .section-nav-card spotlight)
// Toggles .is-tilted to trigger the cubic-bezier CSS transitions.
const TILT_SELECTOR = '.image-card';
const TILT_MAX_DEG = 4;     // max rotation per axis (slightly reduced)
let _tiltedCard = null;
let _lastMouseMove = 0;
const _THROTTLE_MS = 32; // ~30fps - better performance on mobile

function _resetTiltedCard(card) {
  if (!card) return;
  card.classList.remove('is-tilted');
  card.style.removeProperty('--rx');
  card.style.removeProperty('--ry');
  card.style.removeProperty('--mx');
  card.style.removeProperty('--my');
}

// Skip heavy tilt effects on touch devices (mobile) for better performance
const _isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

if (!_isTouchDevice) {
 document.addEventListener('mousemove', (e) => {
   const now = performance.now();
   if (now - _lastMouseMove < _THROTTLE_MS) return;
   _lastMouseMove = now;
   const card = e.target.closest(TILT_SELECTOR);

   // Switching between cards (or leaving) — reset the previous one cleanly
   if (card !== _tiltedCard) {
     _resetTiltedCard(_tiltedCard);
     _tiltedCard = card || null;
   }

   if (card) {
     const r = card.getBoundingClientRect();
     const px = (e.clientX - r.left) / r.width;     // 0..1
     const py = (e.clientY - r.top)  / r.height;
     const x  = px - 0.5, y = py - 0.5;             // -0.5..0.5
     // Rotation (note: y inverted so the top tilts away from the viewer)
     card.style.setProperty('--rx', (-y * TILT_MAX_DEG * 2).toFixed(2) + 'deg');
     card.style.setProperty('--ry', ( x * TILT_MAX_DEG * 2).toFixed(2) + 'deg');
     // Glare focal point (in % so the radial-gradient picks it up)
     card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
     card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
     card.classList.add('is-tilted');
   }

   // Section nav cards keep their independent spotlight track
   const navCard = e.target.closest('.section-nav-card');
   if (navCard) {
     const r = navCard.getBoundingClientRect();
     navCard.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100) + '%');
     navCard.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100) + '%');
   }
 }, { passive: true });
} // End of if (!_isTouchDevice)

// Reset when the cursor leaves the document (desktop only)
if (!_isTouchDevice) {
  document.addEventListener('mouseleave', () => {
    _resetTiltedCard(_tiltedCard);
    _tiltedCard = null;
  });
}

// ════════════════ BUTTON RIPPLE ════════════════
// Disabled on mobile for performance - keeps only on desktop
if (!_isTouchDevice) {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-red, .btn-blue, .add-btn, .image-card-add, .image-card-trailer, .cart-checkout-btn, .nav-cart-btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(r.width, r.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }, true);
}

// ════════════════ CART ADD EXPLOSION ════════════════
function spawnCartExplosion(x, y) {
  const wrap = document.createElement('div');
  wrap.className = 'cart-explosion';
  wrap.style.left = x + 'px';
  wrap.style.top = y + 'px';
  const symbols = ['✕','○','□','△','★','✦','+'];
  const colors = ['#FF2D55','#2A8CFF','#FFD700','#FF66CC','#00CCFF','#fff'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    s.style.color = colors[Math.floor(Math.random() * colors.length)];
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
    const dist = 80 + Math.random() * 80;
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    s.style.animationDelay = (Math.random() * 0.1) + 's';
    s.style.fontSize = (1 + Math.random() * 1.2) + 'rem';
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1200);
}
// Spawn explosion when add-to-cart buttons are clicked (disabled on mobile for performance)
if (!_isTouchDevice) {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-btn, .image-card-add');
    if (btn) spawnCartExplosion(e.clientX, e.clientY);
  }, false);
}

// ════════════════ INIT — RENDER GAMES ════════════════
renderGameGrid('ps4-grid', PS4_GAMES, 'PS4');
renderGameGrid('ps5-grid', PS5_GAMES, 'PS5');
watchPrices();

// Initialize favorites (must be after grids are rendered)
renderFavorites();
updateFavoriteButtons();
updateFavoriteBadge();

// Initialize search listeners after grids are rendered
document.querySelectorAll('.search-input').forEach(input => {
  input.addEventListener('input', () => searchInSection(input));
});
document.querySelectorAll('.price-max').forEach(input => {
  input.addEventListener('input', (e) => {
    const searchInput = e.target.closest('.section-search').querySelector('.search-input');
    if (searchInput) searchInSection(searchInput);
  });
});

// Buttons no longer have a persistent "added" lock — every click adds another copy
// and the toast confirms it. Function kept (no-op) since other places still call it.
function syncAddedButtons() {
  document.querySelectorAll('.image-card-add.added, .image-card-add.just-added').forEach(btn => {
    btn.classList.remove('added', 'just-added');
    if (btn.innerHTML.trim().startsWith('✓')) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z"/></svg> أضف';
  });
}
syncAddedButtons();

// ═══ LOADER ═══
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    // startParticles(); // disabled for isolation testing
  }, 2200);
});

// Fallback: force hide loader after 5 seconds regardless
setTimeout(() => {
  const loader = document.getElementById('loader');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
  }
}, 5000);
updateCartUI();


// ═══ PARTICLES ═══
function startParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  const symbols = ['✕','○','□','△','×'];
  const particles = [];
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      s: symbols[Math.floor(Math.random() * symbols.length)],
      size: Math.random() * 12 + 6, speed: Math.random() * 0.4 + 0.1,
      opacity: Math.random() * 0.25 + 0.05, drift: (Math.random() - 0.5) * 0.4,
      red: Math.random() > 0.5,
    });
  }
  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.red ? '#CC0000' : '#0055CC';
      ctx.font = `${p.size}px Orbitron,sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(p.s, p.x, p.y); ctx.restore();
      p.y -= p.speed; p.x += p.drift;
      if (p.y < -30) { p.y = H + 30; p.x = Math.random() * W; }
    });
    requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

// ═══ NAVBAR ═══
const navbar = document.getElementById('navbar');
let _lastScrollY = 0;
let _ticking = false;
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (!_ticking) {
    window.requestAnimationFrame(() => {
      navbar.classList.toggle('shrunk', scrollY > 80);
      _ticking = false;
    });
    _ticking = true;
  }
}, { passive: true });

// ═══ SCROLL ANIMATIONS ═══
// Optimized for mobile: higher threshold, observe only image cards
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { 
  threshold: _isTouchDevice ? 0.2 : 0.1, // Higher threshold on mobile
  rootMargin: '50px' // Preload slightly before visible
});

// Observe fewer elements on mobile for better performance
const elementsToObserve = _isTouchDevice 
  ? '.section-title, .section-line, .image-card, .section-nav-card' // Mobile: fewer elements
  : '.section-title, .section-line, .device-card, .device-showcase, .image-card, .game-card, .ps3-card, .ps4-card, .ps5-card, .acc-card, .beauty-card, .section-nav-card'; // Desktop: all

document.querySelectorAll(elementsToObserve).forEach((el, i) => {
  el.style.transitionDelay = ((i % 6) * 0.08) + 's';
  observer.observe(el);
});

// ═══ STAT COUNTERS ═══
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-number').forEach(el => {
        const target = parseInt(el.dataset.target);
        const duration = 1000; // 1 second animation
        const startTime = performance.now();
        
        function updateCount(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          el.textContent = current.toLocaleString('ar');
          
          if (progress < 1) {
            requestAnimationFrame(updateCount);
          }
        }
        requestAnimationFrame(updateCount);
      });
      statObserver.disconnect();
    }
  });
}, { threshold: 0.5 });
const statsSection = document.querySelector('.stats-section');
if (statsSection) statObserver.observe(statsSection);
