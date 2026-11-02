<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\StreamParser;
use PHPUnit\Framework\TestCase;
use TypeError;

/** Syntax metadata on parsed links (issue #364). */
class SyntaxMetadataTest extends TestCase
{
    public function testOneAndQuotedOneAreTheSameReferenceButKeepHowTheyWereWritten(): void
    {
        [$link] = (new Parser())->parse("(t 1 '1')");
        [, $bare, $quoted] = $link->values;
        self::assertSame('1', $bare->id);
        self::assertSame('1', $quoted->id);
        self::assertSame('1', $bare->getRawId());
        self::assertSame("'1'", $quoted->getRawId());
        self::assertNull($bare->getQuote());
        self::assertSame("'", $quoted->getQuote());
        // Equality and formatting ignore the metadata.
        self::assertTrue($bare->equals($quoted));
        self::assertTrue($bare == $quoted);
        self::assertSame('(t 1 1)', $link->format());
    }

    public function testRecordsEveryQuoteKindAndRunLength(): void
    {
        [$link] = (new Parser())->parse('("a": \'b\' `c` ""d"" ~1{65} f)');
        self::assertSame('"a"', $link->getRawId());
        self::assertSame('"', $link->getQuote());
        self::assertSame(
            [["'b'", "'"], ['`c`', '`'], ['""d""', '"'], ['~1{65}', null], ['f', null]],
            array_map(static fn (Link $value): array => [$value->getRawId(), $value->getQuote()], $link->values)
        );
    }

    public function testKeepsRawTextFromTheSourceNotFromCommentStripping(): void
    {
        [$link] = (new Parser())->parse("(a 'b # c') # d");
        self::assertSame("'b # c'", $link->values[1]->getRawId());
    }

    public function testRecordsIndentedIdsAndMultilineQuotedReferences(): void
    {
        $links = (new Parser())->parse("'root':\n  \"child\"\n(note: \"one\ntwo\")");
        self::assertSame("'root'", $links[0]->getRawId());
        self::assertSame('"child"', $links[0]->values[0]->getRawId());
        self::assertSame("\"one\ntwo\"", $links[1]->values[0]->getRawId());
    }

    public function testLeavesLinksWithoutWrittenIdsWithoutRawText(): void
    {
        [$link] = (new Parser())->parse('(a b)');
        self::assertNull($link->getRawId());
        self::assertNull($link->getQuote());
        self::assertNull((new Link('x'))->getRawId());
        self::assertNull((new Link('x'))->getQuote());
    }

    public function testPathCombinationLinksHaveNoRawText(): void
    {
        $links = (new Parser())->parse("a\n  'b'");
        self::assertTrue($links[1]->isFromPathCombination);
        self::assertNull($links[1]->getRawId());
        self::assertSame("'b'", $links[1]->values[1]->values[0]->getRawId());
    }

    public function testDoesNotChangeEqualityFormattingOrSerialization(): void
    {
        $quoted = (new Parser())->parse("('a': 'b')");
        $bare = (new Parser())->parse('(a: b)');
        self::assertTrue($quoted[0]->equals($bare[0]));
        self::assertSame(Formatter::formatLinks($bare), Formatter::formatLinks($quoted));
        self::assertSame((string) $bare[0], (string) $quoted[0]);
        self::assertSame(json_encode($bare), json_encode($quoted));
        self::assertSame(serialize($bare), serialize($quoted));
        self::assertSame(var_export($bare, true), var_export($quoted, true));
        self::assertEquals($bare, $quoted);
    }

    public function testAstModeDropsTheMetadata(): void
    {
        [$link] = (new Parser(syntax: false))->parse("('a': 'b')");
        self::assertNull($link->getRawId());
        self::assertNull($link->values[0]->getRawId());
        self::assertNull($link->values[0]->getQuote());
        self::assertTrue($link->equals((new Parser())->parse("('a': 'b')")[0]));
    }

    public function testStreamParserKeepsTheMetadata(): void
    {
        $stream = new StreamParser();
        $stream->write("(a '");
        $stream->write("b')");
        [$link] = $stream->finish();
        self::assertSame("'b'", $link->values[1]->getRawId());
        self::assertSame("'", $link->values[1]->getQuote());
        $chunks = iterator_to_array(StreamParser::parseChunks(["'root':\n", '  "child"']), false);
        self::assertSame("'root'", $chunks[0]->getRawId());
        self::assertSame('"child"', $chunks[0]->values[0]->getRawId());
    }

    public function testRawIdCanBeSetOnLinksBuiltInCodeAndMustBeTextOrNull(): void
    {
        $link = new Link('a');
        $link->setRawId('"a"');
        self::assertSame('"a"', $link->getRawId());
        self::assertSame('"', $link->getQuote());
        $link->setRawId(null);
        self::assertNull($link->getQuote());
        $this->expectException(TypeError::class);
        /** @phpstan-ignore-next-line Deliberately the wrong type. */
        $link->setRawId(1);
    }

    public function testReferenceQuoteReadsTheDelimiterOfOneCompleteReference(): void
    {
        self::assertSame("'", Link::referenceQuote("'1'"));
        self::assertSame('"', Link::referenceQuote('""a b""'));
        self::assertSame('`', Link::referenceQuote('`x`'));
        self::assertNull(Link::referenceQuote('1'));
        self::assertNull(Link::referenceQuote('~1{31}'));
        self::assertNull(Link::referenceQuote("'unclosed"));
        self::assertNull(Link::referenceQuote("'a' b"));
        self::assertNull(Link::referenceQuote(''));
        self::assertNull(Link::referenceQuote(null));
    }
}
