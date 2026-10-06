<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** Work budgets applied to decoding and encoding. */
final readonly class DecodeLimits
{
    public function __construct(
        public int $maxLinks = 1 << 22,
        public int $maxReferences = 1 << 24,
        public int $maxNodes = 1 << 22,
        public int $maxStringBytes = 64 << 20,
        public int $maxDepth = 64,
    ) {
        foreach (get_object_vars($this) as $value) {
            UInt64::require($value >= 0, "negative limit");
        }
    }
    public static function unlimited(): self
    {
        return new self(PHP_INT_MAX, PHP_INT_MAX, PHP_INT_MAX, PHP_INT_MAX, PHP_INT_MAX);
    }
}
