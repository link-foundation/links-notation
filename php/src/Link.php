<?php

/**
 * Link class representing a Lino link with optional id and values.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

/**
 * Represents a link in Lino notation.
 *
 * A link can be:
 * - A simple reference (id only, no values)
 * - A link with id and values
 * - A link with only values (no id)
 */
class Link
{
    /** @var string|null Optional identifier of the link. */
    public ?string $id;

    /** @var Link[] Child links. */
    public array $values;

    /** @var bool True when the link was built by combining an indentation path. */
    public bool $isFromPathCombination = false;

    /**
     * @param string|null $id     Optional identifier for the link
     * @param Link[]|null $values Optional list of child links
     */
    public function __construct(?string $id = null, ?array $values = null)
    {
        $this->id = $id;
        $this->values = $values ?? [];
    }

    /**
     * String representation using standard formatting.
     */
    public function __toString(): string
    {
        return $this->format(false);
    }

    /**
     * Check equality with another link.
     */
    public function equals(mixed $other): bool
    {
        if (!($other instanceof Link)) {
            return false;
        }
        if ($this->id !== $other->id) {
            return false;
        }
        if (count($this->values) !== count($other->values)) {
            return false;
        }
        foreach ($this->values as $index => $value) {
            if (!$value->equals($other->values[$index])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get formatted string of all values.
     */
    public function getValuesString(): string
    {
        if (!$this->values) {
            return '';
        }

        return implode(' ', array_map([self::class, 'getValueString'], $this->values));
    }

    /**
     * Simplify the link structure.
     *
     * - If no values, return self
     * - If single value, return that value
     * - Otherwise return new link with simplified values
     */
    public function simplify(): Link
    {
        if (!$this->values) {
            return $this;
        }
        if (count($this->values) === 1) {
            return $this->values[0];
        }

        return new Link($this->id, array_map(static fn (Link $value): Link => $value->simplify(), $this->values));
    }

    /**
     * Combine this link with another to create a compound link.
     */
    public function combine(Link $other): Link
    {
        return new Link(null, [$this, $other]);
    }

    /**
     * Get string representation of a value.
     */
    public static function getValueString(Link $value): string
    {
        return $value->toLinkOrIdString();
    }

    /**
     * Escape a reference string if it contains special characters.
     */
    public static function escapeReference(?string $reference): string
    {
        if ($reference === null || trim($reference) === '') {
            return '';
        }

        // Check if single quotes are needed
        $needsSingleQuotes = false;
        foreach ([':', '(', ')', ' ', "\t", "\n", "\r", '"'] as $character) {
            if (str_contains($reference, $character)) {
                $needsSingleQuotes = true;
                break;
            }
        }

        if ($needsSingleQuotes) {
            return "'" . $reference . "'";
        }
        if (str_contains($reference, "'")) {
            return '"' . $reference . '"';
        }

        return $reference;
    }

    /**
     * Convert to string, using just id if no values, otherwise full format.
     */
    public function toLinkOrIdString(): string
    {
        if (!$this->values) {
            return $this->id !== null ? self::escapeReference($this->id) : '';
        }

        return (string) $this;
    }

    /**
     * Format the link as a string.
     *
     * @param bool|FormatConfig $lessParentheses If true, omit parentheses when safe; or a FormatConfig object
     * @param bool              $isCompoundValue If true, this is a value in a compound link
     */
    public function format(bool|FormatConfig $lessParentheses = false, bool $isCompoundValue = false): string
    {
        if ($lessParentheses instanceof FormatConfig) {
            return $this->formatWithConfig($lessParentheses, $isCompoundValue);
        }

        // Empty link
        if ($this->id === null && !$this->values) {
            return $lessParentheses ? '' : '()';
        }

        // Link with only id, no values
        if (!$this->values) {
            $escapedId = self::escapeReference($this->id);
            // When used as a value in a compound link, wrap in parentheses
            if ($isCompoundValue) {
                return '(' . $escapedId . ')';
            }

            return ($lessParentheses && !$this->needsParentheses($this->id))
                ? $escapedId
                : '(' . $escapedId . ')';
        }

        // Format values recursively
        $valuesString = $this->formatValues();

        // Link with values only (null id)
        if ($this->id === null) {
            if ($lessParentheses) {
                // Check if all values are simple (no nested values)
                if ($this->allValuesAreSimple()) {
                    // Format each value without extra wrapping
                    return implode(
                        ' ',
                        array_map(static fn (Link $value): string => self::escapeReference($value->id), $this->values)
                    );
                }

                // For mixed or complex values, return without outer wrapper
                return $valuesString;
            }

            // For normal mode, wrap in parentheses
            return '(' . $valuesString . ')';
        }

        // Link with id and values
        $withColon = self::escapeReference($this->id) . ': ' . $valuesString;

        return ($lessParentheses && !$this->needsParentheses($this->id)) ? $withColon : '(' . $withColon . ')';
    }

    /**
     * Format a single value within this link.
     */
    public function formatValue(Link $value): string
    {
        // For compound links from paths, format values with parentheses
        if ($this->isFromPathCombination) {
            return $value->format(false, true);
        }

        // Simple link with just an id - don't wrap in parentheses when used as a value
        if (!$value->values) {
            return self::escapeReference($value->id);
        }

        // Complex value with its own structure - format it normally with parentheses
        return $value->format(false, false);
    }

    /**
     * Check if a string needs to be wrapped in parentheses.
     */
    public function needsParentheses(?string $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }
        foreach ([' ', ':', '(', ')'] as $character) {
            if (str_contains($value, $character)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Format the link using a FormatConfig object.
     */
    private function formatWithConfig(FormatConfig $config, bool $isCompoundValue = false): string
    {
        // Empty link
        if ($this->id === null && !$this->values) {
            return $config->lessParentheses ? '' : '()';
        }

        // Link with only id, no values
        if (!$this->values) {
            $escapedId = self::escapeReference($this->id);
            if ($isCompoundValue) {
                return '(' . $escapedId . ')';
            }

            return ($config->lessParentheses && !$this->needsParentheses($this->id))
                ? $escapedId
                : '(' . $escapedId . ')';
        }

        // Check if we should use indented format
        $shouldIndent = false;
        if ($config->shouldIndentByRefCount(count($this->values))) {
            $shouldIndent = true;
        } else {
            // Try inline format first
            $valuesString = $this->formatValues();
            if ($this->id !== null) {
                $idString = self::escapeReference($this->id);
                $testLine = $config->lessParentheses
                    ? $idString . ': ' . $valuesString
                    : '(' . $idString . ': ' . $valuesString . ')';
            } else {
                $testLine = $config->lessParentheses ? $valuesString : '(' . $valuesString . ')';
            }

            if ($config->shouldIndentByLength($testLine)) {
                $shouldIndent = true;
            }
        }

        // Format with indentation if needed
        if ($shouldIndent && $config->preferInline === false) {
            return $this->formatIndented($config);
        }

        // Standard inline formatting
        $valuesString = $this->formatValues();

        // Link with values only (null id)
        if ($this->id === null) {
            if ($config->lessParentheses) {
                if ($this->allValuesAreSimple()) {
                    return implode(
                        ' ',
                        array_map(static fn (Link $value): string => self::escapeReference($value->id), $this->values)
                    );
                }

                return $valuesString;
            }

            return '(' . $valuesString . ')';
        }

        // Link with id and values
        $withColon = self::escapeReference($this->id) . ': ' . $valuesString;

        return ($config->lessParentheses && !$this->needsParentheses($this->id))
            ? $withColon
            : '(' . $withColon . ')';
    }

    /**
     * Format the link with indentation.
     */
    private function formatIndented(FormatConfig $config): string
    {
        if ($this->id === null) {
            // Values only - format each on separate line
            $lines = array_map(
                fn (Link $value): string => $config->indentString . $this->formatValue($value),
                $this->values
            );

            return implode("\n", $lines);
        }

        // Link with id - format as id:\n  value1\n  value2
        $lines = [self::escapeReference($this->id) . ':'];
        foreach ($this->values as $value) {
            $lines[] = $config->indentString . $this->formatValue($value);
        }

        return implode("\n", $lines);
    }

    /**
     * Format all values of this link separated by spaces.
     */
    private function formatValues(): string
    {
        return implode(' ', array_map(fn (Link $value): string => $this->formatValue($value), $this->values));
    }

    /**
     * Check whether every value is a plain reference without nested values.
     */
    private function allValuesAreSimple(): bool
    {
        foreach ($this->values as $value) {
            if ($value->values) {
                return false;
            }
        }

        return true;
    }
}
