<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Pipeline;

/**
 * One failure entry from the lychee markdown report.
 *
 * `answered` is the load-bearing flag: a failure carrying a numeric status
 * marker ([404]) or a "Rejected status code" detail means a host answered,
 * and that answer is final -- a 404 is never re-checked.
 */
final class LycheeFailure
{
    public function __construct(
        public readonly string $marker,
        public readonly string $url,
        public readonly string $detail,
        public readonly bool $answered,
    ) {
    }
}
