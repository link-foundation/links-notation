<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** @internal Exact decimal arithmetic; never converts unsigned values to floats. */
final class UInt64
{
    public const MAX = "18446744073709551615";
    public const WIDTHS = [1, 2, 4, 8];
    public static function require(bool $ok, string $message): void
    {
        if (!$ok) {
            throw new \InvalidArgumentException("binary notation: " . $message);
        }
    }
    public static function value(int|string $value): string
    {
        $text = (string) $value;
        self::require(preg_match('/^[0-9]+$/D', $text) === 1, "expected uint64");
        $text = ltrim($text, "0");
        $text = $text === "" ? "0" : $text;
        self::require(self::compare($text, self::MAX) <= 0, "uint64 overflow");
        return $text;
    }
    public static function compare(string $a, string $b): int
    {
        return strlen($a) <=> strlen($b) ?: strcmp($a, $b);
    }
    public static function add(string $a, string $b): string
    {
        $result = "";
        $carry = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0 || $j >= 0 || $carry; $i--, $j--) {
            $sum = ($i >= 0 ? (int) $a[$i] : 0) + ($j >= 0 ? (int) $b[$j] : 0) + $carry;
            $result = (string) ($sum % 10) . $result;
            $carry = intdiv($sum, 10);
        }
        return self::value($result);
    }
    public static function subtract(string $a, string $b): string
    {
        self::require(self::compare($a, $b) >= 0, "unsigned underflow");
        $result = "";
        $borrow = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0; $i--, $j--) {
            $digit = (int) $a[$i] - ($j >= 0 ? (int) $b[$j] : 0) - $borrow;
            $borrow = $digit < 0 ? 1 : 0;
            $result = (string) (($digit + 10) % 10) . $result;
        }
        return self::value($result);
    }
    public static function divide(string $n, int $divisor): array
    {
        $quotient = "";
        $remainder = 0;
        for ($i = 0; $i < strlen($n); $i++) {
            $remainder = $remainder * 10 + (int) $n[$i];
            $quotient .= (string) intdiv($remainder, $divisor);
            $remainder %= $divisor;
        }
        return [self::value($quotient), $remainder];
    }
    public static function multiply(string $n, int $multiplier): string
    {
        $result = "";
        $carry = 0;
        for ($i = strlen($n) - 1; $i >= 0; $i--) {
            $digit = (int) $n[$i] * $multiplier + $carry;
            $result = (string) ($digit % 10) . $result;
            $carry = intdiv($digit, 10);
        }
        while ($carry) {
            $result = (string) ($carry % 10) . $result;
            $carry = intdiv($carry, 10);
        }
        return self::value($result);
    }
    public static function bytes(string $n, int $width): string
    {
        $result = "";
        for ($i = 0; $i < $width; $i++) {
            [$n, $byte] = self::divide($n, 256);
            $result .= chr($byte);
        }
        self::require($n === "0", "reference outside width");
        return $result;
    }
    public static function fromBytes(string $bytes): string
    {
        $result = "0";
        for ($i = strlen($bytes) - 1; $i >= 0; $i--) {
            $result = self::add(self::multiply($result, 256), (string) ord($bytes[$i]));
        }
        return $result;
    }
    public static function negateBytes(string $bytes): string
    {
        $carry = 1;
        for ($i = 0; $i < strlen($bytes); $i++) {
            $value = 255 - ord($bytes[$i]) + $carry;
            $bytes[$i] = chr($value & 255);
            $carry = $value >> 8;
        }
        return $bytes;
    }
    public static function width(Reference $reference, bool $external): int
    {
        self::require(!$reference->external || $external, "external references disabled");
        $capacities = $external
            ? ["127", "32767", "2147483647", "9223372036854775807"]
            : ["255", "65535", "4294967295", self::MAX];
        foreach (self::WIDTHS as $i => $width) {
            if (self::compare($reference->value, $capacities[$i]) <= 0) {
                return $width;
            }
        }
        throw new \InvalidArgumentException("reference exceeds capacity");
    }
    public static function leb(string $n): string
    {
        $result = "";
        do {
            [$n, $byte] = self::divide($n, 128);
            $result .= chr($byte | ($n === "0" ? 0 : 128));
        } while ($n !== "0");
        return $result;
    }
}
