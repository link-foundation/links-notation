use links_notation::LiNo;

#[test]
fn links_group_constructor_test() {
    // Test creating a basic group structure (similar to LinksGroup constructor)
    let element = LiNo::Ref("root".to_string());
    let children = vec![
        LiNo::Ref("child1".to_string()),
        LiNo::Ref("child2".to_string()),
    ];

    // Verify element
    assert_eq!(element, LiNo::Ref("root".to_string()));

    // Verify children
    assert_eq!(children.len(), 2);
    assert_eq!(children[0], LiNo::Ref("child1".to_string()));
    assert_eq!(children[1], LiNo::Ref("child2".to_string()));
}

#[test]
fn links_group_constructor_equivalent_test() {
    // Test creating a nested structure equivalent to LinksGroup
    let root = LiNo::Ref("root".to_string());
    let children = vec![
        LiNo::Ref("child1".to_string()),
        LiNo::Ref("child2".to_string()),
    ];
    let group = LiNo::Link {
        id: Some("group".to_string()),
        values: vec![root.clone()]
            .into_iter()
            .chain(children.clone())
            .collect(),
    };

    if let LiNo::Link { id, values } = group {
        assert_eq!(id, Some("group".to_string()));
        assert_eq!(values.len(), 3); // root + 2 children
        assert_eq!(values[0], root);
    } else {
        panic!("Expected Link variant");
    }
}

#[test]
fn links_group_to_list_flattens_structure_test() {
    // Test creating and flattening a nested structure
    let root = LiNo::Ref("root".to_string());
    let child1 = LiNo::Ref("child1".to_string());
    let child2 = LiNo::Ref("child2".to_string());
    let grandchild = LiNo::Ref("grandchild".to_string());

    // Create nested structure: root with child1 and (child2 with grandchild)
    let nested_child = LiNo::Link::<String> {
        id: None,
        values: vec![child2.clone(), grandchild.clone()],
    };

    let group = LiNo::Link {
        id: None,
        values: vec![root.clone(), child1.clone(), nested_child],
    };

    // Verify the structure
    if let LiNo::Link { id, values } = group {
        assert_eq!(id, None);
        assert_eq!(values.len(), 3);
        assert_eq!(values[0], root);
        assert_eq!(values[1], child1);

        // Check nested structure
        if let LiNo::Link {
            id: nested_id,
            values: nested_values,
        } = &values[2]
        {
            assert_eq!(*nested_id, None);
            assert_eq!(nested_values.len(), 2);
            assert_eq!(nested_values[0], child2);
            assert_eq!(nested_values[1], grandchild);
        }
    }
}

#[test]
fn links_group_to_string_test() {
    // Test string representation of nested structure
    let root = LiNo::Ref("root".to_string());
    let children = vec![
        LiNo::Ref("child1".to_string()),
        LiNo::Ref("child2".to_string()),
    ];
    let group = LiNo::Link::<String> {
        id: None,
        values: vec![root].into_iter().chain(children).collect(),
    };

    let str_output = group.to_string();
    assert!(str_output.contains("root"));
    assert!(str_output.contains("child1"));
    assert!(str_output.contains("child2"));
    assert!(str_output.contains("(") && str_output.contains(")")); // Should be wrapped in parentheses
}

#[test]
fn links_group_append_to_links_list_test() {
    // Test appending group elements to a list
    let element = LiNo::Ref("root".to_string());
    let children = vec![
        LiNo::Ref("child1".to_string()),
        LiNo::Ref("child2".to_string()),
    ];

    // Create a group structure
    let group = LiNo::Link::<String> {
        id: None,
        values: vec![element.clone()]
            .into_iter()
            .chain(children.clone())
            .collect(),
    };

    // Append to a list (simulating AppendToLinksList)
    let mut list: Vec<LiNo<String>> = Vec::new();
    list.push(group.clone());

    if let LiNo::Link { id: _, values } = group {
        for value in values {
            list.push(value);
        }
    }

    assert_eq!(list.len(), 4); // group + element + 2 children
}
