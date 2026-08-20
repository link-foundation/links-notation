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
    /** @var int Maximum input size in bytes. */
    public int $maxInputSize;

    /** @var int Maximum nesting depth. */
    public int $maxDepth;

    /** @var int[] */
    private array $indentationStack = [0];

    /** @var int Index of the line being parsed. */
    private int $pos = 0;

    /** @var string[] Lines of the document being parsed. */
    private array $lines = [];

    /** @var int|null Indentation of the first content line. */
    private ?int $baseIndentation = null;

    /**
     * @param int $maxInputSize Maximum input size in bytes (default: 10MB)
     * @param int $maxDepth     Maximum nesting depth (default: 1000)
     */
    public function __construct(int $maxInputSize = 10 * 1024 * 1024, int $maxDepth = 1000)
    {
        $this->maxInputSize = $maxInputSize;
        $this->maxDepth = $maxDepth;
    }

    /**
     * Parse Lino notation text into a list of Link objects.
     *
     * @param  string $input Text in Lino notation
     * @return Link[] List of parsed links
     *
     * @throws InvalidArgumentException If input exceeds maximum size
     * @throws ParseException           If parsing fails
     */
    public function parse(string $input): array
    {
        // Validate input size
        if (strlen($input) > $this->maxInputSize) {
            throw new InvalidArgumentException(
                'Input size exceeds maximum allowed size of ' . $this->maxInputSize . ' bytes'
            );
        }

        if (trim($input) === '') {
            return [];
        }

        // Use smart line splitting that respects quoted strings
        $this->lines = $this->splitLinesRespectingQuotes($input);
        $this->pos = 0;
        $this->indentationStack = [0];
        $this->baseIndentation = null;

        return $this->transformResult($this->parseDocument());
    }

    /**
     * Skip over the quoted string starting at $start.
     *
     * Any number N of quotes opens and closes the string, 2*N quotes are an
     * escaped quote sequence. Returns the position right after the closing
     * quotes, or -1 when text does not start a terminated quoted string.
     */
    private function skipQuotedString(string $text, int $start): int
    {
        $length = strlen($text);
        if ($start >= $length) {
            return -1;
        }

        $quoteChar = $text[$start];
        if (!in_array($quoteChar, ['"', "'", '`'], true)) {
            return -1;
        }

        $quoteCount = 0;
        $pos = $start;
        while ($pos < $length && $text[$pos] === $quoteChar) {
            $quoteCount++;
            $pos++;
        }

        $openClose = str_repeat($quoteChar, $quoteCount);
        $escapeSequence = str_repeat($quoteChar, $quoteCount * 2);

        while ($pos < $length) {
            if (str_starts_with(substr($text, $pos), $escapeSequence)) {
                $pos += strlen($escapeSequence);
                continue;
            }
            if (str_starts_with(substr($text, $pos), $openClose)) {
                $afterClose = $pos + $quoteCount;
                if ($afterClose >= $length || $text[$afterClose] !== $quoteChar) {
                    return $afterClose;
                }
            }
            $pos++;
        }

        return -1;
    }

    /**
     * Split text into lines, but preserve newlines inside quoted strings
     * and handle multiline parenthesized expressions.
     *
     * Quoted strings can span multiple lines, and newlines within them
     * should be preserved as part of the string value. Also, parenthesized
     * expressions that span multiple lines are kept together.
     *
     * @return string[]
     */
    private function splitLinesRespectingQuotes(string $text): array
    {
        $lines = [];
        $currentLine = '';
        $parenDepth = 0;
        $i = 0;
        $length = strlen($text);

        while ($i < $length) {
            $char = $text[$i];

            if (in_array($char, ['"', "'", '`'], true)) {
                $end = $this->skipQuotedString($text, $i);
                if ($end > $i) {
                    // A quoted string is opaque: newlines inside it are content
                    $currentLine .= substr($text, $i, $end - $i);
                    $i = $end;
                    continue;
                }
                $currentLine .= $char;
            } elseif ($char === '(') {
                $parenDepth++;
                $currentLine .= $char;
            } elseif ($char === ')') {
                $parenDepth--;
                $currentLine .= $char;
            } elseif ($char === "\n") {
                if ($parenDepth > 0) {
                    // Inside unclosed parens: preserve the newline
                    $currentLine .= $char;
                } else {
                    // Parentheses balanced: this is a line break
                    $lines[] = $currentLine;
                    $currentLine = '';
                }
            } else {
                $currentLine .= $char;
            }

            $i++;
        }

        // Add the last line if non-empty
        if ($currentLine !== '') {
            $lines[] = $currentLine;
        }

        return $lines;
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
                $element = $this->parseElement(0);
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
     * @return array<string, mixed>|null
     */
    private function parseElement(int $currentIndent): ?array
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

        $this->pos++;

        // Try to parse the line
        $element = $this->parseLineContent($content);

        // Check for children (indented lines that follow)
        $children = [];
        $childIndent = $indent + 2; // Expect at least 2 spaces for child

        while ($this->pos < count($this->lines)) {
            $nextLine = $this->lines[$this->pos];
            $rawNextIndent = strlen($nextLine) - strlen(ltrim($nextLine, ' '));
            // Normalize next line's indentation
            $nextIndent = max(0, $rawNextIndent - ($this->baseIndentation ?? 0));

            if (trim($nextLine) !== '' && $nextIndent > $indent) {
                // This is a child
                $child = $this->parseElement($children ? $indent + 2 : $childIndent);
                if ($child !== null) {
                    $children[] = $child;
                }
            } else {
                break;
            }
        }

        if ($children) {
            $element['children'] = $children;
        }

        return $element;
    }

    /**
     * Parse the content of a single line.
     *
     * @return array<string, mixed>
     */
    private function parseLineContent(string $content): array
    {
        // A whole parenthesized group: (id: values), (values) or a nested document
        if (str_starts_with($content, '(') && $this->findMatchingParen($content, 0) === strlen($content) - 1) {
            return $this->parseParenthesized(substr($content, 1, -1));
        }

        // Try indented id syntax: id:
        if (str_ends_with($content, ':')) {
            $idPart = trim(substr($content, 0, -1));

            return ['id' => $this->extractReference($idPart), 'values' => [], 'is_indented_id' => true];
        }

        // Try single-line link: id: values
        $colonPos = $this->findColonOutsideQuotes($content);
        if ($colonPos >= 0) {
            $idPart = trim(substr($content, 0, $colonPos));
            $valuesPart = trim(substr($content, $colonPos + 1));

            return ['id' => $this->extractReference($idPart), 'values' => $this->parseValues($valuesPart)];
        }

        // Simple value list
        return ['values' => $this->parseValues($content)];
    }

    /**
     * Parse the content of a parenthesized group.
     *
     * The group opens a nested context that starts fresh at indentation level
     * zero and follows exactly the rules used at the root of the document, so
     * line breaks separate links and indentation nests them.
     *
     * @return array<string, mixed>
     */
    private function parseParenthesized(string $inner): array
    {
        return ['nested' => $this->parseNestedDocument($inner)];
    }

    /**
     * Parse the text of a parenthesized group as a document of its own.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseNestedDocument(string $inner): array
    {
        $savedLines = $this->lines;
        $savedPos = $this->pos;
        $savedBaseIndentation = $this->baseIndentation;
        $savedIndentationStack = $this->indentationStack;
        try {
            $this->lines = $this->splitLinesRespectingQuotes($inner);
            $this->pos = 0;
            $this->baseIndentation = null;
            $this->indentationStack = [0];

            return $this->parseDocument();
        } finally {
            $this->lines = $savedLines;
            $this->pos = $savedPos;
            $this->baseIndentation = $savedBaseIndentation;
            $this->indentationStack = $savedIndentationStack;
        }
    }

    /**
     * Find the position of the parenthesis closing the one at $start.
     *
     * Quoted strings are skipped, so parentheses inside them are ignored.
     * Returns -1 when the group is not closed.
     */
    private function findMatchingParen(string $text, int $start): int
    {
        $depth = 0;
        $i = $start;
        $length = strlen($text);

        while ($i < $length) {
            $char = $text[$i];
            if (in_array($char, ['"', "'", '`'], true)) {
                $end = $this->skipQuotedString($text, $i);
                if ($end > $i) {
                    $i = $end;
                    continue;
                }
            } elseif ($char === '(') {
                $depth++;
            } elseif ($char === ')') {
                $depth--;
                if ($depth === 0) {
                    return $i;
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
     * because it's inside the second parenthesized expression.
     */
    private function findColonOutsideQuotes(string $text): int
    {
        $parenDepth = 0;
        $i = 0;
        $length = strlen($text);

        while ($i < $length) {
            $char = $text[$i];
            if (in_array($char, ['"', "'", '`'], true)) {
                $end = $this->skipQuotedString($text, $i);
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
     * Parse a space-separated list of values.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseValues(string $text): array
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
            [$valueEnd, $valueText] = $this->extractNextValue($text, $i);
            if ($valueText !== '' && trim($valueText) !== '') {
                $values[] = $this->parseValue($valueText);
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
     * Extract the next value from text starting at $start position.
     *
     * @return array{0: int, 1: string} The end position and the value text
     */
    private function extractNextValue(string $text, int $start): array
    {
        $length = strlen($text);
        if ($start >= $length) {
            return [$start, ''];
        }

        // Check if this starts with a multi-quote string (supports any N quotes)
        $quoteChar = $text[$start];
        if (in_array($quoteChar, ['"', "'", '`'], true)) {
            // Count opening quotes dynamically
            $quoteCount = 0;
            $pos = $start;
            while ($pos < $length && $text[$pos] === $quoteChar) {
                $quoteCount++;
                $pos++;
            }

            // Parse this multi-quote string
            $remaining = substr($text, $start);
            $openClose = str_repeat($quoteChar, $quoteCount);
            $escapeSequence = str_repeat($quoteChar, $quoteCount * 2);
            $remainingLength = strlen($remaining);

            $innerPos = strlen($openClose);
            while ($innerPos < $remainingLength) {
                // Check for escape sequence (2*N quotes)
                if (str_starts_with(substr($remaining, $innerPos), $escapeSequence)) {
                    $innerPos += strlen($escapeSequence);
                    continue;
                }
                // Check for closing quotes
                if (str_starts_with(substr($remaining, $innerPos), $openClose)) {
                    $afterClosePos = $innerPos + strlen($openClose);
                    // Make sure this is exactly N quotes (not more)
                    if ($afterClosePos >= $remainingLength || $remaining[$afterClosePos] !== $quoteChar) {
                        // Found the end
                        return [$start + $afterClosePos, substr($remaining, 0, $afterClosePos)];
                    }
                }
                $innerPos++;
            }

            // No closing found, treat as regular text
        }

        // Check if this starts with a parenthesized expression
        if ($text[$start] === '(') {
            $end = $this->findMatchingParen($text, $start);
            if ($end >= 0) {
                return [$end + 1, substr($text, $start, $end + 1 - $start)];
            }

            return [$length, substr($text, $start)];
        }

        // Regular value - read until space or end
        $inSingle = false;
        $inDouble = false;
        $inBacktick = false;
        $i = $start;

        while ($i < $length) {
            $char = $text[$i];
            if ($char === "'" && !$inDouble && !$inBacktick) {
                $inSingle = !$inSingle;
            } elseif ($char === '"' && !$inSingle && !$inBacktick) {
                $inDouble = !$inDouble;
            } elseif ($char === '`' && !$inSingle && !$inDouble) {
                $inBacktick = !$inBacktick;
            } elseif ($char === ' ' && !$inSingle && !$inDouble && !$inBacktick) {
                break;
            }
            $i++;
        }

        return [$i, substr($text, $start, $i - $start)];
    }

    /**
     * Parse a single value (could be a reference or nested link).
     *
     * @return array<string, mixed>
     */
    private function parseValue(string $value): array
    {
        // Nested link in parentheses
        if (str_starts_with($value, '(') && $this->findMatchingParen($value, 0) === strlen($value) - 1) {
            return $this->parseParenthesized(substr($value, 1, -1));
        }

        // Simple reference
        return ['id' => $this->extractReference($value)];
    }

    /**
     * Extract reference, handling quoted strings with escaping support.
     */
    private function extractReference(string $text): string
    {
        $text = trim($text);

        // Try multi-quote strings (supports any N quotes)
        foreach (['"', "'", '`'] as $quoteChar) {
            if (str_starts_with($text, $quoteChar)) {
                // Count opening quotes dynamically
                $quoteCount = 0;
                $length = strlen($text);
                while ($quoteCount < $length && $text[$quoteCount] === $quoteChar) {
                    $quoteCount++;
                }

                if ($length > $quoteCount) {
                    // Try to parse this multi-quote string
                    $result = $this->parseMultiQuoteString($text, $quoteChar, $quoteCount);
                    if ($result !== null) {
                        return $result;
                    }
                }
            }
        }

        // Unquoted
        return $text;
    }

    /**
     * Parse a multi-quote string.
     *
     * For N quotes: opening = N quotes, closing = N quotes, escape = 2*N quotes -> N quotes
     */
    private function parseMultiQuoteString(string $text, string $quoteChar, int $quoteCount): ?string
    {
        $openClose = str_repeat($quoteChar, $quoteCount);
        $escapeSequence = str_repeat($quoteChar, $quoteCount * 2);
        $escapeValue = str_repeat($quoteChar, $quoteCount);

        // Check for opening quotes
        if (!str_starts_with($text, $openClose)) {
            return null;
        }

        $remaining = substr($text, strlen($openClose));
        $content = '';

        while ($remaining !== '') {
            // Check for escape sequence (2*N quotes)
            if (str_starts_with($remaining, $escapeSequence)) {
                $content .= $escapeValue;
                $remaining = substr($remaining, strlen($escapeSequence));
                continue;
            }

            // Check for closing quotes (N quotes not followed by more quotes)
            if (str_starts_with($remaining, $openClose)) {
                $afterClose = substr($remaining, strlen($openClose));
                // Make sure this is exactly N quotes (not more)
                if ($afterClose === '' || !str_starts_with($afterClose, $quoteChar)) {
                    // Closing found: the text after it, if any, is kept out of the reference
                    return $content;
                }
            }

            // Take the next character
            $content .= $remaining[0];
            $remaining = substr($remaining, 1);
        }

        // No closing quotes found
        return null;
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
            && $id !== ''
            && !($item['values'] ?? [])
            && $children;

        if ($isIndentedId) {
            $childValues = [];
            foreach ($children as $child) {
                // Extract the reference from child's values
                if (isset($child['values']) && count($child['values']) === 1) {
                    $childValues[] = $this->transformLink($child['values'][0]);
                } else {
                    $childValues[] = $this->transformLink($child);
                }
            }

            $currentLink = new Link($id, $childValues);
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
            return new Link($item['id']);
        }

        // Link with values
        if (array_key_exists('values', $item)) {
            return new Link($item['id'] ?? null, array_map([$this, 'transformLink'], $item['values']));
        }

        // Default
        return new Link($item['id'] ?? null);
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
