use links_notation::{parse_lino, parse_lino_to_links, format_links};

fn main() {
    let cases: Vec<&str> = vec![
        r#"(a "" b)"#,
        r#"("")"#,
        r#"("" ("" 1))"#,
        r#"(o: ("" (o: ("" 1))))"#,
        r#"(a " " b)"#,
        r#"("": 1)"#,
    ];
    for c in cases {
        match parse_lino_to_links(c) {
            Ok(links) => {
                let formatted = format_links(&links);
                let reparsed = parse_lino(&formatted);
                println!("{:<26} => {:?}\n{:<26}    reformat: {:?}\n{:<26}    reparse: {:?}", c, links, "", formatted, "", reparsed);
            }
            Err(e) => println!("{:<26} => Err {:?}", c, e),
        }
    }
}
