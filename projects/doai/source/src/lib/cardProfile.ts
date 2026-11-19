type Data = Record<string, unknown>;
const text = (value: unknown, max: number): string => typeof value === 'string' ? Array.from(value.trim()).slice(0, max).join('') : '';
/** Display fields only. Account contact fields never enter public card profiles. */
export function cardProfile(value: unknown) {
  const data: Data = value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
  const roleTitle = text(data.roleTitle, 128);
  return {
    name: text(data.name, 64), avatar: text(data.avatar, 512), roleTitle,
    org: text(data.org, 128) || roleTitle, city: text(data.city, 64), bio: text(data.bio, 1000),
    skills: Array.isArray(data.skills) ? [...new Set(data.skills.filter(skill => typeof skill === 'string').map(skill => text(skill, 100)).filter(Boolean))].slice(0, 50) : [],
  };
}
