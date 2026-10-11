package lino

import (
	"encoding/json"
	"os"
	"reflect"
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

func TestSharedTextParity(t *testing.T) {
	data, err := os.ReadFile("../parity/text-fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		ID       string       `json:"id"`
		Input    string       `json:"input"`
		Expected []parityNode `json:"expected"`
		Format   string       `json:"format"`
	}
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	if len(fixtures) == 0 {
		t.Fatal("empty fixture corpus")
	}
	for _, fixture := range fixtures {
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
