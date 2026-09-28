// Times the Go parser on the nesting shapes from #314.
// Usage: go run . (from this directory)
package main

import (
	"fmt"
	"strings"
	"time"

	lino "github.com/link-foundation/links-notation/go"
)

func main() {
	shapes := []struct {
		name  string
		shape func(int) string
	}{
		{"closed", func(d int) string { return strings.Repeat("(", d) + "a" + strings.Repeat(")", d) }},
		{"value after", func(d int) string { return strings.Repeat("(", d) + "a" + strings.Repeat(") b", d) }},
		{"unclosed", func(d int) string { return strings.Repeat("(", d) + "a" }},
		{"indented", func(d int) string {
			lines := make([]string, d)
			for i := range lines {
				lines[i] = strings.Repeat(" ", i) + "(a"
			}
			return strings.Join(lines, "\n")
		}},
	}
	for _, s := range shapes {
		fmt.Printf("%-12s", s.name)
		for _, d := range []int{2, 4, 8, 12, 16, 20, 24, 64, 256, 1024} {
			start := time.Now()
			_, err := lino.Parse(s.shape(d))
			elapsed := time.Since(start)
			outcome := "ok"
			if err != nil {
				outcome = "err"
			}
			fmt.Printf(" %d: %.1f ms (%s),", d, float64(elapsed.Microseconds())/1000, outcome)
			if elapsed > 3*time.Second {
				break
			}
		}
		fmt.Println()
	}
}
