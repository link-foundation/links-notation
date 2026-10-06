#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '..');
const payload = '##[error]injected by contributor text';

function run(script, args, cwd, env = {}) {
  return spawnSync(process.execPath, [join(repositoryRoot, 'scripts', script), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function initRepository() {
  const directory = mkdtempSync(join(tmpdir(), 'java-template-security-'));
  mkdirSync(join(directory, '.changeset'));
  mkdirSync(join(directory, 'scripts'));
  writeFileSync(join(directory, 'pom.xml'), '<project><version>1.0.0</version></project>\n');
  execFileSync('git', ['init', '-q', directory]);
  execFileSync('git', ['-C', directory, 'config', 'user.email', 'ci@example.invalid']);
  execFileSync('git', ['-C', directory, 'config', 'user.name', 'CI']);
  execFileSync('git', ['-C', directory, 'add', '.']);
  execFileSync('git', ['-C', directory, 'commit', '-qm', 'baseline']);
  return directory;
}

function commitPullRequest(directory, changesetContent) {
  writeFileSync(join(directory, '.changeset', 'test.md'), changesetContent);
  writeFileSync(join(directory, 'scripts', 'changed.mjs'), 'export default true;\n');
  execFileSync('git', ['-C', directory, 'add', '.']);
  execFileSync('git', ['-C', directory, 'commit', '-qm', 'pull request']);
}

function assertPayloadIsBracketed(output) {
  const lines = output.split(/\r?\n/);
  const payloadIndex = lines.findIndex((line) => line.includes(payload));
  assert.notEqual(payloadIndex, -1, 'fixture payload was not printed');
  const stopIndex = lines.findLastIndex(
    (line, index) => index < payloadIndex && /^::stop-commands::[a-f0-9]{32}$/.test(line)
  );
  assert.notEqual(stopIndex, -1, 'payload must follow a random 128-bit stop token');
  const token = lines[stopIndex].slice('::stop-commands::'.length);
  const resumeIndex = lines.findIndex(
    (line, index) => index > payloadIndex && line === `::${token}::`
  );
  assert.notEqual(resumeIndex, -1, 'payload must precede the matching resume token');
}

test('validator fails closed and validates every changeset when the base diff is unavailable', () => {
  const directory = initRepository();
  commitPullRequest(directory, 'not valid changeset frontmatter\n');

  const result = run('validate-changeset.mjs', [], directory, { GITHUB_BASE_REF: 'missing' });

  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Could not determine the PR diff/);
  assert.match(result.stdout + result.stderr, /Changeset must have frontmatter/);
});

test('validator brackets contributor-authored descriptions in GitHub Actions logs', () => {
  const directory = initRepository();
  execFileSync('git', ['-C', directory, 'update-ref', 'refs/remotes/origin/main', 'HEAD']);
  commitPullRequest(directory, `---\n'my-package': patch\n---\n\n${payload}\n`);

  const result = run('validate-changeset.mjs', [], directory, {
    GITHUB_ACTIONS: 'true',
    GITHUB_BASE_REF: 'main',
  });

  assert.equal(result.status, 0, result.stderr);
  assertPayloadIsBracketed(result.stdout);
});

for (const [name, script, args, prepare] of [
  [
    'merged changeset dry-run',
    'merge-changesets.mjs',
    ['--dry-run'],
    (directory) => {
      mkdirSync(join(directory, '.changeset'));
      for (const file of ['one.md', 'two.md']) {
        writeFileSync(
          join(directory, '.changeset', file),
          `---\n'my-package': patch\n---\n\n${payload}\n`
        );
      }
    },
  ],
  [
    'collected changelog dry-run',
    'collect-changelog.mjs',
    ['--dry-run', '--version', '1.2.3'],
    (directory) => {
      mkdirSync(join(directory, '.changeset'));
      writeFileSync(join(directory, 'pom.xml'), '<project><version>1.2.3</version></project>\n');
      writeFileSync(join(directory, 'CHANGELOG.md'), '# Changelog\n');
      writeFileSync(
        join(directory, '.changeset', 'one.md'),
        `---\n'my-package': patch\n---\n\n${payload}\n`
      );
    },
  ],
  [
    'manual changeset description',
    'create-manual-changeset.mjs',
    ['--bump-type', 'patch', '--description', payload],
    (directory) => mkdirSync(join(directory, '.changeset')),
  ],
]) {
  test(`${name} brackets contributor-authored text in GitHub Actions logs`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'java-template-security-'));
    prepare(directory);
    const result = run(script, args, directory, { GITHUB_ACTIONS: 'true' });
    assert.equal(result.status, 0, result.stderr);
    assertPayloadIsBracketed(result.stdout);
  });
}
