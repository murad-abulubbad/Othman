// ═══════════════════════════════════════════════════════════════════
//  OTHMAN FOR GAMING — App entry point
//
//  Loads every module, wires the inline-onclick globals, and kicks
//  off Firestore subscriptions. Order matters: cart UI is updated
//  BEFORE Firestore data arrives so the cart badge is correct on
//  first paint.
// ═══════════════════════════════════════════════════════════════════

import {
  addToCart, removeFromCart, increaseQty, decreaseQty,
  addGameToCartFromEncoded, openCart, closeCart,
  sendCartToWhatsApp, updateCartUI
} from './modules/cart.js';

import {
  toggleFavorite, removeFavorite, renderFavorites,
  updateFavoriteButtons, updateFavoriteBadge,
  toggleFavoriteSidebar, closeFavoriteSidebar, goToFavoriteItem
} from './modules/favorites.js';

import {
  renderGameGrid, openGameDetails, closeGameDetails, showDetailImage
} from './modules/products.js';

import {
  openTrailer, openTrailerFromEncoded, closeTrailer
} from './modules/trailer.js';

import {
  navigateToPage, applyPendingDeepLink, initRouterModule
} from './modules/router.js';

import { initNavbar } from './modules/navbar.js';

import {
  generateBgSymbols, initStatsCounter, watchPrices,
  initRevealObserver, initDesktopEffects, initTickerVisibility
} from './modules/effects.js';

import { startFirestoreLoader } from './modules/firestore.js';

// ── Expose all functions used by inline onclick handlers ────────────
// Inline onclick="..." in HTML reads from the global scope. ES modules
// have their own scope, so we explicitly bridge each one to window.
Object.assign(window, {
  // Cart
  addToCart,
  removeFromCart,
  increaseQty,
  decreaseQty,
  addGameToCartFromEncoded,
  openCart,
  closeCart,
  sendCartToWhatsApp,

  // Favorites
  toggleFavorite,
  removeFavorite,
  toggleFavoriteSidebar,
  closeFavoriteSidebar,
  goToFavoriteItem,

  // Products / details
  openGameDetails,
  closeGameDetails,
  showDetailImage,
  renderGameGrid, // exposed so admin tools can re-render if needed

  // Trailer
  openTrailer,
  openTrailerFromEncoded,
  closeTrailer,

  // Router
  navigateToPage,
  _applyPendingDeepLink: applyPendingDeepLink
});

// ── Boot sequence ──────────────────────────────────────────────────
//
// Ordered for fastest perceived load:
//   HOT  (sync, blocks first paint) — cart/favorites badges, router
//   WARM (rAF after first paint)    — Firestore subscription, navbar
//   COLD (requestIdleCallback)      — decorative effects, stats counter
//
// `requestIdleCallback` schedules work only when the browser is idle,
// so it never competes with scrolling or input handling. Falls back
// to `setTimeout(0)` on Safari < 16.
const idle = window.requestIdleCallback
  || ((cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1));

function boot() {
  // ── HOT: blocking work the user sees instantly ────────────────
  initRouterModule();      // wire anchor clicks + popstate
  updateCartUI();          // cart badge from localStorage
  renderFavorites();       // favorites count from localStorage
  updateFavoriteButtons();
  updateFavoriteBadge();

  // ── WARM: run after first paint ───────────────────────────────
  requestAnimationFrame(() => {
    initNavbar();           // scroll listener (passive)
    startFirestoreLoader(); // subscribe to Categories + Items
    hideLoader();           // fade out the splash
  });

  // ── COLD: decorative + nice-to-have, never blocks input ──────
  idle(() => {
    initRevealObserver();   // reveal cards as they scroll into view
    watchPrices();          // animate prices on first view
    initStatsCounter();     // animate stat numbers once
    initDesktopEffects();   // ripple + PS particles (desktop only)
    generateBgSymbols();    // floating PS symbols (skipped on mobile)
    initTickerVisibility(); // pause ticker animation when off-screen
  }, { timeout: 2000 });
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  const hide = () => loader.classList.add('hidden');
  if (document.readyState === 'complete') {
    setTimeout(hide, 800);
  } else {
    window.addEventListener('load', () => setTimeout(hide, 800));
  }
  // Safety net.
  setTimeout(hide, 4000);
}

// ── Service worker registration ────────────────────────────────────
if ('serviceWorker' in navigator) {
  // Don't block app init — register after the first paint.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(() => { /* silent: app works fine without SW */ });
  });
}

// ── DOM ready ──────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
