export function encodeQuery(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item ?? '');
  }
  return params.toString();
}
export function findingExportQuery(query) {
  const { page, pageSize, ...filters } = query;
  return encodeQuery(filters);
}
// Only internal, implemented destinations are accepted after login.
export function loginDestination(value) {
  if (typeof value !== 'string') return '/dashboard';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && (['/dashboard', '/findings', '/findings/new', '/admin/accounts', '/admin/divisions'].includes(url.pathname) || /^\/findings\/[a-fA-F0-9]{24}(?:\/edit)?$/.test(url.pathname))
      ? `${url.pathname}${url.search}` : '/dashboard';
  } catch { return '/dashboard'; }
}
export function findingReturnPath(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/findings', window.location.origin);
    return url.origin === window.location.origin && url.pathname === '/findings' ? `${url.pathname}${url.search}` : '/findings';
  } catch { return '/findings'; }
}
