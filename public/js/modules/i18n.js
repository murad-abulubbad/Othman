// ═══════════════════════════════════════════════════════════════════
//  i18n — Arabic / English UI translations
//  Usage: data-i18n="key" on any element.
//  Switching language: setLang('en') / setLang('ar')
// ═══════════════════════════════════════════════════════════════════

const LANG_KEY = 'ofg_lang';

const translations = {
  ar: {
    // Navbar
    'nav.cart':              'السلة',
    'nav.sections':          'الأقسام',
    // Cart sidebar
    'cart.title':            'سلة التسوق',
    'cart.empty':            'السلة فارغة',
    'cart.empty.sub':        'أضف منتجات من أي قسم',
    'cart.count':            'عدد المنتجات',
    'cart.total':            'المجموع الكلي',
    'cart.checkout':         'إرسال طلب',
    // Favorites
    'fav.title':             '❤ المفضلات',
    'fav.empty':             'لا توجد مفضلات بعد',
    'fav.empty.sub':         'اضغط على القلب لحفظ المنتجات',
    // Sidebar categories
    'sidebar.title':         'الأقسام',
    'sidebar.whatsapp':      'واتساب',
    // Hero
    'hero.badge':            'متجر الألعاب الأفضل في الأردن',
    'hero.sub':              'وجهتك الأولى لكل ما يتعلق بعالم الألعاب',
    'hero.sub2':             'أجهزة • ألعاب • إكسسوارات • صيانة',
    'hero.browse':           'تصفح الأقسام',
    'hero.follow':           'تابعنا على صفحاتنا',
    // Social popup
    'social.title':          'تابعنا على منصاتنا',
    'social.whatsapp':       'واتساب',
    'social.instagram':      'انستغرام',
    'social.facebook':       'فيسبوك',
    'social.tiktok':         'تيك توك',
    // Product card / modal
    'product.addcart':       'أضف للسلة',
    'product.addfav':        'المفضلة',
    'product.outofstock':    'نفد المخزون',
    'product.qty':           'الكمية',
    'product.condition':     'الحالة',
    'product.platform':      'المنصة',
    'product.desc':          'الوصف',
    'product.price.request': 'حسب الطلب',
    // Checkout
    'checkout.title':        'إتمام الطلب',
    'checkout.name':         'الاسم الكامل',
    'checkout.phone':        'رقم الهاتف',
    'checkout.address':      'العنوان',
    'checkout.note':         'ملاحظة',
    'checkout.submit':       'تأكيد الطلب',
    'checkout.delivery':     'طريقة الاستلام',
    'checkout.coupon':       'كود الخصم',
    'checkout.apply':        'تطبيق',
    // Orders / track
    'orders.title':          'طلباتي',
    'orders.track':          'تتبع الطلب',
    'orders.status.new':     'جديد',
    'orders.status.confirmed':'مؤكد',
    'orders.status.done':    'منجز',
    'orders.status.cancelled':'ملغي',
    // Stats
    'stats.games':           'لعبة في المخزون',
    'stats.years':           'سنوات خبرة',
    'stats.clients':         'عميل راضٍ',
    // Bottom buttons
    'btn.track':             'تتبع طلبك',
    'btn.install':           'حمّل التطبيق',
    // Filter
    'filter.search':         'بحث في',
    'filter.maxprice':       'أقصى سعر:',
    'filter.currency':       'دينار',
    'filter.condition.all':  'الحالة: الكل',
    'filter.genre.all':      'النوع: الكل',
    'filter.noresults':      'لا توجد منتجات مطابقة للبحث',
    // Social
    'social.youtube':        'يوتيوب',
    // Product cards
    'product.trailer':       'تريلر',
    'product.add':           'أضف',
    'product.watch.trailer': 'مشاهدة التريلر',
    'product.add.cart':      'أضف للسلة',
    'product.added':         'تمت إضافة',
    'product.cond.used':     'مستعمل',
    'product.cond.new':      'جديد',
    'product.cond.all':      'الكل',
    // Ticker
    'ticker.new':            'وصل حديثاً',
    // Sections heading
    'sections.title':        'تصفح الأقسام',
    // Back home
    'btn.backhome':          '← العودة للرئيسية',
    // Social names in popup
    'social.wa.name':        'واتساب',
    'social.ig.name':        'انستغرام',
    'social.fb.name':        'فيسبوك',
    'social.yt.name':        'يوتيوب',
    // Lang toggle
    'lang.toggle':           'EN',
  },
  en: {
    // Navbar
    'nav.cart':              'Cart',
    'nav.sections':          'Sections',
    // Cart sidebar
    'cart.title':            'Shopping Cart',
    'cart.empty':            'Cart is empty',
    'cart.empty.sub':        'Add products from any section',
    'cart.count':            'Items',
    'cart.total':            'Total',
    'cart.checkout':         'Place Order',
    // Favorites
    'fav.title':             '❤ Favorites',
    'fav.empty':             'No favorites yet',
    'fav.empty.sub':         'Tap the heart to save products',
    // Sidebar categories
    'sidebar.title':         'Sections',
    'sidebar.whatsapp':      'WhatsApp',
    // Hero
    'hero.badge':            "Jordan's Best Gaming Store",
    'hero.sub':              'Your #1 destination for everything gaming',
    'hero.sub2':             'Consoles • Games • Accessories • Repair',
    'hero.browse':           'Browse Sections',
    'hero.follow':           'Follow us',
    // Social popup
    'social.title':          'Follow Us',
    'social.whatsapp':       'WhatsApp',
    'social.instagram':      'Instagram',
    'social.facebook':       'Facebook',
    'social.tiktok':         'TikTok',
    // Product card / modal
    'product.addcart':       'Add to Cart',
    'product.addfav':        'Favorite',
    'product.outofstock':    'Out of Stock',
    'product.qty':           'Quantity',
    'product.condition':     'Condition',
    'product.platform':      'Platform',
    'product.desc':          'Description',
    'product.price.request': 'On Request',
    // Checkout
    'checkout.title':        'Checkout',
    'checkout.name':         'Full Name',
    'checkout.phone':        'Phone Number',
    'checkout.address':      'Address',
    'checkout.note':         'Note',
    'checkout.submit':       'Confirm Order',
    'checkout.delivery':     'Delivery Method',
    'checkout.coupon':       'Discount Code',
    'checkout.apply':        'Apply',
    // Orders / track
    'orders.title':          'My Orders',
    'orders.track':          'Track Order',
    'orders.status.new':     'New',
    'orders.status.confirmed':'Confirmed',
    'orders.status.done':    'Done',
    'orders.status.cancelled':'Cancelled',
    // Stats
    'stats.games':           'Games in Stock',
    'stats.years':           'Years Experience',
    'stats.clients':         'Happy Clients',
    // Bottom buttons
    'btn.track':             'Track Order',
    'btn.install':           'Install App',
    // Filter
    'filter.search':         'Search in',
    'filter.maxprice':       'Max Price:',
    'filter.currency':       'JOD',
    'filter.condition.all':  'Condition: All',
    'filter.genre.all':      'Genre: All',
    'filter.noresults':      'No matching products found',
    // Social
    'social.youtube':        'YouTube',
    // Product cards
    'product.trailer':       'Trailer',
    'product.add':           'Add',
    'product.watch.trailer': 'Watch Trailer',
    'product.add.cart':      'Add to Cart',
    'product.added':         'Added',
    'product.cond.used':     'Used',
    'product.cond.new':      'New',
    'product.cond.all':      'All',
    // Ticker
    'ticker.new':            'New Arrivals',
    // Sections heading
    'sections.title':        'Browse Sections',
    // Back home
    'btn.backhome':          '← Back to Home',
    // Social names in popup
    'social.wa.name':        'WhatsApp',
    'social.ig.name':        'Instagram',
    'social.fb.name':        'Facebook',
    'social.yt.name':        'YouTube',
    // Lang toggle
    'lang.toggle':           'ع',
  }
};

// ── Current language ────────────────────────────────────────────────
let _lang = localStorage.getItem(LANG_KEY) || 'ar';

export function getLang() { return _lang; }

export function t(key) {
  return (translations[_lang] && translations[_lang][key]) || key;
}

// ── Apply translations to DOM ───────────────────────────────────────
export function applyTranslations() {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.dataset.i18nAttr === 'placeholder') {
      el.placeholder = val;
    } else if (el.querySelector('svg, img')) {
      // Element has child SVG/img — don't overwrite, skip
    } else {
      el.textContent = val;
    }
  });

  // Update toggle button text
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) btn.textContent = t('lang.toggle');
}

// ── Language change callbacks ────────────────────────────────────────
const _langChangeCallbacks = [];
export function onLangChange(fn) { _langChangeCallbacks.push(fn); }

// ── Switch language ─────────────────────────────────────────────────
export function setLang(lang) {
  _lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
  _langChangeCallbacks.forEach(fn => fn(lang));
}

export function toggleLang() {
  setLang(_lang === 'ar' ? 'en' : 'ar');
}

// Auto-apply on load
applyTranslations();
