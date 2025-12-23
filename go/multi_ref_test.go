package lino

import (
	"testing"
)

// Multi-Reference Feature Tests (Issue #184)
//
// Tests for multi-word references without quotes:
// - (some example: some example is a link)
// - ID as multi-word string: "some example"

func TestParsesTwoWordMultiReferenceID(t *testing.T) {
	result, err := Parse("(some example: value)")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	// Multi-word ID should be joined with space
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "some example" {
		t.Errorf("Expected ID 'some example', got '%s'", *result[0].ID)
	}
	if len(result[0].Values) != 1 {
		t.Errorf("Expected 1 value, got %d", len(result[0].Values))
	}
}

func TestParsesThreeWordMultiReferenceID(t *testing.T) {
	result, err := Parse("(new york city: value)")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "new york city" {
		t.Errorf("Expected ID 'new york city', got '%s'", *result[0].ID)
	}
}

func TestSingleWordIDBackwardCompatible(t *testing.T) {
	result, err := Parse("(papa: value)")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "papa" {
		t.Errorf("Expected ID 'papa', got '%s'", *result[0].ID)
	}
}

func TestQuotedMultiWordIDBackwardCompatible(t *testing.T) {
	result, err := Parse("('some example': value)")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	// Quoted ID should be preserved as-is
	if *result[0].ID != "some example" {
		t.Errorf("Expected ID 'some example', got '%s'", *result[0].ID)
	}
}

func TestFormatMultiReferenceID(t *testing.T) {
	result, err := Parse("(some example: value)")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	formatted := Format(result)
	// Multi-reference IDs are formatted with quotes (normalized form)
	expected := "('some example': value)"
	if formatted != expected {
		t.Errorf("Expected '%s', got '%s'", expected, formatted)
	}
}

func TestRoundTripMultiReference(t *testing.T) {
	input := "(new york city: great)"
	result, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	formatted := Format(result)
	// Round-trip normalizes multi-word ID to quoted form
	expected := "('new york city': great)"
	if formatted != expected {
		t.Errorf("Expected '%s', got '%s'", expected, formatted)
	}
}

func TestIndentedSyntaxMultiReference(t *testing.T) {
	input := "some example:\n  value1\n  value2"
	result, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "some example" {
		t.Errorf("Expected ID 'some example', got '%s'", *result[0].ID)
	}
	if len(result[0].Values) != 2 {
		t.Errorf("Expected 2 values, got %d", len(result[0].Values))
	}
}

func TestValuesIncludeMultiReferenceContext(t *testing.T) {
	// When the same multi-word pattern appears in values,
	// they are parsed as separate words (no context-aware grouping)
	input := "(some example: some example is a link)"
	result, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "some example" {
		t.Errorf("Expected ID 'some example', got '%s'", *result[0].ID)
	}
	// Values should be separate: "some", "example", "is", "a", "link"
	if len(result[0].Values) != 5 {
		t.Errorf("Expected 5 values, got %d", len(result[0].Values))
	}
}

func TestBackwardCompatibilitySingleLine(t *testing.T) {
	result, err := Parse("papa: loves mama")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "papa" {
		t.Errorf("Expected ID 'papa', got '%s'", *result[0].ID)
	}
	if len(result[0].Values) != 2 {
		t.Errorf("Expected 2 values, got %d", len(result[0].Values))
	}
}

func TestBackwardCompatibilityParenthesized(t *testing.T) {
	result, err := Parse("(papa: loves mama)")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "papa" {
		t.Errorf("Expected ID 'papa', got '%s'", *result[0].ID)
	}
	if len(result[0].Values) != 2 {
		t.Errorf("Expected 2 values, got %d", len(result[0].Values))
	}
}

func TestBackwardCompatibilityNested(t *testing.T) {
	result, err := Parse("(outer: (inner: value))")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "outer" {
		t.Errorf("Expected ID 'outer', got '%s'", *result[0].ID)
	}
	if len(result[0].Values) != 1 {
		t.Errorf("Expected 1 value, got %d", len(result[0].Values))
	}
	innerLink := result[0].Values[0]
	if innerLink.ID == nil {
		t.Fatal("Expected inner ID to be set")
	}
	if *innerLink.ID != "inner" {
		t.Errorf("Expected inner ID 'inner', got '%s'", *innerLink.ID)
	}
}

func TestMultiRefWithMultipleValues(t *testing.T) {
	result, err := Parse("(some example: one two three)")
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(result))
	}
	if result[0].ID == nil {
		t.Fatal("Expected ID to be set")
	}
	if *result[0].ID != "some example" {
		t.Errorf("Expected ID 'some example', got '%s'", *result[0].ID)
	}
	if len(result[0].Values) != 3 {
		t.Errorf("Expected 3 values, got %d", len(result[0].Values))
	}
	expectedValues := []string{"one", "two", "three"}
	for i, expectedValue := range expectedValues {
		if result[0].Values[i].ID == nil {
			t.Errorf("Expected value %d to have ID", i)
			continue
		}
		if *result[0].Values[i].ID != expectedValue {
			t.Errorf("Expected value %d to be '%s', got '%s'", i, expectedValue, *result[0].Values[i].ID)
		}
	}
}
