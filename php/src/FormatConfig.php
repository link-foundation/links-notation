<?php

/**
 * FormatConfig for Lino notation formatting.
 *
 * Provides configuration options for controlling how Link objects are formatted.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

/**
 * Configuration options for formatting links.
 */
class FormatConfig
{
    /** @var bool If true, omit parentheses where safe. */
    public bool $lessParentheses;

    /** @var int Maximum line length before auto-indenting. */
    public int $maxLineLength;

    /** @var bool If true, indent lines exceeding maxLineLength. */
    public bool $indentLongLines;

    /** @var int|null Maximum number of references before auto-indenting (null = unlimited). */
    public ?int $maxInlineRefs;

    /** @var bool If true, group consecutive links with same id. */
    public bool $groupConsecutive;

    /** @var string String to use for indentation. */
    public string $indentString;

    /** @var bool If true, prefer inline format when under thresholds. */
    public bool $preferInline;

    public function __construct(
        bool $lessParentheses = false,
        int $maxLineLength = 80,
        bool $indentLongLines = false,
        ?int $maxInlineRefs = null,
        bool $groupConsecutive = false,
        string $indentString = '  ',
        bool $preferInline = true
    ) {
        $this->lessParentheses = $lessParentheses;
        $this->maxLineLength = $maxLineLength;
        $this->indentLongLines = $indentLongLines;
        $this->maxInlineRefs = $maxInlineRefs;
        $this->groupConsecutive = $groupConsecutive;
        $this->indentString = $indentString;
        $this->preferInline = $preferInline;
    }

    /**
     * Check if line should be indented based on length.
     */
    public function shouldIndentByLength(string $line): bool
    {
        if (!$this->indentLongLines) {
            return false;
        }

        // Count printable unicode characters
        return mb_strlen($line) > $this->maxLineLength;
    }

    /**
     * Check if link should be indented based on reference count.
     */
    public function shouldIndentByRefCount(int $refCount): bool
    {
        if ($this->maxInlineRefs === null) {
            return false;
        }

        return $refCount > $this->maxInlineRefs;
    }
}
