<?php

/**
 * Multi-quote string tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class MultiQuoteParserTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    /**
     * Extract the single reference id from a parsed result.
     *
     * @param \LinkFoundation\LinksNotation\Link[] $result
     */
    private function getSingleRefId(array $result): ?string
    {
        if (count($result) === 1 && $result[0]->id === null && count($result[0]->values) === 1) {
            return $result[0]->values[0]->id;
        }
        return count($result) === 1 ? $result[0]->id : null;
    }

    private function assertSingleRef(string $expected, string $input): void
    {
        $this->assertSame($expected, $this->getSingleRefId($this->parser->parse($input)));
    }

    // Backtick quotes

    public function testBacktickQuotedReference(): void
    {
        $this->assertSingleRef('backtick quoted', '`backtick quoted`');
    }

    public function testBacktickQuotedWithSpaces(): void
    {
        $this->assertSingleRef('text with spaces', '`text with spaces`');
    }

    public function testBacktickQuotedMultiline(): void
    {
        $result = $this->parser->parse("(`line1\nline2`)");
        $this->assertCount(1, $result);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame("line1\nline2", $result[0]->values[0]->id);
    }

    public function testBacktickQuotedWithEscapedBacktick(): void
    {
        $this->assertSingleRef('text with ` escaped backtick', '`text with `` escaped backtick`');
    }

    // Single/double quote escaping

    public function testSingleQuoteWithEscapedSingleQuote(): void
    {
        $this->assertSingleRef("text with ' escaped quote", "'text with '' escaped quote'");
    }

    public function testDoubleQuoteWithEscapedDoubleQuote(): void
    {
        $this->assertSingleRef('text with " escaped quote', '"text with "" escaped quote"');
    }

    // Double-double quotes

    public function testDoubleDoubleQuotes(): void
    {
        $this->assertSingleRef('double double quotes', '""double double quotes""');
    }

    public function testDoubleDoubleQuotesWithSingleQuoteInside(): void
    {
        $this->assertSingleRef('text with " inside', '""text with " inside""');
    }

    public function testDoubleDoubleQuotesWithEscape(): void
    {
        $this->assertSingleRef('text with "" escaped double', '""text with """" escaped double""');
    }

    public function testDoubleSingleQuotes(): void
    {
        $this->assertSingleRef('double single quotes', "''double single quotes''");
    }

    public function testDoubleSingleQuotesWithSingleQuoteInside(): void
    {
        $this->assertSingleRef("text with ' inside", "''text with ' inside''");
    }

    public function testDoubleSingleQuotesWithEscape(): void
    {
        $this->assertSingleRef("text with '' escaped single", "''text with '''' escaped single''");
    }

    public function testDoubleBacktickQuotes(): void
    {
        $this->assertSingleRef('double backtick quotes', '``double backtick quotes``');
    }

    public function testDoubleBacktickQuotesWithBacktickInside(): void
    {
        $this->assertSingleRef('text with ` inside', '``text with ` inside``');
    }

    public function testDoubleBacktickQuotesWithEscape(): void
    {
        $this->assertSingleRef('text with `` escaped backtick', '``text with ```` escaped backtick``');
    }

    // Triple quotes

    public function testTripleDoubleQuotes(): void
    {
        $this->assertSingleRef('triple double quotes', '"""triple double quotes"""');
    }

    public function testTripleDoubleQuotesWithDoubleQuoteInside(): void
    {
        $this->assertSingleRef('text with "" inside', '"""text with "" inside"""');
    }

    public function testTripleDoubleQuotesWithEscape(): void
    {
        $this->assertSingleRef('text with """ escaped triple', '"""text with """""" escaped triple"""');
    }

    public function testTripleSingleQuotes(): void
    {
        $this->assertSingleRef('triple single quotes', "'''triple single quotes'''");
    }

    public function testTripleBacktickQuotes(): void
    {
        $this->assertSingleRef('triple backtick quotes', '```triple backtick quotes```');
    }

    // Quadruple quotes

    public function testQuadrupleDoubleQuotes(): void
    {
        $this->assertSingleRef('quadruple double quotes', '""""quadruple double quotes""""');
    }

    public function testQuadrupleSingleQuotes(): void
    {
        $this->assertSingleRef('quadruple single quotes', "''''quadruple single quotes''''");
    }

    public function testQuadrupleBacktickQuotes(): void
    {
        $this->assertSingleRef('quadruple backtick quotes', '````quadruple backtick quotes````');
    }

    // Quintuple quotes

    public function testQuintupleDoubleQuotes(): void
    {
        $this->assertSingleRef('quintuple double quotes', '"""""quintuple double quotes"""""');
    }

    public function testQuintupleSingleQuotes(): void
    {
        $this->assertSingleRef('quintuple single quotes', "'''''quintuple single quotes'''''");
    }

    public function testQuintupleBacktickQuotes(): void
    {
        $this->assertSingleRef('quintuple backtick quotes', '`````quintuple backtick quotes`````');
    }

    // Complex scenarios

    public function testMixedQuotesInLink(): void
    {
        $result = $this->parser->parse('("double" \'single\' `backtick`)');
        $this->assertCount(1, $result);
        $this->assertCount(3, $result[0]->values);
        $this->assertSame('double', $result[0]->values[0]->id);
        $this->assertSame('single', $result[0]->values[1]->id);
        $this->assertSame('backtick', $result[0]->values[2]->id);
    }

    public function testBacktickAsIdInLink(): void
    {
        $result = $this->parser->parse('(`myId`: value1 value2)');
        $this->assertCount(1, $result);
        $this->assertSame('myId', $result[0]->id);
        $this->assertCount(2, $result[0]->values);
    }

    public function testCodeBlockLikeContent(): void
    {
        $this->assertSingleRef('const x = 1;', '```const x = 1;```');
    }

    public function testNestedQuotesInMarkdown(): void
    {
        $this->assertSingleRef('Use `code` in markdown', '``Use `code` in markdown``');
    }

    public function testJsonStringWithQuotes(): void
    {
        $this->assertSingleRef('{ "key": "value"}', '""{ "key": "value"}""');
    }

    // Edge cases

    public function testWhitespacePreservedInQuotes(): void
    {
        $this->assertSingleRef('  spaces  ', '"  spaces  "');
    }

    public function testMultilineInDoubleDoubleQuotes(): void
    {
        $result = $this->parser->parse("(\"\"line1\nline2\"\")");
        $this->assertCount(1, $result);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame("line1\nline2", $result[0]->values[0]->id);
    }

    // Unlimited quotes (6+)

    public function testUnlimitedQuotes6(): void
    {
        $this->assertSingleRef('hello', '""""""hello""""""');
    }

    public function testUnlimitedQuotes10(): void
    {
        $this->assertSingleRef('very deeply quoted', '""""""""""very deeply quoted""""""""""');
    }

    public function testUnlimitedQuotes6WithInnerQuotes(): void
    {
        $this->assertSingleRef(
            'hello with """"" five quotes inside',
            '""""""hello with """"" five quotes inside""""""'
        );
    }

    public function testUnlimitedSingleQuotes7(): void
    {
        $this->assertSingleRef('seven single quotes', "'''''''seven single quotes'''''''");
    }

    public function testUnlimitedBackticks8(): void
    {
        $this->assertSingleRef('eight backticks', '````````eight backticks````````');
    }
}
