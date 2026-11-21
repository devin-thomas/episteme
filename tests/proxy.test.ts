import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ALLOWED_HOSTS,
  ALLOWED_IMAGE_HOSTS,
  handleImageProxy,
  handleProxy,
  isAllowedHost,
} from '../lib/api-core';

// All upstream requests are mocked. Tests within this file run sequentially so
// scoped global fetch mocks and the warm-instance courtesy cache cannot race.
describe('shared public API proxy', { concurrency: false }, () => {
  test('accepts existing and newly added HTTPS API and image hosts', () => {
    for (const host of ALLOWED_HOSTS) {
      assert.equal(isAllowedHost(`https://${host}/example`, ALLOWED_HOSTS)?.hostname, host);
    }
    for (const host of ALLOWED_IMAGE_HOSTS) {
      assert.equal(isAllowedHost(`https://${host}/image.png`, ALLOWED_IMAGE_HOSTS)?.hostname, host);
    }
    assert.ok(ALLOWED_HOSTS.has('api.open-meteo.com'), 'original providers remain allowed');
    assert.ok(ALLOWED_HOSTS.has('api.osv.dev'), 'new providers are allowed');
    assert.equal(isAllowedHost('https://api.osv.dev:443/v1/query', ALLOWED_HOSTS)?.hostname, 'api.osv.dev');
  });

  test('rejects unknown hosts, HTTP, embedded credentials, and non-443 ports before fetching', async (t) => {
    const upstream = t.mock.method(globalThis, 'fetch', async () => {
      assert.fail('a rejected URL must not reach fetch');
    });
    const rejected = [
      'https://unlisted.example/api',
      'https://api.osv.dev.unlisted.example/api',
      'http://api.osv.dev/v1/query',
      'https://user@api.osv.dev/v1/query',
      'https://user:password@api.osv.dev/v1/query',
      'https://api.osv.dev@unlisted.example/api',
      'https://api.osv.dev:8443/v1/query',
      'https://127.0.0.1/private',
      'file:///etc/passwd',
      'not a URL',
    ];
    for (const url of rejected) {
      assert.equal(isAllowedHost(url, ALLOWED_HOSTS), null, url);
      const response = await handleProxy({ url });
      assert.equal(response.status, 403, url);
      assert.match((await response.json()).error, /allowlist/, url);
    }
    assert.equal(upstream.mock.callCount(), 0);
  });

  test('returns a client error for missing or non-string URLs', async (t) => {
    const upstream = t.mock.method(globalThis, 'fetch', async () => {
      assert.fail('invalid payloads must not reach fetch');
    });
    for (const payload of [undefined, null, {}, [], { url: 42 }]) {
      const response = await handleProxy(payload);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, 'Missing target url');
    }
    assert.equal(upstream.mock.callCount(), 0);
  });

  test('forwards JSON POST bodies and custom headers and reports the complete response envelope', async (t) => {
    const body = { package: { name: 'example', ecosystem: 'npm' }, version: '1.0.0' };
    const raw = JSON.stringify({ summary: 'café', items: [1, 2] });
    const upstream = t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(String(input), 'https://api.osv.dev/v1/query');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.body, JSON.stringify(body));
      assert.equal(init?.redirect, 'manual');
      assert.ok(init?.signal instanceof AbortSignal);
      assert.equal(init.signal.aborted, false);
      const headers = new Headers(init.headers);
      assert.equal(headers.get('content-type'), 'application/json');
      assert.equal(headers.get('accept'), 'application/json');
      assert.equal(headers.get('x-example'), 'preserved');
      assert.match(headers.get('user-agent') ?? '', /Episteme.*github\.com\/devin-thomas\/episteme/);
      return new Response(raw, { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    });

    const response = await handleProxy({
      url: 'https://api.osv.dev/v1/query', method: 'POST',
      headers: { Accept: 'application/json', 'X-Example': 'preserved' }, body,
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, 200);
    assert.equal(result.statusText, 'OK');
    assert.equal(result.contentType, 'application/json; charset=utf-8');
    assert.equal(result.sizeBytes, new TextEncoder().encode(raw).length);
    assert.ok(Number.isFinite(result.latencyMs) && result.latencyMs >= 0);
    assert.deepEqual(result.data, { summary: 'café', items: [1, 2] });
    assert.equal(upstream.mock.callCount(), 1);
  });

  test('forwards a form POST body verbatim without overwriting its content type', async (t) => {
    const body = 'data=%5Bout%3Ajson%5D%3Bnode%28around%3A500%29%3Bout%3B';
    t.mock.method(globalThis, 'fetch', async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(init?.method, 'POST');
      assert.equal(init?.body, body);
      assert.equal(new Headers(init?.headers).get('content-type'), 'application/x-www-form-urlencoded');
      assert.equal(new Headers(init?.headers).get('user-agent'), 'Episteme-example/1.0');
      return Response.json({ elements: [] });
    });
    const response = await handleProxy({
      // A non-paced host keeps this transport test independent of courtesy state.
      url: 'https://godbolt.org/example-form', method: 'POST', body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Episteme-example/1.0' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { elements: [] });
  });

  test('preserves upstream non-2xx statuses and JSON or plain-text error bodies', async (t) => {
    const responses = [
      new Response(JSON.stringify({ error: 'No such record' }), { status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'application/json' } }),
      new Response('Provider temporarily unavailable', { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } }),
    ];
    const upstream = t.mock.method(globalThis, 'fetch', async () => responses.shift()!);
    const first = await handleProxy({ url: 'https://api.osv.dev/missing' });
    assert.equal(first.status, 200, 'the transport returns an envelope for an upstream response');
    const missing = await first.json();
    assert.equal(missing.status, 404);
    assert.equal(missing.statusText, 'Not Found');
    assert.deepEqual(missing.data, { error: 'No such record' });
    assert.equal(missing.error, undefined, 'an upstream error body stays inside data');

    const second = await handleProxy({ url: 'https://api.osv.dev/unavailable' });
    const unavailable = await second.json();
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.statusText, 'Service Unavailable');
    assert.equal(unavailable.data, 'Provider temporarily unavailable');
    assert.equal(upstream.mock.callCount(), 2);
  });

  test('validates redirect destinations before making another request', async (t) => {
    for (const location of [
      'https://unlisted.example/private',
      'http://api.osv.dev/insecure',
      'https://user:password@api.osv.dev/credentialed',
      'https://api.osv.dev:8443/alternate-port',
    ]) {
      await t.test(location, async (subtest) => {
        const upstream = subtest.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
          assert.equal(String(input), 'https://api.osv.dev/redirect');
          assert.equal(init?.redirect, 'manual');
          return new Response('Redirect body', { status: 302, headers: { Location: location } });
        });
        const response = await handleProxy({ url: 'https://api.osv.dev/redirect' });
        assert.equal(response.status, 502);
        assert.match((await response.json()).error, /redirect.*allowlist/i);
        assert.equal(upstream.mock.callCount(), 1, 'the forbidden destination was never fetched');
      });
    }
  });

  test('follows relative and allowlisted redirects while preserving a 307 POST', async (t) => {
    const body = { example: 'preserved through redirect' };
    const expected = [
      'https://api.osv.dev/v1/redirect',
      'https://api.osv.dev/final',
      'https://godbolt.org/allowed-result',
    ];
    let call = 0;
    const upstream = t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(String(input), expected[call]);
      assert.equal(init?.redirect, 'manual');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.body, JSON.stringify(body));
      assert.equal(new Headers(init?.headers).get('content-type'), 'application/json');
      call++;
      if (call === 1) return new Response(null, { status: 307, headers: { Location: '../final' } });
      if (call === 2) return new Response(null, { status: 308, headers: { Location: expected[2] } });
      return Response.json({ arrived: true });
    });
    const response = await handleProxy({ url: expected[0], method: 'POST', body });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { arrived: true });
    assert.equal(upstream.mock.callCount(), 3);
  });

  test('changes a POST to GET without a body after a 303 redirect', async (t) => {
    let call = 0;
    t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      call++;
      if (call === 1) {
        assert.equal(init?.method, 'POST');
        return new Response(null, { status: 303, headers: { Location: '/result' } });
      }
      assert.equal(String(input), 'https://api.osv.dev/result');
      assert.equal(init?.method, 'GET');
      assert.equal(init?.body, undefined);
      return Response.json({ result: 'ready' });
    });
    const response = await handleProxy({ url: 'https://api.osv.dev/submit', method: 'POST', body: { example: true } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { result: 'ready' });
    assert.equal(call, 2);
  });

  test('stops a redirect loop after a bounded number of upstream requests', async (t) => {
    const upstream = t.mock.method(globalThis, 'fetch', async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(init?.redirect, 'manual');
      return new Response(null, { status: 302, headers: { Location: '/loop' } });
    });
    const response = await handleProxy({ url: 'https://api.osv.dev/loop' });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /too many upstream redirects/i);
    assert.equal(upstream.mock.callCount(), 4, 'initial request plus three allowed follow-ups');
  });

  test('reuses recent provider responses and returns Retry-After for a different query inside its courtesy interval', async (t) => {
    const start = 1_900_000_000_000;
    let now = start;
    t.mock.method(Date, 'now', () => now);
    const upstream = t.mock.method(globalThis, 'fetch', async () => Response.json({ resultCount: 1, results: [{ trackName: 'Example' }] }));
    const request = { url: 'https://itunes.apple.com/search?term=first&entity=song&limit=1' };

    const first = await handleProxy(request);
    assert.equal(first.status, 200);
    const original = await first.json();
    assert.equal(original.cached, undefined);
    assert.equal(upstream.mock.callCount(), 1);

    now = start + 100;
    const cachedResponse = await handleProxy(request);
    assert.equal(cachedResponse.status, 200);
    const cached = await cachedResponse.json();
    assert.equal(cached.cached, true);
    assert.deepEqual(cached.data, original.data);
    assert.equal(cached.sizeBytes, original.sizeBytes);
    assert.equal(upstream.mock.callCount(), 1, 'a cache hit never reaches the provider');

    const different = { url: 'https://itunes.apple.com/search?term=second&entity=song&limit=1' };
    const limited = await handleProxy(different);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '3');
    assert.match((await limited.json()).error, /wait 3s.*itunes\.apple\.com/i);
    assert.equal(upstream.mock.callCount(), 1, 'a paced request never reaches the provider');

    now = start + 3101;
    const next = await handleProxy(different);
    assert.equal(next.status, 200);
    assert.equal((await next.json()).cached, undefined);
    assert.equal(upstream.mock.callCount(), 2, 'a new query proceeds after its interval');

    now = start + 60_001;
    const expired = await handleProxy(request);
    assert.equal(expired.status, 200);
    assert.equal((await expired.json()).cached, undefined);
    assert.equal(upstream.mock.callCount(), 3, 'expired data is fetched again');
  });
});

describe('shared image proxy', { concurrency: false }, () => {
  test('rejects unlisted or insecure image targets before fetching', async (t) => {
    const upstream = t.mock.method(globalThis, 'fetch', async () => {
      assert.fail('a rejected image URL must not reach fetch');
    });
    for (const url of [null, 'https://unlisted.example/image.png', 'http://images.openfoodfacts.org/image.jpg', 'https://user@images.openfoodfacts.org/image.jpg', 'https://images.openfoodfacts.org:8443/image.jpg']) {
      const response = await handleImageProxy(url);
      assert.equal(response.status, 403);
      assert.equal(await response.text(), 'Forbidden image host');
    }
    assert.equal(upstream.mock.callCount(), 0);
  });

  test('rejects redirects outside the image allowlist before fetching their destination', async (t) => {
    const upstream = t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(String(input), 'https://images.openfoodfacts.org/example.jpg');
      assert.equal(init?.redirect, 'manual');
      return new Response(null, { status: 302, headers: { Location: 'https://unlisted.example/image.jpg' } });
    });
    const response = await handleImageProxy('https://images.openfoodfacts.org/example.jpg');
    assert.equal(response.status, 502);
    assert.equal(await response.text(), 'Image proxy error');
    assert.equal(upstream.mock.callCount(), 1);
  });

  test('preserves image bytes and content type and attaches an abort signal', async (t) => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const upstream = t.mock.method(globalThis, 'fetch', async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.ok(init?.signal instanceof AbortSignal);
      assert.equal(init.signal.aborted, false);
      assert.equal(init.redirect, 'manual');
      assert.match(new Headers(init.headers).get('user-agent') ?? '', /Episteme/);
      return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
    });
    const response = await handleImageProxy('https://images.openfoodfacts.org/example.png');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=3600');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
    assert.equal(upstream.mock.callCount(), 1);
  });

  test('uses the image timeout signal and returns an error when it aborts', async (t) => {
    const controller = new AbortController();
    controller.abort(new DOMException('Timed out', 'TimeoutError'));
    const timeout = t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
      assert.equal(milliseconds, 14_000);
      return controller.signal;
    });
    const upstream = t.mock.method(globalThis, 'fetch', async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(init?.signal, controller.signal);
      assert.equal(init.signal.aborted, true);
      throw init.signal.reason;
    });
    const response = await handleImageProxy('https://images.openfoodfacts.org/timeout.jpg');
    assert.equal(response.status, 502);
    assert.equal(await response.text(), 'Image proxy error');
    assert.equal(timeout.mock.callCount(), 1);
    assert.equal(upstream.mock.callCount(), 1);
  });
});
