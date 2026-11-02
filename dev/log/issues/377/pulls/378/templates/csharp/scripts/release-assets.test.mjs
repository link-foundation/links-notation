import { test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { reconcileReleaseAssets } from './release-assets.mjs';
export function releaseServer({
  draft = true,
  existing = [],
  corrupt = false,
  uploadFailure = false,
} = {}) {
  const calls = [];
  const content = new Map(
    existing.map((asset) => [asset.id, Buffer.from(asset.bytes)]),
  );
  const release = {
    id: 1,
    draft,
    assets: existing.map(({ id, name, bytes }) => ({
      id,
      name,
      size: Buffer.byteLength(bytes),
      state: 'uploaded',
      digest: '',
    })),
  };
  const spawn = (_file, args, options) => {
    calls.push({ args, options });
    const endpoint = args[1];
    if (args[0] === 'release') {
      if (uploadFailure) return { status: 1, stderr: 'HTTP 403' };
      const name = args[3].split('/').pop();
      const bytes = Buffer.from('local bytes');
      const id = 10;
      content.set(id, bytes);
      release.assets.push({
        name,
        id,
        size: bytes.length,
        state: 'uploaded',
        digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      });
    } else if (endpoint.includes('/releases/tags/'))
      return { status: 0, stdout: JSON.stringify(release) };
    else if (endpoint.includes('/releases/assets/')) {
      const id = Number(endpoint.split('/').pop());
      if (args.includes('DELETE')) {
        release.assets = release.assets.filter((a) => a.id !== id);
        content.delete(id);
      } else
        return {
          status: 0,
          stdout: corrupt ? Buffer.from('tampered') : content.get(id),
        };
    } else if (args.includes('PATCH')) release.draft = false;
    return { status: 0, stdout: '' };
  };
  return { spawn, calls, release, content };
}
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'asset-regression-'));
  const file = join(root, 'Package.1.2.3.nupkg');
  writeFileSync(file, 'local bytes');
  try {
    run(file);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test('public nonempty asset bytes survive rerun without upload/delete/promotion', () =>
  fixture((file) => {
    const server = releaseServer({
      draft: false,
      existing: [
        { id: 2, name: 'Package.1.2.3.nupkg', bytes: 'original immutable bytes' },
      ],
    });
    reconcileReleaseAssets({
      assetPaths: [file],
      tag: 'v1.2.3',
      repository: 'owner/repo',
      ...server,
      log: () => {},
    });
    expect(server.content.get(2).toString()).toBe('original immutable bytes');
    expect(
      server.calls.some(
        (c) =>
          c.args.includes('upload') ||
          c.args.includes('DELETE') ||
          c.args.includes('PATCH'),
      ),
    ).toBe(false);
  }));
for (const draft of [true, false])
  test(`repairs empty/missing ${draft ? 'draft' : 'public'} assets then verifies bytes`, () =>
    fixture((file) => {
      const server = releaseServer({
        draft,
        existing: [{ id: 2, name: 'Package.1.2.3.nupkg', bytes: '' }],
      });
      reconcileReleaseAssets({
        assetPaths: [file],
        tag: 'v1.2.3',
        repository: 'owner/repo',
        ...server,
        log: () => {},
      });
      expect(server.calls.some((c) => c.args.includes('DELETE'))).toBe(true);
      expect(server.calls.some((c) => c.args.includes('--clobber'))).toBe(false);
      expect(server.release.draft).toBe(false);
      expect(server.content.get(10).toString()).toBe('local bytes');
    }));
for (const option of ['corrupt', 'uploadFailure'])
  test(`${option} leaves a draft unpublished`, () =>
    fixture((file) => {
      const server = releaseServer({ [option]: true });
      expect(() =>
        reconcileReleaseAssets({
          assetPaths: [file],
          tag: 'v1.2.3',
          repository: 'owner/repo',
          ...server,
          log: () => {},
        }),
      ).toThrow();
      expect(server.release.draft).toBe(true);
      expect(server.calls.some((c) => c.args.includes('PATCH'))).toBe(false);
    }));
