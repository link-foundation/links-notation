package lino

// Comments, and the rule that decides where one starts.
//
// # starts a comment when it opens a token: at the start of the document or
// after a space, a tab or a line break. A # written inside a token
// (issue#1047) or inside a delimited reference ("# not a comment") is an
// ordinary character.
//
// StripComments replaces every byte of every comment with a space rather than
// removing it, so every later byte keeps the position it had in the document
// the caller wrote, and anything reported about a position still points at
// what the reader can see.

// Comment is the character that starts a comment.
const Comment = '#'

// beforeReference lists what a delimited reference may start after.
const beforeReference = " \t\n\r(:"

// beforeComment lists what a comment may start after.
const beforeComment = " \t\n\r"

// StripComments returns document with every comment blanked out. The result
// has the same length as the document it was given.
func StripComments(document string) string {
	var blanked []byte
	position := 0

	for position < len(document) {
		char := document[position]

		if isQuote(char) && follows(document, position, beforeReference) {
			if _, end, ok := parseQuotedStringAt(document, position); ok {
				position = end
			} else {
				position++
			}
			continue
		}

		if char == Comment && follows(document, position, beforeComment) {
			if blanked == nil {
				blanked = []byte(document)
			}
			for position < len(document) && document[position] != '\n' && document[position] != '\r' {
				blanked[position] = ' '
				position++
			}
			continue
		}

		position++
	}

	if blanked == nil {
		return document
	}
	return string(blanked)
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
