<?php

/**
 * Conformance tests for the empty reference.
 *
 * https://github.com/link-foundation/links-notation/issues/288
 *
 * A bare delimiter pair is the empty reference. The three delimiters `"`, `'`
 * and `` ` `` behave identically, and every longer n-quote run keeps the
 * meaning it already had. The table below is shared with the Rust, JavaScript,
 * Python, Go, C# and Java suites, so a document written by one implementation
 * reads the same in all of them.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class EmptyReferenceTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    /**
     * Render a parsed node unambiguously: every reference is wrapped in angle
     * brackets so an empty one is visible as <>.
     */
    private function render(Link $node): string
    {
        if (empty($node->values)) {
            return '<' . ($node->id ?? '') . '>';
        }
        $head = $node->id === null ? '' : '<' . $node->id . '>: ';
        $values = array_map(fn (Link $value): string => $this->render($value), $node->values);

        return '(' . $head . implode(' ', $values) . ')';
    }

    /**
     * @param \LinkFoundation\LinksNotation\Link[] $links
     */
    private function rendered(array $links): string
    {
        return implode("\n", array_map(fn (Link $link): string => $this->render($link), $links));
    }

    private function assertParsesAs(string $expected, string $source): void
    {
        $this->assertSame($expected, $this->rendered($this->parser->parse($source)), "Parsing {$source}");
    }

    public function testBareDelimiterPairIsTheEmptyReference(): void
    {
        $this->assertParsesAs('(<a> <> <b>)', '(a "" b)');
    }

    public function testEveryDelimiterStyleYieldsTheSameEmptyReference(): void
    {
        $this->assertParsesAs('(<a> <> <b>)', '(a "" b)');
        $this->assertParsesAs('(<a> <> <b>)', "(a '' b)");
        $this->assertParsesAs('(<a> <> <b>)', '(a `` b)');
    }

    public function testAdjacentEmptyReferencesStaySeparate(): void
    {
        $this->assertParsesAs('(<a> <> <> <b>)', '(a "" "" b)');
        $this->assertParsesAs('(<a> <> <> <b>)', "(a '' '' b)");
        $this->assertParsesAs('(<a> <> <> <b>)', '(a `` `` b)');
        $this->assertParsesAs('(<a> <> <> <b>)', '(a ""  "" b)');
    }

    public function testNestedEmptyReferencesParse(): void
    {
        $this->assertParsesAs('(<> (<> <1>))', '("" ("" 1))');
        $this->assertParsesAs('(<> (<> <1>))', '("" (\'\' 1))');
        $this->assertParsesAs('(<x> (<> <1>))', '("x" ("" 1))');
        $this->assertParsesAs('(<> (<x> <1>))', '("" ("x" 1))');
        $this->assertParsesAs('(<> <x> (<> <1>))', '("" x ("" 1))');
        $this->assertParsesAs('(<> <1> (<> <1>))', '("" 1 ("" 1))');
    }

    public function testEmptyReferenceIsValidAsAnId(): void
    {
        $this->assertParsesAs('(<>: <1>)', '("": 1)');
        $this->assertParsesAs('(<o>: (<> (<o>: (<> <1>))))', '(o: ("" (o: ("" 1))))');
    }

    public function testNQuoteDelimitedBodiesAreUnchanged(): void
    {
        // A run that encloses a substantive body keeps its n-quote meaning.
        $this->assertParsesAs('(<a> <x> <b>)', '(a ""x"" b)');
        $this->assertParsesAs('(<x> < " >)', '(x "" " "")');
        $this->assertParsesAs('(<x> < " >)', '(x \' " \')');
        // An n-quote-delimited empty is still empty.
        $this->assertParsesAs('(<a> <> <b>)', '(a """" b)');
    }

    public function testASingleSpaceStillReadsAsASpace(): void
    {
        $this->assertParsesAs('(<a> < > <b>)', '(a " " b)');
    }

    public function testEmptyReferenceSurvivesARoundTrip(): void
    {
        $sources = [
            '(a "" b)',
            '(a "" "" b)',
            '("" ("" 1))',
            '("": 1)',
            '(o: ("" (o: ("" 1))))',
        ];
        foreach ($sources as $source) {
            $formatted = Formatter::formatLinks($this->parser->parse($source));
            $reformatted = Formatter::formatLinks($this->parser->parse($formatted));
            $this->assertSame($formatted, $reformatted, "Round trip changed {$source}");
        }
    }

    public function testEmptyReferenceIsWrittenAsADelimiterPair(): void
    {
        $this->assertSame('(a "" b)', Formatter::formatLinks($this->parser->parse('(a "" b)')));
    }
}
