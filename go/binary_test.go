package lino

import (
	"bytes"
	"encoding/hex"
	"os"
	"reflect"
	"strings"
	"testing"
)

func TestBinaryStringBudgetStopsBeforeLaterScalars(t *testing.T) {
	data, err := hex.DecodeString("13024605011001030000009fffffff9effffff0028ffff06")
	if err != nil {
		t.Fatal(err)
	}
	codec := NewBinaryLinoCodec()
	codec.Limits.MaxStringBytes = 1
	_, err = codec.Decode(data)
	if err == nil || !strings.Contains(err.Error(), "string budget exceeded") {
		t.Fatalf("expected early string limit, got %v", err)
	}
}

func TestBinarySharedVectors(t *testing.T) {
	data, err := os.ReadFile("../docs/protocol/binary-links-notation-vectors.txt")
	if err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, line := range strings.Split(string(data), "\n") {
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		f := strings.Split(line, "\t")
		want, err := hex.DecodeString(strings.ReplaceAll(f[len(f)-1], " ", ""))
		if err != nil {
			t.Fatal(err)
		}
		if f[0] == "document" {
			arity, err := ParseArityRange(f[3])
			if err != nil {
				t.Fatal(err)
			}
			codec := NewBinaryLinoCodec()
			codec.Options = BinaryLinoOptions{f[2] == "external", arity, f[4] == "packed"}
			model, err := codec.ParseDocument(strings.ReplaceAll(f[1], `\n`, "\n"))
			if err != nil {
				t.Fatal(err)
			}
			got, err := codec.Encode(model)
			if err != nil {
				t.Fatal(line, err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("%s: %x != %x", line, got, want)
			}
			decoded, err := codec.Decode(want)
			if err != nil {
				t.Fatal(err)
			}
			if !binaryModelsEqual(model, decoded) {
				t.Fatal(line, "model changed")
			}
		} else {
			links, err := ParsePacketLinks(f[1])
			if err != nil {
				t.Fatal(err)
			}
			packet, err := PackLinks(f[2] == "external", links, f[3] == "packed")
			if err != nil {
				t.Fatal(err)
			}
			got, err := packet.ToBytes()
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("%s: %x != %x", line, got, want)
			}
			decoded, err := PacketFromBytes(want, DefaultDecodeLimits())
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(decoded.Links(), links) {
				t.Fatal(line, "links changed")
			}
		}
		count++
	}
	if count != 96 {
		t.Fatal(count)
	}
}
func binaryModelsEqual(a, b []*Link) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if !a[i].Equal(b[i]) {
			return false
		}
	}
	return true
}
func TestBinaryNativeModels(t *testing.T) {
	for _, source := range []string{"", "()", `""`, "a", "(a)", "((a))", "(a b c)", `("": () "" (b))`, "a:\n  b\n  c", `"#x" "λ😀" "007" "18446744073709551615"`, "# comment\n(a # tail\n b)"} {
		model, err := Parse(source)
		if err != nil {
			t.Fatal(err)
		}
		for _, external := range []bool{false, true} {
			for _, arityText := range []string{"2", "2..3", "1.."} {
				for _, packed := range []bool{false, true} {
					arity, _ := ParseArityRange(arityText)
					codec := NewBinaryLinoCodec()
					codec.Options = BinaryLinoOptions{external, arity, packed}
					data, err := codec.Encode(model)
					if err != nil {
						t.Fatal(source, err)
					}
					got, err := codec.Decode(data)
					if err != nil {
						t.Fatal(err)
					}
					if !binaryModelsEqual(model, got) {
						t.Fatal(source, "model changed")
					}
				}
			}
		}
	}
}
func TestBinaryLimitsAndMalformed(t *testing.T) {
	model := []*Link{NewValuesLink([]*Link{NewRef("abcdef")})}
	codec := NewBinaryLinoCodec()
	data, err := codec.Encode(model)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 5; i++ {
		limits := DefaultDecodeLimits()
		switch i {
		case 0:
			limits.MaxNodes = 1
		case 1:
			limits.MaxStringBytes = 2
		case 2:
			limits.MaxDepth = 1
		case 3:
			limits.MaxLinks = 1
		case 4:
			limits.MaxReferences = 1
		}
		codec.Limits = limits
		if _, err := codec.Decode(data); err == nil {
			t.Fatal("decode ignored limits", i)
		}
		if _, err := codec.Encode(model); err == nil {
			t.Fatal("encode ignored limits", i)
		}
	}
	codec = NewBinaryLinoCodec()
	for _, text := range []string{"", "20", "1e00", "1001", "100000", "10ffffffffffffffffffff"} {
		data, _ := hex.DecodeString(text)
		if _, err := codec.Decode(data); err == nil {
			t.Fatal("accepted malformed", text)
		}
	}
}

func TestBinaryStreamsUint64TruncationAndDepth(t *testing.T) {
	for _, external := range []bool{false, true} {
		references := "0 18446744073709551615"
		if external {
			references = "#0 #9223372036854775807"
		}
		links, err := ParsePacketLinks("6:" + references)
		if err != nil {
			t.Fatal(err)
		}
		packet, err := PackLinks(external, links, true)
		if err != nil {
			t.Fatal(err)
		}
		data, err := packet.ToBytes()
		if err != nil {
			t.Fatal(err)
		}
		stream := bytes.NewReader(append(append([]byte{}, data...), data...))
		for i := 0; i < 2; i++ {
			got, err := ReadPacket(stream, DefaultDecodeLimits())
			if err != nil || !reflect.DeepEqual(got.Links(), links) {
				t.Fatal(err, got)
			}
			if stream.Len() != (1-i)*len(data) {
				t.Fatal("Read next packet bytes")
			}
		}
		eof, err := ReadPacket(stream, DefaultDecodeLimits())
		if err != nil || eof != nil {
			t.Fatal(eof, err)
		}
		for end := 0; end < len(data); end++ {
			if _, err := PacketFromBytes(data[:end], DefaultDecodeLimits()); err == nil {
				t.Fatal("Accepted truncated prefix", end)
			}
		}
	}
	leaf := "leaf"
	document := []*Link{{ID: &leaf}}
	for i := 0; i < 70; i++ {
		document = []*Link{&Link{Values: document}}
	}
	codec := NewBinaryLinoCodec()
	if _, err := codec.Encode(document); err == nil {
		t.Fatal("Ignored depth")
	}
	codec.Limits.MaxDepth = 80
	data, err := codec.Encode(document)
	if err != nil {
		t.Fatal(err)
	}
	got, err := codec.Decode(data)
	if err != nil || !binaryModelsEqual(got, document) {
		t.Fatal(err)
	}
}
