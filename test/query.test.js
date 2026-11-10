import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeQuery, loginDestination, findingReturnPath } from '../src/services/query.js';

test('query mempertahankan parameter berulang untuk validasi server', () => {
  assert.equal(encodeQuery({ status: ['ON_HOLD', 'COMPLETED'], q: 'a+b', page: undefined }), 'status=ON_HOLD&status=COMPLETED&q=a%2Bb');
  assert.equal(encodeQuery({ q: null }), 'q=');
});
test('tujuan setelah login hanya menerima halaman internal yang diimplementasikan', (t) => {
  const previous = globalThis.window;
  globalThis.window = { location: { origin: 'http://127.0.0.1:5173' } };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  assert.equal(loginDestination('/findings?q=panel&page=2'), '/findings?q=panel&page=2');
  assert.equal(loginDestination('/dashboard?month=2026-11'), '/dashboard?month=2026-11');
  assert.equal(loginDestination('/findings/new'), '/findings/new');
  assert.equal(loginDestination('/admin/accounts'), '/admin/accounts');
  assert.equal(loginDestination('/findings/abcdef123456789012345678/edit'), '/findings/abcdef123456789012345678/edit');
  assert.equal(findingReturnPath('/findings?q=panel&page=2'), '/findings?q=panel&page=2');
  assert.equal(findingReturnPath('https://untrusted.invalid/findings'), '/findings');
  assert.equal(findingReturnPath('/findings/new'), '/findings');
  for (const value of ['https://untrusted.invalid/findings', '//untrusted.invalid/findings', 'javascript:alert(1)', 'http://[', '/findings/invalid', ['/findings'], undefined]) {
    assert.equal(loginDestination(value), '/dashboard');
  }
});
