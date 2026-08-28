package lino

import (
	"errors"
	"strings"
	"unicode"
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
	// A parenthesized group is parsed as a nested document, isNested tells an
	// empty group apart from a link that simply has no nested content.
	nested   []*internalLink
	isNested bool
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

// skipQuotedString skips over the quoted string starting at start.
// Any number N of quotes opens and closes the string, 2*N quotes are an escaped
// quote sequence. It returns the position right after the closing quotes, or -1
// when text does not start a terminated quoted string.
// isSubstantiveBody reports whether a body written between an even run of
// delimiters is substantive: it holds at least one visible character and does
// not straddle a parenthesis. An even run can always be read as delimiter pairs
// enclosing nothing, so the n-quote reading is only taken when it carries
// something the pairs cannot.
func isSubstantiveBody(content string) bool {
	depth := 0
	hasVisible := false

	for _, c := range content {
		switch c {
		case '(':
			depth++
		case ')':
			depth--
			if depth < 0 {
				return false
			}
		}
		if !unicode.IsSpace(c) {
			hasVisible = true
		}
	}

	return hasVisible && depth == 0
}

// parseQuotedStringAt parses the delimited reference starting at start.
//
// Any number N of quotes opens and closes the string, 2*N quotes are an escaped
// quote sequence. A run of an even number of delimiters that does not open a
// reference with a substantive body is the empty reference: the shortest
// reading, a bare delimiter pair enclosing nothing, wins over a longer n-quote
// delimiter.
//
// It returns the decoded value and the position right after the closing quotes,
// or ok == false when text does not start a delimited reference.
func parseQuotedStringAt(text string, start int) (value string, end int, ok bool) {
	if start >= len(text) {
		return "", 0, false
	}

	quoteChar := text[start]
	if quoteChar != '"' && quoteChar != '\'' && quoteChar != '`' {
		return "", 0, false
	}

	quoteCount := 0
	pos := start
	for pos < len(text) && text[pos] == quoteChar {
		quoteCount++
		pos++
	}

	isEvenRun := quoteCount%2 == 0
	openClose := strings.Repeat(string(quoteChar), quoteCount)
	escapeSeq := strings.Repeat(string(quoteChar), quoteCount*2)
	var content strings.Builder

	for pos < len(text) {
		if strings.HasPrefix(text[pos:], escapeSeq) {
			content.WriteString(openClose)
			pos += len(escapeSeq)
			continue
		}
		if strings.HasPrefix(text[pos:], openClose) {
			afterClose := pos + quoteCount
			if afterClose >= len(text) || text[afterClose] != quoteChar {
				body := content.String()
				if isEvenRun && !isSubstantiveBody(body) {
					return "", start + quoteCount, true
				}
				return body, afterClose, true
			}
		}
		content.WriteByte(text[pos])
		pos++
	}

	if isEvenRun {
		return "", start + quoteCount, true
	}

	return "", 0, false
}

// skipQuotedString skips over the quoted string starting at start.
// It returns the position right after the closing quotes, or -1 when text does
// not start a terminated quoted string.
func (p *Parser) skipQuotedString(text string, start int) int {
	_, end, ok := parseQuotedStringAt(text, start)
	if !ok {
		return -1
	}
	return end
}

// findMatchingParen finds the parenthesis closing the one at start.
// Quoted strings are skipped, so parentheses inside them are ignored.
// It returns -1 when the group is not closed.
func (p *Parser) findMatchingParen(text string, start int) int {
	depth := 0
	i := start

	for i < len(text) {
		char := text[i]
		if char == '"' || char == '\'' || char == '`' {
			if end := p.skipQuotedString(text, i); end > i {
				i = end
				continue
			}
		} else if char == '(' {
			depth++
		} else if char == ')' {
			depth--
			if depth == 0 {
				return i
			}
		}
		i++
	}

	return -1
}

// splitLinesRespectingQuotes splits text into lines while preserving newlines inside quotes
// and handling multiline parenthesized expressions.
func (p *Parser) splitLinesRespectingQuotes(text string) []string {
	var lines []string
	var currentLine strings.Builder
	parenDepth := 0
	i := 0

	for i < len(text) {
		char := text[i]

		if char == '"' || char == '\'' || char == '`' {
			if end := p.skipQuotedString(text, i); end > i {
				// A quoted string is opaque: newlines inside it are content
				currentLine.WriteString(text[i:end])
				i = end
				continue
			}
			currentLine.WriteByte(char)
		} else if char == '(' {
			parenDepth++
			currentLine.WriteByte(char)
		} else if char == ')' {
			parenDepth--
			currentLine.WriteByte(char)
		} else if char == '\n' {
			if parenDepth > 0 {
				// Inside unclosed parens: preserve the newline
				currentLine.WriteByte(char)
			} else {
				lines = append(lines, currentLine.String())
				currentLine.Reset()
			}
		} else {
			currentLine.WriteByte(char)
		}

		i++
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
	// A whole parenthesized group: (id: values), (values) or a nested document
	if strings.HasPrefix(content, "(") && p.findMatchingParen(content, 0) == len(content)-1 {
		return p.parseParenthesized(content[1 : len(content)-1])
	}

	// Try indented ID syntax: id:
	if strings.HasSuffix(content, ":") {
		idPart := strings.TrimSpace(content[:len(content)-1])
		ref := p.extractReference(idPart)
		return &internalLink{id: &ref, values: nil, isIndentedID: true}
	}

	// Try single-line link: id: values
	if colonPos := p.findColonOutsideQuotes(content); colonPos >= 0 {
		idPart := strings.TrimSpace(content[:colonPos])
		valuesPart := strings.TrimSpace(content[colonPos+1:])
		ref := p.extractReference(idPart)
		values := p.parseValues(valuesPart)
		return &internalLink{id: &ref, values: values}
	}

	// Simple value list
	values := p.parseValues(content)
	return &internalLink{values: values}
}

// parseParenthesized parses the content of a parenthesized group.
//
// The group opens a nested context that starts fresh at indentation level zero
// and follows exactly the rules used at the root of the document, so line breaks
// separate links and indentation nests them.
func (p *Parser) parseParenthesized(inner string) *internalLink {
	return &internalLink{nested: p.parseNestedDocument(inner), isNested: true}
}

// parseNestedDocument parses the text of a parenthesized group as a document of its own.
func (p *Parser) parseNestedDocument(inner string) []*internalLink {
	savedLines := p.lines
	savedPos := p.pos
	savedBaseIndentation := p.baseIndentation
	savedIndentStack := p.indentStack

	p.lines = p.splitLinesRespectingQuotes(inner)
	p.pos = 0
	p.baseIndentation = nil
	p.indentStack = []int{0}
	nested := p.parseDocument()

	p.lines = savedLines
	p.pos = savedPos
	p.baseIndentation = savedBaseIndentation
	p.indentStack = savedIndentStack

	return nested
}

// findColonOutsideQuotes finds a colon that is not inside quotes or parentheses.
func (p *Parser) findColonOutsideQuotes(text string) int {
	parenDepth := 0
	i := 0

	for i < len(text) {
		char := text[i]
		if char == '"' || char == '\'' || char == '`' {
			if end := p.skipQuotedString(text, i); end > i {
				i = end
				continue
			}
		} else if char == '(' {
			parenDepth++
		} else if char == ')' {
			parenDepth--
		} else if char == ':' && parenDepth == 0 {
			return i
		}
		i++
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

	// Check if this starts with a delimited reference (any N quotes, or a bare
	// delimiter pair standing for the empty reference)
	if _, end, ok := parseQuotedStringAt(text, start); ok {
		return end, text[start:end]
	}

	// Check if this starts with a parenthesized expression
	if text[start] == '(' {
		if end := p.findMatchingParen(text, start); end >= 0 {
			return end + 1, text[start : end+1]
		}
		return len(text), text[start:]
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
	if strings.HasPrefix(value, "(") && p.findMatchingParen(value, 0) == len(value)-1 {
		return p.parseParenthesized(value[1 : len(value)-1])
	}

	// Simple reference
	ref := p.extractReference(value)
	return &internalLink{id: &ref}
}

func (p *Parser) extractReference(text string) string {
	text = strings.TrimSpace(text)

	// Try delimited references (any N quotes, or a bare delimiter pair)
	if value, _, ok := parseQuotedStringAt(text, 0); ok {
		return value
	}

	// Unquoted
	return text
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

		currentLink := &Link{ID: item.id, Values: childValues}

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
			ID:     nil,
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
		ID:     nil,
		Values: []*Link{parent, current},
	}
}

// transformNested turns the links of a nested (parenthesized) context into one Link.
//
// The nested context is parsed with the same rules as the root, so it yields a
// list of links; a single link is used as is, several links become the values of
// one anonymous link. An already parenthesized single link keeps its own group,
// so "((a b))" stays distinct from "(a b)".
func (p *Parser) transformNested(nested []*internalLink) *Link {
	var nestedLinks []*Link
	for _, item := range nested {
		if item != nil {
			p.collectLinks(item, nil, &nestedLinks)
		}
	}

	wrapsSingleGroup := len(nested) == 1 && nested[0] != nil && nested[0].isNested
	if len(nestedLinks) == 1 && !wrapsSingleGroup {
		return nestedLinks[0]
	}

	return &Link{ID: nil, Values: nestedLinks}
}

func (p *Parser) transformLink(item *internalLink) *Link {
	if item == nil {
		return &Link{}
	}

	// Parenthesized group parsed as a nested context
	if item.isNested {
		return p.transformNested(item.nested)
	}

	// Simple reference
	if item.id != nil && len(item.values) == 0 {
		return &Link{ID: item.id}
	}

	// Link with values
	if len(item.values) > 0 {
		var values []*Link
		for _, v := range item.values {
			values = append(values, p.transformLink(v))
		}
		return &Link{ID: item.id, Values: values}
	}

	// Default
	return &Link{ID: item.id}
}
