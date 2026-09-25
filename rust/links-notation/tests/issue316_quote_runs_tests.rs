//! Issue #316: a reference that opens with a wide run of delimiters used to be
//! read one character at a time, comparing the whole width at every position,
//! and every run that never closed was read to the end of the document again.
//! These documents took seconds; read a run at a time they take milliseconds,
//! so the bound below only fails on the old behaviour.

use links_notation::comments::strip_comments;
use links_notation::parser::quoted_reference_end;
use links_notation::{parse_lino_to_links, LiNo, StreamParser};
use std::time::{Duration, Instant};

const BOUND: Duration = Duration::from_secs(2);
const SIZE: usize = 1_000_000;
// Shapes that end in a long list of short references: reading those is most
// of the time the parser takes on them, fixed or not, so they are kept smaller.
const MANY_REFERENCES_SIZE: usize = 400_000;

fn render(node: &LiNo<String>) -> String {
    match node {
        LiNo::Ref(id) => format!("<{id}>"),
        LiNo::Link { id, values } => {
            let head = id
                .as_ref()
                .map(|id| format!("<{id}>: "))
                .unwrap_or_default();
            format!(
                "({head}{})",
                values.iter().map(render).collect::<Vec<_>>().join(" ")
            )
        }
    }
}

fn assert_parses_as(source: &str, expected: &str) {
    let links = parse_lino_to_links(source).unwrap_or_else(|error| panic!("{source:?}: {error}"));
    assert_eq!(
        links.iter().map(render).collect::<Vec<_>>().join("\n"),
        expected,
        "{source:?}"
    );
}

fn q(count: usize) -> String {
    "'".repeat(count)
}

fn timed<T>(read: impl FnOnce() -> T) -> (T, Duration) {
    let started = Instant::now();
    let result = read();
    (result, started.elapsed())
}

// The shapes from the issue, and two that defeat shortcuts a fix could take.

fn wide_quote_over_a_long_run(size: usize) -> String {
    let width = size / 4;
    format!(
        "{} a {} {}",
        q(width + 1),
        q(width - 4),
        "x".repeat(2 * width)
    )
}

fn narrowing_unclosed_quotes(size: usize) -> String {
    let widths: Vec<usize> = (0..=((size / 2) as f64).sqrt() as usize / 2)
        .rev()
        .map(|half| 2 * half + 1)
        .collect();
    let head = widths
        .iter()
        .map(|width| format!("{}x", q(*width)))
        .collect::<Vec<_>>()
        .join(" ");
    format!("{head} {}", "a' ".repeat((size - head.len()) / 3))
}

fn closed_wide_quote_over_quotes(size: usize) -> String {
    let width = size / 8;
    format!(
        "{}{}{}",
        q(width),
        format!("{}x", q(width - 1)).repeat(6),
        q(width)
    )
}

fn unclosed_widths_over_an_even_run(size: usize) -> String {
    let run = size / 4;
    let head = (2..=(size as f64).sqrt() as usize)
        .rev()
        .filter(|width| (run / width).is_multiple_of(2))
        .map(|width| format!("{}x", q(width)))
        .collect::<Vec<_>>()
        .join(" ");
    let tail = "a' ".repeat((size - head.len() - run) / 3);
    format!("{head} {tail}{} b", q(run))
}

fn assert_parsed_within_bound(source: &str) {
    let (_, elapsed) = timed(|| parse_lino_to_links(source));
    assert!(elapsed < BOUND, "parsing took {elapsed:?}");
    let (_, elapsed) = timed(|| strip_comments(source));
    assert!(elapsed < BOUND, "stripping comments took {elapsed:?}");
}

#[test]
fn a_run_inside_a_body_is_read_as_escapes_then_a_closing_run() {
    assert_parses_as("'''a'''", "(<a>)");
    assert_parses_as("'''a''''''b'''", "(<a'''b>)");
    assert_parses_as("''a'''", "(<a'>)");
    assert_parses_as("'a'''", "(<a'>)");
    assert_parses_as(&format!("{}a{} b", q(3), q(9)), "(<a'''> <b>)");
    assert_parses_as(
        &format!("{}a{}b{}", q(50), q(100), q(50)),
        &format!("(<a{}b>)", q(50)),
    );
    assert_parses_as("\"\"\"a\"\"b\"\"\"", "(<a\"\"b>)");
    assert_parses_as("``a````b``", "(<a``b>)");
}

#[test]
fn a_run_that_never_closes_the_reference_leaves_it_unclosed() {
    // 7 / 3 is even: two escaped runs of three and one delimiter.
    let source = format!("{}a{}", q(3), q(7));
    assert_parses_as(&source, &format!("(<{source}>)"));
    let source = format!("{}a{}", q(5), q(4));
    assert_parses_as(&source, &format!("(<{source}>)"));
    assert_parses_as("''a'''''", "(<> <a'''''>)");
    assert_parses_as("''''x a", "(<> <x> <a>)");
}

#[test]
fn a_reference_can_open_inside_a_run() {
    // Comment stripping and the stream parser ask where a reference opened at
    // any delimiter ends, including one in the middle of a run.
    assert_eq!(quoted_reference_end("x'''a'''", 1), Some(8));
    assert_eq!(quoted_reference_end("x'''a''", 2), Some(7));
    assert_eq!(quoted_reference_end("x'''a'", 3), Some(6));
    assert_eq!(quoted_reference_end("'''a", 0), None);
    assert_eq!(quoted_reference_end("''''a", 0), Some(4));
    assert_eq!(quoted_reference_end("a", 0), None);
    assert_eq!(quoted_reference_end("'a'", 3), None);
}

#[test]
fn a_reference_that_opens_with_a_wide_run_is_read_in_linear_time() {
    let width = SIZE / 4;
    let source = wide_quote_over_a_long_run(SIZE);
    let (links, elapsed) = timed(|| parse_lino_to_links(&source).unwrap());
    // The odd opening run never closes, so it is a plain reference; the even
    // run after `a` encloses nothing and is the empty reference.
    assert_eq!(links.len(), 1);
    let LiNo::Link { values, .. } = &links[0] else {
        panic!("expected a link, got {:?}", links[0]);
    };
    let ids: Vec<String> = values
        .iter()
        .map(|value| match value {
            LiNo::Ref(id) => id.clone(),
            other => panic!("expected a reference, got {other:?}"),
        })
        .collect();
    assert_eq!(
        ids,
        vec![
            q(width + 1),
            "a".to_string(),
            String::new(),
            "x".repeat(2 * width)
        ]
    );
    assert!(elapsed < BOUND, "parsing took {elapsed:?}");
}

#[test]
fn wide_quote_over_a_long_run_is_parsed_within_the_time_bound() {
    assert_parsed_within_bound(&wide_quote_over_a_long_run(SIZE));
}

#[test]
fn narrowing_unclosed_quotes_is_parsed_within_the_time_bound() {
    assert_parsed_within_bound(&narrowing_unclosed_quotes(MANY_REFERENCES_SIZE));
}

#[test]
fn closed_wide_quote_over_quotes_is_parsed_within_the_time_bound() {
    assert_parsed_within_bound(&closed_wide_quote_over_quotes(SIZE));
}

#[test]
fn unclosed_widths_over_an_even_run_is_parsed_within_the_time_bound() {
    assert_parsed_within_bound(&unclosed_widths_over_an_even_run(MANY_REFERENCES_SIZE));
}

#[test]
fn a_stream_of_wide_quotes_is_read_within_the_time_bound() {
    // The second line is what makes the stream ask whether the first is complete.
    let source = format!("{}\nb", closed_wide_quote_over_quotes(SIZE));
    let (links, elapsed) = timed(|| {
        let mut stream = StreamParser::new();
        stream.write(&source).unwrap();
        stream.finish().unwrap()
    });
    assert_eq!(links.len(), 2);
    assert!(elapsed < BOUND, "streaming took {elapsed:?}");
}
