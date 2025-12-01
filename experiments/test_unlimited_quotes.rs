// Test file - run with: rustc --test test_unlimited_quotes.rs && ./test_unlimited_quotes

use std::process::Command;

fn main() {
    // Run cargo test with our specific test input
    let output = Command::new("cargo")
        .args(&["test", "--", "--nocapture", "test_unlimited_quotes"])
        .current_dir("/tmp/gh-issue-solver-1764602479355/rust")
        .output()
        .expect("Failed to execute cargo test");
    
    println!("stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("stderr: {}", String::from_utf8_lossy(&output.stderr));
}
