//! Differential fuzz for issue #316: the run-at-a-time reader must read every
//! document exactly as the character-by-character one in 0.21.1 did.
//!
//! Compares, on random quote-heavy documents, the links parsed, the comments
//! stripped and `quoted_reference_end` at every offset.
//! Usage: cargo run --release --bin differential_fuzz -- [iterations]
use links_notation::comments::strip_comments;
use links_notation::parse_lino_to_links;
use links_notation::parser::quoted_reference_end;
use links_notation_before as before;

const ALPHABETS: [&[&str]; 4] = [
    &["'", "'", "'", "a", " "],
    &["'", "\"", "`", "a", " ", "(", ")", ":", "\n", "#"],
    &["\"", "\"", "x", " ", "\n", "  "],
    &["`", "`", "`", "'", "b", "(", ")", " "],
];

fn main() {
    let iterations: usize = std::env::args()
        .nth(1)
        .map(|count| count.parse().unwrap())
        .unwrap_or(20_000);
    let mut seed: u32 = 316;
    let mut random = move || {
        seed = seed.wrapping_mul(1_103_515_245).wrapping_add(12_345);
        seed as f64 / 2f64.powi(32)
    };

    let mut mismatches = 0;
    for iteration in 0..iterations {
        let alphabet = ALPHABETS[iteration % ALPHABETS.len()];
        let length = 1 + (random() * 24.0) as usize;
        let mut text = String::new();
        let mut parentheses = 0;
        for _ in 0..length {
            let symbol = alphabet[(random() * alphabet.len() as f64) as usize];
            // Unbalanced groups take exponential time in the parser (issue
            // #314), which is not what this compares, so only a few are written.
            if symbol == "(" || symbol == ")" {
                parentheses += 1;
                if parentheses <= 3 {
                    text.push_str(symbol);
                }
                continue;
            }
            // Runs of one delimiter, so wide openings and escapes are common.
            if random() < 0.3 {
                text.push_str(&symbol.repeat(1 + (random() * 6.0) as usize));
            } else {
                text.push_str(symbol);
            }
        }

        let old = format!(
            "{:?}",
            before::parse_lino_to_links(&text).map_err(|e| e.to_string())
        );
        let new = format!(
            "{:?}",
            parse_lino_to_links(&text).map_err(|e| e.to_string())
        );
        if old != new {
            mismatches += 1;
            println!("parse mismatch {text:?}\n  before {old}\n  after  {new}");
        }
        if before::comments::strip_comments(&text) != strip_comments(&text) {
            mismatches += 1;
            println!("strip_comments mismatch {text:?}");
        }
        for start in 0..=text.len() {
            if before::parser::quoted_reference_end(&text, start)
                != quoted_reference_end(&text, start)
            {
                mismatches += 1;
                println!("quoted_reference_end mismatch {text:?} at {start}");
            }
        }
        if mismatches > 20 {
            break;
        }
    }
    println!("{iterations} documents, {mismatches} mismatches");
    std::process::exit(if mismatches > 0 { 1 } else { 0 });
}
