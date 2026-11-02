import { expect, test } from 'bun:test';
import { checkNugetAuthentication, selectNugetCredential } from './nuget-auth.mjs';

test('username alone is configuration, never authentication', async () => {
  expect(await checkNugetAuthentication({ nugetUser: 'publisher' })).toMatchObject({
    status: 'failed',
    auth: 'none',
    authenticated: 'unknown',
  });
});
for (const apiKey of ['', 'expired-secret']) {
  test(`successful official OIDC exchange never probes fallback ${apiKey ? '(invalid)' : '(absent)'}`, async () => {
    const result = await checkNugetAuthentication({
      nugetUser: 'publisher',
      oidcOutcome: 'success',
      oidcKey: 'temporary',
      apiKey,
      fetchImpl: async () => {
        throw Error('fallback must not run');
      },
    });
    expect(result).toMatchObject({
      status: 'ok',
      auth: 'trusted-publishing',
      authenticated: true,
      authorized: 'unknown',
    });
    expect(JSON.stringify(result)).not.toContain('temporary');
  });
}
for (const oidcOutcome of ['failure', 'skipped', 'success']) {
  test(`OIDC ${oidcOutcome} without a key selects deliberate token fallback`, () => {
    expect(selectNugetCredential({ oidcOutcome, apiKey: 'provided' })).toMatchObject({
      method: 'token-fallback',
      key: 'provided',
    });
  });
}
for (const status of [400, 401, 403, 500]) {
  test(`fallback probe HTTP ${status} preserves honest authentication/scope states`, async () => {
    const result = await checkNugetAuthentication({
      oidcOutcome: 'failure',
      apiKey: 'provided',
      packageId: 'Example.Package',
      fetchImpl: async () => ({ ok: false, status, body: { cancel: async () => {} } }),
    });
    expect(result.status).toBe(status === 401 ? 'failed' : 'unknown');
    expect(result.authorized).toBe('unknown');
    expect(result.detail).not.toContain('provided');
  });
}
test('derived verification key cannot establish original push glob', async () => {
  let calls = 0;
  const result = await checkNugetAuthentication({
    apiKey: 'provided',
    packageId: 'Example.Package',
    publishedVersion: '1.0.0',
    fetchImpl: async () => {
      calls++;
      return { ok: true, json: async () => ({ Key: 'derived-secret' }) };
    },
  });
  expect(result).toMatchObject({
    status: 'ok',
    authenticated: true,
    authorized: 'unknown',
    auth: 'token-fallback',
  });
  expect(calls).toBe(1);
  expect(result.detail).toContain('does not prove');
});
test('both methods unavailable fail with both remedies and redacted diagnostics', async () => {
  const result = await checkNugetAuthentication({ oidcOutcome: 'failure' });
  expect(result.status).toBe('failed');
  expect(result.detail).toContain('NUGET_API_KEY');
  expect(result.detail).toContain('NUGET_USER');
});
