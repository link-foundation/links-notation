<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Binary\ArityRange;
use LinkFoundation\LinksNotation\Binary\BinaryLinoCodec;
use LinkFoundation\LinksNotation\Binary\DecodeLimits;
use LinkFoundation\LinksNotation\Binary\LinksPacket;
use LinkFoundation\LinksNotation\Binary\Options;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class BinaryTest extends TestCase
{
    public function testUnicodeWhitespaceIsQuoted(): void
    {
        foreach (["\u{0085}", "x\u{00a0}y", "x\u{2028}y"] as $text) {
            self::assertSame("'" . $text . "'", BinaryLinoCodec::formatReference($text));
        }
    }

    public function testSharedVectors(): void
    {
        $count = 0;
        $lines = file(__DIR__ . "/../../docs/protocol/binary-links-notation-vectors.txt", FILE_IGNORE_NEW_LINES);
        foreach ($lines as $line) {
            if ($line === "" || str_starts_with($line, "#")) {
                continue;
            }
            $f = explode("\t", $line);
            $bytes = hex2bin(str_replace(" ", "", $f[count($f) - 1]));
            if ($f[0] === "document") {
                $codec = new BinaryLinoCodec(
                    new Options($f[2] === "external", ArityRange::parse($f[3]), $f[4] === "packed"),
                );
                $document = $codec->parseDocument(str_replace('\\n', "\n", $f[1]));
                self::assertSame($bytes, $codec->encode($document), $line);
                self::assertEquals($document, $codec->decode($bytes), $line);
            } else {
                $links = LinksPacket::parseLinks($f[1]);
                $packet = LinksPacket::pack($f[2] === "external", $links, $f[3] === "packed");
                self::assertSame($bytes, $packet->toBytes(), $line);
                self::assertEquals($links, LinksPacket::fromBytes($bytes)->links(), $line);
            }
            $count++;
        }
        self::assertSame(96, $count);
    }

    public function testNativeTextModels(): void
    {
        $cases = [
            "",
            "()",
            '""',
            "a",
            "(a)",
            "((a))",
            "(a b c)",
            '("": () "" (b))',
            "a:\n  b\n  c",
            '"#x" "λ😀" "007" "18446744073709551615"',
            "# comment\n(a # tail\n b)",
        ];
        foreach ($cases as $source) {
            $model = new Parser()->parse($source);
            foreach ([false, true] as $external) {
                foreach (["2", "2..3", "1.."] as $arity) {
                    foreach ([false, true] as $packed) {
                        $codec = new BinaryLinoCodec(new Options($external, ArityRange::parse($arity), $packed));
                        $decoded = $codec->decode($codec->encode($model));
                        self::assertCount(count($model), $decoded);
                        foreach ($model as $i => $node) {
                            self::assertTrue($node->equals($decoded[$i]), $source);
                        }
                    }
                }
            }
        }
    }

    public function testLimitsAndMalformed(): void
    {
        $model = [new Link(null, [new Link("abcdef")])];
        $bytes = new BinaryLinoCodec()->encode($model);
        $cases = [
            new DecodeLimits(maxNodes: 1),
            new DecodeLimits(maxStringBytes: 2),
            new DecodeLimits(maxDepth: 1),
            new DecodeLimits(maxLinks: 1),
            new DecodeLimits(maxReferences: 1),
        ];
        foreach ($cases as $limits) {
            $codec = new BinaryLinoCodec(limits: $limits);
            foreach ([fn() => $codec->decode($bytes), fn() => $codec->encode($model)] as $action) {
                try {
                    $action();
                    self::fail("Ignored limits");
                } catch (\InvalidArgumentException) {
                    self::assertTrue(true);
                }
            }
        }
        foreach (["", "20", "1e00", "1001", "100000", "10ffffffffffffffffffff"] as $hex) {
            try {
                new BinaryLinoCodec()->decode(hex2bin($hex));
                self::fail("Accepted malformed packet");
            } catch (\InvalidArgumentException) {
                self::assertTrue(true);
            }
        }
    }

    public function testPacketStreamsUint64TruncationAndDepth(): void
    {
        foreach ([false, true] as $external) {
            $references = $external ? "#0 #9223372036854775807" : "0 18446744073709551615";
            $links = LinksPacket::parseLinks("6:" . $references);
            $data = LinksPacket::pack($external, $links, true)->toBytes();
            $stream = fopen("php://memory", "w+b");
            fwrite($stream, $data . $data);
            rewind($stream);
            $reader = new \LinkFoundation\LinksNotation\Binary\PacketReader($stream);
            self::assertEquals($links, $reader->read()->links());
            self::assertSame(strlen($data), ftell($stream));
            self::assertEquals($links, $reader->read()->links());
            self::assertNull($reader->read());
            fclose($stream);
            for ($end = 0; $end < strlen($data); $end++) {
                try {
                    LinksPacket::fromBytes(substr($data, 0, $end));
                    self::fail("Accepted truncation");
                } catch (\InvalidArgumentException) {
                    self::assertTrue(true);
                }
            }
        }
        $model = [new Link("leaf")];
        for ($i = 0; $i < 70; $i++) {
            $model = [new Link(null, $model)];
        }
        try {
            new BinaryLinoCodec()->encode($model);
            self::fail("Ignored default depth");
        } catch (\InvalidArgumentException) {
            self::assertTrue(true);
        }
        $codec = new BinaryLinoCodec(limits: new DecodeLimits(maxDepth: 80));
        self::assertEquals($model, $codec->decode($codec->encode($model)));
    }
}
