// Tab-memory only, scoped to the authenticated account. No data/token in localStorage.
const drafts = new Map();
const notices = new Map();
export function savedNotice(key, message) { notices.set(key, message); }
export function takeSavedNotice(key) { const value = notices.get(key) || ''; notices.delete(key); return value; }
export function getDraft(key, initial) {
  if (!drafts.has(key)) drafts.set(key, initial());
  return drafts.get(key);
}
export function forgetDraft(key) { drafts.delete(key); }
export function pendingMutation(state, body) {
  if (!state.pending) state.pending = { ...structuredClone(body), mutationId: crypto.randomUUID() };
  return state.pending;
}
export function failedMutation(state, error) {
  state.uncertain = !error.status || error.status >= 500;
  if (!state.uncertain) state.pending = null;
}
