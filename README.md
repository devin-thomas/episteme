# Episteme

Live site: https://episteme-api.netlify.app

Episteme is an API playground for 40 public APIs that need no key and no signup. Pick an API, adjust its parameters, send the request, and inspect a readable preview alongside the raw response and copyable code.

The APIs are grouped into four phases named after the four combinations of knowing and not knowing.

## The APIs

**Known Knowns: everyday signals**
Open-Meteo weather, Kraken spot markets, ESPN scoreboard, Hacker News, Frankfurter (ECB) exchange rates, TVmaze, Nager.Date holidays, Zippopotam.us postal codes, Free Dictionary, Apple iTunes Search.

**Known Unknowns: specialized archives**
PokéAPI, Scryfall (Magic: The Gathering), arXiv, Crossref, Earth Search STAC (Sentinel-2 satellite scenes), Open Library, MusicBrainz, Art Institute of Chicago, NASA Image Library, AniList GraphQL.

**Unknown Knowns: data already being recorded**
USGS earthquakes, Wayback Machine CDX, RIPEstat (BGP and prefix data), GBIF biodiversity, UK National Grid carbon intensity, World Bank indicators, US National Weather Service alerts, Open Food Facts, npm downloads, US Treasury interest rates.

**Unknown Unknowns: surprising capabilities**
Compiler Explorer (Godbolt), RCSB Protein Data Bank, Wikidata SPARQL, NOAA space weather, Hugging Face model hub, OSV vulnerabilities, PubChem compounds, NASA Exoplanet Archive, OpenStreetMap Overpass, drand randomness beacon.

## Examples

The 20 added integrations include 64 presets, editable parameters, standalone Node.js 22.18+ TypeScript and curl examples, and dedicated response previews. Save a new TypeScript example as `example.mts` and run `node example.mts`; no extra packages are required. The examples and live requests share one request builder, including JSON GraphQL requests and form-encoded Overpass queries.

| Group | Example queries and provider notes |
| --- | --- |
| Everyday signals | [TV, holidays, postal codes, words, music and podcasts](docs/apis/phase1-additions.md) |
| Specialized archives | [Books, artists, museum works, NASA images and anime](docs/apis/phase2-additions.md) |
| Recorded data | [Indicators, weather alerts, food labels, package usage and Treasury rates](docs/apis/phase3-additions.md) |
| Frontier capabilities | [Vulnerabilities, chemistry, exoplanets, map queries and randomness](docs/apis/phase4-additions.md) |

Each API has a shareable URL, such as [`?api=anilist-anime`](https://episteme-api.netlify.app/?api=anilist-anime). Empty results, HTTP errors and provider rate limits remain visible; Raw Payload preserves the returned body. Public service availability and reuse terms belong to each provider.

## Run it locally

You need Node.js 22.18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables or API keys are required.

To serve a production build with the same server:

```bash
npm run build
NODE_ENV=production npm start
```

## How it works

The interface is a React app built with Vite and Tailwind CSS. Browsers block cross-origin requests to many of these APIs, so the app sends its requests through three small endpoints:

| Endpoint | What it does |
| --- | --- |
| `POST /api/proxy` | Forwards a GET or POST to an allowed API host and returns the status, latency, size and body. |
| `GET /api/hn-stories` | Fetches the top Hacker News stories in one call. |
| `GET /api/image-proxy` | Fetches images from a short list of allowed image hosts. |

Both proxies validate HTTPS hosts, ports, credentials, and every redirect against the allowlists in [`lib/api-core.ts`](lib/api-core.ts). Selected providers also have courtesy request pacing and a bounded 60-second cache per server instance. This reduces repeated requests; it does not enforce a shared global quota across Netlify instances. The local Express server ([`server.ts`](server.ts)) and the Netlify Functions ([`netlify/functions`](netlify/functions)) call the same handlers.

## Add an API

1. Add an entry to the appropriate `src/data/phase*Additions.ts` module, using [`withExamples`](src/data/requestExamples.ts) to derive TypeScript and curl from the request builder. The catalog composition and display numbering live in [`src/data/apis.ts`](src/data/apis.ts).
2. Add the API's host to `ALLOWED_HOSTS` in [`lib/api-core.ts`](lib/api-core.ts). If it serves images you want to display, add that host to `ALLOWED_IMAGE_HOSTS` too.
3. Add a response preview in the appropriate `src/components/response/Phase*Visuals.tsx` module and a reduced fixture under `tests/fixtures`. Previews are dispatched through [`ResponseVisuals.tsx`](src/components/ResponseVisuals.tsx).
4. Add presets and provider references, then run the checks below. The catalog contract test intentionally checks this release's 40-entry target; update that expectation when extending it further.

## Deploy

The repository includes a [`netlify.toml`](netlify.toml). Connect the repository to Netlify and it builds with `npm run build`, publishes `dist`, and runs the three endpoints as Netlify Functions.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the server with Vite hot reload. |
| `npm run build` | Builds the app into `dist`. |
| `npm run lint` | Type-checks the project. |
| `npm test` | Checks catalog counts, request examples, shell quoting, response previews and proxy boundaries without external API calls. |

## License

[MIT](LICENSE)
