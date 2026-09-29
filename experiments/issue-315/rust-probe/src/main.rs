//! Reproduces issue #315 and measures how much stack a level of nesting costs.
//!
//! ```sh
//! cargo run -- abort 10000          # the report: parentheses on the main thread
//! cargo run -- probe parens 2       # deepest nesting that fits a 2 MiB thread
//! cargo run -- probe indent 2
//! ```
//!
//! A stack overflow aborts the process, so `probe` runs every attempt in a child
//! process and bisects on whether the child survived.
use links_notation::{parse_lino_to_links, parse_lino_to_links_with_config, ParserConfig};
use std::process::Command;

fn parens(depth: usize) -> String {
    format!("{}a{}", "(".repeat(depth), ")".repeat(depth))
}

fn indent(depth: usize) -> String {
    let mut document = String::new();
    for level in 0..=depth {
        document.push_str(&" ".repeat(level));
        document.push_str("a\n");
    }
    document
}

fn document(shape: &str, depth: usize) -> String {
    match shape {
        "parens" => parens(depth),
        "indent" => indent(depth),
        // Groups written as values after a reference: (a (a (a b)))
        "values" => format!("{}b{}", "(a ".repeat(depth), ")".repeat(depth)),
        // Groups written as values of a named link: (x: a (x: a (x: a b)))
        "named" => format!("{}b{}", "(x: a ".repeat(depth), ")".repeat(depth)),
        // A group on every indented line: each line nests two levels deeper
        "mixed" => {
            let mut document = String::new();
            for level in 0..depth / 2 {
                document.push_str(&" ".repeat(level));
                document.push_str("a (b)\n");
            }
            document
        }
        _ => panic!("shape is parens, indent, values, named or mixed"),
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    match args[1].as_str() {
        "abort" => {
            let depth: usize = args[2].parse().unwrap();
            let source = parens(depth);
            let outcome = std::panic::catch_unwind(|| {
                parse_lino_to_links(&source).map(|links| links.len())
            });
            println!("depth {depth}: {outcome:?}");
        }
        // Parses one document on a thread with the given stack, in MiB.
        "child" => {
            let shape = args[2].clone();
            let depth: usize = args[3].parse().unwrap();
            let mib: usize = args[4].parse().unwrap();
            let source = document(&shape, depth);
            let outcome = std::thread::Builder::new()
                .stack_size(mib << 20)
                .spawn(move || {
                    // No limit, so the probe finds out what the stack allows.
                    let config = ParserConfig::new().with_max_depth(usize::MAX);
                    let links = parse_lino_to_links_with_config(&source, &config);
                    let rendered = links.as_ref().map(|l| l.iter().map(|x| x.to_string().len()).sum::<usize>());
                    format!("{:?}", rendered.map_err(|e| e.to_string().lines().next().unwrap().to_string()))
                })
                .unwrap()
                .join()
                .unwrap();
            println!("{outcome}");
        }
        "probe" => {
            let shape = &args[2];
            let mib = &args[3];
            let exe = std::env::current_exe().unwrap();
            let survives = |depth: usize| {
                Command::new(&exe)
                    .args(["child", shape, &depth.to_string(), mib])
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false)
            };
            let (mut low, mut high) = (1usize, 1usize);
            while survives(high) {
                low = high;
                high *= 2;
                if high > 1 << 20 {
                    println!("{shape}: survives {low} on {mib} MiB");
                    return;
                }
            }
            while high - low > 1 {
                let middle = (low + high) / 2;
                if survives(middle) { low = middle } else { high = middle }
            }
            println!("{shape}: deepest nesting that fits {mib} MiB: {low} ({} bytes per level)", (mib.parse::<usize>().unwrap() << 20) / high);
        }
        _ => panic!("abort, child or probe"),
    }
}
