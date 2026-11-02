import { test, expect } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyAnonymousPackage } from './anonymous-package.mjs';

for (const status of [200, 404, 400])
  test(`anonymous exact download HTTP ${status} is verified or fatal`, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'anonymous-package-'));
    const calls = [];
    let validations = 0;
    try {
      const operation = verifyAnonymousPackage({
        config: {
          source: 'https://api.nuget.org/v3/index.json',
          packageId: 'Real.Package',
          releaseVersion: '1.2.3',
        },
        directory,
        fetchImpl: async (url, init) => {
          calls.push({ url, init });
          return String(url).endsWith('index.json')
            ? Response.json({
                resources: [
                  {
                    '@type': 'PackageBaseAddress/3.0.0',
                    '@id': 'https://api.nuget.org/v3-flatcontainer/',
                  },
                ],
              })
            : new Response('package bytes', { status });
        },
        validate: (options) => {
          validations++;
          expect(options.packageId).toBe('Real.Package');
          expect(options.version).toBe('1.2.3');
          expect(readFileSync(options.packagePath, 'utf8')).toBe('package bytes');
          return options;
        },
        log: () => {},
      });
      if (status === 200) {
        expect(await operation).toHaveLength(64);
        expect(validations).toBe(1);
      } else {
        await expect(operation).rejects.toThrow(`HTTP ${status}`);
        expect(validations).toBe(0);
      }
      expect(calls[1].url).toBe(
        'https://api.nuget.org/v3-flatcontainer/real.package/1.2.3/real.package.1.2.3.nupkg',
      );
      for (const { init } of calls) {
        expect(init.credentials).toBe('omit');
        expect(init.redirect).toBe('error');
        expect(init.headers).toBeUndefined();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
