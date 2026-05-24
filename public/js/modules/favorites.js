// ═══════════════════════════════════════════════════════════════════
//  FAVORITES MODULE
//  Wishlist CRUD + sidebar UI.
// ═══════════════════════════════════════════════════════════════════

import { getFavorites, setFavorites } from './state.js';
import { decodeOnclick, encodeOnclick, escapeHtml } from './utils.js';

const EMPTY_FAVORITES_HTML = `
  <div class="favorite-sidebar-empty">
    <div class="favorite-sidebar-empty-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
    </div>
    <p>لا توجد مفضلات بعد</p>
    <p style="font-size:0.85rem;margin-top:8px;">اضغط على القلب لحفظ المنتجات</p>
  </div>`;

const ADD_TO_CART_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z"/></svg>`;

// ── Lookups ─────────────────────────────────────────────────────────

export function getFavoriteLookup() {
  return new Set(getFavorites().map(f => `${f.name}::${f.platform || ''}`));
}

export function isFavorite(product) {
  return getFavorites().some(f => f.name === product.name && f.platform === product.platform);
}

// ── Mutations ───────────────────────────────────────────────────────

export function toggleFavorite(btn, productData) {
  const product = decodeOnclick(productData);
  if (!product) return;
  const favorites = getFavorites();
  const index = favorites.findIndex(f => f.name === product.name && f.platform === product.platform);
  const isAdding = index < 0;
  if (isAdding) {
    favorites.push(product);
  } else {
    favorites.splice(index, 1);
  }
  setFavorites(favorites);
  
  // Update ALL buttons for this product (including the clicked one) to keep state in sync
  if (btn) {
    btn.classList.toggle('active', isAdding);
    // Force blur to remove sticky :hover/:active on mobile touch
    btn.blur();
    // Force a reflow to ensure visual update on mobile
    void btn.offsetHeight;
  }
  
  // Sync all favorite buttons across the page
  updateFavoriteButtons();
  renderFavorites();
  updateFavoriteBadge();
}

export function removeFavorite(name, platform) {
  const favorites = getFavorites();
  const index = favorites.findIndex(f => f.name === name && f.platform === platform);
  if (index < 0) return;
  favorites.splice(index, 1);
  setFavorites(favorites);
  renderFavorites();
  updateFavoriteButtons();
  updateFavoriteBadge();
}

// ── UI updates ──────────────────────────────────────────────────────

export function updateFavoriteBadge() {
  const favorites = getFavorites();
  const badge = document.querySelector('.favorite-toggle-badge');
  if (!badge) return;
  badge.textContent = favorites.length;
  badge.style.display = favorites.length > 0 ? 'flex' : 'none';
}

export function updateFavoriteButtons() {
  const lookup = getFavoriteLookup();
  document.querySelectorAll('.image-card').forEach(card => {
    const btn = card.querySelector('.favorite-btn');
    if (!btn) return;
    const name = card.querySelector('.image-card-title')?.textContent;
    const platform = card.querySelector('.image-card-platform')?.textContent || '';
    if (name) {
      btn.classList.toggle('active', lookup.has(`${name}::${platform}`));
    }
  });
}

export function renderFavorites() {
  const favorites = getFavorites();
  const content = document.querySelector('.favorite-sidebar-content');
  if (!content) return;

  if (favorites.length === 0) {
    content.innerHTML = EMPTY_FAVORITES_HTML;
    return;
  }

  content.innerHTML = favorites.map(f => {
    const cartData = encodeOnclick({
      name: f.name, price: f.price || 0, priceLabel: f.priceLabel || '',
      img: f.img || '', icon: '', kind: f.kind || 'item',
      platform: f.platform || '', condition: f.condition || ''
    });
    const canAdd = f.price > 0 || f.priceLabel;
    const safeName = String(f.name).replace(/'/g, "\\'");
    const safePlatform = String(f.platform || '').replace(/'/g, "\\'");
    return `
    <div class="favorite-item">
      ${f.img ? `<img class="favorite-item-img" src="${escapeHtml(f.img)}" alt="${escapeHtml(f.name)}" onerror="this.style.display='none'"/>` : ''}
      <div class="favorite-item-info">
        <div class="favorite-item-name">${escapeHtml(f.name)}</div>
        ${f.price ? `<div class="favorite-item-price">${f.price} JOD</div>` : ''}
        ${f.platform ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-top:2px;">${escapeHtml(f.platform)}</div>` : ''}
        ${canAdd ? `<button class="image-card-add" style="margin-top:8px;width:100%;justify-content:center;" onclick="addGameToCartFromEncoded('${cartData}', this)">${ADD_TO_CART_SVG} أضف للسلة</button>` : ''}
      </div>
      <button class="favorite-item-remove" onclick="removeFavorite('${safeName}', '${safePlatform}')">✕</button>
    </div>`;
  }).join('');
}

// ── Sidebar visibility ──────────────────────────────────────────────

export function toggleFavoriteSidebar() {
  document.querySelector('.favorite-sidebar')?.classList.toggle('active');
}

export function closeFavoriteSidebar() {
  document.querySelector('.favorite-sidebar')?.classList.remove('active');
}

// ── Navigate-to-item from favorites list ───────────────────────────
export function goToFavoriteItem(name) {
  closeFavoriteSidebar();

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
  // Use the global router (avoids circular import).
  window.navigateToPage?.(targetSection.id);

  setTimeout(() => {
    if (!targetCard) return;
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetCard.style.transition = 'box-shadow 0.3s';
    targetCard.style.boxShadow = '0 0 35px rgba(0,255,136,0.8)';
    setTimeout(() => { targetCard.style.boxShadow = ''; }, 1800);
  }, 1400);
}
