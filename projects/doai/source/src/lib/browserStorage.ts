// Keep this page usable when browser privacy settings deny local storage.
// Failed writes stay in memory for this document; they are not treated as persisted.
const cached = new Map<string, string | null>();
const pending = new Map<string, string | null>();
export function readBrowserValue(key: string): string | null {
  if (pending.has(key)) return pending.get(key) ?? null;
  try {
    const storage = globalThis.localStorage;
    if (!storage) return cached.get(key) ?? null;
    const raw = storage.getItem(key), value = typeof raw === 'string' ? raw : null;
    cached.set(key, value); return value;
  } catch { return cached.get(key) ?? null; }
}
export function writeBrowserValue(key: string, raw: string): boolean {
  const value = String(raw); cached.set(key, value);
  try {
    if (!globalThis.localStorage) throw new Error('Storage unavailable');
    globalThis.localStorage.setItem(key, value); pending.delete(key); return true;
  } catch { pending.set(key, value); return false; }
}
export function removeBrowserValue(key: string): boolean {
  cached.set(key, null);
  try {
    if (!globalThis.localStorage) throw new Error('Storage unavailable');
    globalThis.localStorage.removeItem(key); pending.delete(key); return true;
  } catch { pending.set(key, null); return false; }
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === null) { cached.clear(); pending.clear(); }
  else { cached.delete(event.key); pending.delete(event.key); }
});
