// ═══════════════════════════════════════════════════════════════════
//  CART MODULE
//  Cart CRUD, sidebar UI, WhatsApp checkout.
//  UTF-8 ENCODING - v2
// ═══════════════════════════════════════════════════════════════════

import { cart, saveCart, PAGE_TITLES } from './state.js';
import { decodeOnclick } from './utils.js';
import { showCartToast, showToast } from './toast.js';

// ── Helpers ─────────────────────────────────────────────────────────

function getCurrentCartSection() {
  const activeSection = document.querySelector('section.page-active');
  const hashId = (location.hash || '').replace('#', '');
  const pageId = activeSection?.id || hashId;
  if (pageId && PAGE_TITLES[pageId]) return PAGE_TITLES[pageId];
  if (pageId && window._catPageTitles?.[pageId]) return window._catPageTitles[pageId];
  return 'الرئيسية';
}

// ── Mutations ───────────────────────────────────────────────────────

export function addToCart(arg1, price, icon) {
  const item = (typeof arg1 === 'object' && arg1 !== null)
    ? arg1
    : { name: arg1, price, icon };
  const itemSection = item.section || getCurrentCartSection();
  const itemPlatform = item.platform || null;
  const itemCondition = item.condition || null;
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
      price: parseFloat(item.price) || 0,
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
  saveCart();
  updateCartUI();
  showCartToast(item.name);
}

export function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

export function increaseQty(index) {
  if (!cart[index]) return;
  cart[index].qty = (cart[index].qty || 1) + 1;
  saveCart();
  updateCartUI();
}

export function decreaseQty(index) {
  if (!cart[index]) return;
  const currentQty = cart[index].qty || 1;
  if (currentQty <= 1) cart.splice(index, 1);
  else cart[index].qty = currentQty - 1;
  saveCart();
  updateCartUI();
}

// ── Bridge for buttons rendered via inline onclick ───────────────
export function addGameToCartFromEncoded(encodedItem, button) {
  const item = decodeOnclick(encodedItem);
  if (!item) return;
  addToCart(item);
  if (button) {
    button.classList.add('just-added');
    setTimeout(() => button.classList.remove('just-added'), 350);
  }
}

// ── Sidebar visibility ──────────────────────────────────────────────

export function openCart() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('active');
}

export function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('active');
}

// ── Render ─────────────────────────────────────────────────────────

const EMPTY_CART_HTML = `
  <div class="cart-empty">
    <span class="cart-empty-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
    </span>
    <p>السلة فارغة</p>
    <p style="font-size:0.8rem;margin-top:8px;color:rgba(255,255,255,0.3)">أضف منتجات من أي قسم</p>
  </div>`;

const CART_ITEM_FALLBACK_SVG = `<span class="cart-item-icon"><svg width='24' height='24' viewBox='0 0 24 24' fill='rgba(255,255,255,0.3)'><path d='M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/></svg></span>`;

export function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const hasPriceRequest = cart.some(i => i.priceLabel);

  const navCount = document.getElementById('nav-cart-count');
  if (navCount) navCount.textContent = count;

  const list = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-footer');
  if (!list || !footer) return;

  if (cart.length === 0) {
    list.innerHTML = EMPTY_CART_HTML;
    footer.style.display = 'none';
    return;
  }

  list.innerHTML = cart.map((item, i) => {
    const visual = item.img
      ? `<img class="cart-item-img" src="${item.img}" alt="${item.name}" onerror="this.style.display='none'"/>`
      : CART_ITEM_FALLBACK_SVG;
    const platformBadge = item.platform
      ? `<span style="font-family:'Orbitron',monospace;font-size:0.55rem;background:rgba(204,0,0,0.2);color:#ff8080;padding:2px 6px;border-radius:8px;margin-right:6px;letter-spacing:1px;">${item.platform}</span>`
      : '';
    const sectionName = item.section || item.platform || 'غير محدد';
    const conditionColor = item.condition === 'جديد' ? '#00d65a' : '#ffb366';
    const conditionBadge = item.condition
      ? `<div style="font-size:0.72rem;color:${conditionColor};margin-top:3px;">الحالة: ${item.condition}</div>`
      : '';
    return `
      <div class="cart-item">
        ${visual}
        <div class="cart-item-info">
          <div class="cart-item-name">${platformBadge}${item.name}</div>
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.45);margin-top:4px;">القسم: ${sectionName}</div>
          ${conditionBadge}
          <div class="cart-item-price">${item.priceLabel || `${(item.price * (item.qty || 1)).toFixed(2)} JOD`}</div>
        </div>
        <div class="cart-item-actions">
          <button class="cart-qty-btn" onclick="decreaseQty(${i})">−</button>
          <span class="cart-qty-num">${item.qty || 1}</span>
          <button class="cart-qty-btn" onclick="increaseQty(${i})">+</button>
        </div>
      </div>`;
  }).join('');

  const cartCountEl = document.getElementById('cart-count');
  const cartTotalEl = document.getElementById('cart-total');
  if (cartCountEl) cartCountEl.textContent = count;
  if (cartTotalEl) cartTotalEl.textContent = hasPriceRequest ? `${total.toFixed(2)}+` : total.toFixed(2);
  footer.style.display = 'block';
}

// ── WhatsApp checkout ──────────────────────────────────────────────

// Symbols for WhatsApp messages (using text for compatibility)
const EMOJI = {
  game: "[GAME]",
  sparkle: "*",
  wave: "",
  product: "",
  qty: "Qty:",
  price: "",
  box: "",
  money: "Total:",
  check: "[✓]",
  truck: "",
  heart: "<3"
};

function formatLinePrice(item, lineTotal) {
  if (item.priceLabel && item.originalPrice && item.discountPrice) {
    return `~${item.originalPrice}~ ${item.discountPrice} JOD`;
  }
  if (item.priceLabel && item.originalPrice) {
    return `${item.originalPrice} JOD`;
  }
  return `${lineTotal.toFixed(2)} JOD`;
}

export function sendCartToWhatsApp() {
  if (!cart.length) {
    showToast('السلة فارغة', '🛒');
    return;
  }
  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const orderLines = cart.map((item, index) => {
    const qty = item.qty || 1;
    const lineTotal = item.price * qty;
    const platform = item.platform ? `\n   ${EMOJI.game} النوع: ${item.platform}` : '';
    const condition = item.condition ? `\n   ${EMOJI.check} الحالة: ${item.condition}` : '';
    const priceText = formatLinePrice(item, lineTotal);
    return `#${index + 1}
   ${EMOJI.product} المنتج: ${item.name}${platform}${condition}
   ${EMOJI.qty} الكمية: ${qty}
   ${EMOJI.price} السعر: ${priceText}`;
  }).join('\n────────────────\n');

  const message = `${EMOJI.game}${EMOJI.sparkle} طلب جديد من موقع Othman For Gaming ${EMOJI.sparkle}${EMOJI.game}

السلام عليكم ${EMOJI.wave}
حبيت أطلب المنتجات التالية:

────────────────
${orderLines}
────────────────

${EMOJI.box} عدد القطع: ${count}
${EMOJI.money} المجموع الكلي: ${total.toFixed(2)} JOD

${EMOJI.check} يرجى تأكيد توفر الطلب
${EMOJI.truck} وطريقة الاستلام أو التوصيل

شكراً لكم ${EMOJI.heart}`;

  // Use encodeURI for better emoji support in WhatsApp
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/962775560404?text=${encoded}`;
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
