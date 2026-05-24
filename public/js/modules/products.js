// ═══════════════════════════════════════════════════════════════════
//  PRODUCTS MODULE
//  Renders the image-card grid and the game-detail modal.
// ═══════════════════════════════════════════════════════════════════

import { itemImagesMap, detailGallery } from './state.js';
import { escapeHtml, parsePriceValue, encodeOnclick, buildImageKey } from './utils.js';
import { getFavoriteLookup } from './favorites.js';

const CART_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z"/></svg>`;
const PLAY_ICON_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const HEART_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const PLAY_BIG_SVG = `<svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'><path d='M8 5v14l11-7z'/></svg>`;
const CART_BIG_SVG = `<svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'><path d='M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z'/></svg>`;

const NO_IMAGE_FALLBACK = "this.style.objectFit='cover';this.src='images/logo.jpg'";

// ── Grid rendering ──────────────────────────────────────────────────

export function renderGameGrid(targetId, games, platform, color) {
  const grid = document.getElementById(targetId);
  if (!grid) return;

  const isPS5 = platform === 'PS5';
  const platformColor = color || (isPS5 ? '#2A8CFF' : '#CC0000');
  const platformStyle = platform
    ? `style="background:${platformColor};color:#fff;box-shadow:0 0 10px ${platformColor}80"`
    : '';
  const favoriteLookup = getFavoriteLookup();
  const showPlatformBadge = platform && platform !== 'Other' && platform !== 'أخرى';

  grid.innerHTML = games.map(g => {
    const condition = g.condition || 'مستعمل';
    const conditionClass = condition === 'جديد' ? ' is-new' : '';
    const isOutOfStock = g.quantity !== null && g.quantity !== undefined && Number(g.quantity) === 0;

    // Store images in the global map (avoids encoding multi-image arrays in onclick).
    const itemKey = buildImageKey(g.name, g.img);
    const imagesArray = g.images || [g.img];
    itemImagesMap[itemKey] = imagesArray;

    const detailData = encodeOnclick({
      name: g.name,
      img: g.img,
      _imgKey: itemKey,
      price: g.price,
      priceLabel: g.priceLabel,
      genre: g.genre,
      condition,
      trailer: g.trailer,
      originalPrice: g.originalPrice,
      discountPrice: g.discountPrice,
      description: g.description,
      platform
    });
    const cartData = encodeOnclick({
      name: g.name,
      price: g.price,
      priceLabel: g.priceLabel || '',
      img: g.img,
      icon: '',
      kind: 'game',
      platform,
      condition
    });
    const trailerData = encodeOnclick({
      id: g.trailer,
      title: g.name,
      provider: g.trailerProvider || 'youtube'
    });

    const trailerButton = g.trailer
      ? `<button class="image-card-trailer" onclick="openTrailerFromEncoded('${trailerData}'); event.stopPropagation();">${PLAY_ICON_SVG} تريلر</button>`
      : '';

    const hasDiscount = g.originalPrice && g.discountPrice && g.discountPrice < g.originalPrice;
    let priceHtml;
    if (g.priceLabel) {
      priceHtml = `<div class="image-card-price image-card-price-text">${g.priceLabel}</div>`;
    } else if (hasDiscount) {
      priceHtml = `<div class="image-card-price"><span style="text-decoration:line-through;opacity:.6;font-size:.85em">${g.originalPrice}</span> <span style="color:#ff4444;font-weight:bold">${g.discountPrice}</span> <span style="font-size:.55em;opacity:.55">JOD</span></div>`;
    } else {
      priceHtml = `<div class="image-card-price">${g.price} <span style="font-size:.55em;opacity:.55">JOD</span></div>`;
    }

    const addButton = (g.price > 0 || g.priceLabel) && !isOutOfStock
      ? `<button class="image-card-add" onclick="addGameToCartFromEncoded('${cartData}', this); event.stopPropagation();">${CART_ICON_SVG} أضف</button>`
      : '';

    const isFav = favoriteLookup.has(`${g.name}::${platform || ''}`);
    const genreText = Array.isArray(g.genre) ? g.genre.join(' · ') : (g.genre || ' ');

    return `
    <div class="image-card${isPS5 ? ' is-ps5' : ''}${isOutOfStock ? ' is-out-of-stock' : ''}" data-item-id="${g.id || ''}" onclick="openGameDetails(JSON.parse(decodeURIComponent('${detailData}')))">
      <div class="image-card-imgwrap">
        ${showPlatformBadge ? `<span class="image-card-platform" ${platformStyle} onclick="event.stopPropagation(); navigateToPage('cat-${g.section || g.category || ''}')">${platform}</span>` : ''}
        <span class="product-condition-badge${conditionClass}">${condition}</span>
        ${isOutOfStock ? '<span class="out-of-stock-badge">نفذت الكمية</span>' : ''}
        <img class="image-card-img" src="${g.img}" alt="${escapeHtml(g.name)}" loading="lazy" decoding="async" fetchpriority="low" onerror="${NO_IMAGE_FALLBACK}"/>
      </div>
      <div class="image-card-body">
        <div class="image-card-title">${escapeHtml(g.name)}</div>
        <div class="image-card-genre">${escapeHtml(genreText)}</div>
        <div class="image-card-bottom">
          ${priceHtml}
          <div class="image-card-actions">
            <button class="favorite-btn${isFav ? ' active' : ''}" onclick="toggleFavorite(this, '${detailData}'); event.stopPropagation();">${HEART_ICON_SVG}</button>
            ${trailerButton}
            ${addButton}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Reveal cards (lightweight — relies on CSS transitions).
  requestAnimationFrame(() => {
    grid.querySelectorAll('.image-card').forEach((el, i) => {
      el.style.transitionDelay = ((i % 6) * 0.05) + 's';
      el.classList.add('visible');
    });
  });
}

// ── Detail-modal gallery ───────────────────────────────────────────

export function showDetailImage(index) {
  if (!detailGallery.images.length) return;
  detailGallery.index = index;
  const mainImg = document.getElementById('detail-main-image');
  if (mainImg) mainImg.src = detailGallery.images[index];
  document.querySelectorAll('.detail-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });
}

// ── Open / close detail modal ──────────────────────────────────────

export function openGameDetails(game) {
  const modal = document.getElementById('game-detail-modal');
  const box = document.getElementById('game-detail-box');
  if (!modal || !box) return;

  const hasNumericPrice = Number(game.price || 0) > 0;
  const priceText = game.priceText || game.priceLabel
    || (hasNumericPrice ? `${Number(game.price || 0).toFixed(2)} JOD` : 'حسب الطلب');
  const rawLabel = game.platform || game.category || game.section || '';
  const detailLabel = (rawLabel === 'Other' || rawLabel === 'أخرى') ? '' : rawLabel;
  const genreText = (Array.isArray(game.genre) ? game.genre.join(' · ') : game.genre)
    || game.sub || game.specs || game.kindLabel || 'Othman For Gaming';
  const descText = game.desc || game.description || '';
  const iconText = game.icon || '';

  // Resolve full-resolution images either from the global map or fallback.
  let images = game.images;
  if (!images && game._imgKey && itemImagesMap[game._imgKey]) {
    images = itemImagesMap[game._imgKey];
  }
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch { images = null; }
  }
  detailGallery.images = Array.isArray(images) && images.length > 0
    ? images
    : (game.img ? [game.img] : []);
  detailGallery.index = 0;

  // Build gallery HTML.
  let galleryHtml;
  if (detailGallery.images.length > 1) {
    const thumbsHtml = detailGallery.images.map((img, i) =>
      `<img src="${escapeHtml(img)}" class="detail-thumb${i === 0 ? ' active' : ''}" onclick="showDetailImage(${i})" alt=""/>`
    ).join('');
    galleryHtml = `
      <div class="detail-gallery">
        <div class="detail-gallery-main">
          <img id="detail-main-image" src="${escapeHtml(detailGallery.images[0])}" alt="${escapeHtml(game.name)}"
               onerror="this.closest('.game-detail-cover').classList.add('no-image');this.outerHTML='<span class=&quot;game-detail-cover-icon&quot;>${escapeHtml(iconText)}</span>'"/>
        </div>
        <div class="detail-gallery-thumbs">${thumbsHtml}</div>
      </div>`;
  } else if (game.img) {
    galleryHtml = `<img src="${escapeHtml(game.img)}" alt="${escapeHtml(game.name)}"
               onerror="this.closest('.game-detail-cover').classList.add('no-image');this.outerHTML='<span class=&quot;game-detail-cover-icon&quot;>${escapeHtml(iconText)}</span>'"/>`;
  } else {
    galleryHtml = `<span class="game-detail-cover-icon">${escapeHtml(iconText)}</span>`;
  }

  const cartData = encodeOnclick({
    name: game.name,
    price: hasNumericPrice ? Number(game.price || 0) : parsePriceValue(priceText),
    priceLabel: game.priceLabel || (!hasNumericPrice && priceText ? priceText : ''),
    img: detailGallery.images[0] || game.img,
    icon: iconText,
    kind: game.kind || 'item',
    platform: game.platform || null,
    section: game.section || game.category || null,
    condition: game.condition || ''
  });

  // Check if this item is favorited
  const favLookup = getFavoriteLookup();
  const isFav = favLookup.has(`${game.name}::${game.platform || ''}`);

  const trailerAction = game.trailer
    ? `<button class="image-card-trailer" onclick="openTrailerFromEncoded('${encodeOnclick({ id: game.trailer, title: game.name, provider: game.trailerProvider || 'youtube' })}'); event.stopPropagation();">${PLAY_BIG_SVG} مشاهدة التريلر</button>`
    : '';

  const addAction = game.canAdd !== false && (hasNumericPrice || game.priceLabel || game.addable)
    ? `<button class="image-card-add" onclick="addGameToCartFromEncoded('${cartData}', this); event.stopPropagation();">${CART_BIG_SVG} أضف للسلة</button>`
    : '';

  const detailDataForFav = encodeOnclick({
    name: game.name,
    price: hasNumericPrice ? Number(game.price || 0) : 0,
    priceLabel: game.priceLabel || '',
    img: detailGallery.images[0] || game.img,
    icon: iconText,
    kind: game.kind || 'item',
    platform: game.platform || null,
    condition: game.condition || ''
  });

  box.innerHTML = `
    <button class="game-detail-close" onclick="closeGameDetails()">×</button>
    <div class="game-detail-cover${game.img ? '' : ' no-image'}${detailGallery.images.length > 1 ? ' has-gallery' : ''}">
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
        <button class="favorite-btn${isFav ? ' active' : ''}" onclick="toggleFavorite(this, '${detailDataForFav}'); event.stopPropagation();" title="${isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">${HEART_ICON_SVG}</button>
        ${trailerAction}
        ${addAction}
      </div>
    </div>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeGameDetails(event) {
  if (event && event.target.id !== 'game-detail-modal') return;
  const modal = document.getElementById('game-detail-modal');
  const box = document.getElementById('game-detail-box');
  if (!modal || !box) return;
  modal.classList.remove('active');
  box.innerHTML = '';
  if (!document.getElementById('trailer-modal')?.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}
