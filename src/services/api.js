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

export function apiUrl(path) { return `${(import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '')}/api/v1${path}`; }
export async function uploadPhoto(path, fields, file) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, String(value));
  form.append('file', file);
  let response;
  try { response = await fetch(apiUrl(path), { method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken || '' },
    credentials: 'include', cache: 'no-store', body: form, signal: AbortSignal.timeout(30000) }); }
  catch { throw new Error('Hasil unggah belum pasti. Coba lagi dengan foto dan operasi yang sama.'); }
  let result;
  try { result = await response.json(); } catch { throw new Error('Hasil unggah belum pasti. Coba lagi dengan foto dan operasi yang sama.'); }
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Unggah gagal.'), { status: response.status, code: result.error?.code, currentVersion: result.error?.currentVersion });
  return result;
}
