# Episteme

Episteme is an API playground for 20 public APIs that need no key and no signup. You pick an API, adjust its parameters, send the request, and see the response rendered as something readable (a forecast, a card image, a satellite scene, a protein) next to the raw JSON and a ready-to-copy `curl` command.

The APIs are grouped into four phases named after the four combinations of knowing and not knowing.

## The APIs

**Known Knowns: everyday signals**
Open-Meteo weather, Kraken spot markets, ESPN scoreboard, Hacker News, Frankfurter (ECB) exchange rates.

**Known Unknowns: specialized archives**
PokéAPI, Scryfall (Magic: The Gathering), arXiv, Crossref, Earth Search STAC (Sentinel-2 satellite scenes).

**Unknown Knowns: data already being recorded**
USGS earthquakes, Wayback Machine CDX, RIPEstat (BGP and prefix data), GBIF biodiversity, UK National Grid carbon intensity.

**Unknown Unknowns: surprising capabilities**
Compiler Explorer (Godbolt), RCSB Protein Data Bank, Wikidata SPARQL, NOAA space weather, Hugging Face model hub.

## Run it locally

You need Node.js 22 or newer.

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
| `POST /api/proxy` | Forwards a GET or POST to one of the 20 allowed API hosts and returns the status, latency, size and body. |
| `GET /api/hn-stories` | Fetches the top Hacker News stories in one call. |
| `GET /api/image-proxy` | Fetches images from a short list of allowed image hosts. |

Both proxies refuse any host that is not on the allowlist in [`lib/api-core.ts`](lib/api-core.ts). That file holds the handler logic. The local Express server ([`server.ts`](server.ts)) and the Netlify Functions ([`netlify/functions`](netlify/functions)) both call it, so the two always behave the same.

## Add an API

1. Add an entry to [`src/data/apis.ts`](src/data/apis.ts) with its phase, parameters, request builder and `curl` example.
2. Add the API's host to `ALLOWED_HOSTS` in [`lib/api-core.ts`](lib/api-core.ts). If it serves images you want to display, add that host to `ALLOWED_IMAGE_HOSTS` too.
3. Optionally add a visual for its response in [`src/components/ResponseVisuals.tsx`](src/components/ResponseVisuals.tsx).

## Deploy

The repository includes a [`netlify.toml`](netlify.toml). Connect the repository to Netlify and it builds with `npm run build`, publishes `dist`, and runs the three endpoints as Netlify Functions.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the server with Vite hot reload. |
| `npm run build` | Builds the app into `dist`. |
| `npm run lint` | Type-checks the project. |

## License

[MIT](LICENSE)
