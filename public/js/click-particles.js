// ════ PLAYSTATION CLICK PARTICLE EFFECT ════
// Spawns floating PS-style particles on click/tap

(function() {
  'use strict';

  // Real PlayStation controller buttons (hollow/outlined like the actual buttons)
  const PS_BUTTONS = [
    { symbol: '△', color: '#00d96b', glow: '0 0 6px #00d96b, 0 0 14px rgba(0,217,107,.7), 0 0 22px rgba(0,217,107,.4)' }, // Triangle - Green
    { symbol: '◯', color: '#ff3b5c', glow: '0 0 6px #ff3b5c, 0 0 14px rgba(255,59,92,.7), 0 0 22px rgba(255,59,92,.4)' },  // Circle - Red
    { symbol: '✕', color: '#3a8cff', glow: '0 0 6px #3a8cff, 0 0 14px rgba(58,140,255,.7), 0 0 22px rgba(58,140,255,.4)' }, // Cross - Blue
    { symbol: '□', color: '#e85aff', glow: '0 0 6px #e85aff, 0 0 14px rgba(232,90,255,.7), 0 0 22px rgba(232,90,255,.4)' }  // Square - Pink/Magenta
  ];

  // Inject styles once
  const style = document.createElement('style');
  style.textContent = `
    .ps-particle {
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      font-weight: 900;
      will-change: transform, opacity;
      user-select: none;
      font-family: Arial, sans-serif;
      filter: blur(.3px);
      transform: translate(-50%, -50%);
      animation: ps-float-particle var(--duration, 1200ms) cubic-bezier(.2,.7,.3,1) forwards;
    }
    @keyframes ps-float-particle {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(.4);
      }
      15% {
        opacity: 1;
        transform: translate(-50%, -50%) translate(calc(var(--tx) * .25), calc(var(--ty) * .25)) rotate(calc(var(--rot) * .25)) scale(1.1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(.6);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ps-particle { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  // Container for performance (single reflow scope)
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999999;';
  container.id = 'ps-particle-container';
  document.body.appendChild(container);

  function spawnParticle(x, y) {
    const particle = document.createElement('span');
    particle.className = 'ps-particle';

    const button = PS_BUTTONS[Math.floor(Math.random() * PS_BUTTONS.length)];
    const palette = { color: button.color, glow: button.glow };
    particle.textContent = button.symbol;

    // Random trajectory (mostly upward)
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 0.9; // upward fan
    const distance = 40 + Math.random() * 60;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - (15 + Math.random() * 25); // extra upward bias
    const rotation = (Math.random() - 0.5) * 360;
    const fontSize = 11 + Math.random() * 8;
    const duration = 800 + Math.random() * 400;

    particle.style.cssText = `
      left: ${x}px;
      top: ${y}px;
      color: ${palette.color};
      text-shadow: ${palette.glow};
      font-size: ${fontSize}px;
      --tx: ${tx}px;
      --ty: ${ty}px;
      --rot: ${rotation}deg;
      --duration: ${duration}ms;
    `;

    container.appendChild(particle);

    // Auto-remove after animation
    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
    }, duration + 50);
  }

  function burst(x, y) {
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 particles
    for (let i = 0; i < count; i++) {
      setTimeout(() => spawnParticle(x, y), i * 30);
    }
  }

  // Throttle to avoid spam (max ~20 bursts/sec)
  let lastBurst = 0;
  function handleEvent(x, y) {
    const now = Date.now();
    if (now - lastBurst < 50) return;
    lastBurst = now;
    burst(x, y);
  }

  document.addEventListener('click', (e) => {
    handleEvent(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
      const t = e.touches[0];
      handleEvent(t.clientX, t.clientY);
    }
  }, { passive: true });
})();
