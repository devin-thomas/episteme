import type { ApiDefinition } from '../types/api';
import { withExamples } from './requestExamples';

const USER_AGENT = 'Episteme-API-Playground/1.0 (+https://github.com/devin-thomas/episteme)';

export const PHASE3_ADDITIONS: ApiDefinition[] = [
  withExamples({
    id: 'world-bank-indicators',
    index: '31',
    phase: 3,
    name: 'World Bank Indicators',
    domain: 'Country Time Series',
    shortPitch: 'Population, GDP per person, and electricity access from national development records.',
    epistemicNote: 'Unknown known: national statistics are already published as comparable annual series, including their observation dates and missing values.',
    method: 'GET',
    docsUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures',
    params: [
      { key: 'country', label: 'Country Code (ISO 2 or 3 letters)', type: 'text', defaultValue: 'USA', placeholder: 'USA, BRA, JPN, NGA, IND' },
      { key: 'indicator', label: 'Indicator', type: 'select', defaultValue: 'SP.POP.TOTL', options: [
        { label: 'Population (people)', value: 'SP.POP.TOTL' },
        { label: 'GDP per person (current US$)', value: 'NY.GDP.PCAP.CD' },
        { label: 'Access to electricity (% of population)', value: 'EG.ELC.ACCS.ZS' },
        { label: 'Life expectancy at birth (years)', value: 'SP.DYN.LE00.IN' },
      ] },
      { key: 'years', label: 'Recent Non-empty Observations', type: 'select', defaultValue: '5', options: [
        { label: '5 observations', value: '5' },
        { label: '10 observations', value: '10' },
      ] },
    ],
    presets: [
      { label: 'US Population', values: { country: 'USA', indicator: 'SP.POP.TOTL', years: '5' } },
      { label: 'Brazil GDP per Person', values: { country: 'BRA', indicator: 'NY.GDP.PCAP.CD', years: '5' } },
      { label: 'Nigeria Electricity Access', values: { country: 'NGA', indicator: 'EG.ELC.ACCS.ZS', years: '10' } },
      { label: 'Japan Life Expectancy', values: { country: 'JPN', indicator: 'SP.DYN.LE00.IN', years: '5' } },
    ],
    buildRequest: (values) => {
      const country = (values.country || 'USA').trim().toUpperCase();
      const indicator = values.indicator || 'SP.POP.TOTL';
      const count = values.years === '10' ? '10' : '5';
      return {
        method: 'GET',
        url: `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&mrnev=${count}&per_page=20`,
      };
    },
  }, `const [metadata, observations] = data;
console.log('Source updated:', metadata?.lastupdated);
console.table((observations ?? []).map((row: any) => ({
  country: row.country?.value,
  indicator: row.indicator?.value,
  year: row.date,
  value: row.value, // null means missing; never convert it to zero.
})));`),

  withExamples({
    id: 'nws-alerts',
    index: '32',
    phase: 3,
    name: 'National Weather Service Alerts',
    domain: 'Public Weather Bulletins',
    shortPitch: 'Active US warnings, watches, and advisories with severity, affected areas, and expiry times.',
    epistemicNote: 'Unknown known: the alert messages distributed by the National Weather Service are also available as structured GeoJSON. An empty list means no matching active alerts.',
    method: 'GET',
    docsUrl: 'https://www.weather.gov/documentation/services-web-api',
    params: [
      { key: 'area', label: 'State or Territory Code', type: 'text', defaultValue: 'TX', placeholder: 'TX, CA, FL, AK, PR' },
      { key: 'severity', label: 'Severity', type: 'select', defaultValue: 'all', options: [
        { label: 'All severities', value: 'all' },
        { label: 'Extreme', value: 'Extreme' },
        { label: 'Severe', value: 'Severe' },
        { label: 'Moderate', value: 'Moderate' },
        { label: 'Minor', value: 'Minor' },
      ] },
    ],
    presets: [
      { label: 'Texas', values: { area: 'TX', severity: 'all' } },
      { label: 'California', values: { area: 'CA', severity: 'all' } },
      { label: 'Florida', values: { area: 'FL', severity: 'all' } },
      { label: 'Alaska', values: { area: 'AK', severity: 'all' } },
    ],
    buildRequest: (values) => {
      const params = new URLSearchParams({ area: (values.area || 'TX').trim().toUpperCase() });
      if (values.severity && values.severity !== 'all') params.set('severity', values.severity);
      return {
        method: 'GET',
        url: `https://api.weather.gov/alerts/active?${params}`,
        headers: { Accept: 'application/geo+json', 'User-Agent': USER_AGENT },
      };
    },
  }, `const alerts = data.features ?? [];
if (!alerts.length) console.log('No active alerts match these filters.');
console.table(alerts.map(({ properties: p }: any) => ({
  event: p.event, severity: p.severity, area: p.areaDesc,
  expires: p.expires, headline: p.headline,
})));`),

  withExamples({
    id: 'open-food-facts',
    index: '33',
    phase: 3,
    name: 'Open Food Facts',
    domain: 'Barcode Product Records',
    shortPitch: 'Look up a food barcode for its packaging, ingredients, and recorded nutrition values.',
    epistemicNote: 'Unknown known: a barcode can resolve to a community-maintained product record. Missing fields stay missing; these records can be incomplete or out of date.',
    method: 'GET',
    docsUrl: 'https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/',
    params: [
      { key: 'barcode', label: 'Product Barcode', type: 'text', defaultValue: '3017620422003', placeholder: 'EAN or UPC digits' },
    ],
    presets: [
      { label: 'Nutella', values: { barcode: '3017620422003' } },
      { label: 'Cristaline Water', values: { barcode: '3274080005003' } },
      { label: 'Thai Peanut Noodles', values: { barcode: '0737628064502' } },
    ],
    buildRequest: (values) => {
      const barcode = (values.barcode || '3017620422003').trim();
      const params = new URLSearchParams({
        fields: 'code,product_name,brands,quantity,nutriscore_grade,nutriments,ingredients_text,allergens_tags,image_front_small_url',
      });
      return {
        method: 'GET',
        url: `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json?${params}`,
        headers: { 'User-Agent': USER_AGENT },
      };
    },
  }, `if (!data.product) throw new Error(data.result?.name ?? 'Product not found');
const product = data.product;
console.log(product.product_name, product.brands, product.quantity);
console.log('Ingredients:', product.ingredients_text ?? 'Not recorded');
console.table(product.nutriments ?? {});
// Attribution: Open Food Facts, ODbL (database), CC BY-SA (images).
// Keep product reads below 15 requests per minute per IP.`),

  withExamples({
    id: 'npm-downloads',
    index: '34',
    phase: 3,
    name: 'npm Download Counts',
    domain: 'Software Adoption Signals',
    shortPitch: 'Daily download counts or period totals for public npm packages, including scoped packages.',
    epistemicNote: 'Unknown known: registry download logs become a public daily time series. Downloads measure registry activity, not the number of unique users.',
    method: 'GET',
    docsUrl: 'https://github.com/npm/registry/blob/main/docs/download-counts.md',
    params: [
      { key: 'packageName', label: 'npm Package', type: 'text', defaultValue: 'react', placeholder: 'react, vite, @types/node' },
      { key: 'period', label: 'Period', type: 'select', defaultValue: 'last-week', options: [
        { label: 'Last 7 available days', value: 'last-week' },
        { label: 'Last 30 available days', value: 'last-month' },
        { label: 'Last available day', value: 'last-day' },
      ] },
      { key: 'mode', label: 'Result', type: 'select', defaultValue: 'range', options: [
        { label: 'Daily time series', value: 'range' },
        { label: 'Period total', value: 'point' },
      ] },
    ],
    presets: [
      { label: 'React · Daily', values: { packageName: 'react', period: 'last-week', mode: 'range' } },
      { label: 'Vite · 30 Days', values: { packageName: 'vite', period: 'last-month', mode: 'range' } },
      { label: '@types/node · Total', values: { packageName: '@types/node', period: 'last-week', mode: 'point' } },
    ],
    buildRequest: (values) => {
      const mode = values.mode === 'point' ? 'point' : 'range';
      const period = ['last-week', 'last-month', 'last-day'].includes(values.period) ? values.period : 'last-week';
      return {
        method: 'GET',
        url: `https://api.npmjs.org/downloads/${mode}/${period}/${encodeURIComponent((values.packageName || 'react').trim())}`,
      };
    },
  }, `console.log(data.package, data.start, 'through', data.end);
if (Array.isArray(data.downloads)) {
  console.table(data.downloads);
} else {
  console.log('Downloads:', data.downloads);
}`),

  withExamples({
    id: 'treasury-interest-rates',
    index: '35',
    phase: 3,
    name: 'Treasury Average Interest Rates',
    domain: 'Federal Finance Records',
    shortPitch: 'Monthly average interest rates on outstanding US Treasury bills, notes, and bonds.',
    epistemicNote: 'Unknown known: the US Treasury exposes its borrowing records as filterable tables. Each rate is an average for outstanding debt at that reporting date.',
    method: 'GET',
    docsUrl: 'https://fiscaldata.treasury.gov/datasets/average-interest-rates-treasury-securities/',
    params: [
      { key: 'security', label: 'Security Type', type: 'select', defaultValue: 'Treasury Bills', options: [
        { label: 'Treasury Bills', value: 'Treasury Bills' },
        { label: 'Treasury Notes', value: 'Treasury Notes' },
        { label: 'Treasury Bonds', value: 'Treasury Bonds' },
        { label: 'Inflation-Protected Securities (TIPS)', value: 'Treasury Inflation-Protected Securities (TIPS)' },
        { label: 'Floating Rate Notes (FRN)', value: 'Treasury Floating Rate Notes (FRN)' },
      ] },
      { key: 'months', label: 'Recent Monthly Observations', type: 'select', defaultValue: '6', options: [
        { label: '6 observations', value: '6' },
        { label: '12 observations', value: '12' },
      ] },
    ],
    presets: [
      { label: 'Bills · 6 Months', values: { security: 'Treasury Bills', months: '6' } },
      { label: 'Notes · 12 Months', values: { security: 'Treasury Notes', months: '12' } },
      { label: 'Bonds · 12 Months', values: { security: 'Treasury Bonds', months: '12' } },
      { label: 'TIPS · 6 Months', values: { security: 'Treasury Inflation-Protected Securities (TIPS)', months: '6' } },
    ],
    buildRequest: (values) => {
      const params = new URLSearchParams({
        fields: 'record_date,security_type_desc,security_desc,avg_interest_rate_amt',
        filter: `security_desc:eq:${values.security || 'Treasury Bills'}`,
        sort: '-record_date',
        'page[size]': values.months === '12' ? '12' : '6',
      });
      return {
        method: 'GET',
        url: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?${params}`,
      };
    },
  }, `console.table((data.data ?? []).map((row: any) => ({
  date: row.record_date,
  security: row.security_desc,
  // Fiscal Data returns numbers and missing values as strings.
  averageRatePercent: row.avg_interest_rate_amt == null || row.avg_interest_rate_amt === 'null'
    ? null : Number(row.avg_interest_rate_amt),
})));`),
];
