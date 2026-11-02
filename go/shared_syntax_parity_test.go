package lino

import (
	"encoding/json"
	"os"
	"reflect"
	"strings"
	"testing"
)

// syntaxNode is a parsed link with how its ID was written, in the shape of
// parity/syntax-fixtures.json.
type syntaxNode struct {
	ID     *string      `json:"id"`
	Raw    *string      `json:"raw"`
	Quote  *string      `json:"quote"`
	Values []syntaxNode `json:"values"`
}

func syntaxTree(links []*Link) []syntaxNode {
	result := make([]syntaxNode, 0, len(links))
	for _, link := range links {
		var quote *string
		if q := link.Quote(); q != "" {
			quote = &q
		}
		result = append(result, syntaxNode{link.ID, link.RawID, quote, syntaxTree(link.Values)})
	}
	return result
}

type syntaxFixture struct {
	ID      string       `json:"id"`
	Feature string       `json:"feature"`
	Input   string       `json:"input"`
	Links   []syntaxNode `json:"links"`
	Cst     string       `json:"cst"`
}

func readSyntaxFixtures(t *testing.T) []syntaxFixture {
	t.Helper()
	data, err := os.ReadFile("../parity/syntax-fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []syntaxFixture
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	if len(fixtures) == 0 {
		t.Fatal("empty syntax fixture corpus")
	}
	return fixtures
}

func TestSharedSyntaxParity(t *testing.T) {
	for _, fixture := range readSyntaxFixtures(t) {
		t.Run(fixture.ID, func(t *testing.T) {
			parser := NewParser()
			parsed, err := parser.Parse(fixture.Input)
			if err != nil {
				t.Fatal(err)
			}
			if got := syntaxTree(parsed); !reflect.DeepEqual(got, fixture.Links) {
				gotJSON, _ := json.Marshal(got)
				wantJSON, _ := json.Marshal(fixture.Links)
				t.Fatalf("syntax tree differs:\n got %s\nwant %s", gotJSON, wantJSON)
			}
			cst, err := parser.ParseCst(fixture.Input)
			if err != nil {
				t.Fatal(err)
			}
			if got := cst.SExpression(); got != fixture.Cst {
				t.Fatalf("CST differs:\n got %s\nwant %s", got, fixture.Cst)
			}
			if got := cst.String(); got != fixture.Input {
				t.Fatalf("CST text: got %q, want %q", got, fixture.Input)
			}
			stream := NewStreamParser()
			for _, character := range fixture.Input {
				if _, err := stream.Feed(string(character)); err != nil {
					t.Fatal(err)
				}
			}
			streamed, err := stream.Finish()
			if err != nil {
				t.Fatal(err)
			}
			if got := syntaxTree(streamed); !reflect.DeepEqual(got, fixture.Links) {
				gotJSON, _ := json.Marshal(got)
				t.Fatalf("stream syntax tree differs: %s", gotJSON)
			}
		})
	}
}

func TestSharedInputsAreRecoveredFromTheirCst(t *testing.T) {
	data, err := os.ReadFile("../parity/text-fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		ID    string `json:"id"`
		Input string `json:"input"`
	}
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	if len(cases) == 0 {
		t.Fatal("empty text fixture corpus")
	}
	for _, fixture := range readSyntaxFixtures(t) {
		cases = append(cases, struct {
			ID    string `json:"id"`
			Input string `json:"input"`
		}{"syntax/" + fixture.ID, fixture.Input})
	}
	for _, c := range cases {
		t.Run(c.ID, func(t *testing.T) {
			cst, err := NewParser().ParseCst(c.Input)
			if err != nil {
				t.Fatal(err)
			}
			if got := cst.String(); got != c.Input {
				t.Fatalf("CST text: got %q, want %q", got, c.Input)
			}
			var joined strings.Builder
			for _, token := range cst.Tokens() {
				joined.WriteString(token.Text())
			}
			if joined.String() != c.Input {
				t.Fatalf("token text: got %q, want %q", joined.String(), c.Input)
			}
		})
	}
}
