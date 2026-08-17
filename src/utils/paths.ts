export function withBase(path = '/') {
  const base = import.meta.env.BASE_URL || '/';
  const clean = String(path).replace(/^\/+/, '');
  return clean ? `${base}${clean}` : base;
}

export function normalizeInternalPath(path = '/') {
  if (!path || path === '/') return '/';
  return `/${String(path).replace(/^\/+|\/+$/g, '')}/`;
}
