<?php

/**
 * Conformance tests for line comments.
 *
 * https://github.com/link-foundation/links-notation/issues/301
 *
 * `#` starts a comment that runs to the end of the line, unless it sits inside
 * a token or inside a delimited reference. Parsers read comments by default and
 * can be told to treat `#` as an ordinary character again. The table below is
 * shared with the Rust, JavaScript, Python, Go, C# and Java suites, so a
 * document written by one implementation reads the same in all of them.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Comments;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class CommentsTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    /**
     * Render a parsed node unambiguously: every reference is wrapped in angle
     * brackets.
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

    private function renderedWith(Parser $parser, string $source): string
    {
        $links = $parser->parse($source);

        return implode("\n", array_map(fn (Link $link): string => $this->render($link), $links));
    }

    private function rendered(string $source): string
    {
        return $this->renderedWith($this->parser, $source);
    }

    private function assertParsesAs(string $expected, string $source): void
    {
        $this->assertSame($expected, $this->rendered($source), "Parsing {$source}");
    }

    public function testALineThatStartsWithAHashIsAComment(): void
    {
        $this->assertParsesAs('', "# a b\n");
    }

    public function testACommentMayHoldAColon(): void
    {
        // The document from #301: prose with a colon used to be read as a link.
        $this->assertParsesAs('', "# a: b\n");
    }

    public function testACommentMayHoldAnythingAtAll(): void
    {
        $this->assertParsesAs('', "# ) : ( \" ' ` #\n");
    }

    public function testACommentEndsAtTheEndOfItsLine(): void
    {
        $this->assertParsesAs('(<a>: <b>)', "# note\na: b\n");
    }

    public function testACommentMayFollowALink(): void
    {
        $this->assertParsesAs('(<a>: <b>)', "a: b # why\n");
    }

    public function testACommentMayFollowAGroup(): void
    {
        $this->assertParsesAs('(<a> <b>)', "(a b) # why\n");
    }

    public function testACommentNeedsNoClosingNewline(): void
    {
        $this->assertParsesAs('(<a>: <b>)', 'a: b # why');
    }

    public function testACommentLineInsideAnIndentedBlockIsSkipped(): void
    {
        $this->assertSame(
            $this->rendered("parent\n  child\n"),
            $this->rendered("parent\n  # what the child is for\n  child\n")
        );
    }

    public function testACommentLineInsideAGroupIsSkipped(): void
    {
        $this->assertSame(
            $this->rendered("(\n  a\n  b\n)\n"),
            $this->rendered("(\n  a\n  # why\n  b\n)\n")
        );
    }

    public function testALineOfSpacesSeparatesLinksTheWayAnEmptyLineDoes(): void
    {
        // Blanking a comment leaves a line of spaces behind, so such a line has
        // to read the way an empty line does.
        $this->assertSame($this->rendered("a\n\nb\n"), $this->rendered("a\n   \nb\n"));
    }

    public function testADocumentOfCommentsAloneHoldsNoLinks(): void
    {
        $this->assertParsesAs('', "# one\n# two\n");
    }

    public function testAHashInsideATokenIsAnOrdinaryCharacter(): void
    {
        $this->assertParsesAs('(<issue#1047>)', "issue#1047\n");
    }

    public function testAHashThatOpensATokenIsAnOrdinaryCharacter(): void
    {
        $this->assertParsesAs('(<a>: <b#c>)', "a: b#c\n");
    }

    public function testAHashInsideADelimitedReferenceIsContent(): void
    {
        $this->assertParsesAs('(<# not a comment> <a>)', "\"# not a comment\" a\n");
    }

    public function testACommentMayFollowADelimitedReference(): void
    {
        $this->assertParsesAs('(<a>)', "\"a\" # why\n");
    }

    public function testAHashInsideAMultiLineDelimitedReferenceIsContent(): void
    {
        $this->assertParsesAs("(<a # b\nc> <d>)", "\"a # b\nc\" d\n");
    }

    public function testCommentsAreOnByDefault(): void
    {
        $this->assertTrue((new Parser())->comments);
        $this->assertParsesAs('', "# a b\n");
    }

    public function testAParserWithoutCommentsKeepsTheHash(): void
    {
        $plain = new Parser(10 * 1024 * 1024, 1000, false);

        $this->assertSame('(<#> <a> <b>)', $this->renderedWith($plain, "# a b\n"));
    }

    public function testBlankingACommentKeepsTheLengthOfTheDocument(): void
    {
        $this->assertSame("a: b      \n", Comments::stripComments("a: b # why\n"));
        $this->assertSame("\"# kept\"\n", Comments::stripComments("\"# kept\"\n"));
        $this->assertSame("issue#1047\n", Comments::stripComments("issue#1047\n"));
        $this->assertSame("     \n", Comments::stripComments("# why\n"));
    }
}
