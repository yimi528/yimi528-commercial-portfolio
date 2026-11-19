export function avatarInitial(name: string | null | undefined, fallback = 'A'): string {
  return Array.from(typeof name === 'string' ? name.trim() : '')[0]?.toUpperCase() || fallback;
}

export function escapeAvatarText(text: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
  return text.replace(/[&<>"']/g, character => entities[character]);
}

/** Main-account relative images use the same origin as the existing identity bridge. */
export function avatarImageUrl(value: string | null | undefined): string | undefined {
  let path = typeof value === 'string' ? value.trim() : '';
  if (!path) return undefined;
  if (path.startsWith('/asset/yzx/')) path = '/avatars/' + path.slice('/asset/yzx/'.length);
  if (path.startsWith('//')) return `https:${path}`;
  return path.startsWith('/') ? `https://v2.atomclub.cn${path}` : path;
}
