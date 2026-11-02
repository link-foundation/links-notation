//! The lossless concrete syntax tree (issue #364).

use links_notation::{
    CstKind, ParseError, ParserConfig, parse_lino_to_cst, parse_lino_to_cst_with_config,
};

#[test]
fn is_the_lossless_view_of_a_document() {
    let input = "(t 1 '1')";
    let cst = parse_lino_to_cst(input).unwrap();
    assert_eq!(cst.kind, CstKind::Document);
    assert_eq!(cst.to_string(), input);
    assert_eq!(
        cst.to_s_expression(),
        r#"(document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" whitespace:" " reference:"'1'") close_paren:")")))"#
    );
}

#[test]
fn reference_tokens_carry_their_value_and_delimiter() {
    let cst = parse_lino_to_cst("(a \"b c\" ~1{64} ''e''''f'')").unwrap();
    let references: Vec<_> = cst
        .tokens()
        .into_iter()
        .filter(|token| token.kind == CstKind::Reference)
        .map(|token| (token.text(), token.value.clone().unwrap(), token.quote))
        .collect();
    assert_eq!(
        references,
        [
            ("a".to_owned(), "a".to_owned(), None),
            ("\"b c\"".to_owned(), "b c".to_owned(), Some('"')),
            ("~1{64}".to_owned(), "d".to_owned(), None),
            ("''e''''f''".to_owned(), "e''f".to_owned(), Some('\'')),
        ]
    );
    for token in cst.tokens() {
        assert!(token.is_token() && token.children.is_empty());
        if token.kind != CstKind::Reference {
            assert_eq!((token.value.as_deref(), token.quote), (None, None));
        }
    }
}

#[test]
fn recovers_every_document_exactly() {
    for input in [
        "",
        " \t ",
        "\n\n",
        "a\r\nb\rc\r\n",
        "a\t b  \n",
        "# head\na: b # tail\n  # inner\n  c\n# end",
        "(note: \"one\n  two\r\nthree\")",
        "(a (b\n  (c d)\n) e)\n",
        "root:\n  child:\n    leaf\n  tail",
        "(~1{} ~1{e6a0b9})",
        "('#a' \"b # c\" `#`)",
        "(根: café 🙂)\n",
    ] {
        let cst = parse_lino_to_cst(input).unwrap();
        assert_eq!(cst.to_string(), input, "{input:?}");
        let tokens: String = cst.tokens().iter().map(|token| token.text()).collect();
        assert_eq!(tokens, input, "{input:?}");
    }
    assert_eq!(
        parse_lino_to_cst("").unwrap().to_s_expression(),
        "(document)"
    );
}

#[test]
fn without_comment_support_hash_is_part_of_references() {
    let input = "a #b";
    let cst = parse_lino_to_cst_with_config(input, &ParserConfig::without_comments()).unwrap();
    assert_eq!(cst.to_string(), input);
    let kinds: Vec<_> = cst
        .tokens()
        .iter()
        .map(|token| token.kind.as_str())
        .collect();
    assert_eq!(kinds, ["reference", "whitespace", "reference"]);

    let with_comments = parse_lino_to_cst(input).unwrap();
    let kinds: Vec<_> = with_comments
        .tokens()
        .iter()
        .map(|token| token.kind)
        .collect();
    assert_eq!(
        kinds,
        [CstKind::Reference, CstKind::Whitespace, CstKind::Comment]
    );
}

#[test]
fn a_group_belongs_to_the_line_it_opens_on() {
    let cst = parse_lino_to_cst("a (b\nc)\nd").unwrap();
    let lines: Vec<_> = cst.children.iter().map(ToString::to_string).collect();
    assert_eq!(lines, ["a (b\nc)\n", "d"]);
    let group = &cst.children[0].children[2];
    assert_eq!(group.kind, CstKind::Group);
    let kinds: Vec<_> = group.children.iter().map(|child| child.kind).collect();
    assert_eq!(
        kinds,
        [
            CstKind::OpenParen,
            CstKind::Line,
            CstKind::Line,
            CstKind::CloseParen
        ]
    );
}

#[test]
fn kinds_have_the_shared_names() {
    let names: Vec<_> = [
        CstKind::Document,
        CstKind::Line,
        CstKind::Group,
        CstKind::Whitespace,
        CstKind::Newline,
        CstKind::Comment,
        CstKind::OpenParen,
        CstKind::CloseParen,
        CstKind::Colon,
        CstKind::Reference,
    ]
    .iter()
    .map(|kind| kind.to_string())
    .collect();
    assert_eq!(
        names,
        [
            "document",
            "line",
            "group",
            "whitespace",
            "newline",
            "comment",
            "open_paren",
            "close_paren",
            "colon",
            "reference"
        ]
    );
}

#[test]
fn escapes_token_text_in_s_expressions() {
    let cst = parse_lino_to_cst("'a\\\"b'\t\r\n").unwrap();
    assert_eq!(
        cst.to_s_expression(),
        r#"(document (line reference:"'a\\\"b'" whitespace:"\t" newline:"\r\n"))"#
    );
}

#[test]
fn rejects_what_the_parser_rejects() {
    assert!(matches!(
        parse_lino_to_cst("(a"),
        Err(ParseError::SyntaxError(_))
    ));
    assert!(matches!(
        parse_lino_to_cst("a)"),
        Err(ParseError::SyntaxError(_))
    ));
    let config = ParserConfig::new().with_max_depth(1);
    assert!(matches!(
        parse_lino_to_cst_with_config("((a))", &config),
        Err(ParseError::NestingTooDeep(_))
    ));
}
