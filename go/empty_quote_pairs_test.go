package lino

import (
	"encoding/json"
	"testing"
)

// Issue #443: an empty quoted value at the end of a line must not swallow the
// lines after it.
//
// An even run of quotes ("", '', """", ...) followed by whitespace up to the
// end of its line is the empty reference, however later lines continue. A run
// followed directly by text (""x) still opens a reference that may reach
// across lines, so multiline references keep working.

// linkTree is a link as nested lists: its ID (nil when it has none) followed by
// the trees of its values.
func linkTree(link *Link) []any {
	tree := []any{link.ID}
	for _, value := range link.Values {
		tree = append(tree, linkTree(value))
	}
	return tree
}

// parsedTree is the tree of every link of a document, as JSON.
func parsedTree(t *testing.T, document string) string {
	t.Helper()
	links, err := Parse(document)
	if err != nil {
		t.Fatalf("Failed to parse %q: %v", document, err)
	}
	return linksTree(t, links)
}

// linksTree is the tree of every link given, as JSON.
func linksTree(t *testing.T, links []*Link) string {
	t.Helper()
	trees := []any{}
	for _, link := range links {
		trees = append(trees, linkTree(link))
	}
	encoded, err := json.Marshal(trees)
	if err != nil {
		t.Fatal(err)
	}
	return string(encoded)
}

func formatted(t *testing.T, document string) string {
	t.Helper()
	links, err := Parse(document)
	if err != nil {
		t.Fatalf("Failed to parse %q: %v", document, err)
	}
	return Format(links)
}

func TestEmptyValuesOnConsecutiveIndentedLinesStayOnTheirLines(t *testing.T) {
	expected := `[["root",[null,["a"],[""]],[null,["b"],[""]]]]`
	for _, document := range []string{
		"root:\n  a \"\"\n  b \"\"\n",
		"root:\n  a ''\n  b ''\n",
		"root:\n  a \"\"\n  b \"\"",
	} {
		if got := parsedTree(t, document); got != expected {
			t.Errorf("Parse(%q) = %s, want %s", document, got, expected)
		}
	}
}

func TestAnEmptyValueBeforeAQuotedValueKeepsBothValues(t *testing.T) {
	expected := `[["root",[null,["a"],[""]],[null,["b"],["x y"]]]]`
	if got := parsedTree(t, "root:\n  a \"\"\n  b \"x y\"\n"); got != expected {
		t.Errorf("got %s, want %s", got, expected)
	}
}

func TestAnEmptyValueAtTheEndOfATopLevelLineStaysOnItsLine(t *testing.T) {
	cases := map[string]string{
		"a \"\"\nb \"\"\n":  "(a ~1{})\n(b ~1{})",
		"a \"\" \nb \"\"\n": "(a ~1{})\n(b ~1{})",
		"a \"\"":            "(a ~1{})",
		// A longer even run at the end of a line is empty too.
		"a \"\"\"\"\nb \"\"\"\"\n": "(a ~1{})\n(b ~1{})",
	}
	for document, expected := range cases {
		if got := formatted(t, document); got != expected {
			t.Errorf("Format(Parse(%q)) = %q, want %q", document, got, expected)
		}
	}
}

func TestDoubledQuotesThatNothingClosesAreTheEmptyReference(t *testing.T) {
	cases := map[string]string{
		`(a: """")`:   `[["a",[""]]]`,
		`(a: """""")`: `[["a",[""]]]`,
		// A single quote character is written between the other quotes.
		`(a: '"')`:  `[["a",["\""]]]`,
		`(a: "'")`:  `[["a",["'"]]]`,
		"(a: `\"`)": `[["a",["\""]]]`,
		// An even run followed by text still opens a multiline reference.
		"a \"\"x\ny\"\"\n": `[[null,["a"],["x\ny"]]]`,
		// An even run still holds what the same line closes.
		`(x "" " "")`: `[[null,["x"],[" \" "]]]`,
		`a "" b ""`:   `[[null,["a"],[" b "]]]`,
	}
	for document, expected := range cases {
		if got := parsedTree(t, document); got != expected {
			t.Errorf("Parse(%q) = %s, want %s", document, got, expected)
		}
	}
}

func TestTheStreamEmitsALineThatEndsWithAnEmptyValueAtOnce(t *testing.T) {
	stream := NewStreamParser()
	var emitted []*Link
	for _, symbol := range "a \"\"\nb \"\"\nc\n" {
		links, err := stream.Feed(string(symbol))
		if err != nil {
			t.Fatal(err)
		}
		emitted = append(emitted, links...)
	}
	if got := Format(emitted); got != "(a ~1{})\n(b ~1{})" {
		t.Errorf("emitted %q", got)
	}
	rest, err := stream.Finish()
	if err != nil {
		t.Fatal(err)
	}
	if got := Format(rest); got != "(a ~1{})\n(b ~1{})\n(c)" {
		t.Errorf("finished with %q", got)
	}
}
