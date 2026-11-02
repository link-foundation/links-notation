<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Pipeline;

/**
 * One failure entry from the lychee markdown report.
 *
 * `answered` distinguishes HTTP responses from transport errors. A 429 or
 * 5xx response is transient; other answered failures remain final.
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

    public function shouldRetry(): bool
    {
        if (preg_match('#^https?://#i', $this->url) !== 1) {
            return false;
        }

        if (!$this->answered) {
            return true;
        }

        $status = (int) $this->marker;
        if (preg_match('/rejected status code:\s*(\d{3})/i', $this->detail, $match) === 1) {
            $status = (int) $match[1];
        }

        return LinkRecheck::isTransientStatus($status);
    }
}
