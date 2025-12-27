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
	"fmt"
	"strings"
)

// MultiRefError is returned when attempting to access the Id() method on a multi-reference Link.
type MultiRefError struct {
	Count int
}

func (e *MultiRefError) Error() string {
	return fmt.Sprintf("This link has a multi-reference id with %d parts. Use 'Ids()' instead of 'Id()'.", e.Count)
}

// Link represents a link in Lino notation.
// A link can be:
//   - A reference (IDs only, no values)
//   - A link with IDs and values
//   - A link with only values (no IDs)
//
// For multi-reference IDs (e.g., "some example" before colon), use the IDs field.
// The Id() method will return an error for multi-reference IDs.
type Link struct {
	IDs    []string
	Values []*Link
}

// NewRef creates a new reference Link (ID only, no values).
func NewRef(id string) *Link {
	return &Link{IDs: []string{id}, Values: nil}
}

// NewMultiRef creates a new multi-reference Link (multiple IDs, no values).
func NewMultiRef(ids []string) *Link {
	return &Link{IDs: ids, Values: nil}
}

// NewLink creates a new Link with optional ID and values.
func NewLink(id *string, values []*Link) *Link {
	if id == nil {
		return &Link{IDs: nil, Values: values}
	}
	return &Link{IDs: []string{*id}, Values: values}
}

// NewLinkWithIDs creates a new Link with multiple IDs and values.
func NewLinkWithIDs(ids []string, values []*Link) *Link {
	return &Link{IDs: ids, Values: values}
}

// NewValuesLink creates a new Link with values only (no ID).
func NewValuesLink(values []*Link) *Link {
	return &Link{IDs: nil, Values: values}
}

// Id returns the single ID string (backward compatibility).
// Returns an error if IDs has more than one element.
// Use IDs field for multi-reference access.
func (l *Link) Id() (*string, error) {
	if l.IDs == nil || len(l.IDs) == 0 {
		return nil, nil
	}
	if len(l.IDs) > 1 {
		return nil, &MultiRefError{Count: len(l.IDs)}
	}
	return &l.IDs[0], nil
}

// GetIdString returns the ID as a joined string for formatting purposes.
// Returns nil if IDs is nil or empty.
func (l *Link) GetIdString() *string {
	if l.IDs == nil || len(l.IDs) == 0 {
		return nil
	}
	result := strings.Join(l.IDs, " ")
	return &result
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
	idStr := l.GetIdString()

	// Empty link
	if idStr == nil && len(l.Values) == 0 {
		if lessParentheses {
			return ""
		}
		return "()"
	}

	// Link with only ID, no values
	if len(l.Values) == 0 {
		if idStr != nil {
			escapedID := escapeReference(*idStr)
			if lessParentheses && !needsParentheses(*idStr) {
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
	if idStr == nil {
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
					vIdStr := v.GetIdString()
					if vIdStr != nil {
						refs = append(refs, escapeReference(*vIdStr))
					}
				}
				return strings.Join(refs, " ")
			}
			return valuesStr
		}
		return "(" + valuesStr + ")"
	}

	// Link with ID and values
	escapedID := escapeReference(*idStr)
	withColon := escapedID + ": " + valuesStr
	if lessParentheses && !needsParentheses(*idStr) {
		return withColon
	}
	return "(" + withColon + ")"
}

// FormatWithConfig formats the link using a FormatConfig object.
func (l *Link) FormatWithConfig(config *FormatConfig) string {
	return l.formatWithConfig(config, false)
}

func (l *Link) formatWithConfig(config *FormatConfig, isCompoundValue bool) string {
	idStr := l.GetIdString()

	// Empty link
	if idStr == nil && len(l.Values) == 0 {
		if config.LessParentheses {
			return ""
		}
		return "()"
	}

	// Link with only ID, no values
	if len(l.Values) == 0 {
		if idStr != nil {
			escapedID := escapeReference(*idStr)
			if isCompoundValue {
				return "(" + escapedID + ")"
			}
			if config.LessParentheses && !needsParentheses(*idStr) {
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
		if idStr != nil {
			escapedID := escapeReference(*idStr)
			if config.LessParentheses {
				testLine = escapedID + ": " + valuesStr
			} else {
				testLine = "(" + escapedID + ": " + valuesStr + ")"
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
	if idStr == nil {
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
					vIdStr := v.GetIdString()
					if vIdStr != nil {
						refs = append(refs, escapeReference(*vIdStr))
					}
				}
				return strings.Join(refs, " ")
			}
			return valuesStr
		}
		return "(" + valuesStr + ")"
	}

	// Link with ID and values
	escapedID := escapeReference(*idStr)
	withColon := escapedID + ": " + valuesStr
	if config.LessParentheses && !needsParentheses(*idStr) {
		return withColon
	}
	return "(" + withColon + ")"
}

func (l *Link) formatIndented(config *FormatConfig) string {
	idStr := l.GetIdString()
	if idStr == nil {
		// Values only - format each on separate line
		var lines []string
		for _, v := range l.Values {
			lines = append(lines, config.IndentString+formatValue(v))
		}
		return strings.Join(lines, "\n")
	}

	// Link with ID - format as id:\n  value1\n  value2
	escapedID := escapeReference(*idStr)
	lines := []string{escapedID + ":"}
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
	// Compare IDs
	if len(l.IDs) != len(other.IDs) {
		return false
	}
	for i := range l.IDs {
		if l.IDs[i] != other.IDs[i] {
			return false
		}
	}
	// Compare values
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
		idStr := value.GetIdString()
		if idStr != nil {
			return escapeReference(*idStr)
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
		currentIdStr := current.GetIdString()

		// Look ahead for consecutive links with same ID
		if currentIdStr != nil && len(current.Values) > 0 {
			sameIDValues := make([]*Link, len(current.Values))
			copy(sameIDValues, current.Values)

			j := i + 1
			for j < len(links) {
				next := links[j]
				nextIdStr := next.GetIdString()
				if nextIdStr != nil && *nextIdStr == *currentIdStr && len(next.Values) > 0 {
					sameIDValues = append(sameIDValues, next.Values...)
					j++
				} else {
					break
				}
			}

			// If we found consecutive links, create grouped link
			if j > i+1 {
				grouped = append(grouped, &Link{
					IDs:    current.IDs,
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
