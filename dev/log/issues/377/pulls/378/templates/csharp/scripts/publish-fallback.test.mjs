import { test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { publishWithFallback } from './push-nuget-package.mjs';
async function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'auth-retry-'));
  const file = join(dir, 'Package.1.0.0.nupkg');
  writeFileSync(file, 'validated artifact');
  try {
    await run({
      file,
      packagePaths: [file],
      packageId: 'Package',
      version: '1.0.0',
      oidcOutcome: 'success',
      oidcKey: 'oidc-private',
      apiKey: 'fallback-private',
      log: () => {},
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
for (const apiKey of ['', 'expired-unused-key'])
  test('working OIDC never tries a supplied fallback', () =>
    fixture(async (options) => {
      const keys = [];
      const result = await publishWithFallback({
        ...options,
        apiKey,
        spawn: (_file, args) => {
          keys.push(args[args.indexOf('--api-key') + 1]);
          return { status: 0 };
        },
        fetchImpl: () => {
          throw Error('must not probe');
        },
      });
      expect(keys).toEqual(['oidc-private']);
      expect(result.method).toBe('trusted-publishing');
    }));
for (const status of [401, 403])
  test(`actual HTTP ${status} retries the same artifact only once`, () =>
    fixture(async (options) => {
      const calls = [];
      const logs = [];
      const result = await publishWithFallback({
        ...options,
        log: (text) => logs.push(text),
        fetchImpl: async (url) => {
          expect(url).toEndWith('/package/1.0.0/package.1.0.0.nupkg');
          return new Response('', { status: 404 });
        },
        spawn: (_file, args) => {
          calls.push(args);
          return calls.length === 1
            ? {
                status: 1,
                stderr: `Response status code does not indicate success: ${status} (Forbidden). oidc-private fallback-private`,
              }
            : { status: 0 };
        },
      });
      expect(calls).toHaveLength(2);
      expect(calls[0][2]).toBe(calls[1][2]);
      expect(result.method).toBe('token-fallback');
      expect(logs.join('')).not.toContain('oidc-private');
      expect(logs.join('')).not.toContain('fallback-private');
    }));
test('already accepted exact version is preserved without another push', () =>
  fixture(async (options) => {
    let calls = 0;
    const result = await publishWithFallback({
      ...options,
      fetchImpl: async () => new Response('existing', { status: 200 }),
      spawn: () => {
        calls++;
        return { status: 1, stderr: 'HTTP 403' };
      },
    });
    expect(calls).toBe(1);
    expect(result.recovered).toBe(true);
  }));
for (const message of [
  'HTTP 400 package metadata invalid',
  'Connection reset',
  'exit code 401 unrelated failure',
])
  test(`unrelated failure remains fatal: ${message}`, () =>
    fixture(async (options) => {
      let calls = 0;
      await expect(
        publishWithFallback({
          ...options,
          spawn: () => {
            calls++;
            return { status: 1, stderr: message };
          },
          fetchImpl: () => {
            throw Error('must not probe');
          },
        }),
      ).rejects.toThrow();
      expect(calls).toBe(1);
    }));
test('both authentication paths failing is redacted, bounded and fatal', () =>
  fixture(async (options) => {
    let calls = 0;
    await expect(
      publishWithFallback({
        ...options,
        spawn: () => {
          calls++;
          return { status: 1, stderr: 'HTTP 403' };
        },
        fetchImpl: async () => new Response('', { status: 404 }),
      }),
    ).rejects.toThrow(/Both trusted-publishing and token-fallback failed/);
    expect(calls).toBe(2);
  }));
test('unverified anonymous state refuses credential retry', () =>
  fixture(async (options) => {
    let calls = 0;
    await expect(
      publishWithFallback({
        ...options,
        spawn: () => {
          calls++;
          return { status: 1, stderr: 'HTTP 403' };
        },
        fetchImpl: async () => new Response('', { status: 400 }),
      }),
    ).rejects.toThrow(/state/);
    expect(calls).toBe(1);
  }));
test('modified artifact cannot be retried with fallback credentials', () =>
  fixture(async (options) => {
    let calls = 0;
    await expect(
      publishWithFallback({
        ...options,
        spawn: () => {
          calls++;
          writeFileSync(options.file, 'changed');
          return { status: 1, stderr: 'HTTP 403' };
        },
        fetchImpl: async () => new Response('', { status: 404 }),
      }),
    ).rejects.toThrow(/artifact changed/);
    expect(calls).toBe(1);
  }));
