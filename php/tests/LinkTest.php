<?php

/**
 * Link class tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Link;
use PHPUnit\Framework\TestCase;

class LinkTest extends TestCase
{
    public function testLinkConstructorWithIdOnly(): void
    {
        $link = new Link('test');
        $this->assertSame('test', $link->id);
        $this->assertSame([], $link->values);
    }

    public function testLinkConstructorWithIdAndValues(): void
    {
        $link = new Link('parent', [new Link('child1'), new Link('child2')]);
        $this->assertSame('parent', $link->id);
        $this->assertCount(2, $link->values);
        $this->assertSame('child1', $link->values[0]->id);
        $this->assertSame('child2', $link->values[1]->id);
    }

    public function testLinkToStringWithIdOnly(): void
    {
        $link = new Link('test');
        $this->assertSame('(test)', (string) $link);
    }

    public function testLinkToStringWithValuesOnly(): void
    {
        $link = new Link(null, [new Link('value1'), new Link('value2')]);
        $this->assertSame('(value1 value2)', (string) $link);
    }

    public function testLinkToStringWithIdAndValues(): void
    {
        $link = new Link('parent', [new Link('child1'), new Link('child2')]);
        $this->assertSame('(parent: child1 child2)', (string) $link);
    }

    public function testLinkEscapeReferenceSimple(): void
    {
        $this->assertSame('simple', Link::escapeReference('simple'));
    }

    public function testLinkEscapeReferenceWithSpecialCharacters(): void
    {
        $this->assertSame("'has:colon'", Link::escapeReference('has:colon'));
        $this->assertSame("'has space'", Link::escapeReference('has space'));
        $this->assertSame("'has(paren)'", Link::escapeReference('has(paren)'));
        $this->assertSame("'has\"quote'", Link::escapeReference('has"quote'));
        $this->assertSame('"has\'quote"', Link::escapeReference("has'quote"));
    }

    public function testLinkEscapeReferenceKeepsZero(): void
    {
        $this->assertSame('0', Link::escapeReference('0'));
        $this->assertSame('', Link::escapeReference(null));
        $this->assertSame('', Link::escapeReference('   '));
    }

    public function testLinkSimplify(): void
    {
        $link = new Link(null, [new Link('single')]);
        $simplified = $link->simplify();
        $this->assertSame('single', $simplified->id);
        $this->assertSame([], $simplified->values);
    }

    public function testLinkCombine(): void
    {
        $combined = (new Link('first'))->combine(new Link('second'));
        $this->assertNull($combined->id);
        $this->assertCount(2, $combined->values);
        $this->assertSame('first', $combined->values[0]->id);
        $this->assertSame('second', $combined->values[1]->id);
    }

    public function testLinkEquals(): void
    {
        $link1 = new Link('test', [new Link('child')]);
        $link2 = new Link('test', [new Link('child')]);
        $link3 = new Link('different', [new Link('child')]);

        $this->assertTrue($link1->equals($link2));
        $this->assertFalse($link1->equals($link3));
        $this->assertFalse($link1->equals('test'));
    }

    public function testGetValuesString(): void
    {
        $link = new Link('parent', [new Link('child1'), new Link('child2')]);
        $this->assertSame('child1 child2', $link->getValuesString());
        $this->assertSame('', (new Link('leaf'))->getValuesString());
    }

    public function testToLinkOrIdString(): void
    {
        $this->assertSame('leaf', (new Link('leaf'))->toLinkOrIdString());
        $this->assertSame('', (new Link())->toLinkOrIdString());
        $this->assertSame('(parent: child)', (new Link('parent', [new Link('child')]))->toLinkOrIdString());
    }
}
