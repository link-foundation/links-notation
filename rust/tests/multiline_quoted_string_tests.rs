use links_notation::{parse_lino, LiNo};

#[test]
fn test_multiline_double_quoted_reference() {
    let input = r#"(
  "long
string literal representing
the reference"

  'another
long string literal
as another reference'
)"#;
    let result = parse_lino(input).unwrap();

    if let LiNo::Link {
        ids: outer_ids,
        values: outer_values,
    } = &result
    {
        assert!(outer_ids.is_none());
        assert_eq!(outer_values.len(), 1);

        if let LiNo::Link { ids, values } = &outer_values[0] {
            assert!(ids.is_none());
            assert_eq!(values.len(), 2);

            if let LiNo::Ref(ref first_value) = values[0] {
                assert_eq!(
                    first_value,
                    "long\nstring literal representing\nthe reference"
                );
            } else {
                panic!("Expected first value to be a Ref");
            }

            if let LiNo::Ref(ref second_value) = values[1] {
                assert_eq!(
                    second_value,
                    "another\nlong string literal\nas another reference"
                );
            } else {
                panic!("Expected second value to be a Ref");
            }
        } else {
            panic!("Expected first outer value to be a Link");
        }
    } else {
        panic!("Expected result to be a Link");
    }
}

#[test]
fn test_simple_multiline_double_quoted() {
    let input = r#"("line1
line2")"#;
    let result = parse_lino(input).unwrap();

    if let LiNo::Link { ids, values } = &result {
        assert!(ids.is_none());
        assert_eq!(values.len(), 1);

        if let LiNo::Ref(ref value) = values[0] {
            assert_eq!(value, "line1\nline2");
        } else {
            panic!("Expected value to be a Ref");
        }
    } else {
        panic!("Expected result to be a Link");
    }
}

#[test]
fn test_simple_multiline_single_quoted() {
    let input = r#"('line1
line2')"#;
    let result = parse_lino(input).unwrap();

    if let LiNo::Link { ids, values } = &result {
        assert!(ids.is_none());
        assert_eq!(values.len(), 1);

        if let LiNo::Ref(ref value) = values[0] {
            assert_eq!(value, "line1\nline2");
        } else {
            panic!("Expected value to be a Ref");
        }
    } else {
        panic!("Expected result to be a Link");
    }
}

#[test]
fn test_multiline_quoted_as_id() {
    let input = r#"("multi
line
id": value1 value2)"#;
    let result = parse_lino(input).unwrap();

    if let LiNo::Link {
        ids: outer_ids,
        values: outer_values,
    } = &result
    {
        assert!(outer_ids.is_none());
        assert_eq!(outer_values.len(), 1);

        if let LiNo::Link { ids, values } = &outer_values[0] {
            assert_eq!(ids.as_ref().unwrap(), &vec!["multi\nline\nid".to_string()]);
            assert_eq!(values.len(), 2);
        } else {
            panic!("Expected first value to be a Link");
        }
    } else {
        panic!("Expected result to be a Link");
    }
}
