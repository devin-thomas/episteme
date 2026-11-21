# Public records and telemetry

Each entry has editable parameters, named presets, a response preview, raw JSON, and matching TypeScript and curl examples in the workbench. The TypeScript examples run with Node.js 22.18+ and need no installed packages. These endpoints do not require an account or API key.

## World Bank Indicators

`world-bank-indicators` · `GET api.worldbank.org/v2/country/{country}/indicator/{indicator}`

| Preset | Country | Indicator | Observations |
| --- | --- | --- | --- |
| US Population | `USA` | `SP.POP.TOTL` | 5 |
| Brazil GDP per Person | `BRA` | `NY.GDP.PCAP.CD` | 5 |
| Nigeria Electricity Access | `NGA` | `EG.ELC.ACCS.ZS` | 10 |
| Japan Life Expectancy | `JPN` | `SP.DYN.LE00.IN` | 5 |

The response is `[metadata, observations]`. `mrnev` selects recent non-empty observations; their dates can lag the current year or have gaps. Units belong to the selected indicator: people, current US dollars, percentage, or years. Do not interpret a missing value as zero. The preview includes the source's update date.

```sh
curl --fail-with-body --silent --show-error 'https://api.worldbank.org/v2/country/USA/indicator/SP.POP.TOTL?format=json&mrnev=5&per_page=20'
```

Sources: [Basic calls, pagination, MRNEV, and JSON](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures), [Indicators API overview](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation).

## National Weather Service Alerts

`nws-alerts` · `GET api.weather.gov/alerts/active`

| Preset | Area | Severity |
| --- | --- | --- |
| Texas | `TX` | All |
| California | `CA` | All |
| Florida | `FL` | All |
| Alaska | `AK` | All |

The area accepts state or territory codes. Severity can narrow results to Extreme, Severe, Moderate, or Minor. Results are a GeoJSON `FeatureCollection`; an empty `features` array is a valid result. The preview displays the first 12 alerts, with the full collection in Raw Payload. Open a bulletin to read its description and instructions. Expiry times are labeled UTC.

A descriptive User-Agent is required. The workbench and generated snippets use Episteme's repository URL as the contact. Rate limits are unpublished; avoid rapid polling and respect provider errors.

```sh
curl --fail-with-body --silent --show-error 'https://api.weather.gov/alerts/active?area=TX' \
  -H 'Accept: application/geo+json' \
  -H 'User-Agent: Episteme-API-Playground/1.0 (+https://github.com/devin-thomas/episteme)'
```

Sources: [NWS API documentation](https://www.weather.gov/documentation/services-web-api), [OpenAPI specification](https://api.weather.gov/openapi.json).

## Open Food Facts

`open-food-facts` · `GET world.openfoodfacts.org/api/v3/product/{barcode}.json`

| Preset | Barcode |
| --- | --- |
| Nutella | `3017620422003` |
| Cristaline Water | `3274080005003` |
| Thai Peanut Noodles | `0737628064502` |

This integration uses the recommended v3 product API. Requested fields cover identity, packaging, ingredients, allergens, Nutri-Score, and nutrition values. The v3 response uses status strings such as `success` and `success_with_warnings`. A missing product returns HTTP 404. The preview preserves missing nutrition fields and does not infer that missing allergen data means allergen-free.

Product reads require a custom User-Agent and currently allow 15 requests per minute per IP. Data is contributed by the community and may be incomplete or outdated. Database attribution is Open Food Facts under ODbL; product images use CC BY-SA and may contain other protected graphics. The preview includes source and license links. Review the provider's reuse terms before building a derived database.

```sh
curl --fail-with-body --silent --show-error 'https://world.openfoodfacts.org/api/v3/product/3017620422003.json?fields=code,product_name,brands,quantity,nutriscore_grade,nutriments,ingredients_text,allergens_tags,image_front_small_url' \
  -H 'User-Agent: Episteme-API-Playground/1.0 (+https://github.com/devin-thomas/episteme)'
```

Sources: [API introduction, rates, and attribution](https://openfoodfacts.github.io/openfoodfacts-server/api/), [v3 product reference](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/), [Reuse terms](https://world.openfoodfacts.org/terms-of-use).

## npm Download Counts

`npm-downloads` · `GET api.npmjs.org/downloads/{range|point}/{period}/{package}`

| Preset | Package | Period | Result |
| --- | --- | --- | --- |
| React · Daily | `react` | `last-week` | Daily series |
| Vite · 30 Days | `vite` | `last-month` | Daily series |
| @types/node · Total | `@types/node` | `last-week` | Period total |

`range` returns a `downloads` array; `point` returns a numeric `downloads` total. The preview supports both. Package names are URL-encoded, including scoped names. Periods cover the last available day, seven available days, or 30 available days, with inclusive start and end dates. The service publishes daily aggregates. Counts include automated installs and do not measure unique users.

```sh
curl --fail-with-body --silent --show-error 'https://api.npmjs.org/downloads/range/last-week/react'
```

Source: [npm's public download-count API](https://github.com/npm/registry/blob/main/docs/download-counts.md).

## Treasury Average Interest Rates

`treasury-interest-rates` · `GET api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates`

| Preset | Security filter | Observations |
| --- | --- | --- |
| Bills · 6 Months | `Treasury Bills` | 6 |
| Notes · 12 Months | `Treasury Notes` | 12 |
| Bonds · 12 Months | `Treasury Bonds` | 12 |
| TIPS · 6 Months | `Treasury Inflation-Protected Securities (TIPS)` | 6 |

Floating Rate Notes are also available in the security selector. The request sorts reporting dates newest first, filters one security type, and limits the first page. Values are monthly averages on outstanding debt, not a current auction yield. Fiscal Data returns numbers and missing values as strings; the examples and preview preserve `"null"` as missing. Dates can lag the current month.

```sh
curl --fail-with-body --silent --show-error --get \
  'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates' \
  --data-urlencode 'fields=record_date,security_type_desc,security_desc,avg_interest_rate_amt' \
  --data-urlencode 'filter=security_desc:eq:Treasury Bills' \
  --data-urlencode 'sort=-record_date' \
  --data-urlencode 'page[size]=6'
```

Sources: [Fiscal Data API documentation](https://fiscaldata.treasury.gov/api-documentation/), [Average interest rates dataset and field definitions](https://fiscaldata.treasury.gov/datasets/average-interest-rates-treasury-securities/).
