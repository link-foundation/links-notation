import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadCommandStream,
  loadLinoArguments,
} from '../scripts/use-module.mjs';

test('installed release dependencies expose their required exports', async () => {
  assert.equal(typeof (await loadCommandStream()).$, 'function');
  assert.equal(typeof (await loadLinoArguments()).makeConfig, 'function');
});

test('a nonzero command rejects without fetching a loader', async () => {
  const { $ } = await loadCommandStream();
  await assert.rejects(
    $`${process.execPath} -e ${'process.exit(3)'}`,
    (error) => error.code === 3
  );
});
