package lino

import (
	"iter"
	"slices"
	"strings"
	"testing"
)

const streamDocument = "first loves data\nprofile:\n  name Ada\n  note \"line one\nline two\"\n(nested:\n  child value)\nlast sees first"

func linkStrings(links []*Link) []string {
	result := make([]string, len(links))
	for index, link := range links {
		result[index] = link.String()
	}
	return result
}

func TestStreamParserMatchesParserOneByteAtATime(t *testing.T) {
	stream := NewStreamParser()
	for index := range len(streamDocument) {
		if _, err := stream.Feed(streamDocument[index : index+1]); err != nil {
			t.Fatal(err)
		}
	}
	actual, err := stream.Finish()
	if err != nil {
		t.Fatal(err)
	}
	expected, err := Parse(streamDocument)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(linkStrings(actual), linkStrings(expected)) {
		t.Fatalf("streamed links %v, want %v", linkStrings(actual), linkStrings(expected))
	}
}

func TestStreamParserEmitsCompletedRecord(t *testing.T) {
	stream := NewStreamParser()
	var seen []string
	stream.OnLink = func(link *Link) { seen = append(seen, link.String()) }

	if emitted, err := stream.Feed("first loves data\n"); err != nil || len(emitted) != 0 {
		t.Fatalf("Feed() = %v, %v", emitted, err)
	}
	emitted, err := stream.Feed("s")
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(linkStrings(emitted), []string{"(first loves data)"}) || !slices.Equal(seen, linkStrings(emitted)) {
		t.Fatalf("emitted %v, callback %v", linkStrings(emitted), seen)
	}
}

func TestStreamParserPreservesIndentedAndMultilineRecords(t *testing.T) {
	stream := NewStreamParser()
	var seen []*Link
	stream.OnLink = func(link *Link) { seen = append(seen, link) }

	if _, err := stream.Feed("profile:\n  name Ada\n  note \"first\nsecond\"\n"); err != nil {
		t.Fatal(err)
	}
	if len(seen) != 0 {
		t.Fatalf("emitted incomplete record: %v", linkStrings(seen))
	}
	if _, err := stream.Feed("next"); err != nil {
		t.Fatal(err)
	}
	if len(seen) != 1 {
		t.Fatalf("emitted %d links, want 1", len(seen))
	}
}

func TestStreamParserSupportsWriterDrainResetAndBoundedMemory(t *testing.T) {
	stream := NewStreamParser()
	stream.Collect = false
	stream.MaxBufferSize = 12
	for index := range 100 {
		if _, err := stream.Write([]byte("a\n")); err != nil {
			t.Fatal(err)
		}
		if index == 50 {
			stream.Reset()
			stream.Collect = false
			stream.MaxBufferSize = 12
		}
	}
	if len(stream.Drain()) != 0 {
		t.Fatal("Collect=false retained links")
	}
	if _, err := stream.Finish(); err != nil {
		t.Fatal(err)
	}

	tooLarge := NewStreamParser()
	tooLarge.MaxBufferSize = 4
	if _, err := tooLarge.Feed("12345"); err == nil {
		t.Fatal("oversized unresolved record was accepted")
	}
}

func TestStreamParserIterator(t *testing.T) {
	chunks := func(yield func(string) bool) {
		for _, chunk := range []string{"one link\n", "two link"} {
			if !yield(chunk) {
				return
			}
		}
	}
	var actual []string
	for link, err := range ParseChunks(iter.Seq[string](chunks), nil) {
		if err != nil {
			t.Fatal(err)
		}
		actual = append(actual, link.String())
	}
	if !slices.Equal(actual, []string{"(one link)", "(two link)"}) {
		t.Fatalf("ParseChunks() = %v", actual)
	}
}

func TestStreamParserPosition(t *testing.T) {
	stream := NewStreamParser()
	if _, err := stream.Feed("one\ntw"); err != nil {
		t.Fatal(err)
	}
	position := stream.Position()
	if position.Offset != 6 || position.Line != 2 || position.Column != 3 || position.Buffered != 2 {
		t.Fatalf("Position() = %+v", position)
	}
	if _, err := stream.Feed(strings.Repeat(" ", 20)); err != nil {
		t.Fatalf("default buffer rejected a short chunk: %v", err)
	}
}
