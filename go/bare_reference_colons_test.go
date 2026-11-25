package lino

import "testing"

// Issue #444: colons inside a bare reference.
//
// A run of colons between two characters of a bare reference belongs to the
// reference, so times, URLs and qualified names need no quotes. A colon that is
// followed by whitespace, a parenthesis, a quote or a versioned literal still
// separates an ID from its values, and a bare reference never starts or ends
// with a colon.

// assertReadsAsWritten checks that document parses into the same links as
// expected.
func assertReadsAsWritten(t *testing.T, document, expected string) {
	t.Helper()
	if got, want := parsedTree(t, document), parsedTree(t, expected); got != want {
		t.Errorf("Parse(%q) = %s, want %s (as %q)", document, got, want, expected)
	}
}

func TestATimeIsOneReference(t *testing.T) {
	assertReadsAsWritten(t, "time 12:30\n", "time '12:30'\n")
	assertReadsAsWritten(t, "root:\n  time 12:30\n", "root:\n  time '12:30'\n")
}

func TestAURLIsOneReference(t *testing.T) {
	assertReadsAsWritten(t, "url https://example.com/a#b\n", "url 'https://example.com/a#b'\n")
}

func TestAQualifiedNameIsOneReference(t *testing.T) {
	assertReadsAsWritten(t, "type std::string\n", "type 'std::string'\n")
}

func TestAnIDMayHoldAColon(t *testing.T) {
	assertReadsAsWritten(t, "a:b: c\n", "'a:b': c\n")
	assertReadsAsWritten(t, "(a:b: c)", "('a:b': c)")
	assertReadsAsWritten(t, "a:b\n", "'a:b'\n")
}

func TestAColonBeforeAValueThatCannotContinueAReferenceSeparates(t *testing.T) {
	assertReadsAsWritten(t, "a: b\n", "(a: b)")
	assertReadsAsWritten(t, "a:\"b c\"\n", "(a: 'b c')")
	assertReadsAsWritten(t, "a:'b'\n", "(a: b)")
	assertReadsAsWritten(t, "a:(b c)\n", "(a: (b c))")
	assertReadsAsWritten(t, "a:~1{62}\n", "(a: b)")
	assertReadsAsWritten(t, "a :b\n", "(a: b)")
}

func TestAValueOfTheLinkMayHoldAColon(t *testing.T) {
	assertReadsAsWritten(t, "a: b:c\n", "(a: 'b:c')")
}

func TestAReferenceWithColonsIsWrittenWithQuotes(t *testing.T) {
	if got := formatted(t, "time 12:30\n"); got != "(time '12:30')" {
		t.Errorf("got %q", got)
	}
}

func TestTheCstReadsColonsInsideAReferenceAsPartOfIt(t *testing.T) {
	cst := mustParseCst(t, NewParser(), "time 12:30 a:b: c d:\"e\"\n")
	var references []string
	for _, token := range cst.Tokens() {
		if token.Kind == CstReference {
			references = append(references, *token.Value)
		}
	}
	want := []string{"time", "12:30", "a:b", "c", "d", "e"}
	if len(references) != len(want) {
		t.Fatalf("references %q, want %q", references, want)
	}
	for index := range want {
		if references[index] != want[index] {
			t.Fatalf("references %q, want %q", references, want)
		}
	}
}
