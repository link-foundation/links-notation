import { test, expect } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
for (const script of ['detect-code-changes', 'validate-changeset'])
  test(`${script} fails closed on unverified PR refs without executing input`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'git-input-'));
    const marker = join(directory, 'injected');
    try {
      const result = spawnSync('bun', [resolve(`scripts/${script}.mjs`)], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          PR_AUTHOR: 'ordinary-author',
          GITHUB_EVENT_NAME: 'pull_request',
          GITHUB_BASE_SHA: `$(touch ${marker})`,
          GITHUB_HEAD_SHA: 'f'.repeat(40),
        },
      });
      expect(result.status).not.toBe(0);
      expect(existsSync(marker)).toBe(false);
      expect(result.stdout).not.toContain('any-code-changed=false');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
