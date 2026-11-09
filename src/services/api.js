let csrfToken = null;
export function setCsrfToken(value) { csrfToken = value; }

export async function api(path, { method = 'GET', body } = {}) {
  const base = (import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '');
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrfToken && method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  let response;
  try {
    response = await fetch(`${base}/api/v1${path}`, {
      method, headers, credentials: 'include', cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
  } catch { throw new Error('Server belum dapat dihubungi. Periksa koneksi lalu coba kembali.'); }
  if (response.status === 204) return null;
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Respons server tidak dapat dibaca. Coba kembali.'); }
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Permintaan gagal. Coba kembali.'), { status: response.status, code: result.error?.code, fields: result.error?.fields, currentVersion: result.error?.currentVersion });
  return result;
}
