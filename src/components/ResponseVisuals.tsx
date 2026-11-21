import { ExternalLink, ArrowUpRight } from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import { RawResponsePane } from './RawResponsePane';
import { Phase1Visuals } from './response/Phase1Visuals';
import { Phase2Visuals } from './response/Phase2Visuals';
import { Phase3Visuals } from './response/Phase3Visuals';
import { Phase4Visuals } from './response/Phase4Visuals';

interface ResponseVisualsProps {
  apiId: string;
  data: unknown;
}

function formatCompact(n: unknown): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
}

function formatNum(n: unknown, digits = 2): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function ResponseVisuals({ apiId, data }: ResponseVisualsProps) {
  if (!data) return null;

  try {
    const expandedPreview = Phase1Visuals({ apiId, data })
      ?? Phase2Visuals({ apiId, data })
      ?? Phase3Visuals({ apiId, data })
      ?? Phase4Visuals({ apiId, data });
    if (expandedPreview) return expandedPreview;

    switch (apiId) {
      case 'open-meteo': {
        const d = data as {
          latitude?: number;
          longitude?: number;
          timezone?: string;
          current_units?: Record<string, string>;
          current?: Record<string, number>;
          hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[] };
        };
        if (!d.current) break;
        const unit = d.current_units?.temperature_2m || '°C';
        const hours = (d.hourly?.time || []).slice(0, 8);
        return (
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Temperature</div>
                <div className="text-2xl font-display font-bold tabular-nums mt-1">
                  {d.current.temperature_2m}{unit}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Feels Like</div>
                <div className="text-2xl font-display font-bold tabular-nums mt-1">
                  {d.current.apparent_temperature}{unit}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Humidity</div>
                <div className="text-2xl font-display font-bold tabular-nums mt-1">
                  {d.current.relative_humidity_2m}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Wind Speed</div>
                <div className="text-2xl font-display font-bold tabular-nums mt-1">
                  {d.current.wind_speed_10m} <span className="text-sm font-normal text-slate-500">km/h</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                Next 8 Hours · {d.timezone} ({d.latitude?.toFixed(2)}, {d.longitude?.toFixed(2)})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4 font-medium">Hour</th>
                      <th className="py-2 px-4 font-medium text-right">Temp ({unit})</th>
                      <th className="py-2 pl-4 font-medium text-right">Precip Prob</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 tabular-nums">
                    {hours.map((t, i) => (
                      <tr key={t} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-2 pr-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {t.slice(11, 16)}
                        </td>
                        <td className="py-2 px-4 text-right font-medium">
                          {d.hourly?.temperature_2m?.[i]?.toFixed(1)}{unit}
                        </td>
                        <td className="py-2 pl-4 text-right text-slate-600 dark:text-slate-400">
                          {d.hourly?.precipitation_probability?.[i] ?? 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'kraken-ticker': {
        const d = data as { result?: Record<string, { c: string[]; b: string[]; a: string[]; p: string[]; v: string[] }> };
        if (!d.result) break;
        const rows = Object.entries(d.result);
        return (
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
              Kraken Spot Orderbook Top-of-Book ({rows.length} pairs)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4 font-medium">Pair</th>
                    <th className="py-2 px-3 font-medium text-right">Last</th>
                    <th className="py-2 px-3 font-medium text-right">Bid</th>
                    <th className="py-2 px-3 font-medium text-right">Ask</th>
                    <th className="py-2 px-3 font-medium text-right">24h VWAP</th>
                    <th className="py-2 pl-3 font-medium text-right">24h Vol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 tabular-nums font-mono text-xs">
                  {rows.map(([pair, info]) => (
                    <tr key={pair} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-2.5 pr-4 font-sans font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {pair}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {formatNum(info.c?.[0], 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                        {formatNum(info.b?.[0], 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                        {formatNum(info.a?.[0], 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatNum(info.p?.[1], 2)}
                      </td>
                      <td className="py-2.5 pl-3 text-right text-slate-600 dark:text-slate-400">
                        {formatNum(info.v?.[1], 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'espn-scoreboard': {
        const d = data as {
          leagues?: Array<{ name?: string }>;
          events?: Array<{
            id: string;
            shortName: string;
            status?: { type?: { shortDetail?: string } };
            competitions?: Array<{
              venue?: { fullName?: string };
              competitors?: Array<{
                homeAway: string;
                score: string;
                team?: { displayName?: string; abbreviation?: string };
              }>;
            }>;
          }>;
        };
        const events = d.events || [];
        return (
          <div className="p-5 space-y-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {d.leagues?.[0]?.name || 'Scoreboard'} · {events.length} scheduled or active events
            </div>
            {events.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No active games on today’s slate for this league.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                {events.slice(0, 8).map((ev) => {
                  const comp = ev.competitions?.[0];
                  const away = comp?.competitors?.find((c) => c.homeAway === 'away') || comp?.competitors?.[1];
                  const home = comp?.competitors?.find((c) => c.homeAway === 'home') || comp?.competitors?.[0];
                  return (
                    <div key={ev.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {away?.team?.displayName || 'Away'} vs {home?.team?.displayName || 'Home'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {ev.status?.type?.shortDetail || 'Scheduled'}
                          {comp?.venue?.fullName ? ` · ${comp.venue.fullName}` : ''}
                        </div>
                      </div>
                      <div className="font-mono text-sm font-semibold tabular-nums shrink-0 text-slate-900 dark:text-slate-100">
                        {away?.score ?? '0'} – {home?.score ?? '0'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'hacker-news': {
        const d = data as {
          feed?: string;
          totalIds?: number;
          items?: Array<{ id: number; title?: string; score?: number; by?: string; descendants?: number; url?: string }>;
        };
        const items = d.items || [];
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {d.feed} · Hydrated {items.length} of {d.totalIds ?? items.length} story IDs
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
              {items.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-xs text-slate-400 tabular-nums pt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <a
                        href={item.url || `https://news.ycombinator.com/item?id=${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                      >
                        <span className="truncate">{item.title || `Item #${item.id}`}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      </a>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {item.score ?? 0} points · by {item.by || 'unknown'} · {item.descendants ?? 0} comments
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'frankfurter-fx': {
        const d = data as { base?: string; date?: string; amount?: number; rates?: Record<string, number> };
        if (!d.rates) break;
        const entries = Object.entries(d.rates);
        return (
          <div className="p-5 space-y-4">
            <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Reference Base</div>
                <div className="text-xl font-display font-bold mt-0.5 tabular-nums">
                  {d.amount ?? 1} {d.base}
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                ECB Fixing · {d.date}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {entries.map(([currency, rate]) => (
                <div
                  key={currency}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50 dark:bg-slate-900/40"
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{currency}</div>
                  <div className="text-lg font-mono font-semibold tabular-nums mt-0.5 text-slate-900 dark:text-slate-100">
                    {rate.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'pokeapi': {
        const d = data as {
          id?: number;
          name?: string;
          height?: number;
          weight?: number;
          types?: Array<{ type: { name: string } }>;
          abilities?: Array<{ ability: { name: string } }>;
          stats?: Array<{ base_stat: number; stat: { name: string } }>;
          sprites?: { other?: { ['official-artwork']?: { front_default?: string } }; front_default?: string };
        };
        if (!d.name) break;
        const artwork = d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default;
        return (
          <div className="p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-200 dark:border-slate-800">
              <ResilientImage
                src={artwork}
                alt={d.name}
                className="w-28 h-28 object-contain rounded-lg bg-slate-50 dark:bg-slate-900/70 p-2 shrink-0 border border-slate-200 dark:border-slate-800"
                fallbackLabel={d.name}
              />
              <div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  National Dex #{String(d.id).padStart(4, '0')}
                </div>
                <h3 className="text-2xl font-display font-bold capitalize mt-0.5">{d.name}</h3>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                  Types: {d.types?.map((t) => t.type.name).join(' / ')} · Height {((d.height ?? 0) / 10).toFixed(1)}m · Weight {((d.weight ?? 0) / 10).toFixed(1)}kg
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Abilities: {d.abilities?.map((a) => a.ability.name).join(', ')}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {(d.stats || []).map((s) => (
                <div key={s.stat.name} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <span className="col-span-4 text-slate-600 dark:text-slate-400 capitalize truncate">
                    {s.stat.name.replace('-', ' ')}
                  </span>
                  <span className="col-span-2 font-mono font-semibold text-right tabular-nums">
                    {s.base_stat}
                  </span>
                  <div className="col-span-6 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                      style={{ width: `${Math.min((s.base_stat / 180) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'scryfall': {
        const d = data as {
          total_cards?: number;
          data?: Array<{
            id: string;
            name: string;
            mana_cost?: string;
            type_line?: string;
            set_name?: string;
            prices?: { usd?: string | null };
            image_uris?: { normal?: string; small?: string };
            card_faces?: Array<{ image_uris?: { normal?: string } }>;
          }>;
        };
        const cards = d.data || [];
        return (
          <div className="p-5 space-y-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              Matched {d.total_cards ?? cards.length} cards · Showing top {Math.min(cards.length, 6)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.slice(0, 6).map((card) => {
                const img = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
                return (
                  <div
                    key={card.id}
                    className="flex gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/40"
                  >
                    <ResilientImage
                      src={img}
                      alt={card.name}
                      className="w-16 h-22 object-cover rounded shrink-0"
                      fallbackLabel={card.name}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {card.name}
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {card.mana_cost || '—'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                        {card.type_line}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
                        {card.set_name} {card.prices?.usd ? `· $${card.prices.usd}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'arxiv': {
        if (typeof data !== 'string') break;
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, 'application/xml');
        const entries = Array.from(xml.querySelectorAll('entry'));
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              arXiv Atom Feed · {entries.length} preprints returned
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
              {entries.map((entry, idx) => {
                const title = entry.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() || 'Untitled';
                const published = entry.querySelector('published')?.textContent?.slice(0, 10) || '';
                const summary = entry.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim() || '';
                const idUrl = entry.querySelector('id')?.textContent || '#';
                const authors = Array.from(entry.querySelectorAll('author > name'))
                  .slice(0, 3)
                  .map((a) => a.textContent)
                  .join(', ');
                return (
                  <div key={idx} className="py-3.5 space-y-1">
                    <a
                      href={idUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-start gap-1"
                    >
                      <span>{title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
                    </a>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {published} · {authors}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {summary}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'crossref': {
        const d = data as {
          message?: {
            ['total-results']?: number;
            items?: Array<{
              DOI: string;
              title?: string[];
              ['is-referenced-by-count']?: number;
              ['container-title']?: string[];
              published?: { ['date-parts']?: number[][] };
            }>;
          };
        };
        const items = d.message?.items || [];
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {formatCompact(d.message?.['total-results'])} matching works · Sorted by citation count
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
              {items.map((item) => {
                const year = item.published?.['date-parts']?.[0]?.[0] || '—';
                return (
                  <div key={item.DOI} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <a
                        href={`https://doi.org/${item.DOI}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {item.title?.[0] || item.DOI}
                      </a>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item['container-title']?.[0] || 'Journal'} · {year} · DOI: {item.DOI}
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {item['is-referenced-by-count']?.toLocaleString() ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">citations</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'earth-search-stac': {
        const d = data as {
          features?: Array<{
            id: string;
            properties?: { datetime?: string; ['eo:cloud_cover']?: number; platform?: string };
            assets?: { thumbnail?: { href?: string }; visual?: { href?: string } };
          }>;
        };
        const items = d.features || [];
        return (
          <div className="p-5 space-y-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sentinel-2 L2A STAC Scenes · {items.length} orbital acquisitions matched
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((feat) => (
                <div
                  key={feat.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/40 dark:bg-slate-900/40"
                >
                  <ResilientImage
                    src={feat.assets?.thumbnail?.href}
                    alt={feat.id}
                    className="w-full h-36 object-cover"
                    fallbackLabel={feat.id}
                  />
                  <div className="p-3">
                    <div className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                      {feat.id}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                      {feat.properties?.datetime?.slice(0, 10)} · Cloud{' '}
                      {feat.properties?.['eo:cloud_cover']?.toFixed(1)}% · {feat.properties?.platform || 'sentinel-2'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'usgs-earthquakes': {
        const d = data as {
          metadata?: { title?: string; count?: number };
          features?: Array<{
            id: string;
            properties: { mag: number; place: string; time: number; tsunami: number; url: string };
            geometry: { coordinates: [number, number, number] };
          }>;
        };
        const quakes = (d.features || []).slice(0, 10);
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {d.metadata?.title || 'USGS Seismic Feed'} · {d.metadata?.count ?? quakes.length} total events
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Mag</th>
                    <th className="py-2 px-3 font-medium">Location</th>
                    <th className="py-2 px-3 font-medium text-right">Depth</th>
                    <th className="py-2 pl-3 font-medium text-right">UTC Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 tabular-nums">
                  {quakes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-2 pr-3 font-mono font-semibold text-xs text-amber-600 dark:text-amber-400">
                        M{q.properties.mag?.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-800 dark:text-slate-200">
                        {q.properties.place}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        {q.geometry.coordinates[2]?.toFixed(1)} km
                      </td>
                      <td className="py-2 pl-3 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                        {new Date(q.properties.time).toISOString().slice(11, 16)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'wayback-cdx': {
        if (!Array.isArray(data) || data.length < 2) break;
        const rows = (data as string[][]).slice(1);
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {rows.length} historical captures indexed (click any timestamp to open archived snapshot)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4 font-medium">Archive Date</th>
                    <th className="py-2 px-3 font-medium">Original URL</th>
                    <th className="py-2 px-3 font-medium">MIME</th>
                    <th className="py-2 pl-3 font-medium text-right">Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 tabular-nums">
                  {rows.map((r, i) => {
                    const ts = r[1];
                    const orig = r[2];
                    const mime = r[3];
                    const formattedDate = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
                    return (
                      <tr key={`${ts}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-2 pr-4 font-mono text-xs font-medium">{formattedDate}</td>
                        <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                          {orig}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-slate-500">{mime}</td>
                        <td className="py-2 pl-3 text-right">
                          <a
                            href={`https://web.archive.org/web/${ts}/${orig}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'ripestat-bgp': {
        const d = data as {
          data?: {
            resource?: string;
            announced?: boolean;
            block?: { resource?: string; name?: string; desc?: string };
            asns?: Array<{ asn: number; holder: string }>;
          };
        };
        const info = d.data;
        if (!info) break;
        return (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Queried Prefix</div>
                <div className="text-lg font-mono font-semibold mt-0.5">{info.resource}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">BGP Status</div>
                <div className="text-lg font-display font-semibold mt-0.5">
                  {info.announced ? 'Announced' : 'Unannounced'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Registry Block</div>
                <div className="text-sm font-mono mt-1 text-slate-700 dark:text-slate-300">
                  {info.block?.name || info.block?.resource || '—'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Originating Autonomous Systems ({info.asns?.length ?? 0})
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                {(info.asns || []).map((a) => (
                  <div key={a.asn} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      AS{a.asn}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-right">{a.holder}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'gbif-biodiversity': {
        const d = data as {
          count?: number;
          results?: Array<{
            key: number;
            scientificName?: string;
            vernacularName?: string;
            country?: string;
            eventDate?: string;
            decimalLatitude?: number;
            decimalLongitude?: number;
            basisOfRecord?: string;
            media?: Array<{ identifier?: string }>;
          }>;
        };
        const rows = d.results || [];
        return (
          <div className="p-5 space-y-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {d.count?.toLocaleString()} total global occurrences · Showing {rows.length} geotagged records
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rows.map((occ) => (
                <div
                  key={occ.key}
                  className="flex gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/40 dark:bg-slate-900/40"
                >
                  <ResilientImage
                    src={occ.media?.[0]?.identifier}
                    alt={occ.scientificName || 'Species specimen'}
                    className="w-16 h-16 object-cover rounded shrink-0"
                    fallbackLabel={occ.country || 'GBIF'}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {occ.scientificName}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {occ.country || 'International'} · {occ.eventDate?.slice(0, 10) || 'Undated'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                      {occ.decimalLatitude?.toFixed(3)}, {occ.decimalLongitude?.toFixed(3)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'uk-carbon-intensity': {
        const d = data as {
          data?:
            | {
                from?: string;
                to?: string;
                generationmix?: Array<{ fuel: string; perc: number }>;
              }
            | Array<{
                from?: string;
                intensity?: { actual?: number; forecast?: number; index?: string };
                regions?: Array<{ shortname: string; intensity: { forecast: number; index: string } }>;
              }>;
        };
        if (!d.data) break;
        if (!Array.isArray(d.data) && d.data.generationmix) {
          const sorted = [...d.data.generationmix].sort((a, b) => b.perc - a.perc);
          return (
            <div className="p-5 space-y-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                Great Britain Physical Grid Mix · {d.data.from?.slice(11, 16)}–{d.data.to?.slice(11, 16)} UTC
              </div>
              <div className="space-y-2.5">
                {sorted.map((item) => (
                  <div key={item.fuel} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-3 capitalize font-medium text-slate-700 dark:text-slate-300">
                      {item.fuel}
                    </span>
                    <span className="col-span-2 font-mono text-right tabular-nums">
                      {item.perc.toFixed(1)}%
                    </span>
                    <div className="col-span-7 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(item.perc, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (Array.isArray(d.data) && d.data[0]?.regions) {
          const regions = d.data[0].regions.slice(0, 10);
          return (
            <div className="p-5 space-y-3">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Regional Grid Carbon Intensity (gCO₂/kWh)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {regions.map((r) => (
                  <div
                    key={r.shortname}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-between text-xs"
                  >
                    <span className="font-medium truncate pr-2">{r.shortname}</span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                      {r.intensity.forecast} · {r.intensity.index}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        const intensity = Array.isArray(d.data) ? d.data[0]?.intensity : undefined;
        if (intensity) {
          return (
            <div className="p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Current National Carbon Intensity</div>
              <div className="text-3xl font-display font-bold tabular-nums mt-1">
                {intensity.actual ?? intensity.forecast}{' '}
                <span className="text-base font-normal text-slate-500">gCO₂/kWh</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 capitalize">
                Grid Index: {intensity.index}
              </div>
            </div>
          );
        }
        break;
      }

      case 'godbolt-compiler': {
        const d = data as {
          code?: number;
          asm?: Array<{ text: string }>;
          stderr?: Array<{ text: string }>;
        };
        const asmLines = d.asm || [];
        const errors = d.stderr || [];
        return (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Compiler Exit Code: <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{d.code ?? 0}</strong>
              </span>
              <span className="tabular-nums">{asmLines.length} emitted assembly lines</span>
            </div>
            {errors.length > 0 && d.code !== 0 ? (
              <pre className="p-4 text-xs font-mono text-rose-600 dark:text-rose-400 whitespace-pre-wrap">
                {errors.map((e) => e.text).join('\n')}
              </pre>
            ) : (
              <pre className="flex-1 overflow-auto p-4 bg-slate-950 text-emerald-300 text-[12px] leading-5 font-mono">
                {asmLines.map((l) => l.text).join('\n')}
              </pre>
            )}
          </div>
        );
      }

      case 'rcsb-pdb': {
        const d = data as {
          rcsb_id?: string;
          struct?: { title?: string };
          exptl?: Array<{ method?: string }>;
          rcsb_entry_info?: {
            resolution_combined?: number[];
            molecular_weight?: number;
            deposited_atom_count?: number;
            polymer_entity_count?: number;
          };
          rcsb_primary_citation?: { title?: string; journal_abbrev?: string; year?: number };
        };
        if (!d.rcsb_id) break;
        const imgUrl = `https://cdn.rcsb.org/images/structures/${d.rcsb_id.toLowerCase()}_assembly-1.jpeg`;
        return (
          <div className="p-5 space-y-5">
            <div className="flex flex-col sm:flex-row gap-5 pb-5 border-b border-slate-200 dark:border-slate-800">
              <ResilientImage
                src={imgUrl}
                alt={`PDB ${d.rcsb_id}`}
                className="w-40 h-40 object-contain rounded-lg bg-white p-2 border border-slate-200 dark:border-slate-800 shrink-0"
                fallbackLabel={`PDB ${d.rcsb_id}`}
              />
              <div className="min-w-0">
                <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  PDB ENTRY {d.rcsb_id}
                </div>
                <h3 className="text-base font-display font-bold mt-1 leading-snug">
                  {d.struct?.title || d.rcsb_id}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Method: {d.exptl?.[0]?.method || '—'}
                </div>
                {d.rcsb_primary_citation?.journal_abbrev && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Primary Citation: {d.rcsb_primary_citation.journal_abbrev} ({d.rcsb_primary_citation.year})
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Resolution</div>
                <div className="text-xl font-display font-bold mt-0.5">
                  {d.rcsb_entry_info?.resolution_combined?.[0]?.toFixed(2) ?? '—'} Å
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Mol. Weight</div>
                <div className="text-xl font-display font-bold mt-0.5">
                  {d.rcsb_entry_info?.molecular_weight?.toFixed(1) ?? '—'} kDa
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Atom Count</div>
                <div className="text-xl font-display font-bold mt-0.5">
                  {d.rcsb_entry_info?.deposited_atom_count?.toLocaleString() ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Polymers</div>
                <div className="text-xl font-display font-bold mt-0.5">
                  {d.rcsb_entry_info?.polymer_entity_count ?? '—'}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'wikidata-sparql': {
        const d = data as {
          head?: { vars?: string[] };
          results?: { bindings?: Array<Record<string, { value: string; type: string }>> };
        };
        const vars = d.head?.vars || [];
        const rows = d.results?.bindings || [];
        if (vars.length === 0) break;
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              SPARQL Result Set · {rows.length} rows × {vars.length} variables
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                    {vars.map((v) => (
                      <th key={v} className="py-2 pr-4 font-mono font-medium">
                        ?{v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      {vars.map((v) => {
                        const cell = row[v];
                        const val = cell?.value || '—';
                        const display = val.startsWith('http://www.wikidata.org/entity/')
                          ? val.replace('http://www.wikidata.org/entity/', 'wd:')
                          : val.length > 48
                            ? `${val.slice(0, 48)}…`
                            : val;
                        return (
                          <td key={v} className="py-2 pr-4 text-xs text-slate-800 dark:text-slate-200 tabular-nums">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'noaa-space-weather': {
        if (!Array.isArray(data) || data.length === 0) break;
        const first = data[0];
        // Format A: planetary_k_index_1m.json (array of objects)
        if (typeof first === 'object' && !Array.isArray(first) && 'kp_index' in first) {
          const recent = (data as Array<{ time_tag: string; kp_index: number; estimated_kp: number }>).slice(-8).reverse();
          const latest = recent[0];
          const stormLabel =
            latest.estimated_kp >= 5
              ? 'Geomagnetic Storm Active'
              : latest.estimated_kp >= 4
                ? 'Active / High-Latitude Aurora'
                : 'Quiet Magnetosphere';
          return (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Latest Estimated Kp</div>
                  <div className="text-3xl font-display font-bold tabular-nums mt-0.5">
                    {latest.estimated_kp.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Spacecraft State</div>
                  <div className="text-sm font-semibold mt-2 text-blue-600 dark:text-blue-400">
                    {stormLabel}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Sample UTC</div>
                  <div className="text-sm font-mono mt-2 tabular-nums">
                    {latest.time_tag.replace('T', ' ').slice(0, 19)}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                      <th className="py-1.5 pr-4 font-medium">UTC Timestamp</th>
                      <th className="py-1.5 px-4 font-medium text-right">Kp Index</th>
                      <th className="py-1.5 pl-4 font-medium text-right">Estimated Kp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {recent.map((r) => (
                      <tr key={r.time_tag}>
                        <td className="py-1.5 pr-4">{r.time_tag.replace('T', ' ').slice(0, 19)}</td>
                        <td className="py-1.5 px-4 text-right">{r.kp_index}</td>
                        <td className="py-1.5 pl-4 text-right font-semibold">{r.estimated_kp.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        // Format B: solar-wind plasma-2-hour.json (2D array with header row)
        if (Array.isArray(first)) {
          const headers = first as string[];
          const rows = (data as string[][]).slice(-8).reverse();
          return (
            <div className="p-5 space-y-3">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                DSCOVR L1 Solar Wind Plasma Telemetry (1.5M km upstream)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                      {headers.map((h) => (
                        <th key={h} className="py-1.5 pr-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {rows.map((row, idx) => (
                      <tr key={idx}>
                        {row.map((val, c) => (
                          <td key={c} className="py-1.5 pr-3">
                            {val ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        // Format C: GOES X-ray flux
        const xrayRecent = (data as Array<{ time_tag: string; flux: number; energy: string }>).slice(-8).reverse();
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              GOES Primary Solar X-Ray Flux (W/m²)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                    <th className="py-1.5 pr-4 font-medium">UTC Time</th>
                    <th className="py-1.5 px-4 font-medium">Band</th>
                    <th className="py-1.5 pl-4 font-medium text-right">Flux (W/m²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {xrayRecent.map((r, i) => (
                    <tr key={`${r.time_tag}-${i}`}>
                      <td className="py-1.5 pr-4">{r.time_tag?.slice(0, 19)}</td>
                      <td className="py-1.5 px-4">{r.energy}</td>
                      <td className="py-1.5 pl-4 text-right font-semibold">{r.flux?.toExponential(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'huggingface-hub': {
        if (!Array.isArray(data)) break;
        const models = data as Array<{
          id: string;
          downloads?: number;
          likes?: number;
          pipeline_tag?: string;
          library_name?: string;
        }>;
        return (
          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hugging Face Open-Weight Model Registry · Top {models.length} models
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
              {models.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <a
                      href={`https://huggingface.co/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1"
                    >
                      <span className="truncate">{m.id}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                    </a>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.pipeline_tag || 'model'} {m.library_name ? `· ${m.library_name}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums font-mono text-xs">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCompact(m.downloads)} dl
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {formatCompact(m.likes)} likes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
  } catch {
    return <RawResponsePane data={data} />;
  }

  return <RawResponsePane data={data} />;
}
