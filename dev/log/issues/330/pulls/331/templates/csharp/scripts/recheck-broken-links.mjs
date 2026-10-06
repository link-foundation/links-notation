#!/usr/bin/env node

/**
 * Re-check the lychee failures where no host ever answered (issue #58).
 *
 * lychee's --max-retries cannot retry a connection reset during connect
 * (lycheeverse/lychee#2297: the error is classified by its phase, and the
 * connect phase is answered `false`), so a healthy URL that answers a RST --
 * a normal event for a rate-limiting or load-shedding host seen from a CI
 * address range -- is reported as broken without a single retry. This script
 * asks those URLs again, outside lychee, round-robin with a doubling wait
 * inside a wall-clock budget that expires well before the job cap.
 *
 * The rule that keeps this from hiding real breakage: a failure carrying a
 * status code means a host answered, and that answer is final -- a 404 is
 * never re-checked. The same holds for failures that are not http(s) URLs at
 * all (missing local files, unresolvable root-relative links): no probe could
 * ever answer them, so they go straight to the "final" bucket.
 *
 * Usage:
 *   node scripts/recheck-broken-links.mjs
 *
 * Environment variables:
 *   - LYCHEE_OUTPUT:           lychee markdown report (default: lychee/out.md)
 *   - RECOVERED_OUTPUT:        where to write the recovered URLs, one per line
 *                              (default: lychee/recovered.txt)
 *   - RECHECK_ATTEMPTS:        rounds over the pending set (default: 3)
 *   - RECHECK_WAIT_SECONDS:    wait before round 2; doubles every round
 *                              (default: 5)
 *   - RECHECK_TIMEOUT_SECONDS: per-request timeout (default: 20)
 *   - RECHECK_BUDGET_SECONDS:  total wall clock (default: 180; the job cap is
 *                              600s, so the budget always expires first)
 *   - RECHECK_VERBOSE:         '1' to log every attempt (default: off)
 *
 * GitHub Actions outputs:
 *   - all_recovered: 'true' only when nothing lychee reported remains — no
 *     answered failure, no non-http failure, and every silent failure
 *     answered the re-check. Consumers must test `!= 'true'`, never
 *     `== 'false'`: a skipped or crashed step leaves the output empty, and
 *     only the `!=` form fails safe.
 *   - recovered / remaining: counts, for the log
 *
 * Exit code is 0 in every case, crashes included. This script downgrades
 * failures, it never raises them, so a bug here cannot turn a green run red
 * or mask a broken one: on a crash the output stays empty and the
 * `!= 'true'` gates treat the run as not recovered.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { dirname, resolve } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

import { extractErrorsSection } from './check-web-archive.mjs';

/**
 * lychee's documented default `--accept` list. Used only when
 * .github/workflows/links.yml sets no flag of its own;
 * extractLycheeRequestOptions derives the pair from the workflow text so the
 * re-check judges a link by the same rules the checker used.
 */
export const ACCEPT_DEFAULT = '100..=103,200..=299';

/**
 * lychee's default user agent, version prefix only so it survives lychee
 * upgrades (`lychee/x.y.z` at runtime).
 */
export const USER_AGENT_DEFAULT = 'lychee';

/**
 * Parse the failures out of the "Errors per input" section of a lychee
 * markdown report. Each entry keeps its marker and detail, because whether a
 * host answered is read off both:
 *   * [404] <https://example.com/gone> (at 48:130) | Rejected status code: 404 Not Found
 *   * [ERROR] <https://example.com/reset> | Network error: Connection reset by peer
 * Redirected links live in a later section and are never failures here.
 *
 * @param {string} content - The markdown content from lychee
 * @returns {{marker: string, url: string, detail: string}[]}
 */
export function parseLycheeFailures(content) {
  const section = extractErrorsSection(content);
  const failures = [];

  const entryPattern =
    /^\s*(?:\*|-)\s+\[([^\]]+)\]\s*<?([^\s>|)]+)>?(?:\s+\(at [^)]*\))?\s*\|?\s*(.*)$/gm;
  let match;
  while ((match = entryPattern.exec(section)) !== null) {
    const marker = match[1].trim();
    const url = match[2].trim().replace(/[.,;!?]+$/, '');
    const detail = match[3].trim();
    if (!url) continue;
    if (failures.some((failure) => failure.url === url)) continue;
    failures.push({ marker, url, detail });
  }

  return failures;
}

/**
 * Split failures by whether asking again could ever change the verdict.
 *
 * A numeric marker ([404]) or a "Rejected status code" detail means the
 * request completed and a host pronounced. A non-http URL (a missing local
 * file, an unresolvable root-relative link) can never answer a probe. Both
 * are final. Everything else -- [ERROR], [TIMEOUT], [UNKNOWN] -- is a
 * statement about one moment on one runner, and is the only kind worth
 * asking again.
 *
 * @param {{marker: string, url: string, detail: string}[]} failures
 * @returns {{final: object[], unanswered: object[]}}
 */
export function classifyFailures(failures) {
  const final = [];
  const unanswered = [];

  for (const failure of failures) {
    const hostAnswered =
      /^\d{3}$/.test(failure.marker) ||
      /rejected status code/i.test(failure.detail);
    const isHttp = /^https?:\/\//i.test(failure.url);
    if (hostAnswered || !isHttp) {
      final.push(failure);
    } else {
      unanswered.push(failure);
    }
  }

  return { final, unanswered };
}

/**
 * Parse a lychee `--accept` list into a set of accepted status codes.
 * Understands `200..=204` (inclusive), `200..204` (exclusive), bare `429`,
 * and stray spaces. A typo throws rather than silently narrowing what
 * "healthy" means.
 * @param {string} spec - e.g. '100..=103,200..=299'
 * @returns {Set<number>}
 */
export function parseAcceptRanges(spec) {
  const accepted = new Set();

  for (const part of spec.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const inclusive = /^(\d+)\.\.=(\d+)$/.exec(trimmed);
    if (inclusive) {
      for (let s = Number(inclusive[1]); s <= Number(inclusive[2]); s++) {
        accepted.add(s);
      }
      continue;
    }

    const exclusive = /^(\d+)\.\.(\d+)$/.exec(trimmed);
    if (exclusive) {
      for (let s = Number(exclusive[1]); s < Number(exclusive[2]); s++) {
        accepted.add(s);
      }
      continue;
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`unrecognised status range in accept list: ${trimmed}`);
    }
    accepted.add(Number(trimmed));
  }

  return accepted;
}

/**
 * Extract the `--accept` list and `--user-agent` the lychee step runs with,
 * so the re-check judges a URL by the same rules the checker used. When the
 * workflow does not set the flags, lychee's documented defaults are
 * returned. A policy test feeds the real workflow through this function so
 * the two cannot drift apart.
 *
 * @param {string} workflowText
 * @returns {[string, string]} [accept, userAgent]
 */
export function extractLycheeRequestOptions(workflowText) {
  const accept = /--accept[=\s]+"?([^\s"']+)/.exec(workflowText ?? '');
  const userAgent = /--user-agent[=\s]+"?([^\s"']+)/.exec(workflowText ?? '');

  return [
    accept?.[1] ?? ACCEPT_DEFAULT,
    userAgent?.[1] ?? USER_AGENT_DEFAULT,
  ];
}

/**
 * Ask one URL once.
 *
 * Three outcomes, kept apart because they are three different claims:
 *   - 'alive'       the host answered with an accepted status
 *   - 'rejected'    the host answered, and the answer is a failure (404, ...)
 *   - 'unreachable' nothing answered: reset, refused, DNS, timeout
 * Only 'alive' clears a link. 'rejected' is final and ends the retries -- a
 * host that says 404 will say it again. 'unreachable' is worth another try.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs]
 * @param {Set<number>} [options.accept]
 * @param {string} [options.userAgent]
 * @returns {Promise<{outcome: 'alive'|'rejected'|'unreachable', detail: string}>}
 */
export async function probe(url, options = {}) {
  const {
    fetchImpl = fetch,
    timeoutMs = 20000,
    accept = parseAcceptRanges(ACCEPT_DEFAULT),
    userAgent = USER_AGENT_DEFAULT,
  } = options;

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });

    // Nothing here reads the body; releasing it keeps the connection from
    // being held open for the rest of the run.
    await response.body?.cancel?.().catch(() => {});

    return accept.has(response.status)
      ? { outcome: 'alive', detail: `HTTP ${response.status}` }
      : { outcome: 'rejected', detail: `HTTP ${response.status}` };
  } catch (error) {
    return {
      outcome: 'unreachable',
      detail:
        error.name === 'AbortError'
          ? `no response within ${Math.round(timeoutMs / 1000)}s`
          : error.message,
    };
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/**
 * Re-check every URL, one full round at a time.
 *
 * Round-robin rather than URL-by-URL: under a total budget, a first answer
 * for every link is worth more than a third attempt at the first link. It
 * also spaces each URL's own attempts a whole round apart, which is the
 * point -- a burst of resets is outlasted by asking later, not by asking
 * again immediately.
 *
 * @param {string[]} urls
 * @param {object} [options] - Injectable clock, sleep and fetch, for tests
 * @returns {Promise<Map<string, {outcome: string, detail: string, attempts: number}>>}
 */
export async function recheckAll(urls, options = {}) {
  const {
    fetchImpl = fetch,
    attempts = 3,
    waitMs = 5000,
    timeoutMs = 20000,
    budgetMs = 180000,
    now = () => Date.now(),
    sleep = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms)),
    accept = parseAcceptRanges(ACCEPT_DEFAULT),
    userAgent = USER_AGENT_DEFAULT,
    log = () => {},
  } = options;

  const started = now();
  const unique = [...new Set(urls)];
  const results = new Map(
    unique.map((url) => [
      url,
      {
        outcome: 'unreachable',
        detail: 'the re-check budget ran out before this URL was asked',
        attempts: 0,
      },
    ])
  );

  let pending = [...unique];

  for (let round = 1; round <= attempts && pending.length > 0; round += 1) {
    if (round > 1) {
      await sleep(waitMs * 2 ** (round - 2));
    }

    const stillPending = [];
    for (const url of pending) {
      if (now() - started >= budgetMs) {
        stillPending.push(url);
        continue;
      }

      const result = await probe(url, {
        fetchImpl,
        timeoutMs,
        accept,
        userAgent,
      });
      const record = results.get(url);
      record.outcome = result.outcome;
      record.detail = result.detail;
      record.attempts = round;
      log(`  attempt ${round}: ${url} -> ${result.outcome} (${result.detail})`);

      if (result.outcome === 'unreachable') {
        stillPending.push(url);
      }
    }
    pending = stillPending;

    // Once the budget is gone, every later round is a sleep followed by the
    // same expired check; stop instead of burning the doubling waits.
    if (now() - started >= budgetMs) {
      break;
    }
  }

  return results;
}

/**
 * @param {string} name - Environment variable name
 * @param {number} fallback - Value to use when unset or unparseable
 * @returns {number}
 */
function numericEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Write output to GitHub Actions output file
 * @param {string} name - Output name
 * @param {string} value - Output value
 */
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
  console.log(`${name}=${value}`);
}

/**
 * Read the report, re-check what deserves it, and set the outputs.
 *
 * Exported so a test can drive the whole path -- parse, classify, probe,
 * annotate, write -- rather than only its parts.
 *
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl] - Injectable for tests
 */
export async function main({ fetchImpl = fetch } = {}) {
  const lycheeOutput = process.env.LYCHEE_OUTPUT || 'lychee/out.md';
  const recoveredOutput =
    process.env.RECOVERED_OUTPUT || 'lychee/recovered.txt';
  const verbose = process.env.RECHECK_VERBOSE === '1';

  console.log('=== Re-check of links that never got an answer ===\n');
  console.log(`Reading lychee output from: ${lycheeOutput}\n`);

  // Nothing is recovered until it is proven recovered, so every early
  // return reports 'false': the absence of a report is not evidence of a
  // working link.
  if (!existsSync(lycheeOutput)) {
    console.log('No lychee output file found; nothing to re-check.');
    setOutput('all_recovered', 'false');
    setOutput('recovered', '0');
    setOutput('remaining', '0');
    return;
  }

  const workflowPath = fileURLToPath(
    new URL('../.github/workflows/links.yml', import.meta.url)
  );
  const workflowText = existsSync(workflowPath)
    ? readFileSync(workflowPath, 'utf-8')
    : '';
  const [accept, userAgent] = extractLycheeRequestOptions(workflowText);

  const failures = parseLycheeFailures(readFileSync(lycheeOutput, 'utf-8'));
  const { final, unanswered } = classifyFailures(failures);

  console.log(
    `lychee reported ${failures.length} failing link(s): ` +
      `${final.length} with a final verdict (a status code, or no http URL ` +
      `to ask), ${unanswered.length} that no host ever answered.\n`
  );

  for (const failure of final) {
    console.log(`  [${failure.marker}] ${failure.url} -- not re-checked`);
  }

  if (unanswered.length === 0) {
    console.log('\nRe-check: nothing to re-ask.');
    setOutput('all_recovered', 'false');
    setOutput('recovered', '0');
    setOutput('remaining', String(final.length));
    return;
  }

  console.log(
    `\nRe-asking ${unanswered.length} link(s) directly ` +
      `(accept: ${accept}, user agent: ${userAgent})...\n`
  );

  const results = await recheckAll(
    unanswered.map((failure) => failure.url),
    {
      fetchImpl,
      attempts: numericEnv('RECHECK_ATTEMPTS', 3),
      waitMs: numericEnv('RECHECK_WAIT_SECONDS', 5) * 1000,
      timeoutMs: numericEnv('RECHECK_TIMEOUT_SECONDS', 20) * 1000,
      budgetMs: numericEnv('RECHECK_BUDGET_SECONDS', 180) * 1000,
      accept: parseAcceptRanges(accept),
      userAgent,
      log: verbose ? (line) => console.log(line) : () => {},
    }
  );

  const recovered = [];
  const stillFailing = [];
  for (const failure of unanswered) {
    const result = results.get(failure.url);
    if (result.outcome === 'alive') {
      recovered.push({ ...failure, result });
    } else {
      stillFailing.push({ ...failure, result });
    }
  }

  console.log('\n=== Re-check summary ===\n');

  for (const { url, detail, result } of recovered) {
    console.log(`✓ ${url} answered ${result.detail} on attempt ${result.attempts}`);
    console.log(
      `::notice title=Link answered on re-check::` +
        `${url} answered ${result.detail} when asked directly, after lychee ` +
        `reported it as "${detail || 'failed with no status code'}".\n` +
        `A connect-phase reset carries no status code, so lychee cannot ` +
        `accept it -- and does not retry it either (lycheeverse/lychee#2297). ` +
        `This link is not treated as broken.`
    );
  }

  for (const { url, detail, result } of stillFailing) {
    console.log(
      `✗ ${url} still failing: ${result.detail} after ${result.attempts} ` +
        `direct attempt(s) (lychee: ${detail || 'no detail'})`
    );
  }

  if (recovered.length > 0) {
    mkdirSync(dirname(recoveredOutput), { recursive: true });
    writeFileSync(
      recoveredOutput,
      recovered.map(({ url }) => url).join('\n') + '\n'
    );
    console.log(`\nRecovered URLs written to ${recoveredOutput}`);
  }

  // A recovered link drops out of `remaining`; an answered or non-http
  // failure never left it. So 'true' means nothing lychee reported is left
  // at all -- the run failed on transport and nothing else.
  const remaining = final.length + stillFailing.length;
  setOutput('all_recovered', remaining === 0 ? 'true' : 'false');
  setOutput('recovered', String(recovered.length));
  setOutput('remaining', String(remaining));

  if (remaining === 0) {
    console.log(
      '\nEvery link lychee reported answered a direct request. ' +
        'The failure was transport, not a broken link.'
    );
  }
}

// Only run when executed directly, so the unit tests can import the parsers.
const entryPath = process.argv[1];
const invokedDirectly =
  typeof entryPath === 'string' &&
  entryPath.length > 0 &&
  import.meta.url === pathToFileURL(resolve(entryPath)).href;

if (invokedDirectly) {
  main().catch((error) => {
    // The re-check only ever downgrades failures, so a crash must not pose
    // as a verdict: exit 0, and the consumers' `!= 'true'` gates treat the
    // unset output as not recovered.
    console.error('Re-check crashed (treating as no recovery):', error);
  });
}
