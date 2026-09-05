<?php

/**
 * Single-line parser tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class SingleLineParserTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testSingleLink(): void
    {
        $source = '(address: source target)';
        $this->assertSame($source, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testTripletSingleLink(): void
    {
        $source = '(papa has car)';
        $this->assertSame($source, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testBugTest1(): void
    {
        $source = '(ignore conan-center-index repository)';
        $this->assertSame($source, Formatter::formatLinks($this->parser->parse($source)));
    }

    public function testQuotedReferences(): void
    {
        $links = $this->parser->parse('(a: \'b\' "c")');
        $this->assertSame('(a: b c)', Formatter::formatLinks($links));
    }

    public function testQuotedReferencesWithSpaces(): void
    {
        $links = $this->parser->parse('(\'a a\': \'b b\' "c c")');
        $this->assertSame("('a a': 'b b' 'c c')", Formatter::formatLinks($links));
    }

    public function testParseSimpleReference(): void
    {
        $result = $this->parser->parse('test');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame('test', $result[0]->values[0]->id);
        $this->assertSame([], $result[0]->values[0]->values);
    }

    public function testParseReferenceWithColonAndValues(): void
    {
        $result = $this->parser->parse('parent: child1 child2');
        $this->assertCount(1, $result);
        $this->assertSame('parent', $result[0]->id);
        $this->assertCount(2, $result[0]->values);
        $this->assertSame('child1', $result[0]->values[0]->id);
        $this->assertSame('child2', $result[0]->values[1]->id);
    }

    public function testParseMultilineLink(): void
    {
        $result = $this->parser->parse('(parent: child1 child2)');
        $this->assertCount(1, $result);
        $this->assertSame('parent', $result[0]->id);
        $this->assertCount(2, $result[0]->values);
    }

    public function testParseQuotedReferences(): void
    {
        $result = $this->parser->parse('"has space" \'has:colon\'');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(2, $result[0]->values);
        $this->assertSame('has space', $result[0]->values[0]->id);
        $this->assertSame('has:colon', $result[0]->values[1]->id);
        $this->assertSame("('has space' 'has:colon')", Formatter::formatLinks($result));
    }

    public function testParseValuesOnlyStandaloneColon(): void
    {
        // The parser is lenient here: an empty id with values is accepted
        $result = $this->parser->parse(': value1 value2');
        $this->assertNotEmpty($result);
    }

    public function testMultilineWithoutId(): void
    {
        $result = $this->parser->parse('(: value1 value2)');
        $this->assertNotEmpty($result);
    }

    public function testSingletLink(): void
    {
        $result = $this->parser->parse('(singlet)');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame('singlet', $result[0]->values[0]->id);
        $this->assertSame([], $result[0]->values[0]->values);
    }

    public function testValueLink(): void
    {
        $result = $this->parser->parse('(value1 value2 value3)');
        $this->assertCount(1, $result);
        $this->assertCount(3, $result[0]->values);
    }

    public function testQuotedReferencesWithSpacesInLink(): void
    {
        $result = $this->parser->parse('("id with spaces": "value with spaces")');
        $this->assertCount(1, $result);
        $this->assertSame('id with spaces', $result[0]->id);
        $this->assertSame('value with spaces', $result[0]->values[0]->id);
    }

    public function testSingleQuotedReferences(): void
    {
        $result = $this->parser->parse("('id': 'value')");
        $this->assertCount(1, $result);
        $this->assertSame('id', $result[0]->id);
        $this->assertSame('value', $result[0]->values[0]->id);
    }

    public function testNestedLinks(): void
    {
        $result = $this->parser->parse('(outer: (inner: value))');
        $this->assertCount(1, $result);
        $this->assertSame('outer', $result[0]->id);
        $this->assertSame('inner', $result[0]->values[0]->id);
    }

    public function testSpecialCharactersInQuotes(): void
    {
        $result = $this->parser->parse('("key:with:colons": "value(with)parens")');
        $this->assertSame('key:with:colons', $result[0]->id);
        $this->assertSame('value(with)parens', $result[0]->values[0]->id);

        $result = $this->parser->parse("('key with spaces': 'value: with special chars')");
        $this->assertSame('key with spaces', $result[0]->id);
        $this->assertSame('value: with special chars', $result[0]->values[0]->id);
    }

    public function testDeeplyNested(): void
    {
        $result = $this->parser->parse('(a: (b: (c: (d: (e: value)))))');
        $this->assertCount(1, $result);
        $this->assertSame('(a: (b: (c: (d: (e: value)))))', Formatter::formatLinks($result));
    }

    public function testHyphenatedIdentifiers(): void
    {
        $result = $this->parser->parse('(conan-center-index: repository info)');
        $this->assertSame('conan-center-index', $result[0]->id);
        $this->assertCount(2, $result[0]->values);
    }

    public function testMultipleWordsInQuotes(): void
    {
        $result = $this->parser->parse('("New York": city state)');
        $this->assertNotEmpty($result);
        $this->assertSame('New York', $result[0]->id);
    }

    public function testSimpleReferenceParser(): void
    {
        $result = $this->parser->parse('hello');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame('hello', $result[0]->values[0]->id);
    }

    public function testQuotedReferenceParser(): void
    {
        $result = $this->parser->parse('"hello world"');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame('hello world', $result[0]->values[0]->id);
    }

    public function testValueLinkParser(): void
    {
        $result = $this->parser->parse('(a b c)');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(3, $result[0]->values);
    }

    public function testLinkWithId(): void
    {
        $result = $this->parser->parse('(id: a b c)');
        $this->assertCount(1, $result);
        $this->assertSame('id', $result[0]->id);
        $this->assertCount(3, $result[0]->values);
    }

    public function testSingleLineLink(): void
    {
        $result = $this->parser->parse('id: value1 value2');
        $this->assertCount(1, $result);
        $this->assertSame('id', $result[0]->id);
        $this->assertCount(2, $result[0]->values);
    }

    public function testQuotedReferencesWithSpecialChars(): void
    {
        $result = $this->parser->parse('("special:char" "another@char")');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(2, $result[0]->values);
        $this->assertSame('special:char', $result[0]->values[0]->id);
        $this->assertSame('another@char', $result[0]->values[1]->id);
    }
}
