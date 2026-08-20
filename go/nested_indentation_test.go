package lino

import "testing"

// Tests for indentation inside parentheses.
//
// https://github.com/link-foundation/links-notation/issues/282
//
// Indentation is structural at the root, so it must be structural inside
// parentheses too: a parenthesized group opens a nested context that starts
// fresh at indentation level zero and follows exactly the root's rules.

func formatSource(t *testing.T, source string) string {
	t.Helper()
	links, err := Parse(source)
	if err != nil {
		t.Fatalf("Failed to parse %q: %v", source, err)
	}
	return Format(links)
}

func assertFormat(t *testing.T, source, expected string) {
	t.Helper()
	if output := formatSource(t, source); output != expected {
		t.Errorf("Parsing %q:\nexpected %q\ngot      %q", source, expected, output)
	}
}

func TestParenthesesReproduceRootIndentation(t *testing.T) {
	assertFormat(t, "a\n  b\nc\n  d", "(a)\n((a) (b))\n(c)\n((c) (d))")

	// The same lines inside parentheses keep the same structure, nested under
	// the link the group belongs to.
	assertFormat(t, "array (\n  a\n    b\n  c\n    d\n)", "(array ((a) ((a) (b)) (c) ((c) (d))))")
}

func TestParenthesesKeepRecordBoundaries(t *testing.T) {
	source := "value (\n  id \"1\"\n  label \"one\"\n)"
	assertFormat(t, source, "(value ((id 1) (label one)))")

	links, err := Parse(source)
	if err != nil {
		t.Fatalf("Failed to parse: %v", err)
	}
	if len(links) != 1 {
		t.Fatalf("Expected 1 link, got %d", len(links))
	}

	group := links[0].Values[1]
	if group.ID != nil {
		t.Errorf("Expected the group to be anonymous, got id %q", *group.ID)
	}
	if len(group.Values) != 2 {
		t.Fatalf("Expected 2 records in the group, got %d", len(group.Values))
	}
	if *group.Values[0].Values[0].ID != "id" || *group.Values[0].Values[1].ID != "1" {
		t.Errorf("Unexpected first record: %s", group.Values[0].String())
	}
	if *group.Values[1].Values[0].ID != "label" || *group.Values[1].Values[1].ID != "one" {
		t.Errorf("Unexpected second record: %s", group.Values[1].String())
	}
}

func TestParenthesesKeepSeveralRecordsSeparate(t *testing.T) {
	assertFormat(t,
		"value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)",
		"(value ((id 1 label one) (id 2 label two)))")
}

func TestParenthesesNestDeeply(t *testing.T) {
	assertFormat(t,
		"outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)",
		"(outer ((inner ((x 1) (y 2))) (z 3)))")
}

func TestSingleLineParenthesesAreUnchanged(t *testing.T) {
	assertFormat(t, "(a b c)", "(a b c)")
	assertFormat(t, "(1: 2 3)", "(1: 2 3)")
	assertFormat(t, "(a: b c)", "(a: b c)")
	assertFormat(t, "((a b))", "((a b))")
	assertFormat(t, "(a)", "(a)")
	assertFormat(t, "()", "()")
}

func TestParenthesesWithIndentedIDSyntax(t *testing.T) {
	assertFormat(t, "(\n  a:\n    b\n    c\n)", "(a: b c)")
}

func TestEmployeeRecordsKeepTheirFields(t *testing.T) {
	source := "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n    (\n      name (Jean-Luc Picard)\n      age 45\n    )"
	expected := "(empInfo)\n((empInfo) (employees: ((name (James Kirk)) (age 40)) ((name (Jean-Luc Picard)) (age 45))))"
	assertFormat(t, source, expected)
}
