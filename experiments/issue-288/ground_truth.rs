//! Prints the canonical rendering of every case in issue #288, so the
//! conformance table can be checked against a real parse in every language.
use links_notation::{parse_lino_to_links, LiNo};

fn render(node: &LiNo<String>) -> String {
    match node {
        LiNo::Ref(id) => format!("<{}>", id),
        LiNo::Link { id, values } => {
            let head = id
                .as_ref()
                .map(|id| format!("<{}>: ", id))
                .unwrap_or_default();
            let body = values.iter().map(render).collect::<Vec<_>>().join(" ");
            format!("({}{})", head, body)
        }
    }
}

fn main() {
    let cases: Vec<&str> = vec![
        r#"(a " " b)"#,
        r#"(a "" b)"#,
        r#"(a '' b)"#,
        "(a `` b)",
        r#"(a "" "" b)"#,
        r#"(a '' '' b)"#,
        "(a `` `` b)",
        r#"(a ""x"" b)"#,
        r#"(a """" b)"#,
        r#"(x "" " "")"#,
        r#"(x ' " ')"#,
        r#"("" ("" 1))"#,
        r#"("" ('' 1))"#,
        r#"("x" ("" 1))"#,
        r#"("" ("x" 1))"#,
        r#"("" x ("" 1))"#,
        r#"("" 1 ("" 1))"#,
        r#"(o: ("" (o: ("" 1))))"#,
        r#"(a " b)"#,
        r#"(a """ b)"#,
        r#"("")"#,
        r#"("": 1)"#,
        r#"(a ""  "" b)"#,
        r#"("" "")"#,
    ];
    for case in cases {
        match parse_lino_to_links(case) {
            Ok(links) => {
                let rendered = links.iter().map(render).collect::<Vec<_>>().join("\n");
                println!("{:<24} => {}", case, rendered);
            }
            Err(e) => println!("{:<24} => Err({})", case, e),
        }
    }
}
