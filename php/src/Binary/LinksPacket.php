<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** Address-ordered raw links. Document constraints are applied by the codec. */
final readonly class LinksPacket
{
    public function __construct(public bool $externalReferences = false, public array $sections = [])
    {
    }
    public function links(): array
    {
        $result = [];
        $address = "1";
        foreach ($this->sections as $s) {
            $address = UInt64::add($address, $s->gap);
            foreach ($s->links as $link) {
                $result[] = [$address, $link];
                $address = UInt64::add($address, "1");
            }
        }
        return $result;
    }
    public function validate(DecodeLimits $limits = new DecodeLimits()): self
    {
        UInt64::require(count($this->sections) <= $limits->maxLinks, "too many sections");
        $address = "1";
        $links = 0;
        $references = 0;
        foreach ($this->sections as $s) {
            UInt64::require(
                $s instanceof Section && in_array($s->width, UInt64::WIDTHS, true),
                "invalid section or width",
            );
            $address = UInt64::add(UInt64::add($address, $s->gap), (string) count($s->links));
            $links += count($s->links);
            UInt64::require($links <= $limits->maxLinks, "too many links");
            foreach ($s->links as $link) {
                UInt64::require($s->arity->contains(count($link)), "link outside arity");
                UInt64::require(count($link) <= $limits->maxReferences - $references, "too many references");
                $references += count($link);
                foreach ($link as $r) {
                    UInt64::require(
                        $r instanceof Reference && UInt64::width($r, $this->externalReferences) <= $s->width,
                        "reference outside width",
                    );
                }
            }
        }
        return $this;
    }
    public function toBytes(DecodeLimits $limits = new DecodeLimits()): string
    {
        $this->validate($limits);
        $s = $this->sections[0] ?? null;
        $compact =
            $s === null ||
            (count($this->sections) === 1 &&
                $s->gap === "5" &&
                $s->arity->min === "2" &&
                $s->arity->max === "2" &&
                count($s->links) > 0);
        $header = 16 | (int) $this->externalReferences;
        $out = "";
        if ($compact) {
            $out =
                chr($header | (array_search($s?->width ?? 1, UInt64::WIDTHS, true) << 2)) .
                UInt64::leb((string) count($s?->links ?? []));
        } else {
            $out = chr($header | 2) . UInt64::leb((string) count($this->sections));
            foreach ($this->sections as $s) {
                $flags =
                    array_search($s->width, UInt64::WIDTHS, true) |
                    ($s->gap !== "0" ? 4 : 0) |
                    ($s->arity->fixed() ? 0 : 8);
                $out .= UInt64::leb(UInt64::add(UInt64::multiply($s->arity->min, 16), (string) $flags));
                if ($s->gap !== "0") {
                    $out .= UInt64::leb($s->gap);
                }
                if (!$s->arity->fixed()) {
                    $out .= UInt64::leb(
                        $s->arity->max === null ? "0" : UInt64::subtract($s->arity->max, $s->arity->min),
                    );
                }
                $out .= UInt64::leb((string) count($s->links));
            }
        }
        foreach ($this->sections as $s) {
            foreach ($s->links as $link) {
                if (!$s->arity->fixed()) {
                    $out .= UInt64::leb(UInt64::subtract((string) count($link), $s->arity->min));
                }
                foreach ($link as $r) {
                    $raw = UInt64::bytes($r->value, $s->width);
                    if ($r->external) {
                        $raw = $r->value === "0" ? str_repeat("\0", $s->width - 1) . "\x80" : UInt64::negateBytes($raw);
                    }
                    $out .= $raw;
                }
            }
        }
        return $out;
    }
    public function writeTo(mixed $stream, DecodeLimits $limits = new DecodeLimits()): void
    {
        $data = $this->toBytes($limits);
        $offset = 0;
        while ($offset < strlen($data)) {
            $n = fwrite($stream, substr($data, $offset));
            UInt64::require($n !== false && $n > 0, "stream write failed");
            $offset += $n;
        }
    }
    public static function fromBytes(string $bytes, DecodeLimits $limits = new DecodeLimits()): self
    {
        $stream = fopen("php://memory", "w+b");
        try {
            fwrite($stream, $bytes);
            rewind($stream);
            $packet = new PacketReader($stream)->read($limits);
            UInt64::require($packet !== null, "empty input");
            UInt64::require(fread($stream, 1) === "", "trailing bytes");
            return $packet;
        } finally {
            fclose($stream);
        }
    }
    public static function parseLinks(string $text): array
    {
        $links = [];
        foreach (explode(";", $text) as $entry) {
            if (trim($entry) === "") {
                continue;
            }
            $p = explode(":", $entry);
            UInt64::require(count($p) === 2, "invalid raw links");
            $refs = [];
            foreach (preg_split("/\s+/", trim($p[1])) as $r) {
                if ($r === "") {
                    continue;
                }
                $external = str_starts_with($r, "#");
                $refs[] = new Reference($external ? substr($r, 1) : $r, $external);
            }
            $links[] = [UInt64::value(trim($p[0])), $refs];
        }
        return $links;
    }
    public static function pack(bool $external, array $links, bool $packed = false): self
    {
        $needs = [];
        $previous = "0";
        foreach ($links as $i => [$address, $refs]) {
            $address = UInt64::value($address);
            $links[$i][0] = $address;
            UInt64::require(
                UInt64::compare($address, $previous) > 0 && $address !== UInt64::MAX && count($refs) > 0,
                "invalid address order or empty link",
            );
            $previous = $address;
            $needs[] = max(array_map(fn($r) => UInt64::width($r, $external), $refs));
        }
        $plan = static function (bool $packed) use ($links, $needs): array {
            if (!$links) {
                return [];
            }
            $widest = max($needs);
            $costs = array_fill(0, 8, PHP_INT_MAX >> 2);
            $opens = [];
            $bests = [];
            $cheapest = static fn($costs) => array_search(min($costs), $costs, true);
            foreach ($links as $i => [$address, $refs]) {
                $best = $cheapest($costs);
                $bests[] = $best;
                $before = $i ? $costs[$best] : 0;
                $next = array_fill(0, 8, PHP_INT_MAX >> 2);
                $mask = 0;
                for ($state = 0; $state < 8; $state++) {
                    $width = UInt64::WIDTHS[intdiv($state, 2)];
                    $variable = $state % 2;
                    if ((!$packed && $width !== $widest) || $width < $needs[$i]) {
                        continue;
                    }
                    $opening = $before + 2 + $variable;
                    $continuing =
                        $i &&
                        UInt64::add($links[$i - 1][0], "1") === $address &&
                        ($variable || count($links[$i - 1][1]) === count($refs))
                            ? $costs[$state]
                            : PHP_INT_MAX >> 2;
                    if ($continuing <= $opening) {
                        $next[$state] = $continuing + count($refs) * $width + $variable;
                    } else {
                        $next[$state] = $opening + count($refs) * $width + $variable;
                        $mask |= 1 << $state;
                    }
                }
                $opens[] = $mask;
                $costs = $next;
            }
            $result = [];
            $end = count($links);
            $state = $cheapest($costs);
            for ($i = count($links) - 1; $i >= 0; $i--) {
                if ($opens[$i] & (1 << $state)) {
                    $result[] = [$end - $i, UInt64::WIDTHS[intdiv($state, 2)]];
                    $end = $i;
                    $state = $bests[$i];
                }
            }
            return array_reverse($result);
        };
        $packet = static function (array $plan) use ($links, $external): self {
            $sections = [];
            $index = 0;
            $address = "1";
            foreach ($plan as [$count, $width]) {
                $members = array_slice($links, $index, $count);
                $start = $members[0][0];
                $refs = array_column($members, 1);
                $lengths = array_map("count", $refs);
                $sections[] = new Section(
                    UInt64::subtract($start, $address),
                    new ArityRange(min($lengths), max($lengths)),
                    $width,
                    $refs,
                );
                $index += $count;
                $address = UInt64::add($start, (string) $count);
            }
            return new self($external, $sections);
        };
        $uniform = $packet($plan(false));
        if (!$packed) {
            return $uniform;
        }
        $candidate = $packet($plan(true));
        return strlen($candidate->toBytes(DecodeLimits::unlimited())) <
            strlen($uniform->toBytes(DecodeLimits::unlimited()))
            ? $candidate
            : $uniform;
    }
}
