/**
 * 创客名片墙（共享组件）
 * 数据来自后端用户目录，关注/互关走后端 follows API。
 * 互相关注后即可在「我的 DOAI → 我的战队」发起组队邀请。
 *
 * 用法：
 *   <CardWall />          独立页面板块（自带 max-w 容器与左右留白，如创客社区）
 *   <CardWall embedded /> 嵌入页面（无外层容器留白，如个人中心 Passport 页）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { wallCardSnapshot } from '../../lib/socialApi';
import { CheckCircle2, MapPin, CreditCard, HeartHandshake, BadgeCheck } from 'lucide-react';

export interface WallUser {
  id: string;
  name: string;
  roleTitle: string;
  avatar?: string;
  skills?: string[];
  city?: string;
  availableTime?: string;
  bio?: string;
  atomclubVerified?: boolean;
}

export const CardWall: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { currentUser, setActiveRoute, tr, exchangeCardWith, setLoginModalOpen } = useApp();
  const [users, setUsers] = useState<WallUser[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [mutual, setMutual] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const [exchanged, setExchanged] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadOwner, setLoadOwner] = useState(currentUser?.id);
  const pending = useRef(false);
  const scope = useRef(0);
  const account = useRef(currentUser?.id);
  if (account.current !== currentUser?.id) { account.current = currentUser?.id; ++scope.current; }
  const requestId = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const uid = currentUser?.id, version = scope.current, request = ++requestId.current;
    setLoadOwner(uid);
    if (!uid) { setLoading(false); return; }
    const isCurrent = () => mounted.current && account.current === uid && scope.current === version && requestId.current === request;
    setLoading(true);
    setLoadError(false);
    try {
      const [users, follows] = await Promise.all([
        apiRequest<{ users: WallUser[] }>('/api/users'),
        apiRequest<{ following: string[]; mutual: string[] }>('/api/follows'),
      ]);
      if (!Array.isArray(users.users) || !Array.isArray(follows.following) || !Array.isArray(follows.mutual)) throw new Error('Invalid card wall response');
      if (!isCurrent()) return;
      const directory = users.users.map(wallCardSnapshot);
      if (new Set(directory.map(user => user.id)).size !== directory.length || [...follows.following, ...follows.mutual].some(id => typeof id !== 'string')) throw new Error('Invalid card directory');
      setUsers(directory.filter(user => user.id !== uid));
      setFollowing(follows.following);
      setMutual(follows.mutual);
    } catch { if (isCurrent()) setLoadError(true); }
    finally { if (isCurrent()) setLoading(false); }
  }, [currentUser?.id]);

  useEffect(() => {
    mounted.current = true;
    pending.current = false;
    setUsers([]); setFollowing([]); setMutual([]); setBusyId(null); setNotice(''); setExchanged(null);
    void refresh();
    return () => { mounted.current = false; ++requestId.current; ++scope.current; };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => { setNotice(''); setExchanged(null); }, 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleFollow = async (user: WallUser) => {
    if (!currentUser) { setLoginModalOpen(true); return; }
    if (pending.current) return;
    const name = user.name || tr('该创客', 'this maker');
    const version = scope.current, uid = currentUser.id;
    const isCurrent = () => mounted.current && account.current === uid && scope.current === version;
    const isFollowing = following.includes(user.id);
    pending.current = true;
    setBusyId(user.id);
    setNotice('');
    setExchanged(null);
    try {
      const result = await apiRequest<{ ok: boolean; mutual: boolean }>('/api/follows', { to: user.id }, isFollowing ? 'DELETE' : 'POST');
      if (result.ok !== true) throw new Error(tr('关注操作未完成，请重试', 'Follow update failed. Please retry.'));
      if (!isCurrent()) return;
      setFollowing(prev => isFollowing ? prev.filter(id => id !== user.id) : [...new Set([...prev, user.id])]);
      setMutual(prev => result.mutual ? [...new Set([...prev, user.id])] : prev.filter(id => id !== user.id));
      setFailed(false);
      setNotice(result.mutual
        ? tr(`与 ${name} 互相关注，可以邀请 TA 加入战队了`, `You and ${name} now follow each other — team invitations are available.`)
        : isFollowing ? tr(`已取消关注 ${name}`, `Unfollowed ${name}.`)
        : tr(`已关注 ${name}，对方回关后即可互相关注`, `Following ${name}. Wait for their follow back.`));
    } catch (error) {
      if (isCurrent()) { setFailed(true); setNotice(error instanceof Error ? error.message : tr('关注失败，请重试', 'Follow failed. Please retry.')); }
    } finally { if (isCurrent()) { pending.current = false; setBusyId(null); } }
  };

  const handleExchange = async (user: WallUser) => {
    if (!currentUser) { setLoginModalOpen(true); return; }
    if (pending.current) return;
    const name = user.name || tr('该创客', 'this maker');
    const version = scope.current, uid = currentUser.id;
    pending.current = true;
    setBusyId(user.id);
    setNotice(''); setExchanged(null);
    const result = await exchangeCardWith(user);
    if (!mounted.current || account.current !== uid || scope.current !== version) return;
    setFailed(!result.ok);
    setNotice(result.ok ? tr(`已与 ${name} 互换名片，双方名片盒各存一张`, `Card exchanged with ${name}.`) : result.message || tr('交换失败', 'Card exchange failed.'));
    if (result.ok) setExchanged(name);
    pending.current = false;
    setBusyId(null);
  };

  return (
    <section className={embedded ? 'pt-10' : 'max-w-[1200px] mx-auto px-6 sm:px-8 pt-14'}>
      <div className="flex items-end justify-between flex-wrap gap-3 pb-6 border-b border-[#E8EAED]">
        <div>
          <div className="text-xs font-semibold text-[#165DFF] tracking-wider uppercase mb-1">
            DOAI MAKER CARD WALL
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1B3A]">{tr('创客名片墙', 'Maker Card Wall')}</h2>
          <p className="text-xs text-[#666666] mt-1.5 flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-[#165DFF]" />
            <span>{tr('发现感兴趣的创作伙伴 · 互相关注后可在「我的战队」发起组队邀请', 'Discover makers — mutual follows unlock team invites in My Team')}</span>
          </p>
          <p className="mt-2 text-[11px] text-[#6B7C9B]">{tr('互换名片会保存双方的展示资料，不包含账号手机号。', 'Exchanges save both display profiles. Account phone numbers are not shared.')}</p>
        </div>
        <button
          onClick={() => setActiveRoute('dashboard/team')}
          className="px-5 py-2 text-xs font-semibold text-[#165DFF] hover:text-[#1453E6] bg-white hover:bg-[#F5F8FF] border border-[#165DFF]/40 rounded-full transition-colors"
        >
          {tr('去我的战队邀请 →', 'Invite from My Team →')}
        </button>
      </div>

      {notice && (
        <div role="status" className={`mt-4 p-3 rounded-xl text-xs font-medium ${failed ? 'bg-red-50 text-red-600' : 'bg-[#00C48C]/10 text-[#00876A]'}`}>
          {notice}
        </div>
      )}
      {exchanged && (
        <div className="fixed bottom-8 left-4 right-4 sm:left-auto sm:right-8 max-w-[calc(100vw-2rem)] z-50 p-4 bg-white rounded-2xl shadow-floating border border-[#00C48C] text-xs flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#00C48C]" />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <div className="font-bold text-[#0B1B3A]">{tr('名片交换成功！', 'Cards exchanged!')}</div>
            <div className="text-[#666666]">{tr('已将', 'Added')} {exchanged} {tr('的数字名片存入您的 DOAI Passport 名片盒', 'to your DOAI Passport card box')}</div>
          </div>
        </div>
      )}

      {!currentUser ? <div className="py-8 text-sm text-[#6B7C9B]"><button type="button" onClick={() => setLoginModalOpen(true)} className="text-[#165DFF] font-semibold">{tr('登录后查看创客名片', 'Sign in to view maker cards')}</button></div>
        : loading || loadOwner !== currentUser.id ? <p role="status" className="py-8 text-sm text-[#6B7C9B]">{tr('正在读取创客名片…', 'Loading maker cards…')}</p>
        : loadError ? <div role="status" className="py-8 space-y-3"><p className="text-sm text-[#6B7C9B]">{tr('创客名片暂时无法加载，请重试。', 'Maker cards could not be loaded. Please retry.')}</p><button type="button" onClick={() => void refresh()} className="doa-btn doa-btn-secondary">{tr('重新加载创客名片', 'Reload maker cards')}</button></div>
        : users.length === 0 ? <p className="py-8 text-sm text-[#6B7C9B]">{tr('暂无公开的创客名片', 'No public maker cards yet')}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
        {!loading && !loadError && loadOwner === currentUser?.id && users.map(user => {
          const iFollow = following.includes(user.id);
          const weAreMutual = mutual.includes(user.id);
          return (
            <div key={user.id} className="doa-card doa-card-hover p-6 flex flex-col gap-4 min-w-0 [overflow-wrap:anywhere]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={user.avatar} name={user.name} className="w-12 h-12 rounded-full border border-[#E8EAED]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#0B1B3A] truncate">{user.name || tr('未留存姓名', 'Name not saved')}</span>
                      {user.atomclubVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-[#165DFF] shrink-0" aria-label={tr('atomclub 已认证', 'atomclub verified')} />
                      )}
                    </div>
                    <div className="text-[11px] text-[#888888] truncate">{user.roleTitle}</div>
                  </div>
                </div>
                {weAreMutual && (
                  <span className="text-[10px] font-bold text-[#165DFF] bg-[#165DFF]/10 px-2 py-0.5 rounded-full shrink-0">
                    {tr('互相关注', 'Mutual')}
                  </span>
                )}
              </div>

              {user.bio && (
                <p className="text-xs text-[#6B7C9B] leading-relaxed line-clamp-3">{user.bio}</p>
              )}

              {user.skills && user.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {user.skills.map(s => (
                    <span
                      key={s}
                      className="max-w-full px-2 py-0.5 text-[10px] font-medium text-[#48597A] bg-[#F7FAFF] border border-[#E3ECFA] rounded [overflow-wrap:anywhere]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-[#F0F2F5] flex items-center justify-between gap-2 text-[11px] text-[#888888]">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {user.city || '—'}
                  {user.availableTime ? ` · ${user.availableTime}` : ''}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFollow(user)}
                    disabled={busyId !== null}
                    className={`px-3 py-1.5 rounded-full font-semibold text-xs border transition-colors disabled:opacity-40 ${
                      iFollow
                        ? 'text-[#666666] border-[#E8EAED] hover:text-red-500 hover:border-red-200'
                        : 'text-[#165DFF] border-[#165DFF]/40 hover:bg-[#165DFF]/5'
                    }`}
                  >
                    {iFollow ? tr('取消关注', 'Unfollow') : tr('+ 关注', '+ Follow')}
                  </button>
                  <button
                    onClick={() => handleExchange(user)}
                    disabled={busyId !== null}
                    title={tr('互换数字名片，存入 DOAI Passport', 'Exchange digital cards into DOAI Passport')}
                    className="px-3 py-1.5 rounded-full font-semibold text-xs text-white bg-[#00C48C] hover:bg-[#009B71] transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {tr('交换名片', 'Card')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
