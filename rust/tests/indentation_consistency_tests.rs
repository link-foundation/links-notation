use links_notation::parse_lino_to_links;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leading_spaces_vs_no_leading_spaces() {
        // Example with 2 leading spaces (from issue #135)
        let with_leading = "  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n  TELEGRAM_ALLOWED_CHATS:\n    -1002975819706\n    -1002861722681\n  TELEGRAM_HIVE_OVERRIDES:\n    --all-issues\n    --once\n  TELEGRAM_BOT_VERBOSE: true";

        // Example without leading spaces (from issue #135)
        let without_leading = "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\nTELEGRAM_ALLOWED_CHATS:\n  -1002975819706\n  -1002861722681\nTELEGRAM_HIVE_OVERRIDES:\n  --all-issues\n  --once\nTELEGRAM_BOT_VERBOSE: true";

        let result_with = parse_lino_to_links(with_leading);
        let result_without = parse_lino_to_links(without_leading);

        assert!(result_with.is_ok(), "With leading spaces should parse successfully");
        assert!(result_without.is_ok(), "Without leading spaces should parse successfully");

        let links_with = result_with.unwrap();
        let links_without = result_without.unwrap();

        // Both should produce the same number of links
        assert_eq!(
            links_with.len(),
            links_without.len(),
            "Both indentation styles should produce the same number of links. With leading: {}, Without: {}",
            links_with.len(),
            links_without.len()
        );

        // Both should have the same structure when formatted
        for (i, (link_with, link_without)) in links_with.iter().zip(links_without.iter()).enumerate() {
            assert_eq!(
                format!("{}", link_with),
                format!("{}", link_without),
                "Link {} should be identical regardless of leading indentation. With: {:?}, Without: {:?}",
                i, link_with, link_without
            );
        }
    }

    #[test]
    fn test_two_spaces_vs_four_spaces_indentation() {
        // Example with 2 spaces per level
        let two_spaces = "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\nTELEGRAM_ALLOWED_CHATS:\n  -1002975819706\n  -1002861722681\nTELEGRAM_HIVE_OVERRIDES:\n  --all-issues\n  --once\n  --auto-fork\n  --skip-issues-with-prs\n  --attach-logs\n  --verbose\n  --no-tool-check\nTELEGRAM_SOLVE_OVERRIDES:\n  --auto-fork\n  --auto-continue\n  --attach-logs\n  --verbose\n  --no-tool-check\nTELEGRAM_BOT_VERBOSE: true";

        // Example with 4 spaces per level
        let four_spaces = "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\nTELEGRAM_ALLOWED_CHATS:\n    -1002975819706\n    -1002861722681\nTELEGRAM_HIVE_OVERRIDES:\n    --all-issues\n    --once\n    --auto-fork\n    --skip-issues-with-prs\n    --attach-logs\n    --verbose\n    --no-tool-check\nTELEGRAM_SOLVE_OVERRIDES:\n    --auto-fork\n    --auto-continue\n    --attach-logs\n    --verbose\n    --no-tool-check\nTELEGRAM_BOT_VERBOSE: true";

        let result_two = parse_lino_to_links(two_spaces);
        let result_four = parse_lino_to_links(four_spaces);

        assert!(result_two.is_ok(), "Two spaces should parse successfully");
        assert!(result_four.is_ok(), "Four spaces should parse successfully");

        let links_two = result_two.unwrap();
        let links_four = result_four.unwrap();

        // Both should produce the same number of links
        assert_eq!(
            links_two.len(),
            links_four.len(),
            "Both indentation styles should produce the same number of links"
        );

        // Both should have the same structure when formatted
        for (i, (link_two, link_four)) in links_two.iter().zip(links_four.iter()).enumerate() {
            assert_eq!(
                format!("{}", link_two),
                format!("{}", link_four),
                "Link {} should be identical regardless of indentation style",
                i
            );
        }
    }

    #[test]
    fn test_simple_two_vs_four_spaces() {
        // Simple example with 2 spaces
        let two_spaces = "parent:\n  child1\n  child2";

        // Simple example with 4 spaces
        let four_spaces = "parent:\n    child1\n    child2";

        let result_two = parse_lino_to_links(two_spaces);
        let result_four = parse_lino_to_links(four_spaces);

        assert!(result_two.is_ok(), "Two spaces should parse successfully");
        assert!(result_four.is_ok(), "Four spaces should parse successfully");

        let links_two = result_two.unwrap();
        let links_four = result_four.unwrap();

        assert_eq!(links_two.len(), links_four.len());
        assert_eq!(format!("{}", links_two[0]), format!("{}", links_four[0]));
    }

    #[test]
    fn test_three_level_nesting() {
        // Three levels with 2 spaces
        let two_spaces = "level1:\n  level2:\n    level3a\n    level3b\n  level2b";

        // Three levels with 4 spaces
        let four_spaces = "level1:\n    level2:\n        level3a\n        level3b\n    level2b";

        let result_two = parse_lino_to_links(two_spaces);
        let result_four = parse_lino_to_links(four_spaces);

        assert!(result_two.is_ok(), "Two spaces should parse successfully");
        assert!(result_four.is_ok(), "Four spaces should parse successfully");

        let links_two = result_two.unwrap();
        let links_four = result_four.unwrap();

        assert_eq!(links_two.len(), links_four.len());

        for (i, (link_two, link_four)) in links_two.iter().zip(links_four.iter()).enumerate() {
            assert_eq!(
                format!("{}", link_two),
                format!("{}", link_four),
                "Link {} should be identical",
                i
            );
        }
    }
}
