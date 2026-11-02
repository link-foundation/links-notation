package lino

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"
)

func rawOf(link *Link) any {
	if link.RawID == nil {
		return nil
	}
	return *link.RawID
}

func mustParse(t *testing.T, parser *Parser, input string) []*Link {
	t.Helper()
	links, err := parser.Parse(input)
	if err != nil {
		t.Fatal(err)
	}
	return links
}

func TestSyntaxMetadataKeepsHowEqualReferencesWereWritten(t *testing.T) {
	link := mustParse(t, NewParser(), "(t 1 '1')")[0]
	bare, quoted := link.Values[1], link.Values[2]
	if *bare.ID != "1" || *quoted.ID != "1" {
		t.Fatalf("IDs: %q, %q", *bare.ID, *quoted.ID)
	}
	if rawOf(bare) != "1" || rawOf(quoted) != "'1'" {
		t.Fatalf("raw IDs: %v, %v", rawOf(bare), rawOf(quoted))
	}
	if bare.Quote() != "" || quoted.Quote() != "'" {
		t.Fatalf("quotes: %q, %q", bare.Quote(), quoted.Quote())
	}
	if !bare.Equal(quoted) {
		t.Fatal("1 and '1' must be equal references")
	}
	if got := link.String(); got != "(t 1 1)" {
		t.Fatalf("format: %q", got)
	}
}

func TestSyntaxMetadataRecordsEveryQuoteKindAndRunLength(t *testing.T) {
	link := mustParse(t, NewParser(), "(\"a\": 'b' `c` \"\"d\"\" ~1{65} f)")[0]
	if rawOf(link) != `"a"` || link.Quote() != `"` {
		t.Fatalf("link: %v %q", rawOf(link), link.Quote())
	}
	var got [][2]any
	for _, value := range link.Values {
		got = append(got, [2]any{rawOf(value), value.Quote()})
	}
	want := [][2]any{
		{"'b'", "'"},
		{"`c`", "`"},
		{`""d""`, `"`},
		{"~1{65}", ""},
		{"f", ""},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func TestSyntaxMetadataSlicesTheSourceNotTheCommentStrippedCopy(t *testing.T) {
	link := mustParse(t, NewParser(), "(a 'b # c') # d")[0]
	if got := rawOf(link.Values[1]); got != "'b # c'" {
		t.Fatalf("raw: %v", got)
	}
	// A multi-line quoted reference keeps its line break, after a comment.
	link = mustParse(t, NewParser(), "# head\n(note: \"one\ntwo\")")[0]
	if got := rawOf(link.Values[0]); got != "\"one\ntwo\"" {
		t.Fatalf("raw: %q", got)
	}
}

func TestSyntaxMetadataIsAbsentWithoutAWrittenID(t *testing.T) {
	link := mustParse(t, NewParser(), "(a b)")[0]
	if link.RawID != nil || link.Quote() != "" {
		t.Fatalf("anonymous link: %v %q", rawOf(link), link.Quote())
	}
	built := NewRef("x")
	if built.RawID != nil || built.Quote() != "" {
		t.Fatalf("built link: %v %q", rawOf(built), built.Quote())
	}
}

func TestSyntaxMetadataDoesNotChangeEqualityOrFormatting(t *testing.T) {
	quoted := mustParse(t, NewParser(), "('a': 'b')")
	bare := mustParse(t, NewParser(), "(a: b)")
	if !quoted[0].Equal(bare[0]) {
		t.Fatal("quoted and bare links must be equal")
	}
	if Format(quoted) != Format(bare) || quoted[0].String() != bare[0].String() {
		t.Fatalf("formats differ: %q, %q", Format(quoted), Format(bare))
	}
	config := DefaultFormatConfig()
	if FormatWithConfig(quoted, config) != FormatWithConfig(bare, config) {
		t.Fatal("configured formats differ")
	}
	quotedJSON, _ := json.Marshal(parityTree(quoted))
	bareJSON, _ := json.Marshal(parityTree(bare))
	if string(quotedJSON) != string(bareJSON) {
		t.Fatalf("trees differ: %s, %s", quotedJSON, bareJSON)
	}
}

func TestSyntaxMetadataIsDroppedInASTMode(t *testing.T) {
	parser := NewParser()
	parser.Syntax = false
	link := mustParse(t, parser, "('a': 'b')")[0]
	if link.RawID != nil || link.Values[0].RawID != nil || link.Values[0].Quote() != "" {
		t.Fatalf("AST mode kept metadata: %v %v", rawOf(link), rawOf(link.Values[0]))
	}
	if !link.Equal(mustParse(t, NewParser(), "('a': 'b')")[0]) {
		t.Fatal("AST mode must read the same links")
	}
	if !NewParser().Syntax {
		t.Fatal("NewParser must record syntax metadata by default")
	}
}

func TestSyntaxMetadataIsKeptByIndentationAndTheStreamParser(t *testing.T) {
	links := mustParse(t, NewParser(), "'root':\n  \"child\"")
	if rawOf(links[0]) != "'root'" || rawOf(links[0].Values[0]) != `"child"` {
		t.Fatalf("indented: %v %v", rawOf(links[0]), rawOf(links[0].Values[0]))
	}

	stream := NewStreamParser()
	if _, err := stream.Feed("(a '"); err != nil {
		t.Fatal(err)
	}
	if _, err := stream.Feed("b')"); err != nil {
		t.Fatal(err)
	}
	streamed, err := stream.Finish()
	if err != nil {
		t.Fatal(err)
	}
	value := streamed[0].Values[1]
	if rawOf(value) != "'b'" || value.Quote() != "'" {
		t.Fatalf("stream: %v %q", rawOf(value), value.Quote())
	}

	ast := NewParser()
	ast.Syntax = false
	stream = NewStreamParserWithParser(ast)
	streamed, err = stream.Finish("(a 'b')")
	if err != nil {
		t.Fatal(err)
	}
	if streamed[0].Values[1].RawID != nil {
		t.Fatal("a stream over an AST-mode parser must drop the metadata")
	}
}

func TestSyntaxMetadataOnLinksBuiltInCode(t *testing.T) {
	link := NewRef("a")
	raw := `"a"`
	link.RawID = &raw
	if link.Quote() != `"` {
		t.Fatalf("quote: %q", link.Quote())
	}
	if !link.Equal(NewRef("a")) || link.String() != NewRef("a").String() {
		t.Fatal("RawID must not affect equality or formatting")
	}
	link.RawID = nil
	if link.Quote() != "" {
		t.Fatalf("quote: %q", link.Quote())
	}
}

func TestReferenceQuote(t *testing.T) {
	cases := map[string]string{
		"'1'":       "'",
		`""a b""`:   `"`,
		"`x`":       "`",
		"''":        "'",
		"1":         "",
		"~1{31}":    "",
		"'unclosed": "",
		"'a' b":     "",
		"":          "",
	}
	for raw, want := range cases {
		if got := ReferenceQuote(raw); got != want {
			t.Errorf("ReferenceQuote(%q) = %q, want %q", raw, got, want)
		}
	}
}

// Every raw ID read from the shared text corpus reads back as its ID: it is
// exactly one reference, written as the document wrote it.
func TestRawIDsOfTheSharedCorpusReadBackAsTheirIDs(t *testing.T) {
	data, err := os.ReadFile("../parity/text-fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		ID    string `json:"id"`
		Input string `json:"input"`
	}
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	var check func(t *testing.T, links []*Link)
	check = func(t *testing.T, links []*Link) {
		for _, link := range links {
			if link.RawID != nil {
				if link.ID == nil {
					t.Fatalf("raw ID %q without an ID", *link.RawID)
				}
				raw := *link.RawID
				var value string
				if literalPrefix.MatchString(raw) {
					value, err = DecodeReferenceLiteral(raw)
					if err != nil {
						t.Fatal(err)
					}
				} else if quote := ReferenceQuote(raw); quote != "" {
					value, _, _ = parseQuotedStringAt(raw, 0)
				} else {
					value = raw
				}
				if value != *link.ID {
					t.Fatalf("raw ID %q reads as %q, want %q", raw, value, *link.ID)
				}
			}
			check(t, link.Values)
		}
	}
	for _, fixture := range fixtures {
		t.Run(fixture.ID, func(t *testing.T) {
			check(t, mustParse(t, NewParser(), fixture.Input))
		})
	}
}

func TestQuoteInsideABareReferenceDoesNotSpanSpaces(t *testing.T) {
	cases := map[string]string{
		"('x y)":      `("'x" y)`,
		"a\"b c\" d":  `('a"b' 'c"' d)`,
		"(x 'y) z":    `((x "'y") z)`,
		"(a 'b c' d)": "(a 'b c' d)",
	}
	for input, want := range cases {
		links := mustParse(t, NewParser(), input)
		if got := Format(links); got != want {
			t.Errorf("Format(Parse(%q)) = %q, want %q", input, got, want)
		}
	}
}
