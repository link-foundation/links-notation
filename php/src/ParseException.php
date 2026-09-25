<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

use Exception;
use Throwable;

/**
 * Exception raised when parsing fails.
 *
 * When the parser knows where the document stopped making sense, the
 * exception carries that position as an offset, a line and a column, and
 * quotes the offending line with a caret under the offending column, the way
 * the other Links Notation implementations do. A document nested deeper than
 * the parser's maxDepth is refused with this exception; then getMaxDepth()
 * says how deep the nesting may go.
 */
class ParseException extends Exception
{
    /** The number of characters a quoted line is cut down to. */
    private const QUOTED_LINE_WIDTH = 80;

    /** What a message writes in place of the part of a long line it left out. */
    private const ELLIPSIS = '...';

    private ?int $documentOffset = null;
    private ?int $documentLine = null;
    private ?int $documentColumn = null;
    private ?string $lineText = null;
    private ?int $maxDepth = null;

    public function __construct(string $message = '', int $code = 0, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }

    /**
     * The exception for a document nested deeper than $maxDepth, pointing at
     * the group or the line that is one level too deep.
     *
     * @param string $document The document being parsed
     * @param int    $offset   Byte offset of the offending position
     * @param int    $maxDepth The deepest nesting the parser accepts
     */
    public static function nestingTooDeep(string $document, int $offset, int $maxDepth): self
    {
        [$offset, $line, $column, $lineText] = self::locate($document, $offset);
        $summary = "line {$line}, column {$column}: nesting depth exceeds the maximum of {$maxDepth}";

        $error = new self("Nesting too deep at {$summary}\n" . self::quote($line, $lineText, $column));
        $error->documentOffset = $offset;
        $error->documentLine = $line;
        $error->documentColumn = $column;
        $error->lineText = $lineText;
        $error->maxDepth = $maxDepth;

        return $error;
    }

    /** Byte offset of the offending position from the start of the document, when known. */
    public function getOffset(): ?int
    {
        return $this->documentOffset;
    }

    /**
     * Line of the document the offending position is on, counted from 1, when
     * known. (Exception::getLine() is the line of PHP source that threw.)
     */
    public function getLineNumber(): ?int
    {
        return $this->documentLine;
    }

    /** Column the offending position is at, in characters, counted from 1, when known. */
    public function getColumn(): ?int
    {
        return $this->documentColumn;
    }

    /** The offending line, as written, without its line ending, when known. */
    public function getLineText(): ?string
    {
        return $this->lineText;
    }

    /** The offending line with a caret under the offending column, when known. */
    public function getSnippet(): ?string
    {
        if ($this->documentLine === null || $this->documentColumn === null || $this->lineText === null) {
            return null;
        }

        return self::quote($this->documentLine, $this->lineText, $this->documentColumn);
    }

    /**
     * The deepest nesting allowed, when the document is nested deeper; null
     * for any other error.
     */
    public function getMaxDepth(): ?int
    {
        return $this->maxDepth;
    }

    /**
     * Turn an offset into a line, a column and the line itself. CR, LF and
     * CRLF all end a line; the column counts characters, not bytes.
     *
     * @return array{0: int, 1: int, 2: int, 3: string} Offset, line, column and line text
     */
    private static function locate(string $document, int $offset): array
    {
        $offset = max(0, min($offset, strlen($document)));
        $line = 1;
        $lineStart = 0;
        $cursor = 0;
        while ($cursor < $offset) {
            $char = $document[$cursor];
            $cursor++;
            if ($char === "\r") {
                if ($cursor < $offset && $document[$cursor] === "\n") {
                    $cursor++;
                }
            } elseif ($char !== "\n") {
                continue;
            }
            $line++;
            $lineStart = $cursor;
        }

        $column = mb_strlen(substr($document, $lineStart, $offset - $lineStart), 'UTF-8') + 1;
        $lineLength = strcspn($document, "\r\n", $lineStart);
        $lineText = substr($document, $lineStart, $lineLength);

        return [$offset, $line, $column, $lineText];
    }

    /**
     * The offending line with a caret under the offending column, quoted the
     * way a compiler quotes source. A long line is shown as a window around
     * the caret, so the message stays the same size however long the line is.
     */
    private static function quote(int $number, string $lineText, int $column): string
    {
        [$quoted, $at] = self::windowAround($lineText, $column);
        $gutter = str_repeat(' ', strlen((string) $number));

        return "{$number} | {$quoted}\n{$gutter} | " . str_repeat(' ', $at - 1) . '^';
    }

    /**
     * Cut a line down to a window around the given column, and say which
     * column the offending character sits at in that window. Both columns
     * count from 1.
     *
     * @return array{0: string, 1: int}
     */
    private static function windowAround(string $lineText, int $column): array
    {
        $length = mb_strlen($lineText, 'UTF-8');
        if ($length <= self::QUOTED_LINE_WIDTH) {
            return [$lineText, $column];
        }

        $target = $column - 1;
        $lastStart = $length - self::QUOTED_LINE_WIDTH;
        $start = min(max($target - intdiv(self::QUOTED_LINE_WIDTH, 2), 0), $lastStart);
        $end = $start + self::QUOTED_LINE_WIDTH;

        $quoted = ($start > 0 ? self::ELLIPSIS : '')
            . mb_substr($lineText, $start, self::QUOTED_LINE_WIDTH, 'UTF-8')
            . ($end < $length ? self::ELLIPSIS : '');
        $shift = $start > 0 ? strlen(self::ELLIPSIS) : 0;

        return [$quoted, $target - $start + $shift + 1];
    }
}
