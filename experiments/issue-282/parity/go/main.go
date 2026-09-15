// Print what the Go implementation makes of the document.
package main

import (
	"fmt"
	"os"

	lino "github.com/link-foundation/links-notation/go"
)

func main() {
	document, err := os.ReadFile("../document.lino")
	if err != nil {
		panic(err)
	}
	links, err := lino.Parse(string(document))
	if err != nil {
		panic(err)
	}
	fmt.Println(lino.Format(links))
}
