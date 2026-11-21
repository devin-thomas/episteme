# Verification of the 40-API expansion

The expansion retains the original 20 integrations and adds 20, with ten entries in each quadrant. The additions contain 64 presets. API IDs remain stable; display numbers are assigned in quadrant order.

## Local checks

- `npm run lint`: passed.
- `npm run build`: passed.
- `npm test`: 65 tests passed, no failures or skips on Linux.
- `git diff --check`: passed.

The offline suite executes every new default/preset TypeScript example against an intercepted fetch, compares request URL/method/headers/body, checks curl quoting with adversarial input, renders all 20 new preview fixtures, and exercises empty/error cases. Proxy tests cover allowlisted hosts, request forwarding, redirects, image responses, caching, and courtesy pacing. The shell-specific tests skip on native Windows; use WSL to run those two checks there.

## Live provider checks

| Additions | Observed result |
| --- | --- |
| TVmaze, Nager.Date, Zippopotam.us, Free Dictionary, iTunes | All 15 presets returned HTTP 200. The final iTunes explicit-release setting was also checked. |
| Open Library, NASA Image Library | Default searches returned HTTP 200 with six records each. |
| World Bank, NWS, Open Food Facts, npm, US Treasury | All 18 presets returned HTTP 200. |
| OSV, PubChem, NASA Exoplanet Archive, drand | All 13 presets returned HTTP 200 with valid JSON. |
| MusicBrainz | The execution environment rejected access. Request and response shape checked against the provider documentation; synthetic fixture checks passed. |
| Art Institute of Chicago, AniList | Requests from this environment encountered Cloudflare restrictions. Public access and schemas checked against provider documentation; synthetic fixture checks passed. |
| Overpass | Bounded requests to the public instance timed out. Query syntax and response shape checked against the maintainers’ documentation; synthetic fixture checks passed. |

These checks establish live access to 16 of the 20 additions from the test environment. They do not claim universal availability. A 429, upstream error, or timeout stays visible in the workbench, and Raw Payload preserves the response when one exists. Fixtures are test data and are never substituted for live responses in the app.

## Browser and deployment scope

The available cloud browser could not reach the local development server, so this run does not claim browser layout verification. Build, type, request-contract, and server-rendered preview checks were completed instead.

The previously published Netlify deployment inspected during this change was an API upload without a Git commit reference. Updating the repository does not establish that the hosted site has deployed this source. The included `netlify.toml` supports a separate deployment with the same shared handlers.

## Provider references

The four [API example guides](apis/) link to the primary documentation used for request shapes, current versions, rate limits, and attribution. The selection excludes REST Countries’ key-requiring v5 and the discontinued public Jikan service. Nager.Date uses v4 and Open Food Facts uses v3, matching their current provider documentation at the time of the expansion.
