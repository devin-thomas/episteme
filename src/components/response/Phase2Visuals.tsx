import { ResilientImage } from '../ResilientImage';
import { DataTable, PreviewEmpty, PreviewLink, formatNumber } from './PreviewPrimitives';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const records = (value: unknown): RecordValue[] => Array.isArray(value) ? value.filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item)) : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const texts = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function Phase2Visuals({ apiId, data }: { apiId: string; data: unknown }) {
  const payload = record(data);
  switch (apiId) {
    case 'open-library': {
      const books = records(payload.docs);
      return <DataTable caption={`${formatNumber(payload.numFound ?? payload.num_found)} matches · Open Library`} headers={['Book', 'Authors', 'First published', 'Editions']} rows={books.map((book) => [
        <PreviewLink href={text(book.key).startsWith('/works/') ? `https://openlibrary.org${text(book.key)}` : undefined}>{text(book.title) || 'Untitled work'}</PreviewLink>,
        texts(book.author_name).join(', ') || '—', typeof book.first_publish_year === 'number' ? book.first_publish_year : '—', formatNumber(book.edition_count),
      ])} />;
    }
    case 'musicbrainz-artists': {
      const artists = records(payload.artists);
      return <DataTable caption={`${formatNumber(payload.count)} matches · MusicBrainz`} headers={['Artist', 'Type', 'Country / area', 'Disambiguation']} rows={artists.map((artist) => [
        <div><PreviewLink href={text(artist.id) ? `https://musicbrainz.org/artist/${encodeURIComponent(text(artist.id))}` : undefined}>{text(artist.name) || 'Unnamed artist'}</PreviewLink><div className="mt-1 text-[10px] font-mono text-slate-500 break-all">{text(artist.id)}</div></div>,
        text(artist.type) || '—', text(artist.country) || text(record(artist.area).name) || '—', text(artist.disambiguation) || '—',
      ])} />;
    }
    case 'art-institute': {
      const artworks = records(payload.data);
      if (!artworks.length) return <PreviewEmpty>No public-domain artworks matched this search.</PreviewEmpty>;
      return <div className="p-5 space-y-4"><p className="text-xs text-slate-500 dark:text-slate-400">Art Institute of Chicago · Public-domain collection</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{artworks.map((art, i) => {
        const title = text(art.title) || 'Untitled artwork';
        const imageId = text(art.image_id);
        const image = imageId && art.is_public_domain === true ? `https://www.artic.edu/iiif/2/${encodeURIComponent(imageId)}/full/400,/0/default.jpg` : undefined;
        return <figure key={String(art.id ?? i)} className="min-w-0 space-y-2">
          <ResilientImage key={image ?? 'no-image'} src={image} alt={text(record(art.thumbnail).alt_text) || title} className="w-full h-40 object-contain rounded" fallbackLabel="No public-domain image" />
          <figcaption className="space-y-1"><div className="font-medium text-sm"><PreviewLink href={typeof art.id === 'number' ? `https://www.artic.edu/artworks/${art.id}` : undefined}>{title}</PreviewLink></div><p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">{text(art.artist_display) || 'Artist unrecorded'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{[text(art.date_display), text(art.medium_display)].filter(Boolean).join(' · ')}</p>{image && <p className="text-[11px] text-slate-500 dark:text-slate-400">Image: Art Institute of Chicago, CC0</p>}</figcaption>
        </figure>;
      })}</div></div>;
    }
    case 'nasa-images': {
      const collection = record(payload.collection);
      const items = records(collection.items);
      if (!items.length) return <PreviewEmpty>No NASA images matched this search.</PreviewEmpty>;
      return <div className="p-5 space-y-4"><p className="text-xs text-slate-500 dark:text-slate-400">{formatNumber(record(collection.metadata).total_hits)} matches · NASA Image Library</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{items.map((item, i) => {
        const meta = records(item.data)[0] ?? {};
        const preview = records(item.links).find((link) => link.rel === 'preview' && link.render === 'image');
        const title = text(meta.title) || 'NASA image';
        const thumbnail = text(preview?.href);
        return <figure key={text(meta.nasa_id) || i} className="min-w-0 space-y-2">
          <ResilientImage key={thumbnail || 'no-image'} src={thumbnail || undefined} alt={title} className="w-full h-40 object-cover rounded" />
          <figcaption className="space-y-1"><div className="text-sm font-medium">{title}</div><p className="text-xs text-slate-500 dark:text-slate-400">{[text(meta.center), text(meta.date_created).slice(0, 10)].filter(Boolean).join(' · ')}</p><p className="text-xs text-slate-500 dark:text-slate-400">{text(meta.photographer) || text(meta.secondary_creator) || (text(meta.center) ? `NASA / ${text(meta.center)}` : 'NASA')}</p><div className="text-xs"><PreviewLink href={text(item.href)}>Asset manifest · {text(meta.nasa_id) || 'files'}</PreviewLink></div></figcaption>
        </figure>;
      })}</div></div>;
    }
    case 'anilist-anime': {
      const errors = records(payload.errors);
      if (errors.length) return <PreviewEmpty>{errors.map((error) => text(error.message) || 'GraphQL request failed.').join(' ')}</PreviewEmpty>;
      const anime = records(record(record(payload.data).Page).media);
      return <DataTable caption="AniList · Community scores are out of 100" headers={['Title', 'Format / year', 'Episodes', 'Score', 'Studio']} rows={anime.map((entry) => [
        <div><PreviewLink href={text(entry.siteUrl)}>{text(record(entry.title).english) || text(record(entry.title).romaji) || 'Untitled anime'}</PreviewLink><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{texts(entry.genres).slice(0, 3).join(' · ')}</div></div>,
        [text(entry.format).replaceAll('_', ' '), typeof entry.seasonYear === 'number' ? String(entry.seasonYear) : ''].filter(Boolean).join(' · ') || '—',
        formatNumber(entry.episodes), formatNumber(entry.averageScore), records(record(entry.studios).nodes).map((studio) => text(studio.name)).filter(Boolean).join(', ') || '—',
      ])} />;
    }
    default: return null;
  }
}
