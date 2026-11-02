import { test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const missing of ['actionlint', 'shellcheck', 'pyflakes'])
  test(`native lint rejects missing ${missing}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'native-lint-'));
    try {
      for (const tool of ['actionlint', 'shellcheck', 'pyflakes'].filter(
        (t) => t !== missing,
      ))
        writeFileSync(join(directory, tool), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      const result = spawnSync('/bin/sh', [resolve('scripts/lint-workflows.sh')], {
        env: { PATH: directory },
        encoding: 'utf8',
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(`Required lint integration missing: ${missing}`);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
