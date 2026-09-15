package main

import (
	"fmt"

	lino "github.com/link-foundation/links-notation/go"
)

func main() {
	docs := []string{"# ok line\n# break: two\nci_gate x\n", "a: b: c", "a (b\n", "a b)\n", ":"}
	for _, d := range docs {
		links, err := lino.NewParser().Parse(d)
		if err != nil {
			fmt.Printf("%q -> ERROR %v\n", d, err)
		} else {
			fmt.Printf("%q -> PARSED %v\n", d, links)
		}
	}
}
