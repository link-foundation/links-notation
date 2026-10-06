<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** Inclusive arity; null maximum means unbounded. */
final readonly class ArityRange
{
    public string $min;
    public ?string $max;
    public function __construct(int|string $min = 2, int|string|null $max = 2)
    {
        $this->min = UInt64::value($min);
        $this->max = $max === null ? null : UInt64::value($max);
        UInt64::require(
            $this->min !== "0" &&
                UInt64::compare($this->min, "1152921504606846975") <= 0 &&
                ($this->max === null || UInt64::compare($this->max, $this->min) >= 0),
            "invalid arity",
        );
    }
    public function contains(int|string $length): bool
    {
        $n = UInt64::value($length);
        return UInt64::compare($n, $this->min) >= 0 && ($this->max === null || UInt64::compare($n, $this->max) <= 0);
    }
    public function fixed(): bool
    {
        return $this->min === $this->max;
    }
    public static function parse(string $text): self
    {
        UInt64::require(preg_match('/^[0-9]+(?:\.\.[0-9]*)?$/D', $text) === 1, "invalid arity");
        $parts = explode("..", $text);
        $max = $parts[count($parts) - 1];
        return new self($parts[0], $max === "" ? null : $max);
    }
}
