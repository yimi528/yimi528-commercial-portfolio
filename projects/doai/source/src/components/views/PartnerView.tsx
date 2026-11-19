import React, { useState } from 'react';
import { DetailShell } from '../detail/DetailShell';
import { useApp } from '../../context/AppContext';
import { collabTiers, contentModels, collabValue, collabContact } from '../../data/showcase';
import { ArrowRight, Mail, MessageCircle } from 'lucide-react';

/**
 * 招商合作 · 四层权益与报价（方案 A 从大会介绍页迁出）
 *
 * 这一页的读者是合作方，不是参会者：他们要看的是层级、权益、价格和联系人。
 * 独立成页后，大会介绍页不再为这批读者把报名按钮推到第 9 屏。
 */
export const PartnerView: React.FC = () => {
  const { tr, lang } = useApp();
  const en = lang === 'en';
  const [copyStatus, setCopyStatus] = useState('');
  const showContact = () => document.getElementById('partnership-contact')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(collabContact.emails[0]);
      setCopyStatus(tr('邮箱已复制，可粘贴到邮件或微信中联系。', 'Email copied. Paste it into your email app or WeChat.'));
    } catch {
      setCopyStatus(tr('请长按或选中上方邮箱复制。', 'Select the email address above to copy it.'));
    }
  };

  return (
    <DetailShell
      backRoute="conference"
      backLabel={tr('返回大会介绍', 'Back to the conference')}
      eyebrow="PARTNERSHIP"
      title={tr('招商合作 · 四层权益', 'Partnership · Four Tiers')}
      subtitle={tr(
        '从两千的广告位到二十万的冠名，四层阶梯摆在明面上：每一层花多少、换什么，都写在下面。',
        'From a ¥2,000 ad slot to a ¥200,000 title sponsorship — four tiers, with what you pay and what you get stated plainly.',
      )}
      actions={
        <button
          type="button" onClick={showContact}
          className="doa-btn doa-btn-primary"
        >
          <Mail className="w-4 h-4" />
          {tr('发送合作咨询', 'Email us')}
        </button>
      }
    >
      {/* 报价单式阶梯：层级 / 权益 / 预算 三栏对齐 */}
      <section className="mt-2">
        <div className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[3.5rem_1fr_9rem] items-baseline gap-x-5 border-b border-[#0B1B3A] pb-2">
          <span className="text-[10.5px] text-[#98A6BE]">{tr('层级', 'Tier')}</span>
          <span className="text-[10.5px] text-[#98A6BE]">{tr('权益', 'Benefits')}</span>
          <span className="hidden sm:block text-[10.5px] text-[#98A6BE] text-right">
            {tr('预算', 'Budget')}
          </span>
        </div>

        {collabTiers.map(t => (
          <div
            key={t.tier}
            className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[3.5rem_1fr_9rem] items-start gap-x-5 gap-y-2 border-b border-[#E3ECFA] py-6"
          >
            <span className="pt-[3px] text-[11px] font-semibold tabular-nums text-[#165DFF]">
              {en ? t.tierEn : t.tier}
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-[#0B1B3A]">{en ? t.nameEn : t.name}</h3>
              <ul className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {(en ? t.pointsEn : t.points).map((pt, i) => (
                  <li key={i} className="flex items-center gap-3 text-[11.5px] text-[#6B7C9B]">
                    {i > 0 && <span aria-hidden="true" className="h-2.5 w-px bg-[#D3DFF1]" />}
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <span className="col-start-2 sm:col-start-3 text-[14px] font-extrabold tabular-nums text-[#0B1B3A] sm:text-right">
              {en ? t.priceEn : t.price}
            </span>
          </div>
        ))}
      </section>

      {/* 内容合作 · 两种深度绑定 */}
      <section className="mt-16">
        <h2 className="text-[14px] font-bold text-[#0B1B3A]">
          {tr('内容合作 · 两种深度绑定', 'Content Partnership: Two Deeper Models')}
        </h2>
        <p className="mt-1.5 mb-5 max-w-xl text-[11.5px] leading-relaxed text-[#6B7C9B]">
          {tr(
            '冠名一场分会场，或者直接把题目出出来——比买展位更深，双方也都要多花工夫。',
            'Name a session, or set the brief yourself — deeper than a booth, and more work on both sides.',
          )}
        </p>

        <div className="border-t border-[#0B1B3A]">
          {contentModels.map(m => (
            <div
              key={m.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] items-start gap-x-6 gap-y-3 border-b border-[#E3ECFA] py-5"
            >
              <div className="min-w-0">
                <div className="text-[10.5px] text-[#98A6BE]">{en ? m.tagEn : m.tag}</div>
                <h3 className="mt-0.5 text-[14px] font-bold text-[#0B1B3A]">{en ? m.nameEn : m.name}</h3>
                <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {(en ? m.pointsEn : m.points).map((pt, i) => (
                    <li key={i} className="relative pl-3 text-[11.5px] leading-relaxed text-[#48597A]">
                      <span aria-hidden="true" className="absolute left-0 top-[7px] h-[3px] w-[3px] bg-[#A9CCFF]" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <span className="text-[12.5px] font-bold tabular-nums text-[#165DFF] sm:text-right">
                {en ? m.priceEn : m.price}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 一次合作，四重回报 */}
      <section className="mt-16">
        <h2 className="text-[14px] font-bold text-[#0B1B3A] mb-4">
          {tr('一次合作，四重回报', 'One Deal, Four Returns')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
          {collabValue.map(v => (
            <div key={v.key} className="border-t border-[#E3ECFA] pt-4">
              <div className="text-[15px] font-extrabold text-[#0B1B3A]">{en ? v.keyEn : v.key}</div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#6B7C9B]">
                {en ? v.descEn : v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 对接方式 */}
      <section id="partnership-contact" className="scroll-mt-24 mt-16 bg-[#0B1B3A] px-6 py-8 sm:px-10 sm:py-9">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-7">
          <div>
            <div className="text-[10.5px] tracking-[0.18em] text-white/45">
              {tr('招商合作对接', 'PARTNERSHIP CONTACT')}
            </div>
            <div className="mt-3 text-[17px] font-bold leading-none text-white">
              {en ? collabContact.orgEn : collabContact.org}
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/65">
              {collabContact.emails.map(e => (
                <span key={e} className="inline-flex items-center gap-1.5 tabular-nums">
                  <Mail className="w-3.5 h-3.5" />
                  {e}
                </span>
              ))}
              <span aria-hidden="true" className="h-3 w-px bg-white/20" />
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {tr('微信', 'WeChat')} {collabContact.wechat}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3">
            <button type="button" onClick={() => void copyEmail()} className="rounded-full bg-white px-6 py-3 text-xs font-semibold text-[#0B1B3A]">
              {tr('复制合作邮箱', 'Copy contact email')}
            </button>
            <a
              href={`mailto:${collabContact.emails[0]}?subject=${encodeURIComponent('DOAI 2026 合作咨询')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-6 py-3 text-[12px] font-semibold text-[#0B1B3A] transition-colors hover:bg-[#E3ECFA] sm:self-end"
            >
              {tr('用邮件客户端发送', 'Open email app')}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-white/65" role="status">{copyStatus || tr('若未打开邮件应用，可复制邮箱发送，或添加上述微信联系。Windows 用户请检查系统的默认邮件应用设置。', 'If no email app opens, copy the address or use the WeChat contact above. On Windows, check your default email app settings.')}</p>
      </section>
    </DetailShell>
  );
};
