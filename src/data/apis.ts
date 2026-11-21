import type { ApiDefinition, ParamValues } from '../types/api';
import { PHASE1_ADDITIONS } from './phase1Additions';
import { PHASE2_ADDITIONS } from './phase2Additions';
import { PHASE3_ADDITIONS } from './phase3Additions';
import { PHASE4_ADDITIONS } from './phase4Additions';

const CITY_COORDS: Record<string, { lat: string; lon: string; label: string }> = {
  sf: { lat: '37.7749', lon: '-122.4194', label: 'San Francisco' },
  tokyo: { lat: '35.6762', lon: '139.6503', label: 'Tokyo' },
  reykjavik: { lat: '64.1466', lon: '-21.9426', label: 'Reykjavik' },
  nairobi: { lat: '-1.2921', lon: '36.8219', label: 'Nairobi' },
  zurich: { lat: '47.3769', lon: '8.5417', label: 'Zurich' },
};

const BBOX_REGIONS: Record<string, { bbox: [number, number, number, number]; label: string }> = {
  sf_bay: { bbox: [-122.55, 37.65, -122.25, 37.9], label: 'San Francisco Bay' },
  alps: { bbox: [7.6, 45.9, 8.1, 46.2], label: 'Swiss Alps (Matterhorn)' },
  nile: { bbox: [30.8, 30.8, 31.4, 31.3], label: 'Nile Delta' },
  amazon: { bbox: [-60.2, -3.3, -59.8, -2.9], label: 'Manaus / Amazon River' },
};

const GODBOLT_PRESETS: Record<string, { compiler: string; flags: string; source: string }> = {
  invsqrt: {
    compiler: 'g141',
    flags: '-O3 -march=x86-64-v3',
    source: `// Fast bit-level float reciprocal approximation
#include <cstdint>
#include <bit>

float fast_inv_sqrt(float x) {
    float half = 0.5f * x;
    std::uint32_t i = std::bit_cast<std::uint32_t>(x);
    i = 0x5f3759df - (i >> 1);
    float y = std::bit_cast<float>(i);
    return y * (1.5f - half * y * y);
}`,
  },
  simd: {
    compiler: 'g141',
    flags: '-O3 -mavx2',
    source: `// Auto-vectorized dot product with AVX2
#include <cstddef>

float dot_product(const float* __restrict a,
                  const float* __restrict b,
                  std::size_t n) {
    float acc = 0.0f;
    for (std::size_t i = 0; i < n; ++i) {
        acc += a[i] * b[i];
    }
    return acc;
}`,
  },
  constexpr_fib: {
    compiler: 'g141',
    flags: '-O3 -std=c++23',
    source: `// Evaluated entirely at compile time -> single mov instruction
consteval unsigned long long fib(unsigned n) {
    unsigned long long a = 0, b = 1;
    for (unsigned i = 0; i < n; ++i) {
        auto next = a + b;
        a = b;
        b = next;
    }
    return a;
}

unsigned long long fib_40() {
    return fib(40);
}`,
  },
  rust_iter: {
    compiler: 'r1800',
    flags: '-O',
    source: `// Zero-cost iterator pipeline compiled to tight loop
pub fn sum_even_squares(nums: &[i64]) -> i64 {
    nums.iter()
        .copied()
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .sum()
}`,
  },
};

const SPARQL_PRESETS: Record<string, string> = {
  capitals_elevation: `SELECT ?countryLabel ?capitalLabel ?elevation WHERE {
  ?country wdt:P31 wd:Q3624078;
           wdt:P36 ?capital.
  ?capital wdt:P2044 ?elevation.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?elevation)
LIMIT 8`,
  nobel_patents: `SELECT ?laureateLabel ?awardLabel ?fieldLabel WHERE {
  ?laureate wdt:P166 wd:Q38104;
            wdt:P101 ?field.
  BIND(wd:Q38104 AS ?award)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 8`,
  elements_discovery: `SELECT ?elementLabel ?symbol ?atomicNumber ?discovered WHERE {
  ?element wdt:P31 wd:Q11344;
           wdt:P246 ?symbol;
           wdt:P1086 ?atomicNumber;
           wdt:P575 ?discovered.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?discovered)
LIMIT 8`,
  orbital_observatories: `SELECT ?telescopeLabel ?launchDate ?operatorLabel WHERE {
  ?telescope wdt:P31 wd:Q148578;
             wdt:P619 ?launchDate;
             wdt:P137 ?operator.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?launchDate)
LIMIT 8`,
};

const ORIGINAL_APIS: ApiDefinition[] = [
  // =========================================================================
  // PHASE 1: KNOWN KNOWNS — Everyday Signals & Immediate Facts
  // =========================================================================
  {
    id: 'open-meteo',
    index: '01',
    phase: 1,
    name: 'Open-Meteo Weather',
    domain: 'Atmospheric Telemetry',
    shortPitch: 'Hyperlocal hourly forecasts, wind vectors, humidity, and WMO weather codes.',
    epistemicNote:
      'Classic known known: you know the coordinates and want immediate temperature, wind, and precipitation probability.',
    method: 'GET',
    sdkBadge: 'Python · openmeteo-requests',
    codeLanguage: 'python',
    docsUrl: 'https://open-meteo.com/en/docs',
    params: [
      {
        key: 'city',
        label: 'City Coordinate',
        type: 'select',
        defaultValue: 'sf',
        options: [
          { label: 'San Francisco (37.77, -122.42)', value: 'sf' },
          { label: 'Tokyo (35.68, 139.65)', value: 'tokyo' },
          { label: 'Reykjavik (64.15, -21.94)', value: 'reykjavik' },
          { label: 'Nairobi (-1.29, 36.82)', value: 'nairobi' },
          { label: 'Zurich (47.38, 8.54)', value: 'zurich' },
        ],
      },
      {
        key: 'unit',
        label: 'Temperature Unit',
        type: 'select',
        defaultValue: 'celsius',
        options: [
          { label: 'Celsius (°C)', value: 'celsius' },
          { label: 'Fahrenheit (°F)', value: 'fahrenheit' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => {
      const coord = CITY_COORDS[v.city] ?? CITY_COORDS.sf;
      const unit = v.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      return {
        method: 'GET',
        url: `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability&temperature_unit=${unit}&forecast_days=1`,
      };
    },
    buildSdkCode: (v: ParamValues) => {
      const coord = CITY_COORDS[v.city] ?? CITY_COORDS.sf;
      const unit = v.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      return `import openmeteo_requests

client = openmeteo_requests.Client()
params = {
    "latitude": ${coord.lat},
    "longitude": ${coord.lon},
    "current": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m"],
    "hourly": ["temperature_2m", "precipitation_probability"],
    "temperature_unit": "${unit}",
    "forecast_days": 1,
}

responses = client.weather_api("https://api.open-meteo.com/v1/forecast", params=params)
current = responses[0].Current()
print(f"${coord.label} temp: {current.Variables(0).Value():.1f}")`;
    },
    buildCurlCode: (v: ParamValues) => {
      const coord = CITY_COORDS[v.city] ?? CITY_COORDS.sf;
      const unit = v.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      return `curl -s "https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&temperature_unit=${unit}&forecast_days=1"`;
    },
  },
  {
    id: 'kraken-ticker',
    index: '02',
    phase: 1,
    name: 'Kraken Spot Markets',
    domain: 'Market Tickers',
    shortPitch: 'Live exchange bid/ask spreads, 24h volume-weighted average price, and trade counts.',
    epistemicNote:
      'Known known: you pick a trading pair and retrieve real-time orderbook top-of-book pricing without exchange auth.',
    method: 'GET',
    sdkBadge: 'TypeScript · ccxt',
    codeLanguage: 'typescript',
    docsUrl: 'https://docs.kraken.com/api/docs/rest-api/get-ticker-information',
    params: [
      {
        key: 'pair',
        label: 'Trading Pairs',
        type: 'select',
        defaultValue: 'XBTUSD,ETHUSD,SOLUSD',
        options: [
          { label: 'Major Basket (BTC, ETH, SOL)', value: 'XBTUSD,ETHUSD,SOLUSD' },
          { label: 'Bitcoin / USD & EUR', value: 'XBTUSD,XBTEUR' },
          { label: 'Layer-1 Assets (ETH, SOL, ADA, DOT)', value: 'ETHUSD,SOLUSD,ADAUSD,DOTUSD' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(v.pair || 'XBTUSD,ETHUSD,SOLUSD')}`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const pairs = (v.pair || 'XBTUSD,ETHUSD,SOLUSD').split(',');
      const ccxtPairs = pairs
        .map((p) => (p.startsWith('XBT') ? `BTC/${p.slice(3)}` : `${p.slice(0, 3)}/${p.slice(3)}`))
        .map((p) => `'${p}'`)
        .join(', ');
      return `import ccxt from 'ccxt';

const kraken = new ccxt.kraken({ enableRateLimit: true });
const tickers = await kraken.fetchTickers([${ccxtPairs}]);

for (const [symbol, data] of Object.entries(tickers)) {
  console.log(symbol, { last: data.last, vwap: data.vwap, bid: data.bid, ask: data.ask });
}`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(v.pair || 'XBTUSD,ETHUSD,SOLUSD')}"`,
  },
  {
    id: 'espn-scoreboard',
    index: '03',
    phase: 1,
    name: 'ESPN Public Scoreboard',
    domain: 'Live Sports',
    shortPitch: 'Real-time match scores, game clocks, team records, and stadium venues.',
    epistemicNote:
      'Known known: checking tonight’s scores and box-score metadata across major global sports leagues.',
    method: 'GET',
    sdkBadge: 'TypeScript · fetch',
    codeLanguage: 'typescript',
    docsUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    params: [
      {
        key: 'league',
        label: 'League Feed',
        type: 'select',
        defaultValue: 'basketball/nba',
        options: [
          { label: 'NBA Basketball', value: 'basketball/nba' },
          { label: 'NFL Football', value: 'football/nfl' },
          { label: 'English Premier League', value: 'soccer/eng.1' },
          { label: 'MLB Baseball', value: 'baseball/mlb' },
          { label: 'NHL Hockey', value: 'hockey/nhl' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://site.api.espn.com/apis/site/v2/sports/${v.league || 'basketball/nba'}/scoreboard`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const league = v.league || 'basketball/nba';
      return `const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard';
const res = await fetch(endpoint);
const { events } = await res.json();

const matches = events.map((ev: any) => {
  const comp = ev.competitions[0];
  return {
    matchup: ev.shortName,
    status: ev.status.type.shortDetail,
    scores: comp.competitors.map((c: any) => \`\${c.team.abbreviation}: \${c.score}\`),
  };
});
console.table(matches);`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://site.api.espn.com/apis/site/v2/sports/${v.league || 'basketball/nba'}/scoreboard" | jq '.events[].shortName'`,
  },
  {
    id: 'hacker-news',
    index: '04',
    phase: 1,
    name: 'Hacker News Firebase',
    domain: 'Tech News',
    shortPitch: 'Live front-page story IDs, score velocity, submitters, and discussion trees.',
    epistemicNote:
      'Known known: reading today’s developer news and ranking signals straight from Y Combinator’s public Firebase store.',
    method: 'GET',
    sdkBadge: 'Python · requests',
    codeLanguage: 'python',
    docsUrl: 'https://github.com/HackerNews/API',
    params: [
      {
        key: 'feed',
        label: 'Story Stream',
        type: 'select',
        defaultValue: 'topstories',
        options: [
          { label: 'Top Stories', value: 'topstories' },
          { label: 'Best Stories', value: 'beststories' },
          { label: 'New Stories', value: 'newstories' },
          { label: 'Ask HN', value: 'askstories' },
          { label: 'Show HN', value: 'showstories' },
        ],
      },
      {
        key: 'limit',
        label: 'Stories to Hydrate',
        type: 'select',
        defaultValue: '8',
        options: [
          { label: '5 stories', value: '5' },
          { label: '8 stories', value: '8' },
          { label: '12 stories', value: '12' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://hacker-news.firebaseio.com/v0/${v.feed || 'topstories'}.json`,
      localEndpoint: `/api/hn-stories?feed=${encodeURIComponent(v.feed || 'topstories')}&limit=${encodeURIComponent(v.limit || '8')}`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const feed = v.feed || 'topstories';
      const limit = v.limit || '8';
      return `import requests
from concurrent.futures import ThreadPoolExecutor

base = "https://hacker-news.firebaseio.com/v0"
story_ids = requests.get(f"{base}/${feed}.json").json()[:${limit}]

def fetch_item(item_id: int) -> dict:
    return requests.get(f"{base}/item/{item_id}.json").json()

with ThreadPoolExecutor(max_workers=8) as pool:
    stories = list(pool.map(fetch_item, story_ids))

for s in stories:
    print(f"[{s.get('score', 0):>4}] {s.get('title')}")`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://hacker-news.firebaseio.com/v0/${v.feed || 'topstories'}.json" | jq '.[0:${v.limit || '8'}]'`,
  },
  {
    id: 'frankfurter-fx',
    index: '05',
    phase: 1,
    name: 'Frankfurter (ECB) FX',
    domain: 'Central Bank Rates',
    shortPitch: 'Official European Central Bank daily reference currency exchange rates.',
    epistemicNote:
      'Known known: deterministic fiat conversion rates published every working day by the European Central Bank.',
    method: 'GET',
    sdkBadge: 'TypeScript · fetch',
    codeLanguage: 'typescript',
    docsUrl: 'https://frankfurter.dev/',
    params: [
      {
        key: 'base',
        label: 'Base Currency',
        type: 'select',
        defaultValue: 'USD',
        options: [
          { label: 'USD — US Dollar', value: 'USD' },
          { label: 'EUR — Euro', value: 'EUR' },
          { label: 'GBP — British Pound', value: 'GBP' },
          { label: 'JPY — Japanese Yen', value: 'JPY' },
          { label: 'CHF — Swiss Franc', value: 'CHF' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => {
      const base = v.base || 'USD';
      const targets = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SGD'].filter(
        (c) => c !== base
      );
      return {
        method: 'GET',
        url: `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${targets.join(',')}`,
      };
    },
    buildSdkCode: (v: ParamValues) => {
      const base = v.base || 'USD';
      const targets = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD'].filter((c) => c !== base);
      return `const base = '${base}';
const symbols = '${targets.join(',')}';

const res = await fetch(\`https://api.frankfurter.dev/v1/latest?base=\${base}&symbols=\${symbols}\`);
const { date, rates } = await res.json();

console.log(\`ECB Reference (\${date}) — 1 \${base} =\`, rates);`;
    },
    buildCurlCode: (v: ParamValues) => {
      const base = v.base || 'USD';
      const targets = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD'].filter((c) => c !== base);
      return `curl -s "https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${targets.join(',')}"`;
    },
  },

  // =========================================================================
  // PHASE 2: KNOWN UNKNOWNS — Deep Domain Exploration
  // =========================================================================
  {
    id: 'pokeapi',
    index: '06',
    phase: 2,
    name: 'PokéAPI',
    domain: 'Gaming Taxonomy',
    shortPitch: 'Complete Pokémon species stats, move sets, abilities, types, and official artwork.',
    epistemicNote:
      'Known unknown: you know the universe of 1,000+ species exists and inspect exact base stat vectors and sprite assets.',
    method: 'GET',
    sdkBadge: 'TypeScript · pokenode-ts',
    codeLanguage: 'typescript',
    docsUrl: 'https://pokeapi.co/docs/v2',
    params: [
      {
        key: 'species',
        label: 'Species Name or ID',
        type: 'text',
        defaultValue: 'gengar',
        placeholder: 'e.g. pikachu, gengar, rayquaza, lucario',
      },
    ],
    presets: [
      { label: 'Gengar', values: { species: 'gengar' } },
      { label: 'Rayquaza', values: { species: 'rayquaza' } },
      { label: 'Pikachu', values: { species: 'pikachu' } },
      { label: 'Metagross', values: { species: 'metagross' } },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent((v.species || 'gengar').toLowerCase().trim())}`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const name = (v.species || 'gengar').toLowerCase().trim();
      return `import { PokemonClient } from 'pokenode-ts';

const api = new PokemonClient();
const pokemon = await api.getPokemonByName('${name}');

const stats = Object.fromEntries(
  pokemon.stats.map((s) => [s.stat.name, s.base_stat])
);
console.log(\`#\${pokemon.id} \${pokemon.name}\`, stats);`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://pokeapi.co/api/v2/pokemon/${encodeURIComponent((v.species || 'gengar').toLowerCase().trim())}"`,
  },
  {
    id: 'scryfall',
    index: '07',
    phase: 2,
    name: 'Scryfall MTG Oracle',
    domain: 'Card Search DSL',
    shortPitch: 'Full-text Magic: The Gathering oracle search syntax, rulings, artwork, and market prices.',
    epistemicNote:
      'Known unknown: use a domain-specific boolean query syntax to filter 27,000+ cards by mana cost, color, and type.',
    method: 'GET',
    sdkBadge: 'Query · Scryfall DSL',
    codeLanguage: 'query',
    docsUrl: 'https://scryfall.com/docs/syntax',
    params: [
      {
        key: 'q',
        label: 'Scryfall Search Query',
        type: 'text',
        defaultValue: 't:dragon c:red mv<=5 is:commander',
        placeholder: 'e.g. t:angel cmc=4, or o:"draw three cards"',
      },
    ],
    presets: [
      { label: 'Red Dragons ≤5 MV', values: { q: 't:dragon c:red mv<=5 is:commander' } },
      { label: 'Zero-Cost Artifacts', values: { q: 't:artifact mv=0 f:vintage' } },
      { label: 'Lotus Cards', values: { q: 'lotus game:paper' } },
      { label: 'Blue Counterspells', values: { q: 'c:blue o:"counter target spell" mv<=2' } },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://api.scryfall.com/cards/search?q=${encodeURIComponent(v.q || 't:dragon c:red mv<=5')}&order=edhrec`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const q = v.q || 't:dragon c:red mv<=5 is:commander';
      return `// Scryfall Search Syntax (native boolean card DSL)
${q}

// TypeScript SDK equivalent (scryfall-sdk):
import * as Scry from 'scryfall-sdk';

const cards = await Scry.Cards.search('${q.replace(/'/g, "\\'")}', {
  order: 'edhrec',
}).waitForAll();

console.log(cards.slice(0, 4).map((c) => \`\${c.name} (\${c.mana_cost})\`));`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -sG "https://api.scryfall.com/cards/search" --data-urlencode "q=${v.q || 't:dragon c:red mv<=5'}" --data-urlencode "order=edhrec"`,
  },
  {
    id: 'arxiv',
    index: '08',
    phase: 2,
    name: 'arXiv Open Archive',
    domain: 'Scientific Preprints',
    shortPitch: 'Live physics, mathematics, and AI preprints returned as Atom XML metadata & PDF links.',
    epistemicNote:
      'Known unknown: searching the global frontier of unpublished scientific manuscripts before peer-review journals print them.',
    method: 'GET',
    sdkBadge: 'Python · arxiv',
    codeLanguage: 'python',
    docsUrl: 'https://info.arxiv.org/help/api/index.html',
    params: [
      {
        key: 'query',
        label: 'arXiv Query Expression',
        type: 'text',
        defaultValue: 'cat:cs.AI AND ti:reasoning',
        placeholder: 'e.g. cat:quant-ph, all:crispr, ti:diffusion',
      },
    ],
    presets: [
      { label: 'AI Reasoning', values: { query: 'cat:cs.AI AND ti:reasoning' } },
      { label: 'Quantum Computing', values: { query: 'cat:quant-ph AND all:error+correction' } },
      { label: 'Exoplanet Atmospheres', values: { query: 'cat:astro-ph.EP AND all:JWST' } },
      { label: 'Protein Folding', values: { query: 'cat:q-bio.BM AND all:protein+structure' } },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(v.query || 'cat:cs.AI')}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const query = v.query || 'cat:cs.AI AND ti:reasoning';
      return `import arxiv

client = arxiv.Client()
search = arxiv.Search(
    query="${query}",
    max_results=5,
    sort_by=arxiv.SortCriterion.SubmittedDate,
)

for paper in client.results(search):
    print(f"[{paper.published:%Y-%m-%d}] {paper.title}")
    print(f"  PDF: {paper.pdf_url}")`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -sG "https://export.arxiv.org/api/query" --data-urlencode "search_query=${v.query || 'cat:cs.AI'}" --data-urlencode "max_results=5"`,
  },
  {
    id: 'crossref',
    index: '09',
    phase: 2,
    name: 'Crossref Scholarly Graph',
    domain: 'Research Citations',
    shortPitch: 'Global DOI bibliographic graph with peer-reviewed citation counts, journals, and authors.',
    epistemicNote:
      'Known unknown: uncovering the highest-impact peer-reviewed literature across 150M+ registered DOIs.',
    method: 'GET',
    sdkBadge: 'Python · habanero',
    codeLanguage: 'python',
    docsUrl: 'https://api.crossref.org/swagger-ui/index.html',
    params: [
      {
        key: 'query',
        label: 'Research Topic',
        type: 'text',
        defaultValue: 'CRISPR Cas9 genome editing',
        placeholder: 'e.g. attention is all you need, dark energy',
      },
    ],
    presets: [
      { label: 'CRISPR-Cas9', values: { query: 'CRISPR Cas9 genome editing' } },
      { label: 'Transformer Attention', values: { query: 'attention is all you need transformer' } },
      { label: 'Room-Temp Superconductor', values: { query: 'high temperature superconductivity' } },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://api.crossref.org/works?query=${encodeURIComponent(v.query || 'CRISPR Cas9 genome editing')}&rows=5&sort=is-referenced-by-count&order=desc`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const q = v.query || 'CRISPR Cas9 genome editing';
      return `from habanero import Crossref

cr = Crossref(mailto="research@example.org")
res = cr.works(
    query="${q}",
    limit=5,
    sort="is-referenced-by-count",
    order="desc",
)

for item in res["message"]["items"]:
    print(item["is-referenced-by-count"], item["DOI"], item["title"][0])`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -sG "https://api.crossref.org/works" --data-urlencode "query=${v.query || 'CRISPR Cas9'}" --data-urlencode "rows=5" --data-urlencode "sort=is-referenced-by-count" --data-urlencode "order=desc"`,
  },
  {
    id: 'earth-search-stac',
    index: '10',
    phase: 2,
    name: 'Earth Search STAC',
    domain: 'Satellite Imagery',
    shortPitch: 'Query Copernicus Sentinel-2 L2A orbital imagery passes, cloud cover %, and preview frames.',
    epistemicNote:
      'Known unknown: querying real multispectral satellite captures over any bounding box on Earth with zero AWS credentials.',
    method: 'POST',
    sdkBadge: 'Python · pystac-client',
    codeLanguage: 'python',
    docsUrl: 'https://element84.com/earth-search/',
    params: [
      {
        key: 'region',
        label: 'Bounding Box Region',
        type: 'select',
        defaultValue: 'sf_bay',
        options: [
          { label: 'San Francisco Bay', value: 'sf_bay' },
          { label: 'Swiss Alps (Matterhorn)', value: 'alps' },
          { label: 'Nile Delta', value: 'nile' },
          { label: 'Amazon River (Manaus)', value: 'amazon' },
        ],
      },
      {
        key: 'cloud',
        label: 'Max Cloud Cover %',
        type: 'select',
        defaultValue: '15',
        options: [
          { label: '≤ 5% (Crystal Clear)', value: '5' },
          { label: '≤ 15% (Low Cloud)', value: '15' },
          { label: '≤ 40% (Moderate)', value: '40' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => {
      const region = BBOX_REGIONS[v.region] ?? BBOX_REGIONS.sf_bay;
      const maxCloud = Number(v.cloud) || 15;
      return {
        method: 'POST',
        url: 'https://earth-search.aws.element84.com/v1/search',
        body: {
          collections: ['sentinel-2-l2a'],
          bbox: region.bbox,
          limit: 4,
          query: {
            'eo:cloud_cover': { lte: maxCloud },
          },
        },
      };
    },
    buildSdkCode: (v: ParamValues) => {
      const region = BBOX_REGIONS[v.region] ?? BBOX_REGIONS.sf_bay;
      const maxCloud = Number(v.cloud) || 15;
      return `from pystac_client import Client

catalog = Client.open("https://earth-search.aws.element84.com/v1")
search = catalog.search(
    collections=["sentinel-2-l2a"],
    bbox=${JSON.stringify(region.bbox)},  # ${region.label}
    query={"eo:cloud_cover": {"lte": ${maxCloud}}},
    max_items=4,
)

for item in search.items():
    print(item.id, item.datetime, f"cloud={item.properties['eo:cloud_cover']}%")
    print("  thumbnail:", item.assets["thumbnail"].href)`;
    },
    buildCurlCode: (v: ParamValues) => {
      const region = BBOX_REGIONS[v.region] ?? BBOX_REGIONS.sf_bay;
      const maxCloud = Number(v.cloud) || 15;
      return `curl -s -X POST "https://earth-search.aws.element84.com/v1/search" \\
  -H "Content-Type: application/json" \\
  -d '{"collections":["sentinel-2-l2a"],"bbox":${JSON.stringify(region.bbox)},"limit":4,"query":{"eo:cloud_cover":{"lte":${maxCloud}}}}'`;
    },
  },

  // =========================================================================
  // PHASE 3: UNKNOWN KNOWNS — Latent Infrastructure & Hidden Telemetry
  // =========================================================================
  {
    id: 'usgs-earthquakes',
    index: '11',
    phase: 3,
    name: 'USGS Seismic Hazards',
    domain: 'Planetary Geophysics',
    shortPitch: 'Live global earthquake waveforms, hypocenter depth, magnitudes, and tsunami alerts.',
    epistemicNote:
      'Unknown known: dozens of tectonic ruptures are recorded every hour across Earth’s crust and streamed in open GeoJSON.',
    method: 'GET',
    sdkBadge: 'GeoJSON · USGS Feed',
    codeLanguage: 'python',
    docsUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
    params: [
      {
        key: 'feed',
        label: 'Seismic Window',
        type: 'select',
        defaultValue: '2.5_day',
        options: [
          { label: 'M2.5+ (Past 24 Hours)', value: '2.5_day' },
          { label: 'M4.5+ (Past 7 Days)', value: '4.5_week' },
          { label: 'Significant (Past 30 Days)', value: 'significant_month' },
          { label: 'All Quakes (Past Hour)', value: 'all_hour' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${v.feed || '2.5_day'}.geojson`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const feed = v.feed || '2.5_day';
      return `import requests

url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson"
geojson = requests.get(url).json()

for feat in geojson["features"][:6]:
    p = feat["properties"]
    lon, lat, depth_km = feat["geometry"]["coordinates"]
    print(f"M{p['mag']:.1f} | {depth_km:.1f}km deep | {p['place']}")`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${v.feed || '2.5_day'}.geojson" | jq '.features[:5] | .[].properties | {mag, place}'`,
  },
  {
    id: 'wayback-cdx',
    index: '12',
    phase: 3,
    name: 'Wayback Machine CDX',
    domain: 'Web Archaeology',
    shortPitch: 'Query 860B+ archived web snapshots by domain and year to reconstruct forgotten internet history.',
    epistemicNote:
      'Unknown known: almost every public homepage since 1996 sits in a queryable columnar index with byte-level digests.',
    method: 'GET',
    sdkBadge: 'Python · waybackpy',
    codeLanguage: 'python',
    docsUrl: 'https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server',
    params: [
      {
        key: 'domain',
        label: 'Target Domain / URL',
        type: 'text',
        defaultValue: 'nasa.gov',
        placeholder: 'e.g. nytimes.com, apple.com, mit.edu',
      },
      {
        key: 'fromYear',
        label: 'Start Year',
        type: 'select',
        defaultValue: '1998',
        options: [
          { label: '1996 (Early Web)', value: '1996' },
          { label: '1998', value: '1998' },
          { label: '2004', value: '2004' },
          { label: '2012', value: '2012' },
          { label: '2020', value: '2020' },
        ],
      },
    ],
    presets: [
      { label: 'nasa.gov (1998)', values: { domain: 'nasa.gov', fromYear: '1998' } },
      { label: 'apple.com (1996)', values: { domain: 'apple.com', fromYear: '1996' } },
      { label: 'nytimes.com (2004)', values: { domain: 'nytimes.com', fromYear: '2004' } },
    ],
    buildRequest: (v: ParamValues) => {
      const domain = (v.domain || 'nasa.gov').trim();
      const from = v.fromYear || '1998';
      return {
        method: 'GET',
        url: `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&from=${from}&output=json&limit=8&filter=statuscode:200&collapse=timestamp:4`,
      };
    },
    buildSdkCode: (v: ParamValues) => {
      const domain = (v.domain || 'nasa.gov').trim();
      const from = v.fromYear || '1998';
      return `from waybackpy import WaybackMachineCDXServerAPI

cdx = WaybackMachineCDXServerAPI(
    url="${domain}",
    user_agent="Episteme/1.0",
    start_timestamp=${from},
    collapses=["timestamp:4"],
    filters=["statuscode:200"],
)

for snap in list(cdx.snapshots())[:8]:
    print(snap.timestamp, snap.archive_url)`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(v.domain || 'nasa.gov')}&from=${v.fromYear || '1998'}&output=json&limit=8&filter=statuscode:200&collapse=timestamp:4"`,
  },
  {
    id: 'ripestat-bgp',
    index: '13',
    phase: 3,
    name: 'RIPEstat Internet Backbone',
    domain: 'BGP & ASN Routing',
    shortPitch: 'Inspect Autonomous System holders, announced BGP IP prefixes, and global routing blocks.',
    epistemicNote:
      'Unknown known: the physical routing table of the global internet—who owns every IP block and ASN—is openly inspectable.',
    method: 'GET',
    sdkBadge: 'REST · RIPE NCC',
    codeLanguage: 'python',
    docsUrl: 'https://stat.ripe.net/docs/02.data-api/prefix-overview.html',
    params: [
      {
        key: 'resource',
        label: 'IP Prefix or CIDR',
        type: 'text',
        defaultValue: '1.1.1.0/24',
        placeholder: 'e.g. 1.1.1.0/24, 8.8.8.0/24, 140.82.121.0/24',
      },
    ],
    presets: [
      { label: 'Cloudflare (1.1.1.0/24)', values: { resource: '1.1.1.0/24' } },
      { label: 'Google DNS (8.8.8.0/24)', values: { resource: '8.8.8.0/24' } },
      { label: 'Wikimedia (198.35.26.0/24)', values: { resource: '198.35.26.0/24' } },
      { label: 'MIT (18.0.0.0/9)', values: { resource: '18.0.0.0/9' } },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent((v.resource || '1.1.1.0/24').trim())}`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const res = (v.resource || '1.1.1.0/24').trim();
      return `import requests

resp = requests.get(
    "https://stat.ripe.net/data/prefix-overview/data.json",
    params={"resource": "${res}"},
).json()["data"]

print("Announced:", resp["announced"], "| Block:", resp["block"]["name"])
for asn in resp["asns"]:
    print(f"  AS{asn['asn']} — {asn['holder']}")`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent((v.resource || '1.1.1.0/24').trim())}"`,
  },
  {
    id: 'gbif-biodiversity',
    index: '14',
    phase: 3,
    name: 'GBIF Biodiversity Atlas',
    domain: 'Global Ecology',
    shortPitch: 'Geotagged wildlife observations and museum specimens spanning 2.9B+ global occurrences.',
    epistemicNote:
      'Unknown known: millions of citizen-science sightings and natural history specimens are continuously indexed with GPS coordinates.',
    method: 'GET',
    sdkBadge: 'Python · pygbif',
    codeLanguage: 'python',
    docsUrl: 'https://techdocs.gbif.org/en/openapi/',
    params: [
      {
        key: 'species',
        label: 'Scientific Species Name',
        type: 'text',
        defaultValue: 'Danaus plexippus',
        placeholder: 'e.g. Danaus plexippus, Orcinus orca, Panthera leo',
      },
    ],
    presets: [
      { label: 'Monarch Butterfly', values: { species: 'Danaus plexippus' } },
      { label: 'Orca Whale', values: { species: 'Orcinus orca' } },
      { label: 'Snow Leopard', values: { species: 'Panthera uncia' } },
      { label: 'Giant Sequoia', values: { species: 'Sequoiadendron giganteum' } },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent((v.species || 'Danaus plexippus').trim())}&hasCoordinate=true&limit=6`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const species = (v.species || 'Danaus plexippus').trim();
      return `from pygbif import occurrences as occ

res = occ.search(
    scientificName="${species}",
    hasCoordinate=True,
    limit=6,
)

for row in res["results"]:
    print(
        row.get("eventDate", "?"),
        row.get("countryCode"),
        f"({row.get('decimalLatitude')}, {row.get('decimalLongitude')})",
    )`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -sG "https://api.gbif.org/v1/occurrence/search" --data-urlencode "scientificName=${(v.species || 'Danaus plexippus').trim()}" --data-urlencode "hasCoordinate=true" --data-urlencode "limit=6"`,
  },
  {
    id: 'uk-carbon-intensity',
    index: '15',
    phase: 3,
    name: 'National Grid Carbon Intensity',
    domain: 'Live Power Grid',
    shortPitch: 'Real-time national electricity gCO₂/kWh intensity and physical generation mix (wind, nuclear, gas).',
    epistemicNote:
      'Unknown known: the exact fossil vs. renewable electron mix powering an entire nation every 30 minutes is public telemetry.',
    method: 'GET',
    sdkBadge: 'TypeScript · fetch',
    codeLanguage: 'typescript',
    docsUrl: 'https://carbon-intensity.github.io/api-definitions/',
    params: [
      {
        key: 'endpoint',
        label: 'Grid Telemetry Stream',
        type: 'select',
        defaultValue: 'generation',
        options: [
          { label: 'Live Generation Fuel Mix', value: 'generation' },
          { label: 'Current Carbon Intensity (gCO2/kWh)', value: 'intensity' },
          { label: 'Regional Breakdown', value: 'regional' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://api.carbonintensity.org.uk/${v.endpoint || 'generation'}`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const ep = v.endpoint || 'generation';
      return `const res = await fetch('https://api.carbonintensity.org.uk/${ep}');
const payload = await res.json();

console.log(payload.data);
// Combine with intensity index to schedule batch compute in low-carbon windows`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://api.carbonintensity.org.uk/${v.endpoint || 'generation'}"`,
  },

  // =========================================================================
  // PHASE 4: UNKNOWN UNKNOWNS — Frontier Tech & "Wait, That's Keyless?!"
  // =========================================================================
  {
    id: 'godbolt-compiler',
    index: '16',
    phase: 4,
    name: 'Compiler Explorer (Godbolt)',
    domain: 'Remote x86-64 Compilation',
    shortPitch: 'POST raw C++ or Rust code and receive live compiled x86-64 assembly from remote GCC/Rustc clusters.',
    epistemicNote:
      'Unknown unknown: you can run a full cloud C++23 / Rust compiler over a single keyless JSON POST and inspect machine instructions.',
    method: 'POST',
    sdkBadge: 'C++ / Rust → x86-64 ASM',
    codeLanguage: 'cpp',
    docsUrl: 'https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md',
    params: [
      {
        key: 'preset',
        label: 'Algorithm Preset',
        type: 'select',
        defaultValue: 'invsqrt',
        options: [
          { label: 'C++20 Bit-Cast InvSqrt (GCC 14)', value: 'invsqrt' },
          { label: 'AVX2 Vectorized Dot Product (GCC 14)', value: 'simd' },
          { label: 'C++23 Consteval Fibonacci (Compile-Time)', value: 'constexpr_fib' },
          { label: 'Rust Zero-Cost Iterator (Rust 1.80)', value: 'rust_iter' },
        ],
      },
      {
        key: 'source',
        label: 'Source Code to Compile Remotely',
        type: 'code',
        rows: 8,
        defaultValue: GODBOLT_PRESETS.invsqrt.source,
      },
    ],
    presets: [
      {
        label: 'Fast InvSqrt (C++)',
        values: { preset: 'invsqrt', source: GODBOLT_PRESETS.invsqrt.source },
      },
      {
        label: 'AVX2 SIMD (C++)',
        values: { preset: 'simd', source: GODBOLT_PRESETS.simd.source },
      },
      {
        label: 'Consteval (C++23)',
        values: { preset: 'constexpr_fib', source: GODBOLT_PRESETS.constexpr_fib.source },
      },
      {
        label: 'Zero-Cost Iter (Rust)',
        values: { preset: 'rust_iter', source: GODBOLT_PRESETS.rust_iter.source },
      },
    ],
    buildRequest: (v: ParamValues) => {
      const preset = GODBOLT_PRESETS[v.preset] ?? GODBOLT_PRESETS.invsqrt;
      const source = v.source ?? preset.source;
      return {
        method: 'POST',
        url: `https://godbolt.org/api/compiler/${preset.compiler}/compile`,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: {
          source,
          options: {
            userArguments: preset.flags,
            filters: {
              intel: true,
              demangle: true,
              directives: true,
              comments: true,
              trim: true,
            },
          },
        },
      };
    },
    buildSdkCode: (v: ParamValues) => {
      const preset = GODBOLT_PRESETS[v.preset] ?? GODBOLT_PRESETS.invsqrt;
      const source = (v.source ?? preset.source).trim();
      return `// Compiled remotely on ${preset.compiler} (${preset.flags})
${source}`;
    },
    buildCurlCode: (v: ParamValues) => {
      const preset = GODBOLT_PRESETS[v.preset] ?? GODBOLT_PRESETS.invsqrt;
      return `curl -s -X POST "https://godbolt.org/api/compiler/${preset.compiler}/compile" \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ source: v.source ?? preset.source, options: { userArguments: preset.flags, filters: { intel: true, directives: true } } })}'`;
    },
  },
  {
    id: 'rcsb-pdb',
    index: '17',
    phase: 4,
    name: 'RCSB Protein Data Bank',
    domain: 'Atomic Structural Biology',
    shortPitch: 'Inspect atomic-resolution 3D macromolecular structures—CRISPR-Cas9, GFP, and viral spike assemblies.',
    epistemicNote:
      'Unknown unknown: humanity’s entire archive of solved 3D protein coordinates and Cryo-EM renders is a single keyless GET.',
    method: 'GET',
    sdkBadge: 'Python · rcsb-api',
    codeLanguage: 'python',
    docsUrl: 'https://data.rcsb.org/redoc/index.html',
    params: [
      {
        key: 'pdbId',
        label: 'PDB Structure ID',
        type: 'text',
        defaultValue: '4OO8',
        placeholder: 'e.g. 4OO8 (CRISPR), 6VXX (Spike), 1EMA (GFP)',
      },
    ],
    presets: [
      { label: '4OO8 · CRISPR-Cas9', values: { pdbId: '4OO8' } },
      { label: '6VXX · SARS-CoV-2 Spike', values: { pdbId: '6VXX' } },
      { label: '1EMA · GFP (Glowing Protein)', values: { pdbId: '1EMA' } },
      { label: '1A3N · Human Hemoglobin', values: { pdbId: '1A3N' } },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent((v.pdbId || '4OO8').toUpperCase().trim())}`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const id = (v.pdbId || '4OO8').toUpperCase().trim();
      return `from rcsbapi.data import DataQuery

query = DataQuery(
    input_type="entries",
    input_ids=["${id}"],
    return_data_list=[
        "struct.title",
        "exptl.method",
        "rcsb_entry_info.resolution_combined",
        "rcsb_entry_info.molecular_weight",
    ],
)
result = query.exec()
print(result)`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent((v.pdbId || '4OO8').toUpperCase().trim())}"`,
  },
  {
    id: 'wikidata-sparql',
    index: '18',
    phase: 4,
    name: 'Wikidata Knowledge Graph',
    domain: 'Semantic Graph Reasoning',
    shortPitch: 'Execute live SPARQL graph queries across 100M+ structured entities and cross-domain relationships.',
    epistemicNote:
      'Unknown unknown: ask relational graph questions across all human history, science, and geography in milliseconds.',
    method: 'GET',
    sdkBadge: 'Query · SPARQL 1.1',
    codeLanguage: 'sparql',
    docsUrl: 'https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service',
    params: [
      {
        key: 'preset',
        label: 'Graph Query Preset',
        type: 'select',
        defaultValue: 'capitals_elevation',
        options: [
          { label: 'Highest Capital Cities on Earth', value: 'capitals_elevation' },
          { label: 'Chemical Elements by Discovery Date', value: 'elements_discovery' },
          { label: 'Space Telescopes & Launch Dates', value: 'orbital_observatories' },
          { label: 'Nobel Physics Laureates & Fields', value: 'nobel_patents' },
        ],
      },
      {
        key: 'sparql',
        label: 'SPARQL Query',
        type: 'code',
        rows: 7,
        defaultValue: SPARQL_PRESETS.capitals_elevation,
      },
    ],
    presets: [
      {
        label: 'Highest Capitals',
        values: { preset: 'capitals_elevation', sparql: SPARQL_PRESETS.capitals_elevation },
      },
      {
        label: 'Recent Elements',
        values: { preset: 'elements_discovery', sparql: SPARQL_PRESETS.elements_discovery },
      },
      {
        label: 'Space Telescopes',
        values: { preset: 'orbital_observatories', sparql: SPARQL_PRESETS.orbital_observatories },
      },
      {
        label: 'Nobel Physics',
        values: { preset: 'nobel_patents', sparql: SPARQL_PRESETS.nobel_patents },
      },
    ],
    buildRequest: (v: ParamValues) => {
      const sparql = v.sparql || SPARQL_PRESETS[v.preset] || SPARQL_PRESETS.capitals_elevation;
      return {
        method: 'GET',
        url: `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`,
        headers: {
          Accept: 'application/sparql-results+json',
        },
      };
    },
    buildSdkCode: (v: ParamValues) =>
      v.sparql || SPARQL_PRESETS[v.preset] || SPARQL_PRESETS.capitals_elevation,
    buildCurlCode: (v: ParamValues) => {
      const sparql = v.sparql || SPARQL_PRESETS[v.preset] || SPARQL_PRESETS.capitals_elevation;
      return `curl -sG "https://query.wikidata.org/sparql" \\
  -H "Accept: application/sparql-results+json" \\
  --data-urlencode 'query=${sparql.replace(/'/g, "'\\''")}'`;
    },
  },
  {
    id: 'noaa-space-weather',
    index: '19',
    phase: 4,
    name: 'NOAA L1 Space Weather',
    domain: 'Deep-Space Telemetry',
    shortPitch: 'Live geomagnetic Kp storm index, solar wind plasma speed, and GOES X-ray flux from Lagrange Point 1.',
    epistemicNote:
      'Unknown unknown: real-time particle & radiation telemetry beamed 1.5 million km from DSCOVR/GOES spacecraft to open JSON.',
    method: 'GET',
    sdkBadge: 'Python · SWPC Telemetry',
    codeLanguage: 'python',
    docsUrl: 'https://services.swpc.noaa.gov/',
    params: [
      {
        key: 'feed',
        label: 'Spacecraft Sensor Feed',
        type: 'select',
        defaultValue: 'json/planetary_k_index_1m.json',
        options: [
          { label: 'Planetary Geomagnetic Kp Index (1-min)', value: 'json/planetary_k_index_1m.json' },
          { label: 'DSCOVR L1 Solar Wind Plasma (2h)', value: 'products/solar-wind/plasma-2-hour.json' },
          { label: 'GOES Solar X-Ray Flare Flux (6h)', value: 'json/goes/primary/xrays-6-hour.json' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://services.swpc.noaa.gov/${v.feed || 'json/planetary_k_index_1m.json'}`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const feed = v.feed || 'json/planetary_k_index_1m.json';
      return `import requests

# Live telemetry from NOAA Space Weather Prediction Center (DSCOVR / GOES)
url = "https://services.swpc.noaa.gov/${feed}"
readings = requests.get(url).json()

latest = readings[-5:]
for sample in latest:
    print(sample)`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://services.swpc.noaa.gov/${v.feed || 'json/planetary_k_index_1m.json'}" | jq '.[-5:]'`,
  },
  {
    id: 'huggingface-hub',
    index: '20',
    phase: 4,
    name: 'Hugging Face Model Hub',
    domain: 'Open-Weight AI Registry',
    shortPitch: 'Query global open-weight AI models, pipeline tasks, safetensors architectures, and download velocity.',
    epistemicNote:
      'Unknown unknown: the live open-source frontier of foundation models—weights, parameter families, and momentum—is an unauthenticated JSON graph.',
    method: 'GET',
    sdkBadge: 'TypeScript · @huggingface/hub',
    codeLanguage: 'typescript',
    docsUrl: 'https://huggingface.co/docs/hub/api',
    params: [
      {
        key: 'task',
        label: 'Pipeline Task',
        type: 'select',
        defaultValue: 'text-generation',
        options: [
          { label: 'Text Generation (LLMs)', value: 'text-generation' },
          { label: 'Text-to-Image (Diffusion)', value: 'text-to-image' },
          { label: 'Automatic Speech Recognition', value: 'automatic-speech-recognition' },
          { label: 'Feature Extraction (Embeddings)', value: 'feature-extraction' },
        ],
      },
      {
        key: 'sort',
        label: 'Ranking Signal',
        type: 'select',
        defaultValue: 'downloads',
        options: [
          { label: 'Most Downloaded', value: 'downloads' },
          { label: 'Most Liked', value: 'likes' },
          { label: 'Trending Score', value: 'trendingScore' },
        ],
      },
    ],
    buildRequest: (v: ParamValues) => ({
      method: 'GET',
      url: `https://huggingface.co/api/models?pipeline_tag=${encodeURIComponent(v.task || 'text-generation')}&sort=${encodeURIComponent(v.sort || 'downloads')}&direction=-1&limit=6`,
    }),
    buildSdkCode: (v: ParamValues) => {
      const task = v.task || 'text-generation';
      const sort = v.sort || 'downloads';
      return `import { listModels } from '@huggingface/hub';

for await (const model of listModels({
  search: { task: '${task}' },
  sort: '${sort}',
  limit: 6,
})) {
  console.log(model.name, { downloads: model.downloads, likes: model.likes });
}`;
    },
    buildCurlCode: (v: ParamValues) =>
      `curl -s "https://huggingface.co/api/models?pipeline_tag=${encodeURIComponent(v.task || 'text-generation')}&sort=${encodeURIComponent(v.sort || 'downloads')}&direction=-1&limit=6"`,
  },
];

// Keep stable IDs while numbering the expanded catalog in display order.
export const APIS: ApiDefinition[] = [
  ...ORIGINAL_APIS,
  ...PHASE1_ADDITIONS,
  ...PHASE2_ADDITIONS,
  ...PHASE3_ADDITIONS,
  ...PHASE4_ADDITIONS,
].sort((a, b) => a.phase - b.phase)
  .map((api, index) => ({ ...api, index: String(index + 1).padStart(2, '0') }));

export { GODBOLT_PRESETS, SPARQL_PRESETS };
