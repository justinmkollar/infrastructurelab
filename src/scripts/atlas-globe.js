(async () => {
  const canvas = document.getElementById('globeCanvas');
  const splash = document.querySelector('.atlas-splash');
  if (!canvas || !splash || canvas.dataset.initialized === 'true') return;
  canvas.dataset.initialized = 'true';

  const dataUrl = canvas.dataset.globeData;
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const DEG = Math.PI / 180;
  const CENTER_LAT = 22 * DEG;
  const ROLL = 20 * DEG;
  const SIN0 = Math.sin(CENTER_LAT);
  const COS0 = Math.cos(CENTER_LAT);
  const SINR = Math.sin(ROLL);
  const COSR = Math.cos(ROLL);
  const ROTATION_MS = 480000;
  const FRAME_MS = 80;
  const BASE_LON = -18 * DEG;
  const HOVER_HIT_RADIUS = 7;
  const HOVER_EASE_MS = 140;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let cssSize = 0;
  let dpr = 1;
  let radius = 0;
  let cx = 0;
  let cy = 0;
  let lastFrame = 0;
  let start = performance.now();
  let visible = true;
  let visibleDcPoints = [];
  let hoveredDc = -1;
  let lastHoverTime = performance.now();
  const hoverScales = new Map();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const next = Math.max(1, Math.round(rect.width));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (next === cssSize && nextDpr === dpr) return;
    cssSize = next;
    dpr = nextDpr;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = cy = cssSize / 2;
    radius = cssSize * 0.468;
  }

  function currentLineColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#c8cbcc';
  }

  function drawFrameOnly() {
    resize();
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = currentLineColor();
    ctx.lineWidth = 0.72;
    ctx.stroke();
  }

  let raw;
  try {
    if (!dataUrl) throw new Error('No globe data URL supplied');
    const response = await fetch(dataUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Globe data HTTP ${response.status}`);
    raw = await response.json();
  } catch (error) {
    console.error('[Infrastructure Lab] Atlas globe data failed to load:', error);
    canvas.dataset.globeError = 'true';
    drawFrameOnly();
    new ResizeObserver(drawFrameOnly).observe(canvas);
    new MutationObserver(drawFrameOnly).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return;
  }

  function prepPoint(pair) {
    const lon = Number(pair[0]) * DEG;
    const lat = Number(pair[1]) * DEG;
    return [lon, Math.sin(lat), Math.cos(lat), Number(pair[0])];
  }

  const countries = (Array.isArray(raw.countries) ? raw.countries : [])
    .filter(Array.isArray)
    .map((path) => path.map(prepPoint));
  const cables = (Array.isArray(raw.cables) ? raw.cables : [])
    .filter(Array.isArray)
    .map((path) => path.map(prepPoint));
  const dataCenters = (Array.isArray(raw.dataCenters) ? raw.dataCenters : []).map(prepPoint);

  function project(point, lon0) {
    const dl = point[0] - lon0;
    const cosdl = Math.cos(dl);
    const visibility = SIN0 * point[1] + COS0 * point[2] * cosdl;
    if (visibility <= 0) return null;
    const x = point[2] * Math.sin(dl);
    const y = COS0 * point[1] - SIN0 * point[2] * cosdl;
    const xr = x * COSR - y * SINR;
    const yr = x * SINR + y * COSR;
    return [cx + radius * xr, cy - radius * yr];
  }

  function drawPaths(paths, lon0) {
    for (const path of paths) {
      let pen = false;
      let lastLon = null;
      ctx.beginPath();
      for (const point of path) {
        const projected = project(point, lon0);
        const dateline = lastLon !== null && Math.abs(point[3] - lastLon) > 180;
        if (!projected || dateline) {
          pen = false;
          lastLon = point[3];
          continue;
        }
        if (!pen) {
          ctx.moveTo(projected[0], projected[1]);
          pen = true;
        } else {
          ctx.lineTo(projected[0], projected[1]);
        }
        lastLon = point[3];
      }
      ctx.stroke();
    }
  }

  function draw(now) {
    resize();
    const line = currentLineColor();
    const lon0 = BASE_LON + (((now - start) % ROTATION_MS) / ROTATION_MS) * Math.PI * 2;

    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = line;
    ctx.fillStyle = line;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 0.72;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawPaths(countries, lon0);
    drawPaths(cables, lon0);

    const pointSize = 3;
    const half = pointSize / 2;
    visibleDcPoints = [];
    for (let i = 0; i < dataCenters.length; i += 1) {
      const projected = project(dataCenters[i], lon0);
      if (!projected) continue;
      visibleDcPoints.push([projected[0], projected[1], i]);
      ctx.fillRect(projected[0] - half, projected[1] - half, pointSize, pointSize);
    }

    const dt = Math.max(0, Math.min(40, now - lastHoverTime));
    lastHoverTime = now;
    const step = dt / HOVER_EASE_MS;
    for (const [index, current] of [...hoverScales.entries()]) {
      const target = index === hoveredDc ? 2 : 1;
      const next = reduceMotion.matches
        ? target
        : current + (target - current) * Math.min(1, step * 4.2);
      const match = visibleDcPoints.find((point) => point[2] === index);
      if (match) {
        const size = pointSize * next;
        const hs = size / 2;
        ctx.fillRect(match[0] - hs, match[1] - hs, size, size);
      }
      if (target === 1 && Math.abs(next - 1) < 0.025) hoverScales.delete(index);
      else hoverScales.set(index, next);
    }

    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = line;
    ctx.lineWidth = 0.72;
    ctx.stroke();
  }

  function setHoveredDataCenter(next) {
    if (next === hoveredDc) return;
    const previous = hoveredDc;
    hoveredDc = next;
    if (previous >= 0 && !hoverScales.has(previous)) hoverScales.set(previous, 2);
    if (next >= 0 && !hoverScales.has(next)) hoverScales.set(next, 1);
    canvas.style.cursor = next >= 0 ? 'pointer' : 'default';
  }

  function hitTestDataCenter(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let nearest = -1;
    let best = HOVER_HIT_RADIUS * HOVER_HIT_RADIUS;
    for (const point of visibleDcPoints) {
      const dx = point[0] - x;
      const dy = point[1] - y;
      const distance = dx * dx + dy * dy;
      if (distance <= best) {
        best = distance;
        nearest = point[2];
      }
    }
    setHoveredDataCenter(nearest);
  }

  canvas.addEventListener('pointermove', hitTestDataCenter, { passive: true });
  canvas.addEventListener('pointerleave', () => setHoveredDataCenter(-1), { passive: true });

  function loop(now) {
    if (visible && (reduceMotion.matches || now - lastFrame >= FRAME_MS)) {
      draw(reduceMotion.matches ? start : now);
      lastFrame = now;
    }
    requestAnimationFrame(loop);
  }

  new ResizeObserver(() => draw(performance.now())).observe(canvas);
  new MutationObserver(() => draw(performance.now())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  }, { rootMargin: '120px' }).observe(splash);

  draw(start);
  requestAnimationFrame(loop);
})();
