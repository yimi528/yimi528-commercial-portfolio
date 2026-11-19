import type { User } from '../types';

export const registrationChannels = [
  { id: 'public', zh: '公开渠道', en: 'Public channel' },
  { id: 'atom', zh: '原子公社', en: 'AtomClub' },
  { id: 'dobe', zh: '德必集团', en: 'Dobe Group' },
  { id: 'overseas', zh: '海外专场', en: 'Overseas special' },
] as const;
export type RegistrationChannel = typeof registrationChannels[number]['id'];
export const validRegistrationChannel = (value: unknown): value is RegistrationChannel => registrationChannels.some(channel => channel.id === value);
export function registrationChannelLabel(value: unknown, english = false): string {
  const channel = registrationChannels.find(channel => channel.id === value);
  return channel ? (english ? channel.en : channel.zh) : '—';
}
export const canManageRegistrations = (user: User | null): user is User => user?.role === 'admin' || (user?.role === 'channel_operator' && validRegistrationChannel(user.operatorChannel));
export const registrationAccessKey = (user: User | null) => `${user?.role || ''}:${user?.operatorChannel || ''}`;
