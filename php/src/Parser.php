<?php

/**
 * Parser for Lino notation.
 *
 * This file provides parsing functionality for Links Notation (Lino),
 * converting text into structured Link objects.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

use InvalidArgumentException;

/**
 * Parser for Lino notation.
 *
 * Handles both inline and indented syntax for defining links.
 */
class Parser
{
    /**
     * How deep links may nest unless a parser is told otherwise: every
     * parenthesized group and every indentation level is one level, and the
     * lines of a document are at level 0. Every implementation shares this
     * default.
     */
    public const DEFAULT_MAX_DEPTH = 64;

    /** @var int Maximum input size in bytes. */
    public int $maxInputSize;

    /**
     * @var int How deep links may nest; a document nested deeper is refused
     *          with a ParseException whose getMaxDepth() is set.
     */
    public int $maxDepth;

    /** @var bool Whether `#` starts a comment. */
    public bool $comments;

    /**
     * @var bool Whether parsed links record how their IDs were written
     *           (Link::getRawId() and Link::getQuote()); false reads a bare
     *           abstract syntax tree.
     */
    public bool $syntax;

    /** @var int[] */
    private array $indentationStack = [0];

    /** @var int Index of the line being parsed. */
    private int $pos = 0;

    /** @var string[] Lines of the document being parsed. */
    private array $lines = [];

    /** @var int[] Where each of the lines starts in the document. */
    private array $lineOffsets = [];

    /** @var string The document as written, for quoting the offending line in an error. */
    private string $source = '';

    /**
     * @var int Depth of the lines at level 0 of the context being parsed: the
     *          number of parenthesized groups around it.
     */
    private int $contextDepth = 0;

    /** @var int Depth of the line being parsed. */
    private int $depth = 0;

    /** @var int|null Indentation of the first content line. */
    private ?int $baseIndentation = null;

    /**
     * @param int  $maxInputSize Maximum input size in bytes (default: 10MB)
     * @param int  $maxDepth     How deep links may nest (default: 64). Every
     *                           parenthesized group and every indentation
     *                           level is one level, and the lines of a
     *                           document are at level 0; a document nested
     *                           deeper is refused with a ParseException whose
     *                           getMaxDepth() is set
     * @param bool $comments     If false, read `#` as an ordinary character
     *                           instead of the start of a comment (default: true)
     * @param bool $syntax       If false, read links as a bare abstract syntax
     *                           tree: they do not record how their IDs were
     *                           written, so Link::getRawId() and
     *                           Link::getQuote() are null (default: true)
     */
    public function __construct(
        int $maxInputSize = 10 * 1024 * 1024,
        int $maxDepth = self::DEFAULT_MAX_DEPTH,
        bool $comments = true,
        bool $syntax = true
    ) {
        $this->maxInputSize = $maxInputSize;
        $this->maxDepth = $maxDepth;
        $this->comments = $comments;
        $this->syntax = $syntax;
    }

    /**
     * Parse Lino notation text into a list of Link objects.
     *
     * @param  string $input Text in Lino notation
     * @return Link[] List of parsed links
     *
     * @throws InvalidArgumentException If input exceeds maximum size
     * @throws ParseException           If parsing fails, including when the
     *                                  document nests links deeper than
     *                                  maxDepth
     */
    public function parse(string $input): array
    {
        // Validate input size
        if (strlen($input) > $this->maxInputSize) {
            throw new InvalidArgumentException(
                'Input size exceeds maximum allowed size of ' . $this->maxInputSize . ' bytes'
            );
        }

        // Comments are blanked rather than removed, so every character keeps the
        // position it was written at.
        $prepared = $this->comments ? Comments::stripComments($input) : $input;

        if (trim($prepared) === '') {
            return [];
        }

        // Use smart line splitting that respects quoted strings
        $this->source = $input;
        [$this->lines, $this->lineOffsets] = $this->splitLinesRespectingQuotes($prepared, 0);
        $this->pos = 0;
        $this->indentationStack = [0];
        $this->baseIndentation = null;
        $this->contextDepth = 0;
        $this->depth = 0;

        return $this->transformResult($this->parseDocument());
    }

    /**
     * Read the document as a lossless concrete syntax tree.
     *
     * Every character of the input, comments and whitespace included, belongs
     * to exactly one token, so `(string) $parser->parseCst($input) === $input`.
     * The document is first parsed with this parser's options, so it is
     * refused whenever parse() would refuse it. A tree also needs balanced
     * parentheses, so a document whose parentheses are unbalanced is refused
     * as well, even where parse() reads it leniently.
     *
     * @param  string $input Text in Lino notation
     * @return CstNode The `document` node
     *
     * @throws InvalidArgumentException If input exceeds maximum size
     * @throws ParseException           If parsing fails, or the parentheses
     *                                  are unbalanced
     */
    public function parseCst(string $input): CstNode
    {
        $this->parse($input);

        return CstBuilder::build($input, $this->comments);
    }

    /**
     * Report whether a body written between an even run of delimiters is
     * substantive: it holds at least one visible character and does not
     * straddle a parenthesis. An even run can always be read as delimiter pairs
     * enclosing nothing, so the n-quote reading is only taken when it carries
     * something the pairs cannot.
     */
    private static function isSubstantiveBody(string $content): bool
    {
        $depth = 0;
        $hasVisible = false;

        $length = strlen($content);
        for ($i = 0; $i < $length; $i++) {
            $char = $content[$i];
            if ($char === '(') {
                $depth++;
            } elseif ($char === ')') {
                $depth--;
                if ($depth < 0) {
                    return false;
                }
            }
            if (trim($char) !== '') {
                $hasVisible = true;
            }
        }

        return $hasVisible && $depth === 0;
    }

    /**
     * Parse the delimited reference starting at $start.
     *
     * Any number N of quotes opens and closes the string, 2*N quotes are an
     * escaped quote sequence. A run of an even number of delimiters that does
     * not open a reference with a substantive body is the empty reference: the
     * shortest reading, a bare delimiter pair enclosing nothing, wins over a
     * longer n-quote delimiter.
     *
     * Nothing at or after $stop is read; it defaults to the end of $text.
     *
     * @return array{0: string, 1: int}|null The decoded value and the position
     *                                       right after the closing quotes, or
     *                                       null when $text does not start a
     *                                       delimited reference
     */
    private static function parseQuotedStringAt(string $text, int $start, ?int $stop = null): ?array
    {
        $length = $stop === null ? strlen($text) : min($stop, strlen($text));
        if ($start >= $length) {
            return null;
        }

        $quoteChar = $text[$start];
        if (!in_array($quoteChar, ['"', "'", '`'], true)) {
            return null;
        }

        $quoteCount = 0;
        $pos = $start;
        while ($pos < $length && $text[$pos] === $quoteChar) {
            $quoteCount++;
            $pos++;
        }

        $isEvenRun = $quoteCount % 2 === 0;
        $emptyReference = $isEvenRun ? ['', $start + $quoteCount] : null;

        $openClose = str_repeat($quoteChar, $quoteCount);
        $escapeSequence = str_repeat($quoteChar, $quoteCount * 2);
        $content = '';

        while ($pos < $length) {
            if (self::startsWithin($text, $pos, $length, $escapeSequence)) {
                $content .= $openClose;
                $pos += strlen($escapeSequence);
                continue;
            }
            if (self::startsWithin($text, $pos, $length, $openClose)) {
                $afterClose = $pos + $quoteCount;
                if ($afterClose >= $length || $text[$afterClose] !== $quoteChar) {
                    if ($isEvenRun && !self::isSubstantiveBody($content)) {
                        return $emptyReference;
                    }

                    return [$content, $afterClose];
                }
            }
            $content .= $text[$pos];
            $pos++;
        }

        return $emptyReference;
    }

    /**
     * Report whether $needle is written at $position of $text, ending before
     * $length.
     */
    private static function startsWithin(string $text, int $position, int $length, string $needle): bool
    {
        $size = strlen($needle);

        return $position + $size <= $length && substr_compare($text, $needle, $position, $size) === 0;
    }

    /**
     * Read the delimited reference at $start of $text, a part of the document
     * that starts at $offset.
     *
     * The reference is read in the document as written, within the extent of
     * $text. $text comes from the document with its comments blanked, which
     * keeps every byte at the same offset, and blanking a comment must not
     * change what a reference holds or how far it reaches (issue #377).
     *
     * @return array{0: string, 1: int}|null The decoded value and where it
     *                                       ends in $text, or null when $text
     *                                       does not start a delimited
     *                                       reference at $start
     */
    private function quotedAt(string $text, int $start, int $offset): ?array
    {
        $quoted = self::parseQuotedStringAt($this->source, $offset + $start, $offset + strlen($text));
        if ($quoted === null) {
            return null;
        }

        return [$quoted[0], $quoted[1] - $offset];
    }

    /**
     * Skip over the quoted string starting at $start, $text starting at
     * $offset in the document.
     *
     * Returns the position right after the closing quotes, or -1 when text does
     * not start a delimited reference.
     */
    private function skipQuotedString(string $text, int $start, int $offset): int
    {
        $quoted = $this->quotedAt($text, $start, $offset);

        return $quoted === null ? -1 : $quoted[1];
    }

    /**
     * Read the delimited reference starting at $start, as the parser reads it.
     *
     * @return array{0: string, 1: int}|null The decoded value and the position
     *                                       right after the closing quotes, or
     *                                       null when $text does not start a
     *                                       delimited reference
     */
    public static function readDelimitedReference(string $text, int $start): ?array
    {
        return self::parseQuotedStringAt($text, $start);
    }

    /**
     * Find where the delimited reference starting at $start ends.
     *
     * Returns the position right after the closing quotes, or -1 when $text
     * does not start a delimited reference. Blanking comments reads this so
     * that a `#` inside a delimited reference is left as the content it is.
     */
    public static function quotedReferenceEnd(string $text, int $start): int
    {
        $parsed = self::parseQuotedStringAt($text, $start);

        return $parsed === null ? -1 : $parsed[1];
    }

    /**
     * Split text into lines, but preserve newlines inside quoted strings
     * and handle multiline parenthesized expressions.
     *
     * Quoted strings can span multiple lines, and newlines within them
     * should be preserved as part of the string value. Also, parenthesized
     * expressions that span multiple lines are kept together.
     *
     * @return array{0: string[], 1: int[]} The lines and where each of them
     *                                      starts in the document, given that
     *                                      $text starts at $base
     */
    private function splitLinesRespectingQuotes(string $text, int $base): array
    {
        $lines = [];
        $offsets = [];
        $lineStart = 0;
        $parenDepth = 0;
        $i = 0;
        $length = strlen($text);

        while ($i < $length) {
            // Nothing between here and the next of these characters matters,
            // and a run of parentheses is counted in one step.
            $i += strcspn($text, "\"'`()\n", $i);
            if ($i >= $length) {
                break;
            }
            $char = $text[$i];

            if ($char === '(' || $char === ')') {
                $run = strspn($text, $char, $i);
                $parenDepth += $char === '(' ? $run : -$run;
                $i += $run;
                continue;
            } elseif ($char === "\n") {
                // Inside unclosed parens the newline is preserved; with the
                // parentheses balanced it is a line break
                if ($parenDepth <= 0) {
                    $lines[] = substr($text, $lineStart, $i - $lineStart);
                    $offsets[] = $base + $lineStart;
                    $lineStart = $i + 1;
                }
            } else {
                $end = $this->skipQuotedString($text, $i, $base);
                if ($end > $i) {
                    // A quoted string is opaque: newlines inside it are content
                    $i = $end;
                    continue;
                }
            }

            $i++;
        }

        // Add the last line if non-empty
        if ($lineStart < $length) {
            $lines[] = substr($text, $lineStart);
            $offsets[] = $base + $lineStart;
        }

        return [$lines, $offsets];
    }

    /**
     * Parse the entire document.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseDocument(): array
    {
        $this->pos = 0;
        $links = [];

        while ($this->pos < count($this->lines)) {
            if (trim($this->lines[$this->pos]) !== '') {
                // Skip empty lines
                $element = $this->parseElement(0, 0);
                if ($element !== null) {
                    $links[] = $element;
                }
            } else {
                $this->pos++;
            }
        }

        return $links;
    }

    /**
     * Parse a single element (link or reference) at given indentation.
     *
     * $level is the number of indentation levels the element sits at in the
     * context being parsed.
     *
     * @return array<string, mixed>|null
     */
    private function parseElement(int $currentIndent, int $level): ?array
    {
        if ($this->pos >= count($this->lines)) {
            return null;
        }

        $line = $this->lines[$this->pos];
        $rawIndent = strlen($line) - strlen(ltrim($line, ' '));

        // Set base indentation from first content line
        if ($this->baseIndentation === null && trim($line) !== '') {
            $this->baseIndentation = $rawIndent;
        }

        // Normalize indentation relative to base
        $indent = max(0, $rawIndent - ($this->baseIndentation ?? 0));

        if ($indent < $currentIndent) {
            return null;
        }

        $content = trim($line);
        if ($content === '') {
            $this->pos++;

            return null;
        }

        $contentOffset = $this->lineOffsets[$this->pos] + strlen($line) - strlen(ltrim($line));
        $this->pos++;

        // Try to parse the line
        $lineDepth = $this->contextDepth + $level;
        $this->depth = $lineDepth;
        $element = $this->parseLineContent($content, $contentOffset);
        // Only a line that parsed counts, as in the other implementations
        $this->checkDepth($lineDepth, $contentOffset);

        // Check for children (indented lines that follow)
        $children = [];

        while ($this->pos < count($this->lines)) {
            // A line holding nothing does not close a block: it is the next
            // line that carries something which says whether the block goes on.
            // Blanking a comment leaves such a line behind, so this is also
            // what lets a comment stand on a line of its own inside a block.
            $following = $this->pos;
            while ($following < count($this->lines) && trim($this->lines[$following]) === '') {
                $following++;
            }
            if ($following >= count($this->lines)) {
                break;
            }

            $nextLine = $this->lines[$following];
            $rawNextIndent = strlen($nextLine) - strlen(ltrim($nextLine, ' '));
            // Normalize next line's indentation
            $nextIndent = max(0, $rawNextIndent - ($this->baseIndentation ?? 0));

            if ($nextIndent <= $indent) {
                break;
            }

            // This is a child
            $this->pos = $following;
            // A child only has to be indented deeper than its parent; asking
            // for more left a line indented by a single space unread forever.
            $child = $this->parseElement($indent + 1, $level + 1);
            if ($child !== null) {
                $children[] = $child;
            }
        }

        if ($children) {
            $element['children'] = $children;
        }

        return $element;
    }

    /**
     * Refuse, for good, links at $depth when that is deeper than the parser
     * allows. $offset is where the level that is too deep opens.
     *
     * @throws ParseException If $depth is deeper than maxDepth
     */
    private function checkDepth(int $depth, int $offset): void
    {
        if ($depth > $this->maxDepth) {
            throw ParseException::nestingTooDeep($this->source, $offset, $this->maxDepth);
        }
    }

    /**
     * Parse the content of a single line, which starts at $offset.
     *
     * @return array<string, mixed>
     */
    private function parseLineContent(string $content, int $offset): array
    {
        // A whole parenthesized group: (id: values), (values) or a nested document
        if (str_starts_with($content, '(') && $this->findMatchingParen($content, 0, $offset) === strlen($content) - 1) {
            return $this->parseParenthesized(substr($content, 1, -1), $offset);
        }

        // Try indented id syntax: id:
        if (str_ends_with($content, ':')) {
            return $this->readReference(substr($content, 0, -1), $offset) + [
                'values' => [],
                'is_indented_id' => true,
            ];
        }

        // Try single-line link: id: values
        $colonPos = $this->findColonOutsideQuotes($content, $offset);
        if ($colonPos >= 0) {
            $idPart = substr($content, 0, $colonPos);
            $afterColon = substr($content, $colonPos + 1);
            $valuesPart = trim($afterColon);
            $valuesOffset = $offset + $colonPos + 1 + strlen($afterColon) - strlen(ltrim($afterColon));

            return $this->readReference($idPart, $offset) + [
                'values' => $this->parseValues($valuesPart, $valuesOffset),
            ];
        }

        // Simple value list
        return ['values' => $this->parseValues($content, $offset)];
    }

    /**
     * Parse the content of a parenthesized group opened at $offset.
     *
     * The group opens a nested context that starts fresh at indentation level
     * zero and follows exactly the rules used at the root of the document, so
     * line breaks separate links and indentation nests them. The group is one
     * level deeper than the line it is written on.
     *
     * @return array<string, mixed>
     */
    private function parseParenthesized(string $inner, int $offset): array
    {
        $this->checkDepth($this->depth + 1, $offset);

        return ['nested' => $this->parseNestedDocument($inner, $offset + 1)];
    }

    /**
     * Parse the text of a parenthesized group, which starts at $offset, as a
     * document of its own.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseNestedDocument(string $inner, int $offset): array
    {
        $savedLines = $this->lines;
        $savedLineOffsets = $this->lineOffsets;
        $savedPos = $this->pos;
        $savedBaseIndentation = $this->baseIndentation;
        $savedIndentationStack = $this->indentationStack;
        $savedContextDepth = $this->contextDepth;
        $savedDepth = $this->depth;
        try {
            [$this->lines, $this->lineOffsets] = $this->splitLinesRespectingQuotes($inner, $offset);
            $this->pos = 0;
            $this->baseIndentation = null;
            $this->indentationStack = [0];
            $this->contextDepth = $this->depth + 1;

            return $this->parseDocument();
        } finally {
            $this->lines = $savedLines;
            $this->lineOffsets = $savedLineOffsets;
            $this->pos = $savedPos;
            $this->baseIndentation = $savedBaseIndentation;
            $this->indentationStack = $savedIndentationStack;
            $this->contextDepth = $savedContextDepth;
            $this->depth = $savedDepth;
        }
    }

    /**
     * Find the position of the parenthesis closing the one at $start, $text
     * starting at $offset in the document.
     *
     * Quoted strings are skipped, so parentheses inside them are ignored.
     * Returns -1 when the group is not closed, or when $start is not at an
     * opening parenthesis.
     */
    private function findMatchingParen(string $text, int $start, int $offset): int
    {
        if (($text[$start] ?? '') !== '(') {
            return -1;
        }

        $depth = 0;
        $i = $start;
        $length = strlen($text);

        while ($i < $length) {
            $i += strcspn($text, "\"'`()", $i);
            if ($i >= $length) {
                break;
            }
            $char = $text[$i];
            // A run of parentheses is taken in one step, so the parentheses
            // deeply nested groups begin and end with cost a step per run.
            if ($char === '(') {
                $run = strspn($text, '(', $i);
                $depth += $run;
                $i += $run;
                continue;
            } elseif ($char === ')') {
                $run = strspn($text, ')', $i);
                if ($run >= $depth) {
                    return $i + $depth - 1;
                }
                $depth -= $run;
                $i += $run;
                continue;
            } else {
                $end = $this->skipQuotedString($text, $i, $offset);
                if ($end > $i) {
                    $i = $end;
                    continue;
                }
            }
            $i++;
        }

        return -1;
    }

    /**
     * Find the position of a colon that's not inside quotes or parentheses.
     *
     * This is crucial for correctly parsing nested self-referenced objects.
     * For example, in: ((str key) (obj_1: dict ...))
     * The colon after obj_1 should NOT be found as a top-level colon
     * because it's inside the second parenthesized expression. $text starts at
     * $offset in the document.
     */
    private function findColonOutsideQuotes(string $text, int $offset): int
    {
        $parenDepth = 0;
        $i = 0;
        $length = strlen($text);

        while ($i < $length) {
            $char = $text[$i];
            if (in_array($char, ['"', "'", '`'], true)) {
                $end = $this->skipQuotedString($text, $i, $offset);
                if ($end > $i) {
                    $i = $end;
                    continue;
                }
            } elseif ($char === '(') {
                $parenDepth++;
            } elseif ($char === ')') {
                $parenDepth--;
            } elseif ($char === ':' && $parenDepth === 0) {
                // Only return colon if it's outside quotes AND at parenthesis depth 0
                return $i;
            }
            $i++;
        }

        return -1;
    }

    /**
     * Parse a space-separated list of values, which starts at $offset.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseValues(string $text, int $offset): array
    {
        if ($text === '') {
            return [];
        }

        $values = [];
        $i = 0;
        $length = strlen($text);

        while ($i < $length) {
            // Skip all whitespace (space, tab, newline, carriage return)
            while ($i < $length && in_array($text[$i], [' ', "\t", "\n", "\r"], true)) {
                $i++;
            }
            if ($i >= $length) {
                break;
            }

            // Try to extract the next value
            [$valueEnd, $valueText] = $this->extractNextValue($text, $i, $offset);
            if ($valueText !== '' && trim($valueText) !== '') {
                $values[] = $this->parseValue($valueText, $offset + $i);
            }
            if ($valueEnd === $i) {
                // No progress made - skip this character to avoid infinite loop
                $i++;
            } else {
                $i = $valueEnd;
            }
        }

        return $values;
    }

    /**
     * Extract the next value from text starting at $start position, $text
     * starting at $offset in the document.
     *
     * @return array{0: int, 1: string} The end position and the value text
     */
    private function extractNextValue(string $text, int $start, int $offset): array
    {
        $length = strlen($text);
        if ($start >= $length) {
            return [$start, ''];
        }

        // Check if this starts with a delimited reference
        $quoted = $this->quotedAt($text, $start, $offset);
        if ($quoted !== null) {
            [, $end] = $quoted;

            return [$end, substr($text, $start, $end - $start)];
        }

        // A versioned literal is a whole token: what follows it starts the
        // next one, as the reference grammar (js/src/grammar.pegjs) reads it
        $end = ReferenceLiteral::end($text, $start);
        if ($end >= 0) {
            return [$end, substr($text, $start, $end - $start)];
        }

        // Check if this starts with a parenthesized expression
        if ($text[$start] === '(') {
            $end = $this->findMatchingParen($text, $start, $offset);
            if ($end >= 0) {
                return [$end + 1, substr($text, $start, $end + 1 - $start)];
            }

            return [$length, substr($text, $start)];
        }

        // Regular value - read until space or end. A delimited reference was
        // tried above, so a quote here is an ordinary character of a bare
        // reference and does not hide the spaces after it: ('x y) is the two
        // references 'x and y, as in every other implementation.
        $i = $start + strcspn($text, ' ', $start);

        return [$i, substr($text, $start, $i - $start)];
    }

    /**
     * Parse a single value (could be a reference or nested link) starting at
     * $offset.
     *
     * @return array<string, mixed>
     */
    private function parseValue(string $value, int $offset): array
    {
        // Nested link in parentheses
        if (str_starts_with($value, '(') && $this->findMatchingParen($value, 0, $offset) === strlen($value) - 1) {
            return $this->parseParenthesized(substr($value, 1, -1), $offset);
        }

        // Simple reference
        return $this->readReference($value, $offset);
    }

    /**
     * Read the reference written in $text, which starts at $offset, handling
     * quoted strings with escaping support. A delimited reference is read in
     * the document as written, so a comment never changes what it holds
     * (issue #377).
     *
     * @return array{id: string, raw: string} The reference and the text it was
     *                                        written as, taken from the
     *                                        document as the caller wrote it
     */
    private function readReference(string $text, int $offset): array
    {
        $trimmed = trim($text);
        $start = $offset + strlen($text) - strlen(ltrim($text));
        $length = strlen($trimmed);
        if (ReferenceLiteral::hasPrefix($trimmed)) {
            $id = ReferenceLiteral::decode($trimmed);
        } else {
            $quoted = $this->quotedAt($trimmed, 0, $start);
            if ($quoted !== null) {
                [$id, $length] = $quoted;
            } else {
                // Unquoted
                $id = $trimmed;
            }
        }

        // The comments of the document read were blanked, which keeps every
        // position, so the text written is at the same place in the source.
        return ['id' => $id, 'raw' => substr($this->source, $start, $length)];
    }

    /**
     * Transform raw parse result into Link objects.
     *
     * @param  array<int, array<string, mixed>> $rawResult
     * @return Link[]
     */
    private function transformResult(array $rawResult): array
    {
        $links = [];

        foreach ($rawResult as $item) {
            $this->collectLinks($item, [], $links);
        }

        return $links;
    }

    /**
     * Recursively collect links from parse tree.
     *
     * Handles both inline and indented syntax, flattening the hierarchy
     * appropriately.
     *
     * @param array<string, mixed> $item
     * @param Link[]               $parentPath
     * @param Link[]               $result
     */
    private function collectLinks(array $item, array $parentPath, array &$result): void
    {
        $children = $item['children'] ?? [];
        $id = $item['id'] ?? null;

        // Special case: indented id syntax (id: followed by children)
        $isIndentedId = ($item['is_indented_id'] ?? false)
            && $id !== null
            && !($item['values'] ?? [])
            && $children;

        if ($isIndentedId) {
            $childValues = array_map([$this, 'transformIndentedValue'], $children);

            $currentLink = $this->withRawId(new Link($id, $childValues), $item);
            $result[] = $parentPath ? $this->combinePathElements($parentPath, $currentLink) : $currentLink;

            return;
        }

        $currentLink = $this->transformLink($item);

        // Add the link combined with parent path
        $result[] = $parentPath ? $this->combinePathElements($parentPath, $currentLink) : $currentLink;

        // Regular indented structure: process each child with this item in the path
        if ($children) {
            $newPath = array_merge($parentPath, [$currentLink]);
            foreach ($children as $child) {
                $this->collectLinks($child, $newPath, $result);
            }
        }
    }

    /** @param array<string, mixed> $item */
    private function transformIndentedValue(array $item): Link
    {
        $children = $item['children'] ?? [];
        if ($children && isset($item['id']) && !($item['values'] ?? [])) {
            return $this->withRawId(
                new Link($item['id'], array_map([$this, 'transformIndentedValue'], $children)),
                $item
            );
        }

        $current = $this->transformLink($item);
        if ($children) {
            $values = array_merge($current->values, array_map([$this, 'transformIndentedValue'], $children));
            return $this->withRawId(new Link($current->id, $values), $item);
        }
        if (!isset($item['id']) && !array_key_exists('nested', $item) && count($current->values) === 1) {
            return $current->values[0];
        }
        return $current;
    }

    /**
     * Combine path elements into a single link.
     *
     * @param Link[] $pathElements
     */
    private function combinePathElements(array $pathElements, Link $current): Link
    {
        if (!$pathElements) {
            return $current;
        }

        if (count($pathElements) === 1) {
            $combined = new Link(null, [$pathElements[0], $current]);
            $combined->isFromPathCombination = true;

            return $combined;
        }

        // For multiple path elements, build proper nesting
        $parentPath = array_slice($pathElements, 0, -1);
        $lastElement = $pathElements[count($pathElements) - 1];

        // Build the parent structure
        $parent = $this->combinePathElements($parentPath, $lastElement);

        // Add current element to the built structure
        $combined = new Link(null, [$parent, $current]);
        $combined->isFromPathCombination = true;

        return $combined;
    }

    /**
     * Transform a parsed item into a Link object.
     *
     * @param array<string, mixed> $item
     */
    private function transformLink(array $item): Link
    {
        // Parenthesized group parsed as a nested context
        if (array_key_exists('nested', $item)) {
            return $this->transformNested($item['nested']);
        }

        // Simple reference
        if (array_key_exists('id', $item) && !array_key_exists('values', $item)) {
            return $this->withRawId(new Link($item['id']), $item);
        }

        // Link with values
        if (array_key_exists('values', $item)) {
            return $this->withRawId(
                new Link($item['id'] ?? null, array_map([$this, 'transformLink'], $item['values'])),
                $item
            );
        }

        // Default
        return $this->withRawId(new Link($item['id'] ?? null), $item);
    }

    /**
     * Record how the parsed item wrote its ID, unless this parser reads a bare
     * abstract syntax tree.
     *
     * @param array<string, mixed> $item The parsed item, with the `raw` text
     *                                   its reference was read from
     */
    private function withRawId(Link $link, array $item): Link
    {
        if ($this->syntax && $link->id !== null && is_string($item['raw'] ?? null)) {
            $link->setRawId($item['raw']);
        }

        return $link;
    }

    /**
     * Transform the links of a nested (parenthesized) context into one Link.
     *
     * The nested context is parsed with the same rules as the root, so it
     * yields a list of links; a single link is used as is, several links
     * become the values of one anonymous link. An already parenthesized single
     * link keeps its own group, so `((a b))` stays distinct from `(a b)`.
     *
     * @param array<int, array<string, mixed>> $nested
     */
    private function transformNested(array $nested): Link
    {
        $nestedLinks = [];
        foreach ($nested as $item) {
            $this->collectLinks($item, [], $nestedLinks);
        }

        $wrapsSingleGroup = count($nested) === 1 && array_key_exists('nested', $nested[0]);
        if (count($nestedLinks) === 1 && !$wrapsSingleGroup) {
            return $nestedLinks[0];
        }

        return new Link(null, $nestedLinks);
    }
}
