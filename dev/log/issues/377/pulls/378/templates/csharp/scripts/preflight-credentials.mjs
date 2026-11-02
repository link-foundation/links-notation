#!/usr/bin/env bun

/** @type {import('./process-types.js').Fetch} */
const request = fetch;

/**
 * Report repository read identity, publishing configuration and credential state.
 * Only the official OIDC exchange proves OIDC authentication. Verification keys
 * cannot prove original-key push scope; actual protected writes and publication
 * are fatal checks. PR report mode requires no publishing secrets.
 */

import { detectCsharpLayout, findCsharpProjectFile } from './release-naming.mjs';
import { readCsprojInfo } from './check-release-needed.mjs';
import { checkNugetAuthentication } from './nuget-auth.mjs';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

const GITHUB_API = 'https://api.github.com';

/**
 * Append a key/value pair to GITHUB_OUTPUT (when defined) and echo to stdout.
 * @param {string} key
 * @param {string} value
 */
export function setOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${key}=${value}\n`);
  }
  console.log(`Output: ${key}=${value}`);
}

/**
 * Probe GET /repos/{owner}/{repo} for the token's effective permissions.
 *
 * @param {object} input
 * @param {string} input.repository  owner/repo
 * @param {string} input.token       GITHUB_TOKEN value ('' probes anonymously)
 * @param {import('./process-types.js').Fetch} [input.fetchImpl]
 * @returns {Promise<{status: string, detail: string, writeCapability?: string, latestVersion?: string}>}
 */
export async function checkGithubPushPermission({
  repository,
  token,
  fetchImpl = request,
}) {
  if (!repository) {
    return {
      status: 'unknown',
      detail: 'GITHUB_REPOSITORY is not set; the push permission cannot be probed',
    };
  }

  const baseUrl = process.env.GITHUB_API_URL ?? GITHUB_API;
  const url = `${baseUrl}/repos/${repository}`;
  console.log(`Fetching ${url}`);

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetchImpl(url, { headers });
  } catch (error) {
    return {
      status: 'unknown',
      detail: `GitHub API unreachable (${error.message}); the push permission could not be probed`,
    };
  }

  if (response.status === 403 || response.status === 429) {
    return {
      status: 'unknown',
      detail: `GitHub API answered ${response.status}; the push permission could not be probed`,
    };
  }
  if ([401, 404].includes(response.status)) {
    return {
      status: 'failed',
      detail: `repository ${repository} is not visible to the token (HTTP ${response.status})`,
    };
  }
  if (!response.ok) {
    return {
      status: 'unknown',
      detail: `GitHub API answered ${response.status}; the push permission could not be probed`,
    };
  }

  const payload = await response.json();
  if (
    typeof payload.full_name !== 'string' ||
    payload.full_name.toLowerCase() !== repository.toLowerCase()
  ) {
    return {
      status: 'failed',
      detail: 'GitHub repository identity did not match the requested repository.',
    };
  }
  return {
    status: 'ok',
    writeCapability: 'unverified',
    detail: `Repository identity and read access verified. User-role permissions.push=${String(payload.permissions?.push)} does not prove installation-token or protected-branch write authorization; actual writes remain fatal.`,
  };
}

/**
 * Advisory probe of the package's visibility on nuget.org. Never blocks: a
 * 404 is the expected state before the first publish, and NuGet creates the
 * registration on first push (unlike Packagist, which requires a submit).
 *
 * @param {object} input
 * @param {string} input.packageId
 * @param {import('./process-types.js').Fetch} [input.fetchImpl]
 * @returns {Promise<{status: string, detail: string, writeCapability?: string, latestVersion?: string}>}
 */
export async function checkNugetPackageVisibility({ packageId, fetchImpl = request }) {
  if (!packageId) {
    return {
      status: 'unknown',
      detail: 'package id could not be resolved from the csproj; visibility not probed',
    };
  }

  const baseUrl =
    process.env.NUGET_INDEX_URL ?? 'https://api.nuget.org/v3-flatcontainer';
  const url = `${baseUrl}/${packageId.toLowerCase()}/index.json`;
  console.log(`Fetching ${url}`);

  let response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
  } catch (error) {
    return {
      status: 'unknown',
      detail: `NuGet flat-container index unreachable (${error.message}); visibility not probed`,
    };
  }

  if (response.status === 404) {
    return {
      status: 'ok',
      latestVersion: '',
      detail: `"${packageId}" is not on nuget.org yet — the first publish creates the registration`,
    };
  }
  if (!response.ok) {
    return {
      status: 'unknown',
      detail: `NuGet flat-container index answered ${response.status}; visibility not probed`,
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return {
      status: 'unknown',
      detail: 'NuGet flat-container index returned invalid JSON.',
    };
  }
  if (
    !Array.isArray(payload?.versions) ||
    !payload.versions.every((version) => typeof version === 'string')
  ) {
    return {
      status: 'unknown',
      detail: 'NuGet flat-container index returned an invalid versions list.',
    };
  }
  const versions = payload.versions;
  return {
    status: 'ok',
    latestVersion: versions.at(-1) || '',
    detail: `"${packageId}" is public on nuget.org with ${versions.length} published version(s)`,
  };
}

/**
 * Pure decision — exported for unit tests.
 *
 * Release mode fails when any probe failed or when a required probe did not
 * come back verified; report mode never fails. All results are returned so
 * one run names every problem, not just the first.
 *
 * @param {object} input
 * @param {'release'|'report'} input.mode
 * @param {Array<{name: string, required: boolean, status: string, detail: string}>} input.checks
 * @returns {{passed: boolean, failures: string[]}}
 */
export function decidePreflight({ mode, checks }) {
  const failures = [];
  for (const check of checks) {
    if (check.status === 'failed') {
      failures.push(`${check.name}: ${check.detail}`);
    } else if (check.required && mode === 'release' && check.status !== 'ok') {
      failures.push(
        `${check.name}: could not be verified (${check.status}) — ${check.detail}`,
      );
    }
  }
  // Report mode still names every failure, but never blocks: a fork PR
  // legitimately has no publishing secrets.
  return { passed: mode === 'release' ? failures.length === 0 : true, failures };
}

/**
 * Resolve the package id from the csproj without invoking dotnet. Returns ''
 * when the layout or the csproj cannot be read — the visibility probe is
 * advisory, so a resolution failure must not crash the preflight.
 * @returns {string}
 */
export function resolvePackageId() {
  try {
    const layout = detectCsharpLayout({
      csharpRoot: process.env.CSHARP_ROOT || '',
    });
    const csharpRootPath =
      layout.csharpRoot === '.'
        ? process.cwd()
        : path.join(process.cwd(), layout.csharpRoot);
    const csprojPath =
      findCsharpProjectFile(csharpRootPath) ||
      path.join(csharpRootPath, 'src/MyPackage/MyPackage.csproj');
    return readCsprojInfo(csprojPath).packageId || '';
  } catch (error) {
    console.log(`Package id resolution skipped: ${error.message}`);
    return '';
  }
}

export function checkPublishingConfiguration() {
  try {
    const layout = detectCsharpLayout({ csharpRoot: process.env.CSHARP_ROOT || '' });
    const project = findCsharpProjectFile(path.resolve(layout.csharpRoot));
    const xml = readFileSync(project, 'utf8');
    const { packageId } = readCsprojInfo(project);
    const authors = xml.match(/<Authors>([^<]+)<\/Authors>/)?.[1]?.trim();
    if (
      !packageId ||
      /^(MyPackage|Your[. -]?Package)$/i.test(packageId) ||
      !authors ||
      /Your Name/i.test(authors)
    ) {
      return {
        status: 'failed',
        detail:
          'Publishing identity is unset or still a template placeholder. Set a unique PackageId and real Authors, confirm the NuGet owner, and configure the exact release.yml publisher policy before publishing. Never register MyPackage or a broad wildcard.',
      };
    }
    return {
      status: 'ok',
      detail: `Explicit package identity ${packageId}; publisher ownership/policy authorization remains subject to the actual push.`,
    };
  } catch {
    return {
      status: 'failed',
      detail:
        'Publishing project identity could not be verified; configure PackageId and Authors before release.',
    };
  }
}

export async function main({
  fetchImpl = request,
  configurationCheck = checkPublishingConfiguration,
} = {}) {
  const mode = process.env.PREFLIGHT_MODE === 'release' ? 'release' : 'report';
  const repository = process.env.GITHUB_REPOSITORY || '';
  const token = process.env.GITHUB_TOKEN || '';
  const apiKey = process.env.NUGET_API_KEY || '';
  const packageId = resolvePackageId();

  console.log(`Preflight mode: ${mode}`);
  console.log(`Repository:     ${repository || '(not set)'}`);
  console.log(`Package id:     ${packageId || '(unresolved)'}`);

  const pushCheck = await checkGithubPushPermission({ repository, token, fetchImpl });
  const visibilityCheck = await checkNugetPackageVisibility({ packageId, fetchImpl });
  const keyCheck = await checkNugetAuthentication({
    apiKey,
    oidcOutcome: process.env.NUGET_OIDC_OUTCOME,
    oidcKey: process.env.NUGET_OIDC_KEY,
    packageId,
    fetchImpl,
  });
  setOutput('auth', keyCheck.auth);

  const checks = [
    { name: 'Publishing identity', required: true, ...configurationCheck() },
    {
      name: 'GitHub repository access (write unverified)',
      required: true,
      ...pushCheck,
    },
    {
      name: 'NuGet authentication',
      required: keyCheck.status !== 'unknown' || keyCheck.auth === 'none',
      ...keyCheck,
    },
    { name: 'NuGet package visibility', required: false, ...visibilityCheck },
  ];

  for (const check of checks) {
    const mark =
      check.status === 'ok' ? 'PASS' : check.status === 'failed' ? 'FAIL' : 'WARN';
    console.log(`[${mark}] ${check.name}: ${check.detail}`);
    if (check.status === 'failed') {
      console.error(`::error::${check.name}: ${check.detail}`);
    }
  }

  const decision = decidePreflight({ mode, checks });
  for (const failure of decision.failures) {
    console.error(
      mode === 'release'
        ? `::error::release preflight failed — ${failure}`
        : `[REPORT] ${failure}`,
    );
  }

  setOutput('preflight_result', decision.passed ? 'passed' : 'failed');

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const rows = checks
      .map(
        (check) =>
          `| ${check.name} | ${check.status} | ${check.required ? 'required' : 'advisory'} | ${check.detail} |`,
      )
      .join('\n');
    appendFileSync(
      summaryFile,
      `### Release preflight (${mode} mode)\n\n` +
        `| Check | Result | Kind | Detail |\n|---|---|---|---|\n${rows}\n`,
    );
  }

  if (!decision.passed) {
    console.error(
      'Release preflight failed; no build or publish job will run. Fix the probes above and push again.',
    );
  }
  return decision;
}

// Allow `import { ... } from './preflight-credentials.mjs'` without running main().
const entryPath = process.argv[1];
const invokedDirectly =
  typeof entryPath === 'string' &&
  entryPath.length > 0 &&
  (import.meta.url === `file://${entryPath}` || import.meta.url.endsWith(entryPath));
if (invokedDirectly) {
  main()
    .then((decision) => {
      if (!decision.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
