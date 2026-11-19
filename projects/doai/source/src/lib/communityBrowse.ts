import { useEffect, useRef, useState } from 'react';
// Browser-tab scoped, non-sensitive browsing preferences only. Survive detail reloads.
const values = new Map<string, unknown>();
function read(key: string): unknown {
  try { const raw = sessionStorage.getItem(`doai.community:${key}`); if (raw !== null) return JSON.parse(raw); } catch { /* memory fallback */ }
  return values.get(key);
}
function write(key: string, value: unknown) {
  values.set(key, value);
  try { sessionStorage.setItem(`doai.community:${key}`, JSON.stringify(value)); } catch { /* memory fallback */ }
}
function saved<T>(key: string, initial: T): T {
  const value = read(key);
  return typeof value === typeof initial && (typeof value !== 'number' || (Number.isSafeInteger(value) && value > 0)) ? value as T : initial;
}
export function useCommunityBrowse<T>(key: string, initial: T, owner = '') {
  const scoped = `${owner}:${key}`;
  const [state, setState] = useState<{ key: string; value: T }>(() => ({ key: scoped, value: saved(scoped, initial) }));
  const value = state.key === scoped ? state.value : saved(scoped, initial);
  const update = (next: T) => { write(scoped, next); setState({ key: scoped, value: next }); };
  return [value, update] as const;
}
export function useCommunityScroll(owner: string, ready: boolean, active = true) {
  const restored = useRef('');
  useEffect(() => {
    if (!active) { restored.current = ''; return; }
    if (!ready || restored.current === owner) return;
    const key = `${owner}:scroll`;
    const top = Number(read(key)) || 0;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: 'instant' });
      restored.current = owner;
    });
    return () => cancelAnimationFrame(frame);
  }, [owner, ready, active]);
  useEffect(() => {
    const save = () => { if (active && ready && restored.current === owner) write(`${owner}:scroll`, window.scrollY); };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [owner, ready, active]);
}
