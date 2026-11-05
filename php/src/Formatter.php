<?php

/**
 * Formatter for Lino notation.
 *
 * Provides utilities for formatting Link objects back into Lino notation strings.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

class Formatter
{
    /**
     * Write recursive nested lines in value order, without a final newline.
     * Read by folding groups in a group-aware binding; parse keeps path semantics.
     *
     * @param Link[] $links
     */
    public static function formatNested(array $links, string $indent = '  '): string
    {
        if ($indent === '' || strspn($indent, " ") !== strlen($indent)) {
            throw new \InvalidArgumentException('indent must contain only spaces and be nonempty');
        }
        $lines = [];
        foreach ($links as $link) {
            self::writeNested($link, '', $indent, false, $lines);
        }

        return implode("\n", $lines);
    }

    private static function nestedAtom(Link $link): bool
    {
        return $link->id !== null && $link->values === [];
    }

    private static function nestedCanNest(Link $link): bool
    {
        return !self::nestedAtom($link)
            && !($link->id === null && count($link->values) === 1 && !self::nestedAtom($link->values[0]));
    }

    private static function nestedLineHolds(Link $link, int $count): bool
    {
        return $link->id !== null || $count >= 2 || ($count === 1 && self::nestedAtom($link->values[0]));
    }

    /** @param string[] $lines */
    private static function writeNested(Link $link, string $pad, string $indent, bool $underName, array &$lines): void
    {
        if (
            !self::nestedLineHolds($link, count($link->values))
            || ($underName && $link->id === null && count($link->values) === 1)
        ) {
            $lines[] = $pad . $link->format();

            return;
        }
        $count = count($link->values);
        while ($count > 0 && self::nestedCanNest($link->values[$count - 1])) {
            --$count;
        }
        while ($count < count($link->values) && !self::nestedLineHolds($link, $count)) {
            ++$count;
        }
        $parts = [];
        if ($link->id !== null) {
            $parts[] = Link::escapeReference($link->id) . ':';
        }
        foreach (array_slice($link->values, 0, $count) as $value) {
            $parts[] = self::nestedAtom($value) ? Link::escapeReference($value->id) : $value->format();
        }
        $lines[] = $pad . implode(' ', $parts);
        foreach (array_slice($link->values, $count) as $value) {
            self::writeNested(
                $value,
                $pad . $indent,
                $indent,
                $underName || ($link->id !== null && $count === 0),
                $lines
            );
        }
    }

    /**
     * Format a list of links into Lino notation.
     *
     * @param Link[]            $links            List of links to format
     * @param bool|FormatConfig $lessParentheses  If true, omit parentheses where safe; or a FormatConfig object
     */
    public static function formatLinks(array $links, bool|FormatConfig $lessParentheses = false): string
    {
        if (!$links) {
            return '';
        }

        // Support FormatConfig as parameter
        if ($lessParentheses instanceof FormatConfig) {
            $config = $lessParentheses;
            // Apply consecutive link grouping if enabled
            if ($config->groupConsecutive) {
                $links = self::groupConsecutiveLinks($links);
            }

            return implode("\n", array_map(static fn (Link $link): string => $link->format($config), $links));
        }

        // Backward compatibility with boolean parameter
        return implode("\n", array_map(static fn (Link $link): string => $link->format($lessParentheses), $links));
    }

    /**
     * Group consecutive links with the same id.
     *
     * For example:
     *     SetA a
     *     SetA b
     *     SetA c
     *
     * Becomes:
     *     SetA
     *       a
     *       b
     *       c
     *
     * @param  Link[] $links List of links to group
     * @return Link[] New list with consecutive links grouped
     */
    private static function groupConsecutiveLinks(array $links): array
    {
        if (!$links) {
            return $links;
        }

        $links = array_values($links);
        $grouped = [];
        $i = 0;
        $count = count($links);

        while ($i < $count) {
            $current = $links[$i];

            // Look ahead for consecutive links with same id
            if ($current->id !== null && $current->values) {
                // Collect all values with same id
                $sameIdValues = $current->values;
                $j = $i + 1;

                while ($j < $count) {
                    $next = $links[$j];
                    if ($next->id === $current->id && $next->values) {
                        $sameIdValues = array_merge($sameIdValues, $next->values);
                        $j++;
                    } else {
                        break;
                    }
                }

                // If we found consecutive links, create grouped link
                if ($j > $i + 1) {
                    $grouped[] = new Link($current->id, $sameIdValues);
                    $i = $j;
                    continue;
                }
            }

            $grouped[] = $current;
            $i++;
        }

        return $grouped;
    }
}
