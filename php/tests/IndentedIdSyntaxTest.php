<?php

/**
 * Indented id syntax tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class IndentedIdSyntaxTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    /**
     * @param Link[] $expected
     * @param Link[] $actual
     */
    private function assertLinksEqual(array $expected, array $actual): void
    {
        $this->assertCount(count($expected), $actual);
        foreach ($expected as $index => $link) {
            $this->assertTrue(
                $link->equals($actual[$index]),
                sprintf('Link %d differs: %s != %s', $index, (string) $link, (string) $actual[$index])
            );
        }
    }

    public function testBasicIndentedIdSyntax(): void
    {
        $indentedResult = $this->parser->parse("3:\n  papa\n  loves\n  mama");
        $inlineResult = $this->parser->parse('(3: papa loves mama)');

        $this->assertLinksEqual($inlineResult, $indentedResult);

        $this->assertSame('(3: papa loves mama)', Formatter::formatLinks($indentedResult));
        $this->assertSame('(3: papa loves mama)', Formatter::formatLinks($inlineResult));
    }

    public function testIndentedIdSyntaxWithSingleValue(): void
    {
        $result = $this->parser->parse("greeting:\n  hello");

        $this->assertSame('(greeting: hello)', Formatter::formatLinks($result));
        $this->assertCount(1, $result);
        $this->assertSame('greeting', $result[0]->id);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame('hello', $result[0]->values[0]->id);
    }

    public function testIndentedIdSyntaxWithMultipleValues(): void
    {
        $result = $this->parser->parse("action:\n  run\n  fast\n  now");

        $this->assertSame('(action: run fast now)', Formatter::formatLinks($result));
        $this->assertCount(1, $result);
        $this->assertSame('action', $result[0]->id);
        $this->assertCount(3, $result[0]->values);
    }

    public function testIndentedIdSyntaxWithNumericId(): void
    {
        $result = $this->parser->parse("42:\n  answer\n  to\n  everything");
        $this->assertSame('(42: answer to everything)', Formatter::formatLinks($result));
    }

    public function testIndentedIdSyntaxWithQuotedId(): void
    {
        $result = $this->parser->parse("\"complex id\":\n  value1\n  value2");
        $this->assertSame("('complex id': value1 value2)", Formatter::formatLinks($result));
    }

    public function testMultipleIndentedIdLinks(): void
    {
        $result = $this->parser->parse("first:\n  a\n  b\nsecond:\n  c\n  d");

        $this->assertCount(2, $result);
        $this->assertSame("(first: a b)\n(second: c d)", Formatter::formatLinks($result));
    }

    public function testMixedIndentedAndRegularSyntax(): void
    {
        $result = $this->parser->parse("first:\n  a\n  b\n(second: c d)\nthird value");
        $this->assertCount(3, $result);

        $formatted = Formatter::formatLinks($result);
        $this->assertStringContainsString('(first: a b)', $formatted);
        $this->assertStringContainsString('(second: c d)', $formatted);
        $this->assertStringContainsString('third value', $formatted);
    }

    public function testUnsupportedColonOnlySyntaxIsLenient(): void
    {
        // This implementation, like Python, accepts colon-only syntax (JS/Rust raise)
        $result = $this->parser->parse(":\n  papa\n  loves\n  mama");
        $this->assertNotEmpty($result);
    }

    public function testIndentedIdWithDeeperNesting(): void
    {
        $result = $this->parser->parse("root:\n  child1\n  child2\n    grandchild");
        $this->assertNotEmpty($result);

        $rootLink = $result[0];
        $this->assertSame('root', $rootLink->id);
        $this->assertCount(2, $rootLink->values);
    }

    public function testEmptyIndentedIdWorks(): void
    {
        $result = $this->parser->parse('empty:');

        $this->assertCount(1, $result);
        $this->assertSame('empty', $result[0]->id);
        $this->assertCount(0, $result[0]->values);
        $this->assertSame('(empty)', Formatter::formatLinks($result));
    }

    public function testEquivalenceComprehensive(): void
    {
        $testCases = [
            ["test:\n  one", '(test: one)'],
            ["x:\n  a\n  b\n  c", '(x: a b c)'],
            ["\"quoted\":\n  value", '("quoted": value)'],
        ];

        foreach ($testCases as [$indented, $inline]) {
            $indentedResult = $this->parser->parse($indented);
            $inlineResult = $this->parser->parse($inline);

            $this->assertLinksEqual($inlineResult, $indentedResult);
            $this->assertSame(Formatter::formatLinks($inlineResult), Formatter::formatLinks($indentedResult));
        }
    }
}
