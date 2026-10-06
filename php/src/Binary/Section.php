<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** A consecutive run of raw links with a reference width and inclusive arity. */
final readonly class Section
{
    public string $gap;
    public function __construct(int|string $gap, public ArityRange $arity, public int $width, public array $links)
    {
        $this->gap = UInt64::value($gap);
    }
}
