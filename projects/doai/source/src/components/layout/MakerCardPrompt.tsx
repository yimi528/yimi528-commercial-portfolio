import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';

/** Only an explicit click changes a legacy user's privacy setting. */
export const MakerCardPrompt: React.FC = () => {
  const { currentUser, saveProfile, profileBusy, tr } = useApp();
  const evaluated = useRef('');
  const owner = useRef(currentUser?.id); owner.current = currentUser?.id;
  const [promptOwner, setPromptOwner] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    if (!currentUser) { evaluated.current = ''; setPromptOwner(''); return; }
    if (!currentUser.privacyReady || evaluated.current === currentUser.id) return;
    evaluated.current = currentUser.id;
    setBusy(false); pending.current = false; setError('');
    setPromptOwner(currentUser.isPublicInSquare ? '' : currentUser.id);
  }, [currentUser?.id, currentUser?.privacyReady, currentUser?.isPublicInSquare]);
  const enable = async () => {
    if (!currentUser || pending.current || profileBusy) return;
    const uid = currentUser.id;
    pending.current = true; setBusy(true); setError('');
    try {
      await saveProfile({ isPublicInSquare: true });
      if (owner.current === uid) setPromptOwner('');
    } catch (e) { if (owner.current === uid) setError(e instanceof Error ? e.message : tr('未能保存，请重试', 'Could not save. Retry.')); }
    finally { if (owner.current === uid) { pending.current = false; setBusy(false); } }
  };
  if (!currentUser || currentUser.id !== promptOwner || currentUser.isPublicInSquare) return null;
  return <aside aria-label={tr('创客名片展示提示', 'Maker card visibility')} className="fixed bottom-4 left-4 right-4 z-40 max-w-lg rounded-2xl border border-[#D5E1F1] bg-white p-5 shadow-xl sm:left-auto sm:right-6">
    <p className="text-sm font-bold text-[#0B1B3A]">{tr('你的创客名片当前未展示', 'Your maker card is hidden')}</p>
    <p className="mt-2 text-xs leading-6 text-[#6B7C9B]">{tr('开启后，其他创客可以发现你的昵称、头像和特长。账号手机号不会公开，也可随时在「资料与隐私」关闭。', 'Let other makers discover your name, avatar and skills. Your account phone stays private. You can turn this off in Profile & Privacy.')}</p>
    {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    <div className="mt-4 flex gap-3"><button disabled={busy || profileBusy} onClick={() => void enable()} className="doa-btn doa-btn-primary disabled:opacity-50">{busy ? tr('保存中…', 'Saving…') : tr('开启名片展示', 'Show my maker card')}</button><button disabled={busy} onClick={() => setPromptOwner('')} className="doa-btn doa-btn-ghost">{tr('暂时保持隐藏', 'Keep hidden')}</button></div>
  </aside>;
};
