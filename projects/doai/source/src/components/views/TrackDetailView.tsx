import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { creatorIntroduction, creatorIntroductionEn, creatorDirections } from '../../data/creatorTrack';
import { TrackPanel } from '../contest/TrackPanel';

export const TrackDetailView: React.FC<{ track?: string }> = ({ track }) => {
  const { tr, setActiveRoute } = useApp();
  const industry = track === 'industry';
  return (
    <div className="pt-28 pb-24 max-w-[1200px] mx-auto px-6 sm:px-8">
      <button type="button" onClick={() => setActiveRoute('maker/tracks')} className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-[#165DFF] mb-8">
        <ArrowLeft className="w-4 h-4" /> {tr('返回赛事中心', 'Back to Contest')}
      </button>
      <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1B3A] mb-4">
        {industry ? tr('FDE 赛道', 'FDE Track') : tr('自由创意赛道', 'Free Creation Track')}
      </h1>
      <p className="text-sm text-[#666666] mb-8">
        {industry ? tr('命题制解题 · 企业真实场景 · 优先落地孵化', 'Real business briefs · priority incubation') : tr('真实需求 · 现有 AI 能力 · 可体验、可落地', 'Real needs · existing AI capabilities · usable, practical products')}
      </p>

      <div className="doa-card p-5 sm:p-8">
        {industry ? (
              <TrackPanel
                track="industry"
                accent="#165DFF"
                eyebrow="FDE 赛道"
                eyebrowEn="FDE Track"
                name={tr('FDE 赛道', 'FDE Track')}
                nameEn="FDE Track"
                tagline={tr('命题制解题 · 企业真实场景 · 优先落地孵化', 'Real business briefs · priority incubation')}
                taglineEn="Real business briefs · priority incubation"
                positioning={tr(
                  '大会发布真实产业命题，参赛团队定向解题。重点考察 AI 技术在真实产业场景中的落地能力与商业闭环，获奖项目优先对接企业采购订单与德必大虹桥园区落地孵化资源。',
                  'Real corporate briefs: solve the host’s problem, land the deal. Winners get priority access to enterprise POC orders and incubation at Dobe Greater Hongqiao Park.',
                )}
                directions={[
                  {
                    title: tr('飞书深诺 · 广告素材侵权风险快速筛查工具', 'SinoClick · Ad Creative Copyright Risk Screening'),
                    titleEn: 'SinoClick · Ad Creative Copyright Risk Screening',
                    desc: tr('拆分广告素材元素并逐项反向检索，输出侵权风险评估报告。', 'Element-level reverse image search and copyright risk reports for ad creatives.'),
                    descEn: 'Element-level reverse image search and copyright risk reports for ad creatives.',
                  },
                  {
                    title: tr('上服集团 · 海派定制服饰 AI 需求解构与可视化 Agent', 'SF Group · Bespoke Fashion Requirements and Visualization Agent'),
                    titleEn: 'SF Group · Bespoke Fashion Requirements and Visualization Agent',
                    desc: tr('解构定制需求、匹配集团资源，生成方案初稿、视觉提示词与业务台账。', 'Bespoke fashion requirements, resource matching, draft proposals and visualization support.'),
                    descEn: 'Bespoke fashion requirements, resource matching, draft proposals and visualization support.',
                  },
                ]}
                briefLede="两条真实企业命题，由命题方给出业务场景、交付物与验收口径。细则尚未发布的命题如实标注，以命题方后续公布为准。"
                briefLedeEn="Two real corporate briefs. Briefs whose details are not published yet are labelled as such — no placeholder detail is invented."
                rulesLede="命题制解题：报名、提交、初筛、路演、现场签约，逐条说明。"
                rulesLedeEn="From entry to pitch and on-site POC signing."
                reviewFocus="与企业真实业务需求的匹配度"
                reviewFocusEn="Fit with real business needs"
                emphasis="需求匹配度"
                materials={[
                  '项目说明文档：架构、数据来源与业务闭环',
                  '3 分钟 Demo 视频（公开直链，可访问）',
                  '在线 Demo / 官网（选填）',
                  '在线项目简介文档，如飞书（选填）',
                  '对照命题要求的逐条方案说明',
                ]}
                requirements={[
                  '参赛团队 2—5 人（含队长），或个人独立参赛',
                  '报名及评审全程免费，知识产权 100% 归团队所有',
                  '申报时须选择本赛道下的一个命题方向',
                  '作品提交阶段需提供 Demo 视频；在线 Demo / 官网、GitHub 仓库与在线项目简介文档选填',
                ]}
                registerRoute="register/industry"
              />
        ) : (
              <TrackPanel
                track="creator"
                accent="#00C48C"
                eyebrow="自由创意赛道"
                eyebrowEn="Free Creation Track"
                name={tr('自由创意赛道', 'Free Creation Track')}
                nameEn="Free Creation Track"
                tagline={tr('真实需求 · 现有 AI 能力 · 可体验、可落地', 'Real needs · existing AI capabilities · usable, practical products')}
                taglineEn="Real needs · existing AI capabilities · usable, practical products"
                positioning={tr(creatorIntroduction, creatorIntroductionEn)}
                directions={creatorDirections.map(direction => ({
                  title: direction.title,
                  titleEn: direction.titleEn,
                  desc: `${direction.tagline}。${direction.desc}`,
                  descEn: `${direction.taglineEn}. ${direction.descEn}`,
                }))}
                briefLede="不设命题方：在三条方向内自选题目，独立评审、独立评奖。下面是开放命题的提交口径与评审方式。"
                briefLedeEn="No host brief: pick any of the three directions. Judged and awarded independently."
                rulesLede="开放命题：报名、提交、初筛、路演、评奖，逐条说明。"
                rulesLedeEn="From entry to pitch and awards, with no host brief attached."
                reviewFocus="创意、落地与商业潜力"
                reviewFocusEn="Creativity, practical delivery and commercial potential"
                emphasis=""
                materials={[
                  '项目说明文档：架构、数据来源与技术边界',
                  '3 分钟 Demo 视频（公开直链，可访问）',
                  '在线 Demo / 官网（选填）',
                  '在线项目简介文档，如飞书（选填）',
                  'GitHub 仓库链接（选填）',
                ]}
                requirements={[
                  '参赛团队 2—5 人（含队长），或个人独立参赛',
                  '报名及评审全程免费，知识产权 100% 归团队所有',
                  '开放命题，报名即起可申报',
                  '作品提交阶段需提供 Demo 视频；在线 Demo / 官网、GitHub 仓库与在线项目简介文档选填',
                ]}
                registerRoute="register/creator"
              />
        )}
      </div>
    </div>
  );
};
