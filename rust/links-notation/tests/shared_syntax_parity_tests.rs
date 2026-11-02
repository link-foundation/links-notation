//! The shared syntax fixtures (issue #364): every port reads the same raw IDs,
//! quotes and concrete syntax trees from the same documents.

use links_notation::{
    LiNo, StreamParser, SyntaxReference, parse_lino_to_cst, parse_lino_to_syntax_links,
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

fn hex(text: Option<&str>) -> String {
    text.map_or_else(
        || "~".to_owned(),
        |text| {
            text.as_bytes()
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect()
        },
    )
}

/// The links as the fixture writes them: `(ID|RAW|QUOTE children...)`.
fn tree(links: &[LiNo<SyntaxReference>]) -> String {
    links
        .iter()
        .map(|link| {
            let (id, values) = match link {
                LiNo::Ref(id) => (Some(id), &[][..]),
                LiNo::Link { id, values } => (id.as_ref(), values.as_slice()),
            };
            let quote = link.quote().map(String::from);
            let head = format!(
                "{}|{}|{}",
                hex(id.map(|id| id.value.as_str())),
                hex(link.raw_id()),
                hex(quote.as_deref())
            );
            if values.is_empty() {
                format!("({head})")
            } else {
                format!("({head} {})", tree(values))
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn vectors(tsv: &str) -> impl Iterator<Item = Vec<&str>> {
    tsv.lines()
        .filter(|line| !line.starts_with('#'))
        .map(|line| line.split('\t').collect::<Vec<_>>())
}

const SYNTAX_VECTORS: &str = include_str!("../../../parity/syntax-vectors.tsv");
const TEXT_VECTORS: &str = include_str!("../../../parity/text-vectors.tsv");

#[test]
fn shared_syntax_parity() {
    let mut count = 0;
    for columns in vectors(SYNTAX_VECTORS) {
        assert_eq!(columns.len(), 4, "{}", columns[0]);
        let id = columns[0];
        let input = decode(columns[1]);
        let links = parse_lino_to_syntax_links(&input).unwrap();
        assert_eq!(tree(&links), columns[2], "{id} links");
        let mut stream = StreamParser::syntax();
        for character in input.chars() {
            stream.write(&character.to_string()).unwrap();
        }
        assert_eq!(tree(&stream.finish().unwrap()), columns[2], "{id} stream");
        let cst = parse_lino_to_cst(&input).unwrap();
        assert_eq!(cst.to_s_expression(), decode(columns[3]), "{id} cst");
        assert_eq!(cst.to_string(), input, "{id} display");
        count += 1;
    }
    assert!(count > 0, "empty syntax fixture corpus");
}

#[test]
fn every_shared_input_is_recovered_from_its_cst() {
    let mut count = 0;
    for columns in vectors(TEXT_VECTORS).chain(vectors(SYNTAX_VECTORS)) {
        let id = columns[0];
        let input = decode(columns[1]);
        let cst = parse_lino_to_cst(&input).unwrap();
        assert_eq!(cst.to_string(), input, "{id} display");
        assert_eq!(cst.text(), input, "{id} text");
        let tokens: String = cst.tokens().iter().map(|token| token.text()).collect();
        assert_eq!(tokens, input, "{id} tokens");
        count += 1;
    }
    assert!(count > 0, "empty fixture corpus");
}
