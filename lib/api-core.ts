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
]);

export const ALLOWED_IMAGE_HOSTS = new Set([
  'raw.githubusercontent.com',
  'cards.scryfall.io',
  'cdn.rcsb.org',
  'earth-search.aws.element84.com',
  'sentinel-cogs.s3.us-west-2.amazonaws.com',
  'commons.wikimedia.org',
  'upload.wikimedia.org',
]);

export function isAllowedHost(rawUrl: string, allowSet: Set<string>): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    return allowSet.has(parsed.hostname) ? parsed : null;
  } catch {
    return null;
  }
}

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

    const upstream = await fetch(targetUrl.toString(), fetchInit);
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

    return Response.json({
      status: upstream.status,
      statusText: upstream.statusText,
      latencyMs,
      sizeBytes,
      contentType,
      data: parsedBody,
    });
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
    const upstream = await fetch(parsed.toString(), { headers: { 'User-Agent': USER_AGENT } });
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
