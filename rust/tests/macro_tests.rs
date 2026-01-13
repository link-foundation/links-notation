#[cfg(feature = "macro")]
mod macro_tests {
    use links_notation::{lino, LiNo};

    #[test]
    fn test_simple_reference() {
        let result = lino!("simple");
        // The macro should parse "simple" as a single reference
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 1);
                match &values[0] {
                    LiNo::Ref(r) => assert_eq!(r, "simple"),
                    _ => panic!("Expected a reference"),
                }
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_link_with_id_and_values() {
        let result = lino!("papa (lovesMama: loves mama)");
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 1);
                // The top-level has one link containing papa and the lovesMama link
                match &values[0] {
                    LiNo::Link {
                        id: None,
                        values: inner,
                    } => {
                        assert_eq!(inner.len(), 2);
                        // First value is "papa"
                        match &inner[0] {
                            LiNo::Ref(r) => assert_eq!(r, "papa"),
                            _ => panic!("Expected a reference for papa"),
                        }
                        // Second value is the link (lovesMama: loves mama)
                        match &inner[1] {
                            LiNo::Link {
                                id: Some(id),
                                values: love_values,
                            } => {
                                assert_eq!(id, "lovesMama");
                                assert_eq!(love_values.len(), 2);
                            }
                            _ => panic!("Expected a link for lovesMama"),
                        }
                    }
                    _ => panic!("Expected inner link"),
                }
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_triplet() {
        let result = lino!("papa has car");
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 1);
                match &values[0] {
                    LiNo::Link {
                        id: None,
                        values: inner,
                    } => {
                        assert_eq!(inner.len(), 3);
                        match &inner[0] {
                            LiNo::Ref(r) => assert_eq!(r, "papa"),
                            _ => panic!("Expected papa"),
                        }
                        match &inner[1] {
                            LiNo::Ref(r) => assert_eq!(r, "has"),
                            _ => panic!("Expected has"),
                        }
                        match &inner[2] {
                            LiNo::Ref(r) => assert_eq!(r, "car"),
                            _ => panic!("Expected car"),
                        }
                    }
                    _ => panic!("Expected inner link"),
                }
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_parenthesized_link() {
        let result = lino!("(parent: child1 child2)");
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 1);
                match &values[0] {
                    LiNo::Link {
                        id: Some(id),
                        values: inner_values,
                    } => {
                        assert_eq!(id, "parent");
                        assert_eq!(inner_values.len(), 2);
                        match &inner_values[0] {
                            LiNo::Ref(r) => assert_eq!(r, "child1"),
                            _ => panic!("Expected child1"),
                        }
                        match &inner_values[1] {
                            LiNo::Ref(r) => assert_eq!(r, "child2"),
                            _ => panic!("Expected child2"),
                        }
                    }
                    _ => panic!("Expected a link with id"),
                }
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_nested_links() {
        let result = lino!("(outer (inner value))");
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 1);
                match &values[0] {
                    LiNo::Link {
                        id: None,
                        values: outer_link,
                    } => {
                        assert_eq!(outer_link.len(), 2);
                        match &outer_link[0] {
                            LiNo::Ref(r) => assert_eq!(r, "outer"),
                            _ => panic!("Expected outer ref"),
                        }
                        match &outer_link[1] {
                            LiNo::Link {
                                id: None,
                                values: inner_values,
                            } => {
                                assert_eq!(inner_values.len(), 2);
                                match &inner_values[0] {
                                    LiNo::Ref(r) => assert_eq!(r, "inner"),
                                    _ => panic!("Expected inner ref"),
                                }
                                match &inner_values[1] {
                                    LiNo::Ref(r) => assert_eq!(r, "value"),
                                    _ => panic!("Expected value ref"),
                                }
                            }
                            _ => panic!("Expected inner link"),
                        }
                    }
                    _ => panic!("Expected outer link"),
                }
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_multiple_lines() {
        let result = lino!("papa has car\nmama has house");
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 2);
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_quoted_strings() {
        let result = lino!(r#"("quoted id": "quoted value")"#);
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 1);
                match &values[0] {
                    LiNo::Link {
                        id: Some(id),
                        values: inner_values,
                    } => {
                        assert_eq!(id, "quoted id");
                        assert_eq!(inner_values.len(), 1);
                        match &inner_values[0] {
                            LiNo::Ref(r) => assert_eq!(r, "quoted value"),
                            _ => panic!("Expected quoted value"),
                        }
                    }
                    _ => panic!("Expected link with quoted id"),
                }
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_empty_input() {
        let result = lino!("");
        match result {
            LiNo::Link {
                id: None,
                values: v,
            } => {
                assert_eq!(v.len(), 0);
            }
            _ => panic!("Expected empty link"),
        }
    }

    #[test]
    fn test_formatting_works() {
        let result = lino!("papa (lovesMama: loves mama)");
        let formatted = format!("{}", result);
        assert!(!formatted.is_empty());
    }

    #[test]
    fn test_runtime_equivalence() {
        let input = "papa (lovesMama: loves mama)";
        let macro_result = lino!("papa (lovesMama: loves mama)");
        let runtime_result = links_notation::parse_lino(input).unwrap();
        assert_eq!(macro_result, runtime_result);
    }

    #[test]
    fn test_indented_syntax() {
        let result = lino!(
            r#"3:
  papa
  loves
  mama"#
        );
        match result {
            LiNo::Link { id: None, values } => {
                assert_eq!(values.len(), 1);
                match &values[0] {
                    LiNo::Link {
                        id: Some(id),
                        values: inner_values,
                    } => {
                        assert_eq!(id, "3");
                        assert_eq!(inner_values.len(), 3);
                    }
                    _ => panic!("Expected link with id"),
                }
            }
            _ => panic!("Expected a link with values"),
        }
    }

    #[test]
    fn test_compile_time_validation() {
        // This should compile fine
        let _valid = lino!("(valid syntax)");

        // These would fail at compile time if uncommented:
        // let _invalid1 = lino!("(unclosed");
        // let _invalid2 = lino!("unclosed)");
        // let _invalid3 = lino!(r#"("unclosed quote)"#);
    }
}
