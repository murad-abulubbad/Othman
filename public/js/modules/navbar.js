// ═══════════════════════════════════════════════════════════════════
//  NAVBAR MODULE
//  Shrink the navbar on scroll (throttled with rAF).
// ═══════════════════════════════════════════════════════════════════

export function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      navbar.classList.toggle('shrunk', window.scrollY > 80);
      ticking = false;
    });
  }, { passive: true });
}
