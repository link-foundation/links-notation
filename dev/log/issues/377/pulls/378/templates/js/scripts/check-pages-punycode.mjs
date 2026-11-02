// Exercise the native import adapter and the unmodified pinned Pages bundle.
// The bundle deliberately receives no OIDC endpoint and cannot deploy anything.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import '../.github/actions/artifact-transport/punycode.mjs';

const require = createRequire(import.meta.url);
const punycode = require('punycode');
assert.equal(require('node:punycode'), punycode);
assert.equal(punycode.version, '2.3.1');
assert.equal(punycode.toASCII('mañana.com'), 'xn--maana-pta.com');
assert.equal(punycode.toUnicode('xn--maana-pta.com'), 'mañana.com');
assert.equal(punycode.encode('mañana'), 'maana-pta');
assert.equal(punycode.decode('maana-pta'), 'mañana');
assert.deepEqual(punycode.ucs2.decode('𝌆'), [0x1d306]);
assert.equal(punycode.ucs2.encode([0x1d306]), '𝌆');
assert.throws(() => punycode.decode('\u0080'), RangeError);
assert.equal(typeof require('node:fs').readFileSync, 'function');

const bundle = process.argv[2];
if (!bundle) {
  throw new Error('Supply the pinned deploy-pages dist/index.js fixture');
}
const adapter = fileURLToPath(
  new URL('../.github/actions/artifact-transport/punycode.mjs', import.meta.url)
);
const env = {
  PATH: process.env.PATH,
  SystemRoot: process.env.SystemRoot,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
  GITHUB_RUN_ID: '1',
  GITHUB_REPOSITORY: 'fixture/fixture',
  GITHUB_SHA: '0'.repeat(40),
  GITHUB_ACTOR: 'fixture',
  GITHUB_ACTION: 'fixture',
};
for (const adapted of [false, true]) {
  const result = spawnSync(
    process.execPath,
    [
      '--throw-deprecation',
      ...(adapted ? ['--import', adapter] : []),
      resolve(bundle),
    ],
    { env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 }
  );
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  if (adapted) {
    assert.doesNotMatch(result.stderr, /DeprecationWarning|punycode/);
    assert.match(result.stdout, /Unable to get ACTIONS_ID_TOKEN_REQUEST_URL/);
    assert.match(result.stdout, /Ensure GITHUB_TOKEN has permission/);
  } else {
    assert.match(result.stderr, /DeprecationWarning.*punycode/);
  }
}
console.log(
  'Pages bundle: native APIs passed; clean startup retained OIDC refusal.'
);
