#!/usr/bin/env node
// Credential retries never rebuild, repack, or change the validated artifacts.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const remedy = {
  nuget: 'Configure NuGet.org trusted publishing for publish-csharp.yml and NUGET_USER, or renew NUGET_API_KEY/NUGET_TOKEN at https://www.nuget.org/account/apikeys (package push scope).',
  pypi: 'Configure PyPI trusted publishing for js.yml, or supply PYPI_TOKEN.',
};

async function requestJson(fetcher, url, options = {}) {
  let response;
  try {
    response = await fetcher(url, { ...options, signal: AbortSignal.timeout(30000) });
  } catch {
    throw new Error('OIDC transport outcome unknown; credential fallback is unsafe.');
  }
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) {
    // PyPI uses 400 for a known publisher/token rejection. Other 400s can
    // indicate a protocol defect and must not be retried with another key.
    const pypiRejection = url === 'https://pypi.org/_/oidc/mint-token' &&
      response.status === 400 && Array.isArray(body?.errors) &&
      body.errors.length > 0 && body.errors.every((error) =>
        ['invalid-publisher', 'invalid-token'].includes(error.code));
    throw Object.assign(new Error(`OIDC request rejected: HTTP ${response.status}`), {
      authentication: [401, 403].includes(response.status) || pypiRejection,
    });
  }
  if (!body) throw new Error('Malformed OIDC response; credential fallback is unsafe.');
  return body;
}

export async function exchangeTrustedCredential(provider, env = process.env, fetcher = fetch) {
  const requestUrl = env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) {
    throw Object.assign(new Error('GitHub OIDC is unavailable; configure id-token: write.'), { authentication: true });
  }
  const url = new URL(requestUrl);
  url.searchParams.set('audience', provider === 'nuget' ? 'https://www.nuget.org' : 'pypi');
  const identity = await requestJson(fetcher, url.href, {
    headers: { authorization: `Bearer ${requestToken}` },
  });
  if (typeof identity.value !== 'string' || !identity.value)
    throw new Error('GitHub returned no OIDC identity; credential fallback is unsafe.');
  const nuget = provider === 'nuget';
  const result = await requestJson(fetcher, nuget
    ? 'https://www.nuget.org/api/v2/token' : 'https://pypi.org/_/oidc/mint-token', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'links-notation-ci',
      ...(nuget ? { authorization: `Bearer ${identity.value}` } : {}),
    },
    body: JSON.stringify(nuget
      ? { username: env.NUGET_USER, tokenType: 'ApiKey' }
      : { token: identity.value }),
  });
  const key = nuget ? result.apiKey : result.token;
  if (typeof key !== 'string' || !key)
    throw new Error('Registry returned no credential; credential fallback is unsafe.');
  return key;
}

export function isAuthenticationFailure(provider, output = '') {
  return provider === 'nuget'
    ? /Response status code does not indicate success: (401|403)\b|API key (has )?expired|API key is invalid/i.test(output)
    : /HTTPError:\s*(401|403)\b/.test(output);
}

export async function publishWithFallback({
  provider, trusted = false, exchange, credentials = [], upload, log = console.log,
}) {
  const candidates = [];
  const secrets = credentials.map(({ key }) => key).filter(Boolean);
  const safeLog = (message) => {
    let safe = message;
    for (const secret of secrets) safe = safe.split(secret).join('[REDACTED]');
    if (safe) log(safe);
  };
  if (trusted) {
    try {
      const key = await exchange();
      secrets.push(key);
      candidates.push({ key, source: 'trusted publishing', trusted: true });
    } catch (error) {
      if (!error.authentication) throw error;
      safeLog('::notice::Trusted publishing authentication was rejected; checking supplied fallback credentials.');
      if (!secrets.length) throw new Error(`No ${provider} credential accepted. ${remedy[provider]}`);
    }
  }
  for (const credential of credentials) {
    if (credential.key && !candidates.some((item) => item.key === credential.key))
      candidates.push(credential);
  }
  if (!candidates.length) throw new Error(`No ${provider === 'nuget' ? 'NuGet' : 'PyPI'} credential. ${remedy[provider]}`);
  for (const [index, credential] of candidates.entries()) {
    safeLog(`Credential present, from the ${credential.source}`);
    const result = await upload(credential);
    safeLog(result.output ?? '');
    if (result.status === 0) return credential.source;
    if (!isAuthenticationFailure(provider, result.output))
      throw new Error(`${provider === 'nuget' ? 'dotnet nuget push' : 'PyPI'} upload failed with exit code ${result.status}; outcome may be unknown. No credential retry.`);
    if (index === candidates.length - 1)
      throw new Error(`${provider === 'nuget' ? 'NuGet.org' : 'PyPI'} rejected the key from the ${credential.source}. ${remedy[provider]}`);
    safeLog(`::notice::Registry rejected ${credential.source}; retrying the same artifacts with the next supplied credential.`);
  }
}

const execute = (command, args, env) => {
  const result = spawnSync(command, args, { env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return { status: result.status ?? 1, output: (result.stdout ?? '') + (result.stderr ?? '') };
};

export async function publishPackage(provider, env = process.env, {
  executeCommand = execute, fetcher = fetch,
} = {}) {
  if (!Object.hasOwn(remedy, provider)) throw new Error('Expected nuget or pypi');
  if (env.SHOULD_PUBLISH !== 'true') {
    appendFileSync(env.GITHUB_OUTPUT, 'published=skipped\n');
    console.log(`::notice::Version ${env.PACKAGE_VERSION} already exists; verifying public delivery next.`);
    return;
  }
  const nuget = provider === 'nuget';
  const directory = nuget ? 'artifacts' : 'dist';
  const files = readdirSync(directory).filter((file) => nuget
    ? file.endsWith('.nupkg') : /\.(whl|tar\.gz)$/.test(file))
    .sort().map((file) => `${directory}/${file}`);
  if (!files.length) throw new Error(`No built ${provider} artifacts`);
  const fingerprint = () => files.map((file) =>
    createHash('sha256').update(readFileSync(file)).digest('hex')).join(':');
  const original = fingerprint();
  if (!nuget) {
    const result = executeCommand('python', ['-m', 'twine', 'check', ...files], env);
    if (result.status !== 0) throw new Error('PyPI artifact metadata validation failed; no authentication attempted.');
  }
  let attested = false;
  await publishWithFallback({
    provider,
    trusted: nuget ? Boolean(env.NUGET_USER || env.NUGET_LOGIN_KEY) : env.PYPI_TRUSTED_PUBLISHING !== 'false',
    exchange: () => (nuget && env.NUGET_LOGIN_KEY) || exchangeTrustedCredential(provider, env, fetcher),
    credentials: nuget ? [
      { source: 'NUGET_API_KEY secret', key: env.NUGET_API_KEY },
      { source: 'NUGET_TOKEN secret', key: env.NUGET_TOKEN },
    ] : [{ source: 'PYPI_TOKEN secret', key: env.PYPI_TOKEN }],
    upload: async (credential) => {
      if (fingerprint() !== original) throw new Error('Built artifacts changed; refusing credential retry.');
      if (!nuget && credential.trusted && !attested) {
        const result = executeCommand('python', ['-m', 'pypi_attestations', 'sign', ...files], env);
        if (result.status !== 0) throw new Error('PyPI attestation generation failed; no credential retry.');
        attested = true;
      }
      const attestations = !nuget && credential.trusted
        ? readdirSync(directory).filter((file) => file.endsWith('.attestation')).sort()
          .map((file) => `${directory}/${file}`) : [];
      return nuget ? executeCommand('dotnet', [
        'nuget', 'push', ...files, '--api-key', credential.key,
        '--source', 'https://api.nuget.org/v3/index.json', '--skip-duplicate',
      ], env) : executeCommand('python', [
        '-m', 'twine', 'upload', '--non-interactive',
        ...(credential.trusted ? ['--attestations'] : []), ...files, ...attestations,
      ], { ...env, TWINE_USERNAME: '__token__', TWINE_PASSWORD: credential.key,
        TWINE_REPOSITORY_URL: 'https://upload.pypi.org/legacy/' });
    },
  });
  appendFileSync(env.GITHUB_OUTPUT, 'published=true\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await publishPackage(process.argv[2]); }
  catch (error) {
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'published=failed\n');
    console.error(`::error::${error.message} No GitHub release will be created.`);
    process.exitCode = 1;
  }
}
