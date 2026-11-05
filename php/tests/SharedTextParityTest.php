<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\FormatConfig;
use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\StreamParser;
use PHPUnit\Framework\TestCase;

class SharedTextParityTest extends TestCase
{
    private function tree(array $links): array
    {
        return array_map(fn (Link $link): array => ['id' => $link->id, 'values' => $this->tree($link->values)], $links);
    }

    private function fixtures(): array
    {
        $fixtures = json_decode(
            file_get_contents(dirname(__DIR__, 2) . '/parity/text-fixtures.json'),
            true,
            flags: JSON_THROW_ON_ERROR
        );
        self::assertNotEmpty($fixtures);

        return $fixtures;
    }

    public function testSharedTextParity(): void
    {
        $fixtures = $this->fixtures();
        foreach ($fixtures as $fixture) {
            $parsed = (new Parser())->parse($fixture['input']);
            self::assertSame($fixture['expected'], $this->tree($parsed), $fixture['id']);
            self::assertSame($fixture['format'], Formatter::formatLinks($parsed), $fixture['id']);
            self::assertSame(
                $fixture['expected'],
                $this->tree((new Parser())->parse($fixture['format'])),
                $fixture['id']
            );
            $stream = new StreamParser();
            foreach (mb_str_split($fixture['input']) as $character) {
                $stream->write($character);
            }
            self::assertSame($fixture['expected'], $this->tree($stream->finish()), $fixture['id']);
        }
    }

    public function testSharedLessParenthesesRoundTrip(): void
    {
        foreach ($this->fixtures() as $fixture) {
            $parsed = (new Parser())->parse($fixture['input']);
            self::assertSame($fixture['lessParentheses'], Formatter::formatLinks($parsed, true), $fixture['id']);
            self::assertSame(
                $fixture['lessParentheses'],
                Formatter::formatLinks($parsed, new FormatConfig(lessParentheses: true)),
                $fixture['id']
            );
            self::assertSame(
                $fixture['expected'],
                $this->tree((new Parser())->parse($fixture['lessParentheses'])),
                $fixture['id']
            );
        }
    }
    public function testSharedNestedFormat(): void
    {
        $cases = json_decode(
            file_get_contents(dirname(__DIR__, 2) . '/parity/nested-fixtures.json'),
            true,
            flags: JSON_THROW_ON_ERROR
        );
        self::assertNotEmpty($cases);
        foreach ($cases as $case) {
            self::assertSame(
                $case['nested'],
                Formatter::formatNested((new Parser())->parse($case['input'])),
                $case['id']
            );
        }
    }

    public function testAnonymousThresholdRoundTrip(): void
    {
        foreach (['a b c', '((b c))', '(a (b c))'] as $input) {
            $links = (new Parser())->parse($input);
            $configs = [
                new FormatConfig(lessParentheses: true, maxInlineRefs: 0, preferInline: false),
                new FormatConfig(
                    lessParentheses: true,
                    indentLongLines: true,
                    maxLineLength: 1,
                    preferInline: false
                ),
            ];
            foreach ($configs as $config) {
                self::assertSame(
                    $this->tree($links),
                    $this->tree((new Parser())->parse(Formatter::formatLinks($links, $config)))
                );
            }
        }
    }
}
