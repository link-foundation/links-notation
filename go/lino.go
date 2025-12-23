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
type Link struct {
	ID     *string
	Values []*Link
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
		if lessParentheses {
			return ""
		}
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
		if lessParentheses {
			return ""
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
		if lessParentheses {
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
	// For multi-word IDs in parenthesized form, don't quote if only spaces
	idStr := escapeReferenceForParenthesizedID(*l.ID)
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
		if config.LessParentheses {
			return ""
		}
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
		if config.LessParentheses {
			return ""
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
			idStr := escapeReferenceForParenthesizedID(*l.ID)
			if config.LessParentheses {
				testLine = idStr + ": " + valuesStr
			} else {
				testLine = "(" + idStr + ": " + valuesStr + ")"
			}
		} else if config.LessParentheses {
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
		if config.LessParentheses {
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
	idStr := escapeReferenceForParenthesizedID(*l.ID)
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
	idStr := escapeReferenceForIndentedID(*l.ID)
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
	if reference == "" || strings.TrimSpace(reference) == "" {
		return ""
	}

	hasSingleQuote := strings.Contains(reference, "'")
	hasDoubleQuote := strings.Contains(reference, "\"")

	needsQuoting := strings.Contains(reference, ":") ||
		strings.Contains(reference, "(") ||
		strings.Contains(reference, ")") ||
		strings.Contains(reference, " ") ||
		strings.Contains(reference, "\t") ||
		strings.Contains(reference, "\n") ||
		strings.Contains(reference, "\r") ||
		hasDoubleQuote ||
		hasSingleQuote

	// Handle edge case: reference contains both single and double quotes
	if hasSingleQuote && hasDoubleQuote {
		return "'" + strings.ReplaceAll(reference, "'", "\\'") + "'"
	}

	// Prefer single quotes if double quotes are present
	if hasDoubleQuote {
		return "'" + reference + "'"
	}

	// Use double quotes if single quotes are present
	if hasSingleQuote {
		return "\"" + reference + "\""
	}

	// Use single quotes for special characters
	if needsQuoting {
		return "'" + reference + "'"
	}

	// No quoting needed
	return reference
}

// escapeReferenceForParenthesizedID escapes a reference for use as an ID in parenthesized form.
// Multi-word IDs like "some example" don't need quotes when inside parentheses with a colon.
func escapeReferenceForParenthesizedID(reference string) string {
	if reference == "" || strings.TrimSpace(reference) == "" {
		return ""
	}

	hasSingleQuote := strings.Contains(reference, "'")
	hasDoubleQuote := strings.Contains(reference, "\"")

	// Check if quoting is needed for reasons other than spaces
	needsQuotingForOtherReasons :=
		strings.Contains(reference, ":") ||
		strings.Contains(reference, "(") ||
		strings.Contains(reference, ")") ||
		strings.Contains(reference, "\t") ||
		strings.Contains(reference, "\n") ||
		strings.Contains(reference, "\r") ||
		hasDoubleQuote ||
		hasSingleQuote

	// Handle edge case: reference contains both single and double quotes
	if hasSingleQuote && hasDoubleQuote {
		return "'" + strings.ReplaceAll(reference, "'", "\\'") + "'"
	}

	// Prefer single quotes if double quotes are present
	if hasDoubleQuote {
		return "'" + reference + "'"
	}

	// Use double quotes if single quotes are present
	if hasSingleQuote {
		return "\"" + reference + "\""
	}

	// Use single quotes for special characters (but not for spaces alone)
	if needsQuotingForOtherReasons {
		return "'" + reference + "'"
	}

	// Multi-word IDs (only spaces) don't need quoting in parenthesized form
	return reference
}

// escapeReferenceForIndentedID escapes a reference for use as an ID in indented syntax.
// Multi-word IDs like "some example" don't need quotes when followed by a colon.
func escapeReferenceForIndentedID(reference string) string {
	// Same logic as parenthesized IDs
	return escapeReferenceForParenthesizedID(reference)
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
