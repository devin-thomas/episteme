import { ResilientImage } from '../ResilientImage';
import { DataTable, formatNumber, PreviewEmpty, PreviewLink, StatGrid } from './PreviewPrimitives';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function records(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item)) as Row[] : [];
}

function text(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.length > 0 ? value : typeof value === 'number' ? String(value) : fallback;
}

function timestamp(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function Phase3Visuals({ apiId, data }: { apiId: string; data: unknown }) {
  const payload = record(data);

  switch (apiId) {
    case 'world-bank-indicators': {
      const envelope = Array.isArray(data) ? data : [];
      const metadata = record(envelope[0]);
      const observations = records(envelope[1]);
      if (!observations.length) return <PreviewEmpty>No observations returned for this country and indicator.</PreviewEmpty>;
      const indicator = record(observations[0].indicator);
      return <div>
        <div className="px-5 pt-5 text-sm font-medium"><PreviewLink href={`https://data.worldbank.org/indicator/${encodeURIComponent(text(indicator.id, ''))}`}>{text(indicator.value, 'World Bank indicator')}</PreviewLink></div>
        <DataTable
          caption={`Source updated ${text(metadata.lastupdated)} · World Bank`}
          headers={['Country', 'Year', 'Value']}
          rows={observations.slice(0, 20).map((row) => [text(record(row.country).value), text(row.date), formatNumber(row.value, 2)])}
        />
      </div>;
    }

    case 'nws-alerts': {
      if (!Array.isArray(payload.features)) return <PreviewEmpty>No alert collection was returned. See Raw Payload for the provider response.</PreviewEmpty>;
      const alerts = records(payload.features);
      if (!alerts.length) return <PreviewEmpty>No active alerts match these filters.</PreviewEmpty>;
      return <div className="p-5 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">National Weather Service · {alerts.length} active alerts{alerts.length > 12 ? ' · showing the first 12' : ''}</p>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {alerts.slice(0, 12).map((alert, index) => {
            const info = record(alert.properties);
            return <article key={text(alert.id, String(index))} className="py-4 first:pt-0 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold"><PreviewLink href={text(alert.id, '')}>{text(info.event, 'Weather alert')}</PreviewLink></h3>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{text(info.severity)}</span>
              </div>
              <p className="text-sm">{text(info.headline)}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{text(info.areaDesc)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Expires {timestamp(info.expires)}</p>
              {(typeof info.description === 'string' || typeof info.instruction === 'string') && <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400">Bulletin and instructions</summary>
                <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-400">{text(info.description, '')}</p>
                {typeof info.instruction === 'string' && info.instruction.length > 0 && <p className="mt-2 whitespace-pre-wrap">{info.instruction}</p>}
              </details>}
            </article>;
          })}
        </div>
      </div>;
    }

    case 'open-food-facts': {
      const product = record(payload.product);
      if (!Object.keys(product).length) return <PreviewEmpty>{text(record(payload.result).name, 'No product found for this barcode.')}</PreviewEmpty>;
      const nutrients = record(product.nutriments);
      const code = text(product.code, text(payload.code, ''));
      const name = text(product.product_name, 'Unnamed product');
      const unitValue = (key: string, unit: string) => {
        const value = numericValue(nutrients[key]);
        return value === null ? '—' : `${formatNumber(value, 2)} ${unit}`;
      };
      const grade = typeof product.nutriscore_grade === 'string' && /^[a-e]$/i.test(product.nutriscore_grade) ? product.nutriscore_grade.toUpperCase() : 'Not recorded';
      const allergens = Array.isArray(product.allergens_tags) ? product.allergens_tags.filter((item): item is string => typeof item === 'string').map((item) => item.replace(/^[a-z]{2}:/, '')).join(', ') : '';
      return <div>
        <div className="flex gap-5 p-5 border-b border-slate-200 dark:border-slate-800">
          <ResilientImage key={text(product.image_front_small_url, code)} src={typeof product.image_front_small_url === 'string' ? product.image_front_small_url : undefined} alt={`${name} packaging`} className="w-20 h-28 object-contain shrink-0 rounded" />
          <div className="min-w-0 space-y-1.5">
            <h3 className="font-semibold"><PreviewLink href={`https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`}>{name}</PreviewLink></h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{text(product.brands)} · {text(product.quantity)}</p>
            <p className="font-mono text-xs break-all">{code}</p>
            <p className="text-xs">Nutri-Score: {grade}</p>
          </div>
        </div>
        <div className="px-5 pt-4 text-xs text-slate-500 dark:text-slate-400">Recorded nutrition per 100 g / 100 ml</div>
        <StatGrid items={[
          { label: 'Energy', value: unitValue('energy-kcal_100g', 'kcal') },
          { label: 'Protein', value: unitValue('proteins_100g', 'g') },
          { label: 'Carbohydrates', value: unitValue('carbohydrates_100g', 'g') },
          { label: 'Fat', value: unitValue('fat_100g', 'g') },
          { label: 'Sugars', value: unitValue('sugars_100g', 'g') },
          { label: 'Salt', value: unitValue('salt_100g', 'g') },
        ]} />
        <div className="px-5 pb-5 space-y-3 text-xs">
          <p><span className="font-medium">Ingredients: </span>{text(product.ingredients_text, 'Not recorded')}</p>
          <p><span className="font-medium">Listed allergens: </span>{allergens || 'Not recorded'}</p>
          <p className="text-slate-500 dark:text-slate-400">Community product record · <PreviewLink href="https://world.openfoodfacts.org">Open Food Facts</PreviewLink> · <PreviewLink href="https://world.openfoodfacts.org/terms-of-use">ODbL data / CC BY-SA images</PreviewLink></p>
        </div>
      </div>;
    }

    case 'npm-downloads': {
      const daily = records(payload.downloads);
      const counts = daily.map((row) => numericValue(row.downloads));
      const total = Array.isArray(payload.downloads)
        ? daily.length > 0 && counts.every((count) => count !== null) ? (counts as number[]).reduce((sum, count) => sum + count, 0) : null
        : numericValue(payload.downloads);
      if (!daily.length && total === null) return <PreviewEmpty>{text(payload.error, 'No download counts returned.')}</PreviewEmpty>;
      const name = text(payload.package, 'All packages');
      return <div>
        <div className="px-5 pt-5 text-sm font-semibold"><PreviewLink href={typeof payload.package === 'string' ? `https://www.npmjs.com/package/${encodeURIComponent(payload.package)}` : 'https://www.npmjs.com'}>{name}</PreviewLink></div>
        <StatGrid items={[
          { label: 'Downloads', value: formatNumber(total) },
          { label: 'First day', value: text(payload.start) },
          { label: 'Last day (inclusive)', value: text(payload.end) },
        ]} />
        {daily.length > 0 && <DataTable headers={['Day', 'Downloads']} rows={daily.map((row) => [text(row.day), formatNumber(row.downloads)])} caption="Registry downloads, including automated installs" />}
      </div>;
    }

    case 'treasury-interest-rates': {
      const rows = records(payload.data);
      if (!rows.length) return <PreviewEmpty>No interest-rate records returned for these parameters.</PreviewEmpty>;
      return <DataTable
        caption="US Treasury · Monthly average rates on outstanding debt"
        headers={['Reporting date', 'Security', 'Average rate']}
        rows={rows.slice(0, 12).map((row) => {
          const rate = numericValue(row.avg_interest_rate_amt);
          return [text(row.record_date), text(row.security_desc), rate === null ? '—' : `${formatNumber(rate, 3)}%`];
        })}
      />;
    }
    default:
      return null;
  }
}
