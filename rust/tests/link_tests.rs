use ln::Ln;

#[test]
fn link_constructor_with_id_only_test() {
    let link = Ln::Link::<String> {
        id: Some("test".to_string()),
        values: vec![],
    };
    if let Ln::Link { id, values } = link {
        assert_eq!(id, Some("test".to_string()));
        assert!(values.is_empty());
    } else {
        panic!("Expected Link variant");
    }
}

#[test]
fn link_constructor_with_id_and_values_test() {
    let values = vec![
        Ln::Ref("value1".to_string()),
        Ln::Ref("value2".to_string()),
    ];
    let link = Ln::Link {
        id: Some("parent".to_string()),
        values: values.clone(),
    };
    if let Ln::Link { id, values: link_values } = link {
        assert_eq!(id, Some("parent".to_string()));
        assert_eq!(link_values.len(), 2);
    } else {
        panic!("Expected Link variant");
    }
}

#[test]
fn link_to_string_with_id_only_test() {
    let link = Ln::Link::<String> {
        id: Some("test".to_string()),
        values: vec![],
    };
    assert_eq!(link.to_string(), "(test: )");
}

#[test]
fn link_to_string_with_values_only_test() {
    let values = vec![
        Ln::Ref("value1".to_string()),
        Ln::Ref("value2".to_string()),
    ];
    let link = Ln::Link::<String> {
        id: None,
        values,
    };
    assert_eq!(link.to_string(), "(value1 value2)");
}

#[test]
fn link_to_string_with_id_and_values_test() {
    let values = vec![
        Ln::Ref("child1".to_string()),
        Ln::Ref("child2".to_string()),
    ];
    let link = Ln::Link {
        id: Some("parent".to_string()),
        values,
    };
    assert_eq!(link.to_string(), "(parent: child1 child2)");
}

#[test]
fn link_equals_test() {
    let link1 = Ln::Link::<String> {
        id: Some("test".to_string()),
        values: vec![],
    };
    let link2 = Ln::Link::<String> {
        id: Some("test".to_string()),
        values: vec![],
    };
    let link3 = Ln::Link::<String> {
        id: Some("other".to_string()),
        values: vec![],
    };
    
    assert_eq!(link1, link2);
    assert_ne!(link1, link3);
}

#[test]
fn link_combine_test() {
    // Rust doesn't have a direct combine method, but we can test creating combined structures
    let link1 = Ln::Ref("first".to_string());
    let link2 = Ln::Ref("second".to_string());
    let combined = Ln::Link::<String> {
        id: None,
        values: vec![link1, link2],
    };
    
    if let Ln::Link { id, values } = combined {
        assert_eq!(id, None);
        assert_eq!(values.len(), 2);
    } else {
        panic!("Expected Link variant");
    }
}

#[test]
fn link_escape_reference_simple_test() {
    let ref_simple = Ln::Ref("test".to_string());
    assert_eq!(ref_simple.to_string(), "test");
    
    let ref_with_nums = Ln::Ref("test123".to_string());
    assert_eq!(ref_with_nums.to_string(), "test123");
}

#[test]
fn link_escape_reference_with_special_characters_test() {
    // In Rust implementation, special character handling would be in the parser
    // These tests verify basic string handling
    let ref_space = Ln::Ref("has space".to_string());
    assert_eq!(ref_space.to_string(), "has space");
    
    let ref_colon = Ln::Ref("has:colon".to_string());
    assert_eq!(ref_colon.to_string(), "has:colon");
}

#[test]
fn link_simplify_test() {
    // Test simplification behavior - empty values
    let link1 = Ln::Link::<String> {
        id: Some("test".to_string()),
        values: vec![],
    };
    // In Rust, we don't have a simplify method, but we can test the structure
    if let Ln::Link { id, values } = link1 {
        assert_eq!(id, Some("test".to_string()));
        assert!(values.is_empty());
    }

    // Test with single value
    let single_ref = Ln::Ref("single".to_string());
    let link2 = Ln::Link::<String> {
        id: None,
        values: vec![single_ref.clone()],
    };
    if let Ln::Link { id, values } = link2 {
        assert_eq!(id, None);
        assert_eq!(values.len(), 1);
        assert_eq!(values[0], single_ref);
    }
}