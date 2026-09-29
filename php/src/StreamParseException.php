<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

/**
 * A canonical parser error located relative to the complete input stream.
 *
 * $parseError is the exception the parser threw for the buffered record;
 * getOffset(), getLineNumber() and getColumn() locate it within the complete
 * stream.
 */
class StreamParseException extends ParseException
{
    public function __construct(
        public readonly ParseException $parseError,
        int $offset,
        int $line,
        int $column
    ) {
        // The position is not kept in promoted properties: Exception::$line,
        // the line of PHP source that threw, cannot be redeclared readonly.
        parent::__construct(
            "Stream parse error at line {$line}, column {$column}: {$parseError->getMessage()}",
            previous: $parseError
        );
        $this->setPosition($offset, $line, $column, $parseError->getLineText(), $parseError->getMaxDepth());
    }
}
