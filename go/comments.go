package lino

// Comments, and the rule that decides where one starts.
//
// # starts a comment when it opens a token and is not a value:
//
//   - at the start of a line, after any indentation, a # always starts one;
//   - later on a line, after a space or a tab, a # starts one only when no
//     character that could continue a bare reference follows it, that is when
//     whitespace, the end of the document, "(", ")" or ":" comes next. So
//     "a: b # why" and "a: b #" hold a comment, while "tag #release" is the
//     link of tag and #release (issue #444): a value is never silently dropped.
//
// A # written inside a token (issue#1047) or inside a delimited reference
// ("# not a comment") is an ordinary character.
//
// StripComments replaces every byte of every comment with a space rather than
// removing it, so every later byte keeps the position it had in the document
// the caller wrote, and anything reported about a position still points at
// what the reader can see.

import "strings"

// Comment is the character that starts a comment.
const Comment = '#'

// separators lists what ends a bare reference. A token starts after one of
// these, at the start of the document, and right after a delimited reference
// or a versioned literal: the places the parser reads a reference from.
const separators = " \t\n\r(:)"

// beforeComment lists what a comment may start after.
const beforeComment = " \t\n\r"

// commentIndentation lists what may stand between the start of a line and a comment.
const commentIndentation = " \t"

// opensComment reports whether the # at position of document starts a
// comment: it opens a token, and either only indentation stands before it on
// its line or no character that could continue a bare reference follows it.
//
//	opensComment("# note", 0)       // true: the start of a line
//	opensComment("a #", 2)          // true: nothing follows it
//	opensComment("a # why", 2)      // true: a space follows it
//	opensComment("tag #release", 4) // false: a value
//	opensComment("issue#1047", 5)   // false: inside a token
func opensComment(document string, position int) bool {
	if position < 0 || position >= len(document) || document[position] != Comment {
		return false
	}
	if !follows(document, position, beforeComment) {
		return false
	}
	before := position - 1
	for before >= 0 && strings.IndexByte(commentIndentation, document[before]) >= 0 {
		before--
	}
	if before < 0 || document[before] == '\n' || document[before] == '\r' {
		return true
	}
	next := position + 1
	return next >= len(document) || strings.IndexByte(separators, document[next]) >= 0
}

// StripComments returns document with every comment blanked out. The result
// has the same length as the document it was given. Where a comment starts is
// decided by opensComment, so StripComments("tag #release # note\n") keeps
// "#release" and blanks "# note".
//
// The document is read token by token, the way the parser reads it, so a # inside
// a delimited reference that starts right after a group, another reference or a
// literal is content, as it is in one that starts after a space (issue #377).
func StripComments(document string) string {
	var blanked []byte
	position := 0
	// Whether a token may start at position.
	tokenStart := true

	for position < len(document) {
		char := document[position]

		if char == Comment && opensComment(document, position) {
			if blanked == nil {
				blanked = []byte(document)
			}
			for position < len(document) && document[position] != '\n' && document[position] != '\r' {
				blanked[position] = ' '
				position++
			}
			continue
		}

		if strings.IndexByte(separators, char) >= 0 {
			tokenStart = true
			position++
			continue
		}

		if tokenStart {
			if end := delimitedTokenEnd(document, position); end >= 0 {
				position = end
				continue
			}
		}

		// Anything else is part of a bare reference, which runs to a separator.
		tokenStart = false
		position++
	}

	if blanked == nil {
		return document
	}
	return string(blanked)
}

// delimitedTokenEnd is the position just past the versioned literal or
// delimited reference that starts the token at start, or -1 when the token
// there is a bare reference: a delimiter run that never closes is read as one,
// as the parser reads it.
func delimitedTokenEnd(document string, start int) int {
	if end := referenceLiteralEnd(document, start); end >= 0 {
		return end
	}
	if isQuote(document[start]) {
		if _, end, ok := parseQuotedStringAt(document, start); ok {
			return end
		}
	}
	return -1
}

// isQuote reports whether char is one of the delimiters a reference can be
// written between.
func isQuote(char byte) bool {
	return char == '"' || char == '\'' || char == '`'
}

// follows reports whether the byte before position is one of allowed, the start
// of the document counting as allowed.
func follows(document string, position int, allowed string) bool {
	if position == 0 {
		return true
	}
	previous := document[position-1]
	for index := 0; index < len(allowed); index++ {
		if allowed[index] == previous {
			return true
		}
	}
	return false
}
