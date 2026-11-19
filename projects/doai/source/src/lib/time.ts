/**
 * 后端返回的是 ISO 时间串，界面上只想要 `YYYY-MM-DD`。
 * 解析失败时原样返回，避免把空串渲染成 NaN。
 */
export function formatPostDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatShanghaiDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
