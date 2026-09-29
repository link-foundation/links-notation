<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\ParseException;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\StreamParseException;
use LinkFoundation\LinksNotation\StreamParser;
use PHPUnit\Framework\TestCase;

/**
 * Links nested too deeply are refused with an error rather than recursed into
 * until the stack overflows
 * (https://github.com/link-foundation/links-notation/issues/315).
 *
 * Every parenthesized group and every indentation level is one level, and the
 * lines of a document start at level 0. The positions asserted here are the
 * ones the Rust port reports for the same input.
 */
class NestingLimitTest extends TestCase
{
    private static function parens(int $depth): string
    {
        return str_repeat('(', $depth) . 'a' . str_repeat(')', $depth);
    }

    private static function values(int $depth): string
    {
        return str_repeat('(a ', $depth) . 'b' . str_repeat(')', $depth);
    }

    private static function indentation(int $depth): string
    {
        $document = '';
        for ($level = 0; $level <= $depth; $level++) {
            $document .= str_repeat(' ', $level) . "a\n";
        }

        return $document;
    }

    private function tooDeep(string $document, int $maxDepth): ParseException
    {
        try {
            $links = (new Parser(maxDepth: $maxDepth))->parse($document);
        } catch (ParseException $error) {
            $this->assertSame($maxDepth, $error->getMaxDepth());

            return $error;
        }

        $this->fail('expected the document to be too deep, got ' . count($links) . ' links');
    }

    private static function accepted(string $document, int $maxDepth = Parser::DEFAULT_MAX_DEPTH): bool
    {
        return (new Parser(maxDepth: $maxDepth))->parse($document) !== [];
    }

    public function testDefaultLimitIsSharedByEveryImplementation(): void
    {
        $this->assertSame(64, Parser::DEFAULT_MAX_DEPTH);
        $this->assertSame(Parser::DEFAULT_MAX_DEPTH, (new Parser())->maxDepth);
    }

    public function testParenthesesUpToTheLimitAreAccepted(): void
    {
        $this->assertTrue(self::accepted(self::parens(3), 3));
        $this->assertTrue(self::accepted(self::values(3), 3));
        $this->assertTrue(self::accepted(self::parens(Parser::DEFAULT_MAX_DEPTH)));
    }

    public function testParenthesesPastTheLimitAreRefusedAtTheGroupThatIsTooDeep(): void
    {
        $error = $this->tooDeep(self::parens(4), 3);

        $this->assertSame([1, 4, 3], [$error->getLineNumber(), $error->getColumn(), $error->getOffset()]);
        $this->assertSame(
            "Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n"
            . "1 | ((((a))))\n"
            . '  |    ^',
            $error->getMessage()
        );
    }

    public function testGroupsInValuePositionCountLikeAnyOtherGroup(): void
    {
        $error = $this->tooDeep(self::values(4), 3);

        $this->assertSame([1, 10], [$error->getLineNumber(), $error->getColumn()]);
    }

    public function testIndentationUpToTheLimitIsAccepted(): void
    {
        $this->assertTrue(self::accepted(self::indentation(3), 3));
        $this->assertTrue(self::accepted(self::indentation(Parser::DEFAULT_MAX_DEPTH)));
    }

    public function testIndentationPastTheLimitIsRefusedAtTheLineThatIsTooDeep(): void
    {
        $error = $this->tooDeep(self::indentation(4), 3);

        $this->assertSame([5, 5], [$error->getLineNumber(), $error->getColumn()]);
        $this->assertSame('    a', $error->getLineText());
    }

    public function testGroupsAndIndentationAddUp(): void
    {
        // `(b)` on the line indented once is at level 2.
        $this->assertTrue(self::accepted("a\n  (b)\n", 2));
        $error = $this->tooDeep("a\n  (b)\n", 1);

        $this->assertSame([2, 3], [$error->getLineNumber(), $error->getColumn()]);
    }

    public function testLimitOfOneAllowsOneGroup(): void
    {
        $this->assertTrue(self::accepted('(a b)', 1));
        $this->assertTrue(self::accepted("a\n  b\n", 1));
        $this->tooDeep('((a))', 1);
        $this->tooDeep("a\n  b\n    c\n", 1);
    }

    public function testIndentationBySingleSpacesNests(): void
    {
        // A child indented by a single space used to be left unread forever.
        $this->assertCount(2, (new Parser())->parse("a\n b\n"));
    }

    public function testTrailingSpacesOnADeepLineAreNotADeeperLine(): void
    {
        $this->assertTrue(self::accepted("a\n  b\n    c   \n", 2));
    }

    public function testParserIsReusableAfterRefusingADocument(): void
    {
        $parser = new Parser(maxDepth: 2);
        try {
            $parser->parse(self::parens(3));
            $this->fail('expected the document to be too deep');
        } catch (ParseException) {
            // Refused, as expected.
        }

        $this->assertNotSame([], $parser->parse(self::parens(2)));
        $this->assertNotSame([], $parser->parse(self::indentation(2)));
    }

    public function testRefusesADocumentFarPastTheLimitWithoutOverflowingTheStack(): void
    {
        // Before the limit existed each of these ran out of memory for the stack.
        foreach ([self::parens(100_000), self::values(5_000), self::indentation(2_000)] as $document) {
            $error = $this->tooDeep($document, Parser::DEFAULT_MAX_DEPTH);
            $this->assertStringStartsWith('Nesting too deep at ', $error->getMessage());
        }
    }

    public function testStreamParserReportsWhereTheNestingIsTooDeep(): void
    {
        $stream = new StreamParser(new Parser(maxDepth: 1));
        $stream->write("a\nb ((c))\n");

        try {
            $stream->finish();
            $this->fail('expected the stream to be too deep');
        } catch (StreamParseException $error) {
            $this->assertSame(1, $error->parseError->getMaxDepth());
            $this->assertSame(1, $error->getMaxDepth());
            $this->assertSame([2, 4, 5], [$error->getLineNumber(), $error->getColumn(), $error->getOffset()]);
        }
    }
}
