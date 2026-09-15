<?php

/**
 * FormatConfig tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\FormatConfig;
use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class FormatConfigTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    public function testFormatConfigBasic(): void
    {
        $config = new FormatConfig();
        $this->assertFalse($config->lessParentheses);
        $this->assertSame(80, $config->maxLineLength);
        $this->assertFalse($config->indentLongLines);
    }

    public function testFormatWithLineLengthLimit(): void
    {
        $values = [];
        for ($i = 1; $i <= 10; $i++) {
            $values[] = new Link((string) $i);
        }
        $link = new Link('sequence', $values);

        // '(sequence: 1 2 3 4 5 6 7 8 9 10)' is 32 chars, so a threshold of 30 triggers indentation
        $config = new FormatConfig(indentLongLines: true, maxLineLength: 30, preferInline: false);

        $output = $link->format($config);
        $this->assertStringContainsString('sequence:', $output);
        $this->assertStringContainsString("\n", $output);
    }

    public function testFormatWithMaxInlineRefs(): void
    {
        $link = new Link('id', [new Link('1'), new Link('2'), new Link('3'), new Link('4')]);

        $config = new FormatConfig(maxInlineRefs: 3, preferInline: false);

        $output = $link->format($config);
        $this->assertStringContainsString('id:', $output);
        $this->assertStringContainsString("\n", $output);
    }

    public function testFormatWithConsecutiveGrouping(): void
    {
        $links = [
            new Link('SetA', [new Link('a')]),
            new Link('SetA', [new Link('b')]),
            new Link('SetA', [new Link('c')]),
        ];

        $config = new FormatConfig(groupConsecutive: true);

        $output = Formatter::formatLinks($links, $config);

        $this->assertStringContainsString('SetA', $output);
        $this->assertStringContainsString('a', $output);
        $this->assertStringContainsString('b', $output);
        $this->assertStringContainsString('c', $output);
    }

    public function testFormatConfigLessParentheses(): void
    {
        $link = new Link('id', [new Link('value')]);

        $config = new FormatConfig(lessParentheses: true);

        $this->assertSame('id: value', $link->format($config));
    }

    public function testFormatConfigCustomIndent(): void
    {
        $link = new Link('id', [new Link('1'), new Link('2'), new Link('3'), new Link('4')]);

        $config = new FormatConfig(maxInlineRefs: 3, indentString: '    ', preferInline: false);

        $output = $link->format($config);
        $this->assertStringContainsString('    ', $output);
    }

    public function testRoundtripWithLineLengthFormatting(): void
    {
        $originalLink = new Link('test', [new Link('a'), new Link('b'), new Link('c')]);

        $config = new FormatConfig(maxInlineRefs: 2, preferInline: false);

        $formatted = $originalLink->format($config);

        $parsed = $this->parser->parse($formatted);

        $this->assertNotEmpty($parsed);
    }

    public function testShouldIndentByLength(): void
    {
        $config = new FormatConfig(indentLongLines: true, maxLineLength: 80);

        $this->assertFalse($config->shouldIndentByLength('short'));
        $this->assertTrue($config->shouldIndentByLength(str_repeat('a', 100)));
    }

    public function testShouldIndentByRefCount(): void
    {
        $config = new FormatConfig(maxInlineRefs: 3);

        $this->assertFalse($config->shouldIndentByRefCount(2));
        $this->assertFalse($config->shouldIndentByRefCount(3));
        $this->assertTrue($config->shouldIndentByRefCount(4));
    }
}
