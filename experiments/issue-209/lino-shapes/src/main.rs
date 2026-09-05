use links_notation::parse_lino;

fn brief(l: &links_notation::LiNo<String>) -> String {
    match l {
        links_notation::LiNo::Ref(t) => format!("R({t})"),
        links_notation::LiNo::Link { id, values } => {
            let inner: Vec<String> = values.iter().map(brief).collect();
            match id {
                Some(i) => format!("L[{i}: {}]", inner.join(" ")),
                None => format!("L[{}]", inner.join(" ")),
            }
        }
    }
}

fn show(label: &str, src: &str) {
    print!("== {label} :: ");
    match parse_lino(src) {
        Ok(links) => println!("{}", brief(&links)),
        Err(e) => println!("ERROR: {e}"),
    }
}

fn main() {
    show("single-entry nested object", "server (\n  host \"x\"\n)\n");
    show("two-entry nested object", "server (\n  host \"x\"\n  port 1\n)\n");
    show("array with one object element (1 key)", "users (\n  (\n    id 1\n  )\n)\n");
    show("array with one object element (2 keys)", "users (\n  (\n    id 1\n    n \"a\"\n  )\n)\n");
    show("array of arrays", "m (\n  (\n    1\n    2\n  )\n  (\n    3\n    4\n  )\n)\n");
    show("array of 1 scalar", "tags (\n  a\n)\n");
    show("empty group", "tags ()\n");
    show("root two entries", "a 1\nb 2\n");
    show("root single entry", "a 1\n");
    show("value with colon-ish", "a \"x:y\"\n");
    show("nested 3 deep", "a (\n  b (\n    c 1\n    d 2\n  )\n  e 3\n)\n");
}
