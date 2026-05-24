// ═══════════════════════════════════════════════════════════════════
//  TRAILER MODULE
//  YouTube / Dailymotion embed modal.
// ═══════════════════════════════════════════════════════════════════

import { decodeOnclick, extractYouTubeId } from './utils.js';

const PLAY_SVG = `<svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor'><path d='M8 5v14l11-7z'/></svg>`;

export function openTrailerFromEncoded(encodedTrailer) {
  const trailer = decodeOnclick(encodedTrailer);
  if (!trailer) return;
  const cleanId = extractYouTubeId(trailer.id);
  openTrailer(cleanId, trailer.title, trailer.provider);
}

export function openTrailer(videoId, title, provider = 'youtube') {
  const modal = document.getElementById('trailer-modal');
  const frameWrap = document.getElementById('trailer-frame-wrap');
  const titleEl = document.getElementById('trailer-title');
  if (!modal || !frameWrap) return;

  const isDailymotion = provider === 'dailymotion';
  const params = new URLSearchParams(isDailymotion
    ? { autoplay: '1', mute: '0' }
    : {
        autoplay: '1', rel: '0', modestbranding: '1',
        playsinline: '1', origin: window.location.origin
      });

  const src = isDailymotion
    ? `https://www.dailymotion.com/embed/video/${videoId}?${params.toString()}`
    : `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

  if (titleEl) titleEl.textContent = title;
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  frameWrap.innerHTML = `
    <iframe src="${src}" title="${title}" referrerpolicy="strict-origin-when-cross-origin"
            allow="autoplay; fullscreen; picture-in-picture; web-share" allowfullscreen></iframe>
    <div class="trailer-error-fallback" id="trailer-error">
      <strong>⚠️ لم يتم تشغيل الفيديو</strong>
      <span>قد يكون الفيديو محظور من التشغيل داخل الموقع أو غير متاح</span>
      <a href="${youtubeWatchUrl}" target="_blank" rel="noopener" class="trailer-external-btn">${PLAY_SVG} فتح في يوتيوب</a>
    </div>`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeTrailer(event) {
  if (event && event.target.id !== 'trailer-modal') return;
  const modal = document.getElementById('trailer-modal');
  const frameWrap = document.getElementById('trailer-frame-wrap');
  if (!modal || !frameWrap) return;
  modal.classList.remove('active');
  frameWrap.innerHTML = ''; // stops playback by detaching the iframe
  if (!document.getElementById('game-detail-modal')?.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}
