import type { ApiDefinition, ParamValues } from '../types/api';
import { withExamples } from './requestExamples';

const PLANET_COLUMNS = 'pl_name, hostname, discoverymethod, disc_year, pl_rade, pl_orbper, sy_dist';
const PLANET_QUERIES = {
  nearby: `SELECT TOP 10 ${PLANET_COLUMNS}\nFROM pscomppars\nWHERE sy_dist < 10\nORDER BY sy_dist`,
  earthSize: `SELECT TOP 10 ${PLANET_COLUMNS}\nFROM pscomppars\nWHERE pl_rade BETWEEN 0.8 AND 1.25\nORDER BY sy_dist`,
  multiplanet: `SELECT TOP 10 ${PLANET_COLUMNS}\nFROM pscomppars\nWHERE sy_pnum >= 5\nORDER BY hostname, pl_name`,
};

const PLACES: Record<string, { lat: number; lon: number }> = {
  san_antonio: { lat: 29.4241, lon: -98.4936 },
  tokyo: { lat: 35.6812, lon: 139.7671 },
  london: { lat: 51.5074, lon: -0.1278 },
};

function overpassQuery(values: ParamValues): string {
  const place = PLACES[values.city] ?? PLACES.san_antonio;
  const radius = ['250', '500', '1000'].includes(values.radius) ? values.radius : '500';
  const amenity = ['cafe', 'library', 'bicycle_rental'].includes(values.amenity) ? values.amenity : 'cafe';
  return `[out:json][timeout:10][maxsize:8388608];\nnwr["amenity"="${amenity}"](around:${radius},${place.lat},${place.lon});\nout center 15;`;
}

export const PHASE4_ADDITIONS: ApiDefinition[] = [
  withExamples({
    id: 'osv-vulnerabilities', index: '36', phase: 4,
    name: 'OSV Vulnerability Database', domain: 'Dependency Security',
    shortPitch: 'Look up published vulnerability records affecting a specific package version.',
    epistemicNote: 'A package name, ecosystem, and version are enough to query a shared vulnerability database.',
    method: 'POST', docsUrl: 'https://google.github.io/osv.dev/post-v1-query/',
    params: [
      { key: 'ecosystem', label: 'Package ecosystem', type: 'select', defaultValue: 'npm', options: [
        { label: 'npm (JavaScript)', value: 'npm' }, { label: 'PyPI (Python)', value: 'PyPI' },
        { label: 'Maven (Java)', value: 'Maven' }, { label: 'crates.io (Rust)', value: 'crates.io' },
      ] },
      { key: 'package', label: 'Package name', type: 'text', defaultValue: 'lodash' },
      { key: 'version', label: 'Installed version', type: 'text', defaultValue: '4.17.15' },
      { key: 'pageToken', label: 'Page token (optional)', type: 'text', defaultValue: '', placeholder: 'next_page_token from a previous response' },
    ],
    presets: [
      { label: 'lodash 4.17.15', values: { ecosystem: 'npm', package: 'lodash', version: '4.17.15', pageToken: '' } },
      { label: 'Django 2.2.0', values: { ecosystem: 'PyPI', package: 'Django', version: '2.2.0', pageToken: '' } },
      { label: 'Log4j Core 2.14.1', values: { ecosystem: 'Maven', package: 'org.apache.logging.log4j:log4j-core', version: '2.14.1', pageToken: '' } },
    ],
    buildRequest: (v) => ({
      method: 'POST', url: 'https://api.osv.dev/v1/query', headers: { 'Content-Type': 'application/json' },
      body: { package: { name: (v.package || 'lodash').trim(), ecosystem: v.ecosystem || 'npm' }, version: (v.version || '4.17.15').trim(), ...(v.pageToken?.trim() ? { page_token: v.pageToken.trim() } : {}) },
    }),
  }, `console.table((data.vulns ?? []).map((v: any) => ({\n  id: v.id, summary: v.summary, aliases: v.aliases?.join(', '),\n})));\nif (data.next_page_token) console.log('Next page token:', data.next_page_token);`),

  withExamples({
    id: 'pubchem-compounds', index: '37', phase: 4,
    name: 'PubChem Compounds', domain: 'Molecular Properties',
    shortPitch: 'Resolve a chemical name to its formula, molecular weight, identifiers, and 2D structure.',
    epistemicNote: 'Names of everyday compounds lead directly to a structured chemical record and a molecular diagram.',
    method: 'GET', docsUrl: 'https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest',
    params: [{ key: 'compound', label: 'Compound name', type: 'text', defaultValue: 'caffeine', placeholder: 'caffeine, aspirin, or water' }],
    presets: [
      { label: 'Caffeine', values: { compound: 'caffeine' } },
      { label: 'Aspirin', values: { compound: 'aspirin' } },
      { label: 'Water', values: { compound: 'water' } },
    ],
    buildRequest: (v) => ({ method: 'GET', url: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent((v.compound || 'caffeine').trim())}/property/MolecularFormula,MolecularWeight,IUPACName,XLogP,InChIKey/JSON` }),
  }, 'console.table(data.PropertyTable?.Properties ?? []);'),

  withExamples({
    id: 'nasa-exoplanets', index: '38', phase: 4,
    name: 'NASA Exoplanet Archive', domain: 'Astronomical SQL Queries',
    shortPitch: 'Query confirmed planets by distance, size, and planetary system using the archive’s TAP service.',
    epistemicNote: 'A public astronomy database accepts SQL-style queries and returns planet measurements as JSON.',
    method: 'GET', docsUrl: 'https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html',
    params: [{ key: 'query', label: 'TAP query (keep a TOP limit)', type: 'code', rows: 6, defaultValue: PLANET_QUERIES.nearby }],
    presets: [
      { label: 'Within 10 parsecs', values: { query: PLANET_QUERIES.nearby } },
      { label: 'Earth-size planets', values: { query: PLANET_QUERIES.earthSize } },
      { label: '5+ planet systems', values: { query: PLANET_QUERIES.multiplanet } },
    ],
    buildRequest: (v) => ({ method: 'GET', url: `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?${new URLSearchParams({ query: v.query?.trim() || PLANET_QUERIES.nearby, format: 'json' })}` }),
  }, 'console.table(data);'),

  withExamples({
    id: 'overpass-places', index: '39', phase: 4,
    name: 'OpenStreetMap Overpass', domain: 'Geospatial Queries',
    shortPitch: 'Find mapped cafés, libraries, and bicycle rental locations near a city center.',
    epistemicNote: 'OpenStreetMap’s community map is also a queryable geographic database of tagged objects.',
    method: 'POST', docsUrl: 'https://dev.overpass-api.de/overpass-doc/en/',
    params: [
      { key: 'city', label: 'Search center', type: 'select', defaultValue: 'san_antonio', options: [
        { label: 'San Antonio', value: 'san_antonio' }, { label: 'Tokyo Station', value: 'tokyo' }, { label: 'Central London', value: 'london' },
      ] },
      { key: 'amenity', label: 'Mapped amenity', type: 'select', defaultValue: 'cafe', options: [
        { label: 'Cafés', value: 'cafe' }, { label: 'Libraries', value: 'library' }, { label: 'Bicycle rental', value: 'bicycle_rental' },
      ] },
      { key: 'radius', label: 'Radius (meters)', type: 'select', defaultValue: '500', options: [
        { label: '250 m', value: '250' }, { label: '500 m', value: '500' }, { label: '1 km', value: '1000' },
      ] },
    ],
    presets: [
      { label: 'San Antonio cafés', values: { city: 'san_antonio', amenity: 'cafe', radius: '500' } },
      { label: 'Tokyo libraries', values: { city: 'tokyo', amenity: 'library', radius: '1000' } },
      { label: 'London bike rental', values: { city: 'london', amenity: 'bicycle_rental', radius: '500' } },
    ],
    buildRequest: (v) => ({ method: 'POST', url: 'https://overpass-api.de/api/interpreter', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: overpassQuery(v) }).toString() }),
  }, `console.table((data.elements ?? []).map((place: any) => ({\n  name: place.tags?.name ?? '(unnamed)', type: place.type, id: place.id,\n  lat: place.lat ?? place.center?.lat, lon: place.lon ?? place.center?.lon,\n})));\nif (data.remark) console.warn(data.remark);\n// Map data: © OpenStreetMap contributors, ODbL.`),

  withExamples({
    id: 'drand-beacon', index: '40', phase: 4,
    name: 'drand Randomness Beacon', domain: 'Public Randomness',
    shortPitch: 'Inspect public randomness beacon rounds and their BLS signatures from the League of Entropy.',
    epistemicNote: 'A distributed randomness network publishes signed rounds through a public HTTP API.',
    method: 'GET', docsUrl: 'https://docs.drand.love/developer/http-api/',
    params: [
      { key: 'network', label: 'Beacon network', type: 'select', defaultValue: 'quicknet', options: [
        { label: 'Quicknet (3-second rounds)', value: 'quicknet' }, { label: 'Default (30-second rounds)', value: 'default' }, { label: 'EVMnet (BN254 signatures)', value: 'evmnet' },
      ] },
      { key: 'round', label: 'Round number or latest', type: 'text', defaultValue: 'latest', placeholder: 'latest or 42' },
    ],
    presets: [
      { label: 'Quicknet latest', values: { network: 'quicknet', round: 'latest' } },
      { label: 'Quicknet round 42', values: { network: 'quicknet', round: '42' } },
      { label: 'Default latest', values: { network: 'default', round: 'latest' } },
      { label: 'EVMnet latest', values: { network: 'evmnet', round: 'latest' } },
    ],
    buildRequest: (v) => {
      const network = ['quicknet', 'default', 'evmnet'].includes(v.network) ? v.network : 'quicknet';
      return { method: 'GET', url: `https://api.drand.sh/v2/beacons/${network}/rounds/${encodeURIComponent(v.round?.trim() || 'latest')}` };
    },
  }, `console.log('Round:', data.round, 'BLS signature:', data.signature);\n// Inspection only: this fetch does not verify the BLS signature.\n// Use a verifying drand client before relying on its randomness.\n// These public values are not secret key material.`),
];
