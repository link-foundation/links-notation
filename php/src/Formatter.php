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
