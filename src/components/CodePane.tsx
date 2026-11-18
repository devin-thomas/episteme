import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface CodePaneProps {
  sdkCode: string;
  curlCode: string;
  sdkBadge: string;
  codeLanguage: string;
  docsUrl: string;
}

export function CodePane({ sdkCode, curlCode, sdkBadge, codeLanguage, docsUrl }: CodePaneProps) {
  const [mode, setMode] = useState<'sdk' | 'curl'>('sdk');
  const [copied, setCopied] = useState(false);

  const activeCode = mode === 'sdk' ? sdkCode : curlCode;
  const lines = activeCode.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="flex flex-col bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-full">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-md">
          <button
            type="button"
            onClick={() => setMode('sdk')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'sdk'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {sdkBadge}
          </button>
          <button
            type="button"
            onClick={() => setMode('curl')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'curl'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            HTTP / curl
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-1.5 border-b border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          {mode === 'sdk' ? `Language: ${codeLanguage}` : 'Shell: curl'}
        </span>
        <span className="tabular-nums">{lines.length} lines</span>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-100 text-[12.5px] leading-6 font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/70">
                <td className="select-none pr-4 text-right text-slate-600 tabular-nums w-8 align-top">
                  {idx + 1}
                </td>
                <td className="whitespace-pre text-slate-100">{line || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
