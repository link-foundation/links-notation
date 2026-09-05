package main

import (
	"fmt"
	"strings"

	lino "github.com/link-foundation/links-notation/go"
)

func main() {
	docs := []string{"# a b\n", "# a: b\n", "a: b # note\n", "a#b\n", "\"#\" a\n", "parent\n  # what the child is for\n  child\n"}
	for _, doc := range docs {
		links, err := lino.NewParser().Parse(doc)
		if err != nil {
			fmt.Printf("%q -> ERROR %v\n", doc, err)
			continue
		}
		shown := make([]string, 0, len(links))
		for _, link := range links {
			shown = append(shown, link.String())
		}
		fmt.Printf("%q -> PARSED [%s]\n", doc, strings.Join(shown, " "))
	}
}
