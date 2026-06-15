import React, { useState } from 'react';
import { ImageOff, ExternalLink } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  fallbackIcon?: React.ReactNode;
  lang?: 'am' | 'en';
}

export function SafeImage({
  src,
  alt,
  className = '',
  referrerPolicy = 'no-referrer',
  fallbackIcon,
  lang = 'am'
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(src, '_blank');
  };

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 border border-brand-border/35 text-brand-text-secondary ${className}`}>
        {fallbackIcon || <ImageOff size={24} className="opacity-40" />}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-slate-950 border border-rose-950/40 text-brand-text-secondary text-center relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-rose-950/5 animate-pulse" />
        <ImageOff size={28} className="text-rose-500/60 mb-2 animate-bounce" />
        <p className="text-[10px] font-medium text-rose-200/80 mb-2 leading-relaxed">
          {lang === 'am' 
            ? 'ምስሉ ሊሰናዳ አልቻለም። የኔትወርክ ወይም የቅርጸት ችግር ሊሆን ይችላል።' 
            : 'Image could not be loaded. This might be a network or file format issue.'}
        </p>
        <button
          onClick={handleOpenExternal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent/20 hover:bg-brand-accent/35 border border-brand-accent/30 text-brand-accent text-[10px] font-bold rounded-lg transition-all active:scale-95"
        >
          <ExternalLink size={12} />
          {lang === 'am' ? 'በውጭ መስኮት ክፈት' : 'Open Externally'}
        </button>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy={referrerPolicy}
      onError={() => setHasError(true)}
    />
  );
}
