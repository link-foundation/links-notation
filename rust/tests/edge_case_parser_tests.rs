use links_notation::{parse_lino, parse_lino_to_links, LiNo};

#[test]
fn empty_link_test() {
    let source = ":";
    // Standalone ':' is now forbidden and should return an error
    let result = parse_lino(source);
    assert!(result.is_err());
}

#[test]
fn empty_link_with_parentheses_test() {
    let source = "()";
    let parsed = parse_lino(source).unwrap();
    // Should parse as an empty link
    assert!(parsed.is_link());
    // Verify formatted output matches C#/JS
    let output = format!("{:#}", parsed);
    assert_eq!("()", output);
}

#[test]
fn empty_link_with_empty_self_reference_test() {
    let source = "(:)";
    // '(:)' is now forbidden and should return an error
    let result = parse_lino(source);
    assert!(result.is_err());
}

#[test]
fn test_all_features_test() {
    // Test single-line link with id
    let input = "id: value1 value2";
    let result = parse_lino(input);
    assert!(result.is_ok());

    // Test multi-line link with id
    let input = "(id: value1 value2)";
    let result = parse_lino(input);
    assert!(result.is_ok());

    // Test link without id (single-line) - now forbidden
    let input = ": value1 value2";
    let result = parse_lino(input);
    assert!(result.is_err());

    // Test link without id (multi-line) - now forbidden
    let input = "(: value1 value2)";
    let result = parse_lino(input);
    assert!(result.is_err());

    // Test singlet link
    let input = "(singlet)";
    let result = parse_lino(input);
    assert!(result.is_ok());
    let parsed = result.unwrap();
    if let LiNo::Link { ids, values } = parsed {
        assert!(ids.is_none());
        assert_eq!(values.len(), 1);
        if let LiNo::Ref(ref_id) = &values[0] {
            assert_eq!(ref_id, "singlet");
        }
    }

    // Test value link
    let input = "(value1 value2 value3)";
    let result = parse_lino(input);
    assert!(result.is_ok());

    // Test quoted references
    let input = r#"("id with spaces": "value with spaces")"#;
    let result = parse_lino(input);
    assert!(result.is_ok());

    // Test single-quoted references
    let input = "('id': 'value')";
    let result = parse_lino(input);
    assert!(result.is_ok());

    // Test nested links
    let input = "(outer: (inner: value))";
    let result = parse_lino(input);
    assert!(result.is_ok());
}

#[test]
fn test_empty_document_test() {
    let input = "";
    // Empty document should return empty list (matching C#/JS behavior)
    let result = parse_lino_to_links(input);
    assert!(result.is_ok());
    let parsed = result.unwrap();
    assert!(parsed.is_empty());
}

#[test]
fn test_whitespace_only_test() {
    let input = "   \n   \n   ";
    // Whitespace-only document should return empty list (matching C#/JS behavior)
    let result = parse_lino_to_links(input);
    assert!(result.is_ok());
    let parsed = result.unwrap();
    assert!(parsed.is_empty());
}

#[test]
fn test_empty_links_test() {
    let input = "()";
    let result = parse_lino(input);
    assert!(result.is_ok());

    // '(:)' is now forbidden
    let input = "(:)";
    let result = parse_lino(input);
    assert!(result.is_err());

    let input = "(id:)";
    let result = parse_lino(input);
    assert!(result.is_ok());
}

#[test]
fn test_singlet_links() {
    // Test singlet (1)
    let input = "(1)";
    let result = parse_lino(input);
    assert!(result.is_ok());
    let parsed = result.unwrap();
    if let LiNo::Link { ids, values } = parsed {
        assert!(ids.is_none());
        assert_eq!(values.len(), 1);
        if let LiNo::Ref(ref_id) = &values[0] {
            assert_eq!(ref_id, "1");
        }
    }

    // Test (1 2)
    let input = "(1 2)";
    let result = parse_lino(input);
    assert!(result.is_ok());
    let parsed = result.unwrap();
    if let LiNo::Link { ids, values } = parsed {
        assert!(ids.is_none());
        assert_eq!(values.len(), 1);
        if let LiNo::Link { ids, values } = &values[0] {
            assert!(ids.is_none());
            assert_eq!(values.len(), 2);
            assert_eq!(values[0], LiNo::Ref("1".to_string()));
            assert_eq!(values[1], LiNo::Ref("2".to_string()));
        }
    }

    // Test (1 2 3)
    let input = "(1 2 3)";
    let result = parse_lino(input);
    assert!(result.is_ok());
    let parsed = result.unwrap();
    if let LiNo::Link { ids, values } = parsed {
        assert!(ids.is_none());
        assert_eq!(values.len(), 1);
        if let LiNo::Link { ids, values } = &values[0] {
            assert!(ids.is_none());
            assert_eq!(values.len(), 3);
            assert_eq!(values[0], LiNo::Ref("1".to_string()));
            assert_eq!(values[1], LiNo::Ref("2".to_string()));
            assert_eq!(values[2], LiNo::Ref("3".to_string()));
        }
    }

    // Test (1 2 3 4)
    let input = "(1 2 3 4)";
    let result = parse_lino(input);
    assert!(result.is_ok());
    let parsed = result.unwrap();
    if let LiNo::Link { ids, values } = parsed {
        assert!(ids.is_none());
        assert_eq!(values.len(), 1);
        if let LiNo::Link { ids, values } = &values[0] {
            assert!(ids.is_none());
            assert_eq!(values.len(), 4);
            assert_eq!(values[0], LiNo::Ref("1".to_string()));
            assert_eq!(values[1], LiNo::Ref("2".to_string()));
            assert_eq!(values[2], LiNo::Ref("3".to_string()));
            assert_eq!(values[3], LiNo::Ref("4".to_string()));
        }
    }
}

#[test]
fn test_invalid_input() {
    let input = "(invalid";
    let result = parse_lino(input);
    assert!(result.is_err());
}
