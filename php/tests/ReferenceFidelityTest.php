<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Binary\BinaryLinoCodec;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\FormatConfig;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\ReferenceLiteral;
use LinkFoundation\LinksNotation\StreamParser;
use PHPUnit\Framework\TestCase;

class ReferenceFidelityTest extends TestCase
{
    private function fixtures(): array
    {
        $lines = file(dirname(__DIR__, 2) . '/docs/protocol/reference-literals.txt', FILE_IGNORE_NEW_LINES);
        return array_map(
            static fn (string $hex): string => $hex === '-' ? '' : hex2bin($hex),
            array_filter($lines, static fn (string $line): bool => !str_starts_with($line, '#'))
        );
    }

    public function testNativeReferenceFidelity(): void
    {
        foreach ($this->fixtures() as $reference) {
            $original = [new Link($reference, [new Link($reference), new Link('nested', [new Link($reference)])])];
            foreach ([false, true, new FormatConfig(maxInlineRefs: 1, preferInline: false)] as $less) {
                $this->assertEquals($original, (new Parser())->parse($original[0]->format($less)));
            }
        }
    }

    public function testReferenceLiteralsAtEveryChunkSplit(): void
    {
        foreach ($this->fixtures() as $reference) {
            $this->assertSame($reference, ReferenceLiteral::decode(ReferenceLiteral::encode($reference)));
            foreach (
                [
                Link::escapeReference($reference),
                BinaryLinoCodec::formatReference($reference),
                ReferenceLiteral::encode($reference),
                ] as $literal
            ) {
                $text = '(root: ' . $literal . ")\n(" . $literal . ": fixture)";
                $expected = [new Link('root', [new Link($reference)]), new Link($reference, [new Link('fixture')])];
                $this->assertEquals($expected, (new Parser())->parse($text));
                for ($split = 0; $split <= strlen($text); $split++) {
                    $stream = new StreamParser();
                    $stream->write(substr($text, 0, $split));
                    $stream->write(substr($text, $split));
                    $this->assertEquals($expected, $stream->finish());
                }
            }
        }
    }

    public function testBinaryReferenceFidelity(): void
    {
        $codec = new BinaryLinoCodec();
        foreach ($this->fixtures() as $reference) {
            $original = [new Link($reference, [new Link($reference)])];
            $decoded = $codec->decode($codec->encode($original));
            $this->assertEquals($original, $decoded);
            $this->assertEquals($original, $codec->parseDocument($codec->formatDocument($decoded)));
        }
    }

    public function testMalformedReferenceLiteralsAreRejected(): void
    {
        $invalid = file(dirname(__DIR__, 2) . '/docs/protocol/invalid-reference-literals.txt', FILE_IGNORE_NEW_LINES);
        foreach ($invalid as $literal) {
            if (str_starts_with($literal, '#')) {
                continue;
            }
            foreach (
                [
                static fn () => ReferenceLiteral::decode($literal),
                static fn () => (new Parser())->parse($literal),
                ] as $attempt
            ) {
                try {
                    $attempt();
                    self::fail('Accepted invalid literal: ' . $literal);
                } catch (\InvalidArgumentException | \LinkFoundation\LinksNotation\ParseException $error) {
                    self::assertNotEmpty($error->getMessage());
                }
            }
        }
        self::assertSame('é', ReferenceLiteral::decode('~1{C3A9}'));
        $this->expectException(\InvalidArgumentException::class);
        ReferenceLiteral::encode("\xff");
    }
}
