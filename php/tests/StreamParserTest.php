<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use InvalidArgumentException;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\StreamParser;
use LogicException;
use PHPUnit\Framework\TestCase;

class StreamParserTest extends TestCase
{
    private const DOCUMENT = "first loves data\n"
        . "profile:\n"
        . "  name Ada\n"
        . "  note \"line one\nline two\"\n"
        . "(nested:\n  child value)\n"
        . 'last sees first';

    /** @param Link[] $links */
    private function render(array $links): array
    {
        return array_map(static fn (Link $link): string => (string) $link, $links);
    }

    public function testMatchesCanonicalParserOneByteAtATime(): void
    {
        $stream = new StreamParser();
        for ($index = 0; $index < strlen(self::DOCUMENT); $index++) {
            $stream->write(self::DOCUMENT[$index]);
        }

        $this->assertSame($this->render((new Parser())->parse(self::DOCUMENT)), $this->render($stream->finish()));
    }

    public function testEmitsOnlyCompleteRecordsToCallback(): void
    {
        $seen = [];
        $stream = (new StreamParser())->onLink(static function (Link $link) use (&$seen): void {
            $seen[] = $link;
        });

        $this->assertSame([], $stream->write("profile:\n  name Ada\n  note \"first\nsecond\"\n"));
        $emitted = $stream->write('n');

        $this->assertCount(1, $emitted);
        $this->assertSame($emitted, $seen);
    }

    public function testSupportsLineChunksFinalRecordAndPosition(): void
    {
        $stream = new StreamParser();
        foreach (preg_split('/(?<=\n)/', self::DOCUMENT, -1, PREG_SPLIT_NO_EMPTY) as $line) {
            $stream->write($line);
        }

        $this->assertSame($this->render((new Parser())->parse(self::DOCUMENT)), $this->render($stream->finish()));
        $this->assertSame(strlen(self::DOCUMENT), $stream->position()['offset']);
        $this->assertSame(0, $stream->position()['buffered']);
    }

    public function testSupportsDrainResetAndBoundedMemory(): void
    {
        $seen = [];
        $stream = (new StreamParser(collect: false, maxBufferSize: 8))->onLink(
            static function (Link $link) use (&$seen): void {
                $seen[] = $link;
            }
        );
        for ($index = 0; $index < 100; $index++) {
            $stream->write("a\n");
        }
        $this->assertSame([], $stream->drain());
        $this->assertCount(1, $stream->finish());
        $this->assertCount(100, $seen);

        $stream->reset();
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Buffered record');
        $stream->write('123456789');
    }

    public function testProvidesAGeneratorAdapter(): void
    {
        $actual = iterator_to_array(StreamParser::parseChunks(["one link\n", 'two link']));

        $this->assertSame(['(one link)', '(two link)'], $this->render($actual));
    }

    public function testRejectsWritesAfterFinish(): void
    {
        $stream = new StreamParser();
        $stream->finish('one');
        $this->expectException(LogicException::class);
        $stream->write('two');
    }
}
