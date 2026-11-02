import { test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pushRelease } from './git-push.mjs';
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'push-regression-'));
  const remote = join(root, 'origin.git');
  const local = join(root, 'local');
  const other = join(root, 'other');
  const git = (cwd, args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  try {
    git(root, ['init', '--bare', '--initial-branch=main', remote]);
    git(root, ['clone', remote, local]);
    for (const cwd of [local]) {
      git(cwd, ['config', 'user.name', 'Test']);
      git(cwd, ['config', 'user.email', 'test@example.com']);
    }
    writeFileSync(join(local, 'base'), 'base');
    git(local, ['add', '.']);
    git(local, ['commit', '-m', 'base']);
    git(local, ['push', 'origin', 'main']);
    git(root, ['clone', remote, other]);
    git(other, ['config', 'user.name', 'Test']);
    git(other, ['config', 'user.email', 'test@example.com']);
    writeFileSync(join(local, 'version'), '1.0.1');
    git(local, ['add', '.']);
    git(local, ['commit', '-m', 'release']);
    git(local, ['tag', '-a', 'v1.0.1', '-m', 'release']);
    run({ root, local, other, remote, git });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test('atomic push rebases a racing unrelated main update and retags the final commit', () =>
  fixture(({ local, other, remote, git }) => {
    let attempts = 0;
    const spawn = (file, args, options) => {
      if (args[0] === 'push' && ++attempts === 1) {
        writeFileSync(join(other, 'racing'), 'keep');
        git(other, ['add', '.']);
        git(other, ['commit', '-m', 'race']);
        git(other, ['push', 'origin', 'main']);
      }
      return spawnSync(file, args, { ...options, cwd: local });
    };
    pushRelease({ tag: 'v1.0.1', tagMessage: 'release', spawn, log: () => {} });
    expect(attempts).toBe(2);
    expect(git(remote, ['rev-parse', 'main'])).toBe(
      git(remote, ['rev-parse', 'v1.0.1^{}']),
    );
    expect(git(remote, ['show', 'main:racing'])).toBe('keep');
  }));
test('protected-branch rejection is fatal and atomic: neither ref changes', () =>
  fixture(({ local, remote, git }) => {
    const before = git(remote, ['rev-parse', 'main']);
    const hook = join(remote, 'hooks', 'pre-receive');
    writeFileSync(
      hook,
      '#!/bin/sh\necho "GH013: Repository rule violations" >&2\nexit 1\n',
    );
    chmodSync(hook, 0o755);
    const calls = [];
    const spawn = (file, args, options) => {
      calls.push(args);
      return spawnSync(file, args, { ...options, cwd: local });
    };
    expect(() =>
      pushRelease({ tag: 'v1.0.1', tagMessage: 'release', spawn, log: () => {} }),
    ).toThrow(/GH013/);
    expect(calls.filter((a) => a[0] === 'push')).toHaveLength(1);
    expect(git(remote, ['rev-parse', 'main'])).toBe(before);
    expect(git(remote, ['tag', '--list'])).toBe('');
  }));
test('repeated non-fast-forward races are bounded without forcing', () => {
  let attempts = 0;
  const calls = [];
  const spawn = (_file, args) => {
    calls.push(args);
    return args[0] === 'push'
      ? (++attempts, { status: 1, stderr: '[rejected] main -> main (fetch first)' })
      : { status: 0, stdout: '' };
  };
  expect(() =>
    pushRelease({ tag: 'v1.0.1', tagMessage: 'release', spawn, log: () => {} }),
  ).toThrow(/3 attempts/);
  expect(attempts).toBe(3);
  expect(calls.flat()).not.toContain('--force');
});
