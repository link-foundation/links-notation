<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

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

    public function testSharedTextParity(): void
    {
        $fixtures = json_decode(
            file_get_contents(dirname(__DIR__, 2) . '/parity/text-fixtures.json'),
            true,
            flags: JSON_THROW_ON_ERROR
        );
        self::assertNotEmpty($fixtures);
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
}
