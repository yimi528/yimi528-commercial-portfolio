import { avatarImageUrl } from './avatar.ts';

export type ProfileSnapshot = { name: string; avatar: string; city: string; bio: string; skills: string[] };
const sourceError = () => new Error('主站资料不完整或格式异常，未同步；请重新读取账号后重试');
const clean = (value: unknown, max: number): string => {
  if (value !== null && typeof value !== 'string') throw sourceError();
  const text = (value || '').trim();
  if (text.length > max) throw sourceError();
  return text;
};

/** A write requires explicit source values. Missing fields must never become destructive empty defaults. */
export function mainProfileSnapshot(account: Record<string, unknown>): ProfileSnapshot {
  const name = clean(account.name, 64), bio = clean(account.signature, 1000);
  // The main-account mapper omits avatarUrl when the account has no image.
  const rawAvatar = clean(account.avatarUrl === undefined ? null : account.avatarUrl, 512);
  if (account.city === undefined && account.province === undefined) throw sourceError();
  const city = (account.city === undefined ? '' : clean(account.city, 64))
    || (account.province === undefined ? '' : clean(account.province, 64));
  const avatar = avatarImageUrl(rawAvatar) || '';
  if (avatar) {
    try {
      if (avatar.length > 512 || !['http:', 'https:'].includes(new URL(avatar).protocol)) throw sourceError();
    } catch { throw sourceError(); }
  }
  if (!Array.isArray(account.skills) || account.skills.length > 50 || account.skills.some(skill => typeof skill !== 'string')) throw sourceError();
  const skills = account.skills.map(skill => clean(skill, 100)).filter(Boolean);
  return { name, avatar, city, bio, skills };
}

export function confirmsProfileSnapshot(profile: unknown, expected: ProfileSnapshot): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const saved = profile as Record<string, unknown>;
  return ['name', 'avatar', 'city', 'bio'].every(field => saved[field] === expected[field as keyof ProfileSnapshot])
    && Array.isArray(saved.skills) && saved.skills.length === expected.skills.length
    && saved.skills.every((skill, index) => skill === expected.skills[index]);
}

export const displayText = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
export const displaySkills = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((skill): skill is string => typeof skill === 'string').map(skill => skill.trim()).filter(Boolean).slice(0, 50)
  : [];
