import { ResilientImage } from '../ResilientImage';
import { DataTable, PreviewEmpty, PreviewLink, StatGrid, formatNumber } from './PreviewPrimitives';

type JsonRecord = Record<string, any>;
const records = (value: unknown): JsonRecord[] => Array.isArray(value)
  ? value.filter((row) => row !== null && typeof row === 'object' && !Array.isArray(row)) : [];

export function Phase4Visuals({ apiId, data }: { apiId: string; data: unknown }) {
  const d = data as JsonRecord;
  if (!d || typeof d !== 'object') return null;
  switch (apiId) {
    case 'osv-vulnerabilities': {
      const rows = records(d.vulns);
      return <div>
        {rows.length ? <DataTable caption={`${rows.length} vulnerability records on this page`} headers={['Record', 'Summary', 'Aliases']} rows={rows.map((v: JsonRecord) => [
          <PreviewLink href={`https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`}>{v.id}</PreviewLink>,
          v.summary || v.details?.slice(0, 180) || 'No summary supplied',
          Array.isArray(v.aliases) ? v.aliases.slice(0, 4).join(', ') : '—',
        ])} /> : <PreviewEmpty>{d.next_page_token ? 'No records on this page. Continue with the next page token.' : 'No matching vulnerability records returned. This is not a guarantee that the package is safe.'}</PreviewEmpty>}
        {d.next_page_token && <div className="px-5 pb-5 text-xs space-y-2"><p>More records are available. Paste this into Page token and run again:</p><code className="block break-all text-slate-500">{d.next_page_token}</code></div>}
      </div>;
    }
    case 'pubchem-compounds': {
      const compounds = d.PropertyTable?.Properties;
      if (!Array.isArray(compounds)) return null;
      if (!compounds.length) return <PreviewEmpty />;
      return <div className="divide-y divide-slate-200 dark:divide-slate-800">{records(compounds).slice(0, 4).map((p: JsonRecord) => <article key={p.CID} className="p-5">
        <div className="flex flex-col sm:flex-row gap-5">
          <ResilientImage key={p.CID} src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${p.CID}/PNG`} alt={`Molecular structure of PubChem compound ${p.CID}`} className="w-36 h-36 object-contain bg-white rounded border border-slate-200" />
          <div className="min-w-0"><h3 className="font-semibold break-words">{p.IUPACName || `Compound ${p.CID}`}</h3><div className="text-sm mt-2"><PreviewLink href={`https://pubchem.ncbi.nlm.nih.gov/compound/${p.CID}`}>PubChem CID {p.CID}</PreviewLink></div><p className="text-xs font-mono mt-3 break-all text-slate-500">{p.InChIKey}</p></div>
        </div>
        <StatGrid items={[{ label: 'Formula', value: p.MolecularFormula }, { label: 'Molecular weight (g/mol)', value: formatNumber(p.MolecularWeight, 3) }, { label: 'XLogP', value: formatNumber(p.XLogP, 2) }]} />
      </article>)}</div>;
    }
    case 'nasa-exoplanets': {
      if (!Array.isArray(data)) return null;
      if (data.length && !Object.hasOwn(data[0] ?? {}, 'pl_name')) return null;
      return <DataTable caption="Radius: Earth radii · Orbit: days · Distance: parsecs. Missing measurements appear as —." headers={['Planet', 'Discovery', 'Radius', 'Orbit', 'Distance']} rows={records(data).slice(0, 25).map((p: JsonRecord) => [
        <PreviewLink href={`https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(p.pl_name)}`}>{p.pl_name}</PreviewLink>,
        `${p.discoverymethod ?? '—'}${p.disc_year ? ` (${p.disc_year})` : ''}`,
        formatNumber(p.pl_rade, 2), formatNumber(p.pl_orbper, 2), formatNumber(p.sy_dist, 2),
      ])} />;
    }
    case 'overpass-places': {
      if (!Array.isArray(d.elements)) return null;
      return <div>
        {d.remark && <p role="status" className="px-5 pt-5 text-sm text-rose-600 dark:text-rose-400">Upstream notice: {d.remark}</p>}
        <DataTable headers={['Place', 'Amenity', 'Coordinates']} rows={records(d.elements).slice(0, 15).map((p: JsonRecord) => [
          <PreviewLink href={`https://www.openstreetmap.org/${p.type}/${p.id}`}>{p.tags?.name || `${p.type} ${p.id}`}</PreviewLink>,
          p.tags?.amenity?.replaceAll('_', ' ') ?? '—', `${formatNumber(p.lat ?? p.center?.lat, 5)}, ${formatNumber(p.lon ?? p.center?.lon, 5)}`,
        ])} />
        <p className="px-5 pb-5 text-xs text-slate-500"><PreviewLink href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</PreviewLink> · At most 15 mapped objects; this is not a complete local business directory.</p>
      </div>;
    }
    case 'drand-beacon': {
      if (typeof d.signature !== 'string') return null;
      return <div className="p-5 space-y-5"><div><h3 className="text-xs text-slate-500">Beacon round</h3><p className="text-3xl font-semibold tabular-nums mt-1">{formatNumber(d.round)}</p></div>
        <div><h3 className="text-xs text-slate-500 mb-2">BLS signature</h3><code className="block text-xs break-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">{d.signature}</code></div>
        {typeof d.previous_signature === 'string' && <div><h3 className="text-xs text-slate-500 mb-2">Previous signature (chained network)</h3><code className="text-xs break-all">{d.previous_signature}</code></div>}
        <p className="text-xs text-slate-500">Signature displayed, not cryptographically verified. Use a verifying drand client for applications that depend on its randomness. Beacon values are public.</p>
      </div>;
    }
    default: return null;
  }
}
