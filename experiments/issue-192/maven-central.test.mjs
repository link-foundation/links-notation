import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyCentral } from '../../scripts/ci/maven-central.mjs';
import { mavenResponse } from './maven-fixture.mjs';

const verify = (artifact, change = () => null) => verifyCentral({
  artifact, version: '1.2.3', verifySignature: async () => {},
  fetcher: async (url) => await change(url) ?? mavenResponse(url),
});

test('Java verifies the exact POM, binaries, hashes and signatures without listing directories', async () => {
  const result = await verify('links-notation', (url) => {
    assert.ok(!url.endsWith('/'));
  });
  assert.equal(result.present, true);
  assert.equal(result.signatures, 4);
});
test('Kotlin follows string available-at.module coordinates across all eight signed modules', async () => {
  const result = await verify('links-notation-kotlin');
  assert.equal(result.coordinates, 8);
  assert.ok(result.files >= 8);
  assert.ok(result.signatures >= 24);
});
test('a new version is absent only when its root POM is 404', async () => {
  assert.equal((await verify('links-notation', () => new Response('', { status: 404 }))).present, false);
});
test('a missing target is incomplete publication, even when the root exists', async () => {
  await assert.rejects(verify('links-notation-kotlin', (url) => url.includes('-wasm-js/') ? new Response('', { status: 404 }) : null), /incomplete.*404/i);
});
test('wrong POM coordinates cannot be satisfied by a dependency', async () => {
  await assert.rejects(verify('links-notation', (url) => url.endsWith('.pom') ? new Response('<project><groupId>other</groupId><artifactId>wrong</artifactId><version>0.0.0</version><dependencies><dependency><groupId>io.github.link-foundation</groupId><artifactId>links-notation</artifactId><version>1.2.3</version></dependency></dependencies></project>') : null), /coordinates/);
});
for (const defect of ['missing platform', 'wrong version', 'foreign url', 'wrong hash', 'empty files']) {
  test(`Kotlin rejects ${defect}`, async () => {
    await assert.rejects(verify('links-notation-kotlin', async (url) => {
      if (!url.endsWith('.module')) return null;
      const body = await mavenResponse(url).json();
      if (defect === 'missing platform') body.variants = body.variants.filter((v) => !v['available-at']?.module.endsWith('-wasm-js'));
      if (defect === 'wrong version') body.component.version = '9.9.9';
      if (defect === 'foreign url') for (const v of body.variants) if (v['available-at']) v['available-at'].url = 'https://evil.example/metadata';
      if (defect === 'wrong hash') for (const v of body.variants) for (const f of v.files ?? []) f.sha256 = '0'.repeat(64);
      if (defect === 'empty files') for (const v of body.variants) if (v.files) v.files = [];
      return new Response(JSON.stringify(body));
    }));
  });
}
test('service failures remain unknown, never absence', async () => {
  await assert.rejects(verify('links-notation', () => new Response('', { status: 503 })), /HTTP 503/);
});
test('signature rejection fails delivery', async () => {
  await assert.rejects(verifyCentral({ artifact: 'links-notation', version: '1.2.3', fetcher: mavenResponse,
    verifySignature: async () => { throw new Error('bad signature'); } }), /bad signature/);
});
