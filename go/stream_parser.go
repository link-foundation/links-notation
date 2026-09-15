package lino

import (
	"errors"
	"fmt"
	"iter"
	"strings"
)

const defaultMaxBufferSize = 10 * 1024 * 1024

// StreamPosition describes the point immediately after the last byte fed to a
// StreamParser. Buffered is the size of the one unresolved top-level record.
type StreamPosition struct {
	Offset   int
	Line     int
	Column   int
	Buffered int
}

// StreamParseError reports a canonical parser error in coordinates relative
// to the complete stream rather than the currently buffered record.
type StreamParseError struct {
	Err    error
	Offset int
	Line   int
	Column int
}

func (e *StreamParseError) Error() string {
	return fmt.Sprintf("stream parse error at line %d, column %d: %v", e.Line, e.Column, e.Err)
}

func (e *StreamParseError) Unwrap() error { return e.Err }

// StreamParser incrementally emits complete top-level Links Notation records.
// It implements io.Writer; Feed additionally returns records completed by a
// string chunk. Set Collect to false when processing an unbounded stream only
// through OnLink or the returned slices.
type StreamParser struct {
	Parser        *Parser
	OnLink        func(*Link)
	Collect       bool
	MaxBufferSize int

	buffer          strings.Builder
	currentLine     strings.Builder
	baseIndentation int
	hasBase         bool
	lineClassified  bool
	links           []*Link
	offset          int
	line            int
	column          int
	segmentOffset   int
	segmentLine     int
	ended           bool
}

// NewStreamParser creates a streaming parser backed by the canonical Parser.
func NewStreamParser() *StreamParser {
	return NewStreamParserWithParser(NewParser())
}

// NewStreamParserWithParser creates a streaming parser with parser's options.
func NewStreamParserWithParser(parser *Parser) *StreamParser {
	if parser == nil {
		parser = NewParser()
	}
	stream := &StreamParser{
		Parser:        parser,
		Collect:       true,
		MaxBufferSize: defaultMaxBufferSize,
	}
	stream.Reset()
	return stream
}

// Write implements io.Writer.
func (p *StreamParser) Write(chunk []byte) (int, error) {
	if p.ended {
		return 0, errors.New("cannot write after Finish")
	}
	for index, character := range chunk {
		if _, err := p.feedByte(character); err != nil {
			return index, err
		}
	}
	return len(chunk), nil
}

// Feed consumes chunk and returns the links made complete by it.
func (p *StreamParser) Feed(chunk string) ([]*Link, error) {
	if p.ended {
		return nil, errors.New("cannot write after Finish")
	}
	emitted := make([]*Link, 0)
	for index := 0; index < len(chunk); index++ {
		links, err := p.feedByte(chunk[index])
		if err != nil {
			return nil, err
		}
		emitted = append(emitted, links...)
	}
	return emitted, nil
}

func (p *StreamParser) feedByte(character byte) ([]*Link, error) {
	p.currentLine.WriteByte(character)
	p.offset++
	emitted := make([]*Link, 0)

	if character == '\n' {
		p.buffer.WriteString(p.currentLine.String())
		p.currentLine.Reset()
		p.lineClassified = false
		p.line++
		p.column = 1
	} else {
		if !p.lineClassified && character != ' ' && character != '\t' && character != '\r' {
			p.lineClassified = true
			if !(p.Parser.Comments && character == Comment) {
				indentation := leadingSpaces(p.currentLine.String())
				emitted = append(emitted, p.startContentLine(indentation)...)
			}
		}
		p.column++
	}

	if p.buffer.Len()+p.currentLine.Len() > p.MaxBufferSize {
		return nil, fmt.Errorf("buffered record exceeds maximum size of %d bytes", p.MaxBufferSize)
	}
	return emitted, nil
}

// Finish consumes an optional final chunk and ends the stream. When Collect is
// true it returns all undrained links; otherwise only links emitted by this call.
func (p *StreamParser) Finish(chunk ...string) ([]*Link, error) {
	if len(chunk) > 1 {
		return nil, errors.New("Finish accepts at most one chunk")
	}
	if p.ended {
		if p.Collect {
			return append([]*Link(nil), p.links...), nil
		}
		return nil, nil
	}
	emitted := make([]*Link, 0)
	if len(chunk) == 1 {
		links, err := p.Feed(chunk[0])
		if err != nil {
			return nil, err
		}
		emitted = append(emitted, links...)
	}

	document := p.buffer.String() + p.currentLine.String()
	if document != "" {
		links, err := p.Parser.Parse(document)
		if err != nil {
			return nil, p.streamError(err, document)
		}
		p.publish(links, &emitted)
		p.advanceSegment(document)
	}
	p.buffer.Reset()
	p.currentLine.Reset()
	p.hasBase = false
	p.ended = true
	if p.Collect {
		return append([]*Link(nil), p.links...), nil
	}
	return emitted, nil
}

// Drain returns and forgets links retained since the previous call.
func (p *StreamParser) Drain() []*Link {
	links := p.links
	p.links = nil
	return links
}

// Reset makes the parser reusable while preserving its configuration and callback.
func (p *StreamParser) Reset() {
	p.buffer.Reset()
	p.currentLine.Reset()
	p.hasBase = false
	p.lineClassified = false
	p.links = nil
	p.offset = 0
	p.line = 1
	p.column = 1
	p.segmentOffset = 0
	p.segmentLine = 1
	p.ended = false
}

// Position returns the absolute stream position and unresolved buffer size.
func (p *StreamParser) Position() StreamPosition {
	return StreamPosition{
		Offset:   p.offset,
		Line:     p.line,
		Column:   p.column,
		Buffered: p.buffer.Len() + p.currentLine.Len(),
	}
}

func (p *StreamParser) startContentLine(indentation int) []*Link {
	emitted := make([]*Link, 0)
	document := p.buffer.String()
	if document != "" && p.hasBase && indentation <= p.baseIndentation && structurallyComplete(document, p.Parser.Comments) {
		if links, err := p.Parser.Parse(document); err == nil {
			p.publish(links, &emitted)
			p.advanceSegment(document)
			p.buffer.Reset()
			p.hasBase = false
		}
	}
	if !p.hasBase {
		p.baseIndentation = indentation
		p.hasBase = true
	}
	return emitted
}

func (p *StreamParser) publish(links []*Link, emitted *[]*Link) {
	for _, link := range links {
		*emitted = append(*emitted, link)
		if p.Collect {
			p.links = append(p.links, link)
		}
		if p.OnLink != nil {
			p.OnLink(link)
		}
	}
}

func (p *StreamParser) advanceSegment(document string) {
	p.segmentOffset += len(document)
	p.segmentLine += strings.Count(document, "\n")
}

func (p *StreamParser) streamError(err error, document string) error {
	localOffset := 0
	var parseError *ParseError
	if errors.As(err, &parseError) {
		localOffset = parseError.Pos
	}
	if localOffset < 0 || localOffset > len(document) {
		localOffset = 0
	}
	before := document[:localOffset]
	line := p.segmentLine + strings.Count(before, "\n")
	column := localOffset - strings.LastIndex(before, "\n")
	return &StreamParseError{Err: err, Offset: p.segmentOffset + localOffset, Line: line, Column: column}
}

// ParseChunks lazily emits links from a sequence of string chunks. Supplying a
// nil parser uses the default canonical parser.
func ParseChunks(chunks iter.Seq[string], parser *Parser) iter.Seq2[*Link, error] {
	return func(yield func(*Link, error) bool) {
		stream := NewStreamParserWithParser(parser)
		stream.Collect = false
		for chunk := range chunks {
			links, err := stream.Feed(chunk)
			if err != nil {
				yield(nil, err)
				return
			}
			for _, link := range links {
				if !yield(link, nil) {
					return
				}
			}
		}
		links, err := stream.Finish()
		if err != nil {
			yield(nil, err)
			return
		}
		for _, link := range links {
			if !yield(link, nil) {
				return
			}
		}
	}
}

func leadingSpaces(line string) int {
	indentation := 0
	for indentation < len(line) && line[indentation] == ' ' {
		indentation++
	}
	return indentation
}

func structurallyComplete(document string, comments bool) bool {
	depth := 0
	for position := 0; position < len(document); position++ {
		character := document[position]
		if isQuote(character) && follows(document, position, beforeReference) {
			_, end, ok := parseQuotedStringAt(document, position)
			if !ok {
				return false
			}
			position = end - 1
			continue
		}
		if comments && character == Comment && follows(document, position, beforeComment) {
			if newline := strings.IndexByte(document[position:], '\n'); newline >= 0 {
				position += newline
				continue
			}
			break
		}
		if character == '(' {
			depth++
		} else if character == ')' {
			depth--
		}
	}
	return depth == 0
}
