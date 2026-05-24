// ═══════════════════════════════════════════════════════════════════
//  ROUTER MODULE
//  Page-as-page navigation. Each section becomes its own "page".
// ═══════════════════════════════════════════════════════════════════

import { PAGE_TITLES, PAGE_IDS, catPageTitles, setPendingDeepLink } from './state.js';

// 3-color cycle for the page-transition logo (Nintendo red / Xbox green / PS blue).
const TRANS_TITLE_COLORS = [
  { name: 'red',   c: '#D6002A' },
  { name: 'green', c: '#00B83A' },
  { name: 'blue',  c: '#1E6FE6' }
];

let _pageTransitionLock = false;
let _transColorIdx = 0;

// Reveal cards inside the page that just became active.
// Skip the forced reflow + per-card setTimeout chain (was burning CPU
// during the page transition). content-visibility already gates layout.
function revealCardsIn(target) {
  if (!target) return;
  target.querySelectorAll('.section-title, .section-line, .image-card').forEach(el => {
    el.classList.add('visible');
  });
}

export function navigateToPage(pageId, push = true) {
  if (_pageTransitionLock) return;

  const isDynCat = pageId.startsWith('cat-');
  if (pageId !== 'home' && !PAGE_IDS.includes(pageId) && !isDynCat) pageId = 'home';

  const overlay = document.getElementById('page-transition');
  const transLogo = overlay?.querySelector('.trans-logo');
  if (transLogo) {
    transLogo.textContent = PAGE_TITLES[pageId] || catPageTitles[pageId] || 'O.F.G';
  }

  if (overlay) {
    const pick = TRANS_TITLE_COLORS[_transColorIdx % TRANS_TITLE_COLORS.length];
    _transColorIdx++;
    overlay.style.setProperty('--trans-title-color', pick.c);
    overlay.dataset.titleColor = pick.name;
  }

  _pageTransitionLock = true;

  // Lock scroll during transition
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  // Phase 1 — slide bars in (CSS handles the animation).
  overlay?.classList.remove('exit');
  overlay?.classList.add('show');

  // Phase 2 — swap content while the overlay covers the screen.
  // Timing: 1100ms (matches the slowed CSS transition for better visibility).
  setTimeout(() => {
    if (pageId === 'home') {
      document.body.classList.remove('in-page-mode');
      document.querySelectorAll('section.page-active').forEach(s => s.classList.remove('page-active'));
    } else {
      document.body.classList.add('in-page-mode');
      // Only touch the previous active section + the new one (avoids
      // a full-document querySelectorAll mutation under the overlay).
      document.querySelectorAll('section.page-active').forEach(s => s.classList.remove('page-active'));
      const next = document.getElementById(pageId);
      if (next) {
        next.classList.add('page-active');
        revealCardsIn(next);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }

    if (push) {
      const newHash = pageId === 'home' ? ' ' : '#' + pageId;
      if (location.hash !== newHash && !(pageId === 'home' && !location.hash)) {
        history.pushState({ page: pageId }, '', pageId === 'home' ? location.pathname : '#' + pageId);
      }
    }

    // Phase 3 — bars exit (CSS handles the slide-out).
    overlay?.classList.add('exit');
    setTimeout(() => {
      overlay?.classList.remove('show', 'exit');
      // Restore scroll after transition completes
      document.body.style.overflow = originalOverflow;
      _pageTransitionLock = false;
    }, 900);  // matches CSS exit transition (0.8s + buffer)
  }, 1100);    // matches CSS show transition (0.8s + max delay 0.3s)
}

// ── Intercept internal anchor clicks ───────────────────────────────
function onAnchorClick(e) {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href').slice(1);
  const target = href || 'home';
  if (target === 'home' || PAGE_IDS.includes(target) || target.startsWith('cat-')) {
    e.preventDefault();
    // Visual tap feedback for section nav cards
    if (link.classList.contains('section-nav-card')) {
      link.classList.add('tapped');
      setTimeout(() => link.classList.remove('tapped'), 600);
    }
    navigateToPage(target);
  } else if (target === 'sections') {
    e.preventDefault();
    if (document.body.classList.contains('in-page-mode')) {
      navigateToPage('home');
      setTimeout(() => document.getElementById('sections')?.scrollIntoView({ behavior: 'smooth' }), 1600);
    } else {
      document.getElementById('sections')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function onPopState() {
  const target = location.hash.replace('#', '') || 'home';
  navigateToPage(target, false);
}

// ── Initial deep-link handling ─────────────────────────────────────
function initRouter() {
  const initial = location.hash.replace('#', '') || 'home';
  if (initial !== 'home' && (PAGE_IDS.includes(initial) || initial.startsWith('cat-'))) {
    setPendingDeepLink(initial);
    document.body.classList.add('in-page-mode');
  } else {
    document.body.classList.remove('in-page-mode');
  }
}

// Applies any pending deep-link once firestore-loader has rendered the page.
export function applyPendingDeepLink() {
  const id = window._pendingDeepLink;
  if (!id) return;
  window._pendingDeepLink = null;
  document.querySelectorAll('section').forEach(s => s.classList.toggle('page-active', s.id === id));
  const target = document.getElementById(id);
  if (target) {
    target.querySelectorAll('.section-title, .section-line').forEach(el => el.classList.add('visible'));
    target.querySelectorAll('.image-card').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), (i % 8) * 35);
    });
  }
}

export function initRouterModule() {
  initRouter();
  document.addEventListener('click', onAnchorClick);
  window.addEventListener('popstate', onPopState);
}
