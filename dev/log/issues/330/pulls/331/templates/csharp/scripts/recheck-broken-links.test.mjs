// Tests for the re-check of lychee failures where no host ever answered
// (issue #58). lychee's --max-retries cannot retry a connection reset during
// connect (lycheeverse/lychee#2297), so these tests pin the rule that keeps
// the re-check from hiding real breakage: a failure carrying a status code is
// a host's answer and is final; only silent transport failures get re-asked.
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACCEPT_DEFAULT,
  USER_AGENT_DEFAULT,
  classifyFailures,
  extractLycheeRequestOptions,
  main,
  parseAcceptRanges,
  parseLycheeFailures,
  probe,
  recheckAll,
} from './recheck-broken-links.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const report = readFileSync(
  join(here, 'fixtures', 'lychee-report.md'),
  'utf-8'
);

// Builds a fetch stub from a resolver: per call it receives (url, callNumber)
// and returns a status number, or throws when handed an Error.
function stubFetch(resolve) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, headers: init.headers ?? {} });
    const outcome = resolve(url, calls.length);
    if (outcome instanceof Error) throw outcome;
    return { status: outcome };
  };
  return { fetchImpl, calls };
}

// Runs fn with process.env overrides, restoring the previous values after.
async function withEnv(overrides, fn) {
  const saved = new Map();
  for (const [key, value] of Object.entries(overrides)) {
    saved.set(key, process.env[key]);
    process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function readOutputs(path) {
  const outputs = {};
  for (const line of readFileSync(path, 'utf-8').trim().split('\n')) {
    const eq = line.indexOf('=');
    outputs[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return outputs;
}

describe('lychee failure classification', () => {
  test('the real fixture leaves nothing to re-ask: 404s answered, locals unprovable', () => {
    const failures = parseLycheeFailures(report);
    const { final, unanswered } = classifyFailures(failures);

    expect(failures).toHaveLength(4);
    expect(final).toHaveLength(4);
    expect(unanswered).toEqual([]);
    expect(final.filter((failure) => failure.marker === '404')).toHaveLength(2);
  });

  test('only silent transport failures are worth asking again', () => {
    const synthetic = [
      '## Errors per input',
      '',
      '* [404] <https://gone.example/> (at 1:1) | Rejected status code: 404 Not Found',
      '* [ERROR] <https://reset.example/> (at 2:1) | Network error: Connection reset by peer (os error 104)',
      '* [TIMEOUT] <https://slow.example/> (at 3:1) | Timeout',
      '* [UNKNOWN] <https://dns.example/> (at 4:1) | DNS resolution error',
    ].join('\n');

    const { final, unanswered } = classifyFailures(
      parseLycheeFailures(synthetic)
    );

    expect(final.map((failure) => failure.url)).toEqual([
      'https://gone.example/',
    ]);
    expect(unanswered.map((failure) => failure.url)).toEqual([
      'https://reset.example/',
      'https://slow.example/',
      'https://dns.example/',
    ]);
  });

  test('"Rejected status code" marks an answer under any marker', () => {
    const synthetic =
      '## Errors per input\n\n' +
      '* [WEIRD] <https://x.example/> (at 1:1) | Rejected status code: 500 Internal Server Error\n';

    const { final } = classifyFailures(parseLycheeFailures(synthetic));

    expect(final).toHaveLength(1);
  });

  test('a non-http failure is final without being re-asked', () => {
    const synthetic =
      '## Errors per input\n\n' +
      '* [ERROR] <file:///repo/missing.yml> (at 1:1) | File not found\n';

    const { final, unanswered } = classifyFailures(
      parseLycheeFailures(synthetic)
    );

    expect(final).toHaveLength(1);
    expect(unanswered).toEqual([]);
  });

  test('duplicate urls collapse to one failure', () => {
    const synthetic = [
      '## Errors per input',
      '',
      '* [ERROR] <https://x.example/a> (at 1:1) | Network error: reset',
      '* [ERROR] <https://x.example/a> (at 9:9) | Network error: reset',
    ].join('\n');

    expect(parseLycheeFailures(synthetic)).toHaveLength(1);
  });
});

describe('accept list parsing', () => {
  test('the default is lychee own documented default', () => {
    expect(ACCEPT_DEFAULT).toBe('100..=103,200..=299');

    const accepted = parseAcceptRanges(ACCEPT_DEFAULT);
    expect(accepted.has(100)).toBe(true);
    expect(accepted.has(103)).toBe(true);
    expect(accepted.has(200)).toBe(true);
    expect(accepted.has(299)).toBe(true);
    expect(accepted.has(104)).toBe(false);
    expect(accepted.has(404)).toBe(false);
  });

  test('bare codes, exclusive ranges and stray spaces parse', () => {
    const accepted = parseAcceptRanges('200..204, 429 ,401');

    expect(accepted.has(200)).toBe(true);
    expect(accepted.has(203)).toBe(true);
    expect(accepted.has(204)).toBe(false);
    expect(accepted.has(429)).toBe(true);
    expect(accepted.has(401)).toBe(true);
  });

  test('a typo throws instead of silently narrowing what healthy means', () => {
    expect(() => parseAcceptRanges('2xx')).toThrow(/unrecognised/);
  });
});

describe('request option extraction', () => {
  test('a workflow without flags gets the lychee defaults', () => {
    expect(extractLycheeRequestOptions('')).toEqual([
      ACCEPT_DEFAULT,
      USER_AGENT_DEFAULT,
    ]);
  });

  test('flags in the workflow win', () => {
    const text = [
      '        args: >-',
      '          --verbose',
      '          --accept 200..=299,429',
      '          --user-agent my-checker/2',
      '',
    ].join('\n');

    expect(extractLycheeRequestOptions(text)).toEqual([
      '200..=299,429',
      'my-checker/2',
    ]);
  });
});

describe('probe', () => {
  test('an accepted status is alive; a rejected one is a final verdict', async () => {
    const accept = parseAcceptRanges(ACCEPT_DEFAULT);

    const alive = await probe('https://a.example/', {
      fetchImpl: async () => ({ status: 200 }),
      accept,
    });
    const rejected = await probe('https://b.example/', {
      fetchImpl: async () => ({ status: 404 }),
      accept,
    });

    expect(alive).toMatchObject({ outcome: 'alive', detail: 'HTTP 200' });
    expect(rejected).toMatchObject({ outcome: 'rejected', detail: 'HTTP 404' });
  });

  test('the probe presents the same user agent lychee ran with', async () => {
    const seen = [];
    await probe('https://a.example/', {
      fetchImpl: async (url, init) => {
        seen.push(init.headers['User-Agent']);
        return { status: 200 };
      },
    });

    expect(seen).toEqual([USER_AGENT_DEFAULT]);
  });

  test('a transport failure is unreachable, never a verdict', async () => {
    const result = await probe('https://a.example/', {
      fetchImpl: async () => {
        throw new Error('connection reset by peer');
      },
    });

    expect(result.outcome).toBe('unreachable');
    expect(result.detail).toMatch(/connection reset by peer/);
  });

  test('an abort is reported as a timeout, not a crash', async () => {
    const abort = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    });

    const result = await probe('https://a.example/', {
      timeoutMs: 2000,
      fetchImpl: async () => {
        throw abort;
      },
    });

    expect(result.outcome).toBe('unreachable');
    expect(result.detail).toMatch(/no response within 2s/);
  });
});

describe('recheckAll', () => {
  test('retries a silent link and stops at the first accepted answer', async () => {
    const flappyAttempts = { count: 0 };
    const { fetchImpl, calls } = stubFetch((url) => {
      if (url === 'https://flappy.example/') {
        flappyAttempts.count += 1;
        return flappyAttempts.count < 3 ? new Error('connection reset') : 200;
      }
      return 404;
    });

    const results = await recheckAll(
      ['https://flappy.example/', 'https://gone.example/'],
      { fetchImpl, attempts: 4, waitMs: 1, sleep: async () => {} }
    );

    expect(results.get('https://flappy.example/')).toMatchObject({
      outcome: 'alive',
      attempts: 3,
    });
    expect(results.get('https://gone.example/')).toMatchObject({
      outcome: 'rejected',
      attempts: 1,
    });
    // A rejected link is a host's answer: no second request is spent on it.
    expect(calls.filter((call) => call.url === 'https://gone.example/')).toHaveLength(1);
    expect(calls.filter((call) => call.url === 'https://flappy.example/')).toHaveLength(3);
  });

  test('duplicate urls share one probe slot', async () => {
    const { fetchImpl, calls } = stubFetch(() => 200);

    const results = await recheckAll(
      ['https://a.example/', 'https://a.example/'],
      { fetchImpl, sleep: async () => {} }
    );

    expect(calls).toHaveLength(1);
    expect(results.size).toBe(1);
  });

  test('an expired budget marks never-asked links without probing them', async () => {
    const { fetchImpl, calls } = stubFetch(() => 200);

    const results = await recheckAll(['https://a.example/'], {
      fetchImpl,
      budgetMs: 0,
    });

    expect(calls).toHaveLength(0);
    expect(results.get('https://a.example/')).toMatchObject({
      outcome: 'unreachable',
      attempts: 0,
    });
    expect(results.get('https://a.example/').detail).toMatch(/budget/);
  });

  test('waits double between rounds: a burst of resets is outlasted, not spammed', async () => {
    const waits = [];
    const { fetchImpl, calls } = stubFetch(() => new Error('reset'));

    const results = await recheckAll(['https://x.example/a'], {
      fetchImpl,
      attempts: 3,
      waitMs: 5,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });

    expect(waits).toEqual([5, 10]);
    expect(calls).toHaveLength(3);
    expect(results.get('https://x.example/a')).toMatchObject({
      outcome: 'unreachable',
      attempts: 3,
    });
  });
});

describe('main', () => {
  test('a missing report is reported as nothing recovered, with exit code 0', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'recheck-test-'));
    const githubOutput = join(dir, 'github-output.txt');

    await withEnv(
      {
        LYCHEE_OUTPUT: join(dir, 'missing.md'),
        GITHUB_OUTPUT: githubOutput,
        RECOVERED_OUTPUT: join(dir, 'recovered.txt'),
      },
      () => main()
    );

    const outputs = readOutputs(githubOutput);
    expect(outputs.all_recovered).toBe('false');
    expect(outputs.recovered).toBe('0');
    expect(outputs.remaining).toBe('0');
  });

  test('re-asks only the unanswered and never hides an answered failure', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'recheck-test-'));
    const lycheeOutput = join(dir, 'out.md');
    const githubOutput = join(dir, 'github-output.txt');
    const recoveredOutput = join(dir, 'recovered.txt');
    writeFileSync(
      lycheeOutput,
      [
        '# Link Checker Report',
        '',
        '## Errors per input',
        '',
        '* [404] <https://gone.example/x> (at 1:1) | Rejected status code: 404 Not Found',
        '* [ERROR] <https://flappy.example/y> (at 2:1) | Network error: Connection reset by peer (os error 104)',
        '',
      ].join('\n')
    );

    const { fetchImpl, calls } = stubFetch(
      (url) => (url === 'https://flappy.example/y' ? 200 : 500)
    );

    await withEnv(
      {
        LYCHEE_OUTPUT: lycheeOutput,
        GITHUB_OUTPUT: githubOutput,
        RECOVERED_OUTPUT: recoveredOutput,
      },
      () => main({ fetchImpl })
    );

    // Only the never-answered link was asked; the 404 kept its verdict and
    // still reaches the archive step, so it can never be silenced here.
    expect(calls.map((call) => call.url)).toEqual(['https://flappy.example/y']);
    expect(readFileSync(recoveredOutput, 'utf-8')).toContain(
      'https://flappy.example/y'
    );

    const outputs = readOutputs(githubOutput);
    expect(outputs.all_recovered).toBe('false');
    expect(outputs.recovered).toBe('1');
    expect(outputs.remaining).toBe('1');
  });

  test('all_recovered is true only when nothing at all remains', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'recheck-test-'));
    const lycheeOutput = join(dir, 'out.md');
    const githubOutput = join(dir, 'github-output.txt');
    writeFileSync(
      lycheeOutput,
      [
        '# Link Checker Report',
        '',
        '## Errors per input',
        '',
        '* [ERROR] <https://flappy.example/y> (at 2:1) | Network error: Connection reset by peer (os error 104)',
        '',
      ].join('\n')
    );

    const { fetchImpl } = stubFetch(() => 200);

    await withEnv(
      {
        LYCHEE_OUTPUT: lycheeOutput,
        GITHUB_OUTPUT: githubOutput,
        RECOVERED_OUTPUT: join(dir, 'recovered.txt'),
      },
      () => main({ fetchImpl })
    );

    const outputs = readOutputs(githubOutput);
    expect(outputs.all_recovered).toBe('true');
    expect(outputs.recovered).toBe('1');
    expect(outputs.remaining).toBe('0');
  });
});
