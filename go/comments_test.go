package lino

import (
	"strings"
	"testing"
)

// Conformance tests for line comments.
//
// https://github.com/link-foundation/links-notation/issues/301
//
// `#` starts a comment that runs to the end of the line, unless it sits inside
// a token or inside a delimited reference. Parsers accept comments by default
// and can be told to treat `#` as an ordinary character again. The table below
// is shared with the Rust, JavaScript, Python, C#, Java and PHP suites, so a
// document written by one implementation reads the same in all of them.

// renderedWith renders every link of a document, using the given parser.
func renderedWith(t *testing.T, parser *Parser, source string) string {
	t.Helper()
	links, err := parser.Parse(source)
	if err != nil {
		t.Fatalf("Failed to parse %q: %v", source, err)
	}
	parts := make([]string, 0, len(links))
	for _, link := range links {
		parts = append(parts, renderNode(link))
	}
	return strings.Join(parts, "\n")
}

func rendered(t *testing.T, source string) string {
	t.Helper()
	return renderedWith(t, NewParser(), source)
}

func TestALineThatStartsWithAHashIsAComment(t *testing.T) {
	assertParsesAs(t, "# a b\n", "")
}

func TestACommentMayHoldAColon(t *testing.T) {
	// The document from #301: prose with a colon used to be read as a link.
	assertParsesAs(t, "# a: b\n", "")
}

func TestACommentMayHoldAnythingAtAll(t *testing.T) {
	assertParsesAs(t, "# ) : ( \" ' ` #\n", "")
}

func TestACommentEndsAtTheEndOfItsLine(t *testing.T) {
	assertParsesAs(t, "# note\na: b\n", "(<a>: <b>)")
}

func TestACommentMayFollowALink(t *testing.T) {
	assertParsesAs(t, "a: b # why\n", "(<a>: <b>)")
}

func TestACommentMayFollowAGroup(t *testing.T) {
	assertParsesAs(t, "(a b) # why\n", "(<a> <b>)")
}

func TestACommentNeedsNoClosingNewline(t *testing.T) {
	assertParsesAs(t, "a: b # why", "(<a>: <b>)")
}

func TestACommentLineInsideAnIndentedBlockIsSkipped(t *testing.T) {
	withComment := rendered(t, "parent\n  # what the child is for\n  child\n")
	without := rendered(t, "parent\n  child\n")
	if withComment != without {
		t.Errorf("expected %q, got %q", without, withComment)
	}
}

func TestACommentLineInsideAGroupIsSkipped(t *testing.T) {
	withComment := rendered(t, "(\n  a\n  # why\n  b\n)\n")
	without := rendered(t, "(\n  a\n  b\n)\n")
	if withComment != without {
		t.Errorf("expected %q, got %q", without, withComment)
	}
}

func TestALineOfSpacesSeparatesLinksTheWayAnEmptyLineDoes(t *testing.T) {
	// Blanking a comment leaves a line of spaces behind, so such a line has to
	// read as a blank line.
	spaces := rendered(t, "a\n   \nb\n")
	empty := rendered(t, "a\n\nb\n")
	if spaces != empty {
		t.Errorf("expected %q, got %q", empty, spaces)
	}
}

func TestADocumentOfCommentsAloneHoldsNoLinks(t *testing.T) {
	assertParsesAs(t, "# one\n# two\n", "")
}

func TestAHashInsideATokenIsAnOrdinaryCharacter(t *testing.T) {
	assertParsesAs(t, "issue#1047\n", "(<issue#1047>)")
}

func TestAHashThatOpensATokenIsAnOrdinaryCharacter(t *testing.T) {
	assertParsesAs(t, "a: b#c\n", "(<a>: <b#c>)")
}

func TestAHashInsideADelimitedReferenceIsContent(t *testing.T) {
	assertParsesAs(t, "\"# not a comment\" a\n", "(<# not a comment> <a>)")
}

func TestACommentMayFollowADelimitedReference(t *testing.T) {
	assertParsesAs(t, "\"a\" # why\n", "(<a>)")
}

func TestAHashInsideAMultilineDelimitedReferenceIsContent(t *testing.T) {
	assertParsesAs(t, "\"a # b\nc\" d\n", "(<a # b\nc> <d>)")
}

func TestCommentsAreOnByDefault(t *testing.T) {
	if !NewParser().Comments {
		t.Error("expected a new parser to read comments")
	}
}

func TestAParserWithoutCommentsKeepsTheHash(t *testing.T) {
	parser := NewParser()
	parser.Comments = false

	if got := renderedWith(t, parser, "# a b\n"); got != "(<#> <a> <b>)" {
		t.Errorf("expected %q, got %q", "(<#> <a> <b>)", got)
	}
}

func TestBlankingACommentKeepsTheLengthOfTheDocument(t *testing.T) {
	cases := map[string]string{
		"a: b # why\n": "a: b      \n",
		"\"# kept\"\n": "\"# kept\"\n",
		"issue#1047\n": "issue#1047\n",
	}
	for document, expected := range cases {
		if got := StripComments(document); got != expected {
			t.Errorf("StripComments(%q) = %q, want %q", document, got, expected)
		}
	}
}

func TestAReferenceThatBeginsWithAHashIsWrittenQuoted(t *testing.T) {
	// Without the quotes the document would read as `a` followed by a comment.
	document := Format([]*Link{NewLink(nil, []*Link{NewRef("a"), NewRef("#tag")})})

	if document != "(a '#tag')" {
		t.Errorf("expected %q, got %q", "(a '#tag')", document)
	}
	if got := rendered(t, document); got != "(<a> <#tag>)" {
		t.Errorf("expected %q, got %q", "(<a> <#tag>)", got)
	}
}

func TestAHashThatCannotOpenACommentIsLeftUnquoted(t *testing.T) {
	cases := map[string]string{
		"issue#1047": "issue#1047",
		"#":          "'#'",
		"#ff0000":    "'#ff0000'",
	}
	for reference, expected := range cases {
		if got := escapeReference(reference); got != expected {
			t.Errorf("escapeReference(%q) = %q, want %q", reference, got, expected)
		}
	}
}

// Issue #377: the comment reader and the parser must agree on where every
// delimited reference starts and how far it reaches, or a comment is blanked
// inside what the parser then reads as a reference.

func TestAHashInsideAReferenceThatFollowsAGroupIsContent(t *testing.T) {
	assertParsesAs(t, "(a)\" #b\"\n", "((<a>) < #b>)")
}

func TestAHashInsideAReferenceThatFollowsAnotherReferenceIsContent(t *testing.T) {
	assertParsesAs(t, "\"x\"' #y'\n", "(<x> < #y>)")
	assertParsesAs(t, "```q```\"\"x # c\n\"\"\"\n", "(<q> <x # c\n\">)")
}

func TestAHashInsideAReferenceThatFollowsALiteralIsContent(t *testing.T) {
	assertParsesAs(t, "~1{62}\" #b\"\n", "(<b> < #b>)")
}

func TestAReferenceIsReadInTheDocumentAsWrittenCommentsIncluded(t *testing.T) {
	// The body of the first "" straddles a parenthesis, so it is the empty
	// reference and the # after it opens a comment. Blanking that comment must
	// not turn the "" into a reference that holds the blanked text.
	assertParsesAs(t, "\"\" a #)b\n\"\"\n", "(<> <a>)\n(<>)")
}

func TestTheCommentReaderSkipsTheReferencesTheParserReads(t *testing.T) {
	cases := map[string]string{
		"(a)\" #b\"\n":    "(a)\" #b\"\n",
		"\"x\"' #y'\n":    "\"x\"' #y'\n",
		"~1{62}\" #b\"\n": "~1{62}\" #b\"\n",
		"a\"b # c\"\n":    "a\"b     \n",
	}
	for document, expected := range cases {
		if got := StripComments(document); got != expected {
			t.Errorf("StripComments(%q) = %q, want %q", document, got, expected)
		}
	}
}

// Issue #444: a # that opens a token later on a line and is followed by a
// character that could continue a bare reference is a value, so a value is
// never dropped as a comment. At the start of a line it is still a comment.

func TestAHashThatOpensAValueLaterOnALineIsTheValue(t *testing.T) {
	assertParsesAs(t, "tag #release\n", "(<tag> <#release>)")
	assertParsesAs(t, "root:\n  tag #release\n  next 1\n", rendered(t, "root:\n  tag \"#release\"\n  next 1\n"))
	assertParsesAs(t, "colour #ff0000 # a note\n", "(<colour> <#ff0000>)")
}

func TestAHashFollowedByASpaceAParenthesisOrNothingOpensAComment(t *testing.T) {
	assertParsesAs(t, "a: b #\n", "(<a>: <b>)")
	assertParsesAs(t, "a: b #\tnote\n", "(<a>: <b>)")
	assertParsesAs(t, "a b #(note)\n", "(<a> <b>)")
	assertParsesAs(t, "a b #:note\n", "(<a> <b>)")
}

func TestAHashAtTheStartOfALineOpensACommentWhateverFollowsIt(t *testing.T) {
	assertParsesAs(t, "#release\na\n", "(<a>)")
	assertParsesAs(t, "root\n  #release\n  a\n", rendered(t, "root\n  a\n"))
}

func TestTheCommentReaderKeepsAHashThatOpensAValue(t *testing.T) {
	if got := StripComments("tag #release # note\n"); got != "tag #release       \n" {
		t.Errorf("StripComments = %q", got)
	}
}

func TestTheStreamReadsAHashThatOpensAValue(t *testing.T) {
	// #x is a reference, not a comment, so the group after it is open until the
	// next line closes it, and the first line cannot be emitted on its own.
	input := "a #x (\nb)\nc\n"
	stream := NewStreamParser()
	for _, symbol := range input {
		if _, err := stream.Feed(string(symbol)); err != nil {
			t.Fatal(err)
		}
	}
	streamed, err := stream.Finish()
	if err != nil {
		t.Fatal(err)
	}
	expected, err := Parse(input)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := Format(streamed), Format(expected); got != want {
		t.Errorf("streamed %q, want %q", got, want)
	}
	if got := Format(expected); got != "(a '#x' (b))\n(c)" {
		t.Errorf("parsed %q", got)
	}
}
