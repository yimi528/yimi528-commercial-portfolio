import React, { useState } from 'react';
import { avatarImageUrl, avatarInitial } from '../../lib/avatar';

/** User images can be missing or expire; keep the same footprint with an initial. */
export const Avatar: React.FC<{ src?: string; name: string; className?: string; draggable?: boolean }> = ({ src, name, className = '', draggable }) => {
  const [failed, setFailed] = useState<string | null>(null);
  const image = avatarImageUrl(src) || '';
  if (image && image !== failed) return <img src={image} alt={name} draggable={draggable} referrerPolicy="no-referrer" onError={() => setFailed(image)} className={`shrink-0 object-cover ${className}`} />;
  return <span role="img" aria-label={name || 'Avatar'} className={`shrink-0 flex items-center justify-center overflow-hidden bg-[#E4EFFF] text-[#165DFF] font-bold ${className}`}>{avatarInitial(name, '?')}</span>;
};
