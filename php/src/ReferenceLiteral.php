<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

use InvalidArgumentException;

/** Version 1 lossless Unicode reference literals and readable legacy quoting. */
final class ReferenceLiteral
{
    public static function encode(string $text): string
    {
        if (preg_match('//u', $text) !== 1) {
            throw new InvalidArgumentException('Reference must be valid UTF-8');
        }
        return '~1{' . bin2hex($text) . '}';
    }

    public static function decode(string $literal): string
    {
        if (
            preg_match('/\A~([0-9]+)\{([0-9a-fA-F]*)\}\z/', $literal, $match) !== 1
            || $match[1] !== '1' || strlen($match[2]) % 2 !== 0
        ) {
            throw new InvalidArgumentException('Invalid or unsupported reference literal (expected ~1{UTF-8 hex})');
        }
        $text = hex2bin($match[2]);
        if (preg_match('//u', $text) !== 1) {
            throw new InvalidArgumentException('Reference literal must contain valid UTF-8');
        }
        return $text;
    }

    public static function hasPrefix(string $text): bool
    {
        return preg_match('/\A~[0-9]+\{/', $text) === 1;
    }

    public static function format(string $text): string
    {
        if (preg_match('//u', $text) !== 1) {
            throw new InvalidArgumentException('Reference must be valid UTF-8');
        }
        if ($text === '' || preg_match('/[\x00-\x1f\x7f]/', $text) === 1) {
            return self::encode($text);
        }
        $needsQuotes = '/[\p{Z}\x{0085}\x{feff}():"\'`]/u';
        if (!self::hasPrefix($text) && !str_starts_with($text, '#') && preg_match($needsQuotes, $text) === 0) {
            return $text;
        }
        $chosen = '';
        $count = PHP_INT_MAX;
        foreach (["'", '"', '`'] as $quote) {
            if (str_starts_with($text, $quote)) {
                continue;
            }
            $longest = 0;
            $run = 0;
            for ($i = 0; $i < strlen($text); $i++) {
                $run = $text[$i] === $quote ? $run + 1 : 0;
                $longest = max($longest, $run);
            }
            $n = ($longest + 1) | 1;
            if ($n < $count) {
                $chosen = $quote;
                $count = $n;
            }
        }
        $delimiter = str_repeat($chosen, $count);
        return $delimiter . $text . $delimiter;
    }
}
