package lino

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

// DefaultMaxDepth is how deeply a Parser nests links unless told otherwise.
//
// Every parenthesized group and every indentation level is one level of
// nesting, and the lines of a document are at level 0. The parser recurses once
// per level, so the limit is what turns a document that would exhaust the
// goroutine stack, which ends the process where no caller can recover, into a
// ParseError.
const DefaultMaxDepth = 64

// ErrNestingTooDeep is matched by errors.Is for the ParseError returned when a
// document nests links deeper than the parser's MaxDepth.
var ErrNestingTooDeep = errors.New("nesting depth exceeds the maximum")

// quotedLineWidth is the number of characters of the offending line an error
// message quotes.
const quotedLineWidth = 80

// ellipsis is what a message writes in place of the part of a long line it
// left out.
const ellipsis = "..."

// ParseError is returned when parsing fails.
//
// A document nested deeper than the parser's MaxDepth is refused with a
// ParseError that errors.Is matches against ErrNestingTooDeep; its MaxDepth
// says how deep the nesting may go, and Pos, Line and Column point at the level
// that is one too deep.
type ParseError struct {
	// Message is the whole message: what went wrong, where, and the offending
	// line with a caret under the offending column.
	Message string
	// Pos is the byte offset of the offending position from the start of the
	// document.
	Pos int
	// Line is the line the offending position is on, counted from 1.
	Line int
	// Column is the column the offending position is at, in characters,
	// counted from 1.
	Column int
	// LineText is the offending line, as written, without its line ending.
	LineText string
	// MaxDepth is the deepest nesting the parser accepts when the document
	// nests deeper than that, and 0 for any other error.
	MaxDepth int

	nestingTooDeep bool
}

func (e *ParseError) Error() string {
	return e.Message
}

// Is reports whether e is the error for a document nested too deeply, so that
// errors.Is(err, ErrNestingTooDeep) tells that error apart from any other.
func (e *ParseError) Is(target error) bool {
	return target == ErrNestingTooDeep && e.nestingTooDeep
}

// Summary is the one-line description of the error: where it is and what is
// wrong there.
func (e *ParseError) Summary() string {
	if e.nestingTooDeep {
		return fmt.Sprintf("line %d, column %d: nesting depth exceeds the maximum of %d",
			e.Line, e.Column, e.MaxDepth)
	}
	return e.Message
}

// Snippet is the offending line with a caret under the offending column.
func (e *ParseError) Snippet() string {
	return snippet(e.Line, e.LineText, e.Column)
}

// newNestingTooDeepError describes a document nested deeper than maxDepth, at
// the byte offset where the level that is one too deep opens.
func newNestingTooDeepError(document string, offset, maxDepth int) *ParseError {
	line, column, lineText := locate(document, offset)
	err := &ParseError{
		Pos:            offset,
		Line:           line,
		Column:         column,
		LineText:       lineText,
		MaxDepth:       maxDepth,
		nestingTooDeep: true,
	}
	err.Message = "Nesting too deep at " + err.Summary() + "\n" + err.Snippet()
	return err
}

// locate turns a byte offset into a line and a column, both counted from 1, and
// the line the offset falls on. CR, LF and CRLF all end a line.
func locate(document string, offset int) (line, column int, lineText string) {
	offset = max(0, min(offset, len(document)))
	line = 1
	lineStart := 0
	for cursor := 0; cursor < offset; cursor++ {
		switch document[cursor] {
		case '\r':
			line++
			if cursor+1 < offset && document[cursor+1] == '\n' {
				cursor++
			}
			lineStart = cursor + 1
		case '\n':
			line++
			lineStart = cursor + 1
		}
	}
	column = utf8.RuneCountInString(document[lineStart:offset]) + 1
	lineEnd := len(document)
	if end := strings.IndexAny(document[lineStart:], "\r\n"); end >= 0 {
		lineEnd = lineStart + end
	}
	return line, column, document[lineStart:lineEnd]
}

// snippet quotes line number with a caret under column, the way a compiler
// quotes source.
func snippet(number int, lineText string, column int) string {
	quoted, at := quoteLine(lineText, column)
	label := strconv.Itoa(number)
	gutter := strings.Repeat(" ", len(label))
	return label + " | " + quoted + "\n" + gutter + " | " + strings.Repeat(" ", max(0, at-1)) + "^"
}

// quoteLine cuts line down to a window around column, and says which column
// the offending character sits at in that window. Both columns count from 1.
func quoteLine(line string, column int) (string, int) {
	characters := []rune(line)
	if len(characters) <= quotedLineWidth {
		return line, column
	}

	target := max(0, column-1)
	lastStart := len(characters) - quotedLineWidth
	start := min(max(0, target-quotedLineWidth/2), lastStart)
	end := start + quotedLineWidth

	var quoted strings.Builder
	shift := 0
	if start > 0 {
		quoted.WriteString(ellipsis)
		shift = len(ellipsis)
	}
	quoted.WriteString(string(characters[start:end]))
	if end < len(characters) {
		quoted.WriteString(ellipsis)
	}
	return quoted.String(), target - start + shift + 1
}

// nestingTooDeep carries a ParseError out of the recursion that found it, so
// that no caller goes on to recurse any further.
type nestingTooDeep struct {
	err *ParseError
}

// Parser for Lino notation.
type Parser struct {
	MaxInputSize int

	// MaxDepth is the deepest nesting the parser accepts. Every parenthesized
	// group and every indentation level is one level, and the lines of a
	// document are at level 0. A document nested deeper is refused with a
	// ParseError matching ErrNestingTooDeep instead of being recursed into
	// until the stack is exhausted.
	MaxDepth int

	// Comments tells whether # starts a comment that runs to the end of its
	// line; when false it is an ordinary character.
	Comments bool

	// Internal state
	source          string
	text            string
	lines           []string
	lineOffsets     []int
	pos             int
	depth           int
	indentStack     []int
	baseIndentation *int
}

// NewParser creates a new Parser with default settings.
func NewParser() *Parser {
	return &Parser{
		MaxInputSize: 10 * 1024 * 1024, // 10MB
		MaxDepth:     DefaultMaxDepth,
		Comments:     true,
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

	// Comments are blanked rather than removed, so every byte keeps the
	// position it was written at.
	prepared := input
	if p.Comments {
		prepared = StripComments(input)
	}

	p.source = input
	p.text = prepared
	p.lines, p.lineOffsets = p.splitLinesRespectingQuotes(prepared)
	p.pos = 0
	p.depth = 0
	p.indentStack = []int{0}
	p.baseIndentation = nil

	rawResult, err := p.parseRoot()
	if err != nil {
		return nil, err
	}
	return p.transformResult(rawResult), nil
}

// parseRoot parses the prepared document, turning a refusal to nest any deeper
// into the error it carries.
func (p *Parser) parseRoot() (result []*internalLink, err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			refusal, ok := recovered.(nestingTooDeep)
			if !ok {
				panic(recovered)
			}
			result, err = nil, refusal.err
		}
	}()
	return p.parseDocument(), nil
}

// checkDepth refuses, for good, a level deeper than MaxDepth. offset is where
// in the document the level that is one too deep opens.
func (p *Parser) checkDepth(depth, offset int) {
	if depth <= p.MaxDepth {
		return
	}
	// The error quotes the document as the caller wrote it rather than the
	// copy with its comments blanked; both have every byte at the same offset.
	panic(nestingTooDeep{err: newNestingTooDeepError(p.source, offset, p.MaxDepth)})
}

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
// and handling multiline parenthesized expressions. It also returns the byte
// offset in text each line starts at.
func (p *Parser) splitLinesRespectingQuotes(text string) ([]string, []int) {
	var lines []string
	var offsets []int
	var currentLine strings.Builder
	lineStart := 0
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
				offsets = append(offsets, lineStart)
				currentLine.Reset()
				lineStart = i + 1
			}
		} else {
			currentLine.WriteByte(char)
		}

		i++
	}

	// Add the last line if non-empty
	if currentLine.Len() > 0 {
		lines = append(lines, currentLine.String())
		offsets = append(offsets, lineStart)
	}

	return lines, offsets
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
	lineOffset := p.lineOffsets[p.pos]
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

	contentOffset := lineOffset + leadingSpaceLength(line)
	p.pos++

	// Try to parse the line
	element := p.parseLineContent(content, contentOffset)
	// Only a line that parsed counts, so a group too deep inside it is reported
	// at its own parenthesis, and trailing spaces are never taken for a line.
	p.checkDepth(p.depth, contentOffset)

	// Check for children (indented lines that follow). They are one level
	// deeper than this line, and the first of them sets the indentation the
	// rest have to keep.
	var children []*internalLink
	childIndent := -1
	p.depth++

	for p.pos < len(p.lines) {
		// A line holding nothing does not close a block: the block goes on at
		// the next line that holds something. Blanking a comment leaves such a
		// line behind, so this is also what keeps a block together around a
		// comment written inside it.
		following := p.pos
		for following < len(p.lines) && strings.TrimSpace(p.lines[following]) == "" {
			following++
		}
		if following >= len(p.lines) {
			break
		}

		rawNextIndent := countLeadingSpaces(p.lines[following])
		nextIndent := rawNextIndent - base
		if nextIndent < 0 {
			nextIndent = 0
		}

		if nextIndent <= indent {
			break
		}
		// A line indented less than the first child closes this block: it
		// belongs to an enclosing one.
		if childIndent >= 0 && nextIndent < childIndent {
			break
		}
		if childIndent < 0 {
			childIndent = nextIndent
		}

		p.pos = following
		child := p.parseElement(childIndent)
		if child != nil {
			children = append(children, child)
		}
	}

	p.depth--

	if len(children) > 0 {
		element.children = children
	}

	return element
}

// leadingSpaceLength is the number of bytes of white space s starts with.
func leadingSpaceLength(s string) int {
	return len(s) - len(strings.TrimLeftFunc(s, unicode.IsSpace))
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

// parseLineContent parses the content of one line; offset is where in the
// document the content starts.
func (p *Parser) parseLineContent(content string, offset int) *internalLink {
	// A whole parenthesized group: (id: values), (values) or a nested document
	if strings.HasPrefix(content, "(") && p.findMatchingParen(content, 0) == len(content)-1 {
		return p.parseParenthesized(content[1:len(content)-1], offset)
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
		afterColon := content[colonPos+1:]
		valuesPart := strings.TrimSpace(afterColon)
		ref := p.extractReference(idPart)
		values := p.parseValues(valuesPart, offset+colonPos+1+leadingSpaceLength(afterColon))
		return &internalLink{id: &ref, values: values}
	}

	// Simple value list
	values := p.parseValues(content, offset)
	return &internalLink{values: values}
}

// parseParenthesized parses the content of a parenthesized group.
//
// The group opens a nested context that starts fresh at indentation level zero
// and follows exactly the rules used at the root of the document, so line breaks
// separate links and indentation nests them. The group is one level deeper
// than the line it is written on, and is refused when that is deeper than
// MaxDepth; offset is where in the document its opening parenthesis is.
func (p *Parser) parseParenthesized(inner string, offset int) *internalLink {
	p.checkDepth(p.depth+1, offset)
	return &internalLink{nested: p.parseNestedDocument(inner, offset+1), isNested: true}
}

// parseNestedDocument parses the text of a parenthesized group as a document of
// its own, whose lines are one level deeper than the line the group is written
// on. offset is where in the document inner starts.
func (p *Parser) parseNestedDocument(inner string, offset int) []*internalLink {
	savedLines := p.lines
	savedLineOffsets := p.lineOffsets
	savedPos := p.pos
	savedDepth := p.depth
	savedBaseIndentation := p.baseIndentation
	savedIndentStack := p.indentStack

	p.lines, p.lineOffsets = p.splitLinesRespectingQuotes(inner)
	for index := range p.lineOffsets {
		p.lineOffsets[index] += offset
	}
	p.pos = 0
	p.depth = savedDepth + 1
	p.baseIndentation = nil
	p.indentStack = []int{0}
	nested := p.parseDocument()

	p.lines = savedLines
	p.lineOffsets = savedLineOffsets
	p.pos = savedPos
	p.depth = savedDepth
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

// parseValues parses a space separated list of values; offset is where in the
// document text starts.
func (p *Parser) parseValues(text string, offset int) []*internalLink {
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
			values = append(values, p.parseValue(valueText, offset+i))
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

// parseValue parses one value; offset is where in the document it starts.
func (p *Parser) parseValue(value string, offset int) *internalLink {
	// Nested link in parentheses
	if strings.HasPrefix(value, "(") && p.findMatchingParen(value, 0) == len(value)-1 {
		return p.parseParenthesized(value[1:len(value)-1], offset)
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
			childValues = append(childValues, p.transformIndentedValue(child))
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

// transformIndentedValue turns one child line and its descendants into a value.
func (p *Parser) transformIndentedValue(item *internalLink) *Link {
	children := item.children
	if len(children) > 0 && item.id != nil && len(item.values) == 0 {
		values := make([]*Link, 0, len(children))
		for _, child := range children {
			values = append(values, p.transformIndentedValue(child))
		}
		return &Link{ID: item.id, Values: values}
	}

	current := p.transformLink(item)
	if len(children) > 0 {
		values := append([]*Link{}, current.Values...)
		for _, child := range children {
			values = append(values, p.transformIndentedValue(child))
		}
		return &Link{ID: current.ID, Values: values}
	}
	if item.id == nil && !item.isNested && len(current.Values) == 1 {
		return current.Values[0]
	}
	return current
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
