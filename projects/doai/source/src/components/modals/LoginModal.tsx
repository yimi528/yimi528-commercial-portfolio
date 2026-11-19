import React, { useEffect, useRef, useState } from 'react';
import { X, Smartphone, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loginAtomclub, sendAtomclubCode, toDoaiUser, confirmAtomclubLogin, hasPendingAtomclubLogin } from '../../lib/atomclubAuth';

export const LoginModal: React.FC = () => {
  const { loginModalOpen, setLoginModalOpen, setCurrentUser, openPolicy, lang } = useApp();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const [error, setError] = useState('');
  const [pendingLogin, setPendingLogin] = useState(hasPendingAtomclubLogin);
  const scope = useRef(0), mounted = useRef(true), open = useRef(loginModalOpen); open.current = loginModalOpen;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++scope.current; }; }, []);
  useEffect(() => { setPendingLogin(hasPendingAtomclubLogin()); if (!loginModalOpen) { ++scope.current; requestPending.current = false; setBusy(false); setPhone(''); setCode(''); setError(''); setAgreed(false); } }, [loginModalOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);
  if (!loginModalOpen) return null;

  const dismiss = () => {
    setLoginModalOpen(false);
    setPhone(''); setCode(''); setError(''); setAgreed(false);
  };
  const close = () => { if (!requestPending.current) dismiss(); };
  const sendCode = async () => {
    if (requestPending.current) return;
    if (!/^1[3-9]\d{9}$/.test(phone)) return setError('请输入正确的 11 位手机号');
    const version = scope.current;
    const isCurrent = () => mounted.current && open.current && scope.current === version;
    requestPending.current = true;
    setBusy(true); setError('');
    try { await sendAtomclubCode(phone); if (isCurrent()) setCountdown(60); }
    catch (e) { if (isCurrent()) setError(e instanceof Error ? e.message : '验证码发送失败'); }
    finally { if (isCurrent()) { requestPending.current = false; setBusy(false); } }
  };
  const login = async (event: React.FormEvent, confirmOnly = false) => {
    event.preventDefault();
    if (requestPending.current) return;
    if (!confirmOnly && (!/^1[3-9]\d{9}$/.test(phone) || !/^\d{4,6}$/.test(code))) return setError('请输入正确的手机号和验证码');
    if (!confirmOnly && !agreed) return setError('请先同意用户协议与隐私政策');
    const version = scope.current;
    const isCurrent = () => mounted.current && open.current && scope.current === version;
    requestPending.current = true;
    setBusy(true); setError('');
    try {
      const user = await (confirmOnly ? confirmAtomclubLogin() : loginAtomclub(phone, code));
      if (!isCurrent()) return;
      setCurrentUser(toDoaiUser(user));
      dismiss();
    } catch (e) { if (isCurrent()) { setPendingLogin(hasPendingAtomclubLogin()); setError(e instanceof Error ? e.message : '登录失败'); } }
    finally { if (isCurrent()) { requestPending.current = false; setBusy(false); } }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-label="登录原子公社账号" className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-floating border border-[#E8EAED]">
        <button type="button" disabled={busy} onClick={close} aria-label="关闭登录窗口" className="absolute top-5 right-5 p-2 text-[#888] hover:text-[#111] rounded-full"><X className="w-5 h-5" /></button>
        <div className="text-center pb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#165DFF]/10 text-[#165DFF] mb-3"><Smartphone className="w-6 h-6" /></div>
          <h3 className="text-xl font-bold text-[#111]">{lang === 'zh' ? '使用原子公社账号登录' : 'Sign in with AtomClub'}</h3>
          <p className="text-xs text-[#666] mt-2 flex items-center justify-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#00C48C]" />{lang === 'zh' ? '同一账号使用 DOAI 名片与赛事服务' : 'One account for your DOAI card and events'}</p>
        </div>
        {error && <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs">{error}</div>}
        {pendingLogin && <div className="mb-4 rounded-xl bg-blue-50 p-3 text-xs text-[#165DFF]">
          <p>{lang === 'zh' ? '登录已提交，账号资料尚未确认。可重新读取，无需再次使用验证码。' : 'Sign-in was submitted. Retry account confirmation without another SMS code.'}</p>
          <button type="button" disabled={busy} onClick={event => void login(event, true)} className="mt-2 font-semibold underline disabled:opacity-50">{lang === 'zh' ? '重新读取账号' : 'Retry account confirmation'}</button>
        </div>}
        <form onSubmit={login} className="space-y-4">
          <div><label htmlFor="atomclub-phone" className="block text-xs font-semibold mb-1.5">{lang === 'zh' ? '手机号码' : 'Mobile phone'}</label><input id="atomclub-phone" disabled={busy} type="tel" autoComplete="tel" maxLength={11} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="请输入 11 位手机号" className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] focus:border-[#165DFF] rounded-xl text-sm outline-none" /></div>
          <div><label htmlFor="atomclub-code" className="block text-xs font-semibold mb-1.5">{lang === 'zh' ? '短信验证码' : 'SMS code'}</label><div className="flex gap-2"><input id="atomclub-code" disabled={busy} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="请输入验证码" className="min-w-0 flex-1 px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] focus:border-[#165DFF] rounded-xl text-sm outline-none" /><button type="button" disabled={busy || countdown > 0} onClick={sendCode} className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#F2F7FF] text-[#165DFF] disabled:opacity-50">{countdown ? `${countdown}s` : lang === 'zh' ? '获取验证码' : 'Send code'}</button></div></div>
          <label className="flex items-start gap-2 text-xs text-[#666] cursor-pointer"><input type="checkbox" disabled={busy} checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" /><span>{lang === 'zh' ? '我已阅读并同意 ' : 'I agree to the '}<button type="button" onClick={() => openPolicy('terms')} className="text-[#165DFF]">{lang === 'zh' ? '用户协议' : 'Terms'}</button>{lang === 'zh' ? ' 与 ' : ' and '}<button type="button" onClick={() => openPolicy('privacy')} className="text-[#165DFF]">{lang === 'zh' ? '隐私政策' : 'Privacy Policy'}</button></span></label>
          <p className="text-[11px] leading-5 text-[#6B7C9B]">{lang === 'zh' ? '新账号默认在创客名片墙展示昵称、头像等公开资料，可在「资料与隐私」关闭；账号手机号不公开。' : 'New accounts show a maker card by default. You can turn this off in Profile & Privacy. Account phone numbers stay private.'}</p>
          <button type="submit" disabled={busy || !agreed} className="w-full py-3 text-sm font-semibold rounded-full bg-[#165DFF] text-white hover:bg-[#1453E6] disabled:bg-neutral-200 disabled:text-neutral-400">{busy ? (lang === 'zh' ? '登录中…' : 'Signing in…') : (lang === 'zh' ? '登录 / 注册' : 'Sign in / Register')}</button>
        </form>
      </div>
    </div>
  );
};
