package lino

// Links nested too deeply are refused with an error rather than recursed into
// until the goroutine stack is exhausted, which ends the process where no
// caller can recover (https://github.com/link-foundation/links-notation/issues/315).
//
// Every parenthesized group and every indentation level is one level, and the
// lines of a document start at level 0.

import (
	"errors"
	"runtime/debug"
	"strings"
	"testing"
)

func depthParens(depth int) string {
	return strings.Repeat("(", depth) + "a" + strings.Repeat(")", depth)
}

func depthValues(depth int) string {
	return strings.Repeat("(a ", depth) + "b" + strings.Repeat(")", depth)
}

func depthIndentation(depth int) string {
	var document strings.Builder
	for level := 0; level <= depth; level++ {
		document.WriteString(strings.Repeat(" ", level) + "a\n")
	}
	return document.String()
}

func parserWithMaxDepth(maxDepth int) *Parser {
	parser := NewParser()
	parser.MaxDepth = maxDepth
	return parser
}

func tooDeep(t *testing.T, document string, maxDepth int) *ParseError {
	t.Helper()
	links, err := parserWithMaxDepth(maxDepth).Parse(document)
	if err == nil {
		t.Fatalf("expected %q to be too deep, got %v", document, linkStrings(links))
	}
	var parseError *ParseError
	if !errors.As(err, &parseError) || !errors.Is(err, ErrNestingTooDeep) {
		t.Fatalf("expected %q to be too deep, got %v", document, err)
	}
	return parseError
}

func accepted(document string, maxDepth int) bool {
	_, err := parserWithMaxDepth(maxDepth).Parse(document)
	return err == nil
}

func TestDefaultLimitIsSharedByEveryImplementation(t *testing.T) {
	if DefaultMaxDepth != 64 {
		t.Fatalf("DefaultMaxDepth = %d, want 64", DefaultMaxDepth)
	}
	if NewParser().MaxDepth != DefaultMaxDepth {
		t.Fatalf("NewParser().MaxDepth = %d, want %d", NewParser().MaxDepth, DefaultMaxDepth)
	}
}

func TestParenthesesUpToTheLimitAreAccepted(t *testing.T) {
	if !accepted(depthParens(3), 3) {
		t.Error("parentheses 3 deep should be accepted with a limit of 3")
	}
	if !accepted(depthValues(3), 3) {
		t.Error("values 3 deep should be accepted with a limit of 3")
	}
	if _, err := Parse(depthParens(DefaultMaxDepth)); err != nil {
		t.Errorf("parentheses at the default limit: %v", err)
	}
	if _, err := Parse(depthValues(DefaultMaxDepth)); err != nil {
		t.Errorf("values at the default limit: %v", err)
	}
}

func TestParenthesesPastTheLimitAreRefusedAtTheGroupThatIsTooDeep(t *testing.T) {
	err := tooDeep(t, depthParens(4), 3)

	if err.MaxDepth != 3 {
		t.Errorf("MaxDepth = %d, want 3", err.MaxDepth)
	}
	if err.Line != 1 || err.Column != 4 || err.Pos != 3 {
		t.Errorf("line %d, column %d, offset %d, want line 1, column 4, offset 3", err.Line, err.Column, err.Pos)
	}
	summary := "line 1, column 4: nesting depth exceeds the maximum of 3"
	snippet := "1 | ((((a))))\n  |    ^"
	if err.Summary() != summary {
		t.Errorf("Summary() = %q, want %q", err.Summary(), summary)
	}
	if err.Snippet() != snippet {
		t.Errorf("Snippet() = %q, want %q", err.Snippet(), snippet)
	}
	if want := "Nesting too deep at " + summary + "\n" + snippet; err.Error() != want {
		t.Errorf("Error() = %q, want %q", err.Error(), want)
	}
}

func TestGroupsInValuePositionCountLikeAnyOtherGroup(t *testing.T) {
	err := tooDeep(t, depthValues(4), 3)

	if err.Line != 1 || err.Column != 10 {
		t.Errorf("line %d, column %d, want line 1, column 10", err.Line, err.Column)
	}
}

func TestIndentationUpToTheLimitIsAccepted(t *testing.T) {
	if !accepted(depthIndentation(3), 3) {
		t.Error("indentation 3 deep should be accepted with a limit of 3")
	}
	if _, err := Parse(depthIndentation(DefaultMaxDepth)); err != nil {
		t.Errorf("indentation at the default limit: %v", err)
	}
}

func TestIndentationPastTheLimitIsRefusedAtTheLineThatIsTooDeep(t *testing.T) {
	err := tooDeep(t, depthIndentation(4), 3)

	if err.Line != 5 || err.Column != 5 {
		t.Errorf("line %d, column %d, want line 5, column 5", err.Line, err.Column)
	}
	if err.LineText != "    a" {
		t.Errorf("LineText = %q, want %q", err.LineText, "    a")
	}
}

func TestGroupsAndIndentationAddUp(t *testing.T) {
	// `(b)` on the line indented once is at level 2.
	if !accepted("a\n  (b)\n", 2) {
		t.Error("a group on a line indented once should be accepted with a limit of 2")
	}
	err := tooDeep(t, "a\n  (b)\n", 1)

	if err.Line != 2 || err.Column != 3 {
		t.Errorf("line %d, column %d, want line 2, column 3", err.Line, err.Column)
	}
}

func TestLimitOfOneAllowsOneGroup(t *testing.T) {
	if !accepted("(a)", 1) {
		t.Error("(a) should be accepted with a limit of 1")
	}
	for _, document := range []string{"((a))", "(a (b))", "a\n  (b)"} {
		if accepted(document, 1) {
			t.Errorf("%q should be refused with a limit of 1", document)
		}
	}
}

func TestIndentationBySingleSpacesNests(t *testing.T) {
	// A child indented by one space used to leave the parser looping forever,
	// and a line indented less than the first child closes the block, as in
	// the JavaScript and Rust parsers.
	for document, want := range map[string]string{
		"a\n b\n":         "(a) ((a) (b))",
		"a\n    b\n  c\n": "(a) ((a) (b)) (c)",
	} {
		links, err := Parse(document)
		if err != nil {
			t.Fatalf("%q: %v", document, err)
		}
		if got := strings.Join(linkStrings(links), " "); got != want {
			t.Errorf("%q = %s, want %s", document, got, want)
		}
	}
}

func TestTrailingSpacesOnADeepLineAreNotADeeperLine(t *testing.T) {
	if !accepted("a\n  b\n    c   \n", 2) {
		t.Error("trailing spaces should not count as a deeper line")
	}
}

func TestOtherErrorsAreNotNestingTooDeep(t *testing.T) {
	parser := NewParser()
	parser.MaxInputSize = 1
	_, err := parser.Parse("ab")
	if err == nil || errors.Is(err, ErrNestingTooDeep) {
		t.Fatalf("an oversized input is not nested too deep, got %v", err)
	}
}

func TestParserIsReusableAfterRefusingADocument(t *testing.T) {
	parser := parserWithMaxDepth(1)
	if _, err := parser.Parse("((a))"); !errors.Is(err, ErrNestingTooDeep) {
		t.Fatalf("expected the nesting to be too deep, got %v", err)
	}
	links, err := parser.Parse("(a)\nb\n  c")
	if err != nil {
		t.Fatal(err)
	}
	if got := linkStrings(links); strings.Join(got, " ") != "(a) (b) ((b) (c))" {
		t.Fatalf("links after a refusal = %v", got)
	}
}

func TestRefusesADocumentFarPastTheLimitWithoutExhaustingTheStack(t *testing.T) {
	// Before the limit existed each of these recursed once per level: an 8 MiB
	// stack was exhausted at about 12 000 parentheses, and the default 1 GB
	// one only after hours of quadratic work. A stack overflow is fatal in Go.
	defer debug.SetMaxStack(debug.SetMaxStack(2 << 20))

	for name, document := range map[string]string{
		"parentheses": depthParens(100_000),
		"values":      depthValues(100_000),
		"indentation": depthIndentation(2_000),
	} {
		_, err := Parse(document)
		var parseError *ParseError
		if !errors.As(err, &parseError) || !errors.Is(err, ErrNestingTooDeep) {
			t.Fatalf("%s: expected the nesting to be too deep, got %v", name, err)
		}
		if parseError.MaxDepth != DefaultMaxDepth {
			t.Errorf("%s: MaxDepth = %d, want %d", name, parseError.MaxDepth, DefaultMaxDepth)
		}
	}
}

func TestStreamParserReportsWhereTheNestingIsTooDeep(t *testing.T) {
	stream := NewStreamParserWithParser(parserWithMaxDepth(1))
	if _, err := stream.Write([]byte("a\nb ((c))\n")); err != nil {
		t.Fatal(err)
	}
	_, err := stream.Finish()

	var streamError *StreamParseError
	if !errors.As(err, &streamError) {
		t.Fatalf("expected a stream parse error, got %v", err)
	}
	if !errors.Is(err, ErrNestingTooDeep) {
		t.Fatalf("expected the nesting to be too deep, got %v", err)
	}
	if streamError.Line != 2 || streamError.Column != 4 || streamError.Offset != 5 {
		t.Errorf("line %d, column %d, offset %d, want line 2, column 4, offset 5",
			streamError.Line, streamError.Column, streamError.Offset)
	}
}
