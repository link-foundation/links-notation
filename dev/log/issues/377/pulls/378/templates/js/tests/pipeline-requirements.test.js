import { describe, it, expect } from 'test-anywhere';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { itUnless, noPosixShell, sandboxed } from './helpers/skip.js';

const read = (path) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const workflows = () =>
  readdirSync('.github/workflows').map((file) =>
    read(`.github/workflows/${file}`)
  );

describe('complete pipeline requirements', () => {
  it('queues every writer without cancellation', () => {
    let count = 0;
    for (const source of workflows()) {
      for (const block of source.split(/\n {4}concurrency:\n/).slice(1)) {
        const settings = block.split(/\n(?! {6})/)[0];
        if (settings.includes('group: main-writer-')) {
          count++;
          expect(settings).toContain('cancel-in-progress: false');
          expect(settings).toContain('queue: max');
        }
      }
    }
    expect(count).toBe(7);
  });
  it('uses only the narrow documented actionlint schema exception', () => {
    expect(read('.github/workflows/workflows.yml')).toContain(
      'args: -color -ignore "unexpected key .queue. for .concurrency. section"'
    );
  });
  it('provides defaults for required dispatch inputs', () => {
    const dispatch = read('.github/workflows/release.yml')
      .split('  workflow_dispatch:')[1]
      .split('\npermissions:')[0];
    for (const input of dispatch.split(/\n {6}\w+:\n/).slice(1)) {
      if (input.includes('required: true')) {
        expect(input).toMatch(/default:/);
      }
    }
  });
  it('checks the Dependabot author and enforces warnings on main', () => {
    const source = read('.github/workflows/release.yml');
    expect(source).toContain(
      'PR_AUTHOR: ${{ github.event.pull_request.user.login }}'
    );
    expect(source).toContain(
      "LINT_ALL_WARNINGS: ${{ github.event_name != 'pull_request' && '1' || '0' }}"
    );
    expect(source).not.toMatch(/prettier[^\n]+\|\| true/);
  });
  it('persists the link cache and uploads the report on failure', () => {
    const source = read('.github/workflows/links.yml');
    expect(source).toContain('uses: actions/cache@v6.1.0');
    expect(source).toContain('path: .lycheecache');
    expect(source).toContain('restore-keys: cache-lychee-');
    expect(source).toContain('uses: ./.github/actions/artifact-transport');
    expect(source).toContain('path: lychee/');
  });
  it('gives skipped matrix jobs static names', () => {
    for (const source of workflows()) {
      for (const job of source.split(/\n {2}[\w-]+:\n/).slice(1)) {
        if (/^ {4}(if|needs):/m.test(job)) {
          expect(job.match(/^ {4}name:.*$/m)?.[0] ?? '').not.toContain(
            'matrix.'
          );
        }
      }
    }
  });
  it('replaces the deprecated Pages dependency without hiding warnings', () => {
    const source = read('.github/workflows/example-app.yml');
    const step = source
      .split('uses: actions/deploy-pages@v5')[1]
      .split('\n  desktop-package:')[0];
    expect(step).toContain('artifact-transport/punycode.mjs');
    expect(step).toContain('--throw-deprecation');
    expect(source).not.toMatch(
      /--disable-warning|--no-warnings|NODE_NO_WARNINGS/
    );
  });
  itUnless(sandboxed)(
    'preserves other Node warnings with the deploy setting',
    () => {
      const result = spawnSync(
        'node',
        [
          '--import',
          './.github/actions/artifact-transport/punycode.mjs',
          '--throw-deprecation',
          '-e',
          "require('punycode'); process.emitWarning('visible', {code:'TEST_WARNING'});",
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, NODE_OPTIONS: '' },
        }
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
      expect(result.stderr).not.toContain('DEP0040');
      expect(result.stderr).toContain('TEST_WARNING');
    }
  );
  it('covers standalone scripts and hooks with pinned ShellCheck', () => {
    const source = read('.github/workflows/workflows.yml');
    expect(source).toContain("'**.sh'");
    expect(source).toContain("'.husky/**'");
    expect(source).toContain('      - shellcheck');
    expect(source).toContain('shellcheck-py==0.11.0.1');
    expect(source).toContain("git ls-files -z '*.sh' '.husky/*'");
    const { 'lint-staged': staged } = JSON.parse(read('package.json'));
    for (const pattern of ['*.sh', '.husky/*']) {
      expect(staged[pattern]).toEqual([
        'pipx run --spec shellcheck-py==0.11.0.1 shellcheck',
      ]);
    }
  });
  itUnless(sandboxed, noPosixShell)(
    'declares a shell in every tracked script and hook',
    () => {
      const paths = execFileSync(
        'git',
        ['ls-files', '-z', '*.sh', '.husky/*'],
        { encoding: 'utf8' }
      )
        .split('\0')
        .filter(Boolean);
      for (const path of paths) {
        expect(`${path}: ${read(path).split('\n')[0]}`).toMatch(
          /#!.*\b(?:ba)?sh/
        );
      }
    }
  );
  it('declares every ESLint configuration import', () => {
    const manifest = JSON.parse(read('package.json'));
    for (const [, specifier] of read('eslint.config.js').matchAll(
      /from '([^.][^']*)'/g
    )) {
      const name = specifier
        .split('/')
        .slice(0, specifier.startsWith('@') ? 2 : 1)
        .join('/');
      expect(typeof manifest.devDependencies[name]).toBe('string');
    }
    expect(manifest.devDependencies.eslint).toMatch(/^\^10\./);
  });
});
