import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DetailShell, NotFound } from '../detail/DetailShell';
import { formatPostDate } from '../../lib/time';
import { applicationMessage, loadRecruitmentDetail } from '../../lib/communityApi';
import { useRemoteList } from '../../lib/useRemoteList';
import { RecruitmentApplications } from '../sections/RecruitmentApplications';
import { Avatar } from '../common/Avatar';
import {
  MapPin, Users, Heart, Briefcase, Check, Send, Clock, Wrench, X, Sparkles,
} from 'lucide-react';

const stageMeta = {
  idea: { label: '构思阶段', labelEn: 'Idea', desc: '还在想法验证期，需要早期合伙人一起把方向跑通。', color: '#722ED1' },
  prototype: { label: '原型阶段', labelEn: 'Prototype', desc: '已有可运行原型，正在补齐工程与体验细节。', color: '#165DFF' },
  demo: { label: 'Demo 阶段', labelEn: 'Demo', desc: '核心链路已跑通，需要补齐规模化与商业化能力。', color: '#00B487' },
} as const;

export const RecruitDetailView: React.FC<{ id?: string }> = ({ id }) => {
  const { recruitments, recruitmentRevision, recruitmentLikePending, currentUser, authLoading, setLoginModalOpen, setActiveRoute, toggleLikeRecruit, applyToRecruitment, tr, lang } = useApp();
  const [form, setForm] = useState({ name: '', skills: '', message: '' });
  const [sending, setSending] = useState(false);
  const [applyError, setApplyError] = useState('');
  const pending = useRef(false);
  const liking = useRef(false);
  const mounted = useRef(true);
  const owner = authLoading || !id ? null : `${currentUser?.id || 'public'}:${currentUser?.role || 'visitor'}:${id}`;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const lastUser = useRef(currentUser?.id);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    pending.current = false; liking.current = false; setSending(false); setApplyError('');
    if (lastUser.current && lastUser.current !== currentUser?.id) setForm({ name: '', skills: '', message: '' });
    if (currentUser?.id) lastUser.current = currentUser.id;
  }, [owner, currentUser?.id]);
  const fetchPost = useCallback(() => id ? loadRecruitmentDetail(id) : Promise.resolve([]), [id, recruitmentRevision]);
  const detail = useRemoteList(owner, fetchPost);
  const post = detail.items[0];
  if (authLoading || (detail.loading && !post)) return <p role="status" className="pt-32 pb-24 text-center text-sm text-[#6B7C9B]">{tr('正在读取招募信息…', 'Loading recruitment details…')}</p>;
  if (detail.error) return <div role="status" className="pt-32 pb-24 text-center space-y-4"><p className="text-sm text-[#6B7C9B]">{tr('招募详情暂时无法加载，请重试。', 'Recruitment details could not be loaded. Please retry.')}</p><button type="button" onClick={() => void detail.reload()} className="doa-btn doa-btn-secondary">{tr('重新加载招募详情', 'Reload recruitment details')}</button></div>;
  if (!post) return <NotFound what="该招募帖" whatEn="This recruiting post" backRoute="square" backLabel="返回组队广场" backLabelEn="Back to Team Square" />;
  const stage = stageMeta[post.stage];
  const filled = post.status === 'filled';
  const applied = Boolean(post.hasApplied);
  const self = post.leader.id === currentUser?.id;
  const manager = self || currentUser?.role === 'admin';
  const handleLike = async () => {
    if (liking.current) return;
    const startedFor = owner;
    liking.current = true;
    const ok = await toggleLikeRecruit(post.id, !post.hasLiked);
    if (!mounted.current || ownerRef.current !== startedFor) return;
    if (ok) await detail.reload();
    if (mounted.current && ownerRef.current === startedFor) liking.current = false;
  };
  const handleApply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) { setLoginModalOpen(true); return; }
    if (pending.current || self || filled || detail.loading) return;
    let message;
    try { message = applicationMessage(form, lang === 'en'); }
    catch (error) { setApplyError(error instanceof Error ? error.message : '请检查申请内容'); return; }
    const startedFor = owner;
    pending.current = true; setSending(true); setApplyError('');
    const result = await applyToRecruitment(post.id, message);
    if (!mounted.current || ownerRef.current !== startedFor) return;
    if (result.ok) { setForm(previous => ({ ...previous, message: '' })); await detail.reload(); }
    else setApplyError(result.message || tr('申请失败，请重试', 'Application failed. Please retry.'));
    if (mounted.current && ownerRef.current === startedFor) { pending.current = false; setSending(false); }
  };

  return (
    <DetailShell
      backRoute="square/recruit"
      backLabel={tr('返回组队广场', 'Back to Team Square')}
      eyebrow={`${post.track === 'industry' ? tr('FDE 赛道', 'Industry') : tr('自由创意赛道', 'Creator')} · ${tr(stage.label, stage.labelEn)}`}
      title={post.title}
      subtitle={post.summary}
      meta={[
        { label: tr('发起人', 'Founder'), value: post.leader.name },
        { label: tr('所在城市', 'City'), value: post.city },
        { label: tr('协作方式', 'Collaboration'), value: post.isRemote ? tr('可远程', 'Remote OK') : tr('需到场', 'On-site') },
        { label: tr('已有申请', 'Applicants'), value: `${post.applicationsCount}` },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => void handleLike()}
            disabled={detail.loading || recruitmentLikePending.includes(post.id)}
            aria-pressed={post.hasLiked}
            className="doa-btn doa-btn-ghost"
          >
            <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-[#FF4D4F] text-[#FF4D4F]' : ''}`} />
            {post.hasLiked ? tr('已心动', 'Liked') : tr('心动', 'Like')} · {post.likes}
          </button>
          <a href={self ? "#recruitment-applications" : "#apply"} className="doa-btn doa-btn-primary">
            <Send className="w-4 h-4" /> {self ? tr('查看收到的申请', 'View applications') : applied ? tr('已投递', 'Sent') : tr('申请参与项目', 'Apply to collaborate')}
          </a>
        </>
      }
    >
      {detail.loading && <p role="status" className="mb-5 text-sm text-[#6B7C9B]">{tr('正在更新招募信息…', 'Updating recruitment details…')}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Project stage */}
          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-4">{tr('项目现状', 'Project Status')}</h2>
            <div className="flex items-start gap-4">
              <span
                className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold"
                style={{ background: stage.color }}
              >
                {post.stage === 'idea' ? '想' : post.stage === 'prototype' ? '原' : 'D'}
              </span>
              <div>
                <div className="font-bold text-[#1A2B4D] mb-1">{stage.label}</div>
                <p className="text-[13px] text-[#6B7C9B] leading-relaxed">{stage.desc}</p>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-[#E3ECFA]">
              <p className="text-sm text-[#48597A] leading-[1.8]">{post.summary}</p>
            </div>
          </section>

          {/* Open roles */}
          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">{tr('正在招募的角色', 'Roles Wanted')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {post.neededRoles.map((role, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-[#F7FAFF] border border-[#E3ECFA]">
                  <span className="w-8 h-8 rounded-xl bg-[#E4EFFF] text-[#165DFF] flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-semibold text-[#1A2B4D]">{role}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-4 flex items-center gap-2">
              <Wrench className="w-4.5 h-4.5 text-[#165DFF]" /> {tr('技术栈', 'Tech Stack')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {post.skills.map((s, i) => (
                <span key={i} className="doa-chip">{s}</span>
              ))}
            </div>
          </section>

          {/* Apply */}
          <section id="apply" className="doa-card p-6 sm:p-7 scroll-mt-24">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-2">申请加入</h2>
            <p className="text-[13px] text-[#6B7C9B] mb-5">
              {tr('简单介绍一下自己，说明你能为项目带来什么。处理结果将通过站内通知告知。', 'Introduce yourself and explain what you can contribute. You will receive an in-app update.')}
            </p>

            {self ? <p className="text-sm text-[#6B7C9B]">{tr('这是你发布的招募，可在下方查看并处理申请。', 'This is your post. Review applications below.')}</p> : applied ? (
              <div className="rounded-2xl bg-[#F2F7FF] border border-[#A9CCFF] p-6 text-center">
                <span className="inline-flex w-12 h-12 rounded-full bg-[#165DFF] text-white items-center justify-center mb-3">
                  <Check className="w-6 h-6" />
                </span>
                <h3 className="font-bold text-[#0B1B3A] mb-1">{post.applicationStatus === 'accepted' ? tr('发起人愿意进一步沟通', 'The founder is open to a conversation') : post.applicationStatus === 'declined' ? tr('本次申请暂不合适', 'Not a fit this time') : tr('申请已经提交', 'Application submitted')}</h3>
                <p className="text-[13px] text-[#48597A]">
                  {post.applicationStatus === 'accepted' ? tr('你们可以继续交流合作意向；正式入队仍需通过战队邀请确认。', 'Discuss collaboration next. Formal membership still requires a team invitation.') : post.applicationStatus === 'declined' ? tr('你仍可在创客社区寻找其他合作机会。', 'You can explore other opportunities in the community.') : tr(`已通知发起人 ${post.leader.name}，处理后你会收到站内通知。`, `The founder ${post.leader.name} has been notified. You will receive an update.`)}
                </p>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="doa-label" htmlFor="rc-name">称呼</label>
                  <input
                    id="rc-name" maxLength={64} disabled={sending}
                    className="doa-input"
                    placeholder={currentUser?.name || '你的名字'}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="doa-label" htmlFor="rc-skills">相关技能</label>
                  <input
                    id="rc-skills" maxLength={200} disabled={sending}
                    className="doa-input"
                    placeholder="如：Rust、分布式系统、英文文档"
                    value={form.skills}
                    onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="doa-label" htmlFor="rc-msg">自我介绍 / 想参与的原因</label>
                  <textarea
                    id="rc-msg" maxLength={500} disabled={sending}
                    className="doa-textarea"
                    rows={5}
                    required
                    placeholder="简单说说你做过什么、为什么想做这件事…"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  />
                  <p className="mt-1.5 text-[12px] text-[#98A6BE]">{form.message.trim().length} / 500</p>
                </div>
                <button type="submit" disabled={!form.message.trim() || filled || sending || detail.loading} className="doa-btn doa-btn-primary w-full sm:w-auto">
                  <Send className="w-4 h-4" /> {sending ? '发送中…' : '发送申请'}
                </button>
                {applyError && (
                  <p className="text-[13px] text-[#E5484D]">{applyError}</p>
                )}
                {filled && (
                  <p className="text-[13px] text-[#E5484D]">该招募已停止接收新申请。</p>
                )}
              </form>
            )}
          </section>
          {manager && <RecruitmentApplications postId={post.id} onDecision={() => detail.reload()} />}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="doa-card p-6">
            <h3 className="font-bold text-[#0B1B3A] text-sm mb-4">发起人</h3>
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={post.leader.avatar} name={post.leader.name} className="w-12 h-12 rounded-2xl ring-2 ring-[#E4EFFF]" />
              <div className="min-w-0">
                <div className="font-bold text-[#1A2B4D] text-sm truncate">{post.leader.name}</div>
                <div className="text-[12px] text-[#6B7C9B] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {post.leader.city}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#6B7C9B] pt-4 border-t border-[#E3ECFA]">
              <Clock className="w-3.5 h-3.5" /> 发布于 {formatPostDate(post.createdAt)}
            </div>
          </section>

          <section className="doa-card p-6">
            <h3 className="font-bold text-[#0B1B3A] text-sm mb-3">团队情况</h3>
            <div className="space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#6B7C9B]">已收到申请</span>
                <span className="font-bold text-[#1A2B4D]">{post.applicationsCount} 份</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7C9B]">招募状态</span>
                <span className={`font-bold ${filled ? 'text-[#98A6BE]' : 'text-[#00B487]'}`}>
                  {filled ? '已招满' : '招募中'}
                </span>
              </div>
            </div>
          </section>

          <section className="doa-panel p-6">
            <h3 className="font-bold text-[#0B1B3A] text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#165DFF]" /> 创客提示
            </h3>
            <p className="text-[13px] text-[#48597A] leading-relaxed">
              大会期间的组队申请享有现场优先对接通道，优秀项目可被推荐给产业导师。
            </p>
          </section>
        </aside>
      </div>

      {/* Related */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">相似招募</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recruitments.filter(r => r.id !== post.id).slice(0, 3).map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRoute(`detail/recruit/${r.id}`)}
              className="doa-card doa-card-hover p-5 text-left"
            >
              <span className="doa-chip mb-3">{r.city}{r.isRemote ? ' · 可远程' : ''}</span>
              <h3 className="font-bold text-[#1A2B4D] text-sm leading-snug mb-2 line-clamp-2">{r.title}</h3>
              <p className="text-[12px] text-[#6B7C9B] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {r.applicationsCount} 人申请
              </p>
            </button>
          ))}
        </div>
      </section>
    </DetailShell>
  );
};
