//! Reading nested groups must take time that grows with the size of the
//! document, not with two to the power of its nesting depth
//! ([#314](https://github.com/link-foundation/links-notation/issues/314)).
//!
//! Before the fix, every level of nesting doubled the work: a nine-byte
//! document took seconds. Each case runs on its own thread and fails when it
//! has not finished within the budget, so a regression fails instead of hanging.

use links_notation::parser::parse_document;
use links_notation::{format_links, parse_lino_to_links};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

/// Generous enough for a debug build on a slow machine, and far below what the
/// exponential and quadratic readings took at the depths used here.
const BUDGET: Duration = Duration::from_secs(5);

/// The depth used for the shapes that used to take exponential time.
const DEEP: usize = 32;

/// The depth used for the shapes that used to take quadratic time.
const VERY_DEEP: usize = 4096;

fn within_budget<T: Send + 'static>(what: &str, work: impl FnOnce() -> T + Send + 'static) -> T {
    let (sender, receiver) = mpsc::channel();
    thread::Builder::new()
        // Deep nesting recurses deeply; give it room so only time is measured.
        .stack_size(512 * 1024 * 1024)
        .spawn(move || {
            let _ = sender.send(work());
        })
        .unwrap();
    receiver
        .recv_timeout(BUDGET)
        .unwrap_or_else(|_| panic!("{what} did not finish within {BUDGET:?}"))
}

fn closed(depth: usize) -> String {
    format!("{}a{}", "(".repeat(depth), ")".repeat(depth))
}

fn value_after(depth: usize) -> String {
    format!("{}a{}", "(".repeat(depth), ") b".repeat(depth))
}

fn unclosed(depth: usize) -> String {
    format!("{}a", "(".repeat(depth))
}

/// Unclosed groups on lines that are each indented one space deeper.
fn indented_unclosed(depth: usize) -> String {
    (0..depth)
        .map(|level| format!("{}(a", " ".repeat(level)))
        .collect::<Vec<_>>()
        .join("\n")
}

#[test]
fn closed_groups_read_in_linear_time() {
    let source = closed(DEEP);
    let expected = source.clone();
    let links = within_budget("closed groups", move || parse_lino_to_links(&source));
    assert_eq!(format_links(&links.unwrap()), expected);
}

#[test]
fn values_after_groups_read_in_linear_time() {
    let source = value_after(DEEP);
    let expected = format!("({source})");
    let links = within_budget("values after groups", move || parse_lino_to_links(&source));
    assert_eq!(format_links(&links.unwrap()), expected);
}

#[test]
fn unclosed_groups_fail_in_linear_time() {
    let source = unclosed(DEEP);
    let result = within_budget("unclosed groups", move || parse_lino_to_links(&source));
    assert!(result.is_err());
}

#[test]
fn unclosed_groups_on_indented_lines_fail_in_linear_time() {
    let source = indented_unclosed(DEEP);
    let result = within_budget("unclosed indented groups", move || {
        parse_lino_to_links(&source)
    });
    assert!(result.is_err());
}

#[test]
fn parse_lino_to_links_does_not_copy_each_level() {
    let source = closed(VERY_DEEP);
    let expected = source.clone();
    let formatted = within_budget("very deep closed groups", move || {
        format_links(&parse_lino_to_links(&source).unwrap())
    });
    assert_eq!(formatted, expected);
}

#[test]
fn values_after_very_deep_groups_read_in_linear_time() {
    let source = value_after(VERY_DEEP);
    let length = source.len();
    let rest = within_budget("very deep values after groups", move || {
        parse_document(&source).ok().map(|(rest, _)| rest.len())
    });
    assert_eq!(rest, Some(0), "all {length} bytes should be read");
}

#[test]
fn group_followed_by_values_keeps_its_structure() {
    let cases = [
        ("(a) b", "((a) b)"),
        ("(a) (b) c", "((a) (b) c)"),
        ("((a) b) c", "(((a) b) c)"),
        ("(a: b) c", "((a: b) c)"),
        ("(a)\n(b) c", "(a)\n((b) c)"),
        ("x\n  (a) b\n  (c)", "(x)\n((x) ((a) b))\n((x) (c))"),
    ];
    for (source, expected) in cases {
        let links = parse_lino_to_links(source).unwrap();
        assert_eq!(format_links(&links), expected, "{source:?}");
    }
}
