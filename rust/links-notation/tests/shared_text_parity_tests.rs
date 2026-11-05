use links_notation::format_config::FormatConfig;
use links_notation::{
    LiNo, StreamParser, format_links, format_links_with_config, parse_lino_to_links,
};

fn decode(hex: &str) -> String {
    String::from_utf8(
        hex.as_bytes()
            .chunks_exact(2)
            .map(|pair| u8::from_str_radix(std::str::from_utf8(pair).unwrap(), 16).unwrap())
            .collect(),
    )
    .unwrap()
}

fn tree(links: &[LiNo<String>]) -> String {
    links
        .iter()
        .map(|link| {
            let (id, values) = match link {
                LiNo::Ref(id) => (Some(id), &[][..]),
                LiNo::Link { id, values } => (id.as_ref(), values.as_slice()),
            };
            let reference = id.map_or_else(
                || "~".to_owned(),
                |id| {
                    id.as_bytes()
                        .iter()
                        .map(|byte| format!("{byte:02x}"))
                        .collect()
                },
            );
            if values.is_empty() {
                format!("({reference})")
            } else {
                format!("({reference} {})", tree(values))
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[test]
fn shared_text_parity() {
    let vectors = include_str!("../../../parity/text-vectors.tsv");
    let mut count = 0;
    for line in vectors.lines().filter(|line| !line.starts_with('#')) {
        let columns: Vec<_> = line.split('\t').collect();
        assert_eq!(columns.len(), 5);
        let input = decode(columns[1]);
        let formatted = decode(columns[3]);
        let parsed = parse_lino_to_links(&input).unwrap();
        assert_eq!(tree(&parsed), columns[2], "{} parse", columns[0]);
        assert_eq!(format_links(&parsed), formatted, "{} format", columns[0]);
        assert_eq!(tree(&parse_lino_to_links(&formatted).unwrap()), columns[2]);
        let mut stream = StreamParser::new();
        for character in input.chars() {
            stream.write(&character.to_string()).unwrap();
        }
        assert_eq!(
            tree(&stream.finish().unwrap()),
            columns[2],
            "{} stream",
            columns[0]
        );
        count += 1;
    }
    assert!(count > 0, "empty fixture corpus");
}

#[test]
fn shared_less_parentheses_round_trip() {
    let config = FormatConfig::builder().less_parentheses(true).build();
    let vectors = include_str!("../../../parity/text-vectors.tsv");
    let mut count = 0;
    for line in vectors.lines().filter(|line| !line.starts_with('#')) {
        let columns: Vec<_> = line.split('\t').collect();
        let less_parentheses = decode(columns[4]);
        let parsed = parse_lino_to_links(&decode(columns[1])).unwrap();
        assert_eq!(
            format_links_with_config(&parsed, &config),
            less_parentheses,
            "{} format",
            columns[0]
        );
        assert_eq!(
            tree(&parse_lino_to_links(&less_parentheses).unwrap()),
            columns[2],
            "{} reparse",
            columns[0]
        );
        count += 1;
    }
    assert!(count > 0, "empty fixture corpus");
}

#[test]
fn shared_nested_format() {
    let mut count = 0;
    for line in include_str!("../../../parity/nested-vectors.tsv")
        .lines()
        .filter(|line| !line.starts_with('#'))
    {
        let columns: Vec<_> = line.split('\t').collect();
        assert_eq!(columns.len(), 3);
        let links = parse_lino_to_links(&decode(columns[1])).unwrap();
        assert_eq!(
            links_notation::format_nested(&links),
            decode(columns[2]),
            "{}",
            columns[0]
        );
        count += 1;
    }
    assert!(count > 0);
}

#[test]
fn anonymous_threshold_round_trip() {
    for input in ["a b c", "((b c))", "(a (b c))"] {
        let links = parse_lino_to_links(input).unwrap();
        for config in [
            FormatConfig::builder()
                .less_parentheses(true)
                .max_inline_refs(Some(0))
                .prefer_inline(false)
                .build(),
            FormatConfig::builder()
                .less_parentheses(true)
                .indent_long_lines(true)
                .max_line_length(1)
                .prefer_inline(false)
                .build(),
        ] {
            let text = format_links_with_config(&links, &config);
            assert_eq!(
                tree(&parse_lino_to_links(&text).unwrap()),
                tree(&links),
                "{input}"
            );
        }
    }
}
