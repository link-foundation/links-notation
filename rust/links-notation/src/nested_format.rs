use crate::{LiNo, escape_reference};

fn parts<T>(link: &LiNo<T>) -> (Option<&T>, &[LiNo<T>]) {
    match link {
        LiNo::Ref(id) => (Some(id), &[]),
        LiNo::Link { id, values } => (id.as_ref(), values),
    }
}
fn atom<T>(link: &LiNo<T>) -> bool {
    let (id, values) = parts(link);
    id.is_some() && values.is_empty()
}
fn can_nest<T>(link: &LiNo<T>) -> bool {
    let (id, values) = parts(link);
    !atom(link) && !(id.is_none() && values.len() == 1 && !atom(&values[0]))
}
fn line_holds<T>(link: &LiNo<T>, count: usize) -> bool {
    let (id, values) = parts(link);
    id.is_some() || count >= 2 || (count == 1 && atom(&values[0]))
}
fn write<T: ToString>(
    link: &LiNo<T>,
    pad: &str,
    indent: &str,
    under_name: bool,
    lines: &mut Vec<String>,
) {
    let (id, values) = parts(link);
    if !line_holds(link, values.len()) || (under_name && id.is_none() && values.len() == 1) {
        lines.push(format!("{pad}{link}"));
        return;
    }
    let mut count = values.len();
    while count > 0 && can_nest(&values[count - 1]) {
        count -= 1;
    }
    while count < values.len() && !line_holds(link, count) {
        count += 1;
    }
    let mut head = Vec::new();
    if let Some(id) = id {
        head.push(format!("{}:", escape_reference(&id.to_string())));
    }
    for value in &values[..count] {
        head.push(if atom(value) {
            escape_reference(&parts(value).0.unwrap().to_string())
        } else {
            value.to_string()
        });
    }
    lines.push(format!("{pad}{}", head.join(" ")));
    let inner = format!("{pad}{indent}");
    for value in &values[count..] {
        write(
            value,
            &inner,
            indent,
            under_name || (id.is_some() && count == 0),
            lines,
        );
    }
}

/// Write recursively nested lines with two spaces per level and no final newline.
/// Read by folding groups in a group-aware binding; Rust's parser keeps path semantics.
pub fn format_nested<T: ToString>(links: &[LiNo<T>]) -> String {
    format_nested_with_indent(links, "  ")
}

/// Write nested lines using nonempty spaces. Panics for invalid indentation.
pub fn format_nested_with_indent<T: ToString>(links: &[LiNo<T>], indent: &str) -> String {
    assert!(
        !indent.is_empty() && indent.chars().all(|c| c == ' '),
        "indent must contain only spaces and be nonempty"
    );
    let mut lines = Vec::new();
    for link in links {
        write(link, "", indent, false, &mut lines);
    }
    lines.join("\n")
}
