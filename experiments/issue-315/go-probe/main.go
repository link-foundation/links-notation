// Probe for issue #315: how the Go parser copes with deeply nested documents.
//
//	go run . <parens|values|indent> <depth> [maxDepth [maxStackBytes]]
//
// Before the fix a deep enough document ends the process with
// "goroutine stack exceeds 1000000000-byte limit", which no caller can
// recover from. After the fix it is refused with a *lino.ParseError.
package main

import (
	"errors"
	"fmt"
	"os"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	lino "github.com/link-foundation/links-notation/go"
)

func document(shape string, depth int) string {
	switch shape {
	case "parens":
		return strings.Repeat("(", depth) + "a" + strings.Repeat(")", depth)
	case "values":
		return strings.Repeat("(a ", depth) + "b" + strings.Repeat(")", depth)
	case "indent":
		var b strings.Builder
		for level := 0; level <= depth; level++ {
			b.WriteString(strings.Repeat(" ", level) + "a\n")
		}
		return b.String()
	}
	panic("unknown shape " + shape)
}

func main() {
	shape := os.Args[1]
	depth, _ := strconv.Atoi(os.Args[2])
	parser := lino.NewParser()
	if len(os.Args) > 3 && os.Args[3] != "-" {
		parser.MaxDepth, _ = strconv.Atoi(os.Args[3])
	}
	if len(os.Args) > 4 {
		// A smaller stack than the default 1 GB reaches the overflow at a
		// depth that does not take hours of quadratic work to get to.
		maxStack, _ := strconv.Atoi(os.Args[4])
		debug.SetMaxStack(maxStack)
	}
	parser.MaxInputSize = 1 << 30
	started := time.Now()
	links, err := parser.Parse(document(shape, depth))
	elapsed := time.Since(started).Round(time.Millisecond)
	var parseError *lino.ParseError
	switch {
	case errors.As(err, &parseError):
		fmt.Printf("%s %d: refused (max %d) in %v\n%v\n", shape, depth, parseError.MaxDepth, elapsed, err)
	case err != nil:
		fmt.Printf("%s %d: error in %v: %v\n", shape, depth, elapsed, err)
	default:
		fmt.Printf("%s %d: parsed %d links in %v\n", shape, depth, len(links), elapsed)
	}
}
