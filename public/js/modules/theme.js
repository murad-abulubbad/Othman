// ═══════════════════════════════════════════════════════════════════
//  THEME MODULE
//  Dark / Light mode toggle with localStorage persistence.
// ═══════════════════════════════════════════════════════════════════

const THEME_KEY = 'ofg_theme';

function applyTheme(theme) {
  const html = document.documentElement;
  const btn  = document.getElementById('theme-toggle-btn');
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
    if (btn) btn.textContent = '☀️';
  } else {
    html.removeAttribute('data-theme');
    if (btn) btn.textContent = '🌙';
  }
}

export function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// Apply theme (data-theme attr already set by inline head script)
// Just update the button icon once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
  });
} else {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}
