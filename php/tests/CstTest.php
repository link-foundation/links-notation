<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\CstKind;
use LinkFoundation\LinksNotation\CstNode;
use LinkFoundation\LinksNotation\ParseException;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** The concrete syntax tree (issue #364). */
class CstTest extends TestCase
{
    public function testIsTheDefaultLosslessViewOfADocument(): void
    {
        $input = "(t 1 '1')";
        $cst = (new Parser())->parseCst($input);
        self::assertInstanceOf(CstNode::class, $cst);
        self::assertSame(CstKind::DOCUMENT, $cst->kind);
        self::assertSame($input, (string) $cst);
        self::assertSame($input, $cst->text());
        self::assertSame(
            '(document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" '
            . 'whitespace:" " reference:"\'1\'") close_paren:")")))',
            $cst->toSExpression()
        );
    }

    public function testReferenceTokensCarryTheirValueAndDelimiter(): void
    {
        $references = array_values(array_filter(
            (new Parser())->parseCst("(a \"b c\" ~1{64} ''e''''f'')")->tokens(),
            static fn (CstNode $token): bool => $token->kind === CstKind::REFERENCE
        ));
        self::assertSame(
            [['a', 'a', null], ['"b c"', 'b c', '"'], ['~1{64}', 'd', null], ["''e''''f''", "e''f", "'"]],
            array_map(static fn (CstNode $token): array => [$token->text(), $token->value, $token->quote], $references)
        );
    }

    /** @return array<string, array{string}> */
    public static function documents(): array
    {
        return [
            'empty' => [''],
            'only whitespace' => [" \t "],
            'blank lines' => ["\n\n"],
            'CRLF and CR' => ["a\r\nb\rc\r\n"],
            'tabs and trailing spaces' => ["a\t b  \n"],
            'comments everywhere' => ["# head\na: b # tail\n  # inner\n  c\n# end"],
            'multiline quotes' => ["(note: \"one\n  two\r\nthree\")"],
            'nested groups over lines' => ["(a (b\n  (c d)\n) e)\n"],
            'indentation' => ["root:\n  child:\n    leaf\n  tail"],
            'literals' => ['(~1{} ~1{e6a0b9})'],
            'comment marks inside quotes' => ['(\'#a\' "b # c" `#`)'],
            'unicode' => ["(根: café 🙂)\n"],
        ];
    }

    #[DataProvider('documents')]
    public function testRecoversTheDocumentExactly(string $input): void
    {
        $cst = (new Parser())->parseCst($input);
        self::assertSame($input, (string) $cst);
        self::assertSame(
            $input,
            implode('', array_map(static fn (CstNode $token): string => $token->text(), $cst->tokens()))
        );
    }

    public function testAnEmptyDocumentHasNoLines(): void
    {
        self::assertSame('(document)', (new Parser())->parseCst('')->toSExpression());
    }

    public function testWritesNonAsciiTextAsItIs(): void
    {
        self::assertSame(
            '(document (line reference:"café" whitespace:" " reference:"\'根\\t\'"))',
            (new Parser())->parseCst("café '根\t'")->toSExpression()
        );
    }

    public function testWithoutCommentSupportHashIsPartOfReferences(): void
    {
        $input = 'a #b';
        $cst = (new Parser(comments: false))->parseCst($input);
        self::assertSame($input, (string) $cst);
        self::assertSame(
            [CstKind::REFERENCE, CstKind::WHITESPACE, CstKind::REFERENCE],
            array_map(static fn (CstNode $token): string => $token->kind, $cst->tokens())
        );
        self::assertSame(
            [CstKind::REFERENCE, CstKind::WHITESPACE, CstKind::COMMENT],
            array_map(static fn (CstNode $token): string => $token->kind, (new Parser())->parseCst($input)->tokens())
        );
    }

    public function testAGroupBelongsToTheLineItOpensOn(): void
    {
        $cst = (new Parser())->parseCst("a (b\nc)\nd");
        self::assertSame(
            ["a (b\nc)\n", 'd'],
            array_map(static fn (CstNode $line): string => (string) $line, $cst->children)
        );
        $group = $cst->children[0]->children[2];
        self::assertSame(CstKind::GROUP, $group->kind);
        self::assertSame(
            [CstKind::OPEN_PAREN, CstKind::LINE, CstKind::LINE, CstKind::CLOSE_PAREN],
            array_map(static fn (CstNode $child): string => $child->kind, $group->children)
        );
        self::assertTrue($group->children[0]->isToken());
        self::assertFalse($group->isToken());
    }

    /** @return array<string, array{Parser, string}> */
    public static function rejected(): array
    {
        return [
            'unclosed group' => [new Parser(), '(a'],
            'unopened group' => [new Parser(), 'a)'],
            'too deep' => [new Parser(maxDepth: 1), '((a))'],
        ];
    }

    #[DataProvider('rejected')]
    public function testRejectsWhatParseRejects(Parser $parser, string $input): void
    {
        $this->expectException(ParseException::class);
        $parser->parseCst($input);
    }
}
