import type { ReactNode } from 'react';

export function PreviewEmpty({ children = 'No results for these parameters.' }: { children?: ReactNode }) {
  return <p className="p-6 text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

export function PreviewLink({ href, children }: { href?: string | null; children: ReactNode }) {
  let safe = false;
  try { safe = ['https:', 'http:'].includes(new URL(href ?? '').protocol); } catch { /* Render plain text for absent or unsafe links. */ }
  return safe ? <a href={href!} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-words">{children}</a> : <span>{children}</span>;
}

export function DataTable({ headers, rows, caption }: { headers: string[]; rows: ReactNode[][]; caption?: string }) {
  if (!rows.length) return <PreviewEmpty />;
  return <div className="p-5 overflow-x-auto"><table className="w-full text-sm text-left">
    {caption && <caption className="text-left text-xs text-slate-500 dark:text-slate-400 pb-3">{caption}</caption>}
    <thead><tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">{headers.map((h) => <th key={h} scope="col" className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="py-3 pr-4 align-top break-words">{cell ?? '—'}</td>)}</tr>)}</tbody>
  </table></div>;
}

export function StatGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <dl className="grid grid-cols-2 sm:grid-cols-3 gap-5 p-5">{items.map(({label,value}) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 font-semibold tabular-nums break-words">{value ?? '—'}</dd></div>)}</dl>;
}

export function formatNumber(value: unknown, digits = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: digits }) : '—';
}
