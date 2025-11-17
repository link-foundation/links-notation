use links_notation::parse_lino;
use links_notation::parser::parse_document;

#[test]
fn significant_whitespace_test() {
    let source = r#"
users
    user1
        id
            43
        name
            first
                John
            last
                Williams
        location
            New York
        age
            23
    user2
        id
            56
        name
            first
                Igor
            middle
                Petrovich
            last
                Ivanov
        location
            Moscow
        age
            20"#;

    let target = "(users)\n((users) (user1))\n(((users) (user1)) (id))\n((((users) (user1)) (id)) (43))\n(((users) (user1)) (name))\n((((users) (user1)) (name)) (first))\n(((((users) (user1)) (name)) (first)) (John))\n((((users) (user1)) (name)) (last))\n(((((users) (user1)) (name)) (last)) (Williams))\n(((users) (user1)) (location))\n((((users) (user1)) (location)) (New York))\n(((users) (user1)) (age))\n((((users) (user1)) (age)) (23))\n((users) (user2))\n(((users) (user2)) (id))\n((((users) (user2)) (id)) (56))\n(((users) (user2)) (name))\n((((users) (user2)) (name)) (first))\n(((((users) (user2)) (name)) (first)) (Igor))\n((((users) (user2)) (name)) (middle))\n(((((users) (user2)) (name)) (middle)) (Petrovich))\n((((users) (user2)) (name)) (last))\n(((((users) (user2)) (name)) (last)) (Ivanov))\n(((users) (user2)) (location))\n((((users) (user2)) (location)) (Moscow))\n(((users) (user2)) (age))\n((((users) (user2)) (age)) (20))";
    let parsed = parse_lino(source).unwrap();
    let output = format!("{:#}", parsed);
    assert_eq!(target, output);
}

#[test]
fn simple_significant_whitespace_test() {
    let source = "a\n    b\n    c";
    let target = "(a)\n((a) (b))\n((a) (c))";
    let parsed = parse_lino(source).unwrap();
    let output = format!("{:#}", parsed);
    assert_eq!(target, output);
}

#[test]
fn two_spaces_sized_whitespace_test() {
    let source = "\nusers\n  user1";
    let target = "(users)\n((users) (user1))";
    let parsed = parse_lino(source).unwrap();
    let output = format!("{:#}", parsed);
    assert_eq!(target, output);
}

#[test]
fn parse_nested_structure_with_indentation() {
    let input = "parent\n  child1\n  child2";
    let target = "(parent)\n((parent) (child1))\n((parent) (child2))";
    let result = parse_lino(input).unwrap();
    let output = format!("{:#}", result);
    assert_eq!(target, output);
}

#[test]
fn test_indentation_consistency() {
    // Test that indentation must be consistent
    let input = "parent\n  child1\n   child2"; // Inconsistent indentation
    let result = parse_lino(input).unwrap();
    let output = format!("{:#}", result);
    // Should produce at least the parent and child1 as separate links
    assert!(output.contains("(parent)"));
    assert!(output.contains("((parent) (child1))"));
}

#[test]
fn test_indentation_based_children() {
    // Test indentation-based children
    let input = "parent\n  child1\n  child2\n    grandchild";
    let result = parse_lino(input).unwrap();
    let output = format!("{:#}", result);
    let expected = "(parent)\n((parent) (child1))\n((parent) (child2))\n(((parent) (child2)) (grandchild))";
    assert_eq!(expected, output);
}

#[test]
fn test_complex_indentation() {
    // Test complex indentation
    let input = r#"root
  level1a
    level2a
    level2b
  level1b
    level2c"#;
    let result = parse_lino(input).unwrap();
    let output = format!("{:#}", result);
    let expected = "(root)\n((root) (level1a))\n(((root) (level1a)) (level2a))\n(((root) (level1a)) (level2b))\n((root) (level1b))\n(((root) (level1b)) (level2c))";
    assert_eq!(expected, output);
}

#[test]
fn test_nested_links() {
    let input = "(1: (2: (3: 3)))";
    let parsed = parse_lino(input).expect("Failed to parse input");

    // Validate regular formatting
    let output = parsed.to_string();
    let expected = "((1: (2: (3: 3))))";
    assert_eq!(expected, output);

    // Validate alternate formatting
    let output_alternate = format!("{:#}", parsed);
    assert_eq!(input, output_alternate);
}

// Tests moved from parser.rs

#[test]
fn test_indentation_parser() {
    let input = "parent\n  child1\n  child2";
    let result = parse_document(input).unwrap();
    assert_eq!(result.1.len(), 1);
    assert_eq!(result.1[0].id, Some("parent".to_string()));
    assert_eq!(result.1[0].children.len(), 2);
}

#[test]
fn test_nested_indentation_parser() {
    let input = "parent\n  child\n    grandchild";
    let result = parse_document(input).unwrap();
    assert_eq!(result.1.len(), 1);
    assert_eq!(result.1[0].children.len(), 1);
    assert_eq!(result.1[0].children[0].children.len(), 1);
}

#[test]
fn test_three_level_nesting_roundtrip() {
    use links_notation::{parse_lino_to_links, format_links};

    let input = "(1: (2: (3: 3)))";
    let parsed = parse_lino_to_links(input).expect("Failed to parse");

    // Validate round-trip
    let output = format_links(&parsed);
    assert_eq!(output, input);
}

#[test]
fn test_deep_nested_structure_roundtrip() {
    use links_notation::{parse_lino_to_links, format_links};

    let input = "(a: (b: (c: (d: d))))";
    let parsed = parse_lino_to_links(input).expect("Failed to parse");

    // Validate round-trip
    let output = format_links(&parsed);
    assert_eq!(output, input);
}

#[test]
fn test_multiple_nested_links_roundtrip() {
    use links_notation::{parse_lino_to_links, format_links};

    let input = "(parent: (child1: value1) (child2: value2))";
    let parsed = parse_lino_to_links(input).expect("Failed to parse");

    // Validate round-trip
    let output = format_links(&parsed);
    assert_eq!(output, input);
}