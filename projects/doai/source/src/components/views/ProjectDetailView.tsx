import React from 'react';
import { useApp } from '../../context/AppContext';
import { readEntrySummary, registrationTrackLabel } from '../../lib/contestEntry';
import { registrationContact, registrationApplicant, registrationMaterials } from '../../lib/registrationApi';
import { CreatorCriteria } from '../contest/CreatorCriteria';
import { contest } from '../../data/plan';
import { DetailShell, NotFound } from '../detail/DetailShell';
import {
  Video, FileText, ExternalLink, Check, Clock, Users, Trophy, AlertCircle,
  CheckCircle2, XCircle, CircleDot,
} from 'lucide-react';

const statusMeta = {
  submitted: { label: '已提交', color: '#165DFF', desc: '材料已提交，等待机审与人工核验。', icon: CircleDot },
  reviewing: { label: '评审中', color: '#FF8A1F', desc: '专家正在评估技术完成度与落地价值。', icon: Clock },
  needs_info: { label: '待补充材料', color: '#FF8A1F', desc: '需要补充或更正材料后重新提交。', icon: AlertCircle },
  shortlisted: { label: '已入围决赛', color: '#00B487', desc: '恭喜！已入围现场路演决赛。', icon: CheckCircle2 },
  rejected: { label: '未通过', color: '#98A6BE', desc: '很遗憾，本次未能通过评审。', icon: XCircle },
} as const;

const PIPELINE = ['submitted', 'reviewing', 'shortlisted'] as const;

export const ProjectDetailView: React.FC<{ id?: string }> = ({ id }) => {
  const { registrations, registrationsLoading, registrationsError, reloadRegistrations, authLoading, setLoginModalOpen, setActiveRoute, currentUser, tr } = useApp();

  if (authLoading || registrationsLoading) return <p role="status" className="pt-32 pb-24 text-center text-sm text-[#6B7C9B]">{tr('正在加载报名记录…', 'Loading entries…')}</p>;
  if (!currentUser) return <div className="pt-32 pb-24 text-center space-y-5"><p>{tr('登录后查看参赛项目', 'Sign in to view your entry')}</p><button type="button" onClick={() => setLoginModalOpen(true)} className="doa-btn doa-btn-primary">{tr('登录', 'Sign in')}</button></div>;
  if (registrationsError) return <div className="pt-32 pb-24 text-center space-y-5" role="status"><p>{tr('报名记录暂时无法加载，请重试。', 'Entries could not be loaded. Please retry.')}</p><button type="button" onClick={() => void reloadRegistrations()} className="doa-btn doa-btn-secondary">{tr('重新加载报名', 'Reload entries')}</button></div>;
  const reg = registrations.find(r => r.id === id || r.makerId === id);
  if (!reg) return <NotFound what="该参赛项目" whatEn="This project" backRoute="dashboard" backLabel="返回我的 DOAI" backLabelEn="Back to My DOAI" />;

  const meta = statusMeta[reg.status];
  const StatusIcon = meta.icon;
  const stageIndex = PIPELINE.indexOf(reg.status as (typeof PIPELINE)[number]);


  return (
    <DetailShell
      backRoute="dashboard"
      backLabel="返回我的 DOAI"
      eyebrow={`${registrationTrackLabel(reg)} · ${reg.type === 'team' ? '团队参赛' : '个人参赛'}`}
      title={reg.projectName}
      subtitle={readEntrySummary(reg.projectSummary).summary}
      meta={[
        ...(readEntrySummary(reg.projectSummary).overseas ? [{ label: '所在国家／地区', value: readEntrySummary(reg.projectSummary).overseas!.countryOrRegion }, { label: '所属高校', value: readEntrySummary(reg.projectSummary).overseas!.university }] : []),
        { label: '申报方向', value: readEntrySummary(reg.projectSummary).entry || '原报名未记录具体方向' },
        { label: '团队名称', value: reg.teamName },
        { label: 'Maker ID', value: reg.makerId },
        { label: '提交时间', value: reg.submittedAt },
      ]}
      actions={
        <>
          <button type="button" onClick={() => setActiveRoute(`dashboard/registrations/${reg.id}`)} className="doa-btn doa-btn-primary">
            <FileText className="w-4 h-4" /> {tr('管理作品链接', 'Manage work links')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Review status */}
          <section className="doa-card p-6 sm:p-7">
            <div className="flex items-start gap-4 mb-6">
              <span
                className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white"
                style={{ background: meta.color }}
              >
                <StatusIcon className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-[#0B1B3A]">{meta.label}</h2>
                </div>
                <p className="text-[13px] text-[#6B7C9B]">{meta.desc}</p>
              </div>
            </div>

            {reg.status !== 'needs_info' && reg.status !== 'rejected' && (
              <ol className="flex items-center gap-2 sm:gap-4">
                {PIPELINE.map((s, i) => {
                  const m = statusMeta[s];
                  const done = stageIndex >= i && stageIndex !== -1;
                  const active = stageIndex === i;
                  return (
                    <li key={s} className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold transition-colors"
                          style={{ background: done ? m.color : '#E3ECFA' }}
                        >
                          {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </span>
                        <span className={`text-[11px] font-semibold whitespace-nowrap ${active ? 'text-[#0B1B3A]' : 'text-[#98A6BE]'}`}>
                          {m.label}
                        </span>
                      </div>
                      {i < PIPELINE.length - 1 && (
                        <span className="flex-1 h-0.5 rounded-full bg-[#E3ECFA] overflow-hidden">
                          <span
                            className="block h-full rounded-full transition-all"
                            style={{
                              width: stageIndex > i ? '100%' : '0%',
                              background: statusMeta[PIPELINE[i]].color,
                            }}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {reg.reviewFeedback && (
              <div className="mt-6 pt-5 border-t border-[#E3ECFA]">
                <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-2">评审意见</div>
                <p className="text-[13px] text-[#48597A] leading-[1.8]">{reg.reviewFeedback}</p>
              </div>
            )}

            {reg.needsInfoDetails && (
              <div className="mt-5 rounded-2xl bg-[#FFF8EC] border border-[#FFD79A] p-4">
                <div className="text-[12px] font-bold text-[#B25E00] mb-1.5">需要补充</div>
                <p className="text-[13px] text-[#7A4A00] leading-relaxed">{reg.needsInfoDetails}</p>
              </div>
            )}
          </section>

          {/* Materials */}
          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">提交材料</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Video, label: 'Demo 视频', value: reg.submission?.videoUrl || reg.videoUrl, href: reg.submission?.videoUrl || reg.videoUrl },
                { icon: ExternalLink, label: tr('在线 Demo', 'Live demo'), value: reg.submission?.demoUrl, href: reg.submission?.demoUrl },
                { icon: FileText, label: tr('GitHub 仓库', 'GitHub repository'), value: reg.submission?.githubUrl, href: reg.submission?.githubUrl },
                { icon: FileText, label: tr('在线项目简介文档', 'Project introduction document'), value: registrationMaterials(reg).docUrl, href: registrationMaterials(reg).docUrl },
              ].map((row, i) => {
                const Icon = row.icon;
                if (!row.href) return <div key={row.label} className="rounded-2xl border border-[#E3ECFA] p-4 text-xs text-[#6B7C9B]">{row.label} · {tr('尚未提交', 'Not submitted')}</div>;
                return (
                  <a
                    key={i}
                    href={row.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 p-4 rounded-2xl border border-[#E3ECFA] bg-[#F7FAFF] hover:border-[#A9CCFF] hover:bg-[#F2F7FF] transition-colors"
                  >
                    <span className="w-9 h-9 rounded-xl bg-[#E4EFFF] text-[#165DFF] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-1">{row.label}</div>
                      <div className="text-[13px] text-[#1A2B4D] font-medium truncate">{row.value}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#98A6BE] group-hover:text-[#165DFF] shrink-0" />
                  </a>
                );
              })}
            </div>
          </section>

          {/* Team */}
          <section aria-label="申报人资料" className="doa-card p-6 sm:p-7 [overflow-wrap:anywhere]">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-4">申报人资料</h2>
            {registrationApplicant(reg) ? <div className="text-sm space-y-2 text-[#48597A]">
              <p>公司/学校/机构组织名称：{registrationApplicant(reg)!.organization || "未填写"}</p><p>职位/在读年级：{registrationApplicant(reg)!.position || "未填写"}</p><p>年龄：{registrationApplicant(reg)!.age ?? "未填写"}</p>
              <p>申报人：{registrationApplicant(reg)!.name}</p>
              <p>申报城市：{registrationApplicant(reg)!.city}</p>
              <p>申报技能：{registrationApplicant(reg)!.skills.join('、') || '未填写'}</p>
              <p>{tr('申报邮箱：', 'Applicant email: ')}{registrationApplicant(reg)!.email || tr('未填写', 'Not provided')}</p>
              <p className="whitespace-pre-wrap">{tr('个人简介：', 'Personal introduction: ')}{registrationApplicant(reg)!.bio || tr('未填写', 'Not provided')}</p>
            </div> : <p className="text-sm text-[#6B7C9B]">原报名未留存申报人城市与技能资料。</p>}
          </section>

          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-5 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-[#165DFF]" /> 团队成员 ({reg.members.length})
            </h2>
            <div className="space-y-3">
              {reg.members.map((m, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-[#E3ECFA]">
                  <span className="w-10 h-10 rounded-2xl bg-[#E4EFFF] text-[#165DFF] flex items-center justify-center font-bold text-sm shrink-0">
                    {m.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[#1A2B4D] text-sm flex items-center gap-2">
                      {m.name}
                      {m.isLeader && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#165DFF] text-white font-semibold">队长</span>}
                    </div>
                    <div className="text-[12px] text-[#6B7C9B] mt-0.5">{m.roleTitle} · {m.isLeader ? (registrationContact(reg).phone || '未留存手机号') : m.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="doa-card p-6">
            <h3 className="font-bold text-[#0B1B3A] text-sm mb-4">{tr('评审维度', 'Judging criteria')}</h3>
            {reg.track === 'creator' ? <CreatorCriteria compact /> : <div className="space-y-3.5">
              {contest.dimensions.map(d => <p key={d} className="text-sm text-[#48597A]">{d}</p>)}
              <p className="text-xs text-[#98A6BE]">{tr('权重分配待评审委员会公布', 'Weights to be announced by the jury committee')}</p>
            </div>}
          </section>

          {reg.status === 'shortlisted' && (
            <section className="doa-panel p-6 border-[#A9CCFF] bg-[#F2F7FF]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-[#00B487]" />
                <h3 className="font-bold text-[#0B1B3A] text-sm">决赛准备</h3>
              </div>
              <p className="text-[13px] text-[#48597A] leading-relaxed mb-4">
                {tr('现场布展物料提交安排以组委会通知为准。决赛现场将进行 8 分钟 Demo 与 5 分钟答辩。', 'Follow the organisers’ notice for exhibition materials. Finals include an 8-minute demo and 5-minute Q&A.')}
              </p>
              <button type="button" onClick={() => setActiveRoute('maker/timeline')} className="doa-btn doa-btn-secondary w-full">
                <Clock className="w-4 h-4" /> 查看决赛日程
              </button>
            </section>
          )}

          <section className="doa-card p-6">
            <h3 className="font-bold text-[#0B1B3A] text-sm mb-3">邀请队友</h3>
            <p className="text-sm text-[#6B7C9B] mb-4">{tr('在「我的战队」中邀请互相关注的创客，确认组队申请后加入团队。', 'Invite makers who follow you back in My Team; members join by accepting the invitation.')}</p>
            <button type="button" onClick={() => setActiveRoute('dashboard/team')} className="doa-btn doa-btn-secondary">{tr('前往我的战队', 'Go to My Team')}</button>
          </section>
        </aside>
      </div>
    </DetailShell>
  );
};
