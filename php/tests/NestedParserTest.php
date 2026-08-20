<?php

/**
 * Nested parser tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class NestedParserTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testSignificantWhitespace(): void
    {
        $source = <<<'LINO'

        users
            user1
                id
                    43
                name
                    first
                        John
                    last
                        Williams
                location
                    New York
                age
                    23
            user2
                id
                    56
                name
                    first
                        Igor
                    middle
                        Petrovich
                    last
                        Ivanov
                location
                    Moscow
                age
                    20
        LINO;

        $target = <<<'LINO'
        (users)
        ((users) (user1))
        (((users) (user1)) (id))
        ((((users) (user1)) (id)) (43))
        (((users) (user1)) (name))
        ((((users) (user1)) (name)) (first))
        (((((users) (user1)) (name)) (first)) (John))
        ((((users) (user1)) (name)) (last))
        (((((users) (user1)) (name)) (last)) (Williams))
        (((users) (user1)) (location))
        ((((users) (user1)) (location)) (New York))
        (((users) (user1)) (age))
        ((((users) (user1)) (age)) (23))
        ((users) (user2))
        (((users) (user2)) (id))
        ((((users) (user2)) (id)) (56))
        (((users) (user2)) (name))
        ((((users) (user2)) (name)) (first))
        (((((users) (user2)) (name)) (first)) (Igor))
        ((((users) (user2)) (name)) (middle))
        (((((users) (user2)) (name)) (middle)) (Petrovich))
        ((((users) (user2)) (name)) (last))
        (((((users) (user2)) (name)) (last)) (Ivanov))
        (((users) (user2)) (location))
        ((((users) (user2)) (location)) (Moscow))
        (((users) (user2)) (age))
        ((((users) (user2)) (age)) (20))
        LINO;

        $this->assertSame($target, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testSimpleSignificantWhitespace(): void
    {
        $source = "a\n    b\n    c";
        $target = "(a)\n((a) (b))\n((a) (c))";
        $this->assertSame($target, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testTwoSpacesSizedWhitespace(): void
    {
        $source = "\nusers\n  user1";
        $target = "(users)\n((users) (user1))";
        $this->assertSame($target, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testParseNestedStructureWithIndentation(): void
    {
        $result = $this->parser->parse("parent\n  child1\n  child2");
        $this->assertCount(3, $result);
        $this->assertNull($result[0]->id);
        $this->assertSame('parent', $result[0]->values[0]->id);
        $this->assertNull($result[1]->id);
        $this->assertCount(2, $result[1]->values);
        $this->assertNull($result[2]->id);
        $this->assertCount(2, $result[2]->values);
    }

    public function testIndentationBasedChildren(): void
    {
        $result = $this->parser->parse("parent\n  child1\n  child2\n    grandchild");
        $this->assertCount(4, $result);
    }

    public function testComplexIndentation(): void
    {
        $result = $this->parser->parse("root\n  level1a\n    level2a\n    level2b\n  level1b\n    level2c");
        $this->assertCount(6, $result);
    }

    public function testNestedLinks(): void
    {
        $parsed = $this->parser->parse('(1: (2: (3: 3)))');
        $this->assertCount(1, $parsed);
        $this->assertNotSame('', Formatter::formatLinks($parsed));
    }

    public function testIndentationParser(): void
    {
        $result = $this->parser->parse("parent\n  child1\n  child2");
        $this->assertNotEmpty($result);

        $hasParentLink = false;
        foreach ($result as $link) {
            foreach ($link->values as $value) {
                if ($value->id === 'parent') {
                    $hasParentLink = true;
                }
            }
        }
        $this->assertTrue($hasParentLink);
    }

    public function testNestedIndentationParser(): void
    {
        $result = $this->parser->parse("parent\n  child\n    grandchild");
        $this->assertNotEmpty($result);
    }

    public function testThreeLevelNestingRoundtrip(): void
    {
        $input = '(1: (2: (3: 3)))';
        $this->assertSame($input, Formatter::formatLinks($this->parser->parse($input)));
    }

    public function testDeepNestedStructureRoundtrip(): void
    {
        $input = '(a: (b: (c: (d: d))))';
        $this->assertSame($input, Formatter::formatLinks($this->parser->parse($input)));
    }

    public function testMultipleNestedLinksRoundtrip(): void
    {
        $input = '(parent: (child1: value1) (child2: value2))';
        $this->assertSame($input, Formatter::formatLinks($this->parser->parse($input)));
    }
}
