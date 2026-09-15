<?php

/**
 * Tests for nested self-referenced objects in pairs - ported from the Python implementation.
 *
 * Test case from PARSER_BUG.md - ensures the parser correctly handles
 * self-referenced object definitions when they appear as values inside pairs.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class NestedSelfReferenceTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testNestedSelfReferencedObjectInPairValue(): void
    {
        $notation = '(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) '
            . '((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))';

        $links = $this->parser->parse($notation);

        $this->assertCount(1, $links);

        $link = $links[0];
        $this->assertSame('obj_0', $link->id);

        // Type marker + 2 pairs
        $this->assertCount(3, $link->values);
        $this->assertSame('dict', $link->values[0]->id);

        $pair1 = $link->values[1];
        $pair2 = $link->values[2];

        // Pair 1: ((str bmFtZQ==) (str ZGljdDE=))
        $this->assertNull($pair1->id);
        $this->assertCount(2, $pair1->values);
        $this->assertNull($pair1->values[0]->id);
        $this->assertCount(2, $pair1->values[0]->values);
        $this->assertSame('str', $pair1->values[0]->values[0]->id);
        $this->assertSame('bmFtZQ==', $pair1->values[0]->values[1]->id);
        $this->assertNull($pair1->values[1]->id);
        $this->assertCount(2, $pair1->values[1]->values);
        $this->assertSame('str', $pair1->values[1]->values[0]->id);
        $this->assertSame('ZGljdDE=', $pair1->values[1]->values[1]->id);

        // Pair 2: ((str b3RoZXI=) (obj_1: dict ...))
        $this->assertNull($pair2->id);
        $this->assertCount(2, $pair2->values);
        $this->assertNull($pair2->values[0]->id);
        $this->assertCount(2, $pair2->values[0]->values);
        $this->assertSame('str', $pair2->values[0]->values[0]->id);
        $this->assertSame('b3RoZXI=', $pair2->values[0]->values[1]->id);

        // The key assertion: obj_1 keeps its id and its nested dict structure
        $obj1 = $pair2->values[1];
        $this->assertSame('obj_1', $obj1->id);
        $this->assertCount(3, $obj1->values);
        $this->assertSame('dict', $obj1->values[0]->id);

        $obj1Pair1 = $obj1->values[1];
        $this->assertCount(2, $obj1Pair1->values);
        $this->assertSame('str', $obj1Pair1->values[0]->values[0]->id);
        $this->assertSame('bmFtZQ==', $obj1Pair1->values[0]->values[1]->id);
        $this->assertSame('str', $obj1Pair1->values[1]->values[0]->id);
        $this->assertSame('ZGljdDI=', $obj1Pair1->values[1]->values[1]->id);

        $obj1Pair2 = $obj1->values[2];
        $this->assertCount(2, $obj1Pair2->values);
        $this->assertSame('str', $obj1Pair2->values[0]->values[0]->id);
        $this->assertSame('b3RoZXI=', $obj1Pair2->values[0]->values[1]->id);
        $this->assertSame('obj_0', $obj1Pair2->values[1]->id);
        $this->assertCount(0, $obj1Pair2->values[1]->values);
    }

    public function testSelfReferenceAsDirectChildWorksCorrectly(): void
    {
        $notation = '(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))';

        $links = $this->parser->parse($notation);

        $this->assertCount(1, $links);
        $this->assertSame('obj_0', $links[0]->id);
        $this->assertCount(4, $links[0]->values);

        $obj1 = $links[0]->values[3];
        $this->assertSame('obj_1', $obj1->id);
        $this->assertCount(4, $obj1->values);
        $this->assertSame('obj_0', $obj1->values[3]->id);
    }
}
