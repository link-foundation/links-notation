// Prints the canonical rendering of every case in issue #288.
package main

import (
	"fmt"
	"strings"

	lino "github.com/link-foundation/links-notation/go"
)

func render(n *lino.Link) string {
	if len(n.Values) == 0 {
		id := ""
		if n.ID != nil {
			id = *n.ID
		}
		return "<" + id + ">"
	}
	head := ""
	if n.ID != nil {
		head = "<" + *n.ID + ">: "
	}
	parts := make([]string, 0, len(n.Values))
	for _, v := range n.Values {
		parts = append(parts, render(v))
	}
	return "(" + head + strings.Join(parts, " ") + ")"
}

func main() {
	cases := []string{
		`(a " " b)`, `(a "" b)`, `(a '' b)`, "(a `` b)",
		`(a "" "" b)`, `(a '' '' b)`, "(a `` `` b)",
		`(a ""x"" b)`, `(a """" b)`, `(x "" " "")`, `(x ' " ')`,
		`("" ("" 1))`, `("" ('' 1))`, `("x" ("" 1))`, `("" ("x" 1))`,
		`("" x ("" 1))`, `("" 1 ("" 1))`, `(o: ("" (o: ("" 1))))`,
		`(a " b)`, `(a """ b)`, `("")`, `("": 1)`, `(a ""  "" b)`, `("" "")`,
	}
	for _, c := range cases {
		links, err := lino.Parse(c)
		if err != nil {
			fmt.Printf("%-24s => Err(%v)\n", c, err)
			continue
		}
		parts := make([]string, 0, len(links))
		for _, l := range links {
			parts = append(parts, render(l))
		}
		fmt.Printf("%-24s => %s\n", c, strings.Join(parts, "\n"))
	}
}
