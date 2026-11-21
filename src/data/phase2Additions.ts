import type { ApiDefinition } from '../types/api';
import { withExamples } from './requestExamples';

const USER_AGENT = 'Episteme-API-Playground/1.0 (+https://github.com/devin-thomas/episteme)';
const ANILIST_QUERY = `query AnimeSearch($search: String!, $format: MediaFormat) {
  Page(page: 1, perPage: 6) {
    media(search: $search, type: ANIME, isAdult: false, format: $format, sort: SEARCH_MATCH) {
      id
      title { romaji english }
      format
      episodes
      averageScore
      status
      seasonYear
      siteUrl
      genres
      studios(isMain: true) { nodes { name } }
    }
  }
}`;

export const PHASE2_ADDITIONS: ApiDefinition[] = [
  withExamples({
    id: 'open-library', index: '26', phase: 2,
    name: 'Open Library Books', domain: 'Books & Editions',
    shortPitch: 'Find books by title or author, compare publication years, and count editions.',
    epistemicNote: 'Known unknown: search a catalog of works and editions to identify the exact book and its authors.',
    method: 'GET', docsUrl: 'https://openlibrary.org/dev/docs/api/search',
    params: [
      { key: 'query', label: 'Book or Author', type: 'text', defaultValue: 'The Left Hand of Darkness', placeholder: 'Title, author, or a Solr query' },
      { key: 'sort', label: 'Order', type: 'select', defaultValue: 'relevance', options: [
        { label: 'Relevance', value: 'relevance' }, { label: 'First published: oldest', value: 'old' }, { label: 'First published: newest', value: 'new' },
      ] },
    ],
    presets: [
      { label: 'The Left Hand of Darkness', values: { query: 'The Left Hand of Darkness', sort: 'relevance' } },
      { label: 'A Wizard of Earthsea', values: { query: 'A Wizard of Earthsea', sort: 'relevance' } },
      { label: 'Computer Programming', values: { query: 'The Art of Computer Programming', sort: 'relevance' } },
    ],
    buildRequest: (v) => {
      const params = new URLSearchParams({ q: (v.query || '').trim() || 'The Left Hand of Darkness', fields: 'key,title,author_name,first_publish_year,edition_count', limit: '6' });
      if (['old', 'new'].includes(v.sort)) params.set('sort', v.sort);
      return { method: 'GET', url: `https://openlibrary.org/search.json?${params}`, headers: { 'User-Agent': USER_AGENT } };
    },
  }, `console.table((data.docs ?? []).map((book: any) => ({
  title: book.title,
  authors: (book.author_name ?? []).join(', '),
  firstPublished: book.first_publish_year,
  editions: book.edition_count,
  url: 'https://openlibrary.org' + book.key,
})));`),

  withExamples({
    id: 'musicbrainz-artists', index: '27', phase: 2,
    name: 'MusicBrainz Artists', domain: 'Music Identity & Credits',
    shortPitch: 'Resolve artist names to stable MusicBrainz IDs, countries, aliases, and disambiguation notes.',
    epistemicNote: 'Known unknown: distinguish musicians with similar names before joining recordings and credits by their identifiers.',
    method: 'GET', docsUrl: 'https://musicbrainz.org/doc/MusicBrainz_API/Search#Artist',
    params: [
      { key: 'query', label: 'Artist Search', type: 'text', defaultValue: 'artist:"Nobuo Uematsu"', placeholder: 'Artist name or Lucene query, e.g. artist:"Nujabes"' },
    ],
    presets: [
      { label: 'Nobuo Uematsu', values: { query: 'artist:"Nobuo Uematsu"' } },
      { label: 'Yoko Shimomura', values: { query: 'artist:"Yoko Shimomura"' } },
      { label: 'Nujabes', values: { query: 'artist:"Nujabes"' } },
    ],
    buildRequest: (v) => ({
      method: 'GET',
      url: `https://musicbrainz.org/ws/2/artist/?${new URLSearchParams({ query: (v.query || '').trim() || 'artist:"Nobuo Uematsu"', fmt: 'json', limit: '6' })}`,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    }),
  }, `// Keep MusicBrainz requests at least one second apart.
console.table((data.artists ?? []).map((artist: any) => ({
  name: artist.name,
  mbid: artist.id,
  type: artist.type,
  country: artist.country ?? artist.area?.name,
  note: artist.disambiguation ?? '',
})));`),

  withExamples({
    id: 'art-institute', index: '28', phase: 2,
    name: 'Art Institute of Chicago', domain: 'Museum Collections & IIIF',
    shortPitch: 'Search public-domain artworks with artist credits, materials, dates, and IIIF images.',
    epistemicNote: 'Known unknown: query museum catalog records and derive an image URL from each artwork’s IIIF identifier.',
    method: 'GET', docsUrl: 'https://api.artic.edu/docs/',
    params: [
      { key: 'query', label: 'Artist or Subject', type: 'text', defaultValue: 'Monet', placeholder: 'Artist, title, material, or subject' },
    ],
    presets: [
      { label: 'Monet', values: { query: 'Monet' } },
      { label: 'Hokusai', values: { query: 'Hokusai' } },
      { label: 'Van Gogh', values: { query: 'Van Gogh' } },
    ],
    buildRequest: (v) => ({
      method: 'GET',
      url: `https://api.artic.edu/api/v1/artworks/search?${new URLSearchParams({ q: (v.query || '').trim() || 'Monet', 'query[term][is_public_domain]': 'true', fields: 'id,title,artist_display,date_display,image_id,is_public_domain,medium_display,thumbnail', limit: '6' })}`,
      headers: { 'User-Agent': USER_AGENT, 'AIC-User-Agent': USER_AGENT },
    }),
  }, `const iiif = data.config?.iiif_url ?? 'https://www.artic.edu/iiif/2';
console.table((data.data ?? []).map((art: any) => ({
  title: art.title,
  artist: art.artist_display,
  date: art.date_display,
  image: art.image_id && art.is_public_domain
    ? \`\${iiif}/\${art.image_id}/full/843,/0/default.jpg\` : null,
})));`),

  withExamples({
    id: 'nasa-images', index: '29', phase: 2,
    name: 'NASA Image Library', domain: 'Spaceflight Media Archive',
    shortPitch: 'Search NASA mission photographs and telescope images with dates, credits, and asset manifests.',
    epistemicNote: 'Known unknown: locate a mission or celestial subject, then follow its media manifest to the available image files.',
    method: 'GET', docsUrl: 'https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf',
    params: [
      { key: 'query', label: 'Mission or Subject', type: 'text', defaultValue: 'Apollo 11', placeholder: 'Apollo 11, James Webb, Mars rover' },
    ],
    presets: [
      { label: 'Apollo 11', values: { query: 'Apollo 11' } },
      { label: 'James Webb', values: { query: 'James Webb' } },
      { label: 'Mars Rover', values: { query: 'Mars rover' } },
    ],
    buildRequest: (v) => ({ method: 'GET', url: `https://images-api.nasa.gov/search?${new URLSearchParams({ q: (v.query || '').trim() || 'Apollo 11', media_type: 'image', page_size: '6' })}` }),
  }, `console.table((data.collection?.items ?? []).map((item: any) => {
  const media = item.data?.[0] ?? {};
  return {
    title: media.title,
    nasaId: media.nasa_id,
    date: media.date_created,
    center: media.center,
    thumbnail: item.links?.find((link: any) => link.rel === 'preview')?.href,
    assetManifest: item.href,
  };
}));`),

  withExamples({
    id: 'anilist-anime', index: '30', phase: 2,
    name: 'AniList Anime', domain: 'Anime Catalog & GraphQL',
    shortPitch: 'Search anime titles, formats, episode counts, studios, and community scores through GraphQL.',
    epistemicNote: 'Known unknown: retrieve selected catalog fields in a read-only GraphQL query without an account or token.',
    method: 'POST', docsUrl: 'https://docs.anilist.co/guide/graphql/pagination',
    params: [
      { key: 'query', label: 'Anime Title', type: 'text', defaultValue: 'Cowboy Bebop', placeholder: 'Anime title in English or romanized Japanese' },
      { key: 'format', label: 'Format', type: 'select', defaultValue: 'all', options: [
        { label: 'All formats', value: 'all' }, { label: 'TV series', value: 'TV' }, { label: 'Movie', value: 'MOVIE' }, { label: 'Original video animation', value: 'OVA' },
      ] },
    ],
    presets: [
      { label: 'Cowboy Bebop', values: { query: 'Cowboy Bebop', format: 'all' } },
      { label: 'Dragon Ball', values: { query: 'Dragon Ball', format: 'TV' } },
      { label: 'Spirited Away', values: { query: 'Spirited Away', format: 'MOVIE' } },
    ],
    buildRequest: (v) => ({
      method: 'POST', url: 'https://graphql.anilist.co', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: { query: ANILIST_QUERY, variables: { search: (v.query || '').trim() || 'Cowboy Bebop', format: ['TV', 'MOVIE', 'OVA'].includes(v.format) ? v.format : null } },
    }),
  }, `if (data.errors?.length) {
  throw new Error(data.errors.map((error: any) => error.message).join('; '));
}
console.table((data.data?.Page?.media ?? []).map((anime: any) => ({
  title: anime.title?.english ?? anime.title?.romaji,
  format: anime.format,
  episodes: anime.episodes,
  scoreOutOf100: anime.averageScore,
  studios: (anime.studios?.nodes ?? []).map((studio: any) => studio.name).join(', '),
  url: anime.siteUrl,
})));`),
];
