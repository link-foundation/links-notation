<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\CstNode;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\StreamParser;
use PHPUnit\Framework\TestCase;

class SharedSyntaxParityTest extends TestCase
{
    private static function fixtures(string $name): array
    {
        return json_decode(
            file_get_contents(dirname(__DIR__, 2) . '/parity/' . $name),
            true,
            flags: JSON_THROW_ON_ERROR
        );
    }

    private function tree(array $links): array
    {
        return array_map(
            fn (Link $link): array => [
                'id' => $link->id,
                'raw' => $link->getRawId(),
                'quote' => $link->getQuote(),
                'values' => $this->tree($link->values),
            ],
            $links
        );
    }

    public function testRawReferencesAndConcreteSyntaxTrees(): void
    {
        $fixtures = self::fixtures('syntax-fixtures.json');
        self::assertNotEmpty($fixtures);
        foreach ($fixtures as $fixture) {
            $parser = new Parser();
            self::assertSame($fixture['links'], $this->tree($parser->parse($fixture['input'])), $fixture['id']);
            $cst = $parser->parseCst($fixture['input']);
            self::assertSame($fixture['cst'], $cst->toSExpression(), $fixture['id']);
            self::assertSame($fixture['input'], (string) $cst, $fixture['id']);
            $stream = new StreamParser();
            foreach (mb_str_split($fixture['input']) as $character) {
                $stream->write($character);
            }
            self::assertSame($fixture['links'], $this->tree($stream->finish()), $fixture['id']);
        }
    }

    public function testEverySharedInputIsRecoveredExactlyFromItsConcreteSyntaxTree(): void
    {
        $fixtures = array_merge(self::fixtures('text-fixtures.json'), self::fixtures('syntax-fixtures.json'));
        self::assertNotEmpty($fixtures);
        foreach ($fixtures as $fixture) {
            $cst = (new Parser())->parseCst($fixture['input']);
            self::assertSame($fixture['input'], (string) $cst, $fixture['id']);
            self::assertSame(
                $fixture['input'],
                implode('', array_map(static fn (CstNode $token): string => $token->text(), $cst->tokens())),
                $fixture['id']
            );
        }
    }
}
