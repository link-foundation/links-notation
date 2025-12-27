package lino

import (
	"errors"
	"strings"
)

// ParseError is returned when parsing fails.
type ParseError struct {
	Message string
	Pos     int
}

func (e *ParseError) Error() string {
	return e.Message
}

// Parser for Lino notation.
type Parser struct {
	MaxInputSize int
	MaxDepth     int

	// Internal state
	text            string
	lines           []string
	pos             int
	indentStack     []int
	baseIndentation *int
}

// NewParser creates a new Parser with default settings.
func NewParser() *Parser {
	return &Parser{
		MaxInputSize: 10 * 1024 * 1024, // 10MB
		MaxDepth:     1000,
	}
}

// internalLink is an internal representation during parsing.
type internalLink struct {
	id           *string
	values       []*internalLink
	children     []*internalLink
	isIndentedID bool
}

// Parse parses Lino notation text into a slice of Link objects.
func (p *Parser) Parse(input string) ([]*Link, error) {
	// Validate input type (Go handles this at compile time)
	// Validate input size
	if len(input) > p.MaxInputSize {
		return nil, errors.New("input size exceeds maximum allowed size")
	}

	if input == "" || strings.TrimSpace(input) == "" {
		return nil, nil
	}

	p.text = input
	p.lines = p.splitLinesRespectingQuotes(input)
	p.pos = 0
	p.indentStack = []int{0}
	p.baseIndentation = nil

	rawResult := p.parseDocument()
	return p.transformResult(rawResult), nil
}

// splitLinesRespectingQuotes splits text into lines while preserving newlines inside quotes
// and handling multiline parenthesized expressions.
func (p *Parser) splitLinesRespectingQuotes(text string) []string {
	var lines []string
	var currentLine strings.Builder
	inSingle := false
	inDouble := false
	inBacktick := false
	parenDepth := 0

	for i := 0; i < len(text); i++ {
		char := text[i]

		switch char {
		case '"':
			if !inSingle && !inBacktick {
				inDouble = !inDouble
			}
			currentLine.WriteByte(char)
		case '\'':
			if !inDouble && !inBacktick {
				inSingle = !inSingle
			}
			currentLine.WriteByte(char)
		case '`':
			if !inSingle && !inDouble {
				inBacktick = !inBacktick
			}
			currentLine.WriteByte(char)
		case '(':
			if !inSingle && !inDouble && !inBacktick {
				parenDepth++
			}
			currentLine.WriteByte(char)
		case ')':
			if !inSingle && !inDouble && !inBacktick {
				parenDepth--
			}
			currentLine.WriteByte(char)
		case '\n':
			if inSingle || inDouble || inBacktick || parenDepth > 0 {
				currentLine.WriteByte(char)
			} else {
				lines = append(lines, currentLine.String())
				currentLine.Reset()
			}
		default:
			currentLine.WriteByte(char)
		}
	}

	// Add the last line if non-empty
	if currentLine.Len() > 0 {
		lines = append(lines, currentLine.String())
	}

	return lines
}

func (p *Parser) parseDocument() []*internalLink {
	p.pos = 0
	var links []*internalLink

	for p.pos < len(p.lines) {
		line := p.lines[p.pos]
		if strings.TrimSpace(line) != "" {
			element := p.parseElement(0)
			if element != nil {
				links = append(links, element)
			}
		} else {
			p.pos++
		}
	}

	return links
}

func (p *Parser) parseElement(currentIndent int) *internalLink {
	if p.pos >= len(p.lines) {
		return nil
	}

	line := p.lines[p.pos]
	rawIndent := countLeadingSpaces(line)

	// Set base indentation from first content line
	if p.baseIndentation == nil && strings.TrimSpace(line) != "" {
		p.baseIndentation = &rawIndent
	}

	// Normalize indentation relative to base
	base := 0
	if p.baseIndentation != nil {
		base = *p.baseIndentation
	}
	indent := rawIndent - base
	if indent < 0 {
		indent = 0
	}

	if indent < currentIndent {
		return nil
	}

	content := strings.TrimSpace(line)
	if content == "" {
		p.pos++
		return nil
	}

	p.pos++

	// Try to parse the line
	element := p.parseLineContent(content)

	// Check for children (indented lines that follow)
	var children []*internalLink
	childIndent := indent + 2

	for p.pos < len(p.lines) {
		nextLine := p.lines[p.pos]
		rawNextIndent := countLeadingSpaces(nextLine)
		nextIndent := rawNextIndent - base
		if nextIndent < 0 {
			nextIndent = 0
		}

		if strings.TrimSpace(nextLine) != "" && nextIndent > indent {
			childIndentToUse := childIndent
			if len(children) > 0 {
				childIndentToUse = indent + 2
			}
			child := p.parseElement(childIndentToUse)
			if child != nil {
				children = append(children, child)
			}
		} else {
			break
		}
	}

	if len(children) > 0 {
		element.children = children
	}

	return element
}

func countLeadingSpaces(s string) int {
	count := 0
	for _, c := range s {
		if c == ' ' {
			count++
		} else {
			break
		}
	}
	return count
}

func (p *Parser) parseLineContent(content string) *internalLink {
	// Try multiline link format: (id: values) or (values)
	if strings.HasPrefix(content, "(") && strings.HasSuffix(content, ")") {
		inner := strings.TrimSpace(content[1 : len(content)-1])
		return p.parseParenthesized(inner)
	}

	// Try indented ID syntax: id:
	if strings.HasSuffix(content, ":") {
		idPart := strings.TrimSpace(content[:len(content)-1])
		ref := p.extractReference(idPart)
		return &internalLink{id: &ref, values: nil, isIndentedID: true}
	}

	// Try single-line link: id: values
	if strings.Contains(content, ":") && !strings.HasPrefix(content, "\"") && !strings.HasPrefix(content, "'") {
		colonPos := p.findColonOutsideQuotes(content)
		if colonPos >= 0 {
			idPart := strings.TrimSpace(content[:colonPos])
			valuesPart := strings.TrimSpace(content[colonPos+1:])
			ref := p.extractReference(idPart)
			values := p.parseValues(valuesPart)
			return &internalLink{id: &ref, values: values}
		}
	}

	// Simple value list
	values := p.parseValues(content)
	return &internalLink{values: values}
}

func (p *Parser) parseParenthesized(inner string) *internalLink {
	// Check for id: values format
	colonPos := p.findColonOutsideQuotes(inner)
	if colonPos >= 0 {
		idPart := strings.TrimSpace(inner[:colonPos])
		valuesPart := strings.TrimSpace(inner[colonPos+1:])
		ref := p.extractReference(idPart)
		values := p.parseValues(valuesPart)
		return &internalLink{id: &ref, values: values}
	}

	// Just values
	values := p.parseValues(inner)
	return &internalLink{values: values}
}

func (p *Parser) findColonOutsideQuotes(text string) int {
	inSingle := false
	inDouble := false
	inBacktick := false
	parenDepth := 0

	for i, char := range text {
		switch char {
		case '\'':
			if !inDouble && !inBacktick {
				inSingle = !inSingle
			}
		case '"':
			if !inSingle && !inBacktick {
				inDouble = !inDouble
			}
		case '`':
			if !inSingle && !inDouble {
				inBacktick = !inBacktick
			}
		case '(':
			if !inSingle && !inDouble && !inBacktick {
				parenDepth++
			}
		case ')':
			if !inSingle && !inDouble && !inBacktick {
				parenDepth--
			}
		case ':':
			if !inSingle && !inDouble && !inBacktick && parenDepth == 0 {
				return i
			}
		}
	}

	return -1
}

func (p *Parser) parseValues(text string) []*internalLink {
	if text == "" {
		return nil
	}

	var values []*internalLink
	i := 0

	for i < len(text) {
		// Skip whitespace
		for i < len(text) && isWhitespace(rune(text[i])) {
			i++
		}
		if i >= len(text) {
			break
		}

		// Try to extract the next value
		valueEnd, valueText := p.extractNextValue(text, i)
		if valueText != "" && strings.TrimSpace(valueText) != "" {
			values = append(values, p.parseValue(valueText))
		}
		if valueEnd == i {
			// No progress made - skip this character to avoid infinite loop
			i++
		} else {
			i = valueEnd
		}
	}

	return values
}

func isWhitespace(c rune) bool {
	return c == ' ' || c == '\t' || c == '\n' || c == '\r'
}

func (p *Parser) extractNextValue(text string, start int) (int, string) {
	if start >= len(text) {
		return start, ""
	}

	// Check if this starts with a multi-quote string
	for _, quoteChar := range []byte{'"', '\'', '`'} {
		if text[start] == quoteChar {
			// Count opening quotes dynamically
			quoteCount := 0
			pos := start
			for pos < len(text) && text[pos] == quoteChar {
				quoteCount++
				pos++
			}

			if quoteCount >= 1 {
				remaining := text[start:]
				openClose := strings.Repeat(string(quoteChar), quoteCount)
				escapeSeq := strings.Repeat(string(quoteChar), quoteCount*2)

				innerPos := len(openClose)
				for innerPos < len(remaining) {
					// Check for escape sequence (2*N quotes)
					if strings.HasPrefix(remaining[innerPos:], escapeSeq) {
						innerPos += len(escapeSeq)
						continue
					}
					// Check for closing quotes
					if strings.HasPrefix(remaining[innerPos:], openClose) {
						afterClosePos := innerPos + len(openClose)
						// Make sure this is exactly N quotes (not more)
						if afterClosePos >= len(remaining) || remaining[afterClosePos] != quoteChar {
							return start + afterClosePos, remaining[:afterClosePos]
						}
					}
					innerPos++
				}

				// No closing found, treat as regular text
				break
			}
		}
	}

	// Check if this starts with a parenthesized expression
	if text[start] == '(' {
		parenDepth := 1
		inSingle := false
		inDouble := false
		inBacktick := false
		i := start + 1

		for i < len(text) && parenDepth > 0 {
			char := text[i]
			switch char {
			case '\'':
				if !inDouble && !inBacktick {
					inSingle = !inSingle
				}
			case '"':
				if !inSingle && !inBacktick {
					inDouble = !inDouble
				}
			case '`':
				if !inSingle && !inDouble {
					inBacktick = !inBacktick
				}
			case '(':
				if !inSingle && !inDouble && !inBacktick {
					parenDepth++
				}
			case ')':
				if !inSingle && !inDouble && !inBacktick {
					parenDepth--
				}
			}
			i++
		}

		return i, text[start:i]
	}

	// Regular value - read until space or end
	inSingle := false
	inDouble := false
	inBacktick := false
	i := start

	for i < len(text) {
		char := text[i]
		switch char {
		case '\'':
			if !inDouble && !inBacktick {
				inSingle = !inSingle
			}
		case '"':
			if !inSingle && !inBacktick {
				inDouble = !inDouble
			}
		case '`':
			if !inSingle && !inDouble {
				inBacktick = !inBacktick
			}
		case ' ':
			if !inSingle && !inDouble && !inBacktick {
				return i, text[start:i]
			}
		}
		i++
	}

	return i, text[start:i]
}

func (p *Parser) parseValue(value string) *internalLink {
	// Nested link in parentheses
	if strings.HasPrefix(value, "(") && strings.HasSuffix(value, ")") {
		inner := strings.TrimSpace(value[1 : len(value)-1])
		return p.parseParenthesized(inner)
	}

	// Simple reference
	ref := p.extractReference(value)
	return &internalLink{id: &ref}
}

func (p *Parser) extractReference(text string) string {
	text = strings.TrimSpace(text)

	// Try multi-quote strings
	for _, quoteChar := range []byte{'"', '\'', '`'} {
		if len(text) > 0 && text[0] == quoteChar {
			// Count opening quotes dynamically
			quoteCount := 0
			for quoteCount < len(text) && text[quoteCount] == quoteChar {
				quoteCount++
			}

			if quoteCount >= 1 && len(text) > quoteCount {
				result := p.parseMultiQuoteString(text, quoteChar, quoteCount)
				if result != nil {
					return *result
				}
			}
		}
	}

	// Unquoted
	return text
}

func (p *Parser) parseMultiQuoteString(text string, quoteChar byte, quoteCount int) *string {
	openClose := strings.Repeat(string(quoteChar), quoteCount)
	escapeSeq := strings.Repeat(string(quoteChar), quoteCount*2)
	escapeVal := strings.Repeat(string(quoteChar), quoteCount)

	// Check for opening quotes
	if !strings.HasPrefix(text, openClose) {
		return nil
	}

	remaining := text[len(openClose):]
	var content strings.Builder

	for len(remaining) > 0 {
		// Check for escape sequence (2*N quotes)
		if strings.HasPrefix(remaining, escapeSeq) {
			content.WriteString(escapeVal)
			remaining = remaining[len(escapeSeq):]
			continue
		}

		// Check for closing quotes (N quotes not followed by more quotes)
		if strings.HasPrefix(remaining, openClose) {
			afterClose := remaining[len(openClose):]
			// Make sure this is exactly N quotes (not more)
			if afterClose == "" || afterClose[0] != quoteChar {
				// Closing found
				result := content.String()
				return &result
			}
		}

		// Take the next character
		content.WriteByte(remaining[0])
		remaining = remaining[1:]
	}

	// No closing quotes found
	return nil
}

func (p *Parser) transformResult(rawResult []*internalLink) []*Link {
	var links []*Link

	for _, item := range rawResult {
		if item != nil {
			p.collectLinks(item, nil, &links)
		}
	}

	return links
}

func (p *Parser) collectLinks(item *internalLink, parentPath []*Link, result *[]*Link) {
	if item == nil {
		return
	}

	children := item.children

	// Special case: indented ID syntax (id: followed by children)
	if item.isIndentedID && item.id != nil && len(item.values) == 0 && len(children) > 0 {
		var childValues []*Link
		for _, child := range children {
			// Extract the reference from child's values
			if len(child.values) == 1 {
				childValues = append(childValues, p.transformLink(child.values[0]))
			} else {
				childValues = append(childValues, p.transformLink(child))
			}
		}

		currentLink := &Link{IDs: p.idToIds(item.id), Values: childValues}

		if len(parentPath) == 0 {
			*result = append(*result, currentLink)
		} else {
			*result = append(*result, p.combinePathElements(parentPath, currentLink))
		}
		return
	}

	// Regular indented structure
	if len(children) > 0 {
		currentLink := p.transformLink(item)

		// Add the link combined with parent path
		if len(parentPath) == 0 {
			*result = append(*result, currentLink)
		} else {
			*result = append(*result, p.combinePathElements(parentPath, currentLink))
		}

		// Process each child with this item in the path
		newPath := append(parentPath, currentLink)
		for _, child := range children {
			p.collectLinks(child, newPath, result)
		}
		return
	}

	// Leaf item or item with inline values
	currentLink := p.transformLink(item)

	if len(parentPath) == 0 {
		*result = append(*result, currentLink)
	} else {
		*result = append(*result, p.combinePathElements(parentPath, currentLink))
	}
}

func (p *Parser) combinePathElements(pathElements []*Link, current *Link) *Link {
	if len(pathElements) == 0 {
		return current
	}

	if len(pathElements) == 1 {
		return &Link{
			IDs:    nil,
			Values: []*Link{pathElements[0], current},
		}
	}

	// For multiple path elements, build proper nesting
	parentPath := pathElements[:len(pathElements)-1]
	lastElement := pathElements[len(pathElements)-1]

	// Build the parent structure
	parent := p.combinePathElements(parentPath, lastElement)

	// Add current element to the built structure
	return &Link{
		IDs:    nil,
		Values: []*Link{parent, current},
	}
}

func (p *Parser) transformLink(item *internalLink) *Link {
	if item == nil {
		return &Link{}
	}

	// Simple reference
	if item.id != nil && len(item.values) == 0 {
		return &Link{IDs: p.idToIds(item.id)}
	}

	// Link with values
	if len(item.values) > 0 {
		var values []*Link
		for _, v := range item.values {
			values = append(values, p.transformLink(v))
		}
		return &Link{IDs: p.idToIds(item.id), Values: values}
	}

	// Default
	return &Link{IDs: p.idToIds(item.id)}
}

// idToIds converts a single id string pointer to an IDs slice.
// This handles multi-word IDs by splitting them.
func (p *Parser) idToIds(id *string) []string {
	if id == nil {
		return nil
	}
	return []string{*id}
}
