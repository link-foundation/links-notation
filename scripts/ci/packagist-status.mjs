#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export async function packagistStatus(name, version, fetcher = fetch) {
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
  const packages = (await metadata.json()).packages?.[name];
  if (!Array.isArray(packages))
    throw new Error("Packagist returned unexpected version metadata");
  return {
    packageKnown: true,
    shouldPublish: !packages.some(
      (item) => item.version?.replace(/^v/, "") === version,
    ),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await packagistStatus(
    process.env.PACKAGE_NAME,
    process.env.PACKAGE_VERSION,
  );
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `package_known=${result.packageKnown}\nshould_publish=${result.shouldPublish}\n`,
  );
  console.log(
    `Packagist registration: ${result.packageKnown}; publication needed: ${result.shouldPublish}`,
  );
}
