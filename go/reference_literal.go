package lino

import (
	"encoding/hex"
	"fmt"
	"math"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

var literalPrefix = regexp.MustCompile(`^~[0-9]+\{`)
var literalPattern = regexp.MustCompile(`^~([0-9]+)\{([0-9a-fA-F]*)\}$`)

// EncodeReferenceLiteral encodes exact Unicode as a version 1 UTF-8 hex literal.
// Invalid UTF-8 is refused rather than silently replaced.
func EncodeReferenceLiteral(text string) (string, error) {
	if !utf8.ValidString(text) {
		return "", fmt.Errorf("reference must be valid UTF-8")
	}
	return `~1{` + hex.EncodeToString([]byte(text)) + `}`, nil
}

// DecodeReferenceLiteral decodes a complete literal, rejecting invalid versions and UTF-8.
func DecodeReferenceLiteral(literal string) (string, error) {
	match := literalPattern.FindStringSubmatch(literal)
	if match == nil || match[1] != "1" || len(match[2])%2 != 0 {
		return "", fmt.Errorf("invalid or unsupported reference literal (expected ~1{UTF-8 hex})")
	}
	data, err := hex.DecodeString(match[2])
	if err != nil || !utf8.Valid(data) {
		return "", fmt.Errorf("reference literal must contain valid UTF-8")
	}
	return string(data), nil
}

type referenceLiteralError struct{ err error }

func formatReference(text string) string {
	if !utf8.ValidString(text) {
		panic("reference must be valid UTF-8")
	}
	if text == "" || strings.IndexFunc(text, func(r rune) bool { return r < 32 || r == 127 }) >= 0 {
		literal, _ := EncodeReferenceLiteral(text)
		return literal
	}
	needs := literalPrefix.MatchString(text) || strings.HasPrefix(text, "#") || strings.IndexFunc(text, func(r rune) bool {
		return unicode.IsSpace(r) || r == 0xfeff || strings.ContainsRune("():\"'`", r)
	}) >= 0
	if !needs {
		return text
	}
	chosen, count := rune(0), int(math.MaxInt)
	for _, q := range []rune{'\'', '"', '`'} {
		if strings.HasPrefix(text, string(q)) {
			continue
		}
		longest, run := 0, 0
		for _, r := range text {
			if r == q {
				run++
			} else {
				run = 0
			}
			longest = max(longest, run)
		}
		n := (longest + 1) | 1
		if n < count {
			chosen, count = q, n
		}
	}
	delimiter := strings.Repeat(string(chosen), count)
	return delimiter + text + delimiter
}
