// Only orchestration lives on the UI thread. Decode, pixels, crop and encoding are worker-only.
const rendered = new Map<string, Promise<string>>();
const pending = new Map<number, { resolve: (url: string) => void; reject: (reason: Error) => void }>();
const urls = new Set<string>();
let worker: Worker | undefined, sequence = 0, failed = false;
function getWorker(): Worker {
  if (failed || typeof Worker === 'undefined') throw new Error('Logo worker unavailable');
  if (!worker) {
    worker = new Worker(new URL('./partnerLogo.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const task = pending.get(event.data.id);
      if (!task) return;
      pending.delete(event.data.id);
      if (!event.data.blob || event.data.error) { task.reject(new Error('Logo adaptation unavailable')); return; }
      const url = URL.createObjectURL(event.data.blob); urls.add(url); task.resolve(url);
    };
    worker.onerror = () => {
      failed = true; worker?.terminate(); worker = undefined;
      for (const task of pending.values()) task.reject(new Error('Logo worker unavailable'));
      pending.clear();
    };
  }
  return worker;
}
export function preparePartnerLogo(src: string): Promise<string> {
  const cached = rendered.get(src);
  if (cached) return cached;
  const result = new Promise<string>((resolve, reject) => {
    try {
      const active = getWorker(), id = ++sequence;
      pending.set(id, { resolve, reject });
      try { active.postMessage({ id, src: new URL(src, location.href).href }); }
      catch (error) { pending.delete(id); reject(error); }
    } catch (error) { reject(error); }
  });
  rendered.set(src, result);
  void result.catch(() => { if (rendered.get(src) === result) rendered.delete(src); });
  return result;
}
if (import.meta.hot) import.meta.hot.dispose(() => {
  worker?.terminate();
  for (const task of pending.values()) task.reject(new Error('Logo module replaced'));
  for (const url of urls) URL.revokeObjectURL(url);
  pending.clear(); urls.clear(); rendered.clear();
});
