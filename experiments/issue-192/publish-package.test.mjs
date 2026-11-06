import assert from 'node:assert/strict';
import test from 'node:test';
import { publishWithFallback, exchangeTrustedCredential } from '../../scripts/ci/publish-package.mjs';

for (const provider of ['nuget', 'pypi']) {
  test(`${provider}: rejected OIDC exchange uses a supplied credential`, async () => {
    const seen = [];
    await publishWithFallback({
      provider, trusted: true,
      exchange: async () => { throw Object.assign(new Error('HTTP 403'), { authentication: true }); },
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async (credential) => { seen.push(credential.key); return { status: 0 }; },
      log: () => {},
    });
    assert.deepEqual(seen, ['fallback']);
  });
  test(`${provider}: rejected short-lived key retries only upload`, async () => {
    const seen = [];
    const result = await publishWithFallback({
      provider, trusted: true, exchange: async () => 'oidc',
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async (credential) => {
        seen.push(credential.key);
        return credential.key === 'oidc'
          ? { status: 1, output: provider === 'nuget'
            ? 'error: Response status code does not indicate success: 401 (Unauthorized).'
            : 'HTTPError: 403 Forbidden from https://upload.pypi.org/legacy/' }
          : { status: 0 };
      }, log: () => {},
    });
    assert.equal(result, 'supplied token');
    assert.deepEqual(seen, ['oidc', 'fallback']);
  });
  test(`${provider}: trusted publishing wins over configured secrets`, async () => {
    const seen = [];
    await publishWithFallback({
      provider, trusted: true, exchange: async () => 'oidc',
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async (credential) => { seen.push(credential.key); return { status: 0 }; },
      log: () => {},
    });
    assert.deepEqual(seen, ['oidc']);
  });
  for (const output of ['HTTPError: 400 Bad Request (metadata defect)', 'error: 409 (Conflict)', 'socket hang up after upload', 'HTTPError: 503 Service Unavailable']) {
    test(`${provider}: ${output} never changes credentials`, async () => {
      let calls = 0;
      await assert.rejects(publishWithFallback({
        provider, trusted: true, exchange: async () => 'oidc',
        credentials: [{ source: 'supplied token', key: 'fallback' }],
        upload: async () => { calls++; return { status: 1, output }; }, log: () => {},
      }), /upload failed/);
      assert.equal(calls, 1);
    });
  }
  test(`${provider}: unknown OIDC failure cannot trigger fallback`, async () => {
    let calls = 0;
    await assert.rejects(publishWithFallback({
      provider, trusted: true, exchange: async () => { throw new Error('transport unknown'); },
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async () => { calls++; }, log: () => {},
    }), /transport unknown/);
    assert.equal(calls, 0);
  });
  test(`${provider}: absent credentials fail visibly`, async () => {
    await assert.rejects(publishWithFallback({ provider, credentials: [], log: () => {} }), /No .* credential/);
  });
}

test('NuGet exchange follows the official token protocol and masks no values into logs', async () => {
  const calls = [];
  const key = await exchangeTrustedCredential('nuget', {
    NUGET_USER: 'maintainer', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.githubusercontent.com/token?x=1',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-secret',
  }, async (url, options) => {
    calls.push([url, options]);
    return new Response(JSON.stringify(calls.length === 1 ? { value: 'identity-secret' } : { apiKey: 'short-lived' }));
  });
  assert.equal(key, 'short-lived');
  assert.match(calls[0][0], /audience=https%3A%2F%2Fwww.nuget.org/);
  assert.equal(calls[1][0], 'https://www.nuget.org/api/v2/token');
  assert.deepEqual(JSON.parse(calls[1][1].body), { username: 'maintainer', tokenType: 'ApiKey' });
  assert.equal(calls[1][1].headers.authorization, 'Bearer identity-secret');
});

for (const status of [400, 401, 403, 429, 500]) {
  test(`PyPI token exchange HTTP ${status} has explicit fallback classification`, async () => {
    let calls = 0;
    await assert.rejects(exchangeTrustedCredential('pypi', {
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.githubusercontent.com/token?x=1',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-secret',
    }, async () => {
      calls++;
      return calls === 1 ? new Response('{"value":"identity"}')
        : new Response(JSON.stringify({ errors: [{ code: 'invalid-publisher', description: 'not configured' }] }), { status });
    }), (error) => error.authentication === ([400, 401, 403].includes(status)));
  });
}
