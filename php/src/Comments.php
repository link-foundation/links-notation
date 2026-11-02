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

    /**
     * @var string What ends a bare reference. A token starts after one of
     *             these, at the start of the document, and right after a
     *             delimited reference or a versioned literal: the places the
     *             parser reads a reference from.
     */
    public const SEPARATORS = " \t\n\r(:)";

    /** @var string What a comment may start after. */
    private const BEFORE_COMMENT = " \t\n\r";

    /**
     * Return $document with every comment blanked out.
     *
     * The result has the same length as the document it was given. The
     * document is read token by token, the way the parser reads it, so a `#`
     * inside a delimited reference that starts right after a group, another
     * reference or a literal is content, as it is in one that starts after a
     * space (issue #377).
     */
    public static function stripComments(string $document): string
    {
        $blanked = null;
        $position = 0;
        $length = strlen($document);
        // Whether a token may start at $position.
        $tokenStart = true;

        while ($position < $length) {
            $char = $document[$position];

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

            if (str_contains(self::SEPARATORS, $char)) {
                $tokenStart = true;
                $position++;
                continue;
            }

            if ($tokenStart) {
                $end = self::delimitedTokenEnd($document, $position);
                if ($end >= 0) {
                    $position = $end;
                    continue;
                }
            }

            // Anything else is part of a bare reference, which runs to a separator.
            $tokenStart = false;
            $position++;
        }

        return $blanked ?? $document;
    }

    /**
     * Find where the versioned literal or delimited reference that starts the
     * token at $start ends.
     *
     * @return int The position right after it, or -1 when the token there is
     *             a bare reference: a delimiter run that never closes is read
     *             as one, as the parser reads it
     */
    private static function delimitedTokenEnd(string $document, int $start): int
    {
        $end = ReferenceLiteral::end($document, $start);
        if ($end >= 0) {
            return $end;
        }
        if (self::isQuote($document[$start])) {
            return Parser::quotedReferenceEnd($document, $start);
        }

        return -1;
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
