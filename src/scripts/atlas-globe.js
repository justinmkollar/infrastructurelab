(async () => {
  const canvas = document.getElementById('globeCanvas');
  const splash = document.querySelector('.atlas-splash');
  if (!canvas || !splash || canvas.dataset.initialized === 'true') return;
  canvas.dataset.initialized = 'true';

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const DEG = Math.PI / 180;
  const CENTER_LAT = 22 * DEG;
  const ROLL = 20 * DEG;
  const SIN0 = Math.sin(CENTER_LAT);
  const COS0 = Math.cos(CENTER_LAT);
  const SINR = Math.sin(ROLL);
  const COSR = Math.cos(ROLL);
  const BASE_LON = -18 * DEG;
  const ROTATION_MS = 480000; // one revolution every eight minutes
  const FRAME_MS = 80; // ~12.5 fps, matching the original lightweight globe
  const POINT_SIZE = 3;
  const HOVER_HIT_RADIUS = 7;
  const HOVER_EASE_MS = 140;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let cssSize = 0;
  let dpr = 1;
  let radius = 0;
  let cx = 0;
  let cy = 0;
  let lastFrame = 0;
  let visible = true;
  let hoveredDc = -1;
  let lastHoverTime = performance.now();
  let visibleDcPoints = [];
  const hoverScales = new Map();
  const start = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextSize = Math.max(1, Math.round(rect.width));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (nextSize === cssSize && nextDpr === dpr) return;
    cssSize = nextSize;
    dpr = nextDpr;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = cy = cssSize / 2;
    radius = cssSize * 0.468;
  }

  function lineColor() {
    // Read the color from the canvas so project-scoped theme variables are
    // inherited correctly. The globe uses the project's secondary-text color
    // in both light and dark modes rather than the global border color.
    return getComputedStyle(canvas).getPropertyValue('--muted').trim() || '#62686b';
  }

  function drawFrameOnly() {
    resize();
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = lineColor();
    ctx.lineWidth = 0.72;
    ctx.stroke();
  }

  let raw;
  try {
    const dataUrl = canvas.dataset.globeData;
    if (!dataUrl) throw new Error('No globe data URL supplied');
    const response = await fetch(dataUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Globe data HTTP ${response.status}`);
    raw = await response.json();
  } catch (error) {
    console.error('[Infrastructure Lab] Atlas globe data failed to load:', error);
    canvas.dataset.globeError = 'true';
    drawFrameOnly();
    new ResizeObserver(drawFrameOnly).observe(canvas);
    return;
  }

  function prepPoint(pair) {
    const lonDegrees = Number(pair[0]);
    const lat = Number(pair[1]) * DEG;
    return [lonDegrees * DEG, Math.sin(lat), Math.cos(lat), lonDegrees];
  }

  const prepPaths = (paths) => (Array.isArray(paths) ? paths : [])
    .filter(Array.isArray)
    .map((path) => path.map(prepPoint));

  const countries = prepPaths(raw.countries);
  const cables = prepPaths(raw.cables);
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
      let penDown = false;
      let lastLon = null;
      ctx.beginPath();
      for (const point of path) {
        const projected = project(point, lon0);
        const crossesDateline = lastLon !== null && Math.abs(point[3] - lastLon) > 180;
        if (!projected || crossesDateline) {
          penDown = false;
          lastLon = point[3];
          continue;
        }
        if (penDown) ctx.lineTo(projected[0], projected[1]);
        else {
          ctx.moveTo(projected[0], projected[1]);
          penDown = true;
        }
        lastLon = point[3];
      }
      ctx.stroke();
    }
  }

  function longitudeAt(now) {
    const elapsed = ((now - start) % ROTATION_MS + ROTATION_MS) % ROTATION_MS;
    return BASE_LON + (elapsed / ROTATION_MS) * Math.PI * 2;
  }

  function draw(now) {
    resize();
    const color = lineColor();
    const lon0 = longitudeAt(now);

    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 0.72;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawPaths(countries, lon0);
    drawPaths(cables, lon0);

    const half = POINT_SIZE / 2;
    visibleDcPoints = [];
    for (let index = 0; index < dataCenters.length; index += 1) {
      const projected = project(dataCenters[index], lon0);
      if (!projected) continue;
      visibleDcPoints.push([projected[0], projected[1], index]);
      ctx.fillRect(projected[0] - half, projected[1] - half, POINT_SIZE, POINT_SIZE);
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
        const size = POINT_SIZE * next;
        const halfSize = size / 2;
        ctx.fillRect(match[0] - halfSize, match[1] - halfSize, size, size);
      }
      if (target === 1 && Math.abs(next - 1) < 0.025) hoverScales.delete(index);
      else hoverScales.set(index, next);
    }

    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
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

  canvas.addEventListener('pointermove', (event) => {
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
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => setHoveredDataCenter(-1), { passive: true });

  function loop(now) {
    // Reduced-motion affects only hover easing. It no longer freezes the globe;
    // the slow eight-minute geographic rotation is part of the visualization.
    if (visible && now - lastFrame >= FRAME_MS) {
      draw(now);
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
