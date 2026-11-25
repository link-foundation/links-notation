<?php

/**
 * Issue #444: colons inside a bare reference.
 *
 * A run of colons between two characters of a bare reference belongs to the
 * reference, so times, URLs and qualified names need no quotes. A colon that
 * is followed by whitespace, a parenthesis, a quote or a versioned literal
 * still separates an ID from its values, and a bare reference never starts or
 * ends with a colon.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class BareReferenceColonsTest extends TestCase
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

    private static function assertSameLinks(string $document, string $expected): void
    {
        self::assertSame(
            self::tree((new Parser())->parse($expected)),
            self::tree((new Parser())->parse($document)),
            $document
        );
    }

    public function testATimeIsOneReference(): void
    {
        self::assertSameLinks("time 12:30\n", "time '12:30'\n");
        self::assertSameLinks("root:\n  time 12:30\n", "root:\n  time '12:30'\n");
    }

    public function testAUrlIsOneReference(): void
    {
        self::assertSameLinks("url https://example.com/a#b\n", "url 'https://example.com/a#b'\n");
    }

    public function testAQualifiedNameIsOneReference(): void
    {
        self::assertSameLinks("type std::string\n", "type 'std::string'\n");
    }

    public function testAnIdMayHoldAColon(): void
    {
        self::assertSameLinks("a:b: c\n", "'a:b': c\n");
        self::assertSameLinks('(a:b: c)', "('a:b': c)");
        self::assertSameLinks("a:b\n", "'a:b'\n");
    }

    public function testAColonBeforeAValueThatCannotContinueAReferenceSeparates(): void
    {
        self::assertSameLinks("a: b\n", '(a: b)');
        self::assertSameLinks("a:\"b c\"\n", "(a: 'b c')");
        self::assertSameLinks("a:'b'\n", '(a: b)');
        self::assertSameLinks("a:(b c)\n", '(a: (b c))');
        self::assertSameLinks("a:~1{62}\n", '(a: b)');
        self::assertSameLinks("a :b\n", '(a: b)');
    }

    public function testAValueOfTheLinkMayHoldAColon(): void
    {
        self::assertSameLinks("a: b:c\n", "(a: 'b:c')");
    }

    public function testTheConcreteSyntaxTreeKeepsTheColonsInTheReference(): void
    {
        self::assertSame(
            '(document (line reference:"a:b" colon:":" whitespace:" " reference:"12:30" newline:"\n"))',
            (new Parser())->parseCst("a:b: 12:30\n")->toSExpression()
        );
    }

    public function testAReferenceWithColonsIsWrittenWithQuotes(): void
    {
        self::assertSame("(time '12:30')", Formatter::formatLinks((new Parser())->parse("time 12:30\n")));
    }
}
