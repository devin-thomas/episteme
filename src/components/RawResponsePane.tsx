import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface RawResponsePaneProps {
  data: unknown;
}

export function RawResponsePane({ data }: RawResponsePaneProps) {
  const [copied, setCopied] = useState(false);

  const formatted =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">
          {formatted.split('\n').length} lines · {(formatted.length / 1024).toFixed(1)} KB formatted
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy payload'}</span>
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-[12px] leading-5 font-mono text-slate-800 dark:text-slate-200 bg-slate-50/60 dark:bg-[#0d111a] whitespace-pre-wrap break-words">
        {formatted}
      </pre>
    </div>
  );
}
