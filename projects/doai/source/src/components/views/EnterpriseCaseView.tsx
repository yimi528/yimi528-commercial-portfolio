import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { shangfuCases, shangfuWorkflow } from '../../data/shangfuCases';

const asset = (name: string) => `${import.meta.env.BASE_URL}cases/shangfu/${name}`;
export const EnterpriseCaseView: React.FC = () => {
  const { tr, setActiveRoute } = useApp();
  return <div className="mx-auto max-w-[1200px] px-6 pt-28 pb-24 sm:px-8">
    <button onClick={() => setActiveRoute('track/industry')} className="mb-8 inline-flex items-center gap-2 text-sm text-[#165DFF]"><ArrowLeft size={16} />{tr('返回 FDE 赛道', 'Back to FDE')}</button>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-xs font-semibold text-[#165DFF]">FDE · {tr('企业真实案例', 'Real Enterprise Cases')}</p><h1 className="mt-3 text-3xl font-bold text-[#0B1B3A]">{tr('上服集团定制服饰案例及工作流', 'SF Group Bespoke Fashion Cases & Workflow')}</h1><p className="mt-4 text-sm text-[#6B7C9B]">{tr('来源：上服集团提供的 2026 年 11 月 2 日案例及工作流。以下保留原始需求、设计语言和示例图片。', 'Source: SF Group case and workflow document dated November 2, 2026. Original Chinese requirements, design specifications and images follow.')}</p></div>
      <a href={asset('shangfu-cases-workflow.docx')} download className="doa-btn doa-btn-secondary inline-flex items-center gap-2"><Download size={16} />{tr('下载原始文档', 'Download source document')}</a>
    </div>
    <nav aria-label={tr('案例导航', 'Case navigation')} className="my-8 flex flex-wrap gap-3"><a href="#real-cases" className="doa-btn doa-btn-ghost">{tr('六个真实案例', 'Six real cases')}</a><a href="#case-workflow" className="doa-btn doa-btn-ghost">{tr('完整工作流程', 'Full workflow')}</a></nav>
    <section id="real-cases" className="scroll-mt-28"><h2 className="mb-5 text-2xl font-bold">{tr('客户需求与设计语言转化', 'Customer requirements & design specifications')}</h2><div className="space-y-5">{shangfuCases.map((item, index) => <details key={item.title} open={index === 0} className="doa-card p-5 sm:p-7"><summary className="cursor-pointer text-lg font-bold text-[#0B1B3A]">{item.title}</summary><div className="mt-5 space-y-3 text-sm leading-7 text-[#48597A]">{item.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-2">{item.images.map((name, i) => <img key={name} src={asset(name)} alt={`案例${index + 1} 原文配图 ${i + 1}`} loading="lazy" className="max-h-[560px] w-full rounded-xl bg-[#F7F8FA] object-contain" />)}</div></details>)}</div></section>
    <section id="case-workflow" className="mt-14 scroll-mt-28"><h2 className="text-2xl font-bold">{tr('完整工作流程（案例六）', 'Full workflow (Case 6)')}</h2><p className="mt-3 text-sm text-[#6B7C9B]">{tr('需求转化 → 设计图 → 选面料 → 版型设计 → 打样 → 成衣', 'Requirements → Design → Fabric → Pattern → Sample → Garment')}</p><ol className="mt-6 space-y-5">{shangfuWorkflow.map((step, index) => <li key={step.title} className="doa-card p-5 sm:p-7"><h3 className="text-lg font-bold text-[#165DFF]">{index + 1}. {step.title.replace(/^\d+\.\s*/, '')}</h3><div className="mt-4 space-y-3 text-sm leading-7 text-[#48597A]">{step.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2">{step.images.map((name, i) => <img key={name} src={asset(name)} loading="lazy" alt={`${step.title} 原文配图 ${i + 1}`} className="max-h-[560px] w-full rounded-xl object-contain" />)}</div></li>)}</ol></section>
  </div>;
};
