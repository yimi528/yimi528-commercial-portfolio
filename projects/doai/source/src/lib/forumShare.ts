export function forumShareLink(id: string, origin: string, base = ''): string {
  return new URL(`${base.replace(/\/$/, '')}/detail/forum/${encodeURIComponent(id)}`, origin).href;
}
export function forumShareText(title: string, date: string, time: string, venue: string, link: string): string {
  return `${title} · ${date} ${time} @ ${venue}\n${link}`;
}
