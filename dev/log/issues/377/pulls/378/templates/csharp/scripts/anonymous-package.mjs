import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validatePackage } from './validate-nuget-package.mjs';
import { fetchWithRetries } from './fetch-with-retries.mjs';

/** Download exact bytes without credentials, then validate the actual package. */
export async function verifyAnonymousPackage({
  config,
  directory,
  fetchImpl = /** @type {import('./process-types.js').Fetch} */ (fetch),
  validate = validatePackage,
  log = console.log,
}) {
  let bytes;
  if (/^https?:/i.test(config.source)) {
    const source = new URL(config.source);
    if (source.protocol !== 'https:' || source.username || source.password)
      throw Error('Anonymous registry source must use HTTPS without credentials');
    const get = async (url) => {
      const response = await fetchWithRetries(
        url,
        { credentials: 'omit', redirect: 'error' },
        fetchImpl,
      );
      if (!response.ok)
        throw Error(`Anonymous package download failed: HTTP ${response.status}`);
      return response;
    };
    const index = await (await get(source.href)).json();
    const address = index.resources?.find(
      (r) => r['@type'] === 'PackageBaseAddress/3.0.0',
    )?.['@id'];
    const base = new URL(address);
    if (base.protocol !== 'https:' || base.username || base.password)
      throw Error('Invalid anonymous flat-container endpoint');
    const id = encodeURIComponent(config.packageId.toLowerCase());
    const version = encodeURIComponent(config.releaseVersion.toLowerCase());
    const response = await get(
      `${base.href.replace(/\/$/, '')}/${id}/${version}/${id}.${version}.nupkg`,
    );
    bytes = Buffer.from(await response.arrayBuffer());
  } else {
    bytes = readFileSync(
      join(config.source, `${config.packageId}.${config.releaseVersion}.nupkg`),
    );
  }
  const packagePath = join(directory, 'downloaded.nupkg');
  writeFileSync(packagePath, bytes);
  validate({
    packagePath,
    packageId: config.packageId,
    version: config.releaseVersion,
  });
  const digest = createHash('sha256').update(bytes).digest('hex');
  log(
    `Validated exact anonymous package ${config.packageId}@${config.releaseVersion}: sha256:${digest}`,
  );
  return digest;
}
