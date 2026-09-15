<?php

/**
 * API tests for the Lino parser - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class ApiTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testIsRef(): void
    {
        // A link with no values acts like a reference
        $link = new Link('some_value');
        $this->assertSame('some_value', $link->id);
        $this->assertSame([], $link->values);
    }

    public function testIsLink(): void
    {
        $link = new Link('id', [new Link('child')]);
        $this->assertSame('id', $link->id);
        $this->assertCount(1, $link->values);
        $this->assertSame('child', $link->values[0]->id);
    }

    public function testEmptyLink(): void
    {
        $this->assertSame('()', (string) new Link(null, []));
    }

    public function testSimpleLink(): void
    {
        $parsed = $this->parser->parse('(1: 1 1)');
        $this->assertSame('(1: 1 1)', $parsed[0]->format());
    }

    public function testLinkWithSourceTarget(): void
    {
        $input = '(index: source target)';
        $parsed = $this->parser->parse($input);
        $this->assertSame($input, $parsed[0]->format());
    }

    public function testLinkWithSourceTypeTarget(): void
    {
        $input = '(index: source type target)';
        $parsed = $this->parser->parse($input);
        $this->assertSame($input, $parsed[0]->format());
    }

    public function testSingleLineFormat(): void
    {
        $parsed = $this->parser->parse('id: value1 value2');
        $output = $parsed[0]->format(true);
        $this->assertStringContainsString('id', $output);
        $this->assertStringContainsString('value1', $output);
        $this->assertStringContainsString('value2', $output);
    }

    public function testQuotedReferences(): void
    {
        $parsed = $this->parser->parse('("quoted id": "value with spaces")');
        $output = $parsed[0]->format();
        $this->assertStringContainsString('quoted id', $output);
        $this->assertStringContainsString('value with spaces', $output);
    }

    public function testQuotedReferencesParsing(): void
    {
        $parsed = $this->parser->parse('("quoted id": "value with spaces")');
        $output = Formatter::formatLinks($parsed);
        $this->assertStringContainsString('quoted id', $output);
        $this->assertStringContainsString('value with spaces', $output);
    }

    public function testIndentedIdSyntaxParsing(): void
    {
        $indented = Formatter::formatLinks($this->parser->parse("id:\n  value1\n  value2"));
        $inline = Formatter::formatLinks($this->parser->parse('(id: value1 value2)'));

        $this->assertSame($inline, $indented);
        $this->assertSame('(id: value1 value2)', $indented);
    }

    public function testIndentedIdSyntaxRoundtrip(): void
    {
        $parsed = $this->parser->parse("id:\n  value1\n  value2");
        $this->assertNotEmpty($parsed);
        $this->assertStringContainsString('id', Formatter::formatLinks($parsed));
    }

    public function testMultipleIndentedIdSyntaxParsing(): void
    {
        $indented = Formatter::formatLinks($this->parser->parse("id1:\n  a\n  b\nid2:\n  c\n  d"));
        $inline = Formatter::formatLinks($this->parser->parse("(id1: a b)\n(id2: c d)"));

        $this->assertSame($inline, $indented);
        $this->assertSame("(id1: a b)\n(id2: c d)", $indented);
    }

    public function testMultipleIndentedIdSyntaxRoundtrip(): void
    {
        $parsed = $this->parser->parse("id1:\n  a\n  b\nid2:\n  c\n  d");
        $this->assertGreaterThanOrEqual(2, count($parsed));
        $output = Formatter::formatLinks($parsed);
        $this->assertStringContainsString('id1', $output);
        $this->assertStringContainsString('id2', $output);
    }

    public function testInputSizeLimitIsEnforced(): void
    {
        $parser = new Parser(8);
        $this->expectException(\InvalidArgumentException::class);
        $parser->parse('(this input is definitely longer than eight bytes)');
    }
}
