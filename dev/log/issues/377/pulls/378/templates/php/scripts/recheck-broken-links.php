<?php

declare(strict_types=1);

/**
 * Re-check transport failures, 429 and 5xx responses (issues #12, #18).
 *
 * lychee's --max-retries cannot retry a connection reset during connect
 * (lycheeverse/lychee#2297), so a healthy URL that answers a RST -- a normal
 * event for a rate-limiting host seen from a CI address range -- is reported
 * as broken without a single retry. This script asks those URLs again,
 * outside lychee. Transient HTTP responses also need retries: lychee does
 * not retry rejected 5xx statuses. Other HTTP failures, including 404, stay
 * final. Persistent transient failures still fail the workflow.
 *
 * Environment:
 *   LYCHEE_OUTPUT          path to the lychee markdown report (default
 *                          lychee/out.md)
 *   RECOVERED_OUTPUT       where to write the URLs the re-check found healthy
 *                          (default lychee/recovered.txt)
 *   RECHECK_BUDGET_SECONDS total wall-clock budget (default 240; must expire
 *                          before the job's 10-minute cap)
 *   RECHECK_WAIT_MS        initial wait between rounds; doubles every round
 *                          (default 2000)
 *
 * GitHub Actions outputs:
 *   all_recovered          'true' when every failed link answered healthy
 *                          on re-check. Consumers must test `!= 'true'`,
 *                          never `== 'false'`: a skipped or crashed step
 *                          leaves the output empty, and only the `!=` form
 *                          fails safe.
 *
 * Exit codes: 0 in every case. This script downgrades failures; it never
 * raises them, so a bug here cannot turn a green run red.
 */

require_once __DIR__ . '/bootstrap.php';

use LinkFoundation\Template\Pipeline\Actions;
use LinkFoundation\Template\Pipeline\LinkRecheck;

try {
    $lycheeOutput = getenv('LYCHEE_OUTPUT') ?: 'lychee/out.md';
    $recoveredOutput = getenv('RECOVERED_OUTPUT') ?: 'lychee/recovered.txt';
    $budgetSeconds = (float) (getenv('RECHECK_BUDGET_SECONDS') ?: 240);
    $initialWaitMs = (float) (getenv('RECHECK_WAIT_MS') ?: 2000);

    $workflowPath = __DIR__ . '/../.github/workflows/links.yml';
    $workflowText = is_file($workflowPath) ? (string) file_get_contents($workflowPath) : '';
    [$accept, $userAgent] = LinkRecheck::extractLycheeRequestOptions($workflowText);

    $failures = LinkRecheck::parseLycheeFailures((string) file_get_contents($lycheeOutput));

    $final = [];
    $retryable = [];

    foreach ($failures as $failure) {
        if ($failure->shouldRetry()) {
            $retryable[] = $failure->url;
        } else {
            $final[] = $failure;
        }
    }

    echo sprintf(
        'Re-check: %d lychee failure(s), %d final, %d transient or unanswered%s',
        count($failures),
        count($final),
        count($retryable),
        "\n",
    );

    if ($retryable === []) {
        echo "Re-check: nothing to re-ask.\n";
        exit(0);
    }

    $result = (new LinkRecheck())->recheckUnanswered(
        array_values(array_unique($retryable)),
        $accept,
        $userAgent,
        $budgetSeconds,
        $initialWaitMs,
    );

    foreach ($result['recovered'] as $url) {
        Actions::notice("{$url} answers {$accept} on re-check -- not a broken link");
    }

    if ($result['recovered'] !== []) {
        file_put_contents($recoveredOutput, implode("\n", $result['recovered']) . "\n");
    }

    echo sprintf(
        'Re-check finished: %d recovered, %d still failing%s',
        count($result['recovered']),
        count($result['still_broken']),
        "\n",
    );

    if (
        $failures !== [] && $final === [] && $result['still_broken'] === []
        && count($result['recovered']) === count(array_unique($retryable))
    ) {
        Actions::setBoolOutput('all_recovered', true);
    }

    exit(0);
} catch (\Throwable $error) {
    // The re-check only ever downgrades failures, so any crash here must not
    // mask itself as a verdict: exit 0 in every case.
    echo 'Re-check crashed (treating as no recovery): ' . $error->getMessage() . "\n";
    exit(0);
}
