<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** Decimal strings preserve the complete uint64 range on every PHP platform. */
final readonly class Reference
{
    public string $value;
    public function __construct(int|string $value, public bool $external = false)
    {
        $this->value = UInt64::value($value);
    }
}
