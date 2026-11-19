import React, { useEffect, useRef, useState } from 'react';
import { QrCode } from 'lucide-react';
import communityQr from '../../assets/images/community-qr.jpg';

export const CommunityQrCode: React.FC<{ lang: 'zh' | 'en' }> = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const zh = lang === 'zh';

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onPointerEnter={event => { if (event.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') setOpen(false); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    >
      <button
        type="button"
        aria-label={zh ? '社群二维码' : 'Community QR code'}
        aria-expanded={open}
        aria-controls="doai-community-qr"
        onClick={() => setOpen(true)}
        onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setOpen(true); }}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] ${open ? 'bg-[#F2F7FF] text-[#165DFF]' : 'text-[#555555] hover:text-[#165DFF] hover:bg-[#F2F7FF]'}`}
      >
        <QrCode className="w-[18px] h-[18px]" aria-hidden="true" />
      </button>
      {open && (
        // Padding bridges the trigger and card so hovering the QR keeps it open.
        <div id="doai-community-qr" className="absolute right-0 top-full z-[60] w-[248px] max-w-[calc(100vw-24px)] pt-3">
          <div className="rounded-2xl border border-[#E3ECFA] bg-white p-4 text-center shadow-[0_16px_40px_rgba(11,27,58,0.15)]">
            <p className="text-sm font-semibold text-[#0B1B3A]">{zh ? '加入 DOAI 社群' : 'Join the DOAI community'}</p>
            <img src={communityQr} alt={zh ? 'DOAI 社群二维码' : 'DOAI community QR code'} width={396} height={396} className="mt-3 w-full h-auto" />
            <p className="mt-3 text-xs leading-relaxed text-[#48597A]">{zh ? '微信扫码，加入社群' : 'Scan with WeChat to join'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
