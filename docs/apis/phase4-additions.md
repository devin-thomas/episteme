# Frontier API examples

These five entries use public endpoints without credentials. The workbench generates standalone Node.js 22.18+ TypeScript and curl examples from the same request builder it executes. API limits and availability can change; the links below are the provider references checked for this expansion.

## OSV Vulnerability Database

- **Request:** `POST https://api.osv.dev/v1/query` with a JSON package ecosystem, name, and version.
- **Examples:** npm `lodash` 4.17.15; PyPI `Django` 2.2.0; Maven `org.apache.logging.log4j:log4j-core` 2.14.1.
- **Preview:** vulnerability IDs, summaries, aliases, and record links. An empty result means no matching records were returned, not a security assurance.
- **Pagination:** paste `next_page_token` into the optional Page token field. The next request sends `page_token`; changing presets clears it.
- **Reference:** [OSV query API](https://google.github.io/osv.dev/post-v1-query/), [API overview](https://google.github.io/osv.dev/api/).

```bash
curl --fail-with-body --silent --show-error \
  https://api.osv.dev/v1/query \
  --header 'Content-Type: application/json' \
  --data-raw '{"package":{"name":"lodash","ecosystem":"npm"},"version":"4.17.15"}'
```

## PubChem Compounds

- **Request:** `GET /rest/pug/compound/name/{name}/property/MolecularFormula,MolecularWeight,IUPACName,XLogP,InChIKey/JSON` on `pubchem.ncbi.nlm.nih.gov`.
- **Examples:** caffeine, aspirin, water. Names are encoded as one URL path segment.
- **Preview:** formula, molecular weight in g/mol, XLogP, IUPAC name, InChIKey, and the provider’s 2D structure image. Missing properties remain missing.
- **Usage:** PubChem asks clients to stay below five requests per second. Bulk work should use its bulk facilities.
- **Reference:** [PUG REST](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest).

## NASA Exoplanet Archive

- **Request:** `GET /TAP/sync?query={encoded query}&format=json` on `exoplanetarchive.ipac.caltech.edu`.
- **Examples:** planets within 10 parsecs; planets between 0.8 and 1.25 Earth radii; systems containing at least five planets.
- **Preview:** planet name, discovery method/year, radius in Earth radii, orbital period in days, and distance in parsecs.
- **Query editing:** the full query is editable. Presets select `TOP 10` rows from `pscomppars`. Custom column selections remain available in Raw Payload when they do not fit the planet preview.
- **Interpretation:** an Earth-size radius is not evidence of habitability. Composite measurements can originate from different references; research reuse should cite the archive and underlying measurements.
- **Reference:** [TAP guide](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html), [column definitions](https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html).

```sql
SELECT TOP 10 pl_name, hostname, discoverymethod, disc_year,
              pl_rade, pl_orbper, sy_dist
FROM pscomppars
WHERE sy_dist < 10
ORDER BY sy_dist
```

## OpenStreetMap Overpass

- **Request:** `POST https://overpass-api.de/api/interpreter`, with an Overpass QL query encoded in the form field `data`.
- **Examples:** cafés within 500 m of central San Antonio; libraries within 1 km of Tokyo Station; bicycle rental locations within 500 m of central London.
- **Controls:** city center, amenity, and a 250 m–1 km radius. Requests have a 10-second upstream time limit, 8 MiB memory budget, and a 15-object output limit. Small responses do not imply complete geographic coverage.
- **Preview:** names, mapped amenity tags, approximate coordinates, and links to the original OSM nodes/ways/relations. Way/relation coordinates are bounding-box centers, not entrances.
- **Attribution:** © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright). Public instances are shared resources; 429, 504, or timeouts mean wait before retrying. Episteme also applies per-instance pacing and short caching.
- **Reference:** [Overpass manual](https://dev.overpass-api.de/overpass-doc/en/), [resource limits](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), [HTTP behavior](https://dev.overpass-api.de/command_line.html).

```text
[out:json][timeout:10][maxsize:8388608];
nwr["amenity"="cafe"](around:500,29.4241,-98.4936);
out center 15;
```

## drand Randomness Beacon

- **Request:** `GET https://api.drand.sh/v2/beacons/{network}/rounds/{round}`. `latest` selects the newest round.
- **Examples:** latest Quicknet round, Quicknet round 42, latest default-network round, latest EVMnet round.
- **Preview:** round number, BLS signature, and the previous signature when the network is chained.
- **Interpretation:** v2 returns signature material rather than the v1 `randomness` field. This playground inspects the response; it does not verify the BLS signature or derive trusted randomness. A production consumer should use a verifying drand client. Beacon output is public and should not be treated as secret key material.
- **Reference:** [HTTP API versions](https://docs.drand.love/developer/http-api/), [v2 latest round](https://docs.drand.love/developer/API-v2/v-2-beacons-beacon-id-rounds-latest/), [networks and client verification](https://docs.drand.love/developer/).

## Fixture scope

`tests/fixtures/phase4.json` contains reduced response shapes for offline rendering and snippet checks. PubChem and the first exoplanet row reflect live responses; the additional planet and map records are explicitly synthetic. The OSV fixture keeps identifying metadata only, with a synthetic timestamp. The drand round-42 signature comes from the provider’s published example. Fixtures are not a claim of current upstream availability.
