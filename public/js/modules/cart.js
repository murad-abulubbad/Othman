// ═══════════════════════════════════════════════════════════════════
//  CART MODULE
//  Cart CRUD, sidebar UI, WhatsApp checkout.
//  UTF-8 ENCODING - v2
// ═══════════════════════════════════════════════════════════════════

import { cart, saveCart, PAGE_TITLES } from './state.js';
import { decodeOnclick } from './utils.js';
import { showCartToast, showToast } from './toast.js';
import { t, onLangChange } from './i18n.js';
import { db } from '../../firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
  syncCartPricesWithFlash();
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('active');
}

function syncCartPricesWithFlash() {
  const allItems = Object.values(window._catItems || {}).flat();
  if (!allItems.length) return;
  const now = Date.now();
  let changed = false;
  cart.forEach(cartItem => {
    const src = allItems.find(i => i.name === cartItem.name);
    if (!src) return;
    const saleEndsAt = src.saleEndsAt ? Number(src.saleEndsAt) : 0;
    const isFlashActive = src.salePrice > 0 && saleEndsAt > now;
    const correctPrice = isFlashActive ? Number(src.salePrice) : Number(src.price);
    if (Math.abs(cartItem.price - correctPrice) > 0.001) {
      cartItem.price = correctPrice;
      changed = true;
    }
  });
  if (changed) saveCart();
}

export function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('active');
}

// ── Render ─────────────────────────────────────────────────────────

const emptyCartHtml = () => `
  <div class="cart-empty">
    <span class="cart-empty-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
    </span>
    <p>${t('cart.empty')}</p>
    <p style="font-size:0.8rem;margin-top:8px;color:rgba(255,255,255,0.3)">${t('cart.empty.sub')}</p>
  </div>`;

// Re-render cart list when language changes (so empty-state text updates)
onLangChange(() => {
  const list = document.getElementById('cart-items-list');
  if (list && cart.length === 0) list.innerHTML = emptyCartHtml();
});

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
    list.innerHTML = emptyCartHtml();
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
          ${platformBadge ? `<div style="margin-bottom:3px">${platformBadge}</div>` : ''}
          <div class="cart-item-name">${item.name}</div>
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.45);margin-top:4px;">القسم: ${sectionName}</div>
          ${conditionBadge}
          <div class="cart-item-price">${item.price > 0 ? `${(item.price * (item.qty || 1)).toFixed(2)} JOD` : (item.priceLabel || 'حسب الطلب')}</div>
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


// ── Order Modal (Firestore) ─────────────────────────────────────────

export function openOrderModal() {
  const overlay = document.getElementById('order-modal-overlay');
  const itemsEl = document.getElementById('order-modal-items');
  const errEl   = document.getElementById('order-modal-err');
  if (!overlay) return;

  if (errEl) errEl.textContent = '';
  const nameEl  = document.getElementById('order-name');
  const phoneEl = document.getElementById('order-phone');
  const addrEl  = document.getElementById('order-address');
  const noteEl  = document.getElementById('order-note');
  if (nameEl)  nameEl.value  = '';
  if (phoneEl) phoneEl.value = '';
  if (addrEl)  addrEl.value  = '';
  if (noteEl)  noteEl.value  = '';

  if (itemsEl) {
    const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
    itemsEl.innerHTML = cart.map(i => `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        ${i.img ? `<img src="${i.img}" style="width:32px;height:32px;object-fit:cover;border-radius:5px;flex-shrink:0" onerror="this.style.display='none'">` : ''}
        <span style="flex:1;color:#e2e8f0">${i.name}</span>
        <span style="color:rgba(255,255,255,.4)">×${i.qty || 1}</span>
        <span style="color:#60a5fa;font-weight:700">${(i.price * (i.qty || 1)).toFixed(2)} JOD</span>
      </div>
    `).join('') + `<div style="display:flex;justify-content:space-between;margin-top:9px;font-weight:700"><span>المجموع</span><span style="color:#fff">${total.toFixed(2)} JOD</span></div>`;
  }

  overlay.style.display = 'flex';
  if (nameEl) nameEl.focus();
}

export function closeOrderModal() {
  const overlay = document.getElementById('order-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

export async function submitOrder() {
  const nameEl   = document.getElementById('order-name');
  const phoneEl  = document.getElementById('order-phone');
  const addrEl   = document.getElementById('order-address');
  const noteEl   = document.getElementById('order-note');
  const errEl    = document.getElementById('order-modal-err');
  const submitBtn = document.getElementById('order-submit-btn');

  const customerName = nameEl?.value.trim() || '';
  const phone        = phoneEl?.value.trim() || '';
  const address      = addrEl?.value.trim() || '';
  const note         = noteEl?.value.trim() || '';

  if (errEl) errEl.textContent = '';
  if (!customerName) { if (errEl) errEl.textContent = 'الرجاء إدخال الاسم الكامل'; nameEl?.focus(); return; }
  if (!phone)        { if (errEl) errEl.textContent = 'الرجاء إدخال رقم الهاتف';   phoneEl?.focus(); return; }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ جاري الإرسال...'; }

  try {
    const orderItems = cart.map(i => ({
      name: i.name,
      price: i.price || 0,
      qty: i.qty || 1,
      imageUrl: i.img || '',
      condition: i.condition || '',
      platform: i.platform || ''
    }));
    const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);

    await addDoc(collection(db, 'Orders'), {
      customerName,
      phone,
      address,
      note,
      items: orderItems,
      total,
      status: 'جديد',
      createdAt: serverTimestamp()
    });

    closeOrderModal();
    cart.splice(0, cart.length);
    saveCart();
    updateCartUI();
    showToast('تم إرسال طلبك بنجاح! سنتواصل معك قريباً 🎮', '✅');
  } catch (err) {
    if (errEl) errEl.textContent = 'خطأ في إرسال الطلب: ' + err.message;
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✅ إرسال الطلب'; }
  }
}
