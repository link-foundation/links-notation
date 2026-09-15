<?php

/**
 * Multiline parser tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class MultilineParserTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testTwoLinks(): void
    {
        $source = "(first: x y)\n(second: a b)";
        $this->assertSame($source, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testParseAndStringify(): void
    {
        $source = "(papa (lovesMama: loves mama))\n(son lovesMama)\n(daughter lovesMama)\n(all (love mama))";
        $links = $this->parser->parse($source);
        $target = Formatter::formatLinks($links);

        $this->assertCount(4, $links);
        $this->assertStringContainsString('papa', $target);
        $this->assertStringContainsString('lovesMama', $target);
        $this->assertStringContainsString('son', $target);
        $this->assertStringContainsString('daughter', $target);
    }

    public function testParseAndStringify2(): void
    {
        $source = "father (lovesMom: loves mom)\nson lovesMom\ndaughter lovesMom\nall (love mom)";
        $links = $this->parser->parse($source);
        $target = Formatter::formatLinks($links, true);

        $this->assertCount(4, $links);
        $this->assertStringContainsString('father', $target);
        $this->assertStringContainsString('lovesMom', $target);
        $this->assertStringContainsString('son', $target);
        $this->assertStringContainsString('daughter', $target);
    }

    public function testParseAndStringifyWithLessParentheses(): void
    {
        $source = "lovesMama: loves mama\npapa lovesMama\nson lovesMama\ndaughter lovesMama\nall (love mama)";
        $this->assertSame($source, Formatter::formatLinks($this->parser->parse($source), true));
    }

    public function testDuplicateIdentifiers(): void
    {
        $source = "(a: a b)\n(a: b c)";
        $this->assertSame($source, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testComplexStructure(): void
    {
        $input = "(Type: Type Type)\n  Number\n  String\n  Array\n  Value\n"
            . "    (property: name type)\n    (method: name params return)";
        $this->assertNotEmpty($this->parser->parse($input));
    }

    public function testMixedFormats(): void
    {
        $input = "id1: value1\n(id2: value2 value3)\nsimple_ref\n(complex:\n  nested1\n  nested2\n)";
        $this->assertNotEmpty($this->parser->parse($input));
    }

    public function testMultilineWithId(): void
    {
        $this->assertNotEmpty($this->parser->parse('(id: value1 value2)'));
    }

    public function testMultipleTopLevelElements(): void
    {
        $this->assertNotEmpty($this->parser->parse("(elem1: val1)\n(elem2: val2)"));
    }

    public function testMultilineSimpleLinks(): void
    {
        $input = "(1: 1 1)\n(2: 2 2)";
        $parsed = $this->parser->parse($input);
        $this->assertNotEmpty($parsed);

        $output = Formatter::formatLinks($parsed);
        $this->assertStringContainsString('(1: 1 1)', $output);
        $this->assertStringContainsString('(2: 2 2)', $output);
        $this->assertSame($input, $output);
    }

    public function testIndentedChildren(): void
    {
        $this->assertNotEmpty($this->parser->parse("parent\n  child1\n  child2"));
    }
}
