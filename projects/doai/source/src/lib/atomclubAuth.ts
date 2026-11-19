import {
  actorSnapshot,
  announceAuthChange,
  authSessionEpoch,
  beginAuthTransition,
  bindDoaiActor,
  recordIdentityProof,
  inheritIdentityProof,
  currentAuthToken,
  requestAuthChange,
  explicitlySignedOut,
  ANONYMOUS_ACTOR,
  PENDING_ACTOR,
} from './authSession.ts';
import {
  readBrowserValue,
  writeBrowserValue,
  removeBrowserValue,
} from './browserStorage.ts';
import { validRegistrationChannel } from './registrationChannel.ts';
import type { User } from '../types';
import { ApiError, apiRequest } from './api.ts';
import { avatarImageUrl, avatarInitial, escapeAvatarText } from './avatar.ts';
import { mainProfileSnapshot, confirmsProfileSnapshot, displayText, displaySkills } from './profileSnapshot.ts';
import { maskedAccountPhone } from './accountPhone.ts';

export interface AtomclubUser {
  id: string;
  isAdmin?: boolean;
  channelPolicy?: string;
  operatorChannel?: User['operatorChannel'];
  profile?: {
    userId?: string;
    name?: string;
    avatar?: string;
    city?: string;
    bio?: string;
    skills?: string[];
    isPublic?: boolean;
    allowCardExchange?: boolean;
  };
  name?: string;
  phone?: string;
  maskedPhone?: string | null;
  avatarUrl?: string;
  city?: string;
  province?: string;
  signature?: string;
  skills?: string[];
}

export const sendAtomclubCode = (phone: string) =>
  apiRequest('/api/auth/send-code', { phone });
export const hasPendingAtomclubLogin = () => Boolean(readBrowserValue('doai_login_pending'));
let loginAttempt = 0;
// Retry identity confirmation with the credential already issued. Never reuse the OTP.
export const confirmAtomclubLogin = async () => {
  const pending = readBrowserValue('doai_login_pending'), attempt = loginAttempt;
  if (!pending) throw new ApiError('登录状态已变化，请重新登录', 409, 'SESSION_CHANGED');
  const user = await getAtomclubUser();
  if (pending !== readBrowserValue('doai_login_pending') || attempt !== loginAttempt)
    throw new ApiError('登录状态已变化，请重新确认账号', 409, 'SESSION_CHANGED');
  removeBrowserValue('doai_login_pending');
  announceAuthChange('login');
  return user;
};
export const loginAtomclub = async (phone: string, code: string) => {
  const attempt = ++loginAttempt,
    epoch = authSessionEpoch(),
    token = currentAuthToken(),
    wasSignedOut =
      explicitlySignedOut() || actorSnapshot().actor === ANONYMOUS_ACTOR;
  const result = await apiRequest<{ token?: string }>('/api/auth/login', {
    phone,
    code,
  });
  if (
    attempt !== loginAttempt ||
    epoch !== authSessionEpoch() ||
    (token !== currentAuthToken() &&
      !(wasSignedOut && currentAuthToken() === null))
  )
    throw new ApiError(
      '登录状态已变化，请重新确认账号',
      409,
      'SESSION_CHANGED',
    );
  if (
    result.token !== undefined &&
    (typeof result.token !== 'string' || !result.token.trim())
  )
    throw new Error('登录结果未确认，请重试');
  // Keep issued credentials available for explicit identity retries, including after reload.
  // Other tabs must wait for confirmation before accepting this session.
  writeBrowserValue('doai_login_pending', `${Date.now()}-${Math.random()}`);
  if (result.token) writeBrowserValue('user_token', result.token);
  else
    for (const key of ['user_token', 'atomhub_user_token'])
      removeBrowserValue(key);
  beginAuthTransition('login');
  return confirmAtomclubLogin();
};
const getMainAccount = async () => {
  // 账号身份来自主站 /api/user/me，是登录态的唯一依据，失败必须抛出。
  const user = await apiRequest<AtomclubUser>('/api/user/me');
  if (!user || typeof user.id !== 'string' || !user.id.trim())
    throw new Error('账号资料未读取成功，请稍后重试');
  return user;
};
export const getAtomclubUser = async (): Promise<AtomclubUser> => {
  const epoch = authSessionEpoch(),
    token = currentAuthToken();
  const user = await getMainAccount();
  const confirmed = (value: AtomclubUser) => {
    if (epoch !== authSessionEpoch() || token !== currentAuthToken())
      throw new ApiError(
        '登录状态已变化，请重新确认账号',
        409,
        'SESSION_CHANGED',
      );
    return recordIdentityProof(value, user.id, token);
  };
  // DOAI 资料（isAdmin / profile）只是补充信息：模块未发布或暂时不可用时，
  // 已登录用户仍应保持登录，只是少一个管理员标记，不能让整段登录态失效。
  try {
    const doai = await apiRequest<{
      isAdmin: boolean;
      channelPolicy?: string;
      operatorChannel?: User['operatorChannel'];
      profile: AtomclubUser['profile'];
    }>('/api/doai/me', undefined, 'GET', { 'X-DOAI-Actor': user.id });
    if (doai.profile?.userId && doai.profile.userId !== user.id)
      throw new ApiError(
        '登录账号已变化，请重新读取账号',
        409,
        'SESSION_CHANGED',
      );
    return confirmed({
      ...user,
      isAdmin: doai.isAdmin === true,
      channelPolicy: doai.channelPolicy,
      operatorChannel: validRegistrationChannel(doai.operatorChannel) ? doai.operatorChannel : undefined,
      profile: doai.profile,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DOAI_SESSION_CHANGED')
      throw new ApiError(
        '登录账号已变化，请重新确认账号',
        409,
        'SESSION_CHANGED',
      );
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.code === 'SESSION_CHANGED')
    )
      throw error;
    return confirmed({ ...user, isAdmin: false, channelPolicy: undefined, operatorChannel: undefined });
  }
};
export const syncAtomclubProfile = async (
  expectedUserId: string,
): Promise<AtomclubUser> => {
  const epoch = authSessionEpoch(),
    token = currentAuthToken();
  const checkSession = () => {
    if (epoch !== authSessionEpoch() || token !== currentAuthToken()) {
      requestAuthChange('recheck');
      throw new ApiError('登录状态已变化，请重新确认账号', 409, 'SESSION_CHANGED');
    }
  };
  const account = await getMainAccount();
  if (account.id !== expectedUserId) {
    requestAuthChange('recheck');
    throw new ApiError(
      '当前原子公社账号已变化，请先重新读取账号',
      409,
      'SESSION_CHANGED',
    );
  }
  const snapshot = mainProfileSnapshot(account as unknown as Record<string, unknown>);
  type SyncResult = {
    ok: boolean;
    profile: AtomclubUser['profile'];
    isAdmin: boolean;
    operatorChannel?: User['operatorChannel'];
  };
  const payload = { expectedUserId, ...snapshot };
  checkSession();
  let result: SyncResult;
  try {
    result = await apiRequest<SyncResult>('/api/profile-sync', payload);
  } catch (error) {
    // Older DoaiModule versions support profile writes but have no dedicated sync route.
    // Only a missing-route 404 permits this alternate write, never a failed/ambiguous save.
    if (!(error instanceof ApiError) || error.status !== 404
      || error.message !== 'Cannot POST /api/doai/profile-sync') throw error;
    checkSession();
    if (snapshot.skills.length > 20 || snapshot.skills.some(skill => skill.length > 64))
      throw new Error('当前服务版本暂不支持这些技能标签，需更新资料同步服务后重试；已有资料未修改');
    const before = await apiRequest<SyncResult>('/api/doai/me', undefined, 'GET', { 'X-DOAI-Actor': expectedUserId });
    checkSession();
    if (before.ok !== true || before.profile?.userId !== expectedUserId
      || typeof before.isAdmin !== 'boolean' || typeof before.profile.isPublic !== 'boolean'
      || typeof before.profile.allowCardExchange !== 'boolean')
      throw new Error('账号与隐私状态未确认，请重新读取账号后重试');
    // Omit privacy and permission fields so an older profile endpoint preserves them.
    const saved = await apiRequest<Omit<SyncResult, 'isAdmin'>>('/api/profile', payload);
    checkSession();
    if (saved.profile?.isPublic !== before.profile.isPublic
      || saved.profile?.allowCardExchange !== before.profile.allowCardExchange)
      throw new Error('隐私设置保存结果未确认，请重新读取账号后重试');
    result = { ...saved, isAdmin: before.isAdmin, operatorChannel: before.operatorChannel };
  }
  if (
    result.ok !== true ||
    result.profile?.userId !== expectedUserId ||
    typeof result.profile.isPublic !== 'boolean' ||
    typeof result.profile.allowCardExchange !== 'boolean' ||
    typeof result.isAdmin !== 'boolean' ||
    !confirmsProfileSnapshot(result.profile, snapshot)
  )
    throw new Error('同步结果未确认，请重新读取资料');
  checkSession();
  return recordIdentityProof(
    { ...account, profile: result.profile, isAdmin: result.isAdmin === true, operatorChannel: validRegistrationChannel(result.operatorChannel) ? result.operatorChannel : undefined },
    account.id,
    token,
  );
};
export const logoutAtomclub = async () => {
  const snapshot = actorSnapshot(),
    token = currentAuthToken();
  if (
    snapshot.actor &&
    ![ANONYMOUS_ACTOR, PENDING_ACTOR].includes(snapshot.actor) &&
    snapshot.token !== token
  ) {
    requestAuthChange(token ? 'login' : 'logout', snapshot);
    throw new ApiError(
      '登录账号已变化，未退出新的账号',
      409,
      'SESSION_CHANGED',
    );
  }
  const tokens = ['user_token', 'atomhub_user_token'].map(
    (key) => [key, readBrowserValue(key)] as const,
  );
  removeBrowserValue('doai_login_pending');
  writeBrowserValue('doai_logout_pending', '1');
  const epoch = beginAuthTransition('logout');
  let changed = false;
  try {
    await apiRequest(
      '/api/auth/logout',
      {},
      'POST',
      snapshot.actor &&
        ![ANONYMOUS_ACTOR, PENDING_ACTOR].includes(snapshot.actor)
        ? { 'X-DOAI-Actor': snapshot.actor }
        : undefined,
    );
    if (epoch === authSessionEpoch()) removeBrowserValue('doai_logout_pending');
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DOAI_SESSION_CHANGED')
      changed = true;
    throw error;
  } finally {
    for (const [key, value] of tokens)
      if (readBrowserValue(key) === value) removeBrowserValue(key);
    if (changed) requestAuthChange('recheck');
    else if (epoch === authSessionEpoch() && !currentAuthToken()) {
      bindDoaiActor(actorSnapshot().actor);
      announceAuthChange('logout');
    }
  }
};

export function toDoaiUser(user: AtomclubUser): User {
  const profileSkills = displaySkills(user.profile?.skills);
  const displayName =
    (typeof user.profile?.name === 'string' ? user.profile.name.trim() : '') ||
    (typeof user.name === 'string' ? user.name.trim() : '') ||
    '原子公社创客';
  const rawAvatar = displayText(user.profile?.avatar) || displayText(user.avatarUrl);
  const avatarUrl = typeof rawAvatar === 'string' ? rawAvatar : undefined;
  const avatar = avatarImageUrl(avatarUrl);
  const initial = escapeAvatarText(avatarInitial(displayName));
  const fallbackAvatar = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#E3ECFA"/><text x="40" y="52" text-anchor="middle" font-size="35" font-family="sans-serif" fill="#165DFF">${initial}</text></svg>`)}`;
  return inheritIdentityProof<User>(user, {
    id: String(user.id),
    phone: displayText(user.phone) || '',
    maskedPhone: maskedAccountPhone(user.maskedPhone, user.phone),
    name: displayName,
    avatar: avatar || fallbackAvatar,
    city: displayText(user.profile?.city) ?? (displayText(user.city) || displayText(user.province) || ''),
    bio: displayText(user.profile?.bio) ?? displayText(user.signature) ?? '',
    skills: profileSkills.length ? profileSkills : displaySkills(user.skills),
    role: user.isAdmin === true ? 'admin' : validRegistrationChannel(user.operatorChannel) ? 'channel_operator' : 'maker',
    operatorChannel: user.isAdmin !== true && validRegistrationChannel(user.operatorChannel) ? user.operatorChannel : undefined,
    registrationChannelsEnabled: user.channelPolicy === 'scoped-v1',
    atomclubBound: true,
    isPublicInSquare: user.profile?.isPublic === true,
    allowCardExchange: typeof user.profile?.allowCardExchange === 'boolean' ? user.profile.allowCardExchange : true,
    privacyReady:
      user.profile?.userId === user.id &&
      typeof user.profile?.isPublic === 'boolean' &&
      typeof user.profile?.allowCardExchange === 'boolean',
    notifySettings: {
      system: true,
      review: true,
      team: true,
      forum: true,
      live: true,
    },
  });
}
