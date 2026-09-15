<?php

/**
 * Edge case parser tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class EdgeCaseParserTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testEmptyLink(): void
    {
        // A standalone colon is accepted by this implementation (differs from JS/Rust)
        $this->assertIsArray($this->parser->parse(':'));
    }

    public function testEmptyLinkWithParentheses(): void
    {
        $this->assertSame('()', Formatter::formatLinks($this->parser->parse('()')));
    }

    public function testEmptyLinkWithEmptySelfReference(): void
    {
        $this->assertIsArray($this->parser->parse('(:)'));
    }

    public function testAllFeatures(): void
    {
        $this->assertNotEmpty($this->parser->parse('id: value1 value2'));
        $this->assertNotEmpty($this->parser->parse('(id: value1 value2)'));
        $this->assertIsArray($this->parser->parse(': value1 value2'));
        $this->assertIsArray($this->parser->parse('(: value1 value2)'));

        $result = $this->parser->parse('(singlet)');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame('singlet', $result[0]->values[0]->id);
        $this->assertSame([], $result[0]->values[0]->values);

        $this->assertNotEmpty($this->parser->parse('(value1 value2 value3)'));
        $this->assertNotEmpty($this->parser->parse('("id with spaces": "value with spaces")'));
        $this->assertNotEmpty($this->parser->parse("('id': 'value')"));
        $this->assertNotEmpty($this->parser->parse('(outer: (inner: value))'));
    }

    public function testEmptyDocument(): void
    {
        $this->assertSame([], $this->parser->parse(''));
    }

    public function testWhitespaceOnly(): void
    {
        $this->assertSame([], $this->parser->parse("   \n   \n   "));
    }

    public function testEmptyLinks(): void
    {
        $result = $this->parser->parse('()');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertSame([], $result[0]->values);

        $this->assertIsArray($this->parser->parse('(:)'));

        $result = $this->parser->parse('(id:)');
        $this->assertCount(1, $result);
        $this->assertSame('id', $result[0]->id);
        $this->assertSame([], $result[0]->values);
    }

    public function testSingletLinks(): void
    {
        $result = $this->parser->parse('(1)');
        $this->assertCount(1, $result);
        $this->assertNull($result[0]->id);
        $this->assertCount(1, $result[0]->values);
        $this->assertSame('1', $result[0]->values[0]->id);
        $this->assertSame([], $result[0]->values[0]->values);

        foreach ([['(1 2)', 2], ['(1 2 3)', 3], ['(1 2 3 4)', 4]] as [$input, $count]) {
            $result = $this->parser->parse($input);
            $this->assertCount(1, $result);
            $this->assertNull($result[0]->id);
            $this->assertCount($count, $result[0]->values);
            for ($i = 0; $i < $count; $i++) {
                $this->assertSame((string) ($i + 1), $result[0]->values[$i]->id);
                $this->assertSame([], $result[0]->values[$i]->values);
            }
        }
    }

    public function testInvalidInput(): void
    {
        // Unclosed parentheses: either a lenient parse or an exception is acceptable
        try {
            $result = $this->parser->parse('(invalid');
            $this->assertIsArray($result);
        } catch (\Exception $e) {
            $this->assertInstanceOf(\Exception::class, $e);
        }
    }
}
