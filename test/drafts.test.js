import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDraft, forgetDraft, pendingMutation, failedMutation } from '../src/services/drafts.js';
test('draf di memori terikat akun, bertahan remount dan dapat dibuang setelah sukses', () => {
  const first = getDraft('camp:new', () => ({ form: { description: '' } }));
  first.form.description = 'Draf Camp';
  assert.equal(getDraft('camp:new', () => null).form.description, 'Draf Camp');
  assert.notEqual(getDraft('ict:new', () => ({})), first);
  forgetDraft('camp:new'); forgetDraft('ict:new');
  assert.deepEqual(getDraft('camp:new', () => ({})), {});
  forgetDraft('camp:new');
});
test('hasil simpan tak pasti mempertahankan payload dan mutationId yang sama', () => {
  const state = { pending: null, uncertain: false };
  const initial = pendingMutation(state, { text: 'Progres contoh', version: 1 });
  failedMutation(state, new Error('timeout'));
  assert.equal(state.uncertain, true);
  assert.deepEqual(pendingMutation(state, { text: 'Isian berubah', version: 2 }), initial);
  failedMutation(state, { status: 500 });
  assert.equal(state.pending.mutationId, initial.mutationId);
  failedMutation(state, { status: 422 });
  assert.equal(state.pending, null);
  assert.equal(state.uncertain, false);
  assert.notEqual(pendingMutation(state, { text: 'Isian dikoreksi', version: 1 }).mutationId, initial.mutationId);
});

test('pesan sukses hanya dari receipt lokal dan dikonsumsi satu kali untuk akun/temuan yang sesuai', async () => {
  const { savedNotice, takeSavedNotice } = await import('../src/services/drafts.js');
  assert.equal(takeSavedNotice('camp:unknown'), '');
  savedNotice('camp:finding', 'Temuan berhasil disimpan.');
  assert.equal(takeSavedNotice('ict:finding'), '');
  assert.equal(takeSavedNotice('camp:finding'), 'Temuan berhasil disimpan.');
  assert.equal(takeSavedNotice('camp:finding'), '');
});
