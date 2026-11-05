// Package lino provides parsing and formatting for Links Notation (Lino).
//
// Links Notation is a simple, intuitive format for representing structured data
// as links between references. It supports doublets, triplets, and N-tuples.
//
// Basic usage:
//
//	links, err := lino.Parse("papa (lovesMama: loves mama)")
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	// Format back to string
//	output := lino.Format(links)
package lino

import (
	"strings"
)

// Link represents a link in Lino notation.
// A link can be:
//   - A reference (ID only, no values)
//   - A link with ID and values
//   - A link with only values (no ID)
//
// A link read by a Parser also records how its ID was written, in RawID. That
// is syntax metadata only: Equal, String, Format and every other formatter
// ignore it, so 1 and '1' are still the same reference.
type Link struct {
	ID     *string
	Values []*Link

	// RawID is the ID exactly as the parsed document wrote it: '1' for a quoted
	// 1, 1 for a bare one, ~1{31} for a versioned literal. It is nil for a link
	// without an ID, a link built in code, a link made by combining the lines
	// of an indented document, and every link read by a Parser whose Syntax is
	// false. It takes no part in Equal or in formatting.
	RawID *string
}

// NewRef creates a new reference Link (ID only, no values).
func NewRef(id string) *Link {
	return &Link{ID: &id, Values: nil}
}

// NewLink creates a new Link with optional ID and values.
func NewLink(id *string, values []*Link) *Link {
	return &Link{ID: id, Values: values}
}

// NewValuesLink creates a new Link with values only (no ID).
func NewValuesLink(values []*Link) *Link {
	return &Link{ID: nil, Values: values}
}

// Quote returns the delimiter the ID was written between: "'", "\"" or "`"
// when it was quoted, and "" when it was bare, a versioned literal, or not
// read from a document (see RawID). 1 and '1' stay equal links; this only says
// how each was written.
func (l *Link) Quote() string {
	if l.RawID == nil {
		return ""
	}
	return ReferenceQuote(*l.RawID)
}

// ReferenceQuote returns the delimiter a reference was written between, read
// from the reference exactly as it was written: "'", "\"" or "`" for one
// complete quoted reference (however many quotes open it), and "" for a bare
// reference, a versioned literal, or anything else. "'unclosed" is a bare
// reference that starts with a quote, so it has no delimiter, and neither has
// "'a' b", which is more than one reference.
func ReferenceQuote(raw string) string {
	if raw == "" || !isQuote(raw[0]) {
		return ""
	}
	if _, end, ok := parseQuotedStringAt(raw, 0); ok && end == len(raw) {
		return raw[:1]
	}
	return ""
}

// IsRef returns true if this Link is a simple reference (ID only, no values).
func (l *Link) IsRef() bool {
	return l.Values == nil || len(l.Values) == 0
}

// IsLink returns true if this Link has values.
func (l *Link) IsLink() bool {
	return len(l.Values) > 0
}

// String returns the formatted string representation of the link.
func (l *Link) String() string {
	return l.Format(false)
}

// Format formats the link as a string.
// If lessParentheses is true, omits parentheses when safe.
func (l *Link) Format(lessParentheses bool) string {
	// Empty link
	if l.ID == nil && len(l.Values) == 0 {
		return "()"
	}

	// Link with only ID, no values
	if len(l.Values) == 0 {
		if l.ID != nil {
			escapedID := escapeReference(*l.ID)
			if lessParentheses && !needsParentheses(*l.ID) {
				return escapedID
			}
			return "(" + escapedID + ")"
		}
		return "()"
	}

	// Format values
	var valueParts []string
	for _, v := range l.Values {
		valueParts = append(valueParts, formatValue(v))
	}
	valuesStr := strings.Join(valueParts, " ")

	// Link with values only (nil ID)
	if l.ID == nil {
		if lessParentheses && !l.hasLoneNestedValue() {
			// Check if all values are simple (no nested values)
			allSimple := true
			for _, v := range l.Values {
				if len(v.Values) > 0 {
					allSimple = false
					break
				}
			}
			if allSimple {
				var refs []string
				for _, v := range l.Values {
					if v.ID != nil {
						refs = append(refs, escapeReference(*v.ID))
					}
				}
				return strings.Join(refs, " ")
			}
			return valuesStr
		}
		return "(" + valuesStr + ")"
	}

	// Link with ID and values
	idStr := escapeReference(*l.ID)
	withColon := idStr + ": " + valuesStr
	if lessParentheses && !needsParentheses(*l.ID) {
		return withColon
	}
	return "(" + withColon + ")"
}

// FormatWithConfig formats the link using a FormatConfig object.
func (l *Link) FormatWithConfig(config *FormatConfig) string {
	return l.formatWithConfig(config, false)
}

func (l *Link) formatWithConfig(config *FormatConfig, isCompoundValue bool) string {
	// Empty link
	if l.ID == nil && len(l.Values) == 0 {
		return "()"
	}

	// Link with only ID, no values
	if len(l.Values) == 0 {
		if l.ID != nil {
			escapedID := escapeReference(*l.ID)
			if isCompoundValue {
				return "(" + escapedID + ")"
			}
			if config.LessParentheses && !needsParentheses(*l.ID) {
				return escapedID
			}
			return "(" + escapedID + ")"
		}
		return "()"
	}

	// Check if we should use indented format
	shouldIndent := false
	if config.ShouldIndentByRefCount(len(l.Values)) {
		shouldIndent = true
	} else {
		// Try inline format first to check line length
		var valueParts []string
		for _, v := range l.Values {
			valueParts = append(valueParts, formatValue(v))
		}
		valuesStr := strings.Join(valueParts, " ")

		var testLine string
		if l.ID != nil {
			idStr := escapeReference(*l.ID)
			if config.LessParentheses {
				testLine = idStr + ": " + valuesStr
			} else {
				testLine = "(" + idStr + ": " + valuesStr + ")"
			}
		} else if config.LessParentheses && !l.hasLoneNestedValue() {
			testLine = valuesStr
		} else {
			testLine = "(" + valuesStr + ")"
		}

		if config.ShouldIndentByLength(testLine) {
			shouldIndent = true
		}
	}

	// Format with indentation if needed
	if shouldIndent && !config.PreferInline {
		return l.formatIndented(config)
	}

	// Standard inline formatting
	var valueParts []string
	for _, v := range l.Values {
		valueParts = append(valueParts, formatValue(v))
	}
	valuesStr := strings.Join(valueParts, " ")

	// Link with values only (nil ID)
	if l.ID == nil {
		if config.LessParentheses && !l.hasLoneNestedValue() {
			allSimple := true
			for _, v := range l.Values {
				if len(v.Values) > 0 {
					allSimple = false
					break
				}
			}
			if allSimple {
				var refs []string
				for _, v := range l.Values {
					if v.ID != nil {
						refs = append(refs, escapeReference(*v.ID))
					}
				}
				return strings.Join(refs, " ")
			}
			return valuesStr
		}
		return "(" + valuesStr + ")"
	}

	// Link with ID and values
	idStr := escapeReference(*l.ID)
	withColon := idStr + ": " + valuesStr
	if config.LessParentheses && !needsParentheses(*l.ID) {
		return withColon
	}
	return "(" + withColon + ")"
}

func (l *Link) formatIndented(config *FormatConfig) string {
	if l.ID == nil {
		// Values only - format each on separate line
		var lines []string
		for _, v := range l.Values {
			lines = append(lines, config.IndentString+formatValue(v))
		}
		return strings.Join(lines, "\n")
	}

	// Link with ID - format as id:\n  value1\n  value2
	idStr := escapeReference(*l.ID)
	lines := []string{idStr + ":"}
	for _, v := range l.Values {
		lines = append(lines, config.IndentString+formatValue(v))
	}
	return strings.Join(lines, "\n")
}

// Equal checks equality with another Link.
func (l *Link) Equal(other *Link) bool {
	if other == nil {
		return false
	}
	if (l.ID == nil) != (other.ID == nil) {
		return false
	}
	if l.ID != nil && *l.ID != *other.ID {
		return false
	}
	if len(l.Values) != len(other.Values) {
		return false
	}
	for i, v := range l.Values {
		if !v.Equal(other.Values[i]) {
			return false
		}
	}
	return true
}

// escapeReference escapes a reference string by adding quotes if necessary.
func escapeReference(reference string) string {
	return formatReference(reference)
}

// hasLoneNestedValue reports whether the link holds exactly one link that has
// values. The parentheses of an anonymous link are what nest such a value:
// "((b c))" without them is "(b c)", a different link, so LessParentheses has to
// keep them.
func (l *Link) hasLoneNestedValue() bool {
	return len(l.Values) == 1 && len(l.Values[0].Values) > 0
}

// needsParentheses checks if a string needs to be wrapped in parentheses.
func needsParentheses(s string) bool {
	return strings.Contains(s, " ") ||
		strings.Contains(s, ":") ||
		strings.Contains(s, "(") ||
		strings.Contains(s, ")")
}

// formatValue formats a value within a link.
func formatValue(value *Link) string {
	if value.IsRef() {
		if value.ID != nil {
			return escapeReference(*value.ID)
		}
		return ""
	}
	// Complex value - format with parentheses
	return value.String()
}

// Parse parses Lino notation text into a slice of Link objects.
func Parse(input string) ([]*Link, error) {
	p := NewParser()
	return p.Parse(input)
}

// Format formats a collection of Links as a multi-line string.
func Format(links []*Link) string {
	var lines []string
	for _, link := range links {
		lines = append(lines, link.String())
	}
	return strings.Join(lines, "\n")
}

// FormatWithConfig formats a collection of Links using FormatConfig.
func FormatWithConfig(links []*Link, config *FormatConfig) string {
	if len(links) == 0 {
		return ""
	}

	// Apply consecutive link grouping if enabled
	linksToFormat := links
	if config.GroupConsecutive {
		linksToFormat = groupConsecutiveLinks(links)
	}

	var lines []string
	for _, link := range linksToFormat {
		lines = append(lines, link.FormatWithConfig(config))
	}
	return strings.Join(lines, "\n")
}

// groupConsecutiveLinks groups consecutive links with the same ID.
func groupConsecutiveLinks(links []*Link) []*Link {
	if len(links) == 0 {
		return nil
	}

	var grouped []*Link
	i := 0

	for i < len(links) {
		current := links[i]

		// Look ahead for consecutive links with same ID
		if current.ID != nil && len(current.Values) > 0 {
			currentID := *current.ID
			sameIDValues := make([]*Link, len(current.Values))
			copy(sameIDValues, current.Values)

			j := i + 1
			for j < len(links) {
				next := links[j]
				if next.ID != nil && *next.ID == currentID && len(next.Values) > 0 {
					sameIDValues = append(sameIDValues, next.Values...)
					j++
				} else {
					break
				}
			}

			// If we found consecutive links, create grouped link
			if j > i+1 {
				grouped = append(grouped, &Link{
					ID:     &currentID,
					Values: sameIDValues,
				})
				i = j
				continue
			}
		}

		grouped = append(grouped, current)
		i++
	}

	return grouped
}
