// Shared request handlers for the three small server-side endpoints.
// Used by both the local Express server (server.ts) and the Netlify Functions
// in netlify/functions, so the allowlists live in exactly one place.

export const SITE_URL = 'https://github.com/devin-thomas/episteme';
const USER_AGENT = `Episteme-API-Playground/1.0 (+${SITE_URL})`;

export const ALLOWED_HOSTS = new Set([
  'api.open-meteo.com',
  'api.kraken.com',
  'site.api.espn.com',
  'hacker-news.firebaseio.com',
  'api.frankfurter.dev',
  'pokeapi.co',
  'api.scryfall.com',
  'export.arxiv.org',
  'api.crossref.org',
  'earth-search.aws.element84.com',
  'earthquake.usgs.gov',
  'web.archive.org',
  'stat.ripe.net',
  'api.gbif.org',
  'api.carbonintensity.org.uk',
  'godbolt.org',
  'data.rcsb.org',
  'query.wikidata.org',
  'services.swpc.noaa.gov',
  'huggingface.co',
  'api.tvmaze.com',
  'nagerholidays.com',
  'api.zippopotam.us',
  'api.dictionaryapi.dev',
  'itunes.apple.com',
  'openlibrary.org',
  'musicbrainz.org',
  'api.artic.edu',
  'images-api.nasa.gov',
  'graphql.anilist.co',
  'api.worldbank.org',
  'api.weather.gov',
  'world.openfoodfacts.org',
  'api.npmjs.org',
  'api.fiscaldata.treasury.gov',
  'api.osv.dev',
  'pubchem.ncbi.nlm.nih.gov',
  'exoplanetarchive.ipac.caltech.edu',
  'overpass-api.de',
  'api.drand.sh',
]);

export const ALLOWED_IMAGE_HOSTS = new Set([
  'raw.githubusercontent.com',
  'cards.scryfall.io',
  'cdn.rcsb.org',
  'earth-search.aws.element84.com',
  'sentinel-cogs.s3.us-west-2.amazonaws.com',
  'commons.wikimedia.org',
  'upload.wikimedia.org',
  'www.artic.edu',
  'images-assets.nasa.gov',
  'images.openfoodfacts.org',
  'pubchem.ncbi.nlm.nih.gov',
]);

export function isAllowedHost(rawUrl: string, allowSet: Set<string>): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443')) return null;
    return allowSet.has(parsed.hostname) ? parsed : null;
  } catch {
    return null;
  }
}

// Validate every redirect hop, not just the first host in a request.
async function fetchAllowed(url: URL, allowSet: Set<string>, init: RequestInit): Promise<Response> {
  let current = url;
  let options = { ...init, redirect: 'manual' as const };
  for (let hop = 0; hop <= 3; hop++) {
    const response = await fetch(current, options);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    const next = location ? isAllowedHost(new URL(location, current).toString(), allowSet) : null;
    if (!next) throw new Error('Upstream redirect left the public API allowlist');
    if (response.status === 303 || ([301, 302].includes(response.status) && options.method === 'POST')) {
      options = { ...options, method: 'GET', body: undefined };
    }
    current = next;
  }
  throw new Error('Too many upstream redirects');
}

// Courtesy pacing and a short response cache per warm server instance.
// These are not global quota enforcement across separate Netlify instances.
const PROVIDER_INTERVAL_MS: Record<string, number> = {
  'api.tvmaze.com': 600,
  'itunes.apple.com': 3100,
  'openlibrary.org': 1100,
  'musicbrainz.org': 1100,
  'graphql.anilist.co': 2100,
  'world.openfoodfacts.org': 4200,
  'overpass-api.de': 1100,
};
const nextRequestAt = new Map<string, number>();
const responseCache = new Map<string, { expires: number; body: Record<string, unknown> }>();

interface ProxyRequestBody {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
}

export async function handleProxy(payload: unknown): Promise<Response> {
  const req = payload as ProxyRequestBody | undefined;
  if (!req || typeof req.url !== 'string') {
    return Response.json({ error: 'Missing target url' }, { status: 400 });
  }

  const targetUrl = isAllowedHost(req.url, ALLOWED_HOSTS);
  if (!targetUrl) {
    return Response.json(
      { error: 'Target host is not in the Episteme public API allowlist' },
      { status: 403 },
    );
  }

  const method = req.method === 'POST' ? 'POST' : 'GET';
  const interval = PROVIDER_INTERVAL_MS[targetUrl.hostname];
  const cacheKey = JSON.stringify([targetUrl.toString(), method, req.headers, req.body]);
  if (interval) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return Response.json({ ...cached.body, cached: true });
    responseCache.delete(cacheKey);
    const waitMs = (nextRequestAt.get(targetUrl.hostname) ?? 0) - Date.now();
    if (waitMs > 0) {
      const seconds = Math.ceil(waitMs / 1000);
      return Response.json({ error: `Please wait ${seconds}s before another request to ${targetUrl.hostname}.` }, {
        status: 429, headers: { 'Retry-After': String(seconds) },
      });
    }
    nextRequestAt.set(targetUrl.hostname, Date.now() + interval);
  }
  const outboundHeaders: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, application/xml, text/plain, */*',
    ...(req.headers ?? {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  const startedAt = performance.now();

  try {
    const fetchInit: RequestInit = { method, headers: outboundHeaders, signal: controller.signal };

    if (method === 'POST' && req.body !== undefined) {
      if (typeof req.body === 'string') {
        fetchInit.body = req.body;
      } else {
        fetchInit.body = JSON.stringify(req.body);
        if (!outboundHeaders['Content-Type']) {
          outboundHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    const upstream = await fetchAllowed(targetUrl, ALLOWED_HOSTS, fetchInit);
    const rawText = await upstream.text();
    const latencyMs = Math.round(performance.now() - startedAt);
    const contentType = upstream.headers.get('content-type') ?? 'text/plain';
    const sizeBytes = new TextEncoder().encode(rawText).length;

    let parsedBody: unknown = rawText;
    if (
      contentType.includes('application/json') ||
      contentType.includes('application/sparql-results+json') ||
      contentType.includes('application/geo+json') ||
      rawText.trim().startsWith('{') ||
      rawText.trim().startsWith('[')
    ) {
      try {
        parsedBody = JSON.parse(rawText);
      } catch {
        parsedBody = rawText;
      }
    }

    const result = {
      status: upstream.status,
      statusText: upstream.statusText,
      latencyMs,
      sizeBytes,
      contentType,
      data: parsedBody,
    };
    const hasProviderErrors = parsedBody && typeof parsedBody === 'object'
      && 'errors' in parsedBody && Array.isArray(parsedBody.errors) && parsedBody.errors.length > 0;
    if (interval && upstream.ok && !hasProviderErrors && sizeBytes <= 1024 * 1024) {
      if (responseCache.size >= 64) responseCache.delete(responseCache.keys().next().value!);
      responseCache.set(cacheKey, { expires: Date.now() + 60_000, body: result });
    }
    return Response.json(result);
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return Response.json({ error: message, latencyMs }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

const HN_FEEDS = new Set(['topstories', 'newstories', 'beststories', 'askstories', 'showstories']);

// Fetches the top N Hacker News stories in parallel.
export async function handleHnStories(feed: string | null, limitParam: string | null): Promise<Response> {
  const safeFeed = feed && HN_FEEDS.has(feed) ? feed : 'topstories';
  const limit = Math.min(Math.max(Number(limitParam) || 8, 1), 15);
  const startedAt = performance.now();

  try {
    const idsResp = await fetch(`https://hacker-news.firebaseio.com/v0/${safeFeed}.json`);
    const ids = (await idsResp.json()) as number[];
    const items = await Promise.all(
      ids.slice(0, limit).map(async (id) => {
        const itemResp = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return itemResp.json();
      }),
    );
    const latencyMs = Math.round(performance.now() - startedAt);
    const serialized = JSON.stringify(items);
    return Response.json({
      status: 200,
      statusText: 'OK',
      latencyMs,
      sizeBytes: new TextEncoder().encode(serialized).length,
      contentType: 'application/json',
      data: { feed: safeFeed, totalIds: ids.length, items },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Hacker News items';
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function handleImageProxy(rawUrl: string | null): Promise<Response> {
  const parsed = isAllowedHost(rawUrl ?? '', ALLOWED_IMAGE_HOSTS);
  if (!parsed) {
    return new Response('Forbidden image host', { status: 403 });
  }

  try {
    const upstream = await fetchAllowed(parsed, ALLOWED_IMAGE_HOSTS, {
      headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(14000),
    });
    if (!upstream.ok) {
      return new Response('Image fetch failed', { status: upstream.status });
    }
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    return new Response(await upstream.arrayBuffer(), {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return new Response('Image proxy error', { status: 502 });
  }
}
