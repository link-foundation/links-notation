import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishPackage, publishWithFallback, exchangeTrustedCredential } from '../../scripts/ci/publish-package.mjs';

for (const provider of ['nuget', 'pypi']) {
  test(`${provider}: rejected OIDC exchange uses a supplied credential`, async () => {
    const seen = [];
    await publishWithFallback({
      provider, trusted: true,
      exchange: async () => { throw Object.assign(new Error('HTTP 403'), { authentication: true }); },
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async (credential) => { seen.push(credential.key); return { status: 0 }; },
      log: () => {},
    });
    assert.deepEqual(seen, ['fallback']);
  });
  test(`${provider}: rejected short-lived key retries only upload`, async () => {
    const seen = [];
    const result = await publishWithFallback({
      provider, trusted: true, exchange: async () => 'oidc',
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async (credential) => {
        seen.push(credential.key);
        return credential.key === 'oidc'
          ? { status: 1, output: provider === 'nuget'
            ? 'error: Response status code does not indicate success: 401 (Unauthorized).'
            : 'HTTPError: 403 Forbidden from https://upload.pypi.org/legacy/' }
          : { status: 0 };
      }, log: () => {},
    });
    assert.equal(result, 'supplied token');
    assert.deepEqual(seen, ['oidc', 'fallback']);
  });
  test(`${provider}: trusted publishing wins over configured secrets`, async () => {
    const seen = [];
    await publishWithFallback({
      provider, trusted: true, exchange: async () => 'oidc',
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async (credential) => { seen.push(credential.key); return { status: 0 }; },
      log: () => {},
    });
    assert.deepEqual(seen, ['oidc']);
  });
  for (const output of ['HTTPError: 400 Bad Request (metadata defect)', 'error: 409 (Conflict)', 'socket hang up after upload', 'HTTPError: 503 Service Unavailable']) {
    test(`${provider}: ${output} never changes credentials`, async () => {
      let calls = 0;
      await assert.rejects(publishWithFallback({
        provider, trusted: true, exchange: async () => 'oidc',
        credentials: [{ source: 'supplied token', key: 'fallback' }],
        upload: async () => { calls++; return { status: 1, output }; }, log: () => {},
      }), /upload failed/);
      assert.equal(calls, 1);
    });
  }
  test(`${provider}: unknown OIDC failure cannot trigger fallback`, async () => {
    let calls = 0;
    await assert.rejects(publishWithFallback({
      provider, trusted: true, exchange: async () => { throw new Error('transport unknown'); },
      credentials: [{ source: 'supplied token', key: 'fallback' }],
      upload: async () => { calls++; }, log: () => {},
    }), /transport unknown/);
    assert.equal(calls, 0);
  });
  test(`${provider}: absent credentials fail visibly`, async () => {
    await assert.rejects(publishWithFallback({ provider, credentials: [], log: () => {} }), /No .* credential/);
  });
}

test('NuGet exchange follows the official token protocol and masks no values into logs', async () => {
  const calls = [];
  const key = await exchangeTrustedCredential('nuget', {
    NUGET_USER: 'maintainer', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.githubusercontent.com/token?x=1',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-secret',
  }, async (url, options) => {
    calls.push([url, options]);
    return new Response(JSON.stringify(calls.length === 1 ? { value: 'identity-secret' } : { apiKey: 'short-lived' }));
  });
  assert.equal(key, 'short-lived');
  assert.match(calls[0][0], /audience=https%3A%2F%2Fwww.nuget.org/);
  assert.equal(calls[1][0], 'https://www.nuget.org/api/v2/token');
  assert.deepEqual(JSON.parse(calls[1][1].body), { username: 'maintainer', tokenType: 'ApiKey' });
  assert.equal(calls[1][1].headers.authorization, 'Bearer identity-secret');
});

for (const status of [400, 401, 403, 422, 429, 500]) {
  test(`PyPI token exchange HTTP ${status} has explicit fallback classification`, async () => {
    let calls = 0;
    await assert.rejects(exchangeTrustedCredential('pypi', {
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.githubusercontent.com/token?x=1',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-secret',
    }, async () => {
      calls++;
      return calls === 1 ? new Response('{"value":"identity"}')
        : new Response(JSON.stringify({ errors: [{ code: 'invalid-publisher', description: 'not configured' }] }), { status });
    }), (error) => error.authentication === ([400, 401, 403, 422].includes(status)));
  });
}

const oidcEnv = {
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.githubusercontent.com/token?secret=request-url-secret',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-secret',
};
const warehouseError = (...codes) => ({
  message: 'Token request failed',
  errors: codes.map((code) => ({ code, description: 'private-identity-secret' })),
});
const exchangeResponse = (body, status = 422, stage = 'mint') => {
  let calls = 0;
  return async () => ++calls === 1 && stage === 'mint'
    ? new Response('{"value":"identity-secret"}')
    : new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
};

for (const status of [400, 422]) {
  for (const codes of [['invalid-publisher'], ['invalid-token'], ['invalid-publisher', 'invalid-token']]) {
    test(`PyPI HTTP ${status} ${codes.join(',')} retries with safe mint diagnostics`, async () => {
      const logs = [], uploads = [];
      await publishWithFallback({
        provider: 'pypi', trusted: true,
        exchange: () => exchangeTrustedCredential('pypi', oidcEnv, exchangeResponse(warehouseError(...codes), status)),
        credentials: [{ source: 'PYPI_TOKEN secret', key: 'fallback-secret' }],
        upload: async (credential) => { uploads.push(credential.key); return { status: 0 }; },
        log: (message) => logs.push(message),
      });
      assert.deepEqual(uploads, ['fallback-secret']);
      assert.match(logs.join('\n'), new RegExp(`PyPI token minting.*HTTP ${status}.*${codes[0]}`));
      assert.doesNotMatch(logs.join('\n'), /request-secret|request-url-secret|identity-secret|fallback-secret|https:\/\/token/);
    });
  }
}

const unsafeBodies = [
  ['payload defect', warehouseError('invalid-payload')],
  ['replay', warehouseError('invalid-reuse-token')],
  ['disabled', warehouseError('not-enabled')],
  ['pending publisher defect', warehouseError('invalid-pending-publisher')],
  ['rate limit', warehouseError('rate-limited')],
  ['unknown code', warehouseError('unknown-private-secret')],
  ['mixed codes', warehouseError('invalid-publisher', 'invalid-payload')],
  ['empty errors', warehouseError()],
  ['missing errors', {}],
  ['non-list errors', { errors: { code: 'invalid-publisher' } }],
  ['null entry', { errors: [null] }],
  ['string entry', { errors: ['invalid-publisher'] }],
  ['missing code', { errors: [{ description: 'private-secret' }] }],
  ['non-string code', { errors: [{ code: ['invalid-publisher'], description: 'private-secret' }] }],
  ['missing description', { errors: [{ code: 'invalid-publisher' }] }],
  ['non-string description', { errors: [{ code: 'invalid-publisher', description: {} }] }],
  ['mixed malformed entries', { errors: [...warehouseError('invalid-token').errors, null] }],
  ['malformed JSON', '{"errors": [private-secret'],
  ['null body', null],
];
for (const status of [400, 422]) {
  for (const [name, body] of unsafeBodies) {
    test(`PyPI HTTP ${status} ${name} cannot trigger fallback`, async () => {
      let uploads = 0;
      await assert.rejects(publishWithFallback({
        provider: 'pypi', trusted: true,
        exchange: () => exchangeTrustedCredential('pypi', oidcEnv, exchangeResponse(body, status)),
        credentials: [{ source: 'PYPI_TOKEN secret', key: 'fallback-secret' }],
        upload: async () => { uploads++; return { status: 0 }; }, log: () => {},
      }), (error) => {
        assert.equal(error.authentication, false);
        assert.match(error.message, /PyPI token minting/);
        assert.match(error.message, new RegExp(`HTTP ${status}`));
        assert.doesNotMatch(error.message, /private-secret|unknown-private-secret|request-secret|identity-secret|request-url-secret/);
        return true;
      });
      assert.equal(uploads, 0);
    });
  }
}

for (const stage of ['identity', 'mint']) {
  for (const status of [401, 403, 422, 429, 500]) {
    test(`${stage} HTTP ${status} reports the stage without leaking response content`, async () => {
      await assert.rejects(exchangeTrustedCredential('pypi', oidcEnv,
        exchangeResponse(warehouseError('invalid-publisher'), status, stage)), (error) => {
        assert.equal(error.authentication, stage === 'identity' ? [401, 403].includes(status) : [401, 403, 422].includes(status));
        assert.match(error.message, stage === 'identity' ? /GitHub identity acquisition/ : /PyPI token minting/);
        assert.match(error.message, new RegExp(`HTTP ${status}`));
        assert.match(error.message, /invalid-publisher/);
        assert.doesNotMatch(error.message, /private-identity-secret|request-secret|request-url-secret/);
        return true;
      });
    });
  }
  for (const failure of ['transport', 'malformed JSON', 'missing credential']) {
    test(`${stage} ${failure} is sanitized and cannot trigger fallback`, async () => {
      let calls = 0;
      await assert.rejects(exchangeTrustedCredential('pypi', oidcEnv, async () => {
        if (++calls === 1 && stage === 'mint') return new Response('{"value":"identity-secret"}');
        if (failure === 'transport') throw new Error(`request-secret ${oidcEnv.ACTIONS_ID_TOKEN_REQUEST_URL}`);
        return new Response(failure === 'malformed JSON' ? 'private-secret' : '{}');
      }), (error) => {
        assert.equal(error.authentication, false);
        assert.match(error.message, stage === 'identity' ? /GitHub identity acquisition/ : /PyPI token minting/);
        assert.doesNotMatch(error.message, /private-secret|request-secret|identity-secret|request-url-secret/);
        return true;
      });
    });
  }
}

test('OIDC diagnostics bound code lists and do not trust arbitrary code strings', async () => {
  const body = warehouseError(...Array(50).fill('invalid-publisher'), 'private-secret\n::error::injected');
  await assert.rejects(exchangeTrustedCredential('pypi', oidcEnv, exchangeResponse(body)), (error) => {
    assert.equal(error.authentication, false); // Check the entire list, not only the logged prefix.
    assert.ok(error.message.length < 350);
    assert.doesNotMatch(error.message, /private-secret|injected|\n/);
    return true;
  });
});

test('invalid GitHub identity URL is sanitized', async () => {
  await assert.rejects(exchangeTrustedCredential('pypi', {
    ...oidcEnv, ACTIONS_ID_TOKEN_REQUEST_URL: 'private-url-secret',
  }), (error) => {
    assert.equal(error.authentication, false);
    assert.match(error.message, /GitHub identity acquisition/);
    assert.doesNotMatch(error.message, /private-url-secret/);
    return true;
  });
});

test('PyPI 422 fallback validates once and uploads the same wheel and sdist', async () => {
  const originalDirectory = process.cwd();
  const temp = mkdtempSync(join(tmpdir(), 'lino-pypi-422-'));
  const commands = [];
  try {
    process.chdir(temp);
    mkdirSync('dist');
    writeFileSync('dist/example.whl', 'validated-wheel');
    writeFileSync('dist/example.tar.gz', 'validated-sdist');
    await publishPackage('pypi', {
      ...oidcEnv, SHOULD_PUBLISH: 'true', GITHUB_OUTPUT: join(temp, 'output'), PYPI_TOKEN: 'fallback-secret',
    }, {
      fetcher: exchangeResponse(warehouseError('invalid-publisher')),
      executeCommand: (command, args, env) => {
        commands.push({ command, args, password: env.TWINE_PASSWORD });
        return { status: 0 };
      },
    });
    assert.equal(commands.length, 2);
    assert.deepEqual(commands[0].args, ['-m', 'twine', 'check', 'dist/example.tar.gz', 'dist/example.whl']);
    assert.deepEqual(commands[1].args, ['-m', 'twine', 'upload', '--non-interactive', 'dist/example.tar.gz', 'dist/example.whl']);
    assert.equal(commands[1].password, 'fallback-secret');
  } finally {
    process.chdir(originalDirectory);
    rmSync(temp, { recursive: true, force: true });
  }
});

test('PyPI passes generated attestations to Twine and retries unchanged distributions only', { timeout: 10000 }, async () => {
  const originalDirectory = process.cwd();
  const temp = mkdtempSync(join(tmpdir(), 'lino-pypi-'));
  const commands = [];
  try {
    process.chdir(temp);
    mkdirSync('dist');
    writeFileSync('dist/example.whl', 'validated-wheel');
    let exchanges = 0;
    await publishPackage('pypi', {
      SHOULD_PUBLISH: 'true', GITHUB_OUTPUT: join(temp, 'output'),
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.githubusercontent.com/token',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-token', PYPI_TOKEN: 'fallback',
    }, {
      fetcher: async () => new Response(JSON.stringify(++exchanges === 1
        ? { value: 'identity' } : { token: 'short-lived' })),
      executeCommand: (command, args, env) => {
        commands.push({ command, args, password: env.TWINE_PASSWORD });
        if (args.includes('sign')) writeFileSync('dist/example.whl.publish.attestation', '{}');
        return args.includes('upload') && env.TWINE_PASSWORD === 'short-lived'
          ? { status: 1, output: 'HTTPError: 403 Forbidden' } : { status: 0 };
      },
    });
    assert.equal(exchanges, 2);
    const uploads = commands.filter(({ args }) => args.includes('upload'));
    assert.equal(commands.filter(({ args }) => args.includes('check')).length, 1);
    assert.equal(commands.filter(({ args }) => args.includes('sign')).length, 1);
    assert.equal(uploads.length, 2);
    assert.ok(uploads[0].args.includes('dist/example.whl.publish.attestation'));
    assert.ok(uploads.every(({ args }) => args.includes('dist/example.whl')));
    assert.ok(!uploads[1].args.includes('--attestations'));
    assert.equal(uploads[1].password, 'fallback');
  } finally {
    process.chdir(originalDirectory);
    rmSync(temp, { recursive: true, force: true });
  }
});

test('a changed NuGet artifact prevents a credential retry', async () => {
  const originalDirectory = process.cwd();
  const temp = mkdtempSync(join(tmpdir(), 'lino-nuget-'));
  try {
    process.chdir(temp);
    mkdirSync('artifacts');
    writeFileSync('artifacts/example.nupkg', 'validated-package');
    let uploads = 0;
    await assert.rejects(publishPackage('nuget', {
      SHOULD_PUBLISH: 'true', NUGET_LOGIN_KEY: 'short-lived', NUGET_TOKEN: 'fallback',
    }, {
      executeCommand: () => {
        uploads++;
        writeFileSync('artifacts/example.nupkg', 'modified-package');
        return { status: 1, output: 'Response status code does not indicate success: 401' };
      },
    }), /Built artifacts changed/);
    assert.equal(uploads, 1);
  } finally {
    process.chdir(originalDirectory);
    rmSync(temp, { recursive: true, force: true });
  }
});
