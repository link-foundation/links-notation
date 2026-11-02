#!/usr/bin/env bun

import { spawnSync } from 'node:child_process';
/** @type {import('./process-types.js').Spawn} */
const runProcess = spawnSync;
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fetchWithRetries } from './fetch-with-retries.mjs';
import { validatePackage } from './validate-nuget-package.mjs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectNugetCredential, NUGET_AUTH_HINT } from './nuget-auth.mjs';

/** Publish every package, preserving failures and giving actionable auth errors. */
export function pushPackages({
  apiKey,
  packagePaths,
  spawn = runProcess,
  log = console.log,
}) {
  if (!apiKey)
    throw new Error(`No NuGet publishing key was obtained. ${NUGET_AUTH_HINT}`);
  if (packagePaths.length === 0) throw new Error('No .nupkg files found to publish.');
  for (const packagePath of packagePaths) {
    const result = spawn(
      'dotnet',
      [
        'nuget',
        'push',
        packagePath,
        '--api-key',
        apiKey,
        '--source',
        'https://api.nuget.org/v3/index.json',
        '--skip-duplicate',
      ],
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
    );
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replaceAll(
      apiKey,
      '[REDACTED]',
    );
    if (output) log(output);
    if (result.error || result.status !== 0) {
      const guidance = /\b(401|403)\b/.test(output) ? ` ${NUGET_AUTH_HINT}` : '';
      const failure = Object.assign(
        new Error(
          `NuGet push failed for ${packagePath} (exit ${result.status ?? 'unavailable'}).${guidance}`,
        ),
        { authenticationRejected: false },
      );
      failure.authenticationRejected =
        /(?:HTTP|status code)[^\n]*?\b(?:401|403)\b|\b(?:401|403)\s*\((?:Unauthorized|Forbidden)\)/i.test(
          output,
        );
      throw failure;
    }
  }
}

export async function publishWithFallback({
  oidcOutcome,
  oidcKey,
  apiKey,
  packagePaths,
  packageId,
  version,
  spawn = runProcess,
  log = console.log,
  fetchImpl = /** @type {import('./process-types.js').Fetch} */ (fetch),
}) {
  const emit = log;
  log = (message) => {
    for (const secret of [oidcKey, apiKey].filter(Boolean))
      message = message.replaceAll(secret, '[REDACTED]');
    emit(message);
  };
  const digest = (file) =>
    createHash('sha256').update(readFileSync(file)).digest('hex');
  const artifacts = packagePaths.map(digest);
  const selected = selectNugetCredential({ oidcOutcome, oidcKey, apiKey });
  log(`NuGet method: ${selected.method}. ${selected.reason}`);
  if (!selected.key) throw new Error(selected.reason);
  let method = selected.method;
  try {
    pushPackages({ apiKey: selected.key, packagePaths, spawn, log });
  } catch (error) {
    if (method !== 'trusted-publishing' || !error.authenticationRejected || !apiKey)
      throw error;
    if (!packageId || !version || packagePaths.length !== 1)
      throw new Error(
        'Authentication retry requires one validated package with exact identity/version.',
        { cause: error },
      );
    const id = encodeURIComponent(packageId.toLowerCase());
    const v = encodeURIComponent(version.toLowerCase());
    const response = await fetchWithRetries(
      `https://api.nuget.org/v3-flatcontainer/${id}/${v}/${id}.${v}.nupkg`,
      {},
      fetchImpl,
    );
    await response.body?.cancel?.();
    if (response.status === 200) {
      log(
        'Exact version already accepted anonymously; preserving immutable publication.',
      );
      return { method, recovered: true };
    }
    if (response.status !== 404)
      throw new Error(
        `Cannot establish exact publication state: HTTP ${response.status}; authentication retry refused.`,
        { cause: error },
      );
    if (packagePaths.some((file, index) => digest(file) !== artifacts[index]))
      throw Error('Validated artifact changed; authentication retry refused.', {
        cause: error,
      });
    method = 'token-fallback';
    log(
      'NuGet method: token-fallback after trusted-publishing HTTP 401/403; retrying the same validated artifact once.',
    );
    try {
      pushPackages({ apiKey, packagePaths, spawn, log });
    } catch {
      throw new Error(
        `Both trusted-publishing and token-fallback failed. ${NUGET_AUTH_HINT}`,
      );
    }
  }
  return { method };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const packagePaths = readdirSync('artifacts')
      .filter((name) => name.endsWith('.nupkg'))
      .sort()
      .map((name) => join('artifacts', name));
    if (packagePaths.length !== 1)
      throw new Error(
        'Expected exactly one release .nupkg; refusing ambiguous publication.',
      );
    const packageId = process.env.PACKAGE_ID || '';
    const version = process.env.PACKAGE_VERSION || '';
    validatePackage({ packagePath: packagePaths[0], packageId, version });
    const result = await publishWithFallback({
      oidcOutcome: process.env.NUGET_OIDC_OUTCOME,
      oidcKey: process.env.NUGET_OIDC_KEY,
      apiKey: process.env.NUGET_API_KEY || '',
      packagePaths,
      packageId,
      version,
    });
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `published=true\nmethod=${result.method}\n`,
      );
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
