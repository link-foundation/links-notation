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
