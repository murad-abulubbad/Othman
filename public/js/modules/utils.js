// ═══════════════════════════════════════════════════════════════════
//  UTILS MODULE
//  Pure helpers — no side effects, no DOM mutation
// ═══════════════════════════════════════════════════════════════════

const HTML_ESCAPE_MAP = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch]);
}

// Convert Arabic/Persian digits then parse the first number found.
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function parsePriceValue(priceText) {
  const normalized = String(priceText || '').replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

// Extract a YouTube video ID from a watch / embed / short URL or raw ID.
export function extractYouTubeId(url) {
  if (!url) return '';
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return url;
}

// Encode a JS value as a safe `onclick="fn('...')"` payload.
export function encodeOnclick(value) {
  return encodeURIComponent(JSON.stringify(value)).replace(/'/g, '%27');
}

export function decodeOnclick(encoded) {
  try { return JSON.parse(decodeURIComponent(encoded)); }
  catch { return null; }
}

// Cloudinary image optimizer — adds `c_fit,w_X,q_85,f_auto/` transforms.
export function optimizeCloudinaryUrl(url, width = 300) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  if (url.includes('/q_') || url.includes('/f_auto')) return url;
  return url.replace('/image/upload/', `/image/upload/c_fit,w_${width},q_85,f_auto/`);
}

// Build a stable image-key for the global itemImagesMap.
export function buildImageKey(name, mainImg) {
  return name + '_' + (mainImg || '').slice(-20);
}
