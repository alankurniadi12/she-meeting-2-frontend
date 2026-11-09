import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rebaseFields } from '../src/services/conflict.js';

test('rebase menjaga isian draf yang diubah dan mengambil perubahan server pada kolom lain', () => {
  const base = { location: 'A', description: 'Awal', responsibleDivisionIds: ['camp'], priority: '' };
  const draft = { ...base, description: 'Koreksi draf', responsibleDivisionIds: ['camp', 'ict'] };
  const current = { ...base, location: 'B', priority: 'HIGH', responsibleDivisionIds: ['transport'] };
  assert.deepEqual(rebaseFields(draft, JSON.stringify(base), current), {
    location: 'B', description: 'Koreksi draf', responsibleDivisionIds: ['camp', 'ict'], priority: 'HIGH',
  });
  assert.deepEqual(draft.responsibleDivisionIds, ['camp', 'ict']);
});

test('rebase menerima proxy reaktif seperti form Vue', () => {
  const reactiveLike = new Proxy({ text: 'Draf', priority: 'HIGH', responsibleDivisionIds: ['camp'] }, {});
  const result = rebaseFields(reactiveLike, JSON.stringify({ text: '', priority: '', responsibleDivisionIds: ['camp'] }),
    { priority: 'MEDIUM', responsibleDivisionIds: ['ict'] });
  assert.deepEqual(result, { text: 'Draf', priority: 'HIGH', responsibleDivisionIds: ['ict'] });
});
