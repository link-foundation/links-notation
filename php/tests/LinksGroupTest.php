<?php

/**
 * Tests for hierarchical link group structures - ported from the Python implementation.
 *
 * PHP, like Python, has no separate LinksGroup class: hierarchical structures
 * are expressed with nested Link values.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Link;
use PHPUnit\Framework\TestCase;

class LinksGroupTest extends TestCase
{
    /**
     * Flatten a nested link structure into a list, similar to LinksGroup::toList()
     * in other language implementations.
     *
     * @return Link[]
     */
    private function flattenLinkStructure(Link $link): array
    {
        $result = [];
        $this->appendToList($link, $result);
        return $result;
    }

    /**
     * @param Link[] $result
     */
    private function appendToList(Link $link, array &$result): void
    {
        $result[] = $link;
        foreach ($link->values as $value) {
            if ($value->values) {
                $this->appendToList($value, $result);
            } else {
                $result[] = $value;
            }
        }
    }

    public function testLinksGroupConstructor(): void
    {
        $element = new Link('root');
        $children = [new Link('child1'), new Link('child2')];

        $this->assertSame('root', $element->id);
        $this->assertCount(2, $children);
        $this->assertSame('child1', $children[0]->id);
        $this->assertSame('child2', $children[1]->id);
    }

    public function testLinksGroupConstructorEquivalent(): void
    {
        $root = new Link('root');
        $children = [new Link('child1'), new Link('child2')];

        $group = new Link('group', array_merge([$root], $children));

        $this->assertSame('group', $group->id);
        $this->assertCount(3, $group->values);
        $this->assertSame($root, $group->values[0]);
        $this->assertSame('child1', $group->values[1]->id);
        $this->assertSame('child2', $group->values[2]->id);
    }

    public function testLinksGroupToListFlattensStructure(): void
    {
        $root = new Link('root');
        $child1 = new Link('child1');
        $child2 = new Link('child2');
        $grandchild = new Link('grandchild');

        $child2WithGrandchild = new Link($child2->id, [$grandchild]);
        $group = new Link(null, [$root, $child1, $child2WithGrandchild]);

        $flatList = $this->flattenLinkStructure($group);

        $this->assertCount(5, $flatList);
        $this->assertSame($group, $flatList[0]);
        $this->assertSame($root, $flatList[1]);
        $this->assertSame($child1, $flatList[2]);
        $this->assertSame($child2WithGrandchild, $flatList[3]);
        $this->assertSame($grandchild, $flatList[4]);
    }

    public function testLinksGroupToString(): void
    {
        $root = new Link('root');
        $children = [new Link('child1'), new Link('child2')];
        $group = new Link(null, array_merge([$root], $children));

        $output = (string) $group;
        $this->assertStringContainsString('root', $output);
        $this->assertStringContainsString('child1', $output);
        $this->assertStringContainsString('child2', $output);
        $this->assertStringContainsString('(', $output);
        $this->assertStringContainsString(')', $output);
    }

    public function testLinksGroupAppendToLinksList(): void
    {
        $element = new Link('root');
        $children = [new Link('child1'), new Link('child2')];

        $group = new Link(null, array_merge([$element], $children));

        $linksList = [$group];
        foreach ($group->values as $value) {
            $linksList[] = $value;
        }

        $this->assertCount(4, $linksList);
        $this->assertSame($group, $linksList[0]);
        $this->assertSame($element, $linksList[1]);
        $this->assertSame('child1', $linksList[2]->id);
        $this->assertSame('child2', $linksList[3]->id);
    }
}
