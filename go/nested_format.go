package lino

import "strings"

func nestedAtom(link *Link) bool { return link.ID != nil && len(link.Values) == 0 }
func nestedCanNest(link *Link) bool {
	return !nestedAtom(link) && !(link.ID == nil && len(link.Values) == 1 && !nestedAtom(link.Values[0]))
}
func nestedLineHolds(link *Link, count int) bool {
	return link.ID != nil || count >= 2 || (count == 1 && nestedAtom(link.Values[0]))
}
func nestedLines(link *Link, pad, indent string, underName bool) []string {
	if !nestedLineHolds(link, len(link.Values)) || (underName && link.ID == nil && len(link.Values) == 1) {
		return []string{pad + link.Format(false)}
	}
	count := len(link.Values)
	for count > 0 && nestedCanNest(link.Values[count-1]) {
		count--
	}
	for count < len(link.Values) && !nestedLineHolds(link, count) {
		count++
	}
	parts := []string{}
	if link.ID != nil {
		parts = append(parts, escapeReference(*link.ID)+":")
	}
	for _, value := range link.Values[:count] {
		if nestedAtom(value) {
			parts = append(parts, escapeReference(*value.ID))
		} else {
			parts = append(parts, value.Format(false))
		}
	}
	lines := []string{pad + strings.Join(parts, " ")}
	for _, value := range link.Values[count:] {
		lines = append(lines, nestedLines(value, pad+indent, indent, underName || (link.ID != nil && count == 0))...)
	}
	return lines
}

// FormatNested writes recursively nested lines with two spaces per level and no
// final newline. Read by folding groups; Go's Parse keeps its path semantics.
func FormatNested(links []*Link) string { return FormatNestedWithIndent(links, "  ") }

// FormatNestedWithIndent writes nested lines using nonempty spaces.
// An invalid indentation string panics, as it cannot produce a nested document.
func FormatNestedWithIndent(links []*Link, indent string) string {
	if indent == "" || strings.Trim(indent, " ") != "" {
		panic("indent must contain only spaces and be nonempty")
	}
	lines := []string{}
	for _, link := range links {
		lines = append(lines, nestedLines(link, "", indent, false)...)
	}
	return strings.Join(lines, "\n")
}
