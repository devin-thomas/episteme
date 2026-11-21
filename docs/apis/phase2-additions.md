# Specialized archives

These five integrations add books, artist identities, public-domain art, spaceflight photographs, and anime to the Known Unknowns group. Each exposes editable parameters, three presets, a response preview, raw JSON, and matching TypeScript and curl examples. The TypeScript examples run in Node.js 22.18+ without packages.

| API | Presets | Response preview |
| --- | --- | --- |
| Open Library | The Left Hand of Darkness; A Wizard of Earthsea; The Art of Computer Programming | Authors, first publication year, edition counts, work links |
| MusicBrainz | Nobuo Uematsu; Yoko Shimomura; Nujabes | Artist names, stable MBIDs, countries, disambiguation |
| Art Institute of Chicago | Monet; Hokusai; Van Gogh | Public-domain artwork images, dates, materials, artist credits |
| NASA Image Library | Apollo 11; James Webb; Mars rover | Thumbnails, dates, NASA centers, asset manifests |
| AniList | Cowboy Bebop; Dragon Ball TV series; Spirited Away movie | Titles, formats, episodes, studios, community scores |

## Open Library

`GET https://openlibrary.org/search.json` searches works and editions. The example requests six results and only the fields it displays, rather than the expensive `fields=*`. Choose relevance or publication-date order. A catalog match does not mean the book's full text is freely available.

The API is intended for interactive discovery and educational use. Cache repeated requests, stay within the default one request per second limit, and use the provider's bulk downloads for bulk work. Episteme sends an identifying project User-Agent; it does not assume eligibility for the higher limit available to clients that supply contact details.

Sources: [Search API](https://openlibrary.org/dev/docs/api/search), [API usage guidelines](https://openlibrary.org/developers/api).

## MusicBrainz

`GET https://musicbrainz.org/ws/2/artist/` accepts a Lucene query and `fmt=json`. Quoted `artist:` queries are useful when resolving a known name. MBIDs are the stable join keys for later recording, release, and credit lookups; the disambiguation field helps separate similarly named musicians.

Public searches require no authentication or API key. Supply a meaningful application User-Agent and never exceed one request per second. Free web-service use is for noncommercial purposes; consult MusicBrainz before commercial reuse. The copied example includes Episteme's identifying header: replace it with your own application's identity when adapting the code.

Sources: [API and authentication](https://musicbrainz.org/doc/MusicBrainz_API), [Artist search](https://musicbrainz.org/doc/MusicBrainz_API/Search#Artist), [Rate limits](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting).

## Art Institute of Chicago

`GET https://api.artic.edu/api/v1/artworks/search` combines a text search with `query[term][is_public_domain]=true`. The API returns an `image_id`; the preview uses it to construct a IIIF image URL. Records without a public-domain image retain their metadata and a visible image placeholder.

The anonymous API allows 60 requests per minute. The examples identify the project with the provider's `AIC-User-Agent` header. Public-domain images are credited to the museum and identified as CC0; the query does not fetch the separately licensed artwork-description field.

Source: [Art Institute API documentation, images, copyright, and authentication](https://api.artic.edu/docs/).

## NASA Image Library

`GET https://images-api.nasa.gov/search` accepts a mission or subject, `media_type=image`, and `page_size=6`. The `links` array supplies the preview thumbnail, while each item's `href` leads to its asset manifest. This integration queries images only; the provider's broader library also supports audio and video.

This search endpoint needs no API key and is separate from the key-based services at `api.nasa.gov`. Credits and usage restrictions can vary by asset; preserve attribution and review NASA's media guidance before republishing an image.

Sources: [Image Library API reference](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf), [NASA images and media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).

## AniList

`POST https://graphql.anilist.co` runs a public, read-only GraphQL query with separate search and format variables. It selects six anime records, excludes titles marked adult, and requests only the displayed catalog fields. No token, account, user data, or mutation is involved. Community scores are out of 100; absent scores or episode counts appear as missing values, not zeroes. GraphQL errors are surfaced even when the HTTP response succeeds.

AniList's documentation currently describes a temporary limit of 30 requests per minute, below its usual 90. Respect the actual response headers and `Retry-After`; this example is a single interactive request, not a batch crawler. Review the provider's terms when adapting it for a commercial product.

Sources: [Public-data authentication](https://docs.anilist.co/guide/auth/), [Pagination](https://docs.anilist.co/guide/graphql/pagination), [Page schema](https://docs.anilist.co/reference/object/page), [Rate limits](https://docs.anilist.co/guide/rate-limiting), [Terms](https://docs.anilist.co/guide/terms-of-use).

AniList was selected instead of Jikan because Jikan's maintainer [announced that its public API was discontinued on October 1, 2026](https://github.com/jikan-me/jikan-rest/issues/613).

## Verification and fixtures

Primary documentation was checked on November 20, 2026. Default Open Library and NASA searches returned HTTP 200 with the expected records. The development environment blocked the MusicBrainz request; Art Institute and AniList requests encountered Cloudflare blocks. Those three integrations were checked against provider documentation and representative fixtures, not claimed as successful live executions from this environment.

[`tests/fixtures/phase2.json`](../../tests/fixtures/phase2.json) maps API IDs to response data. The Open Library and NASA records are small subsets of those successful probes. MusicBrainz, Art Institute, and AniList records are explicitly synthetic examples of the documented schemas for offline rendering checks; their identifiers and titles are not asserted to exist upstream.
