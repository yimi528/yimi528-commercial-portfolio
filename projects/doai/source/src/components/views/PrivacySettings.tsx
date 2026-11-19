import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { PrivacySettings as Settings } from '../../lib/profileApi';

export const PrivacySettings: React.FC = () => {
  const { currentUser, saveProfile, profileBusy, tr } = useApp();
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false), mounted = useRef(true), revision = useRef(0);
  const owner = useRef(currentUser?.id); owner.current = currentUser?.id;
  useEffect(() => {
    mounted.current = true; pending.current = false;
    setNotice(''); setSaving(false);
    return () => { mounted.current = false; ++revision.current; };
  }, [currentUser?.id]);
  const save = async (patch: Partial<Settings>) => {
    if (!currentUser || pending.current || profileBusy) return;
    const uid = currentUser.id, version = revision.current;
    const isCurrent = () => mounted.current && owner.current === uid && revision.current === version;
    pending.current = true; setSaving(true); setNotice('');
    try {
      await saveProfile(patch);
      if (isCurrent()) { setFailed(false); setNotice(tr('隐私设置已保存', 'Privacy settings saved.')); }
    } catch (error) {
      if (isCurrent()) { setFailed(true); setNotice(error instanceof Error ? error.message : tr('隐私设置未保存，请重试', 'Privacy settings were not saved. Please retry.')); }
    } finally { if (isCurrent()) { pending.current = false; setSaving(false); } }
  };
  if (!currentUser) return null;
  return <section aria-label={tr('隐私设置', 'Privacy settings')} className="doa-card min-w-0 p-6 sm:p-8 shadow-sm space-y-6">
    <h3 className="text-lg font-bold text-[#0B1B3A] pb-4 border-b border-[#E8EAED]">{tr('创客资料与广场隐私设置', 'Profile & Community Privacy')}</h3>
    {saving && <p role="status" className="text-sm text-[#165DFF]">{tr('正在保存隐私设置…', 'Saving privacy settings…')}</p>}
    {notice && currentUser.privacyReady === true && <p role="status" className={`text-sm ${failed ? 'text-red-600' : 'text-green-700'}`}>{notice}</p>}
    {currentUser.privacyReady !== true && <p role="status" className="text-sm text-red-600">{tr('隐私设置暂时无法读取，请使用上方「重新读取账号」重试。', 'Privacy settings could not be read. Use “Refresh account” above to retry.')}</p>}
    {currentUser.privacyReady === true && <fieldset disabled={profileBusy || saving} className="space-y-4">
      <label htmlFor="profile-public" className="flex items-center justify-between gap-4 p-4 doa-panel">
        <span className="min-w-0"><span className="block text-xs font-bold text-[#0B1B3A]">{tr('在创客名片墙展示我的名片', 'Show my card on the Maker Wall')}</span><span className="block text-[11px] text-[#666666]">{tr('新账号默认开启，可随时关闭。其他创客可查看你的公开资料与特长。', 'Others can find your card and send team invites.')}</span></span>
        <input id="profile-public" type="checkbox" checked={currentUser.isPublicInSquare} onChange={event => void save({ isPublicInSquare: event.target.checked })} className="rounded text-[#165DFF] w-4 h-4 shrink-0 cursor-pointer disabled:opacity-50" />
      </label>
      <label htmlFor="profile-exchange" className="flex items-center justify-between gap-4 p-4 doa-panel">
        <span className="min-w-0"><span className="block text-xs font-bold text-[#0B1B3A]">{tr('允许名片交换', 'Allow card exchange')}</span><span className="block text-[11px] text-[#666666]">{tr('开启且名片公开时，其他创客可与你互换展示资料；交换不包含账号手机号。', 'When enabled and your card is public, makers can exchange display profiles with you. Account phone numbers are not shared.')}</span></span>
        <input id="profile-exchange" type="checkbox" checked={currentUser.allowCardExchange} onChange={event => void save({ allowCardExchange: event.target.checked })} className="rounded text-[#165DFF] w-4 h-4 shrink-0 cursor-pointer disabled:opacity-50" />
      </label>
    </fieldset>}
    <div className="p-4 doa-panel space-y-2 text-xs"><div className="font-semibold text-[#0B1B3A]">{tr('atomclub.cn 账号统一关联', 'atomclub.cn Account Link')}</div><p className="text-[11px] text-[#666666]">{tr('你的 DOAI 展示资料和隐私设置关联当前原子公社账号。', 'Your DOAI profile and privacy preferences belong to your current AtomClub account.')}</p></div>
  </section>;
};
