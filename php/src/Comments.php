<?php

/**
 * Comments, and the rule that decides where one starts.
 *
 * `#` starts a comment when it opens a token and is not a value:
 *
 * - at the start of a line, after any indentation, a `#` always starts one;
 * - later on a line, after a space or a tab, a `#` starts one only when no
 *   character that could continue a bare reference follows it, that is when
 *   whitespace, the end of the document, `(`, `)` or `:` comes next. So
 *   `a: b # why` and `a: b #` hold a comment, while `tag #release` is the link
 *   of `tag` and `#release` (issue #444): a value is never silently dropped.
 *
 * A `#` written inside a token (`issue#1047`) or inside a delimited reference
 * (`"# not a comment"`) is an ordinary character.
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

    /** @var string Indentation: what may stand between the start of a line and a comment. */
    private const INDENTATION = " \t";

    /**
     * Report whether the `#` at $position of $document starts a comment: it
     * opens a token, and either only indentation stands before it on its line
     * or no character that could continue a bare reference follows it.
     *
     * `opensComment('# note', 0)` and `opensComment('a # why', 2)` are true,
     * as is `opensComment('a #', 2)`; `opensComment('tag #release', 4)` is
     * false, the `#` opening a value, and so is `opensComment('issue#1047', 5)`,
     * the `#` standing inside a token (issue #444).
     */
    public static function opensComment(string $document, int $position): bool
    {
        if (($document[$position] ?? '') !== self::COMMENT) {
            return false;
        }
        if (!self::follows($document, $position, self::BEFORE_COMMENT)) {
            return false;
        }
        $before = $position - 1;
        while ($before >= 0 && str_contains(self::INDENTATION, $document[$before])) {
            $before--;
        }
        if ($before < 0 || $document[$before] === "\n" || $document[$before] === "\r") {
            return true;
        }
        $next = $position + 1;

        return $next >= strlen($document) || str_contains(self::SEPARATORS, $document[$next]);
    }

    /**
     * Return $document with every comment blanked out.
     *
     * The result has the same length as the document it was given. The
     * document is read token by token, the way the parser reads it, so a `#`
     * inside a delimited reference that starts right after a group, another
     * reference or a literal is content, as it is in one that starts after a
     * space (issue #377). A `#` that opens a value later on a line is kept:
     * `tag #release # note` keeps `tag #release` (issue #444).
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

            if ($char === self::COMMENT && self::opensComment($document, $position)) {
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
