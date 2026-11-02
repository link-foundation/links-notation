<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Pipeline;

/**
 * One result of a release-preflight probe.
 *
 * A check is `verified` (the precondition holds), `failed` (a registry or host
 * gave a definitive negative answer) or `unknown` (nobody answered, or the
 * answer was a rate limit / server error -- never guessed into either of the
 * other two).
 */
final class PreflightCheck
{
    public const VERIFIED = 'verified';
    public const FAILED = 'failed';
    public const UNKNOWN = 'unknown';

    public function __construct(
        public readonly string $name,
        public readonly string $status,
        public readonly string $detail,
    ) {
    }
}
