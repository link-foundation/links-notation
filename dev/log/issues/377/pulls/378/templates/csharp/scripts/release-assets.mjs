import { spawnSync } from 'node:child_process';
/** @type {import('./process-types.js').Spawn} */
const runProcess = spawnSync;
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Preserve public bytes; publish drafts only after verifying all required assets. */
export function reconcileReleaseAssets({
  assetPaths,
  repository,
  tag,
  spawn = runProcess,
  log = console.log,
}) {
  const run = (args, options = {}) => {
    const result = spawn('gh', args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    });
    if (result.error || result.status !== 0)
      throw Error(
        `Release asset operation failed: ${result.stderr || result.error?.message || result.status}`,
      );
    return result.stdout;
  };
  const endpoint = `repos/${repository}/releases`;
  const view = () => {
    const release = JSON.parse(
      String(run(['api', `${endpoint}/tags/${encodeURIComponent(tag)}`])),
    );
    if (
      !Number.isSafeInteger(release.id) ||
      typeof release.draft !== 'boolean' ||
      !Array.isArray(release.assets)
    )
      throw Error('Unverified release/asset state');
    const names = new Set();
    for (const asset of release.assets) {
      if (
        !asset.name ||
        names.has(asset.name) ||
        !Number.isSafeInteger(asset.id) ||
        !Number.isSafeInteger(asset.size) ||
        asset.size < 0
      )
        throw Error('Ambiguous release asset metadata');
      names.add(asset.name);
    }
    return release;
  };
  const release = view();
  const required = new Map();
  for (const file of assetPaths) {
    const name = basename(file);
    if (required.has(name) || !statSync(file).size)
      throw Error('Duplicate or empty local release asset');
    const existing = release.assets.find((a) => a.name === name);
    const preserve = !release.draft && existing?.size > 0;
    required.set(name, { preserve, digest: preserve ? '' : hash(readFileSync(file)) });
    if (preserve) {
      log(`Preserving public release asset ${name} (${existing.size} bytes).`);
      continue;
    }
    if (existing) run(['api', `${endpoint}/assets/${existing.id}`, '-X', 'DELETE']);
    run(['release', 'upload', tag, file, '--repo', repository]);
  }
  const final = view();
  if (final.id !== release.id || final.draft !== release.draft)
    throw Error('Release changed concurrently; refusing promotion');
  for (const [name, expected] of required) {
    const asset = final.assets.find((a) => a.name === name);
    if (!asset?.size || asset.state !== 'uploaded')
      throw Error(`Missing/incomplete required release asset ${name}`);
    const bytes = run(
      [
        'api',
        `${endpoint}/assets/${asset.id}`,
        '-H',
        'Accept: application/octet-stream',
      ],
      { encoding: null },
    );
    if (!Buffer.isBuffer(bytes))
      throw Error('Release asset download did not return raw bytes');
    const digest = hash(bytes);
    if (
      bytes.length !== asset.size ||
      (asset.digest && asset.digest !== `sha256:${digest}`) ||
      (!expected.preserve && expected.digest !== digest)
    )
      throw Error(`Release asset integrity mismatch: ${name}`);
    log(`Verified release asset ${name}: sha256:${digest}`);
  }
  if (final.draft)
    run(['api', `${endpoint}/${final.id}`, '-X', 'PATCH', '--input', '-'], {
      input: JSON.stringify({ draft: false }),
    });
  const published = view();
  if (published.id !== final.id || published.draft !== false)
    throw Error('Final public release state could not be verified');
  for (const [name] of required) {
    const before = final.assets.find((a) => a.name === name);
    const after = published.assets.find((a) => a.name === name);
    if (
      !after ||
      after.id !== before.id ||
      after.size !== before.size ||
      after.state !== 'uploaded'
    )
      throw Error(`Required public asset changed: ${name}`);
  }
}
