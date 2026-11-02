package lino

// The concrete syntax tree of a Links Notation document.
//
// Every byte of a document belongs to exactly one token, so the text of the
// tree is the document itself, comments, blank lines, indentation, quotes and
// line endings included. A document is a list of line nodes; a line holds the
// tokens up to and including its line ending, and a parenthesized group node
// holds its own parentheses and the lines written between them. A group is
// part of the line it opens on, however many lines it spans.
//
// The tree records how a document was written; Parser.Parse reads what it
// means. They agree because a document is parsed before its tree is built, and
// the tokens are read with the same rules the parser uses: comments are found
// by StripComments, delimited references by the parser's delimited-reference
// reader and versioned literals by the same pattern.

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// CstKind is the kind of a node or token of a concrete syntax tree.
type CstKind string

// The kinds of nodes and tokens of a concrete syntax tree.
const (
	// CstDocument is the whole document: its lines.
	CstDocument CstKind = "document"
	// CstLine is one line: its tokens and groups, up to and including its line
	// ending.
	CstLine CstKind = "line"
	// CstGroup is a parenthesized group: "(", the lines inside it, and ")".
	CstGroup CstKind = "group"
	// CstWhitespace is a run of spaces and tabs.
	CstWhitespace CstKind = "whitespace"
	// CstNewline is one line ending: "\n", "\r\n" or "\r".
	CstNewline CstKind = "newline"
	// CstComment is a comment, from # up to the line ending.
	CstComment CstKind = "comment"
	// CstOpenParen is "(".
	CstOpenParen CstKind = "open_paren"
	// CstCloseParen is ")".
	CstCloseParen CstKind = "close_paren"
	// CstColon is ":".
	CstColon CstKind = "colon"
	// CstReference is a bare, quoted or versioned literal reference.
	CstReference CstKind = "reference"
)

// IsToken reports whether nodes of this kind are tokens rather than nodes with
// children.
func (k CstKind) IsToken() bool {
	return k != CstDocument && k != CstLine && k != CstGroup
}

// CstNode is one node or token of a concrete syntax tree.
type CstNode struct {
	// Kind is what this node or token is.
	Kind CstKind
	// Children are the children of a node, in document order; empty for a
	// token.
	Children []*CstNode
	// Value is what a reference token means, its delimiters and escapes
	// resolved (the ID a parsed link has); nil for every other node and token.
	Value *string
	// Quote is the delimiter a quoted reference token was written between
	// ("'", "\"" or "`"); "" for a bare or literal reference and every other
	// kind, as Link.Quote reports it.
	Quote string

	text string
}

// IsToken reports whether this is a token rather than a node with children.
func (n *CstNode) IsToken() bool {
	return n.Kind.IsToken()
}

// Text is the exact text this node or token was read from. For a node it is
// the text of its children, one after another.
func (n *CstNode) Text() string {
	if n.IsToken() {
		return n.text
	}
	var text strings.Builder
	n.writeText(&text)
	return text.String()
}

func (n *CstNode) writeText(text *strings.Builder) {
	if n.IsToken() {
		text.WriteString(n.text)
		return
	}
	for _, child := range n.Children {
		child.writeText(text)
	}
}

// String is the exact text this node or token was read from, the same as Text.
func (n *CstNode) String() string {
	return n.Text()
}

// Tokens returns every token of this subtree, in document order.
func (n *CstNode) Tokens() []*CstNode {
	var tokens []*CstNode
	n.collectTokens(&tokens)
	return tokens
}

func (n *CstNode) collectTokens(tokens *[]*CstNode) {
	if n.IsToken() {
		*tokens = append(*tokens, n)
		return
	}
	for _, child := range n.Children {
		child.collectTokens(tokens)
	}
}

// SExpression writes the tree as an S-expression: (kind child ...) for a node
// and kind:"text" for a token, the text with \, ", line feeds, carriage
// returns and tabs escaped and every other character written as is. Two trees
// are the same exactly when their S-expressions are.
//
// For the document a '1' it is
//
//	(document (line reference:"a" whitespace:" " reference:"'1'"))
func (n *CstNode) SExpression() string {
	var expression strings.Builder
	n.writeSExpression(&expression)
	return expression.String()
}

func (n *CstNode) writeSExpression(expression *strings.Builder) {
	if n.IsToken() {
		expression.WriteString(string(n.Kind))
		expression.WriteString(`:"`)
		sExpressionEscaper.WriteString(expression, n.text)
		expression.WriteByte('"')
		return
	}
	expression.WriteByte('(')
	expression.WriteString(string(n.Kind))
	for _, child := range n.Children {
		expression.WriteByte(' ')
		child.writeSExpression(expression)
	}
	expression.WriteByte(')')
}

var sExpressionEscaper = strings.NewReplacer(
	`\`, `\\`,
	`"`, `\"`,
	"\n", `\n`,
	"\r", `\r`,
	"\t", `\t`,
)

// ParseCst reads the document as a lossless concrete syntax tree: every byte
// of the input, comments and whitespace included, belongs to exactly one
// token, so ParseCst(input).String() == input. The document is first parsed
// with this parser's options, so it is refused whenever Parse would refuse it,
// with the same error. A document whose parentheses do not balance is refused
// as well.
func (p *Parser) ParseCst(input string) (*CstNode, error) {
	if _, err := p.Parse(input); err != nil {
		return nil, err
	}
	return buildCst(input, p.Comments)
}

// cstLiteral is a versioned literal at the start of the text it is matched
// against.
var cstLiteral = regexp.MustCompile(`^~[0-9]+\{[^} \t\r\n()]*\}`)

// bareReferenceEnd lists what ends a bare reference.
const bareReferenceEnd = " \t\r\n(:)"

// cstContainer is an open container of a tree being built: the document or a
// group, with the line being filled, if any.
type cstContainer struct {
	node *CstNode
	line *CstNode
}

// ErrUnbalancedParentheses is matched by errors.Is for the error ParseCst
// returns when a document's parentheses do not balance.
var ErrUnbalancedParentheses = errors.New("unbalanced parentheses")

// buildCst builds the concrete syntax tree of a document that has already been
// parsed. comments tells whether # starts a comment.
func buildCst(input string, comments bool) (*CstNode, error) {
	// References are read in the document the parser reads: the one with its
	// comments blanked, which keeps every byte at the offset it was written at.
	prepared := input
	if comments {
		prepared = StripComments(input)
	}
	document := &CstNode{Kind: CstDocument}
	// The open containers, innermost last.
	containers := []*cstContainer{{node: document}}

	add := func(node *CstNode) {
		container := containers[len(containers)-1]
		if container.line == nil {
			container.line = &CstNode{Kind: CstLine}
			container.node.Children = append(container.node.Children, container.line)
		}
		container.line.Children = append(container.line.Children, node)
	}
	token := func(kind CstKind, start, end int) *CstNode {
		return &CstNode{Kind: kind, text: input[start:end]}
	}

	position := 0
	for position < len(input) {
		character := input[position]
		end := position + 1

		switch {
		case comments && character == Comment && prepared[position] != Comment:
			// A blanked # opens a comment, which runs to the line ending.
			for end < len(input) && input[end] != '\n' && input[end] != '\r' {
				end++
			}
			add(token(CstComment, position, end))
		case character == '\r' || character == '\n':
			if character == '\r' && end < len(input) && input[end] == '\n' {
				end++
			}
			add(token(CstNewline, position, end))
			containers[len(containers)-1].line = nil
		case character == ' ' || character == '\t':
			for end < len(input) && (input[end] == ' ' || input[end] == '\t') {
				end++
			}
			add(token(CstWhitespace, position, end))
		case character == '(':
			group := &CstNode{Kind: CstGroup, Children: []*CstNode{token(CstOpenParen, position, end)}}
			add(group)
			containers = append(containers, &cstContainer{node: group})
		case character == ')':
			if len(containers) == 1 {
				return nil, fmt.Errorf(`%w: ")" at offset %d`, ErrUnbalancedParentheses, position)
			}
			group := containers[len(containers)-1].node
			group.Children = append(group.Children, token(CstCloseParen, position, end))
			containers = containers[:len(containers)-1]
		case character == ':':
			add(token(CstColon, position, end))
		default:
			reference := readCstReference(input, prepared, position)
			end = position + len(reference.text)
			add(reference)
		}
		position = end
	}

	if len(containers) != 1 {
		return nil, fmt.Errorf(`%w: "(" not closed at the end of the document`, ErrUnbalancedParentheses)
	}
	return document, nil
}

// readCstReference reads the reference token that starts at start, its end
// found in prepared as the parser finds it, its text taken from input.
func readCstReference(input, prepared string, start int) *CstNode {
	if prepared[start] == '~' {
		if match := cstLiteral.FindStringIndex(prepared[start:]); match != nil {
			text := input[start : start+match[1]]
			value, err := DecodeReferenceLiteral(text)
			if err != nil {
				// Parse refuses a malformed literal, so this is never reached
				// for a parsed document; keep the text as written.
				value = text
			}
			return &CstNode{Kind: CstReference, text: text, Value: &value}
		}
	}
	if isQuote(prepared[start]) {
		if value, end, ok := parseQuotedStringAt(prepared, start); ok {
			return &CstNode{Kind: CstReference, text: input[start:end], Value: &value, Quote: input[start : start+1]}
		}
	}
	end := start + 1
	for end < len(prepared) && strings.IndexByte(bareReferenceEnd, prepared[end]) < 0 {
		end++
	}
	text := input[start:end]
	return &CstNode{Kind: CstReference, text: text, Value: &text}
}
