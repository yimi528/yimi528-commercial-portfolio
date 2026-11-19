import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/** Account-scoped lists keep confirmed local writes when an older read arrives. */
export function useRemoteList<T extends { id: string }>(owner: string | null, fetchRows: () => Promise<T[]>, compare?: (a: T, b: T) => number) {
  const [items, setState] = useState<T[]>([]);
  const itemsRef = useRef<T[]>([]);
  const [status, setStatus] = useState<{ owner: string | null; state: 'idle' | 'loading' | 'ready' | 'error' }>({ owner: null, state: 'idle' });
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const request = useRef(0);
  const revision = useRef(0);
  const changes = useRef(new Map<string, { revision: number; item: T | null }>());

  const setItems: Dispatch<SetStateAction<T[]>> = useCallback(update => {
    const previous = new Map(itemsRef.current.map(item => [item.id, item]));
    const updated = typeof update === 'function' ? update(itemsRef.current) : update;
    const next = compare ? [...updated].sort(compare) : updated;
    const nextIds = new Set(next.map(item => item.id));
    for (const item of next) {
      if (previous.get(item.id) !== item) changes.current.set(item.id, { revision: ++revision.current, item });
    }
    for (const id of previous.keys()) {
      if (!nextIds.has(id)) changes.current.set(id, { revision: ++revision.current, item: null });
    }
    itemsRef.current = next;
    setState(next);
  }, [compare]);

  const reset = useCallback(() => {
    ++request.current;
    changes.current.clear();
    itemsRef.current = [];
    setState([]);
    setStatus({ owner: null, state: 'idle' });
  }, []);

  const reload = useCallback(async (): Promise<boolean> => {
    if (!owner) return false;
    const requestId = ++request.current, startedAt = revision.current;
    const isCurrent = () => ownerRef.current === owner && request.current === requestId;
    setStatus({ owner, state: 'loading' });
    try {
      const rows = await fetchRows();
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string')) throw new Error('Invalid list response');
      if (!isCurrent()) return false;
      const merged = new Map(rows.map(row => [row.id, row]));
      for (const [id, change] of changes.current) {
        if (change.revision <= startedAt) continue;
        if (change.item) merged.set(id, change.item);
        else merged.delete(id);
      }
      const result = [...merged.values()];
      if (compare) result.sort(compare);
      itemsRef.current = result;
      setState(result);
      setStatus({ owner, state: 'ready' });
      return true;
    } catch {
      if (isCurrent()) setStatus({ owner, state: 'error' });
      return false;
    }
  }, [owner, fetchRows, compare]);

  useEffect(() => {
    reset();
    if (owner) void reload();
    return () => { ++request.current; };
  }, [owner, reload, reset]);

  return { items: status.owner === owner ? items : [], setItems, reload, reset,
    loading: Boolean(owner && (status.owner !== owner || status.state === 'idle' || status.state === 'loading')),
    error: status.owner === owner && status.state === 'error',
  };
}
