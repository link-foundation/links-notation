import { test, expect } from 'bun:test';
import {
  checkPublishingConfiguration,
  checkGithubPushPermission,
} from './preflight-credentials.mjs';

test('template placeholder cannot pass release publishing configuration', () => {
  const result = checkPublishingConfiguration();
  expect(result.status).toBe('failed');
  expect(result.detail).toContain('Never register MyPackage');
});
for (const permissions of [undefined, {}, { push: false }, { push: true }])
  test(`repository read does not prove write capability: ${JSON.stringify(permissions)}`, async () => {
    const result = await checkGithubPushPermission({
      repository: 'owner/repo',
      token: 'test',
      fetchImpl: async () => Response.json({ full_name: 'owner/repo', permissions }),
    });
    expect(result.status).toBe('ok');
    expect(result.writeCapability).toBe('unverified');
  });
for (const status of [401, 404])
  test(`repository read rejection ${status} is fatal`, async () => {
    const result = await checkGithubPushPermission({
      repository: 'owner/repo',
      token: 'test',
      fetchImpl: async () => new Response('', { status }),
    });
    expect(result.status).toBe('failed');
  });
