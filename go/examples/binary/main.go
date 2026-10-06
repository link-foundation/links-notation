// Compare bytes and canonical text with examples/binary in the other languages.
package main

import (
	"fmt"
	lino "github.com/link-foundation/links-notation/go"
	"os"
	"strings"
)

func main() {
	raw, err := os.ReadFile("../examples/binary/corpus.txt")
	check(err)
	corpus := strings.Split(strings.TrimSuffix(string(raw), "\n"), "\n")
	for _, source := range corpus {
		text := strings.ReplaceAll(source, `\n`, "\n")
		codec := lino.NewBinaryLinoCodec()
		document, err := codec.ParseDocument(text)
		check(err)
		for _, external := range []bool{false, true} {
			for _, arity := range []string{"2", "2..3", "1.."} {
				for _, packed := range []bool{false, true} {
					parsed, err := lino.ParseArityRange(arity)
					check(err)
					codec.Options = lino.BinaryLinoOptions{ExternalReferences: external, Arity: parsed, PackedWidths: packed}
					data, err := codec.Encode(document)
					check(err)
					decoded, err := codec.Decode(data)
					check(err)
					if len(document) != len(decoded) {
						panic("Document changed")
					}
					for i, node := range document {
						if !node.Equal(decoded[i]) {
							panic("Document changed")
						}
					}
					parts := make([]string, len(data))
					for i, b := range data {
						parts[i] = fmt.Sprintf("%02x", b)
					}
					fmt.Printf("%s\t%s\n", strings.Join(parts, " "), strings.ReplaceAll(lino.FormatBinaryDocument(decoded), "\n", `\n`))
				}
			}
		}
	}
}
func check(err error) {
	if err != nil {
		panic(err)
	}
}
