<?php

/**
 * Builds the concrete syntax tree of a Links Notation document.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

/**
 * Builds the concrete syntax tree of a document that has already been parsed.
 *
 * The tokens are read with the same rules the parser uses, so the tree and the
 * parsed links agree: comments are found by Comments::stripComments(),
 * delimited references by Parser::readDelimitedReference() and versioned
 * literals by ReferenceLiteral::end() and ReferenceLiteral::decode(). Use
 * Parser::parseCst(), which parses the document first.
 */
final class CstBuilder
{
    /** What ends a bare reference. */
    private const BARE_REFERENCE_END = " \t\r\n(:)";

    private function __construct()
    {
    }

    /**
     * The concrete syntax tree of $input.
     *
     * @param string $input    The document as written
     * @param bool   $comments Whether `#` starts a comment
     * @return CstNode The `document` node
     *
     * @throws ParseException If the parentheses of $input are unbalanced
     */
    public static function build(string $input, bool $comments = true): CstNode
    {
        // Comments are found, and bare references end, in the document with
        // its comments blanked, which keeps every position of the one written.
        $prepared = $comments ? Comments::stripComments($input) : $input;
        $document = new CstNode(CstKind::DOCUMENT);
        // The open containers, innermost last, each with the line being filled.
        $containers = [[$document, null]];

        $add = static function (CstNode $token) use (&$containers): void {
            $innermost = count($containers) - 1;
            if ($containers[$innermost][1] === null) {
                $line = new CstNode(CstKind::LINE);
                $containers[$innermost][0]->children[] = $line;
                $containers[$innermost][1] = $line;
            }
            $containers[$innermost][1]->children[] = $token;
        };

        $length = strlen($input);
        $position = 0;
        while ($position < $length) {
            $character = $input[$position];
            $end = $position + 1;

            if ($comments && $character === Comments::COMMENT && $prepared[$position] !== Comments::COMMENT) {
                // A blanked `#` opens a comment, which runs to the line ending.
                $end = $position + strcspn($input, "\r\n", $position);
                $add(self::token(CstKind::COMMENT, $input, $position, $end));
            } elseif ($character === "\r" || $character === "\n") {
                if ($character === "\r" && ($input[$end] ?? '') === "\n") {
                    $end++;
                }
                $add(self::token(CstKind::NEWLINE, $input, $position, $end));
                $containers[count($containers) - 1][1] = null;
            } elseif ($character === ' ' || $character === "\t") {
                $end = $position + strspn($input, " \t", $position);
                $add(self::token(CstKind::WHITESPACE, $input, $position, $end));
            } elseif ($character === '(') {
                $group = new CstNode(
                    CstKind::GROUP,
                    children: [self::token(CstKind::OPEN_PAREN, $input, $position, $end)]
                );
                $add($group);
                $containers[] = [$group, null];
            } elseif ($character === ')') {
                if (count($containers) === 1) {
                    throw new ParseException('Unbalanced ")" at offset ' . $position);
                }
                [$group] = array_pop($containers);
                $group->children[] = self::token(CstKind::CLOSE_PAREN, $input, $position, $end);
            } elseif ($character === ':') {
                $add(self::token(CstKind::COLON, $input, $position, $end));
            } else {
                $add(self::reference($input, $prepared, $position, $end));
            }
            $position = $end;
        }

        if (count($containers) !== 1) {
            throw new ParseException('Unbalanced "(" at the end of the document');
        }

        return $document;
    }

    /**
     * The token of $kind written from $start up to $end.
     */
    private static function token(string $kind, string $input, int $start, int $end): CstNode
    {
        return new CstNode($kind, substr($input, $start, $end - $start));
    }

    /**
     * The reference that starts at $start, read as the parser reads it; $end
     * is set to where it ends.
     *
     * A literal and a delimited reference are read in the document as
     * written, so a comment never changes what they hold (issue #377); only
     * the end of a bare reference is found in the blanked document.
     */
    private static function reference(string $input, string $prepared, int $start, int &$end): CstNode
    {
        $first = $input[$start];

        $literalEnd = ReferenceLiteral::end($input, $start);
        if ($literalEnd >= 0) {
            $end = $literalEnd;
            $text = substr($input, $start, $end - $start);

            return new CstNode(CstKind::REFERENCE, $text, value: ReferenceLiteral::decode($text));
        }

        if ($first === '"' || $first === "'" || $first === '`') {
            $quoted = Parser::readDelimitedReference($input, $start);
            if ($quoted !== null) {
                [$value, $end] = $quoted;

                return new CstNode(
                    CstKind::REFERENCE,
                    substr($input, $start, $end - $start),
                    value: $value,
                    quote: $first
                );
            }
        }

        $end = $start + 1 + strcspn($prepared, self::BARE_REFERENCE_END, $start + 1);
        $text = substr($input, $start, $end - $start);

        return new CstNode(CstKind::REFERENCE, $text, value: $text);
    }
}
