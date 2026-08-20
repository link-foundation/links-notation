<?php

/**
 * Multiline quoted string tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class MultilineQuotedStringTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testMultilineDoubleQuotedReference(): void
    {
        $input = "(\n  \"long\nstring literal representing\nthe reference\"\n\n"
            . "  'another\nlong string literal\nas another reference'\n)";
        $result = $this->parser->parse($input);

        $this->assertCount(1, $result);

        // The two references sit on separate lines inside the parentheses, so the
        // nested context turns each of them into its own link.
        $link = $result[0];
        $this->assertNull($link->id);
        $this->assertCount(2, $link->values);

        $this->assertSame("long\nstring literal representing\nthe reference", $link->values[0]->values[0]->id);
        $this->assertSame("another\nlong string literal\nas another reference", $link->values[1]->values[0]->id);
    }

    public function testSimpleMultilineDoubleQuoted(): void
    {
        $result = $this->parser->parse("(\"line1\nline2\")");

        $this->assertCount(1, $result);
        $link = $result[0];
        $this->assertNull($link->id);
        $this->assertCount(1, $link->values);
        $this->assertSame("line1\nline2", $link->values[0]->id);
    }

    public function testSimpleMultilineSingleQuoted(): void
    {
        $result = $this->parser->parse("('line1\nline2')");

        $this->assertCount(1, $result);
        $link = $result[0];
        $this->assertNull($link->id);
        $this->assertCount(1, $link->values);
        $this->assertSame("line1\nline2", $link->values[0]->id);
    }

    public function testMultilineQuotedAsId(): void
    {
        $result = $this->parser->parse("(\"multi\nline\nid\": value1 value2)");

        $this->assertCount(1, $result);
        $link = $result[0];
        $this->assertSame("multi\nline\nid", $link->id);
        $this->assertCount(2, $link->values);
    }
}
