const root = document.documentElement;
const body = document.body;
const header = document.querySelector('.site-header');
const headerInner = header?.querySelector('.header-inner');
const siteTitle = header?.querySelector('.site-title');
const siteNav = header?.querySelector('.site-nav');
const themeButton = document.querySelector('[data-theme-toggle]');
const menuButton = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');

function setTheme(value) {
  root.dataset.theme = value;
  if (themeButton) {
    themeButton.setAttribute('aria-label', value === 'dark' ? 'Use light mode' : 'Use dark mode');
    themeButton.setAttribute('title', value === 'dark' ? 'Use light mode' : 'Use dark mode');
  }
  try { localStorage.setItem('infrastructure-lab-theme', value); } catch {}
}

let initial = 'light';
try {
  initial = localStorage.getItem('infrastructure-lab-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch {}
setTheme(initial);
themeButton?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

const NAV_MIN_GAP = 50;
let navResizeFrame = 0;

function measureNaturalNavWidth() {
  if (!siteNav) return 0;
  const clone = siteNav.cloneNode(true);
  clone.removeAttribute('aria-label');
  Object.assign(clone.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    display: 'flex',
    width: 'max-content',
    maxWidth: 'none',
    left: '-10000px',
    top: '-10000px'
  });
  document.body.appendChild(clone);
  const width = clone.getBoundingClientRect().width;
  clone.remove();
  return width;
}

function updateNavigationCollapse() {
  if (!header || !headerInner || !siteTitle || !siteNav || !themeButton) return;
  const style = getComputedStyle(headerInner);
  const pl = parseFloat(style.paddingLeft) || 0;
  const pr = parseFloat(style.paddingRight) || 0;
  const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
  const contentWidth = headerInner.clientWidth - pl - pr;
  const titleWidth = siteTitle.getBoundingClientRect().width;
  const navWidth = measureNaturalNavWidth();
  const themeWidth = themeButton.getBoundingClientRect().width || 18;
  const titleToNavGap = contentWidth - titleWidth - navWidth - themeWidth - gap;
  const collapse = titleToNavGap < NAV_MIN_GAP;
  header.classList.toggle('nav-collapsed', collapse);
  if (!collapse && mobileNav?.classList.contains('is-open')) {
    mobileNav.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }
}

function queueNav() {
  cancelAnimationFrame(navResizeFrame);
  navResizeFrame = requestAnimationFrame(updateNavigationCollapse);
}

updateNavigationCollapse();
if (headerInner) new ResizeObserver(queueNav).observe(headerInner);
addEventListener('resize', queueNav, { passive: true });
document.fonts?.ready?.then(queueNav);

menuButton?.addEventListener('click', () => {
  const open = !mobileNav?.classList.contains('is-open');
  mobileNav?.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
});

mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mobileNav.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('[data-index-entry]').forEach((entry) => {
  const toggles = [...entry.querySelectorAll('[data-index-toggle]')];
  const detail = entry.querySelector('[data-index-detail]');
  const expand = entry.querySelector('[data-expand-button]');

  function setOpen(open) {
    entry.classList.toggle('is-open', open);
    toggles.forEach((toggle) => toggle.setAttribute('aria-expanded', open ? 'true' : 'false'));
    detail?.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (expand) {
      expand.textContent = open ? '×' : '+';
      expand.setAttribute('aria-label', open ? 'Collapse details' : 'Expand details');
    }
  }

  toggles.forEach((toggle) => toggle.addEventListener('click', () => setOpen(!entry.classList.contains('is-open'))));
  setOpen(false);
});

// Unified homepage splash controller. Images and silent video share the same layer layout.
const splash = document.querySelector('[data-splash]');
if (body.classList.contains('home-page') && header && splash) {
  const layers = [...splash.querySelectorAll('.splash-layer')];
  const fadeMs = Math.max(0, Number(splash.dataset.fadeMs || 2000));
  const holdMs = Math.max(fadeMs + 500, Number(splash.dataset.holdMs || 30000));
  const transition = `opacity ${fadeMs}ms linear`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const preselected = layers.findIndex((layer) => layer.classList.contains('is-visible'));
  let active = preselected >= 0 ? preselected : 0;
  let cycleTimer = 0;
  let contrastTimer = 0;

  function coverSourceRect(layer, boxW, boxH, sampleH) {
    const nw = layer.videoWidth || layer.naturalWidth;
    const nh = layer.videoHeight || layer.naturalHeight;
    if (!nw || !nh || !boxW || !boxH) return null;
    const scale = Math.max(boxW / nw, boxH / nh);
    const cropW = boxW / scale;
    const cropH = boxH / scale;
    const pos = (layer.style.objectPosition || '50% 50%').split(' ');
    const fx = Math.min(1, Math.max(0, parseFloat(pos[0]) / 100 || 0));
    const fy = Math.min(1, Math.max(0, parseFloat(pos[1]) / 100 || 0));
    return {
      sx: (nw - cropW) * fx,
      sy: (nh - cropH) * fy,
      sw: cropW,
      sh: Math.min(cropH, Math.max(1, sampleH / scale))
    };
  }

  function chooseHeaderContrast(layer) {
    if (!layer || (layer.tagName === 'VIDEO' && layer.readyState < 2) ||
        (layer.tagName === 'IMG' && (!layer.complete || !layer.naturalWidth))) {
      root.style.setProperty('--hero-header-fg', '#ffffff');
      return;
    }
    try {
      const rect = splash.getBoundingClientRect();
      const src = coverSourceRect(layer, rect.width, rect.height, Math.min(header.offsetHeight, 96));
      if (!src) return;
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 8;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(layer, src.sx, src.sy, src.sw, src.sh, 0, 0, canvas.width, canvas.height);
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let lum = 0;
      const linear = (value) => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      for (let i = 0; i < px.length; i += 4) {
        const r = linear(px[i] / 255), g = linear(px[i + 1] / 255), b = linear(px[i + 2] / 255);
        lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      root.style.setProperty('--hero-header-fg', (lum / (px.length / 4)) > 0.47 ? '#111111' : '#ffffff');
    } catch {
      root.style.setProperty('--hero-header-fg', '#ffffff');
    }
  }

  function updateHeader() {
    const solid = splash.getBoundingClientRect().bottom <= header.offsetHeight;
    header.classList.toggle('is-solid', solid);
    if (!solid) chooseHeaderContrast(layers[active]);
  }

  function mediaReady(layer) {
    if (layer.tagName === 'VIDEO') {
      // The poster is a valid visible fallback while the video buffers or autoplay is blocked.
      if (layer.poster || layer.readyState >= 2) return Promise.resolve(true);
      return new Promise((resolve) => {
        const done = (ready) => { cleanup(); resolve(ready); };
        const loaded = () => done(true);
        const failed = () => done(false);
        const timeout = setTimeout(() => done(false), 8000);
        const cleanup = () => {
          clearTimeout(timeout);
          layer.removeEventListener('loadeddata', loaded);
          layer.removeEventListener('error', failed);
        };
        layer.addEventListener('loadeddata', loaded, { once: true });
        layer.addEventListener('error', failed, { once: true });
        layer.load();
      });
    }
    if (layer.complete && layer.naturalWidth > 0) {
      return layer.decode?.().catch(() => {}).then(() => true) ?? Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const loaded = async () => {
        cleanup();
        try { await layer.decode?.(); } catch {}
        resolve(layer.naturalWidth > 0);
      };
      const failed = () => { cleanup(); resolve(false); };
      const cleanup = () => {
        layer.removeEventListener('load', loaded);
        layer.removeEventListener('error', failed);
      };
      layer.addEventListener('load', loaded, { once: true });
      layer.addEventListener('error', failed, { once: true });
    });
  }

  function pauseVideo(layer) {
    if (layer?.tagName === 'VIDEO') layer.pause();
  }

  function playVideo(layer) {
    if (layer?.tagName !== 'VIDEO' || reducedMotion.matches || document.hidden) return;
    const rate = Number(layer.dataset.playbackRate);
    layer.playbackRate = Number.isFinite(rate) && rate >= 0.25 && rate <= 2 ? rate : 1;
    try { layer.currentTime = 0; } catch {}
    layer.play().catch(() => { /* Browser keeps the poster visible on autoplay rejection. */ });
  }

  function displayDuration(layer) {
    const override = Number(layer?.dataset.displayMs);
    if (override > 0) return Math.max(fadeMs + 500, override);
    if (layer?.tagName === 'VIDEO' && Number.isFinite(layer.duration) && layer.duration > 0) {
      return Math.max(fadeMs + 500, (layer.duration / layer.playbackRate) * 1000 - fadeMs / 2);
    }
    return holdMs;
  }

  function scheduleNext() {
    clearTimeout(cycleTimer);
    if (layers.length > 1 && !reducedMotion.matches) {
      cycleTimer = setTimeout(crossfadeNext, displayDuration(layers[active]));
    }
  }

  async function crossfadeNext() {
    if (layers.length < 2 || reducedMotion.matches) return;
    let next = (active + 1) % layers.length;
    let attempts = 0;
    while (attempts < layers.length - 1 && !(await mediaReady(layers[next]))) {
      next = (next + 1) % layers.length;
      attempts += 1;
    }
    if (next === active || !(await mediaReady(layers[next]))) {
      scheduleNext();
      return;
    }

    const outgoing = layers[active], incoming = layers[next];
    incoming.style.transition = transition;
    outgoing.style.transition = transition;
    incoming.classList.remove('is-initial', 'is-visible');
    void incoming.offsetWidth;
    playVideo(incoming);

    requestAnimationFrame(() => {
      incoming.classList.add('is-visible');
      outgoing.classList.remove('is-visible');
    });

    clearTimeout(contrastTimer);
    contrastTimer = setTimeout(() => {
      active = next;
      if (!header.classList.contains('is-solid')) chooseHeaderContrast(incoming);
    }, Math.max(0, fadeMs * 0.55));

    setTimeout(() => {
      pauseVideo(outgoing);
      active = next;
      scheduleNext();
    }, fadeMs);
  }

  if (layers.length) {
    layers.forEach((layer, index) => {
      const selected = index === active;
      layer.classList.toggle('is-visible', selected);
      layer.classList.toggle('is-initial', selected);
      layer.style.transition = selected ? 'none' : transition;
      if (layer.tagName === 'VIDEO') {
        layer.addEventListener('loadeddata', () => {
          if (layers[active] === layer) updateHeader();
        });
        layer.addEventListener('loadedmetadata', () => {
          if (layers[active] === layer) scheduleNext();
        });
        if (!selected) layer.pause();
      }
    });

    mediaReady(layers[active]).then(() => {
      playVideo(layers[active]);
      chooseHeaderContrast(layers[active]);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        layers[active].classList.remove('is-initial');
        layers[active].style.transition = transition;
      }));
    });

    // Prepare inactive image layers; video layers keep preload=metadata to save bandwidth.
    layers.forEach((layer, index) => {
      if (index !== active && layer.tagName === 'IMG') mediaReady(layer);
    });
    scheduleNext();
  }

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      clearTimeout(cycleTimer);
      layers.forEach(pauseVideo);
    } else {
      playVideo(layers[active]);
      scheduleNext();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(cycleTimer);
      layers.forEach(pauseVideo);
    } else if (!reducedMotion.matches) {
      playVideo(layers[active]);
      scheduleNext();
    }
  });
  updateHeader();
  addEventListener('scroll', updateHeader, { passive: true });
  addEventListener('resize', updateHeader, { passive: true });
}
