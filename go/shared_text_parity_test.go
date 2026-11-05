package lino

import (
	"encoding/json"
	"os"
	"reflect"
	"strings"
	"testing"
)

type parityNode struct {
	ID     *string      `json:"id"`
	Values []parityNode `json:"values"`
}

func parityTree(links []*Link) []parityNode {
	result := make([]parityNode, 0, len(links))
	for _, link := range links {
		result = append(result, parityNode{link.ID, parityTree(link.Values)})
	}
	return result
}

type parityFixture struct {
	ID              string       `json:"id"`
	Input           string       `json:"input"`
	Expected        []parityNode `json:"expected"`
	Format          string       `json:"format"`
	LessParentheses string       `json:"lessParentheses"`
}

func parityFixtures(t *testing.T) []parityFixture {
	t.Helper()
	data, err := os.ReadFile("../parity/text-fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []parityFixture
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	if len(fixtures) == 0 {
		t.Fatal("empty fixture corpus")
	}
	return fixtures
}

func TestSharedTextParity(t *testing.T) {
	for _, fixture := range parityFixtures(t) {
		t.Run(fixture.ID, func(t *testing.T) {
			parsed, err := Parse(fixture.Input)
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(parityTree(parsed), fixture.Expected) {
				t.Fatalf("parse tree differs: %#v", parityTree(parsed))
			}
			if got := Format(parsed); got != fixture.Format {
				t.Fatalf("format: got %q, want %q", got, fixture.Format)
			}
			reparsed, err := Parse(fixture.Format)
			if err != nil || !reflect.DeepEqual(parityTree(reparsed), fixture.Expected) {
				t.Fatalf("round trip differs: %v", err)
			}
			stream := NewStreamParser()
			for _, character := range fixture.Input {
				if _, err := stream.Feed(string(character)); err != nil {
					t.Fatal(err)
				}
			}
			streamed, err := stream.Finish()
			if err != nil || !reflect.DeepEqual(parityTree(streamed), fixture.Expected) {
				t.Fatalf("stream tree differs: %v", err)
			}
		})
	}
}

func TestSharedLessParenthesesRoundTrip(t *testing.T) {
	for _, fixture := range parityFixtures(t) {
		t.Run(fixture.ID, func(t *testing.T) {
			parsed, err := Parse(fixture.Input)
			if err != nil {
				t.Fatal(err)
			}
			texts := make([]string, 0, len(parsed))
			for _, link := range parsed {
				texts = append(texts, link.Format(true))
			}
			if got := strings.Join(texts, "\n"); got != fixture.LessParentheses {
				t.Fatalf("Format(true): got %q, want %q", got, fixture.LessParentheses)
			}
			config := &FormatConfig{LessParentheses: true}
			if got := FormatWithConfig(parsed, config); got != fixture.LessParentheses {
				t.Fatalf("FormatWithConfig: got %q, want %q", got, fixture.LessParentheses)
			}
			reparsed, err := Parse(fixture.LessParentheses)
			if err != nil || !reflect.DeepEqual(parityTree(reparsed), fixture.Expected) {
				t.Fatalf("round trip differs: %v", err)
			}
		})
	}
}

func TestSharedNestedFormat(t *testing.T) {
	data, err := os.ReadFile("../parity/nested-fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct{ ID, Input, Nested string }
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	if len(cases) == 0 {
		t.Fatal("empty nested corpus")
	}
	for _, fixture := range cases {
		links, err := Parse(fixture.Input)
		if err != nil {
			t.Fatal(err)
		}
		if got := FormatNested(links); got != fixture.Nested {
			t.Errorf("%s: got %q, want %q", fixture.ID, got, fixture.Nested)
		}
	}
}

func TestAnonymousThresholdRoundTrip(t *testing.T) {
	for _, input := range []string{"a b c", "((b c))", "(a (b c))"} {
		links, err := Parse(input)
		if err != nil {
			t.Fatal(err)
		}
		for _, config := range []*FormatConfig{
			{LessParentheses: true, IndentString: "  ", IndentByRefCount: 1},
			{LessParentheses: true, IndentString: "  ", IndentByLength: 1},
		} {
			parsed, err := Parse(FormatWithConfig(links, config))
			if err != nil || !reflect.DeepEqual(parityTree(parsed), parityTree(links)) {
				t.Fatalf("%s: anonymous round trip: %v", input, err)
			}
		}
	}
}
