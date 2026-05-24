// ═══════════════════════════════════════════════════════════════════
//  STATE MODULE
//  Central store for cart, favorites cache, item images, deep-link, etc.
// ═══════════════════════════════════════════════════════════════════

// ── Cart (persisted in localStorage) ─────────────────────────
const CART_KEY = 'ofg-cart';

function readCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
}

export const cart = readCart();

export function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  catch (e) { /* storage full or denied — ignore */ }
}

// ── Favorites (persisted in localStorage) ─────────────────────
const FAV_KEY = 'othman_favorites';
let _favoritesCache = null;

export function getFavorites() {
  if (Array.isArray(_favoritesCache)) return _favoritesCache;
  try { _favoritesCache = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
  catch { _favoritesCache = []; }
  return _favoritesCache;
}

export function setFavorites(list) {
  _favoritesCache = list;
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); }
  catch (e) { /* ignore */ }
}

// ── Item images map (avoids encoding entire image arrays in onclick) ──
// Keys built from item name + last 20 chars of main image URL.
export const itemImagesMap = window._itemImagesMap = window._itemImagesMap || {};

// ── Category page titles (filled by firestore loader, used by router) ──
export const catPageTitles = window._catPageTitles = window._catPageTitles || {};

// ── Category items map (filled by firestore loader for filter) ──
export const catItems = window._catItems = window._catItems || {};

// ── Page router state ──
export const PAGE_TITLES = { home: 'الرئيسية' };
export const PAGE_IDS = []; // dynamic-cat pages are tracked via 'cat-' prefix

// Deep-link held from initial load until firestore renders
export function setPendingDeepLink(id) { window._pendingDeepLink = id; }
export function consumePendingDeepLink() {
  const id = window._pendingDeepLink;
  window._pendingDeepLink = null;
  return id;
}

// ── Detail-modal gallery state ──
export const detailGallery = {
  images: [],
  index: 0
};

// ── Device flags ──
export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
export const IS_MOBILE = window.innerWidth <= 768;
