//! Times the Rust parser on the quote-heavy shapes from issue #316.
//! Usage: cargo run --release -- [sizes...]
use links_notation::comments::strip_comments;
use links_notation::parse_lino_to_links;
use std::time::Instant;

fn wide_quote(size: usize) -> String {
    let width = size / 4;
    format!("{} a {} {}", "'".repeat(width + 1), "'".repeat(width - 4), "x".repeat(2 * width))
}

fn narrowing_unclosed(size: usize) -> String {
    let mut widths = vec![];
    let mut width = 2 * ((((size / 2) as f64).sqrt() / 2.0) as usize) + 1;
    loop {
        widths.push(width);
        if width < 2 {
            break;
        }
        width -= 2;
    }
    let head: String = widths
        .iter()
        .map(|w| format!("{}x", "'".repeat(*w)))
        .collect::<Vec<_>>()
        .join(" ");
    let tail_count = size.saturating_sub(head.len()) / 3;
    format!("{} {}", head, "a' ".repeat(tail_count))
}

fn closed_wide_over_quotes(size: usize) -> String {
    let width = size / 8;
    let q = "'".repeat(width);
    format!("{q}{}{q}", format!("{}x", "'".repeat(width - 1)).repeat(6))
}

fn main() {
    let sizes: Vec<usize> = std::env::args().skip(1).map(|s| s.parse().unwrap()).collect();
    let sizes = if sizes.is_empty() { vec![100_000, 250_000, 500_000, 1_000_000] } else { sizes };
    let shapes: [(&str, fn(usize) -> String); 3] = [
        ("wide quote over a long run", wide_quote),
        ("narrowing unclosed quotes", narrowing_unclosed),
        ("closed wide quote over quotes", closed_wide_over_quotes),
    ];
    for (name, make) in shapes {
        println!("{name}");
        for &size in &sizes {
            let source = make(size);
            let t = Instant::now();
            strip_comments(&source);
            let strip = t.elapsed().as_secs_f64() * 1000.0;
            let t = Instant::now();
            let outcome = parse_lino_to_links(&source).map(|l| l.len());
            let ms = t.elapsed().as_secs_f64() * 1000.0;
            println!("  {}B: {ms:.0} ms (strip {strip:.0} ms, {:?})", source.len(), outcome.map_err(|_| "error"));
        }
    }
}
