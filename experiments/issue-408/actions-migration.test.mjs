import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('setup-java 6.3 preserves compiler annotations in every workflow copy', () => {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n');
  let checked = 0;
  for (const file of files.filter((name) => /\.ya?ml$/.test(name))) {
    const steps = readFileSync(file, 'utf8').split(/\n\s*- (?:name|uses):/);
    for (const step of steps) {
      if (!/actions\/setup-java@/.test(step)) continue;
      assert.match(step, /problem-matcher:\s*true\b/, `${file} must retain compiler annotations`);
      checked++;
    }
  }
  assert.ok(checked > 0, 'exercise actual workflow declarations');
});
