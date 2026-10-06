<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

use LinkFoundation\LinksNotation\Link;

/** @internal Content-addressed marker-point mapping. */
final class Encoder
{
    private array $doublets = [];
    private array $tuples = [];
    private array $created = [];
    private array $powers = [["i", "1"]];
    public function __construct(private readonly Options $options)
    {
    }
    private function link(array $items): array
    {
        $key = implode(",", array_map(fn($n) => $n[0] . $n[1], $items));
        if (!isset($this->created[$key])) {
            $doublet = count($items) === 2 && !in_array("t", array_column($items, 0), true);
            $node = [$doublet ? "d" : "t", (string) count($doublet ? $this->doublets : $this->tuples)];
            if ($doublet) {
                $this->doublets[] = $items;
            } else {
                $this->tuples[] = $items;
            }
            $this->created[$key] = $node;
        }
        return $this->created[$key];
    }
    private function chain(array $items): array
    {
        $tail = ["i", "0"];
        foreach (array_reverse($items) as $head) {
            $tail = $this->link([$head, $tail]);
        }
        return $tail;
    }
    private function typed(int $marker, array $elements): array
    {
        $items = array_merge([["i", (string) $marker]], $elements);
        return count($items) !== 2 && $this->options->arity->contains(count($items))
            ? $this->link($items)
            : $this->link([$items[0], $this->chain($elements)]);
    }
    public function list(array $elements): array
    {
        if (!$elements) {
            return ["i", "0"];
        }
        return count($elements) === 2 || $this->options->arity->contains(count($elements))
            ? $this->link($elements)
            : $this->typed(4, $elements);
    }
    private function unary(string $value): array
    {
        $bytes = UInt64::bytes($value, 8);
        $powers = [];
        for ($bit = 63; $bit >= 0; $bit--) {
            if (ord($bytes[intdiv($bit, 8)]) & (1 << $bit % 8)) {
                while (count($this->powers) <= $bit) {
                    $p = $this->powers[count($this->powers) - 1];
                    $this->powers[] = $this->link([$p, $p]);
                }
                $powers[] = $this->powers[$bit];
            }
        }
        if (!$powers) {
            return ["i", "0"];
        }
        $sum = array_pop($powers);
        foreach (array_reverse($powers) as $power) {
            $sum = $this->link([$power, $sum]);
        }
        return $sum;
    }
    private function scalar(string $value): array
    {
        return $this->options->externalReferences && UInt64::compare($value, "9223372036854775807") <= 0
            ? ["e", $value]
            : $this->unary($value);
    }
    private function reference(string $text): array
    {
        if (
            strlen($text) <= 20 &&
            preg_match('/^(0|[1-9][0-9]*)$/D', $text) === 1 &&
            UInt64::compare($text, UInt64::MAX) <= 0
        ) {
            return $this->options->externalReferences && UInt64::compare($text, "9223372036854775807") <= 0
                ? ["e", $text]
                : $this->link([["i", "2"], $this->unary($text)]);
        }
        return $this->typed(
            3,
            array_map(fn($c) => $this->scalar((string) mb_ord($c, "UTF-8")), mb_str_split($text, 1, "UTF-8")),
        );
    }
    public function encode(Link $node): array
    {
        if ($node->id !== null && !$node->values) {
            return $this->reference($node->id);
        }
        $elements = $node->id === null ? [] : [$this->reference($node->id)];
        foreach ($node->values as $value) {
            $elements[] = $this->encode($value);
        }
        return $node->id !== null ? $this->typed(5, $elements) : $this->list($elements);
    }
    public function finish(): LinksPacket
    {
        $links = [];
        foreach (array_merge($this->doublets, $this->tuples) as $items) {
            $refs = [];
            foreach ($items as [$kind, $value]) {
                if ($kind === "d" || $kind === "t") {
                    $value = (string) (6 + (int) $value + ($kind === "t" ? count($this->doublets) : 0));
                }
                $refs[] = new Reference($value, $kind === "e");
            }
            $links[] = [(string) (6 + count($links)), $refs];
        }
        return LinksPacket::pack($this->options->externalReferences, $links, $this->options->packedWidths);
    }
}
