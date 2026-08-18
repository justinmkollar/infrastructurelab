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

const splash = document.querySelector('[data-splash]');
if (body.classList.contains('home-page') && header && splash) {
  const layers = [...splash.querySelectorAll('.splash-layer')];
  const fadeMs = Math.max(0, Number(splash.dataset.fadeMs || 2000));
  const holdMs = Math.max(fadeMs + 500, Number(splash.dataset.holdMs || 30000));
  const transition = `opacity ${fadeMs}ms linear`;
  let active = 0;
  let contrastTimer = 0;
  let cycleTimer = 0;

  function coverSourceRect(img, boxW, boxH, sampleH) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh || !boxW || !boxH) return null;
    const scale = Math.max(boxW / nw, boxH / nh);
    const cropW = boxW / scale;
    const cropH = boxH / scale;
    return {
      sx: (nw - cropW) / 2,
      sy: (nh - cropH) / 2,
      sw: cropW,
      sh: Math.min(cropH, Math.max(1, sampleH / scale))
    };
  }

  function chooseHeaderContrast(img) {
    if (!img?.complete || !img.naturalWidth) return;
    try {
      const rect = splash.getBoundingClientRect();
      const src = coverSourceRect(img, rect.width, rect.height, Math.min(header.offsetHeight, 96));
      if (!src) return;
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 8;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, canvas.width, canvas.height);
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let lum = 0;
      let count = 0;
      const linear = (value) => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      for (let i = 0; i < px.length; i += 4) {
        const r = linear(px[i] / 255);
        const g = linear(px[i + 1] / 255);
        const b = linear(px[i + 2] / 255);
        lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        count += 1;
      }
      root.style.setProperty('--hero-header-fg', (lum / Math.max(1, count)) > 0.47 ? '#111111' : '#ffffff');
    } catch {
      root.style.setProperty('--hero-header-fg', '#ffffff');
    }
  }

  function updateHeader() {
    const solid = splash.getBoundingClientRect().bottom <= header.offsetHeight;
    header.classList.toggle('is-solid', solid);
    if (!solid) chooseHeaderContrast(layers[active]);
  }

  async function imageReady(img) {
    if (img.complete && img.naturalWidth > 0) {
      try { await img.decode?.(); } catch {}
      return true;
    }
    return new Promise((resolve) => {
      const loaded = async () => {
        cleanup();
        try { await img.decode?.(); } catch {}
        resolve(img.naturalWidth > 0);
      };
      const failed = () => {
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        img.removeEventListener('load', loaded);
        img.removeEventListener('error', failed);
      };
      img.addEventListener('load', loaded, { once: true });
      img.addEventListener('error', failed, { once: true });
    });
  }

  function scheduleNext() {
    clearTimeout(cycleTimer);
    if (layers.length > 1) cycleTimer = setTimeout(crossfadeNext, holdMs);
  }

  async function crossfadeNext() {
    if (layers.length < 2) return;

    let next = (active + 1) % layers.length;
    let attempts = 0;
    while (attempts < layers.length - 1 && !(await imageReady(layers[next]))) {
      next = (next + 1) % layers.length;
      attempts += 1;
    }

    if (next === active || !layers[next].naturalWidth) {
      scheduleNext();
      return;
    }

    const outgoing = layers[active];
    const incoming = layers[next];

    // Explicit inline transition keeps the intended crossfade even when the
    // global reduced-motion stylesheet disables other decorative transitions.
    outgoing.style.transition = transition;
    incoming.style.transition = transition;
    incoming.classList.remove('is-initial');
    incoming.classList.remove('is-visible');

    // Force the browser to commit the incoming image at opacity 0 before
    // changing either layer, preventing a single-frame hard swap.
    void incoming.offsetWidth;

    requestAnimationFrame(() => {
      incoming.classList.add('is-visible');
      outgoing.classList.remove('is-visible');
    });

    clearTimeout(contrastTimer);
    contrastTimer = setTimeout(() => {
      active = next;
      if (!header.classList.contains('is-solid')) chooseHeaderContrast(incoming);
    }, Math.max(0, fadeMs * 0.55));

    // Keep the outgoing image in the DOM at opacity 0; this allows the same
    // two-layer crossfade to work consistently when cycling back to it.
    setTimeout(() => {
      active = next;
      scheduleNext();
    }, fadeMs);
  }

  if (layers.length) {
    // First load is deliberately immediate: no fade-in from the page background.
    layers.forEach((layer, index) => {
      layer.classList.toggle('is-visible', index === 0);
      layer.classList.toggle('is-initial', index === 0);
      layer.style.transition = index === 0 ? 'none' : transition;
    });

    imageReady(layers[0]).then(() => {
      chooseHeaderContrast(layers[0]);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        layers[0].classList.remove('is-initial');
        layers[0].style.transition = transition;
      }));
    });

    // The <img> elements already begin downloading immediately; decode them
    // opportunistically so large images are ready before their first crossfade.
    layers.slice(1).forEach((layer) => imageReady(layer));
    scheduleNext();
  }

  updateHeader();
  addEventListener('scroll', updateHeader, { passive: true });
  addEventListener('resize', updateHeader, { passive: true });
}
