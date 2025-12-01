use links_notation::parse_lino_to_links;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hero_example_mixed_modes_test() {
        let input = "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n    (\n      name (Jean-Luc Picard)\n      age 45\n    )\n    (\n      name (Wesley Crusher)\n      age 27\n    )";

        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        let formatted = result
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(formatted.contains("empInfo"));
        assert!(formatted.contains("employees:"));
        assert!(
            formatted.contains("James Kirk")
                || formatted.contains("James") && formatted.contains("Kirk")
        );
        assert!(
            formatted.contains("Jean-Luc Picard")
                || formatted.contains("Jean-Luc") && formatted.contains("Picard")
        );
        assert!(
            formatted.contains("Wesley Crusher")
                || formatted.contains("Wesley") && formatted.contains("Crusher")
        );
    }

    #[test]
    fn hero_example_alternative_format_test() {
        let input = "empInfo\n  (\n    employees:\n      (\n        name (James Kirk)\n        age 40\n      )\n      (\n        name (Jean-Luc Picard)\n        age 45\n      )\n      (\n        name (Wesley Crusher)\n        age 27\n      )\n  )";

        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        let formatted = result
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(formatted.contains("empInfo"));
        assert!(formatted.contains("employees:"));
        assert!(
            formatted.contains("James Kirk")
                || formatted.contains("James") && formatted.contains("Kirk")
        );
        assert!(
            formatted.contains("Jean-Luc Picard")
                || formatted.contains("Jean-Luc") && formatted.contains("Picard")
        );
        assert!(
            formatted.contains("Wesley Crusher")
                || formatted.contains("Wesley") && formatted.contains("Crusher")
        );
    }

    #[test]
    fn hero_example_equivalence_test() {
        let version1 = "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n    (\n      name (Jean-Luc Picard)\n      age 45\n    )\n    (\n      name (Wesley Crusher)\n      age 27\n    )";

        let version2 = "empInfo\n  (\n    employees:\n      (\n        name (James Kirk)\n        age 40\n      )\n      (\n        name (Jean-Luc Picard)\n        age 45\n      )\n      (\n        name (Wesley Crusher)\n        age 27\n      )\n  )";

        let result1 = parse_lino_to_links(version1).unwrap();
        let result2 = parse_lino_to_links(version2).unwrap();

        let formatted1 = result1
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        let formatted2 = result2
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");

        assert_eq!(formatted1, formatted2);
    }

    #[test]
    fn set_context_without_colon_test() {
        let input = "empInfo\n  employees";

        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        let formatted = result
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(formatted.contains("empInfo"));
        assert!(formatted.contains("employees"));
    }

    #[test]
    fn sequence_context_with_colon_test() {
        let input = "employees:\n  James Kirk\n  Jean-Luc Picard\n  Wesley Crusher";

        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        assert_eq!(result.len(), 1);
        let formatted = result
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(formatted.contains("employees:"));
        assert!(
            formatted.contains("James Kirk")
                || formatted.contains("James") && formatted.contains("Kirk")
        );
        assert!(
            formatted.contains("Jean-Luc Picard")
                || formatted.contains("Jean-Luc") && formatted.contains("Picard")
        );
        assert!(
            formatted.contains("Wesley Crusher")
                || formatted.contains("Wesley") && formatted.contains("Crusher")
        );
    }

    #[test]
    fn sequence_context_with_complex_values_test() {
        let input = "employees:\n  (\n    name (James Kirk)\n    age 40\n  )\n  (\n    name (Jean-Luc Picard)\n    age 45\n  )";

        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        assert_eq!(result.len(), 1);
        let formatted = result
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(formatted.contains("employees:"));
        assert!(
            formatted.contains("James Kirk")
                || formatted.contains("James") && formatted.contains("Kirk")
        );
        assert!(
            formatted.contains("Jean-Luc Picard")
                || formatted.contains("Jean-Luc") && formatted.contains("Picard")
        );
    }

    #[test]
    fn nested_set_and_sequence_contexts_test() {
        let input = "company\n  departments:\n    engineering\n    sales\n  employees:\n    (name John)\n    (name Jane)";

        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        let formatted = result
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(formatted.contains("company"));
        assert!(formatted.contains("departments:"));
        assert!(formatted.contains("employees:"));
    }

    #[test]
    fn deeply_nested_mixed_modes_test() {
        let input =
            "root\n  level1\n    level2:\n      value1\n      value2\n    level2b\n      level3";

        let result = parse_lino_to_links(input).unwrap();

        assert!(!result.is_empty());
        let formatted = result
            .iter()
            .map(|l| format!("{}", l))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(formatted.contains("root"));
        assert!(formatted.contains("level2:"));
    }
}
