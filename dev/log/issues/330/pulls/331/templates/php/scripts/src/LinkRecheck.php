<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Pipeline;

/**
 * Re-checks the lychee failures where no host ever answered (issue #12).
 *
 * lychee's `--max-retries` cannot retry a connection reset during connect
 * (lycheeverse/lychee#2297: the error is classified by its phase, and the
 * connect phase is answered `false`), so a healthy URL that answers a RST --
 * a normal event for a rate-limiting or load-shedding host seen from a CI
 * address range -- is reported as broken without a single retry. This class
 * asks those URLs again, outside lychee, with a round-robin doubling wait
 * inside a wall-clock budget.
 *
 * The rule that keeps this from hiding real breakage: a failure carrying a
 * status code means a host answered, and that answer is final -- a 404 is
 * never re-checked.
 */
final class LinkRecheck
{
    public const ACCEPT_DEFAULT = '100..=103,200..=299';
    public const USER_AGENT_DEFAULT = 'lychee';

    /** @var callable(string, string): int */
    private $fetch;

    /**
     * @param (callable(string, string): int)|null $fetch HEADs one URL and
     *                                             returns its final status;
     *                                             throws when no host
     *                                             answered. Injectable so
     *                                             tests run without network.
     */
    public function __construct(?callable $fetch = null)
    {
        $this->fetch = $fetch ?? self::defaultFetch();
    }

    /**
     * Split the report into failures, marking the answered ones final.
     *
     * A failure is "answered" when a numeric status marker is present ([404])
     * or the detail says "Rejected status code" -- a host answered, and the
     * answer is final. Everything else ([ERROR], [TIMEOUT], [UNKNOWN]) is a
     * failure where no host ever answered.
     *
     * @return list<LycheeFailure>
     */
    public static function parseLycheeFailures(string $content): array
    {
        preg_match_all(
            '#^\s*[*-]\s+\[([^\]]+)\]\s*<?([^\s>|)]+)>?(?:\s+\(at [^)]*\))?\s*\|?\s*(.*)$#m',
            $content,
            $matches,
            PREG_SET_ORDER,
        );

        $failures = [];

        foreach ($matches as $set) {
            $marker = trim($set[1]);
            $url = rtrim(trim($set[2]), '.,;!?');
            $detail = trim($set[3]);

            if ($url === '') {
                continue;
            }

            $failures[] = new LycheeFailure(
                $marker,
                $url,
                $detail,
                preg_match('/^\d{3}$/', $marker) === 1
                    || stripos($detail, 'rejected status code') !== false,
            );
        }

        return $failures;
    }

    /**
     * Build an "is this status accepted" predicate from a lychee --accept
     * list.
     *
     * Accepts the lychee syntax `100..=103,200..=299,429` with stray spaces.
     *
     * @return callable(int): bool
     */
    public static function parseAcceptRanges(string $spec): callable
    {
        $accepted = [];

        foreach (explode(',', $spec) as $part) {
            $trimmed = trim($part);

            if ($trimmed === '') {
                continue;
            }

            if (preg_match('/^(\d+)\.\.=(\d+)$/', $trimmed, $range) === 1) {
                for ($status = (int) $range[1]; $status <= (int) $range[2]; ++$status) {
                    $accepted[$status] = true;
                }
            } elseif (preg_match('/^\d{3}$/', $trimmed) === 1) {
                $accepted[(int) $trimmed] = true;
            }
        }

        return static fn (int $status): bool => isset($accepted[$status]);
    }

    /**
     * Extract the --accept list and --user-agent the lychee step runs with.
     *
     * The re-check must judge a URL by the same rules the checker used, so a
     * link lychee would have accepted is accepted here too. When the workflow
     * does not set the flags, lychee's documented defaults are returned.
     *
     * @return array{string, string}
     */
    public static function extractLycheeRequestOptions(string $workflowText): array
    {
        preg_match('/--accept[=\s]+"?([^\s"\']+)"?/', $workflowText, $accept);
        preg_match('/--user-agent[=\s]+"?([^\s"\']+)"?/', $workflowText, $userAgent);

        return [
            $accept[1] ?? self::ACCEPT_DEFAULT,
            $userAgent[1] ?? self::USER_AGENT_DEFAULT,
        ];
    }

    /**
     * Partition already-extracted broken URLs into the ones still to look up
     * and the ones the re-check found healthy.
     *
     * A URL that never answered lychee but answers the re-check is not a
     * broken link; keeping it in the archive report would send a healthy URL
     * to the Wayback Machine and fail the job on it.
     *
     * @param list<string> $urls
     * @return array{remaining: list<string>, recovered: list<string>}
     */
    public static function splitRecoveredUrls(array $urls, string $recoveredText): array
    {
        $recoveredSet = [];

        foreach (explode("\n", $recoveredText) as $line) {
            $trimmed = trim($line);

            if ($trimmed !== '') {
                $recoveredSet[$trimmed] = true;
            }
        }

        $remaining = [];
        $recovered = [];

        foreach ($urls as $url) {
            if (isset($recoveredSet[$url])) {
                $recovered[] = $url;
            } else {
                $remaining[] = $url;
            }
        }

        return ['remaining' => $remaining, 'recovered' => $recovered];
    }

    /**
     * Ask every URL once more, round-robin with a doubling wait.
     *
     * Runs until everything either answers accepted or the budget runs out.
     * Any answer is final: an accepted status recovers the URL, a rejected
     * status fails it for good, and only a URL that keeps refusing to answer
     * is retried.
     *
     * @param list<string> $urls
     * @return array{recovered: list<string>, still_broken: list<array{url: string, status: int|null, reason: string}>}
     */
    public function recheckUnanswered(
        array $urls,
        string $accept,
        string $userAgent,
        float $budgetSeconds = 240.0,
        float $initialWaitMs = 2000.0,
    ): array {
        $isAccepted = self::parseAcceptRanges($accept);
        $deadline = hrtime(true) + (int) ($budgetSeconds * 1e9);
        $waitMs = $initialWaitMs;

        $recovered = [];
        $rejected = [];
        $pending = array_values(array_unique($urls));

        while ($pending !== [] && hrtime(true) < $deadline) {
            if ($waitMs !== $initialWaitMs) {
                if (hrtime(true) + (int) ($waitMs * 1e6) > $deadline) {
                    break;
                }

                usleep((int) ($waitMs * 1000));
                $waitMs *= 2;
            }

            $stillPending = [];

            foreach ($pending as $url) {
                try {
                    $status = ($this->fetch)($url, $userAgent);
                } catch (\Throwable) {
                    // No answer this round, whatever the cause.
                    $stillPending[] = $url;

                    continue;
                }

                if ($isAccepted($status)) {
                    $recovered[] = $url;
                } else {
                    $rejected[] = [
                        'url' => $url,
                        'status' => $status,
                        'reason' => "answered {$status}, which lychee does not accept",
                    ];
                }
            }

            $pending = $stillPending;
        }

        foreach ($pending as $url) {
            $rejected[] = [
                'url' => $url,
                'status' => null,
                'reason' => 'no answer within the re-check budget',
            ];
        }

        return ['recovered' => $recovered, 'still_broken' => $rejected];
    }

    /**
     * @return callable(string, string): int
     */
    private static function defaultFetch(): callable
    {
        return static function (string $url, string $userAgent): int {
            $context = stream_context_create([
                'http' => [
                    'method' => 'HEAD',
                    // Follows redirects like lychee; a rejected status (4xx/5xx)
                    // arrives as a status, which is a host's answer, not a
                    // transport failure.
                    'ignore_errors' => true,
                    'timeout' => 30,
                    'header' => "User-Agent: {$userAgent}",
                ],
            ]);

            // PHP populates $http_response_header in the local scope after
            // the request; seed it so a failed request yields no status.
            $http_response_header = [];
            @file_get_contents($url, false, $context);

            $status = 0;

            // Redirect chains leave every hop's status line here; the last
            // one is the final answer.
            foreach ($http_response_header as $header) {
                if (preg_match('#^HTTP/\S+\s+(\d+)#', $header, $m) === 1) {
                    $status = (int) $m[1];
                }
            }

            if ($status === 0) {
                throw new \RuntimeException("no answer from {$url}");
            }

            return $status;
        };
    }
}
