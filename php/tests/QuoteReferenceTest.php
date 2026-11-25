<?php

/**
 * Quoting a reference, and reading every quoted reference back (issues #443
 * and #444).
 *
 * Link::quoteReference() writes one reference so a parser reads it back as
 * exactly that text; Link::needsQuoting() says whether the text can be written
 * bare. The round trips below feed texts built from the characters that matter
 * to the grammar through the formatter and read them back in the ID and the
 * value position of parenthesized, single-line and indented links.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;
use TypeError;

class QuoteReferenceTest extends TestCase
{
    /** Texts that broke a parser or a formatter before, or came close. */
    private const TRICKY = [
        '',
        ' ',
        '"',
        "'",
        '`',
        '""',
        "''",
        '""""',
        '"\'',
        '\'"',
        '#',
        '#x',
        'a #b',
        ':',
        'a:',
        ':a',
        '12:30',
        'a: b',
        '(',
        ')',
        '~1{}',
        '~1{61}',
        "a\nb",
        '"" ',
        ' ""',
        "\"\n",
        "it's",
        'say "hi"',
    ];

    /** The characters the generated texts are built from. */
    private const ALPHABET = [
        'a', 'b', '1', ' ', ' ', "\t", "\n", "\r", '"', '"', "'", "'", '`', '#', ':', '(', ')', '~', '{', '}',
        'é', '😀',
    ];

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
    private static function readBack(string $document): array
    {
        return self::tree((new Parser())->parse($document));
    }

    /**
     * $count texts of up to eight characters from ALPHABET, from a small
     * seeded generator, so a failure names the text that broke and the same
     * texts are tried on every run.
     *
     * @return string[]
     */
    private static function texts(int $count, int $seed): array
    {
        $state = $seed & 0xffffffff;
        $next = static function (int $bound) use (&$state): int {
            // A 32-bit linear congruential generator; its high bits pick.
            $state = (1664525 * $state + 1013904223) & 0xffffffff;

            return intdiv($state * $bound, 0x100000000);
        };
        $texts = [];
        for ($index = 0; $index < $count; $index++) {
            $text = '';
            for ($length = $next(9); $length > 0; $length--) {
                $text .= self::ALPHABET[$next(count(self::ALPHABET))];
            }
            $texts[] = $text;
        }

        return $texts;
    }

    public function testQuoteReferenceWritesTextThatNeedsNoDelimitersAsItIs(): void
    {
        foreach (['plain', 'issue#1047', 'a-b_c.d', 'π', '~1'] as $text) {
            self::assertSame($text, Link::quoteReference($text));
            self::assertFalse(Link::needsQuoting($text), $text);
        }
    }

    public function testQuoteReferenceQuotesTextAParserWouldReadDifferently(): void
    {
        self::assertSame("'has space'", Link::quoteReference('has space'));
        self::assertSame("'12:30'", Link::quoteReference('12:30'));
        self::assertSame("'#release'", Link::quoteReference('#release'));
        self::assertSame("'(a)'", Link::quoteReference('(a)'));
        self::assertSame("'\"'", Link::quoteReference('"'));
        self::assertSame('"\'"', Link::quoteReference("'"));
        self::assertSame('~1{}', Link::quoteReference(''));
        self::assertSame('~1{610a62}', Link::quoteReference("a\nb"));
        foreach (['has space', '12:30', '#release', '', '"', "a\nb"] as $text) {
            self::assertTrue(Link::needsQuoting($text), $text);
        }
    }

    public function testQuoteReferenceIsEscapeReference(): void
    {
        foreach (['a b', 'a', "it's", '', '#x', 'x:y'] as $text) {
            self::assertSame(Link::escapeReference($text), Link::quoteReference($text));
        }
        self::assertSame('', Link::quoteReference(null));
    }

    public function testNeedsQuotingRefusesWhatIsNotText(): void
    {
        $this->expectException(TypeError::class);
        Link::needsQuoting(null);
    }

    public function testEveryQuotedReferenceReadsBackInEveryPosition(): void
    {
        foreach ([...self::TRICKY, ...self::texts(300, 443444)] as $text) {
            $written = Link::quoteReference($text);
            $message = json_encode(['text' => $text, 'written' => $written]);

            $link = [[$text, [$text], ['x']]];
            self::assertSame($link, self::readBack("({$written}: {$written} x)"), $message);
            self::assertSame($link, self::readBack("{$written}: {$written} x"), $message);
            self::assertSame($link, self::readBack("{$written}: {$written} x\n"), $message);
            self::assertSame($link, self::readBack("{$written}:\n  {$written}\n  x\n"), $message);
            // Two lines that each end with the reference: the shape of issue #443.
            self::assertSame(
                [['root', [null, ['a'], [$text]], [null, ['b'], [$text]]]],
                self::readBack("root:\n  a {$written}\n  b {$written}\n"),
                $message
            );
            self::assertSame(
                [[null, ['a'], [null, [$text], [$text]], ['b']]],
                self::readBack("(a ({$written} {$written}) b)"),
                $message
            );
        }
    }

    public function testEveryFormattedLinkReadsBackAsTheSameLink(): void
    {
        $pool = [...self::TRICKY, ...self::texts(90, 445)];
        for ($index = 0; $index + 2 < count($pool); $index += 3) {
            $links = [
                new Link($pool[$index], [new Link($pool[$index + 1]), new Link('x')]),
                new Link(null, [new Link($pool[$index + 2]), new Link($pool[$index])]),
            ];
            $message = json_encode(array_slice($pool, $index, 3));
            foreach ([Formatter::formatLinks($links), Formatter::formatLinks($links, true)] as $document) {
                $parsed = (new Parser())->parse($document);
                self::assertCount(count($links), $parsed, $message . $document);
                foreach ($parsed as $at => $link) {
                    self::assertTrue($link->equals($links[$at]), $message . $document);
                }
            }
            // The nested writer puts every value on a line of its own.
            self::assertSame(
                self::tree((new Parser())->parse(Formatter::formatLinks($links))),
                self::readBack(Formatter::formatNested($links)),
                $message
            );
        }
    }
}
