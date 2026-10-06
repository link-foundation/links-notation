import { describe, expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(HERE, 'version-and-commit.mjs');

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf-8' });
}

function setupRepo({ startingVersion, changesetBump, csharpRoot = '.' }) {
  const root = mkdtempSync(path.join(tmpdir(), 'version-and-commit-'));
  const remote = path.join(root, 'remote.git');
  const repo = path.join(root, 'repo');
  const packageRoot = csharpRoot === '.' ? repo : path.join(repo, csharpRoot);
  mkdirSync(repo);

  // Initialize a bare remote so `git push` succeeds without network access.
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote]);

  git(['init', '-q', '-b', 'main'], repo);
  git(['config', 'user.email', 'test@example.com'], repo);
  git(['config', 'user.name', 'Test User'], repo);
  git(['config', 'commit.gpgsign', 'false'], repo);
  git(['config', 'tag.gpgsign', 'false'], repo);
  git(['remote', 'add', 'origin', remote], repo);
  git(['commit', '--allow-empty', '-q', '-m', 'init'], repo);

  if (csharpRoot !== '.') {
    mkdirSync(path.join(repo, 'js'), { recursive: true });
    writeFileSync(path.join(repo, 'js', 'package.json'), '{}\n');
  }

  mkdirSync(path.join(packageRoot, 'src', 'MyPackage'), { recursive: true });
  writeFileSync(
    path.join(packageRoot, 'src', 'MyPackage', 'MyPackage.csproj'),
    `<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup>\n    <Version>${startingVersion}</Version>\n  </PropertyGroup>\n</Project>\n`
  );

  mkdirSync(path.join(packageRoot, '.changeset'), { recursive: true });
  if (changesetBump) {
    writeFileSync(
      path.join(packageRoot, '.changeset', 'feature.md'),
      `---\n'MyPackage': ${changesetBump}\n---\n\nAdd a feature\n`
    );
  }

  git(['add', '-A'], repo);
  git(['commit', '-q', '-m', 'snapshot'], repo);
  git(['push', '-q', '-u', 'origin', 'main'], repo);

  return { packageRoot, repo, root };
}

function runScript(repo, extraArgs = ['--mode', 'changeset']) {
  const outputFile = path.join(repo, 'gh-output.txt');
  writeFileSync(outputFile, '');

  const result = spawnSync('bun', ['run', SCRIPT_PATH, ...extraArgs], {
    cwd: repo,
    env: { ...process.env, GITHUB_OUTPUT: outputFile },
    encoding: 'utf-8',
  });

  const outputs = Object.fromEntries(
    readFileSync(outputFile, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const eq = line.indexOf('=');
        return [line.slice(0, eq), line.slice(eq + 1)];
      })
  );

  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    outputs,
  };
}

describe('version-and-commit', () => {
  test('does not report already_released when the target tag is missing', () => {
    // Regression test for
    // https://github.com/link-foundation/csharp-ai-driven-development-pipeline-template/issues/9
    // Starting at 2.3.0 with a minor changeset should produce 2.4.0,
    // and the script must not claim 2.4.0 was already released.
    const { repo, root } = setupRepo({
      startingVersion: '2.3.0',
      changesetBump: 'minor',
    });
    try {
      const probe = spawnSync(
        'git',
        ['rev-parse', '--verify', '--quiet', 'refs/tags/v2.4.0'],
        { cwd: repo, encoding: 'utf-8' }
      );
      expect(probe.status).not.toBe(0);

      const { exitCode, outputs, stdout, stderr } = runScript(repo);

      expect({ exitCode, stdout, stderr }).toEqual({
        exitCode: 0,
        stdout: expect.any(String),
        stderr: expect.any(String),
      });
      expect(outputs.already_released).not.toBe('true');
      expect(outputs.new_version).toBe('2.4.0');
      expect(outputs.version_committed).toBe('true');

      const csproj = readFileSync(
        path.join(repo, 'src', 'MyPackage', 'MyPackage.csproj'),
        'utf-8'
      );
      expect(csproj).toContain('<Version>2.4.0</Version>');

      const log = execFileSync('git', ['log', '--oneline'], {
        cwd: repo,
        encoding: 'utf-8',
      });
      expect(log).toContain('chore: release v2.4.0');

      const tagListing = execFileSync('git', ['tag', '-l', 'v2.4.0'], {
        cwd: repo,
        encoding: 'utf-8',
      }).trim();
      expect(tagListing).toBe('v2.4.0');
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('reports already_released when the target tag does exist', () => {
    const { repo, root } = setupRepo({
      startingVersion: '2.3.0',
      changesetBump: 'minor',
    });
    try {
      git(['tag', 'v2.4.0'], repo);

      const { exitCode, outputs } = runScript(repo);

      expect(exitCode).toBe(0);
      expect(outputs.already_released).toBe('true');
      expect(outputs.new_version).toBe('2.4.0');
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('uses cs_v release tags in a csharp subdirectory layout', () => {
    const { packageRoot, repo, root } = setupRepo({
      startingVersion: '2.3.0',
      changesetBump: 'minor',
      csharpRoot: 'csharp',
    });
    try {
      const { exitCode, outputs } = runScript(repo);

      expect(exitCode).toBe(0);
      expect(outputs.new_version).toBe('2.4.0');
      expect(outputs.release_tag).toBe('cs_v2.4.0');
      expect(outputs.version_committed).toBe('true');

      const csproj = readFileSync(
        path.join(packageRoot, 'src', 'MyPackage', 'MyPackage.csproj'),
        'utf-8'
      );
      expect(csproj).toContain('<Version>2.4.0</Version>');

      const log = execFileSync('git', ['log', '--oneline'], {
        cwd: repo,
        encoding: 'utf-8',
      });
      expect(log).toContain('chore: release cs_v2.4.0');

      const tagListing = execFileSync('git', ['tag', '-l', 'cs_v2.4.0'], {
        cwd: repo,
        encoding: 'utf-8',
      }).trim();
      expect(tagListing).toBe('cs_v2.4.0');
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

// A fake `git` that records every invocation verbatim and behaves enough like
// the real one (missing tag, dirty index) for the script to run to completion
// without a repository. $GIT_STUB_LOG collects one `git <args>` line per call.
function setupGitStub(root) {
  const bin = path.join(root, 'stub-bin');
  mkdirSync(bin, { recursive: true });
  const stub = path.join(bin, 'git');
  writeFileSync(
    stub,
    [
      '#!/bin/sh',
      'printf \'git %s\\n\' "$*" >> "$GIT_STUB_LOG"',
      'if [ "$1" = "rev-parse" ]; then',
      '  exit 1',
      'fi',
      'if [ "$1" = "diff" ] && [ "$2" = "--cached" ]; then',
      '  exit 1',
      'fi',
      'exit 0',
      '',
    ].join('\n')
  );
  chmodSync(stub, 0o755);
  return bin;
}

describe('version-and-commit argv injection (issue #61)', () => {
  test('a --description with shell substitution is stored, never executed', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'version-and-commit-'));
    try {
      const stubBin = setupGitStub(root);
      const stubLog = path.join(root, 'git-stub.log');
      const outputFile = path.join(root, 'gh-output.txt');
      writeFileSync(outputFile, '');

      mkdirSync(path.join(root, 'src', 'MyPackage'), { recursive: true });
      writeFileSync(
        path.join(root, 'src', 'MyPackage', 'MyPackage.csproj'),
        '<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup>\n    <Version>2.3.0</Version>\n  </PropertyGroup>\n</Project>\n'
      );

      // The exact shape the issue demonstrates: operator text from the
      // workflow_dispatch release form, carrying a command substitution.
      const payload =
        '$(printf INJECTED >> injected.txt) "quotes" && `backticks`';

      const result = spawnSync(
        'bun',
        [
          'run',
          SCRIPT_PATH,
          '--mode',
          'instant',
          '--bump-type',
          'patch',
          '--description',
          payload,
        ],
        {
          cwd: root,
          env: {
            ...process.env,
            PATH: `${stubBin}${path.delimiter}${process.env.PATH}`,
            GIT_STUB_LOG: stubLog,
            GITHUB_OUTPUT: outputFile,
          },
          encoding: 'utf-8',
        }
      );

      expect(result.status).toBe(0);

      // The payload must have reached git as text, not the shell as code.
      const log = readFileSync(stubLog, 'utf-8');
      expect(log).toContain(
        `git rev-parse --verify --quiet refs/tags/v2.3.1`
      );
      expect(log).toContain(
        `git commit -m chore: release v2.3.1\n\n${payload}`
      );
      expect(log).toContain(
        `git tag -a v2.3.1 -m Release v2.3.1\n\n${payload}`
      );

      expect(existsSync(path.join(root, 'injected.txt'))).toBe(false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
