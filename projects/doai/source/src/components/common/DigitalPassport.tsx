import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X } from 'lucide-react';
import type { DigitalTicket, User } from '../../types';
import passportMark from '../../assets/images/doai-passport-mark.svg';
import './DigitalPassport.css';

export const DigitalPassport: React.FC<{
  user: User;
  makerId?: string;
  ticket?: DigitalTicket;
  tr: (zh: string, en?: string) => string;
}> = ({ user, makerId, ticket, tr }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  // An open entry code must never survive an account or pass change.
  useEffect(() => { dialog.current?.close(); }, [user.id, ticket?.id, ticket?.qrCode, ticket?.status]);

  return (
    <section aria-labelledby="passport-heading" className="passport-stage">
      <h2 id="passport-heading" className="sr-only">{tr('数字身份卡', 'Digital identity card')}</h2>
      <div className="passport-frame">
        <article className="passport-card" aria-label={tr(`${user.name} 的 DOAI 数字身份卡`, `${user.name}'s DOAI identity card`)}>
          <svg className="passport-orbit" viewBox="0 0 340 340" fill="none" aria-hidden="true">
            <circle cx="170" cy="170" r="139" />
            <ellipse cx="170" cy="170" rx="139" ry="63" transform="rotate(-34 170 170)" />
            <ellipse cx="170" cy="170" rx="73" ry="139" transform="rotate(-34 170 170)" />
          </svg>
          <div className="passport-topline">
            <div className="passport-brand"><img src={passportMark} alt="DOAI" draggable={false} /><span>Passport</span></div>
            {user.atomclubBound && <span className="passport-linked"><span aria-hidden="true" />{tr('身份已绑定', 'Identity linked')}</span>}
          </div>
          <div className="passport-identity">
            <p className="passport-label">{tr('创客身份', 'Maker identity')}</p>
            <p className="passport-name">{user.name}</p>
          </div>
          <div className="passport-number">
            <p className="passport-label">{makerId ? tr('创客编号', 'Maker ID') : tr('账号 ID', 'Account ID')}</p>
            <code data-testid="maker-identifier">{makerId || user.id}</code>
          </div>
          <div className="passport-bottomline">
            <span>{user.skills.length ? user.skills.join(' · ') : tr('DOAI 创客社区', 'DOAI Maker Community')}</span>
            {user.city && <span>{user.city}</span>}
          </div>
        </article>
        <div className="passport-controls">
          <p>{tr('数字身份卡', 'Digital identity card')}</p>
          {ticket && <button type="button" onClick={() => dialog.current?.showModal()} className="passport-show-code"><QrCode aria-hidden="true" size={16} />{tr('出示入场码', 'Show entry code')}</button>}
        </div>
      </div>
      {ticket && <dialog ref={dialog} className="passport-code-dialog" aria-labelledby="passport-code-heading" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="passport-code-content">
          <button type="button" className="passport-code-close" aria-label={tr('关闭入场码', 'Close entry code')} onClick={() => dialog.current?.close()}><X aria-hidden="true" size={20} /></button>
          <h3 id="passport-code-heading">{tr('入场二维码', 'Entry QR')}</h3>
          <p className="passport-code-holder">{user.name}</p>
          <div data-testid="passport-qr" className="passport-code-image"><QRCodeSVG value={ticket.qrCode} size={220} level="M" marginSize={4} /></div>
          <p className="passport-code-hint">{tr('请向现场工作人员出示此码核销入场', 'Show this code to event staff for check-in')}</p>
        </div>
      </dialog>}
    </section>
  );
};
