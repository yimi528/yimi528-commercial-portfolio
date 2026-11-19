// Runs exclusively in a dedicated Worker; no UI-thread pixel processing fallback.
type Request = { id: number; src: string };
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: { id: number; blob?: Blob; error?: string }) => void;
};
async function processLogo({ id, src }: Request) {
  let bitmap: ImageBitmap | undefined;
  try {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') throw new Error('Worker canvas unavailable');
    const response = await fetch(src);
    if (!response.ok) throw new Error('Logo unavailable');
    bitmap = await createImageBitmap(await response.blob());
  let width = bitmap.width;
  let height = bitmap.height;
  const canvas = new OffscreenCanvas(1, 1); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  for (let layer = 0; layer < 2; layer++) {
    const raw = ctx.getImageData(0, 0, width, height);
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (raw.data[(y * width + x) * 4 + 3] > 30) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    if (x1 < x0) throw new Error('Empty logo rendering');
    if (x0 || y0 || x1 < width - 1 || y1 < height - 1) {
      const crop = new OffscreenCanvas(1, 1); crop.width = x1 - x0 + 1; crop.height = y1 - y0 + 1;
      const cropCtx = crop.getContext('2d'); if (!cropCtx) throw new Error('Canvas unavailable');
      cropCtx.putImageData(ctx.getImageData(x0, y0, crop.width, crop.height), 0, 0);
      width = crop.width; height = crop.height; canvas.width = width; canvas.height = height; ctx.drawImage(crop, 0, 0);
    }
    const pixels = ctx.getImageData(0, 0, width, height), data = pixels.data;
    const samples: number[][] = [];
    const insetX = Math.min(4, Math.floor(width * 0.02)), insetY = Math.min(4, Math.floor(height * 0.02));
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 100))) {
      samples.push([x, insetY], [x, height - 1 - insetY]);
    }
    for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 100))) {
      samples.push([insetX, y], [width - 1 - insetX, y]);
    }
    const clusters = new Map<string, { color: number[]; count: number }>();
    for (const [x, y] of samples) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 240) continue;
      const key = [data[i], data[i + 1], data[i + 2]].map(v => Math.floor(v / 24)).join(':');
      const group = clusters.get(key) || { color: [0, 0, 0], count: 0 };
      for (let c = 0; c < 3; c++) group.color[c] += data[i + c];
      group.count++; clusters.set(key, group);
    }
    const dominant = [...clusters.values()].sort((a, b) => b.count - a.count)[0];
    const bg = dominant?.color.map(v => v / dominant.count);
    const uniform = !!dominant && dominant.count / samples.length > 0.55;
    const dark = uniform && bg!.every(v => v < 110);
    const light = uniform && bg!.every(v => v > 225);
    // Colored mattes use a chroma key, including enclosed letter counters. Their
    // light wordmarks become navy; colored accents retain their original hue.
    if (uniform && !light) {
      for (let i = 0; i < data.length; i += 4) {
        const original = [data[i], data[i + 1], data[i + 2]];
        // Dark photos have gradient/JPEG noise: suppress the whole matte
        // range, then retain a smooth edge band at native pixel density.
        const distance = Math.hypot(...original.map((v, c) => v - bg![c]));
        const coverage = dark
          ? Math.max(0, Math.min(1, (Math.max(...original) - Math.max(110, Math.max(...bg!) + 20)) / 70))
          : Math.max(0, Math.min(1, (distance - 30) / 45));
        data[i + 3] = Math.round(data[i + 3] * coverage);
        const neutralLight = Math.min(...original) > 100 && Math.max(...original) - Math.min(...original) < 75;
        if (neutralLight) { data[i] = 11; data[i + 1] = 27; data[i + 2] = 58; }
      }
    } else if (light) {
      // Only remove border-connected white: interior white brand details survive.
      const visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
      let head = 0, tail = 0;
      const add = (p: number) => {
        if (visited[p]) return;
        visited[p] = 1;
        const i = p * 4;
        if (data[i + 3] < 10 || Math.min(data[i], data[i + 1], data[i + 2]) > 250) queue[tail++] = p;
      };
      for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
      for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
      while (head < tail) {
        const p = queue[head++]; data[p * 4 + 3] = 0;
        const x = p % width, y = Math.floor(p / width);
        if (x) add(p - 1); if (x < width - 1) add(p + 1);
        if (y) add(p - width); if (y < height - 1) add(p + width);
      }
    }
    ctx.putImageData(pixels, 0, 0);
    if (!uniform || (!dark && !light)) break;
  }
  const pixels = ctx.getImageData(0, 0, width, height), data = pixels.data;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 30) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  if (right < left || bottom < top) throw new Error('Empty logo rendering');
  ctx.putImageData(pixels, 0, 0);
  const cropped = new OffscreenCanvas(1, 1);
  const padding = Math.max(3, Math.round(Math.max(right - left, bottom - top) * 0.035));
  cropped.width = right - left + 1 + padding * 2; cropped.height = bottom - top + 1 + padding * 2;
  const output = cropped.getContext('2d'); if (!output) throw new Error('Canvas unavailable');
  output.putImageData(ctx.getImageData(left, top, right - left + 1, bottom - top + 1), padding, padding);
    const blob = await cropped.convertToBlob({ type: 'image/png' });
    workerScope.postMessage({ id, blob });
  } catch { workerScope.postMessage({ id, error: 'Logo adaptation unavailable' }); }
  finally { bitmap?.close(); }
}
// Serialize decoding and buffers to bound memory when a whole partner wall enters view.
let queue: Promise<void> = Promise.resolve();
workerScope.onmessage = event => { queue = queue.then(() => processLogo(event.data)); };
export {};
