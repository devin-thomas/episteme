import { DataTable, PreviewEmpty, PreviewLink, StatGrid, formatNumber } from './PreviewPrimitives';

type JsonObject = Record<string, unknown>;
const object = (v: unknown): JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as JsonObject : {};
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const string = (v: unknown, fallback = '—'): string => typeof v === 'string' || typeof v === 'number' ? String(v) : fallback;
const strings = (v: unknown): string => array(v).filter((s) => typeof s === 'string').join(', ') || '—';

export function Phase1Visuals({ apiId, data }: { apiId: string; data: unknown }) {
  switch (apiId) {
    case 'tvmaze-shows': {
      const rows = array(data).map((result) => object(object(result).show)).filter((show) => show.name);
      if (!rows.length) return <PreviewEmpty>No matching shows.</PreviewEmpty>;
      return <>
        <DataTable headers={['Series', 'Premiere', 'Type / language', 'Network', 'Rating']} rows={rows.map((show) => [
          <PreviewLink href={string(show.url, '')}>{string(show.name)}</PreviewLink>,
          string(show.premiered), `${string(show.type)} · ${string(show.language)}`,
          string(object(show.network).name ?? object(show.webChannel).name),
          formatNumber(object(show.rating).average, 1),
        ])} />
        <p className="px-5 pb-5 text-xs text-slate-500 dark:text-slate-400"><PreviewLink href="https://www.tvmaze.com/">TVmaze</PreviewLink> · <PreviewLink href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA</PreviewLink></p>
      </>;
    }
    case 'nager-holidays': {
      const holidays = array(data).map(object);
      if (!holidays.length) return <PreviewEmpty>No holidays returned for this country and year.</PreviewEmpty>;
      return <DataTable caption={`${holidays.length} holiday records · national and regional dates`} headers={['Date', 'Holiday', 'Scope', 'Types']} rows={holidays.map((holiday) => [
        <time dateTime={string(holiday.date, '')} className="font-mono text-xs whitespace-nowrap">{string(holiday.date)}</time>,
        string(holiday.name), holiday.nationalHoliday === true ? 'National' : strings(holiday.subdivisionCodes), strings(holiday.holidayTypes),
      ])} />;
    }
    case 'zippopotam-postcodes': {
      const payload = object(data);
      const places = array(payload.places).map(object);
      if (!places.length) return <PreviewEmpty>No places found for that postal code.</PreviewEmpty>;
      return <>
        <StatGrid items={[{ label: 'Postal code', value: string(payload['post code']) }, { label: 'Country', value: string(payload.country) }, { label: 'Places', value: places.length }]} />
        <DataTable caption="Postal-area coordinates; not street-address geocoding." headers={['Place', 'State / region', 'Latitude', 'Longitude']} rows={places.map((place) => [string(place['place name']), string(place.state), string(place.latitude), string(place.longitude)])} />
        <p className="px-5 pb-5 text-xs text-slate-500 dark:text-slate-400">Data: <PreviewLink href="https://www.geonames.org/">GeoNames</PreviewLink> via <PreviewLink href="https://zippopotam.us/">Zippopotam.us</PreviewLink></p>
      </>;
    }
    case 'free-dictionary': {
      const entries = array(data).map(object);
      if (!entries.length) return <PreviewEmpty>{string(object(data).message, 'No dictionary entry found for that word.')}</PreviewEmpty>;
      return <div className="p-5 space-y-6">
        {entries.map((entry, entryIndex) => <section key={entryIndex} className="space-y-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline"><h3 className="text-xl font-semibold">{string(entry.word)}</h3><span className="text-sm text-slate-500 dark:text-slate-400">{string(entry.phonetic ?? object(array(entry.phonetics)[0]).text, '')}</span></div>
          {array(entry.meanings).map(object).map((meaning, meaningIndex) => <div key={meaningIndex}>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{string(meaning.partOfSpeech)}</h4>
            <ol className="list-decimal pl-5 space-y-2 text-sm">{array(meaning.definitions).map(object).slice(0, 5).map((definition, index) => <li key={index}>
              <p>{string(definition.definition)}</p>
              {typeof definition.example === 'string' && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{definition.example}</p>}
            </li>)}</ol>
          </div>)}
          <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-3">
            {array(entry.sourceUrls).filter((url): url is string => typeof url === 'string').map((url) => <PreviewLink key={url} href={url}>Dictionary source</PreviewLink>)}
            {object(entry.license).name ? <PreviewLink href={string(object(entry.license).url, '')}>{string(object(entry.license).name)}</PreviewLink> : null}
          </p>
        </section>)}
      </div>;
    }
    case 'itunes-search': {
      const payload = object(data);
      const results = array(payload.results).map(object);
      if (!results.length) return <PreviewEmpty>No matching catalog records for that storefront.</PreviewEmpty>;
      return <DataTable caption={`${formatNumber(payload.resultCount)} results · Apple iTunes catalog`} headers={['Title', 'Artist / publisher', 'Kind', 'Release', 'Catalog ID']} rows={results.map((item) => [
        <PreviewLink href={string(item.trackViewUrl ?? item.collectionViewUrl, '')}>{string(item.trackName ?? item.collectionName)}</PreviewLink>,
        string(item.artistName), string(item.kind ?? item.collectionType ?? item.wrapperType), string(item.releaseDate, '').slice(0, 10) || '—',
        <span className="font-mono text-xs">{string(item.trackId ?? item.collectionId)}</span>,
      ])} />;
    }
    default: return null;
  }
}
