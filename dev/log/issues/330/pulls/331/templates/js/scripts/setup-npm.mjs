#!/usr/bin/env node

import { resolve } from 'node:path';
import semver from 'semver';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * Update npm for OIDC trusted publishing
 * npm trusted publishing requires npm >= 11.5.1; use the reviewed npm 12 release
 * Validate its exact supported Node ranges before updating
 *
 * Uses link-foundation libraries:
 * - Lockfile-installed command-stream and lino-arguments helpers
 * - command-stream: Modern shell command execution with streaming support
 */

export const NPM_MIN_VERSION = '12.2.2';
export const NODE_MIN_VERSION = '22.22.2';
export const NODE_SUPPORTED_RANGE = '^22.22.2 || ^24.15.0 || >=26.0.0';
export const NPM_TARGET_MAJOR = 12;
export const NPM_REGISTRY_METADATA_URL = 'https://registry.npmjs.org/npm';

export function parseVersion(version) {
  const parsed = semver.parse(String(version).trim());
  if (!parsed) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    prerelease: parsed.prerelease.join('.'),
  };
}

export function compareVersions(leftVersion, rightVersion) {
  return semver.compare(
    String(leftVersion).trim(),
    String(rightVersion).trim()
  );
}

export function isVersionAtLeast(version, minimumVersion) {
  return compareVersions(version, minimumVersion) >= 0;
}

export function isSupportedNpmVersion(version) {
  return isVersionAtLeast(version, NPM_MIN_VERSION);
}

export function isSupportedNodeVersion(version) {
  return semver.satisfies(version, NODE_SUPPORTED_RANGE);
}

export function selectLatestSupportedNpmRelease(metadata) {
  const release = metadata?.versions?.[NPM_MIN_VERSION];
  if (!release?.dist?.tarball) {
    throw new Error(`No npm ${NPM_MIN_VERSION} release found`);
  }
  return { version: NPM_MIN_VERSION, tarballUrl: release.dist.tarball };
}

async function fetchNpmRegistryMetadata(fetchFn) {
  const response = await fetchFn(NPM_REGISTRY_METADATA_URL, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch npm registry metadata: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function resolveLatestSupportedNpmRelease(fetchFn) {
  const metadata = await fetchNpmRegistryMetadata(fetchFn);
  return selectLatestSupportedNpmRelease(metadata);
}

// Update npm for OIDC trusted publishing (requires >= 11.5.1)
// Pin to the reviewed release for reproducible publishing setup
//
// Known issue: Node.js 22.22.2 on GitHub Actions (ubuntu-24.04 image >= 20260329.72.1)
// ships with a broken npm 10.9.7 that is missing the 'promise-retry' module,
// causing `npm install -g` to fail with MODULE_NOT_FOUND.
// See: https://github.com/actions/runner-images/issues/13883
// See: https://github.com/nodejs/node/issues/62430
// See: https://github.com/npm/cli/issues/9151
//
// Workaround strategies in order of preference:
// 1. npm install -g npm@12.2.2 (standard approach)
// 2. curl tarball download (bypasses broken npm entirely)
// 3. npx npm@12.2.2 install (uses npx cache, bypasses arborist)
// 4. corepack as last resort

async function tryStandardInstall($) {
  await $`npm install -g npm@12.2.2`;
}

async function tryCurlTarball($, fetchFn) {
  const npmRelease = await resolveLatestSupportedNpmRelease(fetchFn);
  console.log(`Downloading npm ${npmRelease.version} tarball...`);

  const nodeDir = (
    await $`dirname $(dirname $(which node))`.run({ capture: true })
  ).stdout.trim();
  const globalNpmDir = `${nodeDir}/lib/node_modules/npm`;
  const tempNpmDir = '/tmp/setup-npm-package';
  const tarball = '/tmp/setup-npm-package.tgz';

  // Download to a file, not straight into the extractor: a mid-transfer
  // truncation (curl exit 18) must not leave a half-populated directory, and
  // a retried piped transfer can hand the extractor the head of the archive
  // twice. `--retry` alone does not cover exit 18; `--retry-all-errors` is
  // what retries it.
  await $`rm -f "${tarball}"`;
  await $`curl -fsSL --retry 3 --retry-delay 2 --retry-all-errors "${npmRelease.tarballUrl}" -o "${tarball}"`;
  await $`rm -rf "${tempNpmDir}" && mkdir -p "${tempNpmDir}"`;
  await $`tar xz --strip-components=1 -C "${tempNpmDir}" -f "${tarball}"`;
  await $`rm -rf "${globalNpmDir}" && mv "${tempNpmDir}" "${globalNpmDir}"`;
}

async function tryNpxInstall($) {
  await $`npx --yes npm@12.2.2 install -g npm@12.2.2`;
}

async function tryCorepack($) {
  await $`corepack enable`;
  await $`corepack prepare npm@12.2.2 --activate`;
}

async function tryStrategy(name, fn) {
  try {
    await fn();
    return true;
  } catch (error) {
    console.warn(`Warning: ${name} failed: ${error.message}`);
    return false;
  }
}

function failUnsupportedNodeVersion(nodeVersion) {
  console.error(
    `ERROR: Node.js ${NODE_SUPPORTED_RANGE} is required for npm ${NPM_MIN_VERSION}.`
  );
  console.error(`Current Node.js version is ${nodeVersion}.`);
  process.exit(1);
}

function failUnsupportedNpmVersion(npmVersion) {
  console.error(
    `ERROR: Could not update npm to >= ${NPM_MIN_VERSION} for OIDC trusted publishing.`
  );
  console.error(`Current npm version ${npmVersion} does not support OIDC.`);
  console.error('See: https://github.com/actions/runner-images/issues/13883');
  process.exit(1);
}

export async function setupNpm($, fetchFn = fetch) {
  const nodeVersion = process.version;
  console.log(`Current Node.js version: ${nodeVersion}`);

  if (!isSupportedNodeVersion(nodeVersion)) {
    failUnsupportedNodeVersion(nodeVersion);
  }

  const currentResult = await $`npm --version`.run({ capture: true });
  const currentVersion = currentResult.stdout.trim();
  console.log(`Current npm version: ${currentVersion}`);

  const strategies = [
    ['npm install -g npm@12.2.2', () => tryStandardInstall($)],
    ['curl-based tarball download', () => tryCurlTarball($, fetchFn)],
    ['npx-based install', () => tryNpxInstall($)],
    ['corepack', () => tryCorepack($)],
  ];

  let success = false;
  for (const [name, fn] of strategies) {
    console.log(`Trying ${name}...`);
    success = await tryStrategy(name, fn);
    if (success) {
      break;
    }
    console.warn(
      'This may be the Node.js 22.22.2 broken npm issue (actions/runner-images#13883).'
    );
  }

  if (!success) {
    if (isSupportedNpmVersion(currentVersion)) {
      console.log(
        'Current npm version already supports OIDC trusted publishing'
      );
    }
  }

  const updatedResult = await $`npm --version`.run({ capture: true });
  const updatedVersion = updatedResult.stdout.trim();
  console.log(`Updated npm version: ${updatedVersion}`);

  if (!isSupportedNpmVersion(updatedVersion)) {
    failUnsupportedNpmVersion(updatedVersion);
  }
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  try {
    if (!isSupportedNodeVersion(process.version)) {
      failUnsupportedNodeVersion(process.version);
    }

    // Load command-stream dynamically only for CLI execution, so tests can
    // import the pure version helpers without fetching dependencies or
    // mutating npm.
    const { loadCommandStream } = await import('./use-module.mjs');
    const { $ } = await loadCommandStream();

    await setupNpm($);
  } catch (error) {
    console.error('Error updating npm:', error.message);
    process.exit(1);
  }
}
