use links_notation::{LiNo, StreamParser, format_links, parse_lino_to_links};

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
        assert_eq!(columns.len(), 4);
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
