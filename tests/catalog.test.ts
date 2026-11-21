import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ALLOWED_HOSTS } from '../lib/api-core';
import { APIS } from '../src/data/apis';
import { PHASE1_ADDITIONS } from '../src/data/phase1Additions';
import { PHASE2_ADDITIONS } from '../src/data/phase2Additions';
import { PHASE3_ADDITIONS } from '../src/data/phase3Additions';
import { PHASE4_ADDITIONS } from '../src/data/phase4Additions';
import { curlExample, shellQuote } from '../src/data/requestExamples';
import { ResponseVisuals } from '../src/components/ResponseVisuals';
import type { ApiDefinition, BuiltRequest, ParamValues } from '../src/types/api';

const additions = [...PHASE1_ADDITIONS, ...PHASE2_ADDITIONS, ...PHASE3_ADDITIONS, ...PHASE4_ADDITIONS];
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;
const silentConsole = { log() {}, table() {}, warn() {}, error() {} };
const hostileInput = 'single\' double" $(printf UNEXPECTED) `printf UNEXPECTED`\nnext line \\ end';
const posixShellOnly = { skip: process.platform === 'win32' ? 'POSIX curl quoting is verified on macOS/Linux or WSL.' : false };

function variants(api: ApiDefinition): Array<{ label: string; values: ParamValues }> {
  const defaults = Object.fromEntries(api.params.map((param) => [param.key, param.defaultValue]));
  return [
    { label: 'defaults', values: defaults },
    ...(api.presets ?? []).map((preset) => ({ label: preset.label, values: { ...defaults, ...preset.values } })),
  ];
}

function fixture(api: ApiDefinition): unknown {
  const fixtures = JSON.parse(readFileSync(new URL(`./fixtures/phase${api.phase}.json`, import.meta.url), 'utf8')) as Record<string, unknown>;
  assert.ok(Object.hasOwn(fixtures, api.id), `${api.id}: missing response fixture`);
  return fixtures[api.id];
}

function compileExample(code: string): (...args: unknown[]) => Promise<unknown> {
  // TypeScript 7 no longer exports transpileModule. Node 22.13+ supplies the
  // parser/stripper needed by these dependency-free fetch examples.
  return new AsyncFunction('fetch', 'console', stripTypeScriptTypes(code));
}

function expectedHeaders(request: BuiltRequest): Headers {
  const headers = new Headers({ Accept: 'application/json', ...request.headers });
  if (request.body !== undefined && typeof request.body !== 'string' && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return headers;
}

function expectedBody(request: BuiltRequest): string | undefined {
  if (request.body === undefined) return undefined;
  return typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
}

// The shell can only call this fake curl function and built-ins: PATH is empty.
// Null-delimited output lets the test detect splitting, expansion, and lost newlines.
function shellArguments(script: string): string[] {
  const result = spawnSync('/bin/sh', ['-c', script], { encoding: 'utf8', env: { PATH: '' }, timeout: 2_000, maxBuffer: 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(result.stdout.endsWith('\0'), 'argument capture must end with a delimiter');
  return result.stdout.slice(0, -1).split('\0');
}

function assertCurlMatches(code: string, request: BuiltRequest, label: string): void {
  const args = shellArguments(`curl() { printf '%s\\000' "$@"; }\n${code}`);
  const headers = new Headers();
  let method: string | undefined;
  let url: string | undefined;
  let body: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === '--header') {
      const header = args[++i];
      const separator = header.indexOf(':');
      assert.ok(separator > 0, `${label}: malformed header argument`);
      headers.append(header.slice(0, separator), header.slice(separator + 1).trimStart());
    } else if (argument === '--request') method = args[++i];
    else if (argument === '--data-raw') body = args[++i];
    else if (argument === '--max-time') i++;
    else if (['--fail-with-body', '--silent', '--show-error'].includes(argument)) continue;
    else if (argument === request.url && url === undefined) url = argument;
    else assert.fail(`${label}: unexpected curl argument ${JSON.stringify(argument)}`);
  }
  assert.equal(url, request.url, `${label}: curl URL`);
  assert.equal(method, request.method, `${label}: curl method`);
  assert.deepEqual([...headers.entries()], [...expectedHeaders(request).entries()], `${label}: curl headers`);
  assert.equal(body, expectedBody(request), `${label}: curl body`);
}

test('catalog has forty unique APIs, ten per phase, with consecutive display indices', () => {
  assert.equal(APIS.length, 40);
  assert.equal(new Set(APIS.map((api) => api.id)).size, 40);
  assert.deepEqual(APIS.map((api) => api.index), Array.from({ length: 40 }, (_, i) => String(i + 1).padStart(2, '0')));
  for (const phase of [1, 2, 3, 4]) assert.equal(APIS.filter((api) => api.phase === phase).length, 10, `phase ${phase}`);
  assert.deepEqual(APIS.map((api) => api.phase), [...APIS.map((api) => api.phase)].sort());
  assert.equal(additions.length, 20);
  for (const api of additions) assert.ok(APIS.some((entry) => entry.id === api.id), `${api.id} is discoverable in the catalog`);
});

test('every addition has HTTPS docs and at least three usable presets', () => {
  for (const api of additions) {
    assert.equal(new URL(api.docsUrl).protocol, 'https:', api.id);
    assert.ok((api.presets?.length ?? 0) >= 3, `${api.id}: at least three presets`);
    const params = new Map(api.params.map((param) => [param.key, param]));
    assert.equal(params.size, api.params.length, `${api.id}: parameter keys are unique`);
    for (const preset of api.presets ?? []) {
      assert.ok(preset.label.trim(), `${api.id}: preset label`);
      assert.ok(Object.keys(preset.values).length, `${api.id}: populated preset`);
      for (const [key, value] of Object.entries(preset.values)) {
        assert.ok(params.has(key), `${api.id}: unknown preset parameter ${key}`);
        assert.equal(typeof value, 'string', `${api.id}: ${key}`);
        const param = params.get(key)!;
        if (param.type === 'select') assert.ok(param.options?.some((option) => option.value === value), `${api.id}: unsupported selection ${key}=${value}`);
      }
    }
  }
});

test('all catalog defaults and presets build allowlisted HTTPS requests with the declared method', () => {
  for (const api of APIS) for (const { label, values } of variants(api)) {
    const request = api.buildRequest(values);
    const url = new URL(request.url);
    assert.equal(url.protocol, 'https:', `${api.id}/${label}`);
    assert.ok(ALLOWED_HOSTS.has(url.hostname), `${api.id}/${label}: ${url.hostname} must be allowlisted`);
    assert.equal(url.username + url.password, '', `${api.id}/${label}: no embedded credentials`);
    assert.equal(request.method, api.method, `${api.id}/${label}: HTTP method`);
    assert.ok(!new Headers(request.headers).has('authorization'), `${api.id}/${label}: no authorization required`);
  }
});

for (const api of additions) {
  test(`${api.id}: TypeScript examples execute offline and preserve every request field`, async () => {
    const data = fixture(api);
    for (const { label, values } of variants(api)) {
      const request = api.buildRequest(values);
      let calls = 0;
      const mockFetch = async (input: string, init: RequestInit) => {
        calls++;
        assert.equal(input, request.url, `${label}: URL`);
        assert.equal(init.method, request.method, `${label}: method`);
        assert.deepEqual([...new Headers(init.headers).entries()], [...expectedHeaders(request).entries()], `${label}: headers`);
        assert.equal(init.body, expectedBody(request), `${label}: body`);
        assert.ok(init.signal instanceof AbortSignal, `${label}: request timeout`);
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
      };
      await compileExample(api.buildSdkCode(values))(mockFetch, silentConsole);
      assert.equal(calls, 1, `${label}: one request per example`);
    }
  });
}

test('TypeScript examples report unsuccessful HTTP responses before parsing success data', async () => {
  for (const api of additions) {
    const code = compileExample(api.buildSdkCode(variants(api)[0].values));
    await assert.rejects(code(async () => new Response('Rate limit reached', { status: 429 }), silentConsole), /HTTP 429: Rate limit reached/, api.id);
  }
});

test('shell quoting round-trips metacharacters and newlines without expansion', posixShellOnly, () => {
  const values = ['', 'ordinary text', hostileInput, '# comment; & | > < * ?', 'leading -option', 'こんにちは'];
  const args = shellArguments(`printf '%s\\000' ${values.map(shellQuote).join(' ')}`);
  assert.deepEqual(args, values);
  const request: BuiltRequest = {
    method: 'POST', url: `https://api.osv.dev/v1/query?example=${encodeURIComponent(hostileInput)}`,
    headers: { 'Content-Type': 'application/json', 'X-Example': "single' and $(printf UNEXPECTED)" },
    body: { value: hostileInput },
  };
  assertCurlMatches(curlExample(request), request, 'quoted JSON body');
  const textRequest = { ...request, headers: { 'Content-Type': 'text/plain' }, body: hostileInput };
  assertCurlMatches(curlExample(textRequest), textRequest, 'quoted text body');
});

test('new curl examples preserve defaults, presets, and text containing shell syntax', posixShellOnly, () => {
  for (const api of additions) {
    const samples = variants(api);
    const textParameters = api.params.filter((param) => param.type === 'text' || param.type === 'code');
    samples.push({ label: 'shell metacharacters', values: { ...samples[0].values, ...Object.fromEntries(textParameters.map((param) => [param.key, hostileInput])) } });
    for (const { label, values } of samples) assertCurlMatches(api.buildCurlCode(values), api.buildRequest(values), `${api.id}/${label}`);
  }
});

const emptyResponses: Record<string, unknown> = {
  'tvmaze-shows': [], 'nager-holidays': [], 'zippopotam-postcodes': { places: [] },
  'free-dictionary': { title: 'No Definitions Found', message: 'No entry found.' }, 'itunes-search': { resultCount: 0, results: [] },
  'open-library': { numFound: 0, docs: [] }, 'musicbrainz-artists': { count: 0, artists: [] },
  'art-institute': { data: [] }, 'nasa-images': { collection: { items: [] } }, 'anilist-anime': { data: { Page: { media: [] } } },
  'world-bank-indicators': [{ total: 0 }, []], 'nws-alerts': { type: 'FeatureCollection', features: [] },
  'open-food-facts': { status: 'failure', result: { name: 'product_not_found' } },
  'npm-downloads': { package: 'example', start: '2026-01-01', end: '2026-01-07', downloads: [] },
  'treasury-interest-rates': { data: [] }, 'osv-vulnerabilities': {}, 'pubchem-compounds': { PropertyTable: { Properties: [] } },
  'nasa-exoplanets': [], 'overpass-places': { elements: [] }, 'drand-beacon': {},
};

for (const api of additions) {
  test(`${api.id}: composed preview renders its fixture and handles absent or unsuccessful data`, () => {
    const populated = renderToStaticMarkup(createElement(ResponseVisuals, { apiId: api.id, data: fixture(api) }));
    assert.ok(populated.length > 0, 'fixture must have a preview');
    assert.ok(!populated.includes('Copy payload'), 'known response must use its dedicated preview, not the raw fallback');
    for (const data of [fixture(api), emptyResponses[api.id], null, {}, [], { error: 'Upstream unavailable' }, { errors: [{ message: 'No result' }] }]) {
      const rendered = renderToStaticMarkup(createElement(ResponseVisuals, { apiId: api.id, data }));
      assert.ok(!rendered.includes('[object Object]'), `${api.id}: object rendered as text`);
    }
  });
}
