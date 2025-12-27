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
	// Multi-word ID should be in IDs array
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	idStr := result[0].GetIdString()
	if idStr == nil || *idStr != "some example" {
		t.Errorf("Expected ID 'some example', got '%v'", idStr)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	idStr := result[0].GetIdString()
	if idStr == nil || *idStr != "new york city" {
		t.Errorf("Expected ID 'new york city', got '%v'", idStr)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	// Single word ID should work with Id() method
	id, err := result[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "papa" {
		t.Errorf("Expected ID 'papa', got '%v'", id)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	// Quoted ID should be preserved as-is (single reference)
	id, err := result[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "some example" {
		t.Errorf("Expected ID 'some example', got '%v'", id)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	idStr := result[0].GetIdString()
	if idStr == nil || *idStr != "some example" {
		t.Errorf("Expected ID 'some example', got '%v'", idStr)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	idStr := result[0].GetIdString()
	if idStr == nil || *idStr != "some example" {
		t.Errorf("Expected ID 'some example', got '%v'", idStr)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	id, err := result[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "papa" {
		t.Errorf("Expected ID 'papa', got '%v'", id)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	id, err := result[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "papa" {
		t.Errorf("Expected ID 'papa', got '%v'", id)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	id, err := result[0].Id()
	if err != nil {
		t.Fatalf("Id() failed: %v", err)
	}
	if id == nil || *id != "outer" {
		t.Errorf("Expected ID 'outer', got '%v'", id)
	}
	if len(result[0].Values) != 1 {
		t.Errorf("Expected 1 value, got %d", len(result[0].Values))
	}
	innerLink := result[0].Values[0]
	if innerLink.IDs == nil || len(innerLink.IDs) == 0 {
		t.Fatal("Expected inner IDs to be set")
	}
	innerId, err := innerLink.Id()
	if err != nil {
		t.Fatalf("Inner Id() failed: %v", err)
	}
	if innerId == nil || *innerId != "inner" {
		t.Errorf("Expected inner ID 'inner', got '%v'", innerId)
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
	if result[0].IDs == nil || len(result[0].IDs) == 0 {
		t.Fatal("Expected IDs to be set")
	}
	idStr := result[0].GetIdString()
	if idStr == nil || *idStr != "some example" {
		t.Errorf("Expected ID 'some example', got '%v'", idStr)
	}
	if len(result[0].Values) != 3 {
		t.Errorf("Expected 3 values, got %d", len(result[0].Values))
	}
	expectedValues := []string{"one", "two", "three"}
	for i, expectedValue := range expectedValues {
		id, err := result[0].Values[i].Id()
		if err != nil {
			t.Errorf("Value %d Id() failed: %v", i, err)
			continue
		}
		if id == nil || *id != expectedValue {
			t.Errorf("Expected value %d to be '%s', got '%v'", i, expectedValue, id)
		}
	}
}

// Test that Id() returns error for multi-reference IDs
func TestIdMethodReturnsErrorForMultiRef(t *testing.T) {
	// Create a link with multi-reference IDs manually
	link := &Link{IDs: []string{"some", "example"}}
	_, err := link.Id()
	if err == nil {
		t.Fatal("Expected error for multi-reference ID, got nil")
	}
	multiRefErr, ok := err.(*MultiRefError)
	if !ok {
		t.Fatalf("Expected MultiRefError, got %T", err)
	}
	if multiRefErr.Count != 2 {
		t.Errorf("Expected count 2, got %d", multiRefErr.Count)
	}
}
