package lino

import (
	"encoding/json"
	"math/rand/v2"
	"strings"
	"testing"
)

// Quoting a reference, and reading every quoted reference back (issues #443
// and #444).
//
// QuoteReference writes one reference so a parser reads it back as exactly
// that text; NeedsQuoting says whether the text can be written bare. The round
// trip below writes tricky and seeded random text and reads it back in the ID
// and the value position of parenthesized, single-line and indented links.

func TestQuoteReferenceWritesTextThatNeedsNoDelimitersAsItIs(t *testing.T) {
	for _, text := range []string{"plain", "issue#1047", "a-b_c.d", "π", "~1"} {
		if got := QuoteReference(text); got != text {
			t.Errorf("QuoteReference(%q) = %q", text, got)
		}
		if NeedsQuoting(text) {
			t.Errorf("NeedsQuoting(%q) = true", text)
		}
	}
}

func TestQuoteReferenceQuotesTextAParserWouldReadDifferently(t *testing.T) {
	cases := map[string]string{
		"has space": "'has space'",
		"12:30":     "'12:30'",
		"#release":  "'#release'",
		"(a)":       "'(a)'",
		`"`:         `'"'`,
		"'":         `"'"`,
		"":          "~1{}",
		"a\nb":      "~1{610a62}",
	}
	for text, expected := range cases {
		if got := QuoteReference(text); got != expected {
			t.Errorf("QuoteReference(%q) = %q, want %q", text, got, expected)
		}
		if !NeedsQuoting(text) {
			t.Errorf("NeedsQuoting(%q) = false", text)
		}
	}
}

func TestQuoteReferenceIsTheReferenceFormatter(t *testing.T) {
	for _, text := range []string{"a b", "a", "it's", "", "#x", "x:y"} {
		if got, want := QuoteReference(text), escapeReference(text); got != want {
			t.Errorf("QuoteReference(%q) = %q, want %q", text, got, want)
		}
		if got, want := QuoteReference(text), FormatBinaryReference(text); got != want {
			t.Errorf("QuoteReference(%q) = %q, FormatBinaryReference gives %q", text, got, want)
		}
	}
}

// trickyReferences are texts that broke a parser or a formatter before, or
// came close.
var trickyReferences = []string{
	"", " ", `"`, "'", "`", `""`, "''", `""""`, `"'`, `'"`, "#", "#x", "a #b",
	":", "a:", ":a", "12:30", "a: b", "(", ")", "~1{}", "~1{61}", "a\nb",
	`"" `, ` ""`, "\"\n", "it's", `say "hi"`,
}

// referenceAlphabet is what the random texts are built from: the characters
// that matter to the grammar, and a few that do not.
var referenceAlphabet = []string{
	"a", "b", "1", " ", " ", "\t", "\n", "\r", `"`, `"`, "'", "'", "`", "#",
	":", "(", ")", "~", "{", "}", "é", "😀",
}

// randomReferences is count texts of up to 8 characters from a generator
// seeded with seed, so the same texts are tried on every run.
func randomReferences(count int, seed uint64) []string {
	random := rand.New(rand.NewPCG(seed, seed))
	texts := make([]string, count)
	for index := range texts {
		var text strings.Builder
		for range random.IntN(9) {
			text.WriteString(referenceAlphabet[random.IntN(len(referenceAlphabet))])
		}
		texts[index] = text.String()
	}
	return texts
}

func TestEveryQuotedReferenceReadsBackInEveryPosition(t *testing.T) {
	encode := func(tree any) string {
		encoded, err := json.Marshal(tree)
		if err != nil {
			t.Fatal(err)
		}
		return string(encoded)
	}
	for _, text := range append(append([]string{}, trickyReferences...), randomReferences(500, 443444)...) {
		written := QuoteReference(text)
		link := encode([]any{[]any{text, []any{text}, []any{"x"}}})
		documents := map[string]string{
			"(" + written + ": " + written + " x)":              link,
			written + ": " + written + " x":                     link,
			written + ": " + written + " x\n":                   link,
			written + ":\n  " + written + "\n  x\n":             link,
			"(a (" + written + " " + written + ") b)":           encode([]any{[]any{nil, []any{"a"}, []any{nil, []any{text}, []any{text}}, []any{"b"}}}),
			"root:\n  a " + written + "\n  b " + written + "\n": encode([]any{[]any{"root", []any{nil, []any{"a"}, []any{text}}, []any{nil, []any{"b"}, []any{text}}}}),
		}
		for document, expected := range documents {
			if got := parsedTree(t, document); got != expected {
				t.Errorf("text %q written %q: Parse(%q) = %s, want %s", text, written, document, got, expected)
			}
		}
	}
}
