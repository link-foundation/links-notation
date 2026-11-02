//! Parsed links record how their IDs were written (issue #364).

use links_notation::{
    LiNo, ParserConfig, SyntaxReference, format_links, parse_lino, parse_lino_to_links,
    parse_lino_to_syntax_links, parse_lino_to_syntax_links_with_config, reference_quote,
};
use std::collections::HashSet;

fn values(link: &LiNo<SyntaxReference>) -> &[LiNo<SyntaxReference>] {
    match link {
        LiNo::Link { values, .. } => values,
        LiNo::Ref(_) => panic!("expected a link, found a reference"),
    }
}

fn reference(link: &LiNo<SyntaxReference>) -> &SyntaxReference {
    match link {
        LiNo::Ref(reference) => reference,
        LiNo::Link { .. } => panic!("expected a reference, found a link"),
    }
}

fn plain(links: Vec<LiNo<SyntaxReference>>) -> Vec<LiNo<String>> {
    links.into_iter().map(LiNo::into_values).collect()
}

#[test]
fn one_and_quoted_one_are_the_same_reference_but_keep_how_they_were_written() {
    let links = parse_lino_to_syntax_links("(t 1 '1')").unwrap();
    let bare = reference(&values(&links[0])[1]);
    let quoted = reference(&values(&links[0])[2]);
    assert_eq!(bare.value, "1");
    assert_eq!(quoted.value, "1");
    assert_eq!(bare.raw.as_deref(), Some("1"));
    assert_eq!(quoted.raw.as_deref(), Some("'1'"));
    assert_eq!(bare.quote(), None);
    assert_eq!(quoted.quote(), Some('\''));
    // Equality, hashing and formatting ignore the metadata.
    assert_eq!(bare, quoted);
    assert_eq!(HashSet::from([bare.clone(), quoted.clone()]).len(), 1);
    assert_eq!(format!("{}", links[0]), "(t 1 1)");
    assert_eq!(format_links(&plain(links)), "(t 1 1)");
}

#[test]
fn records_every_quote_kind_and_run_length() {
    let links = parse_lino_to_syntax_links("(\"a\": 'b' `c` \"\"d\"\" ~1{65} f)").unwrap();
    assert_eq!(links[0].raw_id(), Some("\"a\""));
    assert_eq!(links[0].quote(), Some('"'));
    let written: Vec<_> = values(&links[0])
        .iter()
        .map(|value| (value.raw_id(), value.quote()))
        .collect();
    assert_eq!(
        written,
        [
            (Some("'b'"), Some('\'')),
            (Some("`c`"), Some('`')),
            (Some("\"\"d\"\""), Some('"')),
            (Some("~1{65}"), None),
            (Some("f"), None),
        ]
    );
}

#[test]
fn keeps_raw_text_from_the_source_not_from_comment_stripping() {
    let links = parse_lino_to_syntax_links("(a 'b # c') # d").unwrap();
    assert_eq!(values(&links[0])[1].raw_id(), Some("'b # c'"));
}

#[test]
fn keeps_raw_text_of_multiline_and_unicode_references() {
    let links = parse_lino_to_syntax_links("(根: \"one\r\ntwo\" café)").unwrap();
    assert_eq!(links[0].raw_id(), Some("根"));
    assert_eq!(values(&links[0])[0].raw_id(), Some("\"one\r\ntwo\""));
    assert_eq!(values(&links[0])[1].raw_id(), Some("café"));
}

#[test]
fn links_without_written_ids_have_no_raw_text() {
    let links = parse_lino_to_syntax_links("(a b)").unwrap();
    assert_eq!(links[0].raw_id(), None);
    assert_eq!(links[0].quote(), None);
    let built = SyntaxReference::new("x");
    assert_eq!(built.raw, None);
    assert_eq!(built.quote(), None);
    assert_eq!(LiNo::Ref(SyntaxReference::from("x")).raw_id(), None);
}

#[test]
fn indented_ids_and_path_combinations() {
    let links = parse_lino_to_syntax_links("'root':\n  \"child\"\n  leaf").unwrap();
    assert_eq!(links[0].raw_id(), Some("'root'"));
    assert_eq!(values(&links[0])[0].raw_id(), Some("\"child\""));

    let links = parse_lino_to_syntax_links("a\n  'b'").unwrap();
    // The combined link has no ID; the references it combines keep theirs.
    assert_eq!(links[1].raw_id(), None);
    let combined = values(&links[1]);
    assert_eq!(values(&combined[1])[0].raw_id(), Some("'b'"));
}

#[test]
fn does_not_change_equality_formatting_or_the_ast_mode() {
    let quoted = parse_lino_to_syntax_links("('a': 'b')").unwrap();
    let bare = parse_lino_to_syntax_links("(a: b)").unwrap();
    assert_eq!(quoted, bare);
    assert_eq!(format!("{}", quoted[0]), format!("{}", bare[0]));
    assert_eq!(
        format!("{:?}", plain(quoted.clone())),
        format!("{:?}", plain(bare))
    );
    // The existing functions are the AST mode and read the same links.
    let ast = parse_lino_to_links("('a': 'b')").unwrap();
    assert_eq!(ast, plain(quoted.clone()));
    assert_eq!(
        ast,
        quoted
            .into_iter()
            .map(LiNo::<String>::from)
            .collect::<Vec<_>>()
    );
    assert_eq!(format_links(&ast), "(a: b)");
    assert_eq!(format!("{}", parse_lino("('a': 'b')").unwrap()), "((a: b))");
}

#[test]
fn syntax_links_follow_the_parser_config() {
    let config = ParserConfig::without_comments();
    let links = parse_lino_to_syntax_links_with_config("(a #b)", &config).unwrap();
    assert_eq!(values(&links[0])[1].raw_id(), Some("#b"));
    let deep = ParserConfig::new().with_max_depth(1);
    assert!(parse_lino_to_syntax_links_with_config("((a))", &deep).is_err());
    assert!(parse_lino_to_syntax_links("(a").is_err());
    assert!(parse_lino_to_syntax_links("").unwrap().is_empty());
}

#[test]
fn reference_quote_reads_the_delimiter_of_one_complete_reference() {
    assert_eq!(reference_quote("'1'"), Some('\''));
    assert_eq!(reference_quote("\"\"a b\"\""), Some('"'));
    assert_eq!(reference_quote("`x`"), Some('`'));
    assert_eq!(reference_quote("1"), None);
    assert_eq!(reference_quote("~1{31}"), None);
    assert_eq!(reference_quote("'unclosed"), None);
    assert_eq!(reference_quote("'a' b"), None);
    assert_eq!(reference_quote(""), None);
}

#[test]
fn stream_parser_keeps_syntax_metadata() {
    use links_notation::{LiNo, StreamParser};

    let document = "(t 1 '1')\nname: \"Ada\"\n  child `x`\n";
    let expected = links_notation::parse_lino_to_syntax_links(document).unwrap();
    let raws = |links: &[LiNo<links_notation::SyntaxReference>]| {
        fn walk(link: &LiNo<links_notation::SyntaxReference>, out: &mut Vec<Option<String>>) {
            match link {
                LiNo::Ref(reference) => out.push(reference.raw.clone()),
                LiNo::Link { id, values } => {
                    out.push(id.as_ref().and_then(|id| id.raw.clone()));
                    for value in values {
                        walk(value, out);
                    }
                }
            }
        }
        let mut out = Vec::new();
        for link in links {
            walk(link, &mut out);
        }
        out
    };

    // One character at a time: records are cut at the stream's own boundaries.
    let mut stream = StreamParser::syntax();
    for character in document.chars() {
        stream.write(&character.to_string()).unwrap();
    }
    let streamed = stream.finish().unwrap();
    assert_eq!(streamed, expected);
    assert_eq!(raws(&streamed), raws(&expected));
    assert!(raws(&streamed).contains(&Some("'1'".to_string())));

    let chunked: Vec<_> = StreamParser::parse_syntax_chunks(["(t 1 ", "'1')\n"])
        .collect::<Result<_, _>>()
        .unwrap();
    let LiNo::Link { values, .. } = &chunked[0] else {
        unreachable!()
    };
    assert_eq!(values[2].raw_id(), Some("'1'"));
    assert_eq!(values[2].quote(), Some('\''));

    // The default stream parser is unchanged: plain links, AST mode.
    let mut plain = StreamParser::new();
    plain.write(document).unwrap();
    let plain = plain.finish().unwrap();
    assert_eq!(
        plain,
        links_notation::parse_lino_to_links(document).unwrap()
    );
}
