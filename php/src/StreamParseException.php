<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

/** A canonical parser error located relative to the complete input stream. */
class StreamParseException extends ParseException
{
    public function __construct(
        public readonly ParseException $parseError,
        public readonly int $offset,
        public readonly int $line,
        public readonly int $column
    ) {
        parent::__construct(
            "Stream parse error at line {$line}, column {$column}: {$parseError->getMessage()}",
            previous: $parseError
        );
    }
}
