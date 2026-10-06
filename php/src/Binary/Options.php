<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** Independently selectable encoder features. */
final readonly class Options
{
    public function __construct(
        public bool $externalReferences = false,
        public ArityRange $arity = new ArityRange(),
        public bool $packedWidths = false,
    ) {
    }
    public static function ofPacket(LinksPacket $packet): self
    {
        $min = 2;
        $max = 2;
        $widths = [];
        foreach ($packet->sections as $section) {
            $widths[$section->width] = true;
            foreach ($section->links as $link) {
                $min = min($min, count($link));
                $max = max($max, count($link));
            }
        }
        return new self($packet->externalReferences, new ArityRange($min, $max), count($widths) > 1);
    }
}
