import { registrationChannels, registrationChannelLabel, validRegistrationChannel, type RegistrationChannel } from '../../lib/registrationChannel.ts';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useRemoteList } from '../../lib/useRemoteList';

interface AdminAccount { id: string; userId: string; name: string; enabled: boolean; source: 'bootstrap' | 'database'; role?: 'super_admin' | 'channel_operator'; channel?: RegistrationChannel | null; }
function validAdmin(account: AdminAccount): boolean {
  return Boolean(account && typeof account.userId === 'string' && !!account.userId.trim() && typeof account.enabled === 'boolean' && ['bootstrap', 'database'].includes(account.source));
}
export const AdminAccountsPanel: React.FC = () => {
  const { currentUser, refreshAtomclubUser, tr, lang } = useApp();
  const owner = currentUser?.role === 'admin' ? currentUser.id : null;
  const ownerRef = useRef(owner);
  const scope = useRef(0);
  if (ownerRef.current !== owner) { ownerRef.current = owner; ++scope.current; }
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const fetchRows = useCallback(async () => {
    const result = await apiRequest<{ admins: AdminAccount[] }>('/api/admins');
    if (!Array.isArray(result.admins) || !result.admins.every(validAdmin)) throw new Error('管理员名单未读取成功');
    return result.admins.map(account => ({ ...account, id: account.userId }));
  }, []);
  const list = useRemoteList(owner, fetchRows);
  const [accessRole, setAccessRole] = useState<'super_admin' | 'channel_operator'>('channel_operator');
  const [channel, setChannel] = useState<RegistrationChannel | ''>('');
  const [identity, setIdentity] = useState('');
  const [kind, setKind] = useState<'phone' | 'userId'>('phone');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { pending.current = false; setBusy(false); setIdentity(''); setError(''); setMessage(''); }, [owner]);

  const perform = async (work: (isCurrent: () => boolean) => Promise<AdminAccount | null>) => {
    if (!owner || pending.current || list.loading || list.error) return;
    const version = scope.current;
    const isCurrent = () => mounted.current && ownerRef.current === owner && scope.current === version;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const saved = await work(isCurrent);
      if (!isCurrent()) return;
      if (saved) {
        list.setItems(prev => [{ ...saved, id: saved.userId }, ...prev.filter(account => account.userId !== saved.userId)]);
        setIdentity('');
        setMessage(tr(`已保存 ${saved.name || saved.userId} 的管理权限`, 'Management access saved.'));
      } else setMessage(tr('管理员权限已停用', 'Administrator access disabled.'));
      if (!await list.reload() && isCurrent()) setError(tr('权限变更已保存，名单刷新失败，请重新加载。', 'Access was saved, but the list could not be refreshed. Please reload.'));
    } catch (error) {
      if (!isCurrent()) return;
      setError(error instanceof Error ? error.message : tr('操作失败，请重试', 'Action failed. Please retry.'));
      if (error instanceof ApiError && error.status === 403) {
        try { await refreshAtomclubUser(); } catch { /* Keep the explicit server error. */ }
      }
    } finally { if (isCurrent()) { pending.current = false; setBusy(false); } }
  };
  const grant = (event: React.FormEvent) => {
    event.preventDefault();
    const value = identity.trim();
    if (!value) return;
    if (kind === 'phone' && !/^1[3-9]\d{9}$/.test(value)) { setError(tr('请输入正确的 11 位手机号', 'Enter a valid 11-digit phone number.')); return; }
    if (accessRole === 'channel_operator' && !validRegistrationChannel(channel)) { setError(tr('请选择运营负责的渠道', 'Select a channel for this operator')); return; }
    void perform(async isCurrent => {
      const capability = await apiRequest<{ channelPolicy?: string }>('/api/doai/me');
      if (!isCurrent()) throw new Error(tr('账号已变化，请重新操作', 'Your account changed. Please retry.'));
      const scoped = capability.channelPolicy === 'scoped-v1';
      const legacySuperAdmin = capability.channelPolicy === undefined && accessRole === 'super_admin';
      if (!scoped && !legacySuperAdmin) throw new Error(tr('渠道权限服务尚未就绪，请稍后重试', 'Channel access service is not ready. Please retry later.'));
      const result = await apiRequest<{ admin: AdminAccount }>('/api/admins', { [kind]: value, ...(scoped ? { role: accessRole, channel: accessRole === 'channel_operator' ? channel : null } : {}) });
      if (!validAdmin(result.admin) || result.admin.enabled !== true) throw new Error(tr('授权结果未确认，请重新加载名单', 'Access was not confirmed. Reload the list.'));
      if ((scoped ? result.admin.role !== accessRole : result.admin.role !== undefined && result.admin.role !== 'super_admin')
        || (accessRole === 'channel_operator' ? result.admin.channel !== channel : result.admin.channel != null)) throw new Error(tr('渠道权限未确认，请重新加载名单', 'Channel access was not confirmed. Reload the list.'));
      return result.admin;
    });
  };
  const revoke = (account: AdminAccount) => {
    if (pending.current || account.source === 'bootstrap' || account.userId === currentUser?.id) return;
    if (!window.confirm(tr(`停用 ${account.name || account.userId} 的管理员权限？`, 'Disable this administrator?'))) return;
    void perform(async () => {
      const result = await apiRequest<{ ok: boolean }>(`/api/admins/${encodeURIComponent(account.userId)}`, undefined, 'DELETE');
      if (result.ok !== true) throw new Error(tr('停用结果未确认，请重新加载名单', 'Revocation was not confirmed. Reload the list.'));
      if (mounted.current && ownerRef.current === owner) list.setItems(prev => prev.map(item => item.userId === account.userId ? { ...item, enabled: false } : item));
      return null;
    });
  };
  return <section className="doa-card p-6 space-y-6" aria-label={tr('管理员名单', 'Administrator list')}>
    <div><h2 className="text-lg font-bold">{tr('管理员管理', 'Administrators')}</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#666]">{tr('使用已有、已启用的原子公社账号分配权限。渠道运营仅管理所选渠道的报名；总管理员管理全部渠道及后台功能。输入已有账号可调整其权限，初始管理员由部署配置维护。', 'Assign an existing active AtomClub account. Channel operators manage one channel; administrators manage all channels and site functions. Re-enter an account to change its access. Initial administrators are managed through deployment configuration.')}</p></div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    {list.loading && <p role="status" className="text-sm text-[#6B7C9B]">{tr('正在读取管理员名单…', 'Loading administrators…')}</p>}
    {list.error && <div role="status" className="space-y-3"><p className="text-sm text-[#6B7C9B]">{tr('管理员名单暂时无法加载，请重试。', 'Administrators could not be loaded. Please retry.')}</p><button type="button" onClick={() => void list.reload()} className="doa-btn doa-btn-secondary">{tr('重新加载管理员', 'Reload administrators')}</button></div>}
    <form onSubmit={grant} aria-label="添加管理员">
      <fieldset disabled={busy || list.loading || list.error} className="flex flex-wrap items-end gap-3 min-w-0">
        <label className="text-sm">{tr('账号识别方式', 'Identify by')}<select id="admin-identity-kind" value={kind} onChange={event => setKind(event.target.value as typeof kind)} className="doa-input block mt-2"><option value="phone">{tr('手机号', 'Phone')}</option><option value="userId">{tr('用户 ID', 'User ID')}</option></select></label>
        <label className="text-sm flex-1 min-w-0 basis-48">{kind === 'phone' ? tr('原子公社手机号', 'AtomClub phone') : tr('原子公社用户 ID', 'AtomClub user ID')}<input id="admin-identity" required value={identity} maxLength={kind === 'phone' ? 11 : 36} inputMode={kind === 'phone' ? 'tel' : 'text'} onChange={event => setIdentity(event.target.value)} className="doa-input block w-full mt-2" /></label>
        <label className="text-sm">{tr('管理权限', 'Access role')}<select id="admin-access-role" value={accessRole} onChange={event => setAccessRole(event.target.value as typeof accessRole)} className="block mt-2 border border-[#E3ECFA] bg-[#F7F8FA] rounded-xl p-2.5"><option value="channel_operator">{tr('渠道运营', 'Channel operator')}</option><option value="super_admin">{tr('总管理员', 'Administrator')}</option></select></label>
        {accessRole === 'channel_operator' && <label className="text-sm">{tr('负责渠道', 'Assigned channel')}<select id="admin-access-channel" required value={channel} onChange={event => setChannel(event.target.value as RegistrationChannel)} className="block mt-2 border border-[#E3ECFA] bg-[#F7F8FA] rounded-xl p-2.5"><option disabled value="">{tr('请选择渠道', 'Select a channel')}</option>{registrationChannels.map(item => <option key={item.id} value={item.id}>{tr(item.zh, item.en)}</option>)}</select></label>}
        <button type="submit" disabled={!identity.trim()} className="rounded-lg bg-[#165DFF] px-4 py-2 text-white disabled:opacity-50">{busy ? tr('正在保存…', 'Saving…') : tr('保存管理权限', 'Save access')}</button>
      </fieldset>
    </form>
    {!list.loading && !list.error && <ul className="divide-y divide-[#E3ECFA]">{list.items.map(account => <li key={account.userId} className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0"><p className="font-semibold break-words">{account.name || account.userId} <span className="text-xs font-normal text-[#666]">{account.enabled ? tr('已启用', 'Enabled') : tr('已停用', 'Disabled')}{account.source === 'bootstrap' ? tr(' · 初始管理员', ' · Initial administrator') : ''}</span></p><p className="my-1 text-xs text-[#165DFF]">{account.role === 'channel_operator' ? `${tr('渠道运营', 'Channel operator')} · ${registrationChannelLabel(account.channel, lang === 'en')}` : tr('总管理员 · 全部渠道', 'Administrator · All channels')}</p><p className="text-xs font-mono text-[#666] break-all">{account.userId}</p></div>
      {account.enabled && account.source !== 'bootstrap' && account.userId !== currentUser?.id && <button type="button" disabled={busy} onClick={() => revoke(account)} className="text-sm text-red-600 disabled:opacity-50">{tr('停用权限', 'Disable access')}</button>}
    </li>)}</ul>}
  </section>;
};
