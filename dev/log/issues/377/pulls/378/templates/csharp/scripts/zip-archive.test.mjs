import { test, expect } from 'bun:test';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { makeZip } from '../experiments/issue-82/zip-fixture.mjs';
import { extractVerifiedZip, readZipEntries } from './zip-archive.mjs';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
function extract(bytes, sha256 = digest(bytes)) {
  const root = mkdtempSync(join(tmpdir(), 'zip-regression-'));
  const destination = join(root, 'new');
  try {
    extractVerifiedZip({ bytes, sha256, destination });
    return readFileSync(join(destination, 'dir/probe.txt'), 'utf8');
  } catch (error) {
    expect(existsSync(destination)).toBe(false);
    throw error;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test('stored and deflated bytes survive SHA-verified extraction', () => {
  for (const deflate of [false, true])
    expect(
      extract(makeZip([{ name: 'dir/probe.txt', bytes: 'exact bytes', deflate }])),
    ).toBe('exact bytes');
});
for (const name of [
  '../escape',
  '/absolute',
  'C:/drive',
  'C:relative',
  'dir\\escape',
  'dir/../escape',
  'dir//file',
  './file',
  'dir/./file',
  'dir/file.',
  'dir/file ',
  'bad\0name',
])
  test(`unsafe path fails before any writes: ${JSON.stringify(name)}`, () => {
    expect(() =>
      extract(makeZip([{ name: 'good-first', bytes: 'safe' }, { name }])),
    ).toThrow();
  });
for (const entries of [
  [{ name: 'duplicate' }, { name: 'duplicate' }],
  [{ name: 'File' }, { name: 'file' }],
  [{ name: 'dir' }, { name: 'dir/file' }],
  [{ name: 'link', mode: 0o120777 }],
  [{ name: 'safe', localName: '../unsafe' }],
  [{ name: 'large', size: 64 * 1024 * 1024 + 1 }],
])
  test('ambiguous/oversized/symlink ZIP fails before any writes', () =>
    expect(() => extract(makeZip(entries))).toThrow());
test('bad digest, checksum, truncated directory and trailing archive bytes fail closed', () => {
  const bytes = makeZip([{ name: 'dir/probe.txt', bytes: 'exact bytes' }]);
  expect(() => extract(bytes, '0'.repeat(64))).toThrow(/SHA-256/);
  const damaged = Buffer.from(bytes);
  damaged[30 + 'dir/probe.txt'.length] ^= 1;
  for (const bad of [damaged, bytes.subarray(0, -1), Buffer.concat([bytes, bytes])])
    expect(() => readZipEntries(bad)).toThrow();
});
for (const field of [14, 18, 22])
  test(`conflicting local ZIP metadata at ${field} is rejected before writes`, () => {
    const bytes = makeZip([{ name: 'dir/probe.txt', bytes: 'exact bytes' }]);
    bytes.writeUInt32LE((bytes.readUInt32LE(field) ^ 1) >>> 0, field);
    expect(() => extract(bytes)).toThrow();
  });
