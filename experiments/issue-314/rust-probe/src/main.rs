//! Times the Rust parser on the nesting shapes from issue #314.
//! Usage: cargo run --release -- [budget_ms]
use links_notation::parse_lino_to_links;
use links_notation::parser::parse_document;
use std::time::Instant;

fn ms(started: Instant) -> f64 {
    started.elapsed().as_secs_f64() * 1000.0
}

fn main() {
    let budget: f64 = std::env::args()
        .nth(1)
        .and_then(|a| a.parse().ok())
        .unwrap_or(2000.0);
    type Make = fn(usize) -> String;
    let shapes: [(&str, Make); 5] = [
        ("closed        ((((a))))", |d| {
            format!("{}a{}", "(".repeat(d), ")".repeat(d))
        }),
        ("value after   ((((a) b) b) b", |d| {
            format!("{}a{}", "(".repeat(d), ") b".repeat(d))
        }),
        ("unclosed      ((((a", |d| format!("{}a", "(".repeat(d))),
        ("indented      (a\\n (a\\n  (a", |d| {
            (0..d)
                .map(|i| format!("{}(a", " ".repeat(i)))
                .collect::<Vec<_>>()
                .join("\n")
        }),
        ("indented ids  a\\n a\\n  a ... (", |d| {
            let mut s = (0..d)
                .map(|i| format!("{}a", " ".repeat(i)))
                .collect::<Vec<_>>()
                .join("\n");
            s.push('\n');
            s.push_str(&" ".repeat(d));
            s.push('(');
            s
        }),
    ];
    for (name, make) in shapes {
        println!("{name}");
        for d in [2, 4, 8, 12, 16, 20, 24, 64, 256, 1024, 4096]
            .into_iter()
            .filter(|&d| !name.starts_with("indented") || d <= 256)
        {
            let source = make(d);
            let t = Instant::now();
            let ok_low = parse_document(&source).is_ok();
            let low = ms(t);
            let t = Instant::now();
            let ok_full = parse_lino_to_links(&source).is_ok();
            let full = ms(t);
            println!(
                "  depth {d} ({} bytes): parse_document {low:.1} ms ({}), parse_lino_to_links {full:.1} ms ({})",
                source.len(),
                if ok_low { "ok" } else { "err" },
                if ok_full { "ok" } else { "err" },
            );
            if low > budget || full > budget {
                break;
            }
        }
    }
}
