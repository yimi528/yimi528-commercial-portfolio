/** Internal route values may come from old server notifications with a leading slash. */
export function normalizeRoute(value: string, base = ''): string {
  let path = String(value || '').trim();
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return 'home';
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) return 'home';
  path = path.split(/[?#]/)[0];
  const prefix = base.replace(/\/$/, '');
  if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) path = path.slice(prefix.length);
  path = path.replace(/^\/+|\/+$/g, '');
  if (path.split('/').some(segment => {
    try { const decoded = decodeURIComponent(segment); return decoded === '.' || decoded === '..' || /[/\\\u0000-\u001f\u007f]/.test(decoded); } catch { return true; }
  })) return 'home';
  if (/^(track|register)\/overseas(?:\/|$)/.test(path)) path = path.replace('/overseas', '/creator');
  return path || 'home';
}
