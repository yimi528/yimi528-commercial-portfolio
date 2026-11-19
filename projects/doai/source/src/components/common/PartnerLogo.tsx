import React, { useEffect, useRef, useState } from 'react';
import { preparePartnerLogo } from '../../lib/partnerLogo';

export const PartnerLogo: React.FC<{ src: string; alt: string; className?: string; align?: 'left' | 'center' }> = ({ src, alt, className = '', align = 'center' }) => {
  const vector = /\.svg(?:[?#]|$)/i.test(src) || src.startsWith('data:image/svg+xml');
  const [rendered, setRendered] = useState<{ source: string; url: string } | null>(null);
  const frame = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (vector) return;
    let live = true;
    const prepare = () => {
      void preparePartnerLogo(src).then(url => {
        if (live) setRendered({ source: src, url });
      }).catch(() => { /* Keep the original artwork visible if processing is unavailable. */ });
    };
    if (!('IntersectionObserver' in window)) prepare();
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { observer?.disconnect(); prepare(); }
    }, { rootMargin: '300px' }) : null;
    if (frame.current) observer?.observe(frame.current);
    return () => { live = false; observer?.disconnect(); };
  }, [src, vector]);
  // SVGs stay vector at every zoom/DPR; never rasterize brand wordmarks.
  if (vector) return <span role="img" aria-label={alt} data-partner-logo="vector" className={`block min-w-0 ${className}`}>
    <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" className={`h-full w-full object-contain mix-blend-multiply ${/fluxverse/i.test(src) ? 'invert' : ''} ${align === 'left' ? 'object-left' : ''}`} />
  </span>;
  const ready = rendered?.source === src;
  return <span ref={frame} role="img" aria-label={alt} data-partner-logo={ready ? 'adapted' : 'original'} className={`relative block min-w-0 ${className}`}>
    <img src={ready ? rendered.url : src} data-original-src={src} onError={() => { if (ready) setRendered(null); }} alt="" aria-hidden="true" loading="lazy" decoding="async" className={`h-full w-full object-contain ${align === 'left' ? 'object-left' : ''}`} />
  </span>;
};
