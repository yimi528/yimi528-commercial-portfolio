import React from 'react';
import { Award, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DetailShell } from '../detail/DetailShell';

export const ShowcaseView: React.FC = () => {
  const { tr, setActiveRoute } = useApp();
  return (
    <DetailShell backRoute="home" backLabel={tr('返回首页', 'Back to home')} eyebrow="PROJECT SHOWCASE"
      title={tr('项目展示', 'Project Showcase')}
      subtitle={tr('探索 DOAI 入围项目与创客作品。', 'Explore DOAI finalist projects and maker creations.')}>
      <section className="rounded-2xl border border-[#E3ECFA] bg-[#F7FAFF] px-6 py-14 text-center">
        <Award className="w-10 h-10 mx-auto text-[#165DFF]" />
        <h2 className="mt-5 text-xl font-bold text-[#0B1B3A]">{tr('入围项目待公布', 'Finalist projects to be announced')}</h2>
        <p className="mt-3 mx-auto max-w-lg text-sm leading-relaxed text-[#6B7C9B]">
          {tr('公开展示名单将在评审后公布，届时可在这里浏览作品。当前暂无公开作品或投票活动。', 'The public showcase will be announced after judging. There are no public projects or active votes yet.')}
        </p>
        <button type="button" onClick={() => setActiveRoute('maker/tracks')} className="doa-btn doa-btn-primary mt-7">
          {tr('了解参赛赛道', 'Explore contest tracks')} <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </DetailShell>
  );
};
