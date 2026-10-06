<?php

declare(strict_types=1);

/**
 * Re-check the lychee failures where no host ever answered (issue #12).
 *
 * lychee's --max-retries cannot retry a connection reset during connect
 * (lycheeverse/lychee#2297), so a healthy URL that answers a RST -- a normal
 * event for a rate-limiting host seen from a CI address range -- is reported
 * as broken without a single retry. This script asks those URLs again,
 * outside lychee. A failure carrying a status code means a host answered,
 * and that answer is final: a 404 is never re-checked.
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
 *   all_recovered          'true' when every unanswered link answered healthy
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
    $unanswered = [];

    foreach ($failures as $failure) {
        $isHttp = preg_match('#^https?://#i', $failure->url) === 1;

        if ($failure->answered || !$isHttp) {
            $final[] = $failure;
        } else {
            $unanswered[] = $failure->url;
        }
    }

    echo sprintf(
        'Re-check: %d lychee failure(s), %d answered and final, %d never got an answer%s',
        count($failures),
        count($final),
        count($unanswered),
        "\n",
    );

    if ($unanswered === []) {
        echo "Re-check: nothing to re-ask.\n";
        exit(0);
    }

    $result = (new LinkRecheck())->recheckUnanswered(
        $unanswered,
        $accept,
        $userAgent,
        $budgetSeconds,
        $initialWaitMs,
    );

    foreach ($result['recovered'] as $url) {
        Actions::notice("{$url} never answered lychee but answers {$accept} now -- not a broken link");
    }

    if ($result['recovered'] !== []) {
        file_put_contents($recoveredOutput, implode("\n", $result['recovered']) . "\n");
    }

    echo sprintf(
        'Re-check finished: %d recovered, %d still without an answer%s',
        count($result['recovered']),
        count($result['still_broken']),
        "\n",
    );

    if (
        $result['still_broken'] === []
        && count($result['recovered']) === count($unanswered)
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
