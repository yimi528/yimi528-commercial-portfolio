import { apiRequest, ApiError } from './api.ts';
import type { ExchangeCard, NotificationItem } from '../types';
import { cardProfile } from './cardProfile.ts';
import { formatShanghaiDate } from './time.ts';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validId = (value: unknown): value is string => typeof value === 'string' && !!value && value.length <= 36 && value === value.trim();

export function wallCardSnapshot(value: unknown) {
  if (!record(value) || !validId(value.id)) throw new Error('名片资料未确认，请重新加载');
  return { id: value.id, ...cardProfile(value), availableTime: typeof value.availableTime === 'string' ? value.availableTime.trim().slice(0, 64) : '', atomclubVerified: value.atomclubVerified === true };
}

export function exchangeCardSnapshot(id: string, card: Record<string, unknown>, direction: 'in' | 'out', at: string): ExchangeCard {
  if (!validId(id) || !record(card) || !['in', 'out'].includes(direction) || typeof at !== 'string' || !at || at.length > 64 || !Number.isFinite(Date.parse(at))) throw new Error('名片回执未确认，请重新加载');
  const profile = cardProfile(card);
  const rawPhone = typeof card.phone === 'string' ? card.phone.trim() : '';
  const notShared = card.contactStatus === 'not_shared' || !!rawPhone;
  return {
    id, ...profile, phone: '', contactStatus: notShared ? 'not_shared' : 'unavailable',
    exchangedAt: formatShanghaiDate(at), direction, peerName: profile.name,
  };
}

export function readCardExchange(value: unknown, owner: string, peer: string): ExchangeCard {
  if (!record(value) || value.ok !== true || !record(value.exchange)) throw new Error('名片交换结果未确认，请重试');
  const saved = value.exchange;
  if (saved.fromUserId !== owner || saved.toUserId !== peer || !record(saved.from) || saved.from.id !== owner || !record(saved.to) || saved.to.id !== peer) throw new Error('名片交换对象未确认，请重新加载后重试');
  return exchangeCardSnapshot(saved.id as string, saved.to, saved.direction as 'in' | 'out', saved.at as string);
}

export async function loadNotifications(): Promise<NotificationItem[]> {
  const data = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications');
  if (!Array.isArray(data.notifications)) throw new Error('Invalid notifications response');
  return data.notifications;
}

export async function saveNotificationReads(userId: string, ids: string[]): Promise<string[]> {
  const expected = [...new Set(ids)];
  if (!expected.length) return [];
  if (expected.length > 500 || expected.some(id => typeof id !== 'string' || !id || id.length > 36 || id !== id.trim())) throw new Error('消息列表异常，请刷新后重试');
  // An additive endpoint prevents an older backend from interpreting the ID
  // snapshot as an unrestricted read-all operation.
  const result = await apiRequest<{ ok: boolean; userId: string; readIds: string[] }>('/api/notifications/read-ids', { ids: expected, expectedUserId: userId }).catch(error => {
    if (error instanceof ApiError && error.status === 404) throw new Error('消息不存在或服务暂不可用，请刷新后重试');
    throw error;
  });
  if (result?.ok !== true || result.userId !== userId || !Array.isArray(result.readIds) || result.readIds.length !== expected.length
    || new Set(result.readIds).size !== expected.length || result.readIds.some(id => !expected.includes(id))) throw new Error('已读状态未确认，请刷新后重试');
  return result.readIds;
}

export async function loadExchangeCards(): Promise<ExchangeCard[]> {
  const data = await apiRequest<{ cards: { id: string; card: Record<string, unknown>; direction: 'in' | 'out'; exchangedAt: string }[] }>('/api/cards');
  if (!Array.isArray(data.cards)) throw new Error('Invalid cards response');
  const cards = data.cards.map(card => {
    if (!card || !record(card.card)) throw new Error('名片资料未确认，请重新加载');
    return exchangeCardSnapshot(card.id, card.card, card.direction, card.exchangedAt);
  });
  if (new Set(cards.map(card => card.id)).size !== cards.length) throw new Error('名片记录重复，请重新加载');
  return cards;
}
