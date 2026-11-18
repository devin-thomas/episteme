import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ResilientImage({ src, alt, className = '', fallbackLabel }: ResilientImageProps) {
  const [stage, setStage] = useState<'direct' | 'proxy' | 'fallback'>(src ? 'direct' : 'fallback');

  if (!src || stage === 'fallback') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 ${className}`}
        aria-label={alt}
      >
        <ImageOff className="w-5 h-5" />
        <span className="text-[11px] font-medium px-2 text-center truncate max-w-full">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  const resolvedSrc =
    stage === 'proxy' ? `/api/image-proxy?url=${encodeURIComponent(src)}` : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        if (stage === 'direct') {
          setStage('proxy');
        } else {
          setStage('fallback');
        }
      }}
    />
  );
}
