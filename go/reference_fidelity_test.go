package lino

import (
	"encoding/hex"
	"os"
	"strings"
	"testing"
)

func referenceFixtures(t *testing.T) []string {
	t.Helper()
	data, err := os.ReadFile("../docs/protocol/reference-literals.txt")
	if err != nil {
		t.Fatal(err)
	}
	var result []string
	for _, line := range strings.Split(strings.TrimSpace(string(data)), "\n") {
		if strings.HasPrefix(line, "#") {
			continue
		}
		if line == "-" {
			result = append(result, "")
			continue
		}
		value, err := hex.DecodeString(line)
		if err != nil {
			t.Fatal(err)
		}
		result = append(result, string(value))
	}
	return result
}

func TestNativeReferenceFidelity(t *testing.T) {
	for _, reference := range referenceFixtures(t) {
		nested := "nested"
		original := []*Link{NewLink(&reference, []*Link{NewRef(reference), NewLink(&nested, []*Link{NewRef(reference)})})}
		texts := []string{original[0].Format(false), original[0].Format(true), original[0].FormatWithConfig(&FormatConfig{IndentString: "  ", IndentByRefCount: 1})}
		for _, text := range texts {
			parsed, err := Parse(text)
			if err != nil {
				t.Fatal(err)
			}
			if *parsed[0].ID != reference || *parsed[0].Values[0].ID != reference || *parsed[0].Values[1].Values[0].ID != reference {
				t.Fatalf("reference %q changed", reference)
			}
		}
	}
}

func TestReferenceLiteralsAtEveryChunkSplit(t *testing.T) {
	for _, reference := range referenceFixtures(t) {
		encoded, err := EncodeReferenceLiteral(reference)
		if err != nil {
			t.Fatal(err)
		}
		decoded, err := DecodeReferenceLiteral(encoded)
		if err != nil || decoded != reference {
			t.Fatalf("literal changed %q: %v", reference, err)
		}
		for _, literal := range []string{escapeReference(reference), FormatBinaryReference(reference), encoded} {
			text := "(root: " + literal + ")\n(" + literal + ": fixture)"
			for split := 0; split <= len(text); split++ {
				stream := NewStreamParser()
				if _, err := stream.Feed(text[:split]); err != nil {
					t.Fatal(err)
				}
				if _, err := stream.Feed(text[split:]); err != nil {
					t.Fatal(err)
				}
				parsed, err := stream.Finish()
				if err != nil {
					t.Fatal(err)
				}
				if len(parsed) != 2 || len(parsed[0].Values) != 1 || *parsed[0].Values[0].ID != reference || parsed[1].ID == nil || *parsed[1].ID != reference {
					t.Fatalf("reference %q changed at split %d", reference, split)
				}
			}
		}
	}
}

func TestBinaryReferenceFidelity(t *testing.T) {
	codec := NewBinaryLinoCodec()
	for _, reference := range referenceFixtures(t) {
		original := []*Link{NewLink(&reference, []*Link{NewRef(reference)})}
		encoded, err := codec.Encode(original)
		if err != nil {
			t.Fatal(err)
		}
		decoded, err := codec.Decode(encoded)
		if err != nil {
			t.Fatal(err)
		}
		parsed, err := Parse(FormatBinaryDocument(decoded))
		if err != nil {
			t.Fatal(err)
		}
		if len(parsed) != 1 || parsed[0].ID == nil || *parsed[0].ID != reference || len(parsed[0].Values) != 1 || *parsed[0].Values[0].ID != reference {
			t.Fatalf("reference %q changed", reference)
		}
	}
}

func TestMalformedReferenceLiteralsAreRejected(t *testing.T) {
	data, err := os.ReadFile("../docs/protocol/invalid-reference-literals.txt")
	if err != nil {
		t.Fatal(err)
	}
	for _, literal := range strings.Split(strings.TrimSpace(string(data)), "\n") {
		if strings.HasPrefix(literal, "#") {
			continue
		}
		if _, err := DecodeReferenceLiteral(literal); err == nil {
			t.Fatalf("decoded invalid %q", literal)
		}
		if _, err := Parse(literal); err == nil {
			t.Fatalf("parsed invalid %q", literal)
		}
	}
	if decoded, err := DecodeReferenceLiteral("~1{C3A9}"); err != nil || decoded != "é" {
		t.Fatal(decoded, err)
	}
	if _, err := EncodeReferenceLiteral(string([]byte{0xff})); err == nil {
		t.Fatal("encoded invalid UTF-8")
	}
}
