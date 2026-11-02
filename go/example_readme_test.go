package lino

import (
	"errors"
	"fmt"
)

// The examples in README.md and README.ru.md, kept as runnable examples so the
// documented output is checked by `go test` rather than trusted. A snippet that
// names a function the package does not have stops compiling here, which is how
// a README that documented a non-existent StrPtr helper went unnoticed.

func ExampleParse() {
	links, err := Parse("papa (lovesMama: loves mama)")
	if err != nil {
		panic(err)
	}
	fmt.Println(Format(links))
	// Output: (papa (lovesMama: loves mama))
}

// A parenthesized group opens a nested context, so a line break inside
// parentheses is structure: the body below is two children, not one flat list.
func ExampleParse_multiLineGroup() {
	document := `value (
  id "1"
  label "one"
)`

	links, _ := Parse(document)
	fmt.Println(Format(links))
	// Output: (value ((id 1) (label one)))
}

// The indented form and the inline form are the same document.
func ExampleParse_indented() {
	indented := `id:
  value1
  value2`

	inline := "(id: value1 value2)"

	indentedLinks, _ := Parse(indented)
	inlineLinks, _ := Parse(inline)
	fmt.Println(Format(indentedLinks) == Format(inlineLinks))
	// Output: true
}

func ExampleLink_Format() {
	id := "id"
	link := NewLink(&id, []*Link{
		NewRef("value1"),
		NewRef("value2"),
	})

	fmt.Println(link.Format(true))
	// Output: id: value1 value2
}

func ExampleLink_FormatWithConfig() {
	id := "id"
	link := NewLink(&id, []*Link{
		NewRef("value1"),
		NewRef("value2"),
		NewRef("value3"),
	})

	config := DefaultFormatConfig().
		WithLessParentheses(true).
		WithIndentByRefCount(3)

	fmt.Println(link.FormatWithConfig(config))
	// Output:
	// id:
	//   value1
	//   value2
	//   value3
}

// A document nested deeper than MaxDepth is refused at the group that is one
// level too deep, instead of being recursed into until the stack runs out.
func ExampleParser_maxDepth() {
	parser := NewParser()
	parser.MaxDepth = 3
	_, err := parser.Parse("((((a))))")

	var parseError *ParseError
	if errors.Is(err, ErrNestingTooDeep) && errors.As(err, &parseError) {
		fmt.Println(parseError.Line, parseError.Column)
		fmt.Println(err)
	}
	// Output:
	// 1 4
	// Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
	// 1 | ((((a))))
	//   |    ^
}

// A parsed link records how its ID was written; equality and formatting do not
// look at it.
func ExampleLink_Quote() {
	links, _ := Parse("(t 1 '1')")
	bare, quoted := links[0].Values[1], links[0].Values[2]
	fmt.Println(*bare.RawID, *quoted.RawID)
	fmt.Printf("%q %q\n", bare.Quote(), quoted.Quote())
	fmt.Println(bare.Equal(quoted), links[0])
	// Output:
	// 1 '1'
	// "" "'"
	// true (t 1 1)
}

// The concrete syntax tree keeps every byte of the document.
func ExampleParser_ParseCst() {
	cst, _ := NewParser().ParseCst("(t 1 '1') # note")
	fmt.Println(cst.String() == "(t 1 '1') # note")
	fmt.Println(cst.SExpression())
	// Output:
	// true
	// (document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" whitespace:" " reference:"'1'") close_paren:")") whitespace:" " comment:"# note"))
}
