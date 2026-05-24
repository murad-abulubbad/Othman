// ═══════════════════════════════════════════════════════════════════
//  TOAST MODULE
//  Bottom-right transient notifications.
// ═══════════════════════════════════════════════════════════════════

const CART_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.5-14h-2V2H0v2h1.5l2.7 5.59L3.25 12c-.16.28-.25.61-.25.96C3 14.1 3.9 15 5 15h14v-2H5.42c-.14 0-.25-.11-.25-.25l.03-.12L6.1 11H19c.75 0 1.41-.41 1.75-1.03L23.7 4H4.21l-.71-2H2.5z"/></svg>`;

let _hideTimer = null;

export function showToast(message, icon = '🛒', duration = 3000) {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-msg');
  if (!toast || !msg) return;
  msg.textContent = message;
  const iconEl = toast.querySelector('.toast-icon');
  if (iconEl) iconEl.textContent = icon;
  toast.classList.add('show');
  clearTimeout(_hideTimer);
  _hideTimer = setTimeout(() => {
    toast.classList.remove('show');
    // Restore the cart-svg icon after a "coming soon" style toast.
    setTimeout(() => {
      if (iconEl) iconEl.innerHTML = CART_ICON_SVG;
    }, 400);
  }, duration);
}

export function showCartToast(itemName) {
  showToast(`تمت إضافة "${itemName}"`, '🛒');
}
