# Everyday lookups

These five additions use unauthenticated public endpoints. Every preset below has an editable request and matching TypeScript and curl examples in the workbench. The TypeScript examples run in Node.js 22.18+ with no dependencies. Definitions and examples are in [`phase1Additions.ts`](../../src/data/phase1Additions.ts); previews are in [`Phase1Visuals.tsx`](../../src/components/response/Phase1Visuals.tsx).

## 21. TVmaze Show Search

`GET https://api.tvmaze.com/search/shows?q=Cowboy%20Bebop`

| Preset | Query | Use |
| --- | --- | --- |
| Cowboy Bebop | `Cowboy Bebop` | Compare the animated series and live-action adaptation. |
| The Last of Us | `The Last of Us` | Find a game adaptation's television metadata. |
| The Bear | `The Bear` | Inspect premiere dates, network, and ratings. |

The preview links every show to TVmaze and includes its premiere, language, network, and rating. Search ranking is separate from the audience rating. The public API is distinct from TVmaze's paid user API. Data is licensed under CC BY-SA; retain source attribution and comply with ShareAlike when reusing it. TVmaze documents rate limiting of at least 20 requests per 10 seconds per IP, which can be tightened. Back off after HTTP 429.

Primary source: [TVmaze API: search, rate limits, and license](https://www.tvmaze.com/api).

## 22. Nager.Date Public Holidays

`GET https://nagerholidays.com/api/v4/Holidays/US/2027`

| Preset | Country | Year |
| --- | --- | --- |
| US · 2027 | `US` | `2027` |
| Brazil · 2027 | `BR` | `2027` |
| Germany · 2027 | `DE` | `2027` |

The community v4 endpoint returns English holiday names, `nationalHoliday`, `subdivisionCodes`, and `holidayTypes`. Regional holidays appear with their subdivision codes; a holiday record does not by itself establish that a particular employer closes. Country and year remain editable.

This integration uses the new host and v4 path order. Nager's legacy v3 API reaches end of life on January 31, 2027; its `global`, `counties`, and `types` fields do not match v4. The community HTTP endpoint needs no API key. Separately packaged or paid services have their own terms.

Primary sources: [Holiday API](https://nagerholidays.com/api), [provider-maintained v4 examples and migration note](https://github.com/nager/Nager.Date/blob/main/doc/examples/rest-api.md).

## 23. Zippopotam.us Postal Codes

`GET https://api.zippopotam.us/us/78205`

| Preset | Country | Postal code |
| --- | --- | --- |
| San Antonio | `US` | `78205` |
| Berlin | `DE` | `10115` |
| Paris | `FR` | `75001` |

Postal codes are strings so leading zeroes survive. A response can contain several places. The preview displays every returned place, region, and coordinate pair with GeoNames/Zippopotam.us attribution. Coordinates describe postal areas, not individual street addresses. Coverage varies by country, and the provider documents truncated postal codes for some countries. Missing codes can return HTTP 404.

Primary sources: [endpoint reference](https://docs.zippopotam.us/docs/v1/), [coverage and data source](https://docs.zippopotam.us/docs/getting-started/).

## 24. Free Dictionary

`GET https://api.dictionaryapi.dev/api/v2/entries/en/serendipity`

| Preset | Word | Use |
| --- | --- | --- |
| Serendipity | `serendipity` | Inspect a noun definition. |
| Resonance | `resonance` | Compare meanings across contexts. |
| Algorithm | `algorithm` | Retrieve a technical term. |

The preview groups definitions by part of speech and shows pronunciation text, supplied examples, source links, and the response's license metadata. It displays up to five definitions per meaning; the raw payload retains all returned definitions and pronunciation URLs. Not every word exists in the dataset. HTTP 404 means no entry was found; it does not indicate an authentication requirement. The examples use the documented English endpoint.

Primary source: [Free Dictionary API](https://dictionaryapi.dev/).

## 25. Apple iTunes Search

`GET https://itunes.apple.com/search?term=Daft+Punk&entity=song&media=music&country=US&limit=6&explicit=Yes`

| Preset | Term | Entity | Storefront |
| --- | --- | --- | --- |
| Daft Punk · songs | `Daft Punk` | `song` | `US` |
| Nujabes · albums | `Nujabes` | `album` | `US` |
| Planet Money · podcasts | `Planet Money` | `podcast` | `US` |

Parameters select songs, albums, or podcasts, storefront, 6/12/20 results, and whether explicit releases are included. The preview shows catalog metadata and store links. Apple documents approximately 20 calls per minute, subject to change; cache repeated queries in larger applications. Results differ by storefront and may be empty.

Artwork and audio previews have separate promotional-content terms. This example displays metadata without rendering or playing those assets; their URLs remain inspectable in the raw API response. Do not treat keyless access as a content license.

Primary source: [Apple iTunes Search API](https://performance-partners.apple.com/search-api).

## Selection note

REST Countries was considered but excluded: its current v5 endpoints require an API key and its earlier versions are deprecated. Using its demo key would not meet this catalog's keyless contract. TVmaze fills that slot instead. Primary sources: [REST Countries authentication](https://restcountries.com/docs), [API version policy](https://restcountries.com/docs/countries/api-versions).
