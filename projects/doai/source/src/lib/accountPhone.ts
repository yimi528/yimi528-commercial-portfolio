/** A display-only value. Never use a masked number as a contact or ownership key. */
export function maskedAccountPhone(masked: unknown, full?: unknown): string {
  if (typeof masked === 'string' && /^[+\d][\d* -]{5,24}$/.test(masked.trim()) && masked.includes('*')) return masked.trim();
  if (typeof full !== 'string') return '';
  const phone = full.trim();
  if (!/^\+?\d{7,20}$/.test(phone)) return '';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
