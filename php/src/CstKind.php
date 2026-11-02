<?php

/**
 * The kinds of nodes and tokens of a concrete syntax tree.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

/**
 * The kinds of nodes and tokens of a concrete syntax tree (see CstNode).
 *
 * `document`, `line` and `group` are nodes with children; every other kind is a
 * token with text.
 */
final class CstKind
{
    /** The whole document: its lines. */
    public const DOCUMENT = 'document';

    /** One line: its tokens and groups, up to and including its line ending. */
    public const LINE = 'line';

    /** A parenthesized group: `(`, the lines inside it, and `)`. */
    public const GROUP = 'group';

    /** A run of spaces and tabs. */
    public const WHITESPACE = 'whitespace';

    /** One line ending: `\n`, `\r\n` or `\r`. */
    public const NEWLINE = 'newline';

    /** A comment, from `#` up to the line ending. */
    public const COMMENT = 'comment';

    /** `(` */
    public const OPEN_PAREN = 'open_paren';

    /** `)` */
    public const CLOSE_PAREN = 'close_paren';

    /** `:` */
    public const COLON = 'colon';

    /** A bare, quoted or versioned literal reference. */
    public const REFERENCE = 'reference';

    /** The kinds that are nodes with children rather than tokens. */
    public const NODES = [self::DOCUMENT, self::LINE, self::GROUP];

    private function __construct()
    {
    }
}
