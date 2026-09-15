use links_notation::parse_lino_to_links;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_indented_id_syntax_test() {
        let indented_syntax = "3:\n  papa\n  loves\n  mama";
        let inline_syntax = "(3: papa loves mama)";

        let indented_result = parse_lino_to_links(indented_syntax).unwrap();
        let inline_result = parse_lino_to_links(inline_syntax).unwrap();

        // Both should produce the same structure when formatted
        assert_eq!(indented_result.len(), 1);
        assert_eq!(inline_result.len(), 1);

        println!("Indented result: {:?}", indented_result);
        println!("Inline result: {:?}", inline_result);

        // Both should format to similar structure
        assert_eq!(
            format!("{}", indented_result[0]),
            format!("{}", inline_result[0])
        );
    }

    #[test]
    fn indented_id_syntax_with_single_value_test() {
        let input = "greeting:\n  hello";
        let result = parse_lino_to_links(input).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(format!("{}", result[0]), "(greeting: hello)");
    }

    #[test]
    fn indented_id_syntax_with_multiple_values_test() {
        let input = "action:\n  run\n  fast\n  now";
        let result = parse_lino_to_links(input).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(format!("{}", result[0]), "(action: run fast now)");
    }

    #[test]
    fn indented_id_syntax_with_numeric_id_test() {
        let input = "42:\n  answer\n  to\n  everything";
        let result = parse_lino_to_links(input).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(format!("{}", result[0]), "(42: answer to everything)");
    }

    #[test]
    fn unsupported_colon_only_syntax_should_fail_test() {
        let input = ":\n  papa\n  loves\n  mama";

        // This should fail
        assert!(parse_lino_to_links(input).is_err());
    }

    #[test]
    fn empty_indented_id_should_work_test() {
        let input = "empty:";
        let result = parse_lino_to_links(input).unwrap();

        assert_eq!(result.len(), 1);
        // For empty ID, it shows just the ID as a reference
        assert_eq!(format!("{}", result[0]), "empty");
    }

    #[test]
    fn indented_id_syntax_with_quoted_id_test() {
        let input = "\"complex id\":\n  value1\n  value2";
        let result = parse_lino_to_links(input).unwrap();

        assert_eq!(result.len(), 1);
        let formatted = format!("{}", result[0]);
        assert!(formatted.contains("complex id"));
        assert!(formatted.contains("value1"));
        assert!(formatted.contains("value2"));
    }

    #[test]
    fn multiple_indented_id_links_test() {
        let input = "first:\n  a\n  b\nsecond:\n  c\n  d";
        let result = parse_lino_to_links(input).unwrap();

        assert_eq!(result.len(), 2);
        let formatted1 = format!("{}", result[0]);
        let formatted2 = format!("{}", result[1]);
        assert!(formatted1.contains("first"));
        assert!(formatted2.contains("second"));
    }

    #[test]
    fn mixed_indented_and_regular_syntax_test() {
        let input = "first:\n  a\n  b\n(second: c d)\nthird value";
        let result = parse_lino_to_links(input).unwrap();

        assert_eq!(result.len(), 3);
        // First link should have 'first' with values
        let formatted1 = format!("{}", result[0]);
        assert!(formatted1.contains("first"));
    }

    #[test]
    fn indented_id_with_deeper_nesting_test() {
        let input = "root:\n  child1\n  child2\n    grandchild";
        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        // The root should exist
        let formatted = format!("{}", result[0]);
        assert!(formatted.contains("root"));
    }

    #[test]
    fn equivalence_test_comprehensive() {
        let test_cases = vec![
            ("test:\n  one", "(test: one)"),
            ("x:\n  a\n  b\n  c", "(x: a b c)"),
        ];

        for (indented, inline) in test_cases {
            let indented_result = parse_lino_to_links(indented).unwrap();
            let inline_result = parse_lino_to_links(inline).unwrap();

            assert_eq!(indented_result.len(), inline_result.len());
            // Both should format to the same output
            assert_eq!(
                format!("{}", indented_result[0]),
                format!("{}", inline_result[0])
            );
        }
    }
}
