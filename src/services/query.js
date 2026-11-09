export function encodeQuery(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item ?? '');
  }
  return params.toString();
}
// Only internal, implemented destinations are accepted after login.
export function loginDestination(value) {
  if (typeof value !== 'string') return '/dashboard';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && ['/dashboard', '/findings'].includes(url.pathname)
      ? `${url.pathname}${url.search}` : '/dashboard';
  } catch { return '/dashboard'; }
}
