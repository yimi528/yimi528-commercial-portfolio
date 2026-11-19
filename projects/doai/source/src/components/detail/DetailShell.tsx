/**
 * Shared shell for every detail page: a back link, a title block, and the
 * standard page container. Keeps the five detail views visually consistent.
 */
import React from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronLeft } from 'lucide-react';

export const DetailShell: React.FC<{
  backRoute: string;
  backLabel: string;
  backLabelEn?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: { label: string; labelEn?: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ backRoute, backLabel, backLabelEn, eyebrow, title, subtitle, meta, actions, children }) => {
  const { setActiveRoute, lang } = useApp();
  const en = lang === 'en';

  return (
    <div className="pt-[72px] bg-white min-h-screen">
      <div className="doa-container py-8 sm:py-10">
        <button
          type="button"
          onClick={() => setActiveRoute(backRoute)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7C9B] hover:text-[#165DFF] transition-colors mb-6 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] rounded-md px-1 -ml-1"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          {en ? (backLabelEn ?? backLabel) : backLabel}
        </button>

        <header className="mb-8 sm:mb-10">
          {eyebrow && <div className="doa-eyebrow mb-3">{eyebrow}</div>}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B1B3A] tracking-tight leading-[1.15] break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-sm sm:text-[15px] text-[#48597A] leading-relaxed max-w-3xl break-words">{subtitle}</p>
          )}

          {meta && meta.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {meta.map(m => (
                <div key={m.label} className="min-w-0 max-w-full">
                  <dt className="text-[11px] uppercase tracking-widest text-[#98A6BE] font-semibold">
                    {en ? (m.labelEn ?? m.label) : m.label}
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-[#1A2B4D] break-words">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
        </header>

        {children}
      </div>
    </div>
  );
};

export const NotFound: React.FC<{
  what: string;
  whatEn?: string;
  backRoute: string;
  backLabel: string;
  backLabelEn?: string;
}> = ({ what, whatEn, backRoute, backLabel, backLabelEn }) => {
  const { tr, lang, setActiveRoute } = useApp();
  const en = lang === 'en';
  return (
    <div className="pt-[72px] bg-white min-h-screen flex items-center">
      <div className="doa-container py-20 text-center">
        <div className="text-5xl mb-4">🗂️</div>
        <h1 className="text-xl font-bold text-[#0B1B3A] mb-2">
          {en ? `${whatEn ?? what} not found` : `${what}不存在或已下架`}
        </h1>
        <p className="text-sm text-[#6B7C9B] mb-6">
          {tr('该内容可能已被移除，或链接有误。', 'It may have been removed, or the link is incorrect.')}
        </p>
        <button type="button" onClick={() => setActiveRoute(backRoute)} className="doa-btn doa-btn-primary">
          {en ? (backLabelEn ?? backLabel) : backLabel}
        </button>
      </div>
    </div>
  );
};
