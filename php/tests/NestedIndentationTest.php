<?php

/**
 * Tests for indentation inside parentheses - ported from the Python implementation.
 *
 * https://github.com/link-foundation/links-notation/issues/282
 *
 * Indentation is structural at the root, so it must be structural inside
 * parentheses too: a parenthesized group opens a nested context that starts fresh
 * at indentation level zero and follows exactly the root's rules.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class NestedIndentationTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    private function formatSource(string $source): string
    {
        return Formatter::formatLinks($this->parser->parse($source));
    }

    public function testParenthesesReproduceRootIndentation(): void
    {
        $root = $this->formatSource("a\n  b\nc\n  d");
        $this->assertSame("(a)\n((a) (b))\n(c)\n((c) (d))", $root);

        $nested = $this->formatSource("array (\n  a\n    b\n  c\n    d\n)");
        $this->assertSame('(array ((a) ((a) (b)) (c) ((c) (d))))', $nested);
    }

    public function testParenthesesKeepRecordBoundaries(): void
    {
        $source = "value (\n  id \"1\"\n  label \"one\"\n)";
        $this->assertSame('(value ((id 1) (label one)))', $this->formatSource($source));

        $links = $this->parser->parse($source);
        $this->assertCount(1, $links);

        $group = $links[0]->values[1];
        $this->assertNull($group->id);
        $this->assertCount(2, $group->values);
        $this->assertSame('id', $group->values[0]->values[0]->id);
        $this->assertSame('1', $group->values[0]->values[1]->id);
        $this->assertSame('label', $group->values[1]->values[0]->id);
        $this->assertSame('one', $group->values[1]->values[1]->id);
    }

    public function testParenthesesKeepSeveralRecordsSeparate(): void
    {
        $source = "value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)";
        $this->assertSame('(value ((id 1 label one) (id 2 label two)))', $this->formatSource($source));
    }

    public function testParenthesesNestDeeply(): void
    {
        $source = "outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)";
        $this->assertSame('(outer ((inner ((x 1) (y 2))) (z 3)))', $this->formatSource($source));
    }

    public function testSingleLineParenthesesAreUnchanged(): void
    {
        $this->assertSame('(a b c)', $this->formatSource('(a b c)'));
        $this->assertSame('(1: 2 3)', $this->formatSource('(1: 2 3)'));
        $this->assertSame('(a: b c)', $this->formatSource('(a: b c)'));
        $this->assertSame('((a b))', $this->formatSource('((a b))'));
        $this->assertSame('(a)', $this->formatSource('(a)'));
        $this->assertSame('()', $this->formatSource('()'));
    }

    public function testParenthesesWithIndentedIdSyntax(): void
    {
        $this->assertSame('(a: b c)', $this->formatSource("(\n  a:\n    b\n    c\n)"));
    }

    public function testEmployeeRecordsKeepTheirFields(): void
    {
        $source = "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n"
            . "    (\n      name (Jean-Luc Picard)\n      age 45\n    )";
        $this->assertSame(
            "(empInfo)\n((empInfo) (employees: ((name (James Kirk)) (age 40)) "
            . "((name (Jean-Luc Picard)) (age 45))))",
            $this->formatSource($source)
        );
    }
}
