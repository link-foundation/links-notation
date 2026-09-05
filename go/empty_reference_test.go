package lino

import (
	"strings"
	"testing"
)

// Conformance tests for the empty reference.
//
// https://github.com/link-foundation/links-notation/issues/288
//
// A bare delimiter pair is the empty reference. The three delimiters `"`, `'`
// and `` ` `` behave identically, and every longer n-quote run keeps the
// meaning it already had. The table below is shared with the Rust, JavaScript,
// Python, C#, Java and PHP suites, so a document written by one implementation
// reads the same in all of them.

// renderNode renders a parsed node unambiguously: every reference is wrapped in
// angle brackets so an empty one is visible as <>.
func renderNode(node *Link) string {
	if len(node.Values) == 0 {
		id := ""
		if node.ID != nil {
			id = *node.ID
		}
		return "<" + id + ">"
	}
	head := ""
	if node.ID != nil {
		head = "<" + *node.ID + ">: "
	}
	parts := make([]string, 0, len(node.Values))
	for _, value := range node.Values {
		parts = append(parts, renderNode(value))
	}
	return "(" + head + strings.Join(parts, " ") + ")"
}

func assertParsesAs(t *testing.T, source, expected string) {
	t.Helper()
	links, err := Parse(source)
	if err != nil {
		t.Fatalf("Failed to parse %q: %v", source, err)
	}
	parts := make([]string, 0, len(links))
	for _, link := range links {
		parts = append(parts, renderNode(link))
	}
	if rendered := strings.Join(parts, "\n"); rendered != expected {
		t.Errorf("Parsing %q:\nexpected %q\ngot      %q", source, expected, rendered)
	}
}

func TestBareDelimiterPairIsTheEmptyReference(t *testing.T) {
	assertParsesAs(t, `(a "" b)`, "(<a> <> <b>)")
}

func TestEveryDelimiterStyleYieldsTheSameEmptyReference(t *testing.T) {
	assertParsesAs(t, `(a "" b)`, "(<a> <> <b>)")
	assertParsesAs(t, `(a '' b)`, "(<a> <> <b>)")
	assertParsesAs(t, "(a `` b)", "(<a> <> <b>)")
}

func TestAdjacentEmptyReferencesStaySeparate(t *testing.T) {
	assertParsesAs(t, `(a "" "" b)`, "(<a> <> <> <b>)")
	assertParsesAs(t, `(a '' '' b)`, "(<a> <> <> <b>)")
	assertParsesAs(t, "(a `` `` b)", "(<a> <> <> <b>)")
	assertParsesAs(t, `(a ""  "" b)`, "(<a> <> <> <b>)")
}

func TestNestedEmptyReferencesParse(t *testing.T) {
	assertParsesAs(t, `("" ("" 1))`, "(<> (<> <1>))")
	assertParsesAs(t, `("" ('' 1))`, "(<> (<> <1>))")
	assertParsesAs(t, `("x" ("" 1))`, "(<x> (<> <1>))")
	assertParsesAs(t, `("" ("x" 1))`, "(<> (<x> <1>))")
	assertParsesAs(t, `("" x ("" 1))`, "(<> <x> (<> <1>))")
	assertParsesAs(t, `("" 1 ("" 1))`, "(<> <1> (<> <1>))")
}

func TestEmptyReferenceIsValidAsAnID(t *testing.T) {
	assertParsesAs(t, `("": 1)`, "(<>: <1>)")
	assertParsesAs(t, `(o: ("" (o: ("" 1))))`, "(<o>: (<> (<o>: (<> <1>))))")
}

func TestNQuoteDelimitedBodiesAreUnchanged(t *testing.T) {
	// A run that encloses a substantive body keeps its n-quote meaning.
	assertParsesAs(t, `(a ""x"" b)`, "(<a> <x> <b>)")
	assertParsesAs(t, `(x "" " "")`, `(<x> < " >)`)
	assertParsesAs(t, `(x ' " ')`, `(<x> < " >)`)
	// An n-quote-delimited empty is still empty.
	assertParsesAs(t, `(a """" b)`, "(<a> <> <b>)")
}

func TestASingleSpaceStillReadsAsASpace(t *testing.T) {
	assertParsesAs(t, `(a " " b)`, "(<a> < > <b>)")
}

func TestEmptyReferenceSurvivesARoundTrip(t *testing.T) {
	sources := []string{
		`(a "" b)`,
		`(a "" "" b)`,
		`("" ("" 1))`,
		`("": 1)`,
		`(o: ("" (o: ("" 1))))`,
	}
	for _, source := range sources {
		links, err := Parse(source)
		if err != nil {
			t.Fatalf("Failed to parse %q: %v", source, err)
		}
		formatted := Format(links)
		reparsed, err := Parse(formatted)
		if err != nil {
			t.Fatalf("Formatted %q did not parse: %v", formatted, err)
		}
		if Format(reparsed) != formatted {
			t.Errorf("Round trip changed %q: %q became %q", source, formatted, Format(reparsed))
		}
	}
}

func TestEmptyReferenceIsWrittenAsADelimiterPair(t *testing.T) {
	links, err := Parse(`(a "" b)`)
	if err != nil {
		t.Fatalf("Failed to parse: %v", err)
	}
	if formatted := Format(links); formatted != `(a "" b)` {
		t.Errorf("expected %q, got %q", `(a "" b)`, formatted)
	}
}
