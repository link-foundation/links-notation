<?php

/**
 * Comments, and the rule that decides where one starts.
 *
 * `#` starts a comment when it opens a token: at the start of the document or
 * after a space, a tab or a line break. A `#` written inside a token
 * (`issue#1047`) or inside a delimited reference (`"# not a comment"`) is an
 * ordinary character.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

/**
 * Blanks the comments of a document.
 *
 * Every character of every comment is replaced by a space rather than removed,
 * so every later character keeps the position it had in the document the caller
 * wrote, and anything the parser reports about a position still points at what
 * the reader can see.
 */
class Comments
{
    /** @var string The character that starts a comment. */
    public const COMMENT = '#';

    /** @var string What a delimited reference may start after. */
    private const BEFORE_REFERENCE = " \t\n\r(:";

    /** @var string What a comment may start after. */
    private const BEFORE_COMMENT = " \t\n\r";

    /**
     * Return $document with every comment blanked out.
     *
     * The result has the same length as the document it was given.
     */
    public static function stripComments(string $document): string
    {
        $blanked = null;
        $position = 0;
        $length = strlen($document);

        while ($position < $length) {
            $char = $document[$position];

            if (self::isQuote($char) && self::follows($document, $position, self::BEFORE_REFERENCE)) {
                $end = Parser::quotedReferenceEnd($document, $position);
                $position = $end < 0 ? $position + 1 : $end;
                continue;
            }

            if ($char === self::COMMENT && self::follows($document, $position, self::BEFORE_COMMENT)) {
                if ($blanked === null) {
                    $blanked = $document;
                }
                while ($position < $length && $document[$position] !== "\n" && $document[$position] !== "\r") {
                    $blanked[$position] = ' ';
                    $position++;
                }
                continue;
            }

            $position++;
        }

        return $blanked ?? $document;
    }

    /**
     * Report whether $char is one of the delimiters a reference can be written
     * between.
     */
    private static function isQuote(string $char): bool
    {
        return $char === '"' || $char === "'" || $char === '`';
    }

    /**
     * Report whether the character before $position is one of $allowed, the
     * start of the document counting as allowed.
     */
    private static function follows(string $document, int $position, string $allowed): bool
    {
        return $position === 0 || str_contains($allowed, $document[$position - 1]);
    }
}
