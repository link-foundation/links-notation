<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Binary;

/** Exact packet stream reader. Reuse it across concatenated packets. */
final class PacketReader
{
    public function __construct(private mixed $stream)
    {
        UInt64::require(is_resource($stream) && get_resource_type($stream) === "stream", "expected stream");
    }
    private function raw(int $width): string
    {
        $data = "";
        while (strlen($data) < $width) {
            $part = fread($this->stream, $width - strlen($data));
            UInt64::require($part !== false && $part !== "", "unexpected end of packet");
            $data .= $part;
        }
        return $data;
    }
    private function leb(): string
    {
        $groups = [];
        for ($i = 0; $i < 10; $i++) {
            $byte = ord($this->raw(1));
            UInt64::require($i !== 9 || ($byte & 127) <= 1, "LEB128 overflow");
            $groups[] = $byte & 127;
            if ($byte < 128) {
                $value = "0";
                foreach (array_reverse($groups) as $group) {
                    $value = UInt64::add(UInt64::multiply($value, 128), (string) $group);
                }
                return $value;
            }
        }
        throw new \InvalidArgumentException("LEB128 overflow");
    }
    public function read(DecodeLimits $limits = new DecodeLimits()): ?LinksPacket
    {
        $first = fread($this->stream, 1);
        UInt64::require($first !== false, "stream read failed");
        if ($first === "" && feof($this->stream)) {
            return null;
        }
        UInt64::require($first !== "", "stream returned no data");
        $header = ord($first);
        UInt64::require(($header & 240) === 16, "unsupported binary version");
        $headers = [];
        $counts = [];
        if ($header & 2) {
            UInt64::require(($header & 12) === 0, "explicit header width bits set");
            $n = $this->leb();
            UInt64::require(UInt64::compare($n, (string) $limits->maxLinks) <= 0, "too many sections");
            $address = "1";
            $total = 0;
            for ($i = 0; $i < (int) $n; $i++) {
                [$minimum, $flags] = UInt64::divide($this->leb(), 16);
                $gap = $flags & 4 ? $this->leb() : "0";
                $extra = $flags & 8 ? $this->leb() : null;
                $arity = new ArityRange(
                    $minimum,
                    $extra === null ? $minimum : ($extra === "0" ? null : UInt64::add($minimum, $extra)),
                );
                $count = $this->leb();
                $address = UInt64::add(UInt64::add($address, $gap), $count);
                UInt64::require(UInt64::compare($count, (string) ($limits->maxLinks - $total)) <= 0, "too many links");
                $total += (int) $count;
                $headers[] = new Section($gap, $arity, UInt64::WIDTHS[$flags & 3], []);
                $counts[] = (int) $count;
            }
        } else {
            $count = $this->leb();
            UInt64::add("6", $count);
            UInt64::require(UInt64::compare($count, (string) $limits->maxLinks) <= 0, "too many links");
            if ($count !== "0") {
                $headers[] = new Section(5, new ArityRange(), UInt64::WIDTHS[($header >> 2) & 3], []);
                $counts[] = (int) $count;
            }
        }
        $sections = [];
        $references = 0;
        foreach ($headers as $i => $s) {
            $links = [];
            for ($j = 0; $j < $counts[$i]; $j++) {
                $length = UInt64::add($s->arity->min, $s->arity->fixed() ? "0" : $this->leb());
                UInt64::require($s->arity->contains($length), "link outside arity");
                UInt64::require(
                    UInt64::compare($length, (string) ($limits->maxReferences - $references)) <= 0,
                    "too many references",
                );
                $references += (int) $length;
                $link = [];
                for ($k = 0; $k < (int) $length; $k++) {
                    $raw = $this->raw($s->width);
                    $external = $header & 1 && ord($raw[$s->width - 1]) & 128;
                    if ($external) {
                        $zero = str_repeat("\0", $s->width - 1) . "\x80";
                        $raw = $raw === $zero ? str_repeat("\0", $s->width) : UInt64::negateBytes($raw);
                    }
                    $link[] = new Reference(UInt64::fromBytes($raw), (bool) $external);
                }
                $links[] = $link;
            }
            $sections[] = new Section($s->gap, $s->arity, $s->width, $links);
        }
        return new LinksPacket((bool) ($header & 1), $sections);
    }
}
