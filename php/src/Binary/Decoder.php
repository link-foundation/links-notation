<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

use LinkFoundation\LinksNotation\Link;

/** @internal Bounded, backward-reference-only document expansion. */
final class Decoder
{
    private array $links = [];
    private array $unary = [];
    private int $nodes;
    private int $strings;
    public function __construct(LinksPacket $packet, private readonly DecodeLimits $limits)
    {
        $packet->validate($limits);
        $this->nodes = $limits->maxNodes;
        $this->strings = $limits->maxStringBytes;
        foreach ($packet->links() as [$address, $refs]) {
            UInt64::require(
                $address === (string) (6 + count($this->links)),
                "document links must be contiguous from 6",
            );
            foreach ($refs as $r) {
                UInt64::require(
                    $r->external || UInt64::compare($r->value, $address) < 0,
                    "document contains forward reference",
                );
            }
            $a = count($refs) === 2 ? $this->unaryValue($refs[0]) : null;
            $b = count($refs) === 2 ? $this->unaryValue($refs[1]) : null;
            $value = null;
            if ($a !== null && $b !== null && UInt64::compare($a, UInt64::subtract(UInt64::MAX, $b)) <= 0) {
                $value = UInt64::add($a, $b);
            }
            $this->unary[] = $value;
            $this->links[] = $refs;
        }
    }
    private function unaryValue(Reference $r): ?string
    {
        if ($r->external) {
            return null;
        }
        if (UInt64::compare($r->value, "1") <= 0) {
            return $r->value;
        }
        return UInt64::compare($r->value, "6") >= 0 ? $this->unary[(int) $r->value - 6] : null;
    }
    private function chain(Reference $tail): array
    {
        $result = [];
        while ($tail->external || $tail->value !== "0") {
            UInt64::require(!$tail->external && UInt64::compare($tail->value, "6") >= 0, "broken chain");
            $items = $this->links[(int) $tail->value - 6];
            UInt64::require(
                count($items) === 2 && count($result) < $this->limits->maxNodes,
                "broken or excessive chain",
            );
            $result[] = $items[0];
            $tail = $items[1];
        }
        return $result;
    }
    private function number(Reference $r): string
    {
        $value = $r->external ? $r->value : $this->unaryValue($r);
        UInt64::require($value !== null, "expected unary number");
        return $value;
    }
    private function text(string $text): Link
    {
        UInt64::require(strlen($text) <= $this->strings, "string budget exceeded");
        $this->strings -= strlen($text);
        return new Link($text);
    }
    private function decode(Reference $r, int $depth): Link
    {
        UInt64::require($depth < $this->limits->maxDepth && --$this->nodes >= 0, "node or depth budget exceeded");
        if ($r->external) {
            return $this->text($r->value);
        }
        if ($r->value === "0") {
            return new Link();
        }
        UInt64::require(UInt64::compare($r->value, "6") >= 0, "standalone marker");
        $items = $this->links[(int) $r->value - 6];
        $elements = $items;
        $first = $items[0];
        if (!$first->external && UInt64::compare($first->value, "1") >= 0 && UInt64::compare($first->value, "5") <= 0) {
            $marker = (int) $first->value;
            $elements = count($items) !== 2 || $marker === 2 ? array_slice($items, 1) : $this->chain($items[1]);
            if ($marker === 2) {
                UInt64::require(count($elements) === 1, "number needs one value");
                return $this->text($this->number($elements[0]));
            }
            if ($marker === 3) {
                $text = "";
                foreach ($elements as $e) {
                    $point = $this->number($e);
                    UInt64::require(
                        UInt64::compare($point, "1114111") <= 0 &&
                            !(UInt64::compare($point, "55296") >= 0 && UInt64::compare($point, "57343") <= 0),
                        "invalid Unicode scalar",
                    );
                    $text .= mb_chr((int) $point, "UTF-8");
                }
                return $this->text($text);
            }
            if ($marker === 5) {
                UInt64::require(count($elements) > 0, "identified needs id");
                $id = $this->decode($elements[0], $depth);
                UInt64::require($id->id !== null && !$id->values, "id must be reference");
                return new Link($id->id, array_map(fn($e) => $this->decode($e, $depth + 1), array_slice($elements, 1)));
            }
            UInt64::require($marker === 4, "invalid typed marker");
        }
        return new Link(null, array_map(fn($e) => $this->decode($e, $depth + 1), $elements));
    }
    public function document(): array
    {
        if (!$this->links) {
            return [];
        }
        $root = $this->links[count($this->links) - 1];
        $first = $root[0];
        if (count($root) === 2 && !$first->external && $first->value === "4") {
            $elements = $this->chain($root[1]);
        } else {
            UInt64::require(
                $first->external || $first->value === "0" || UInt64::compare($first->value, "5") > 0,
                "root must be list",
            );
            $elements = $root;
        }
        return array_map(fn($e) => $this->decode($e, 0), $elements);
    }
}
