// ═══ COMING SOON ═══
function showComingSoon(section) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = `قسم "${section}" قريباً! تابعنا على السوشيال ميديا`;
  document.getElementById('toast').querySelector('.toast-icon').textContent = '🚧';
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    t.querySelector('.toast-icon').textContent = '🛒';
  }, 3500);
}

// ═══ GAME CATALOG — populated dynamically from Firestore ═══
const PS4_GAMES = [];
// Static fallback removed. Items are fetched from the Firestore "Items" collection.
const PS5_GAMES = [];

function renderGameGrid(targetId, games, platform) {
  const grid = document.getElementById(targetId);
  if (!grid) return;
  const isPS5 = platform === 'PS5';
  grid.innerHTML = games.map(g => {
    const condition = g.condition || 'مستعمل';
    const conditionClass = condition === 'جديد' ? ' is-new' : '';
    const detailData = encodeURIComponent(JSON.stringify({...g, platform, condition})).replace(/'/g, '%27');
    const cartData = encodeURIComponent(JSON.stringify({name:g.name, price:g.price, priceLabel:g.priceLabel || '', img:g.img, icon:'💿', kind:'game', platform, condition})).replace(/'/g, '%27');
    const trailerData = encodeURIComponent(JSON.stringify({id:g.trailer, title:g.name, provider:g.trailerProvider || 'youtube'})).replace(/'/g, '%27');
    const trailerButton = g.trailer
      ? `<button class="image-card-trailer" onclick="openTrailerFromEncoded('${trailerData}'); event.stopPropagation();">▶ تريلر</button>`
      : '';
    const priceHtml = g.priceLabel
      ? `<div class="image-card-price image-card-price-text">${g.priceLabel}</div>`
      : `<div class="image-card-price">${g.price} <span style="font-size:.55em;opacity:.55">JOD</span></div>`;
    const addButton = g.price > 0 || g.priceLabel
      ? `<button class="image-card-add"
                    onclick="addGameToCartFromEncoded('${cartData}', this); event.stopPropagation();">
              🛒 أضف
            </button>`
      : '';
    return `
    <div class="image-card${isPS5 ? ' is-ps5' : ''}" onclick="openGameDetails(JSON.parse(decodeURIComponent('${detailData}')))">
      <div class="image-card-imgwrap">
        ${(platform && platform !== 'Other' && platform !== 'أخرى') ? `<span class="image-card-platform">${platform}</span>` : ''}
        <span class="product-condition-badge${conditionClass}">${condition}</span>
        <img class="image-card-img" src="${g.img}" alt="${g.name}" loading="lazy"
             onerror="this.style.objectFit='cover';this.src='images/logo.jpg'"/>
      </div>
      <div class="image-card-body">
        <div class="image-card-title">${g.name}</div>
        <div class="image-card-genre">${g.genre}</div>
        <div class="image-card-bottom">
          ${priceHtml}
          <div class="image-card-actions">
            <button class="favorite-btn" onclick="toggleFavorite(this, '${encodeURIComponent(JSON.stringify({...g, platform, condition})).replace(/'/g, '%27')}'); event.stopPropagation();">❤</button>
            ${trailerButton}
            ${addButton}
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');
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

function openGameDetails(game) {
  const modal = document.getElementById('game-detail-modal');
  const box = document.getElementById('game-detail-box');
  const hasNumericPrice = Number(game.price || 0) > 0;
  const priceText = game.priceText || game.priceLabel || (hasNumericPrice ? `${Number(game.price || 0).toFixed(2)} JOD` : 'حسب الطلب');
  const rawLabel = game.platform || game.category || game.section || '';
  const detailLabel = (rawLabel === 'Other' || rawLabel === 'أخرى') ? '' : rawLabel;
  const genreText = game.genre || game.sub || game.specs || game.kindLabel || 'Othman For Gaming';
  const descText = game.desc || game.description || game.sub || 'تفاصيل المنتج قابلة للتعديل، ويمكنك إضافة وصف خاص لكل منتج باستخدام data-desc على نفس الكرت.';
  const iconText = game.icon || '🎮';
  const coverHtml = game.img
    ? `<img src="${escapeHtml(game.img)}" alt="${escapeHtml(game.name)}" onerror="this.closest('.game-detail-cover').classList.add('no-image');this.outerHTML='<span class=&quot;game-detail-cover-icon&quot;>${escapeHtml(iconText)}</span>'"/>`
    : `<span class="game-detail-cover-icon">${escapeHtml(iconText)}</span>`;
  const cartData = encodeURIComponent(JSON.stringify({
    name: game.name,
    price: hasNumericPrice ? Number(game.price || 0) : parsePriceValue(priceText),
    priceLabel: game.priceLabel || (!hasNumericPrice && priceText ? priceText : ''),
    img: game.img,
    icon: iconText,
    kind: game.kind || 'item',
    platform: game.platform || null,
    section: game.section || game.category || null,
    condition: game.condition || ''
  })).replace(/'/g, '%27');
  const trailerAction = game.trailer
    ? `<button class="image-card-trailer" onclick="openTrailerFromEncoded('${encodeURIComponent(JSON.stringify({id:game.trailer, title:game.name, provider:game.trailerProvider || 'youtube'})).replace(/'/g, '%27')}'); event.stopPropagation();">▶ مشاهدة التريلر</button>`
    : '';
  const addAction = game.canAdd !== false && (hasNumericPrice || game.priceLabel || game.addable)
    ? `<button class="image-card-add" onclick="addGameToCartFromEncoded('${cartData}', this); event.stopPropagation();">🛒 أضف للسلة</button>`
    : '';
  box.innerHTML = `
    <button class="game-detail-close" onclick="closeGameDetails()">×</button>
    <div class="game-detail-cover${game.img ? '' : ' no-image'}">
      ${detailLabel ? `<span class="game-detail-platform">${escapeHtml(detailLabel)}</span>` : ''}
      ${coverHtml}
    </div>
    <div class="game-detail-content">
      ${detailLabel ? `<div class="game-detail-kicker">${escapeHtml(detailLabel)}</div>` : ''}
      ${game.condition ? `<div class="game-detail-condition${game.condition === 'جديد' ? ' is-new' : ''}">${escapeHtml(game.condition)}</div>` : ''}
      <div class="game-detail-name">${escapeHtml(game.name)}</div>
      <div class="game-detail-genre">${escapeHtml(genreText)}</div>
      <div class="game-detail-price">${game.priceLabel ? priceText : escapeHtml(priceText)}</div>
      <div class="game-detail-desc">${escapeHtml(descText)}</div>
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
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('othman_favorites') || '[]');
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem('othman_favorites', JSON.stringify(favorites));
  updateFavoriteBadge();
}

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
  const favorites = getFavorites();
  return favorites.some(f => f.name === product.name && f.platform === product.platform);
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
        <div class="favorite-sidebar-empty-icon">❤</div>
        <p>لا توجد مفضلات بعد</p>
        <p style="font-size:0.85rem;margin-top:8px;">اضغط على القلب لحفظ المنتجات</p>
      </div>
    `;
    return;
  }
  
  content.innerHTML = favorites.map(f => `
    <div class="favorite-item">
      ${f.img ? `<img class="favorite-item-img" src="${f.img}" alt="${f.name}" onerror="this.style.display='none'"/>` : ''}
      <div class="favorite-item-info">
        <div class="favorite-item-name">${f.name}</div>
        ${f.price ? `<div class="favorite-item-price">${f.price} JOD</div>` : ''}
        ${f.platform ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-top:2px;">${f.platform}</div>` : ''}
      </div>
      <button class="favorite-item-remove" onclick="removeFavorite('${f.name.replace(/'/g, "\\'")}', '${f.platform || ''}')">✕</button>
    </div>
  `).join('');
}

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

function openTrailerFromEncoded(encodedTrailer) {
  const trailer = JSON.parse(decodeURIComponent(encodedTrailer));
  openTrailer(trailer.id, trailer.title, trailer.provider);
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
  frameWrap.innerHTML = `
    <iframe src="${src}" title="${title}" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture; web-share" allowfullscreen></iframe>
    <div class="trailer-embed-fallback">
      <strong>جاري تشغيل التريلر داخل الموقع</strong>
      <span>إذا ظهر خطأ من المشغل، نبدل مصدر الفيديو بمصدر Embed آخر بدون تحميل الفيديو على الموقع.</span>
    </div>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
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
      icon: item.icon || '🎮',
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
    list.innerHTML = '<div class="cart-empty"><span class="cart-empty-icon">🎮</span><p>السلة فارغة</p><p style="font-size:0.8rem;margin-top:8px;color:rgba(255,255,255,0.3)">أضف منتجات من أي قسم</p></div>';
    footer.style.display = 'none';
  } else {
    list.innerHTML = cart.map((item, i) => {
      const visual = item.img
        ? `<img class="cart-item-img" src="${item.img}" alt="${item.name}" onerror="this.style.display='none'"/>`
        : `<span class="cart-item-icon">${item.icon || '🎮'}</span>`;
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
            <div class="cart-item-name">${platformBadge}${item.name}${item.qty > 1 ? ` ×${item.qty}` : ''}</div>
            ${sectionBadge}
            ${conditionBadge}
            <div class="cart-item-price">${item.priceLabel || `${(item.price * (item.qty||1)).toFixed(2)} JOD`}</div>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
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
    const priceText = item.priceLabel || `${lineTotal.toFixed(2)} JOD`;
    return `#${index + 1}
   ${e.product} المنتج: ${item.name}${platform}
   ${e.game} القسم: ${section}
   ${condition}
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
${e.money} المجموع الكلي: ${hasPriceRequest ? `${total.toFixed(2)} JOD + منتجات سعرها عند الطلب` : `${total.toFixed(2)} JOD`}

${e.check} يرجى تأكيد توفر الطلب
${e.truck} وطريقة الاستلام أو التوصيل

شكراً لكم ${e.heart}`;

  const params = new URLSearchParams({
    phone: '962775560404',
    text: message.normalize('NFC'),
    type: 'phone_number',
    app_absent: '0'
  });
  window.open(`https://api.whatsapp.com/send?${params.toString()}`, '_blank', 'noopener');
}

// ════════════════ PAGE-AS-PAGE ROUTER ════════════════
const PAGE_IDS = ['devices','ps1-discs','ps2','ps3','ps4','ps5','xbox-discs','wii-discs','umd-discs','playstation-devices','xbox-devices','nintendo-devices','wii-devices','vr-devices','steering-devices','ps-xbox-accessories','repair-service','accessories','beauty'];
const PAGE_TITLES = {
  devices: 'الأجهزة',
  'ps1-discs': 'سيديات PS1',
  ps2: 'سيديات PS2',
  ps3: 'سيديات PS3',
  ps4: 'سيديات PS4',
  ps5: 'سيديات PS5',
  'xbox-discs': 'سيديات Xbox',
  'wii-discs': 'سيديات Wii',
  'umd-discs': 'سيديات UMD',
  'playstation-devices': 'أجهزة PlayStation',
  'xbox-devices': 'أجهزة Xbox',
  'nintendo-devices': 'أجهزة نينتندو',
  'wii-devices': 'أجهزة Wii',
  'vr-devices': 'أجهزة VR',
  'steering-devices': 'أجهزة ستيرنج',
  'ps-xbox-accessories': 'إكسسوارات PS / Xbox',
  'repair-service': 'خدمة صيانة',
  accessories: 'الإكسسوارات',
  beauty: 'التجميل',
  home: 'الرئيسية'
};

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
        target.querySelectorAll('.image-card, .device-showcase, .acc-card, .beauty-card, .section-title, .section-line').forEach(el => {
          el.classList.remove('visible');
        });
        void target.offsetHeight;
        target.querySelectorAll('.section-title, .section-line').forEach(el => el.classList.add('visible'));
        const cards = target.querySelectorAll('.image-card, .device-showcase, .acc-card, .beauty-card');
        cards.forEach((el, i) => {
          setTimeout(() => el.classList.add('visible'), 200 + i * 55);
        });
        // Re-animate prices
        target.querySelectorAll('.image-card-price, .device-price-big, .acc-price, .beauty-price, .ps5-price, .ps4-price').forEach(el => animatePrice(el));
        // Sync added buttons after re-render
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
    // skip transition for instant first-paint
    document.body.classList.add('in-page-mode');
    document.querySelectorAll('section').forEach(s => s.classList.toggle('page-active', s.id === initial));
  } else {
    // Always show home and sections by default
    document.body.classList.remove('in-page-mode');
  }
})();

// ════════════════ PRICE COUNTER ANIMATION ════════════════
function animatePrice(el) {
  if (!el || el.dataset.animating === '1') return;
  if (!el.dataset.targetPrice) {
    const txt = (el.textContent || '').trim().replace(/[^\d.]/g, '');
    if (!txt) return;
    el.dataset.targetPrice = txt;
  }
  const target = parseFloat(el.dataset.targetPrice);
  if (isNaN(target)) return;
  const hasJOD = (el.textContent || '').includes('JOD');
  el.dataset.animating = '1';
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = eased * target;
    el.textContent = (target % 1 === 0 ? Math.round(v) : v.toFixed(2)) + (hasJOD ? ' JOD' : '');
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
  document.querySelectorAll('.image-card-price, .device-price-big, .acc-price, .beauty-price, .ps5-price, .ps4-price, .ps3-price').forEach(el => priceObserver.observe(el));
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
  const total = window.innerWidth < 768 ? 8 : 15;
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
const TILT_SELECTOR = '.image-card, .device-showcase, .acc-card, .beauty-card';
const TILT_MAX_DEG = 5;     // max rotation per axis in degrees
let _tiltedCard = null;
let _lastMouseMove = 0;
const _THROTTLE_MS = 16; // ~60fps

function _resetTiltedCard(card) {
  if (!card) return;
  card.classList.remove('is-tilted');
  card.style.removeProperty('--rx');
  card.style.removeProperty('--ry');
  card.style.removeProperty('--mx');
  card.style.removeProperty('--my');
}

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

 Reset when the cursor leaves the document entirely (otherwise the card
 would stay frozen in its tilted state)
 document.addEventListener('mouseleave', () => {
   _resetTiltedCard(_tiltedCard);
   _tiltedCard = null;
 });

// ════════════════ BUTTON RIPPLE ════════════════
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
// Spawn explosion when add-to-cart buttons are clicked
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-btn, .image-card-add');
  if (btn) spawnCartExplosion(e.clientX, e.clientY);
}, false);

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
    if (btn.innerHTML.trim().startsWith('✓')) btn.innerHTML = '🛒 أضف';
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
    console.warn('Loader force-hidden due to timeout');
  }
}, 5000);
updateCartUI();

// ═══ CURSOR ═══
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');
document.addEventListener('mousemove', (e) => {
  cursor.style.left = (e.clientX - 11) + 'px';
  cursor.style.top = (e.clientY - 11) + 'px';
  cursorDot.style.left = (e.clientX - 3) + 'px';
  cursorDot.style.top = (e.clientY - 3) + 'px';
});

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
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.section-title, .section-line, .device-card, .device-showcase, .image-card, .game-card, .ps3-card, .ps4-card, .ps5-card, .acc-card, .beauty-card, .section-nav-card').forEach((el, i) => {
  el.style.transitionDelay = ((i % 6) * 0.08) + 's';
  observer.observe(el);
});

// ═══ STAT COUNTERS ═══
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-number').forEach(el => {
        const target = parseInt(el.dataset.target);
        let count = 0; const step = Math.ceil(target / 80);
        const timer = setInterval(() => {
          count = Math.min(count + step, target);
          el.textContent = count.toLocaleString('ar');
          if (count >= target) clearInterval(timer);
        }, 20);
      });
      statObserver.disconnect();
    }
  });
}, { threshold: 0.5 });
const statsSection = document.querySelector('.stats-section');
if (statsSection) statObserver.observe(statsSection);
