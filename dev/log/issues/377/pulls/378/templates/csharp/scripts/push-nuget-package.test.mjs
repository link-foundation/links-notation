import { describe, expect, test } from 'bun:test';
import { pushPackages } from './push-nuget-package.mjs';

describe('NuGet push', () => {
  test('publishes every package with safe arguments and duplicate handling', () => {
    const calls = [];
    pushPackages({
      apiKey: 'temporary-key',
      packagePaths: ['artifacts/a.nupkg', 'artifacts/b.nupkg'],
      spawn: (...args) => {
        calls.push(args);
        return { status: 0 };
      },
      log: () => {},
    });
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toBe('dotnet');
    expect(calls[0][1]).toEqual([
      'nuget',
      'push',
      'artifacts/a.nupkg',
      '--api-key',
      'temporary-key',
      '--source',
      'https://api.nuget.org/v3/index.json',
      '--skip-duplicate',
    ]);
    expect(calls[0][2].shell).toBeUndefined();
  });

  test('missing credentials fail instead of advertising an unpublished release', () => {
    expect(() => pushPackages({ apiKey: '', packagePaths: ['a.nupkg'] })).toThrow(
      /NUGET_USER/,
    );
    expect(() => pushPackages({ apiKey: 'key', packagePaths: [] })).toThrow(
      /No .nupkg/,
    );
  });

  test('an expired-key 403 preserves failure and gives both remedies without logging the key', () => {
    const logs = [];
    expect(() =>
      pushPackages({
        apiKey: 'private-key',
        packagePaths: ['a.nupkg'],
        spawn: () => ({
          status: 1,
          stderr: 'HTTP 403 API key private-key is invalid or has expired',
        }),
        log: (output) => logs.push(output),
      }),
    ).toThrow(/Renew NUGET_API_KEY.*NUGET_USER/);
    expect(logs.join('')).not.toContain('private-key');
    expect(logs.join('')).toContain('[REDACTED]');
  });

  test('an unrelated push failure also stops the release', () => {
    expect(() =>
      pushPackages({
        apiKey: 'key',
        packagePaths: ['a.nupkg'],
        spawn: () => ({ status: 1, stderr: 'Connection reset' }),
        log: () => {},
      }),
    ).toThrow(/NuGet push failed/);
  });
});
