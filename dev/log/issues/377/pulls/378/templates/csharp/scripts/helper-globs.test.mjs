import { test, expect } from 'bun:test';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
const eslintRequire = createRequire(require.resolve('eslint'));
const { Minimatch } = eslintRequire('minimatch');

test('ESLint glob preprocessing respects the expansion limit', () => {
  // Four sections produce only sixteen alternatives on the vulnerable version.
  // This reproduces GHSA-g3hv-75wg-m249 without stressing CPU or memory.
  const matcher = new Minimatch(Array(4).fill('**/../a/b').join('/'), {
    optimizationLevel: 2,
    braceExpandMax: 8,
  });
  expect(matcher.set.length).toBeLessThanOrEqual(8);
});

test('ESLint still finds nested helpers and honors ignored glob paths', async () => {
  const root = mkdtempSync(join(tmpdir(), 'helper-globs-'));
  try {
    for (const file of [
      'scripts/nested/bad.mjs',
      'experiments/bad.js',
      'ignored/bad.js',
    ]) {
      mkdirSync(join(root, file, '..'), { recursive: true });
      writeFileSync(join(root, file), 'missingGlobal();\n');
    }
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: [
        { ignores: ['ignored/**'] },
        { files: ['**/*.{mjs,js}'], rules: { 'no-undef': 'error' } },
      ],
    });
    const results = await eslint.lintFiles(['**/*.{mjs,js}']);
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.errorCount === 1)).toBe(true);
    expect(results.map((result) => result.messages[0].ruleId)).toEqual([
      'no-undef',
      'no-undef',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
