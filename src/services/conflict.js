// Keep only fields deliberately changed in the draft; take current server values elsewhere.
export function rebaseFields(form, initial, current) {
  const base = JSON.parse(initial || '{}');
  const next = structuredClone(form);
  for (const [field, value] of Object.entries(current)) {
    if (JSON.stringify(form[field]) === JSON.stringify(base[field])) next[field] = structuredClone(value);
  }
  return next;
}
