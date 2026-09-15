use links_notation::parse_lino_to_links;
use links_notation::LiNo;

#[test]
fn test_nested_self_referenced_object_in_pair_value() {
    // Test case from PARSER_BUG.md
    // This should parse a dict with two pairs, where the second pair's value
    // is itself a self-referenced dict definition (obj_1: dict ...)
    let notation = r#"(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))"#;

    let links = parse_lino_to_links(notation).expect("Failed to parse notation");

    // Should parse exactly one top-level link
    assert_eq!(links.len(), 1);

    if let LiNo::Link { id, values } = &links[0] {
        // Top-level link should have ID "obj_0"
        assert_eq!(id, &Some("obj_0".to_string()));

        // Should have: type marker + 2 pairs = 3 values
        assert_eq!(values.len(), 3);

        // First value is the type marker "dict"
        match &values[0] {
            LiNo::Ref(dict_type) => assert_eq!(dict_type, "dict"),
            _ => panic!("Expected Ref for type marker"),
        }

        // Second and third values are the two pairs
        let pair1 = &values[1];
        let pair2 = &values[2];

        // Pair 1: ((str bmFtZQ==) (str ZGljdDE=))
        if let LiNo::Link {
            id: pair1_id,
            values: pair1_values,
        } = pair1
        {
            assert_eq!(pair1_id, &None);
            assert_eq!(pair1_values.len(), 2);

            // First element of pair1: (str bmFtZQ==)
            if let LiNo::Link {
                id: elem1_id,
                values: elem1_values,
            } = &pair1_values[0]
            {
                assert_eq!(elem1_id, &None);
                assert_eq!(elem1_values.len(), 2);
                assert_eq!(elem1_values[0], LiNo::Ref("str".to_string()));
                assert_eq!(elem1_values[1], LiNo::Ref("bmFtZQ==".to_string()));
            } else {
                panic!("Expected Link for pair1 element 0");
            }

            // Second element of pair1: (str ZGljdDE=)
            if let LiNo::Link {
                id: elem2_id,
                values: elem2_values,
            } = &pair1_values[1]
            {
                assert_eq!(elem2_id, &None);
                assert_eq!(elem2_values.len(), 2);
                assert_eq!(elem2_values[0], LiNo::Ref("str".to_string()));
                assert_eq!(elem2_values[1], LiNo::Ref("ZGljdDE=".to_string()));
            } else {
                panic!("Expected Link for pair1 element 1");
            }
        } else {
            panic!("Expected Link for pair1");
        }

        // Pair 2: ((str b3RoZXI=) (obj_1: dict ...))
        // This is the critical test - the second element should be a self-referenced dict
        if let LiNo::Link {
            id: pair2_id,
            values: pair2_values,
        } = pair2
        {
            assert_eq!(pair2_id, &None);
            assert_eq!(pair2_values.len(), 2);

            // First element of pair2: (str b3RoZXI=)
            if let LiNo::Link {
                id: key_id,
                values: key_values,
            } = &pair2_values[0]
            {
                assert_eq!(key_id, &None);
                assert_eq!(key_values.len(), 2);
                assert_eq!(key_values[0], LiNo::Ref("str".to_string()));
                assert_eq!(key_values[1], LiNo::Ref("b3RoZXI=".to_string()));
            } else {
                panic!("Expected Link for pair2 key");
            }

            // Second element of pair2: (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))
            // THIS IS THE KEY TEST - obj_1 should have its ID preserved
            if let LiNo::Link {
                id: obj1_id,
                values: obj1_values,
            } = &pair2_values[1]
            {
                assert_eq!(
                    obj1_id,
                    &Some("obj_1".to_string()),
                    "obj_1 should have its ID preserved"
                );
                assert_eq!(
                    obj1_values.len(),
                    3,
                    "obj_1 should have 3 values (type marker + 2 pairs)"
                );

                // obj_1's type marker
                assert_eq!(obj1_values[0], LiNo::Ref("dict".to_string()));

                // obj_1's first pair: ((str bmFtZQ==) (str ZGljdDI=))
                if let LiNo::Link {
                    values: obj1_pair1_values,
                    ..
                } = &obj1_values[1]
                {
                    assert_eq!(obj1_pair1_values.len(), 2);

                    if let LiNo::Link {
                        values: k1_values, ..
                    } = &obj1_pair1_values[0]
                    {
                        assert_eq!(k1_values[0], LiNo::Ref("str".to_string()));
                        assert_eq!(k1_values[1], LiNo::Ref("bmFtZQ==".to_string()));
                    }

                    if let LiNo::Link {
                        values: v1_values, ..
                    } = &obj1_pair1_values[1]
                    {
                        assert_eq!(v1_values[0], LiNo::Ref("str".to_string()));
                        assert_eq!(v1_values[1], LiNo::Ref("ZGljdDI=".to_string()));
                    }
                }

                // obj_1's second pair: ((str b3RoZXI=) obj_0) - reference back to obj_0
                if let LiNo::Link {
                    values: obj1_pair2_values,
                    ..
                } = &obj1_values[2]
                {
                    assert_eq!(obj1_pair2_values.len(), 2);

                    if let LiNo::Link {
                        values: k2_values, ..
                    } = &obj1_pair2_values[0]
                    {
                        assert_eq!(k2_values[0], LiNo::Ref("str".to_string()));
                        assert_eq!(k2_values[1], LiNo::Ref("b3RoZXI=".to_string()));
                    }

                    // Should be a reference back to obj_0
                    assert_eq!(obj1_pair2_values[1], LiNo::Ref("obj_0".to_string()));
                }
            } else {
                panic!("Expected Link for obj_1");
            }
        } else {
            panic!("Expected Link for pair2");
        }
    } else {
        panic!("Expected Link for top-level");
    }
}

#[test]
fn test_self_reference_as_direct_child_works_correctly() {
    // This pattern should work (and did work before)
    let notation = r#"(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))"#;

    let links = parse_lino_to_links(notation).expect("Failed to parse notation");

    assert_eq!(links.len(), 1);

    if let LiNo::Link { id, values } = &links[0] {
        assert_eq!(id, &Some("obj_0".to_string()));
        assert_eq!(values.len(), 4); // list + 1 + 2 + obj_1

        // The fourth value should be obj_1 with a self-reference
        if let LiNo::Link {
            id: obj1_id,
            values: obj1_values,
        } = &values[3]
        {
            assert_eq!(obj1_id, &Some("obj_1".to_string()));
            assert_eq!(obj1_values.len(), 4); // list + 3 + 4 + obj_0
            assert_eq!(obj1_values[3], LiNo::Ref("obj_0".to_string()));
        } else {
            panic!("Expected Link for obj_1");
        }
    } else {
        panic!("Expected Link for top-level");
    }
}
