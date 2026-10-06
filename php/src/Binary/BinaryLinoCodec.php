<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;

/** Lossless native model codec. Text helpers explicitly canonicalize groups. */
final readonly class BinaryLinoCodec
{
    public function __construct(
        public Options $options = new Options(),
        public DecodeLimits $limits = new DecodeLimits(),
    ) {
    }
    public function encodePacket(array $document): LinksPacket
    {
        UInt64::require($this->options->arity->contains(2), "arity must contain 2");
        $pending = array_map(fn($n) => [$n, 0], $document);
        $nodes = 0;
        $strings = 0;
        while ($pending) {
            [$node, $depth] = array_pop($pending);
            UInt64::require(
                $node instanceof Link && $depth < $this->limits->maxDepth,
                "invalid model or excessive depth",
            );
            $nodes += 1 + (int) ($node->id !== null && count($node->values) > 0);
            if ($node->id !== null) {
                UInt64::require(mb_check_encoding($node->id, "UTF-8"), "invalid UTF-8");
                UInt64::require(
                    strlen($node->id) <= $this->limits->maxStringBytes - $strings,
                    "string budget exceeded",
                );
                $strings += strlen($node->id);
            }
            UInt64::require($nodes <= $this->limits->maxNodes, "node budget exceeded");
            foreach ($node->values as $v) {
                $pending[] = [$v, $depth + 1];
            }
        }
        $encoder = new Encoder($this->options);
        if ($document) {
            $encoder->list(array_map(fn($n) => $encoder->encode($n), $document));
        }
        return $encoder->finish()->validate($this->limits);
    }
    public function encode(array $document): string
    {
        return $this->encodePacket($document)->toBytes($this->limits);
    }
    public function decodePacket(LinksPacket $packet): array
    {
        return new Decoder($packet, $this->limits)->document();
    }
    public function decode(string $bytes): array
    {
        return $this->decodePacket(LinksPacket::fromBytes($bytes, $this->limits));
    }
    private static function canonical(Link $node): Link
    {
        if (
            $node->id === null &&
            count($node->values) === 1 &&
            $node->values[0]->id !== null &&
            !$node->values[0]->values
        ) {
            return $node->values[0];
        }
        return new Link($node->id, array_map(self::canonical(...), $node->values));
    }
    public function parseDocument(string $text, ?Parser $parser = null): array
    {
        return array_map(self::canonical(...), ($parser ?? new Parser())->parse($text));
    }
    public static function formatReference(string $text): string
    {
        $needsQuotes = '/[\p{Z}\x{0085}\x{0009}-\x{000d}():"\'`]/u';
        if ($text !== "" && !str_starts_with($text, "#") && preg_match($needsQuotes, $text) === 0) {
            return $text;
        }
        $chosen = "";
        $count = PHP_INT_MAX;
        foreach (["'", '"', "`"] as $quote) {
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
    private static function formatLink(Link $node, bool $top = false): string
    {
        if ($node->id !== null && !$node->values) {
            return self::formatReference($node->id);
        }
        $values = implode(" ", array_map(fn($v) => self::formatLink($v), $node->values));
        if ($node->id !== null) {
            return "(" . self::formatReference($node->id) . ": " . $values . ")";
        }
        if (count($node->values) === 1 && $node->values[0]->id !== null && !$node->values[0]->values) {
            return "((" . $values . "))";
        }
        return $top && count($node->values) >= 2 ? $values : "(" . $values . ")";
    }
    public static function formatDocument(array $document): string
    {
        return implode("\n", array_map(fn($n) => self::formatLink($n, true), $document));
    }
    public function encodeText(string $text, ?Parser $parser = null): string
    {
        return $this->encode($this->parseDocument($text, $parser));
    }
    public function decodeText(string $bytes): string
    {
        return self::formatDocument($this->decode($bytes));
    }
}
