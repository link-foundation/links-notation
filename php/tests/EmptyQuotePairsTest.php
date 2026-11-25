<?php

/**
 * Issue #443: an empty quoted value at the end of a line must not swallow the
 * lines after it.
 *
 * An even run of quotes (`""`, `''`, `""""`, ...) followed by whitespace up to
 * the end of its line is the empty reference, however later lines continue. A
 * run followed directly by text (`""x`) still opens a reference that may reach
 * across lines, so multiline references keep working.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\StreamParser;
use PHPUnit\Framework\TestCase;

class EmptyQuotePairsTest extends TestCase
{
    /**
     * @param  Link[] $links
     * @return array<int, array<int, mixed>>
     */
    private static function tree(array $links): array
    {
        return array_map(
            static fn (Link $link): array => [$link->id, ...self::tree($link->values)],
            $links
        );
    }

    /** @return array<int, array<int, mixed>> */
    private static function parses(string $document): array
    {
        return self::tree((new Parser())->parse($document));
    }

    private static function formats(string $document): string
    {
        return Formatter::formatLinks((new Parser())->parse($document));
    }

    public function testEmptyValuesOnConsecutiveIndentedLinesStayOnTheirLines(): void
    {
        $expected = [['root', [null, ['a'], ['']], [null, ['b'], ['']]]];
        self::assertSame($expected, self::parses("root:\n  a \"\"\n  b \"\"\n"));
        self::assertSame($expected, self::parses("root:\n  a ''\n  b ''\n"));
        self::assertSame($expected, self::parses("root:\n  a \"\"\n  b \"\""));
    }

    public function testAnEmptyValueBeforeAQuotedValueKeepsBothValues(): void
    {
        [$root] = (new Parser())->parse("root:\n  a \"\"\n  b \"x y\"\n");
        self::assertSame(
            [['a', ''], ['b', 'x y']],
            array_map(
                static fn (Link $link): array => array_map(
                    static fn (Link $value): ?string => $value->id,
                    $link->values
                ),
                $root->values
            )
        );
    }

    public function testAnEmptyValueAtTheEndOfATopLevelLineStaysOnItsLine(): void
    {
        self::assertSame("(a ~1{})\n(b ~1{})", self::formats("a \"\"\nb \"\"\n"));
        self::assertSame("(a ~1{})\n(b ~1{})", self::formats("a \"\" \nb \"\"\n"));
        self::assertSame('(a ~1{})', self::formats('a ""'));
    }

    public function testALongerEvenRunAtTheEndOfALineIsEmptyToo(): void
    {
        self::assertSame("(a ~1{})\n(b ~1{})", self::formats("a \"\"\"\"\nb \"\"\"\"\n"));
    }

    public function testDoubledQuotesThatNothingClosesAreTheEmptyReference(): void
    {
        self::assertSame([['a', ['']]], self::parses('(a: """")'));
        self::assertSame([['a', ['']]], self::parses('(a: """""")'));
    }

    public function testASingleQuoteCharacterIsWrittenBetweenTheOtherQuotes(): void
    {
        self::assertSame([['a', ['"']]], self::parses("(a: '\"')"));
        self::assertSame([['a', ["'"]]], self::parses("(a: \"'\")"));
        self::assertSame([['a', ['"']]], self::parses('(a: `"`)'));
    }

    public function testAnEvenRunFollowedByTextStillOpensAMultilineReference(): void
    {
        self::assertSame([[null, ['a'], ["x\ny"]]], self::parses("a \"\"x\ny\"\"\n"));
    }

    public function testAnEvenRunStillHoldsWhatTheSameLineCloses(): void
    {
        self::assertSame([[null, ['x'], [' " ']]], self::parses('(x "" " "")'));
        self::assertSame([[null, ['a'], [' b ']]], self::parses('a "" b ""'));
    }

    public function testTheStreamEmitsALineThatEndsWithAnEmptyValueAtOnce(): void
    {
        $stream = new StreamParser();
        $emitted = [];
        foreach (mb_str_split("a \"\"\nb \"\"\nc\n") as $character) {
            array_push($emitted, ...$stream->write($character));
        }
        self::assertSame("(a ~1{})\n(b ~1{})", Formatter::formatLinks($emitted));
        self::assertSame("(a ~1{})\n(b ~1{})\n(c)", Formatter::formatLinks($stream->finish()));
    }
}
