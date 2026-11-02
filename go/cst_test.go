package lino

import (
	"errors"
	"reflect"
	"testing"
)

func mustParseCst(t *testing.T, parser *Parser, input string) *CstNode {
	t.Helper()
	cst, err := parser.ParseCst(input)
	if err != nil {
		t.Fatal(err)
	}
	return cst
}

func TestCstIsALosslessViewOfADocument(t *testing.T) {
	input := "(t 1 '1')"
	cst := mustParseCst(t, NewParser(), input)
	if cst.Kind != CstDocument || cst.IsToken() {
		t.Fatalf("root kind: %q", cst.Kind)
	}
	if cst.String() != input || cst.Text() != input {
		t.Fatalf("text: %q", cst.String())
	}
	want := `(document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" whitespace:" " reference:"'1'") close_paren:")")))`
	if got := cst.SExpression(); got != want {
		t.Fatalf("S-expression:\n got %s\nwant %s", got, want)
	}
}

func TestCstReferenceTokensCarryTheirValueAndDelimiter(t *testing.T) {
	cst := mustParseCst(t, NewParser(), "(a \"b c\" ~1{64} ''e''''f'')")
	var got [][3]any
	for _, token := range cst.Tokens() {
		if token.Kind != CstReference {
			if token.Value != nil || token.Quote != "" {
				t.Fatalf("%s token with a value or quote", token.Kind)
			}
			continue
		}
		got = append(got, [3]any{token.Text(), *token.Value, token.Quote})
	}
	want := [][3]any{
		{"a", "a", ""},
		{`"b c"`, "b c", `"`},
		{"~1{64}", "d", ""},
		{"''e''''f''", "e''f", "'"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func TestCstRecoversDocumentsExactly(t *testing.T) {
	cases := map[string]string{
		"empty":                       "",
		"only whitespace":             " \t ",
		"blank lines":                 "\n\n",
		"CRLF and CR":                 "a\r\nb\rc\r\n",
		"tabs and trailing spaces":    "a\t b  \n",
		"comments everywhere":         "# head\na: b # tail\n  # inner\n  c\n# end",
		"multiline quotes":            "(note: \"one\n  two\r\nthree\")",
		"nested groups over lines":    "(a (b\n  (c d)\n) e)\n",
		"indentation":                 "root:\n  child:\n    leaf\n  tail",
		"literals":                    "(~1{} ~1{e6a0b9})",
		"comment marks inside quotes": "('#a' \"b # c\" `#`)",
		"unicode":                     "(根: café 🙂)\n",
	}
	for name, input := range cases {
		t.Run(name, func(t *testing.T) {
			if got := mustParseCst(t, NewParser(), input).String(); got != input {
				t.Fatalf("got %q, want %q", got, input)
			}
		})
	}
	if got := mustParseCst(t, NewParser(), "").SExpression(); got != "(document)" {
		t.Fatalf("empty document: %s", got)
	}
}

func TestCstReadsHashAsReferenceTextWithoutComments(t *testing.T) {
	parser := NewParser()
	parser.Comments = false
	input := "a #b"
	cst := mustParseCst(t, parser, input)
	if cst.String() != input {
		t.Fatalf("text: %q", cst.String())
	}
	var kinds []CstKind
	for _, token := range cst.Tokens() {
		kinds = append(kinds, token.Kind)
	}
	if want := []CstKind{CstReference, CstWhitespace, CstReference}; !reflect.DeepEqual(kinds, want) {
		t.Fatalf("kinds: %v", kinds)
	}
	if got := mustParseCst(t, NewParser(), input).Tokens()[2].Kind; got != CstComment {
		t.Fatalf("with comments # starts a %s", got)
	}
}

func TestCstGroupBelongsToTheLineItOpensOn(t *testing.T) {
	cst := mustParseCst(t, NewParser(), "a (b\nc)\nd")
	var lines []string
	for _, line := range cst.Children {
		lines = append(lines, line.String())
	}
	if want := []string{"a (b\nc)\n", "d"}; !reflect.DeepEqual(lines, want) {
		t.Fatalf("lines: %q", lines)
	}
	group := cst.Children[0].Children[2]
	if group.Kind != CstGroup {
		t.Fatalf("kind: %q", group.Kind)
	}
	var kinds []CstKind
	for _, child := range group.Children {
		kinds = append(kinds, child.Kind)
	}
	if want := []CstKind{CstOpenParen, CstLine, CstLine, CstCloseParen}; !reflect.DeepEqual(kinds, want) {
		t.Fatalf("group children: %v", kinds)
	}
}

func TestCstRejectsWhatCannotBeParsed(t *testing.T) {
	for _, input := range []string{"(a", "a)"} {
		if _, err := NewParser().ParseCst(input); !errors.Is(err, ErrUnbalancedParentheses) {
			t.Errorf("ParseCst(%q) error = %v, want ErrUnbalancedParentheses", input, err)
		}
	}
	parser := NewParser()
	parser.MaxDepth = 1
	if _, err := parser.ParseCst("((a))"); !errors.Is(err, ErrNestingTooDeep) {
		t.Errorf("ParseCst too deep: error = %v, want ErrNestingTooDeep", err)
	}
	if _, err := NewParser().ParseCst("~1{zz}"); err == nil {
		t.Error("ParseCst must refuse a malformed literal, as Parse does")
	}
}
