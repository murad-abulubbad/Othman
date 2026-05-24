// ═══════════════════════════════════════════════════════════════════
//  FILTER MODULE
//  Per-category filter bar: search + price slider + condition + genre.
// ═══════════════════════════════════════════════════════════════════

import { renderGameGrid } from './products.js';

// Build filter bar HTML dynamically based on available genres and conditions
function buildFilterBarHtml(catId, catName, items) {
  // Get unique conditions and genres from items
  const conditions = new Set();
  const genres = new Set();
  
  items.forEach(item => {
    // Add condition
    if (item.condition) {
      conditions.add(item.condition);
    }
    // Add genres
    if (Array.isArray(item.genre)) {
      item.genre.forEach(g => genres.add(g));
    } else if (item.genre) {
      genres.add(item.genre);
    }
  });
  
  // Build condition options
  const conditionOptions = ['<div class="custom-option" data-value="">الكل</div>'];
  conditions.forEach(c => {
    conditionOptions.push(`<div class="custom-option" data-value="${c}">${c}</div>`);
  });
  
  // Build genre options dynamically - only show genres that exist in items
  const genreOptions = ['<div class="custom-option" data-value="">الكل</div>'];
  const genreLabels = {
    'أكشن': 'أكشن',
    'طخطخه': 'طخطخه',
    'سولز': 'سولز',
    'استراتيجية': 'استراتيجية',
    'سيارات': 'سيارات',
    'رعب': 'رعب',
    'جماعية': 'جماعية',
    'VR': 'VR',
    'عالم مفتوح': 'عالم مفتوح',
    'رياضة': 'رياضة',
    'قتال': 'قتال'
  };
  genres.forEach(g => {
    const label = genreLabels[g] || g;
    genreOptions.push(`<div class="custom-option" data-value="${g}">${label}</div>`);
  });
  
  // Hide dropdowns if no options available
  const conditionDisplay = conditions.size > 0 ? '' : 'style="display:none"';
  const genreDisplay = genres.size > 0 ? '' : 'style="display:none"';
  
  return `
  <div class="cat-filter-bar" id="filter-cat-${catId}">
    <div class="cat-filter-row">
      <input type="text" class="cat-filter-search" placeholder="بحث في ${catName}..." data-cat="${catId}">
      <div class="cat-filter-price">
        <span>أقصى سعر:</span>
        <input type="range" class="cat-filter-slider" min="0" max="100" value="100" data-cat="${catId}">
        <span class="price-value">100 دينار</span>
      </div>
      <div class="cat-filter-selects-row">
        <div class="custom-select-wrap" data-type="condition" data-cat="${catId}" ${conditionDisplay}>
          <button class="custom-select-btn cat-filter-condition" data-cat="${catId}" data-value="">الحالة: الكل ▾</button>
          <div class="custom-select-dropdown">
            ${conditionOptions.join('')}
          </div>
        </div>
        <div class="custom-select-wrap" data-type="genre" data-cat="${catId}" ${genreDisplay}>
          <button class="custom-select-btn cat-filter-genre" data-cat="${catId}" data-value="">النوع: الكل ▾</button>
          <div class="custom-select-dropdown">
            ${genreOptions.join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export { buildFilterBarHtml };

// ── Per-category filter setup ───────────────────────────────────────

export function setupCategoryFilter(catId, catName, items, color) {
  const searchInput = document.querySelector(`.cat-filter-search[data-cat="${catId}"]`);
  if (!searchInput) return;
  const priceSlider = document.querySelector(`.cat-filter-slider[data-cat="${catId}"]`);
  const priceValue = document.querySelector(`#filter-cat-${catId} .price-value`);

  let conditionVal = '';
  let genreVal = '';
  let searchTimer = null;
  let sliderFrame = 0;

  // Configure slider based on actual price range.
  if (priceSlider) {
    const maxItemPrice = Math.max(...items.map(i => i.price || i.originalPrice || 0), 10);
    const sliderMax = Math.ceil(maxItemPrice / 5) * 5;
    priceSlider.max = sliderMax;
    priceSlider.value = sliderMax;
    if (priceValue) priceValue.textContent = `${sliderMax} دينار`;
  }

  function applyFilter() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const sliderVal = priceSlider ? parseInt(priceSlider.value, 10) : 999999;
    const sliderMax = priceSlider ? parseInt(priceSlider.max, 10) : 999999;
    const filterByPrice = sliderVal < sliderMax;

    const filtered = items.filter(item => {
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm);
      const itemPrice = item.price || item.originalPrice || 0;
      const matchesPrice = !filterByPrice || itemPrice <= sliderVal;
      const matchesCondition = !conditionVal || (item.condition || 'مستعمل') === conditionVal;
      const itemGenres = Array.isArray(item.genre)
        ? item.genre
        : (item.genre ? [item.genre] : []);
      const matchesGenre = !genreVal || itemGenres.includes(genreVal);
      return matchesSearch && matchesPrice && matchesCondition && matchesGenre;
    });

    renderGameGrid(`grid-cat-${catId}`, filtered, catName, color);

    const grid = document.getElementById(`grid-cat-${catId}`);
    if (filtered.length === 0 && grid) {
      grid.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px; font-size: 0.9rem; grid-column: 1/-1;">لا توجد منتجات مطابقة للبحث</div>';
    }
  }

  if (priceSlider && priceValue) {
    priceSlider.addEventListener('input', () => {
      priceValue.textContent = `${priceSlider.value} دينار`;
      cancelAnimationFrame(sliderFrame);
      sliderFrame = requestAnimationFrame(applyFilter);
    });
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 120);
  });

  const filterBar = document.getElementById(`filter-cat-${catId}`);
  if (!filterBar) return;

  filterBar.querySelectorAll('.custom-select-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.custom-select-btn');
    const dropdown = wrap.querySelector('.custom-select-dropdown');
    const type = wrap.dataset.type;

    // Toggle dropdown on button click
    btn.onclick = function(e) {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      // Close all other dropdowns first
      document.querySelectorAll('.custom-select-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.previousElementSibling?.classList.remove('active');
      });
      // Toggle current
      if (!isOpen) {
        dropdown.classList.add('open');
        btn.classList.add('active');
        console.log('Dropdown opened for', type);
      } else {
        console.log('Dropdown closed for', type);
      }
    };

    // Handle option selection
    wrap.querySelectorAll('.custom-option').forEach(opt => {
      opt.onclick = function(e) {
        e.stopPropagation();
        const val = opt.dataset.value;
        const label = opt.textContent.trim();
        wrap.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        if (type === 'condition') {
          conditionVal = val;
          btn.textContent = val ? `${label} ▾` : 'الحالة: الكل ▾';
        } else {
          genreVal = val;
          btn.textContent = val ? `${label} ▾` : 'النوع: الكل ▾';
        }
        btn.classList.toggle('has-value', !!val);
        dropdown.classList.remove('open');
        btn.classList.remove('active');
        applyFilter();
        console.log('Selected', type, ':', val);
      };
    });
  });
}

// ── Single shared "close all dropdowns" handler ───────────────────
let _dropdownHandlerAttached = false;
export function attachDropdownCloseHandler() {
  if (_dropdownHandlerAttached) return;
  _dropdownHandlerAttached = true;
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target.closest('.custom-select-wrap')) return;
    document.querySelectorAll('.custom-select-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.previousElementSibling?.classList.remove('active');
    });
  });
}
