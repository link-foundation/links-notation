#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const root = new URL("../../", import.meta.url);

export function distributionDescriptor(native) {
  const descriptor = structuredClone(native);
  for (const key of [
    "version",
    "require-dev",
    "autoload-dev",
    "scripts",
    "config",
  ])
    delete descriptor[key];
  function prefix(value) {
    if (typeof value === "string") return `php/${value}`;
    if (Array.isArray(value)) return value.map(prefix);
    return Object.fromEntries(
      Object.entries(value).map(([key, path]) => [key, prefix(path)]),
    );
  }
  descriptor.autoload = prefix(descriptor.autoload);
  return descriptor;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const native = JSON.parse(
    readFileSync(new URL("php/composer.json", root), "utf8"),
  );
  const descriptor = distributionDescriptor(native);
  const path = new URL("composer.json", root);
  if (process.argv.includes("--write"))
    writeFileSync(path, `${JSON.stringify(descriptor, null, 4)}\n`);
  else
    assert.deepEqual(
      JSON.parse(readFileSync(path, "utf8")),
      descriptor,
      "Root Composer descriptor drifted: run node scripts/ci/php-distribution.mjs --write",
    );
  console.log("Root PHP distribution metadata matches the native package.");
}
