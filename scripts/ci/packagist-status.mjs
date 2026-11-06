#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Packagist p2 documents may inherit fields from the preceding version.
// This is Composer MetadataMinifier's shallow expansion, including __unset.
export function packagistVersion(body, name, version) {
  const packages = body.packages?.[name];
  if (!Array.isArray(packages)) throw new Error("Packagist returned unexpected version metadata");
  let expanded = {};
  for (const item of packages) {
    expanded = body.minified === "composer/2.0" ? { ...expanded } : {};
    for (const [key, value] of Object.entries(item)) {
      if (value === "__unset") delete expanded[key];
      else expanded[key] = value;
    }
    if (expanded.version?.replace(/^v/, "") === version) return expanded;
  }
  return null;
}

export function checkPackagistSource(item, repository, sha) {
  const source = item.source;
  if (source?.type !== "git" ||
    ![`https://github.com/${repository}`, `https://github.com/${repository}.git`].includes(source.url) ||
    !/^[a-f0-9]{40}$/.test(source.reference ?? "") || (sha && source.reference !== sha))
    throw new Error("Packagist source does not match the canonical repository/gated SHA");
}

export async function packagistStatus(name, version, fetcher = fetch, { sha, repository } = {}) {
  const metadata = await fetcher(`https://repo.packagist.org/p2/${name}.json`);
  if (metadata.status === 404) {
    // A registered dev-only package need not have a stable p2 document yet.
    const registration = await fetcher(
      `https://packagist.org/packages/${name}.json`,
    );
    if (registration.status === 404)
      return { packageKnown: false, shouldPublish: true };
    if (!registration.ok)
      throw new Error(`Packagist registration HTTP ${registration.status}`);
    if ((await registration.json()).package?.name !== name)
      throw new Error("Packagist returned unexpected registration metadata");
    return { packageKnown: true, shouldPublish: true };
  }
  if (!metadata.ok)
    throw new Error(`Packagist metadata HTTP ${metadata.status}`);
  const item = packagistVersion(await metadata.json(), name, version);
  if (item && repository) checkPackagistSource(item, repository, sha);
  return {
    packageKnown: true,
    shouldPublish: !item,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const check = () => packagistStatus(process.env.PACKAGE_NAME, process.env.PACKAGE_VERSION,
    (url) => fetch(url, { signal: AbortSignal.timeout(30000) }),
    { repository: process.env.GITHUB_REPOSITORY, sha: process.env.RELEASE_SHA });
  let result = await check();
  if (process.argv.includes("--verify")) {
    for (let attempt = 1; result.shouldPublish && attempt < 20; attempt++) {
      console.log(`Packagist exact version pending (${attempt}/20)`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
      result = await check();
    }
    if (result.shouldPublish) throw new Error("Exact Packagist version did not appear after 20 attempts");
  }
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `package_known=${result.packageKnown}\nshould_publish=${result.shouldPublish}\n`,
  );
  console.log(
    `Packagist registration: ${result.packageKnown}; publication needed: ${result.shouldPublish}`,
  );
}
