use links_notation::{
    binary::{format_document, format_reference, BinaryLinoCodec},
    decode_reference_literal, encode_reference_literal, format_links, format_links_with_config,
    parse_lino_to_links, LiNo, StreamParser,
};

fn fixtures() -> Vec<String> {
    include_str!("../../../docs/protocol/reference-literals.txt")
        .lines()
        .filter(|line| !line.starts_with('#'))
        .map(|line| {
            if line == "-" {
                String::new()
            } else {
                String::from_utf8(
                    (0..line.len())
                        .step_by(2)
                        .map(|i| u8::from_str_radix(&line[i..i + 2], 16).unwrap())
                        .collect(),
                )
                .unwrap()
            }
        })
        .collect()
}

#[test]
fn native_reference_fidelity() {
    for reference in fixtures() {
        let original = vec![LiNo::Link {
            id: Some(reference.clone()),
            values: vec![
                LiNo::Ref(reference.clone()),
                LiNo::Link {
                    id: Some("nested".into()),
                    values: vec![LiNo::Ref(reference)],
                },
            ],
        }];
        assert_eq!(
            parse_lino_to_links(&format_links(&original)).unwrap(),
            original
        );
        for config in [
            links_notation::format_config::FormatConfig::builder()
                .less_parentheses(true)
                .build(),
            links_notation::format_config::FormatConfig::builder()
                .max_inline_refs(Some(1))
                .prefer_inline(false)
                .build(),
        ] {
            assert_eq!(
                parse_lino_to_links(&format_links_with_config(&original, &config)).unwrap(),
                original
            );
        }
    }
}

#[test]
fn reference_literals_at_every_chunk_split() {
    for reference in fixtures() {
        assert_eq!(
            decode_reference_literal(&encode_reference_literal(&reference)).unwrap(),
            reference
        );
        for literal in [
            format_reference(&reference),
            encode_reference_literal(&reference),
        ] {
            let text = format!("(root: {})\n({}: fixture)", literal, literal);
            let expected = vec![
                LiNo::Link {
                    id: Some("root".into()),
                    values: vec![LiNo::Ref(reference.clone())],
                },
                LiNo::Link {
                    id: Some(reference.clone()),
                    values: vec![LiNo::Ref("fixture".into())],
                },
            ];
            assert_eq!(parse_lino_to_links(&text).unwrap(), expected);
            for split in (0..=text.len()).filter(|&i| text.is_char_boundary(i)) {
                let mut stream = StreamParser::new();
                stream.write(&text[..split]).unwrap();
                stream.write(&text[split..]).unwrap();
                assert_eq!(stream.finish().unwrap(), expected);
            }
        }
    }
}

#[test]
fn binary_reference_fidelity() {
    let codec = BinaryLinoCodec::default();
    for reference in fixtures() {
        let original = vec![LiNo::Link {
            id: Some(reference.clone()),
            values: vec![LiNo::Ref(reference)],
        }];
        let decoded = codec.decode(&codec.encode(&original).unwrap()).unwrap();
        assert_eq!(decoded, original);
        assert_eq!(
            parse_lino_to_links(&format_document(&decoded)).unwrap(),
            original
        );
    }
}

#[test]
fn malformed_reference_literals_are_rejected() {
    for literal in include_str!("../../../docs/protocol/invalid-reference-literals.txt")
        .lines()
        .filter(|line| !line.starts_with('#'))
    {
        assert!(decode_reference_literal(literal).is_err(), "{literal}");
        assert!(parse_lino_to_links(literal).is_err(), "{literal}");
    }
    assert_eq!(decode_reference_literal("~1{C3A9}").unwrap(), "é");
}
