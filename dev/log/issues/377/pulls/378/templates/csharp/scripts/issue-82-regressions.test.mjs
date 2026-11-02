import { expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkDirectory } from './check-file-size.mjs';
import {
  fetchNugetVersions,
  fetchGithubReleaseExists,
} from './check-release-needed.mjs';
import * as archive from './check-web-archive.mjs';

const scripts = resolve('scripts');
const response = (status, body) => ({
  status,
  ok: status === 200,
  json: async () => body,
});

test('file limit scans substring filenames, .github and checkout names', () => {
  const root = mkdtempSync(join(tmpdir(), 'robin-obj-artifacts-'));
  try {
    for (const name of [
      'src/Robin.cs',
      'src/Combiner.cs',
      '.github/Tool.cs',
      'src/App/bin/Skip.cs',
      'src/App/obj/Skip.cs',
    ]) {
      mkdirSync(join(root, name, '..'), { recursive: true });
      writeFileSync(join(root, name), 'x\n'.repeat(1001));
    }
    expect(checkDirectory(root).violations.map((x) => x.file)).toEqual([
      '.github/Tool.cs',
      'src/Combiner.cs',
      'src/Robin.cs',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const probe of ['nuget', 'github']) {
  const run = (fetchImpl, retry) =>
    probe === 'nuget'
      ? fetchNugetVersions('Example', fetchImpl, retry)
      : fetchGithubReleaseExists('owner/repo', 'v1.0.0', fetchImpl, retry);
  test(`${probe} retries dropped connections, rate limits and server failures`, async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      if (calls === 1)
        throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
      return response(calls === 2 ? 429 : calls === 3 ? 503 : 200, {
        versions: ['1.0.0'],
      });
    };
    await run(fetchImpl, { delayMs: 0 });
    expect(calls).toBe(4);
  });
  test(`${probe} exhausted errors name cause; 404 is immediate`, async () => {
    await expect(
      run(
        async () => {
          throw new TypeError('fetch failed', { cause: { code: 'ETIMEDOUT' } });
        },
        { attempts: 2, delayMs: 0 },
      ),
    ).rejects.toThrow(/ETIMEDOUT.*2 attempts/);
    let calls = 0;
    await run(
      async () => {
        calls++;
        return response(404);
      },
      { delayMs: 0 },
    );
    expect(calls).toBe(1);
  });
}

test('Wayback retries and distinguishes lookup errors from absent snapshots', async () => {
  expect(typeof archive.checkWaybackMachine).toBe('function');
  let calls = 0;
  const fetchImpl = async () =>
    ++calls === 1
      ? response(429)
      : response(200, {
          archived_snapshots: {
            closest: {
              available: true,
              url: 'http://web.archive.org/web/1/https://example.com',
              timestamp: '20260101000000',
            },
          },
        });
  expect(
    await archive.checkWaybackMachine('https://example.com', { fetchImpl, delayMs: 0 }),
  ).toMatchObject({ available: true });
  expect(calls).toBe(2);
  expect(
    await archive.checkWaybackMachine('https://example.com', {
      fetchImpl: async () => response(503),
      attempts: 2,
      delayMs: 0,
    }),
  ).toMatchObject({ available: false, error: expect.stringContaining('503') });
  expect(
    await archive.checkWaybackMachine('https://example.com', {
      fetchImpl: async () => response(200, {}),
      attempts: 1,
      delayMs: 0,
    }),
  ).toHaveProperty('error');
});

test('Dependabot exemption uses author before any git or changeset access', () => {
  const root = mkdtempSync(join(tmpdir(), 'changeset-author-'));
  try {
    const run = (author, branch = '') =>
      spawnSync('bun', [join(scripts, 'validate-changeset.mjs')], {
        cwd: root,
        env: {
          ...process.env,
          PR_AUTHOR: author,
          GITHUB_HEAD_REF: branch,
          GITHUB_BASE_SHA: '',
          GITHUB_HEAD_SHA: '',
          GITHUB_BASE_REF: '',
        },
        encoding: 'utf8',
      });
    expect(run('dependabot[bot]').status).toBe(0);
    expect(run('ordinary', 'dependabot/nuget/update').status).toBe(1);
    expect(run('').status).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const script of ['merge-changesets.mjs', 'version-and-commit.mjs']) {
  test(`${script} rejects mixed invalid changesets without mutations or pushes`, () => {
    const root = mkdtempSync(join(tmpdir(), 'invalid-changeset-'));
    const git = (args) =>
      execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
    try {
      git(['init', '-q', '-b', 'main']);
      git(['config', 'user.name', 'Test']);
      git(['config', 'user.email', 'test@example.com']);
      git(['init', '--bare', '-q', 'remote.git']);
      git(['remote', 'add', 'origin', join(root, 'remote.git')]);
      mkdirSync(join(root, '.changeset'));
      mkdirSync(join(root, 'src/MyPackage'), { recursive: true });
      writeFileSync(
        join(root, '.changeset/a.md'),
        "---\n'MyPackage': patch\n---\nFix\n",
      );
      writeFileSync(
        join(root, '.changeset/b.md'),
        "---\n'MyPackage': minr\n---\nFeature\n",
      );
      writeFileSync(
        join(root, 'src/MyPackage/MyPackage.csproj'),
        '<Project><PropertyGroup><Version>1.0.0</Version></PropertyGroup></Project>',
      );
      writeFileSync(join(root, 'CHANGELOG.md'), '# Changelog\n');
      git(['add', '.changeset', 'src', 'CHANGELOG.md']);
      git(['commit', '-qm', 'fixture']);
      git(['push', '-qu', 'origin', 'main']);
      const before = git(['rev-parse', 'HEAD']);
      const result = spawnSync('bun', [join(scripts, script), '--mode', 'changeset'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: '' },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Invalid changeset');
      expect(readdirSync(join(root, '.changeset'))).toEqual(['a.md', 'b.md']);
      expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toBe('# Changelog\n');
      expect(git(['rev-parse', 'HEAD'])).toBe(before);
      expect(git(['ls-remote', 'origin', 'refs/heads/main'])).toStartWith(before);
      expect(git(['ls-remote', '--tags', 'origin'])).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
