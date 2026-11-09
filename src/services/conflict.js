// Keep only fields deliberately changed in the draft; take current server values elsewhere.
export function rebaseFields(form, initial, current) {
  const base = JSON.parse(initial || '{}');
  const next = Object.fromEntries(Object.entries(form).map(([field, value]) => [field, Array.isArray(value) ? [...value] : value]));
  for (const [field, value] of Object.entries(current)) {
    if (JSON.stringify(form[field]) === JSON.stringify(base[field])) next[field] = Array.isArray(value) ? [...value] : value;
  }
  return next;
}
