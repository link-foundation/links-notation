use links_notation::{parse_lino, parse_lino_to_links, LiNo};

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
    assert_eq!(
        parse_lino_to_links(input).unwrap(),
        vec![LiNo::anonymous(vec![
            LiNo::anonymous(vec![LiNo::Ref(
                "long\nstring literal representing\nthe reference".to_string()
            )]),
            LiNo::anonymous(vec![LiNo::Ref(
                "another\nlong string literal\nas another reference".to_string()
            )]),
        ])]
    );
}

#[test]
fn test_simple_multiline_double_quoted() {
    let input = r#"("line1
line2")"#;
    assert_eq!(
        parse_lino_to_links(input).unwrap(),
        vec![LiNo::anonymous(vec![LiNo::Ref("line1\nline2".to_string())])]
    );
}

#[test]
fn test_simple_multiline_single_quoted() {
    let input = r#"('line1
line2')"#;
    assert_eq!(
        parse_lino_to_links(input).unwrap(),
        vec![LiNo::anonymous(vec![LiNo::Ref("line1\nline2".to_string())])]
    );
}

#[test]
fn test_multiline_quoted_as_id() {
    let input = r#"("multi
line
id": value1 value2)"#;
    let result = parse_lino(input).unwrap();

    if let LiNo::Link {
        id: outer_id,
        values: outer_values,
    } = &result
    {
        assert!(outer_id.is_none());
        assert_eq!(outer_values.len(), 1);

        if let LiNo::Link { id, values } = &outer_values[0] {
            assert_eq!(id.as_ref().unwrap(), "multi\nline\nid");
            assert_eq!(values.len(), 2);
        } else {
            panic!("Expected first value to be a Link");
        }
    } else {
        panic!("Expected result to be a Link");
    }
}
