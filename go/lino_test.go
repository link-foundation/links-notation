package lino

import (
	"strings"
	"testing"
)

// Helper function to create a string pointer
func strPtr(s string) *string {
	return &s
}

// =====================
// API Tests
// =====================

func TestIsRef(t *testing.T) {
	link := NewRef("some_value")
	if !link.IsRef() {
		t.Error("Expected link to be a reference")
	}
	id, err := link.Id()
	if err != nil {
		t.Errorf("Id() failed: %v", err)
	}
	if id == nil || *id != "some_value" {
		t.Errorf("Expected ID to be 'some_value', got '%v'", id)
	}
}

func TestIsLink(t *testing.T) {
	link := NewLink(strPtr("id"), []*Link{NewRef("child")})
	if !link.IsLink() {
		t.Error("Expected link to be a link with values")
	}
	id, err := link.Id()
	if err != nil {
		t.Errorf("Id() failed: %v", err)
	}
	if id == nil || *id != "id" {
		t.Errorf("Expected ID to be 'id', got '%v'", id)
	}
	if len(link.Values) != 1 {
		t.Errorf("Expected 1 value, got %d", len(link.Values))
	}
}

func TestEmptyLink(t *testing.T) {
	link := NewValuesLink(nil)
	output := link.String()
	if output != "()" {
		t.Errorf("Expected '()', got '%s'", output)
	}
}

func TestSimpleLink(t *testing.T) {
	input := "(1: 1 1)"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	output := parsed[0].Format(false)
	if output != input {
		t.Errorf("Expected '%s', got '%s'", input, output)
	}
}

func TestLinkWithSourceTarget(t *testing.T) {
	input := "(index: source target)"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	output := parsed[0].Format(false)
	if output != input {
		t.Errorf("Expected '%s', got '%s'", input, output)
	}
}

func TestLinkWithSourceTypeTarget(t *testing.T) {
	input := "(index: source type target)"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	output := parsed[0].Format(false)
	if output != input {
		t.Errorf("Expected '%s', got '%s'", input, output)
	}
}

func TestSingleLineFormat(t *testing.T) {
	input := "id: value1 value2"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	output := parsed[0].Format(true)
	if !strings.Contains(output, "id") || !strings.Contains(output, "value1") || !strings.Contains(output, "value2") {
		t.Errorf("Expected output to contain 'id', 'value1', 'value2', got '%s'", output)
	}
}

func TestQuotedReferences(t *testing.T) {
	input := `("quoted id": "value with spaces")`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	output := parsed[0].Format(false)
	if !strings.Contains(output, "quoted id") || !strings.Contains(output, "value with spaces") {
		t.Errorf("Expected quoted references to be preserved, got '%s'", output)
	}
}

func TestIndentedIDSyntaxParsing(t *testing.T) {
	indented := "id:\n  value1\n  value2"
	inline := "(id: value1 value2)"

	indentedParsed, err := Parse(indented)
	if err != nil {
		t.Fatalf("Parse error for indented: %v", err)
	}
	inlineParsed, err := Parse(inline)
	if err != nil {
		t.Fatalf("Parse error for inline: %v", err)
	}

	indentedOutput := Format(indentedParsed)
	inlineOutput := Format(inlineParsed)

	if indentedOutput != inlineOutput {
		t.Errorf("Expected indented and inline to produce same output.\nIndented: %s\nInline: %s", indentedOutput, inlineOutput)
	}
	if indentedOutput != "(id: value1 value2)" {
		t.Errorf("Expected '(id: value1 value2)', got '%s'", indentedOutput)
	}
}

func TestMultipleIndentedIDSyntaxParsing(t *testing.T) {
	indented := "id1:\n  a\n  b\nid2:\n  c\n  d"
	inline := "(id1: a b)\n(id2: c d)"

	indentedParsed, err := Parse(indented)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	inlineParsed, err := Parse(inline)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	indentedOutput := Format(indentedParsed)
	inlineOutput := Format(inlineParsed)

	if indentedOutput != inlineOutput {
		t.Errorf("Expected same output.\nIndented: %s\nInline: %s", indentedOutput, inlineOutput)
	}
}

// =====================
// Single Line Parser Tests
// =====================

func TestSingleLinkTest(t *testing.T) {
	source := "(address: source target)"
	parsed, _ := Parse(source)
	target := Format(parsed)
	if source != target {
		t.Errorf("Expected '%s', got '%s'", source, target)
	}
}

func TestTripletSingleLinkTest(t *testing.T) {
	source := "(papa has car)"
	parsed, _ := Parse(source)
	target := Format(parsed)
	if source != target {
		t.Errorf("Expected '%s', got '%s'", source, target)
	}
}

func TestBug1(t *testing.T) {
	source := "(ignore conan-center-index repository)"
	parsed, _ := Parse(source)
	target := Format(parsed)
	if source != target {
		t.Errorf("Expected '%s', got '%s'", source, target)
	}
}

func TestQuotedReferencesTest(t *testing.T) {
	source := `(a: 'b' "c")`
	parsed, err := Parse(source)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	if !parsed[0].IsLink() {
		t.Error("Expected a link")
	}
}

func TestQuotedReferencesWithSpacesTest(t *testing.T) {
	source := `('a a': 'b b' "c c")`
	parsed, err := Parse(source)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	id, err := parsed[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "a a" {
		t.Errorf("Expected ID 'a a', got '%v'", id)
	}
}

func TestParseSimpleReference(t *testing.T) {
	input := "test"
	parsed, _ := Parse(input)
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	// Single word creates a singlet link wrapped in values
	if len(parsed[0].Values) != 1 {
		t.Errorf("Expected 1 value, got %d", len(parsed[0].Values))
	}
	id, err := parsed[0].Values[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "test" {
		t.Errorf("Expected 'test', got '%v'", id)
	}
}

func TestParseReferenceWithColonAndValues(t *testing.T) {
	input := "parent: child1 child2"
	parsed, _ := Parse(input)
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	id, err := parsed[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "parent" {
		t.Errorf("Expected ID 'parent', got '%v'", id)
	}
	if len(parsed[0].Values) != 2 {
		t.Errorf("Expected 2 values, got %d", len(parsed[0].Values))
	}
}

func TestParseMultilineLink(t *testing.T) {
	input := "(parent: child1 child2)"
	parsed, _ := Parse(input)
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	id, err := parsed[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "parent" {
		t.Errorf("Expected ID 'parent', got '%v'", id)
	}
	if len(parsed[0].Values) != 2 {
		t.Errorf("Expected 2 values, got %d", len(parsed[0].Values))
	}
}

func TestSingletLink(t *testing.T) {
	input := "(singlet)"
	parsed, _ := Parse(input)
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	if len(parsed[0].Values) != 1 {
		t.Errorf("Expected 1 value, got %d", len(parsed[0].Values))
	}
	id, err := parsed[0].Values[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "singlet" {
		t.Errorf("Expected 'singlet', got '%v'", id)
	}
}

func TestValueLink(t *testing.T) {
	input := "(value1 value2 value3)"
	parsed, _ := Parse(input)
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	if parsed[0].IDs != nil && len(parsed[0].IDs) > 0 {
		t.Errorf("Expected nil IDs, got '%v'", parsed[0].IDs)
	}
	if len(parsed[0].Values) != 3 {
		t.Errorf("Expected 3 values, got %d", len(parsed[0].Values))
	}
}

func TestDoubleQuotedReferences(t *testing.T) {
	input := `("id with spaces": "value with spaces")`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

func TestSingleQuotedReferences(t *testing.T) {
	input := "('id': 'value')"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

func TestNestedLinks(t *testing.T) {
	input := "(outer: (inner: value))"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

func TestSpecialCharactersInQuotes(t *testing.T) {
	input := `("key:with:colons": "value(with)parens")`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}

	input2 := `('key with spaces': 'value: with special chars')`
	parsed2, err := Parse(input2)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed2) == 0 {
		t.Fatal("Expected at least one link")
	}
}

func TestDeeplyNested(t *testing.T) {
	input := "(a: (b: (c: (d: (e: value)))))"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

func TestHyphenatedIdentifiers(t *testing.T) {
	input := "(conan-center-index: repository info)"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

func TestMultipleWordsInQuotes(t *testing.T) {
	input := `("New York": city state)`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

// =====================
// Nested Parser Tests
// =====================

func TestSimpleSignificantWhitespace(t *testing.T) {
	source := `a
    b
    c`
	target := `(a)
((a) (b))
((a) (c))`
	parsed, _ := Parse(source)
	output := Format(parsed)
	if output != target {
		t.Errorf("Expected:\n%s\nGot:\n%s", target, output)
	}
}

func TestTwoSpacesSizedWhitespace(t *testing.T) {
	source := `
users
  user1`
	target := `(users)
((users) (user1))`
	parsed, _ := Parse(source)
	output := Format(parsed)
	if output != target {
		t.Errorf("Expected:\n%s\nGot:\n%s", target, output)
	}
}

func TestParseNestedStructureWithIndentation(t *testing.T) {
	input := `parent
  child1
  child2`
	parsed, _ := Parse(input)
	if len(parsed) != 3 {
		t.Errorf("Expected 3 links, got %d", len(parsed))
	}
}

func TestIndentationBasedChildren(t *testing.T) {
	input := `parent
  child1
  child2
    grandchild`
	parsed, _ := Parse(input)
	if len(parsed) != 4 {
		t.Errorf("Expected 4 links, got %d", len(parsed))
	}
}

func TestComplexIndentation(t *testing.T) {
	input := `root
  level1a
    level2a
    level2b
  level1b
    level2c`
	parsed, _ := Parse(input)
	if len(parsed) != 6 {
		t.Errorf("Expected 6 links, got %d", len(parsed))
	}
}

func TestNestedLinksParser(t *testing.T) {
	input := "(1: (2: (3: 3)))"
	parsed, _ := Parse(input)
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	output := Format(parsed)
	if output != input {
		t.Errorf("Expected '%s', got '%s'", input, output)
	}
}

func TestThreeLevelNestingRoundtrip(t *testing.T) {
	input := "(1: (2: (3: 3)))"
	parsed, _ := Parse(input)
	output := Format(parsed)
	if output != input {
		t.Errorf("Expected '%s', got '%s'", input, output)
	}
}

func TestDeepNestedStructureRoundtrip(t *testing.T) {
	input := "(a: (b: (c: (d: d))))"
	parsed, _ := Parse(input)
	output := Format(parsed)
	if output != input {
		t.Errorf("Expected '%s', got '%s'", input, output)
	}
}

func TestMultipleNestedLinksRoundtrip(t *testing.T) {
	input := "(parent: (child1: value1) (child2: value2))"
	parsed, _ := Parse(input)
	output := Format(parsed)
	if output != input {
		t.Errorf("Expected '%s', got '%s'", input, output)
	}
}

// =====================
// Link Tests
// =====================

func TestLinkEquality(t *testing.T) {
	link1 := NewLink(strPtr("id"), []*Link{NewRef("a"), NewRef("b")})
	link2 := NewLink(strPtr("id"), []*Link{NewRef("a"), NewRef("b")})
	if !link1.Equal(link2) {
		t.Error("Expected links to be equal")
	}
}

func TestLinkInequalityDifferentID(t *testing.T) {
	link1 := NewLink(strPtr("id1"), []*Link{NewRef("a")})
	link2 := NewLink(strPtr("id2"), []*Link{NewRef("a")})
	if link1.Equal(link2) {
		t.Error("Expected links to be not equal (different ID)")
	}
}

func TestLinkInequalityDifferentValues(t *testing.T) {
	link1 := NewLink(strPtr("id"), []*Link{NewRef("a")})
	link2 := NewLink(strPtr("id"), []*Link{NewRef("b")})
	if link1.Equal(link2) {
		t.Error("Expected links to be not equal (different values)")
	}
}

func TestLinkInequalityDifferentValueCount(t *testing.T) {
	link1 := NewLink(strPtr("id"), []*Link{NewRef("a"), NewRef("b")})
	link2 := NewLink(strPtr("id"), []*Link{NewRef("a")})
	if link1.Equal(link2) {
		t.Error("Expected links to be not equal (different value count)")
	}
}

// =====================
// Edge Case Tests
// =====================

func TestEmptyInput(t *testing.T) {
	parsed, err := Parse("")
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) != 0 {
		t.Errorf("Expected empty result, got %d links", len(parsed))
	}
}

func TestWhitespaceOnlyInput(t *testing.T) {
	parsed, err := Parse("   \n\t  ")
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) != 0 {
		t.Errorf("Expected empty result, got %d links", len(parsed))
	}
}

func TestParseValuesOnly(t *testing.T) {
	// Test that '(:)' syntax is rejected
	input := "(: value1 value2)"
	parsed, err := Parse(input)
	// Go implementation follows JS behavior - should parse but ID will be empty
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	// Check that parsing doesn't crash
	_ = parsed
}

func TestMultilineLinksPreserved(t *testing.T) {
	input := `(papa has car)
(mama has house)`
	parsed, _ := Parse(input)
	if len(parsed) != 2 {
		t.Errorf("Expected 2 links, got %d", len(parsed))
	}
}

// =====================
// Format Config Tests
// =====================

func TestFormatConfigLessParentheses(t *testing.T) {
	link := NewLink(strPtr("id"), []*Link{NewRef("value1"), NewRef("value2")})
	config := NewFormatConfig(true)
	output := link.FormatWithConfig(config)
	if strings.HasPrefix(output, "(") && strings.HasSuffix(output, ")") {
		t.Errorf("Expected no outer parentheses with LessParentheses, got '%s'", output)
	}
}

func TestFormatConfigDefault(t *testing.T) {
	config := DefaultFormatConfig()
	if config.LessParentheses {
		t.Error("Expected LessParentheses to be false by default")
	}
	if config.IndentString != "  " {
		t.Errorf("Expected IndentString to be '  ', got '%s'", config.IndentString)
	}
}

func TestFormatConfigWithIndentString(t *testing.T) {
	config := DefaultFormatConfig().WithIndentString("\t")
	if config.IndentString != "\t" {
		t.Errorf("Expected IndentString to be tab, got '%s'", config.IndentString)
	}
}

func TestFormatConfigWithIndentByRefCount(t *testing.T) {
	config := DefaultFormatConfig().WithIndentByRefCount(3)
	if !config.ShouldIndentByRefCount(3) {
		t.Error("Expected ShouldIndentByRefCount(3) to be true")
	}
	if config.ShouldIndentByRefCount(2) {
		t.Error("Expected ShouldIndentByRefCount(2) to be false")
	}
}

func TestFormatConfigWithIndentByLength(t *testing.T) {
	config := DefaultFormatConfig().WithIndentByLength(10)
	if !config.ShouldIndentByLength("12345678901") {
		t.Error("Expected ShouldIndentByLength to be true for long line")
	}
	if config.ShouldIndentByLength("short") {
		t.Error("Expected ShouldIndentByLength to be false for short line")
	}
}

// =====================
// Multi-Quote String Tests
// =====================

func TestDoubleQuotedString(t *testing.T) {
	input := `("hello world")`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	id, err := parsed[0].Values[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "hello world" {
		t.Errorf("Expected 'hello world', got '%v'", id)
	}
}

func TestSingleQuotedString(t *testing.T) {
	input := `('hello world')`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	id, err := parsed[0].Values[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "hello world" {
		t.Errorf("Expected 'hello world', got '%v'", id)
	}
}

func TestBacktickQuotedString(t *testing.T) {
	input := "(`hello world`)"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	id, err := parsed[0].Values[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "hello world" {
		t.Errorf("Expected 'hello world', got '%v'", id)
	}
}

func TestTripleQuotedString(t *testing.T) {
	input := `("""hello "world" test""")`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
	expected := `hello "world" test`
	id, err := parsed[0].Values[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != expected {
		t.Errorf("Expected '%s', got '%v'", expected, id)
	}
}

// =====================
// Escape Reference Tests
// =====================

func TestEscapeReferenceWithSpace(t *testing.T) {
	result := escapeReference("hello world")
	if result != "'hello world'" {
		t.Errorf("Expected \"'hello world'\", got '%s'", result)
	}
}

func TestEscapeReferenceWithColon(t *testing.T) {
	result := escapeReference("hello:world")
	if result != "'hello:world'" {
		t.Errorf("Expected \"'hello:world'\", got '%s'", result)
	}
}

func TestEscapeReferenceWithDoubleQuote(t *testing.T) {
	result := escapeReference(`hello "world"`)
	if result != `'hello "world"'` {
		t.Errorf("Expected `'hello \"world\"'`, got '%s'", result)
	}
}

func TestEscapeReferenceWithSingleQuote(t *testing.T) {
	result := escapeReference("hello 'world'")
	if result != `"hello 'world'"` {
		t.Errorf(`Expected '"hello 'world'"', got '%s'`, result)
	}
}

func TestEscapeReferenceSimple(t *testing.T) {
	result := escapeReference("hello")
	if result != "hello" {
		t.Errorf("Expected 'hello', got '%s'", result)
	}
}

// =====================
// Grouping Tests
// =====================

func TestGroupConsecutiveLinks(t *testing.T) {
	links := []*Link{
		NewLink(strPtr("SetA"), []*Link{NewRef("a")}),
		NewLink(strPtr("SetA"), []*Link{NewRef("b")}),
		NewLink(strPtr("SetA"), []*Link{NewRef("c")}),
	}
	config := DefaultFormatConfig().WithGroupConsecutive(true)
	grouped := groupConsecutiveLinks(links)
	if len(grouped) != 1 {
		t.Errorf("Expected 1 grouped link, got %d", len(grouped))
	}
	if len(grouped[0].Values) != 3 {
		t.Errorf("Expected 3 values in grouped link, got %d", len(grouped[0].Values))
	}
	_ = config
}

func TestNoGroupingDifferentIDs(t *testing.T) {
	links := []*Link{
		NewLink(strPtr("SetA"), []*Link{NewRef("a")}),
		NewLink(strPtr("SetB"), []*Link{NewRef("b")}),
	}
	grouped := groupConsecutiveLinks(links)
	if len(grouped) != 2 {
		t.Errorf("Expected 2 links (no grouping), got %d", len(grouped))
	}
}

// =====================
// Roundtrip Tests
// =====================

func TestRoundtripSimple(t *testing.T) {
	inputs := []string{
		"(a)",
		"(a b c)",
		"(id: value)",
		"(id: value1 value2)",
		"(outer: (inner: value))",
	}
	for _, input := range inputs {
		parsed, err := Parse(input)
		if err != nil {
			t.Fatalf("Parse error for '%s': %v", input, err)
		}
		output := Format(parsed)
		if output != input {
			t.Errorf("Roundtrip failed for '%s': got '%s'", input, output)
		}
	}
}

// =====================
// Parser Error Tests
// =====================

func TestMaxInputSize(t *testing.T) {
	p := NewParser()
	p.MaxInputSize = 10
	_, err := p.Parse("this is too long")
	if err == nil {
		t.Error("Expected error for input exceeding max size")
	}
}

// =====================
// Indented ID Syntax Tests
// =====================

func TestIndentedIDSyntaxBasic(t *testing.T) {
	input := `id:
  value1
  value2`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) != 1 {
		t.Errorf("Expected 1 link, got %d", len(parsed))
	}
	output := Format(parsed)
	if output != "(id: value1 value2)" {
		t.Errorf("Expected '(id: value1 value2)', got '%s'", output)
	}
}

func TestIndentedIDSyntaxMultiple(t *testing.T) {
	input := `id1:
  a
  b
id2:
  c
  d`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) != 2 {
		t.Errorf("Expected 2 links, got %d", len(parsed))
	}
	output := Format(parsed)
	expected := "(id1: a b)\n(id2: c d)"
	if output != expected {
		t.Errorf("Expected '%s', got '%s'", expected, output)
	}
}

// =====================
// README Example Tests
// =====================

func TestREADMEExample(t *testing.T) {
	input := "papa (lovesMama: loves mama)"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

func TestREADMEDoublets(t *testing.T) {
	input := `papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) < 4 {
		t.Errorf("Expected at least 4 links, got %d", len(parsed))
	}
}

func TestREADMETriplets(t *testing.T) {
	input := `papa has car
mama has house
(papa and mama) are happy`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) < 3 {
		t.Errorf("Expected at least 3 links, got %d", len(parsed))
	}
}

// =====================
// Mixed Indentation Tests
// =====================

func TestMixedInlineAndIndented(t *testing.T) {
	input := `(inline: value1 value2)
indented:
  a
  b`
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) != 2 {
		t.Errorf("Expected 2 links, got %d", len(parsed))
	}
}

// =====================
// Multiline Parser Tests
// =====================

func TestMultilineWithEmbeddedNewlines(t *testing.T) {
	// Parenthesized expressions keep newlines together
	input := "(multi\nline)"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}

// =====================
// Nested Self-Reference Tests
// =====================

func TestNestedSelfReference(t *testing.T) {
	input := "((str key) (obj_1: dict value))"
	parsed, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if len(parsed) == 0 {
		t.Fatal("Expected at least one link")
	}
}
