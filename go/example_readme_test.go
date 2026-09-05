package lino

import "fmt"

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
