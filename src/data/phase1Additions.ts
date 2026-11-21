import type { ApiDefinition } from '../types/api';
import { withExamples } from './requestExamples';

export const PHASE1_ADDITIONS: ApiDefinition[] = [
  withExamples({
    id: 'tvmaze-shows', index: '21', phase: 1,
    name: 'TVmaze Show Search', domain: 'Television Catalog',
    shortPitch: 'Find television series, premiere dates, genres, networks, and TVmaze ratings.',
    epistemicNote: 'Known known: start with a familiar show title and distinguish its adaptations using catalog metadata.',
    method: 'GET', docsUrl: 'https://www.tvmaze.com/api#show-search',
    params: [{ key: 'query', label: 'Show Title', type: 'text', defaultValue: 'Cowboy Bebop', placeholder: 'e.g. Cowboy Bebop, The Last of Us' }],
    presets: [
      { label: 'Cowboy Bebop', values: { query: 'Cowboy Bebop' } },
      { label: 'The Last of Us', values: { query: 'The Last of Us' } },
      { label: 'The Bear', values: { query: 'The Bear' } },
    ],
    buildRequest: (v) => ({ method: 'GET', url: `https://api.tvmaze.com/search/shows?q=${encodeURIComponent((v.query ?? '').trim() || 'Cowboy Bebop')}` }),
  }, `for (const { show } of data) {
  console.log(show.id, show.name, show.premiered, show.status, show.url);
}
// Data: TVmaze, CC BY-SA. Keep attribution when reusing results.`),
  withExamples({
    id: 'nager-holidays', index: '22', phase: 1,
    name: 'Nager.Date Public Holidays', domain: 'Holiday Calendars',
    shortPitch: 'National and regional public holidays by country and calendar year.',
    epistemicNote: 'Known known: choose a country and year to inspect the holiday calendar and its regional scope.',
    method: 'GET', docsUrl: 'https://nagerholidays.com/api',
    params: [
      { key: 'country', label: 'Country', type: 'select', defaultValue: 'US', options: [
        { label: 'United States', value: 'US' }, { label: 'Brazil', value: 'BR' },
        { label: 'Germany', value: 'DE' }, { label: 'United Kingdom', value: 'GB' },
        { label: 'Japan', value: 'JP' }, { label: 'Austria', value: 'AT' },
      ] },
      { key: 'year', label: 'Year', type: 'number', defaultValue: '2027', placeholder: 'e.g. 2027' },
    ],
    presets: [
      { label: 'US · 2027', values: { country: 'US', year: '2027' } },
      { label: 'Brazil · 2027', values: { country: 'BR', year: '2027' } },
      { label: 'Germany · 2027', values: { country: 'DE', year: '2027' } },
    ],
    buildRequest: (v) => {
      const year = /^\d{4}$/.test(v.year) ? v.year : '2027';
      return { method: 'GET', url: `https://nagerholidays.com/api/v4/Holidays/${encodeURIComponent((v.country || 'US').toUpperCase())}/${year}` };
    },
  }, `for (const holiday of data) {
  const scope = holiday.nationalHoliday ? 'National' : holiday.subdivisionCodes?.join(', ');
  console.log(holiday.date, holiday.name, scope, holiday.holidayTypes);
}`),
  withExamples({
    id: 'zippopotam-postcodes', index: '23', phase: 1,
    name: 'Zippopotam.us Postal Codes', domain: 'Places & Postal Codes',
    shortPitch: 'Resolve a postal code to place names, states, and approximate coordinates.',
    epistemicNote: 'Known known: a postal code becomes a city or region lookup without a geocoding account.',
    method: 'GET', docsUrl: 'https://docs.zippopotam.us/docs/v1/',
    params: [
      { key: 'country', label: 'Country Code', type: 'text', defaultValue: 'US', placeholder: 'ISO code, e.g. US, DE, FR' },
      { key: 'postalCode', label: 'Postal Code', type: 'text', defaultValue: '78205', placeholder: 'Preserve leading zeroes' },
    ],
    presets: [
      { label: 'San Antonio', values: { country: 'US', postalCode: '78205' } },
      { label: 'Berlin', values: { country: 'DE', postalCode: '10115' } },
      { label: 'Paris', values: { country: 'FR', postalCode: '75001' } },
    ],
    buildRequest: (v) => ({ method: 'GET', url: `https://api.zippopotam.us/${encodeURIComponent((v.country ?? '').trim().toLowerCase() || 'us')}/${encodeURIComponent((v.postalCode ?? '').trim() || '78205')}` }),
  }, `console.log(data.country, data['post code']);
for (const place of data.places ?? []) {
  console.log(place['place name'], place.state, place.latitude, place.longitude);
}
// Coordinates describe a postal area, not an individual street address.`),
  withExamples({
    id: 'free-dictionary', index: '24', phase: 1,
    name: 'Free Dictionary', domain: 'English Words & Meanings',
    shortPitch: 'Definitions, parts of speech, phonetic spellings, and example sentences.',
    epistemicNote: 'Known known: look up a word and inspect its meanings, pronunciation metadata, and source attribution.',
    method: 'GET', docsUrl: 'https://dictionaryapi.dev/',
    params: [{ key: 'word', label: 'English Word', type: 'text', defaultValue: 'serendipity', placeholder: 'e.g. serendipity, resonance, algorithm' }],
    presets: [
      { label: 'Serendipity', values: { word: 'serendipity' } },
      { label: 'Resonance', values: { word: 'resonance' } },
      { label: 'Algorithm', values: { word: 'algorithm' } },
    ],
    buildRequest: (v) => ({ method: 'GET', url: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent((v.word ?? '').trim().toLowerCase() || 'serendipity')}` }),
  }, `for (const entry of data) {
  console.log(entry.word, entry.phonetic, entry.sourceUrls, entry.license);
  for (const meaning of entry.meanings ?? []) {
    console.log(meaning.partOfSpeech, meaning.definitions);
  }
}`),
  withExamples({
    id: 'itunes-search', index: '25', phase: 1,
    name: 'Apple iTunes Search', domain: 'Music & Podcast Catalog',
    shortPitch: 'Search songs, albums, or podcasts by term and storefront; inspect identifiers and release metadata.',
    epistemicNote: 'Known known: match a familiar artist or podcast to catalog records and their store links.',
    method: 'GET', docsUrl: 'https://performance-partners.apple.com/search-api',
    params: [
      { key: 'term', label: 'Search Term', type: 'text', defaultValue: 'Daft Punk', placeholder: 'Artist, album, song, or podcast' },
      { key: 'entity', label: 'Result Type', type: 'select', defaultValue: 'song', options: [
        { label: 'Songs', value: 'song' }, { label: 'Albums', value: 'album' }, { label: 'Podcasts', value: 'podcast' },
      ] },
      { key: 'country', label: 'Storefront', type: 'select', defaultValue: 'US', options: [
        { label: 'United States', value: 'US' }, { label: 'Brazil', value: 'BR' }, { label: 'Japan', value: 'JP' }, { label: 'United Kingdom', value: 'GB' },
      ] },
      { key: 'limit', label: 'Results', type: 'select', defaultValue: '6', options: [
        { label: '6 results', value: '6' }, { label: '12 results', value: '12' }, { label: '20 results', value: '20' },
      ] },
      { key: 'explicit', label: 'Explicit Content', type: 'select', defaultValue: 'Yes', options: [
        { label: 'Include explicit releases', value: 'Yes' }, { label: 'Exclude explicit releases', value: 'No' },
      ] },
    ],
    presets: [
      { label: 'Daft Punk · songs', values: { term: 'Daft Punk', entity: 'song', country: 'US', limit: '6', explicit: 'Yes' } },
      { label: 'Nujabes · albums', values: { term: 'Nujabes', entity: 'album', country: 'US', limit: '6', explicit: 'Yes' } },
      { label: 'Planet Money · podcasts', values: { term: 'Planet Money', entity: 'podcast', country: 'US', limit: '6', explicit: 'Yes' } },
    ],
    buildRequest: (v) => {
      const entity = ['song', 'album', 'podcast'].includes(v.entity) ? v.entity : 'song';
      const params = new URLSearchParams({
        term: (v.term ?? '').trim() || 'Daft Punk', entity, media: entity === 'podcast' ? 'podcast' : 'music',
        country: (v.country || 'US').toUpperCase(), limit: ['6', '12', '20'].includes(v.limit) ? v.limit : '6', explicit: v.explicit === 'No' ? 'No' : 'Yes',
      });
      return { method: 'GET', url: `https://itunes.apple.com/search?${params}` };
    },
  }, `console.log('Matches:', data.resultCount);
for (const item of data.results ?? []) {
  console.log(item.trackName ?? item.collectionName, item.artistName,
    item.trackId ?? item.collectionId, item.trackViewUrl ?? item.collectionViewUrl);
}
// Metadata example only. Artwork and previews have separate Apple usage terms.`),
];
