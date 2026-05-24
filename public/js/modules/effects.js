// ═══════════════════════════════════════════════════════════════════
//  EFFECTS MODULE
//  Lightweight visual flourishes.
//  - background floating symbols
//  - stats counter animation (one-shot)
//  - price counter animation (one-shot)
//  - click ripple + PlayStation particles (DESKTOP ONLY)
// ═══════════════════════════════════════════════════════════════════

import { IS_TOUCH, IS_MOBILE } from './state.js';

// ── 1. Background PS symbols ────────────────────────────────────────

const BG_SYMBOL_VARIANTS = [
  { ch: '✕', cls: 's-x' },
  { ch: '○', cls: 's-circle' },
  { ch: '□', cls: 's-square' },
  { ch: '△', cls: 's-triangle' }
];

export function generateBgSymbols() {
  const wrap = document.getElementById('bg-symbols');
  if (!wrap) return;
  // On mobile we don't spawn any moving symbols — they cost a continuous
  // composite layer. Desktop gets the full effect.
  if (IS_MOBILE) return;

  const total = 12;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < total; i++) {
    const v = BG_SYMBOL_VARIANTS[Math.floor(Math.random() * BG_SYMBOL_VARIANTS.length)];
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
    frag.appendChild(el);
  }
  wrap.appendChild(frag);
}

// ── Ticker pause / resume ─────────────────────────────────────────
// The news ticker uses a CSS `tickerScroll` animation that runs forever.
// When the ticker scrolls off-screen we pause it (zero compositor work)
// and resume it when it comes back. The same trick applies to the price
// pulse and any other infinite animations.
let _tickerIO = null;
let _tickerVisibilityHandler = null;
export function initTickerVisibility() {
  const tickerTrack = document.getElementById('news-ticker-track');
  if (!tickerTrack) return;
  const tickerWrap = document.getElementById('news-ticker-wrap');
  if (!tickerWrap) return;

  // Replace any previous observer so we don't leak listeners across re-renders.
  if (_tickerIO) _tickerIO.disconnect();
  _tickerIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      tickerTrack.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
    });
  }, { threshold: 0.01 });
  _tickerIO.observe(tickerWrap);

  // Pause when tab is hidden — battery + CPU win on backgrounded tabs.
  if (_tickerVisibilityHandler) {
    document.removeEventListener('visibilitychange', _tickerVisibilityHandler);
  }
  _tickerVisibilityHandler = () => {
    tickerTrack.style.animationPlayState = document.hidden ? 'paused' : 'running';
  };
  document.addEventListener('visibilitychange', _tickerVisibilityHandler);
}

// ── 2. Stats counter ────────────────────────────────────────────────

export function initStatsCounter() {
  const statsSection = document.querySelector('.stats-section');
  if (!statsSection) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.stat-number').forEach(el => {
        const target = parseInt(el.dataset.target, 10) || 0;
        const duration = 1000;
        const start = performance.now();
        function tick(now) {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(eased * target).toLocaleString('ar');
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      obs.disconnect();
    });
  }, { threshold: 0.5 });

  observer.observe(statsSection);
}

// ── 3. Price counter on in-view ─────────────────────────────────────

function animatePrice(el) {
  if (!el || el.dataset.animating === '1') return;
  const newPriceEl = el.querySelector('.price-new');
  const targetEl = newPriceEl || el;
  if (!targetEl.dataset.targetPrice) {
    const raw = (targetEl.textContent || '').trim();
    const match = raw.match(/\d+(?:\.\d+)?/);
    if (!match) return;
    targetEl.dataset.targetPrice = match[0];
  }
  const target = parseFloat(targetEl.dataset.targetPrice);
  if (Number.isNaN(target)) return;
  const hasJOD = !newPriceEl && (el.textContent || '').includes('JOD');
  el.dataset.animating = '1';
  const duration = 1100;
  const start = performance.now();
  (function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = eased * target;
    targetEl.textContent = (target % 1 === 0 ? Math.round(v) : v.toFixed(2)) + (hasJOD ? ' JOD' : '');
    if (t < 1) requestAnimationFrame(tick);
    else el.dataset.animating = '0';
  })(performance.now());
}

let _priceObserver = null;
export function watchPrices(root = document) {
  if (!_priceObserver) {
    _priceObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) animatePrice(e.target);
      });
    }, { threshold: 0.4 });
  }
  root.querySelectorAll('.image-card-price').forEach(el => _priceObserver.observe(el));
}

// ── 4. Scroll reveal observer ───────────────────────────────────────

export function initRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, {
    threshold: IS_TOUCH ? 0.15 : 0.1,
    rootMargin: '60px'
  });

  // Initial reveal targets — Firestore loader observes new cards too.
  const selector = '.section-title, .section-line, .section-nav-card, .image-card';
  document.querySelectorAll(selector).forEach((el, i) => {
    el.style.transitionDelay = ((i % 6) * 0.08) + 's';
    observer.observe(el);
  });

  // Expose so firestore loader can attach newly-rendered nodes.
  window._scrollRevealObserver = observer;
}

// ── 5. Click ripple + PS particles (DESKTOP ONLY) ───────────────────

const RIPPLE_BTN_SELECTOR = '.btn-red, .btn-blue, .add-btn, .image-card-add, .image-card-trailer, .cart-checkout-btn, .nav-cart-btn';

function spawnRipple(e) {
  const btn = e.target.closest(RIPPLE_BTN_SELECTOR);
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
}

// PlayStation symbol particles on click (extracted from old click-particles.js).
const PS_BUTTONS = [
  { symbol: '△', color: '#00d96b', glow: '0 0 6px #00d96b, 0 0 14px rgba(0,217,107,.7), 0 0 22px rgba(0,217,107,.4)' },
  { symbol: '◯', color: '#ff3b5c', glow: '0 0 6px #ff3b5c, 0 0 14px rgba(255,59,92,.7), 0 0 22px rgba(255,59,92,.4)' },
  { symbol: '✕', color: '#3a8cff', glow: '0 0 6px #3a8cff, 0 0 14px rgba(58,140,255,.7), 0 0 22px rgba(58,140,255,.4)' },
  { symbol: '□', color: '#e85aff', glow: '0 0 6px #e85aff, 0 0 14px rgba(232,90,255,.7), 0 0 22px rgba(232,90,255,.4)' }
];

let _particleContainer = null;
let _lastBurst = 0;

function ensureParticleStyles() {
  if (document.getElementById('ps-particle-styles')) return;
  const style = document.createElement('style');
  style.id = 'ps-particle-styles';
  style.textContent = `
    .ps-particle {
      position: fixed; pointer-events: none; z-index: 999999;
      font-weight: 900; will-change: transform, opacity;
      user-select: none; font-family: Arial, sans-serif;
      filter: blur(.3px); transform: translate(-50%, -50%);
      animation: ps-float-particle var(--duration, 1200ms) cubic-bezier(.2,.7,.3,1) forwards;
    }
    @keyframes ps-float-particle {
      0%   { opacity: 0; transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(.4); }
      15%  { opacity: 1; transform: translate(-50%, -50%) translate(calc(var(--tx) * .25), calc(var(--ty) * .25)) rotate(calc(var(--rot) * .25)) scale(1.1); }
      100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(.6); }
    }
    @media (prefers-reduced-motion: reduce) { .ps-particle { display: none !important; } }`;
  document.head.appendChild(style);
}

function spawnPSParticle(x, y) {
  if (!_particleContainer) {
    _particleContainer = document.createElement('div');
    _particleContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999999;';
    _particleContainer.id = 'ps-particle-container';
    document.body.appendChild(_particleContainer);
  }
  const particle = document.createElement('span');
  particle.className = 'ps-particle';
  const button = PS_BUTTONS[Math.floor(Math.random() * PS_BUTTONS.length)];
  particle.textContent = button.symbol;
  const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 0.9;
  const distance = 40 + Math.random() * 60;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance - (15 + Math.random() * 25);
  const rotation = (Math.random() - 0.5) * 360;
  const fontSize = 11 + Math.random() * 8;
  const duration = 800 + Math.random() * 400;
  particle.style.cssText = `
    left: ${x}px; top: ${y}px;
    color: ${button.color}; text-shadow: ${button.glow};
    font-size: ${fontSize}px;
    --tx: ${tx}px; --ty: ${ty}px; --rot: ${rotation}deg; --duration: ${duration}ms;`;
  _particleContainer.appendChild(particle);
  setTimeout(() => particle.remove(), duration + 50);
}

function clickBurst(x, y) {
  const now = Date.now();
  if (now - _lastBurst < 50) return;
  _lastBurst = now;
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    setTimeout(() => spawnPSParticle(x, y), i * 30);
  }
}

export function initDesktopEffects() {
  if (IS_TOUCH) return;
  ensureParticleStyles();
  document.addEventListener('click', (e) => {
    spawnRipple(e);
    clickBurst(e.clientX, e.clientY);
  }, { passive: true });
}
