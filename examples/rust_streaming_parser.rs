/// Example: Using StreamParser for incremental parsing in Rust
///
/// This example demonstrates how to use the StreamParser to process
/// Links Notation data incrementally, which is useful for:
/// - Large files that don't fit in memory
/// - Network streaming (e.g., TCP/HTTP streaming)
/// - Real-time processing of incoming data
///
/// To run this example:
/// ```
/// cargo run --example rust_streaming_parser
/// ```
use links_notation::StreamParser;
use std::sync::{Arc, Mutex};

fn main() {
    println!("=== Rust StreamParser Example ===\n");

    // Example 1: Basic usage with callbacks
    println!("Example 1: Basic usage with callbacks");
    println!("--------------------------------------");

    let mut parser1 = StreamParser::new();
    let link_count = Arc::new(Mutex::new(0));
    let count_clone = Arc::clone(&link_count);

    parser1.on_link(move |link| {
        let mut count = count_clone.lock().unwrap();
        *count += 1;
        println!("Link #{}: {:?}", *count, link);
    });

    let error_received = Arc::new(Mutex::new(false));
    let error_clone = Arc::clone(&error_received);

    parser1.on_error(move |error| {
        *error_clone.lock().unwrap() = true;
        eprintln!("Error: {}", error);
    });

    // Feed data incrementally
    parser1.write("papa (lovesMama: loves mama)\n").unwrap();
    parser1.write("son lovesMama\n").unwrap();
    parser1.write("daughter lovesMama\n").unwrap();

    let links1 = parser1.finish().unwrap();
    println!("\nTotal links parsed: {}\n", links1.len());

    // Example 2: Processing data in small chunks
    println!("Example 2: Processing data in small chunks");
    println!("-------------------------------------------");

    let mut parser2 = StreamParser::new();

    parser2.on_link(|link| {
        println!("Parsed: {:?}", link);
    });

    // Simulate character-by-character streaming
    let message = "(message: hello world)\n(status: ok)\n";
    for ch in message.chars() {
        parser2.write(&ch.to_string()).unwrap();
    }

    let links2 = parser2.finish().unwrap();
    println!("Total links: {}\n", links2.len());

    // Example 3: Multiline indented syntax
    println!("Example 3: Multiline indented syntax");
    println!("-------------------------------------");

    let mut parser3 = StreamParser::new();

    parser3.on_link(|link| {
        println!("Parsed link: {:?}", link);
    });

    parser3.write("relationship:\n").unwrap();
    parser3.write("  papa\n").unwrap();
    parser3.write("  loves\n").unwrap();
    parser3.write("  mama\n").unwrap();

    parser3.finish().unwrap();
    println!();

    // Example 4: Error handling with location info
    println!("Example 4: Error handling with location info");
    println!("---------------------------------------------");

    let mut parser4 = StreamParser::new();

    parser4.on_error(|error| {
        println!("✓ Error caught successfully:");
        println!("  Message: {}", error.message);
        if let Some(ref loc) = error.location {
            println!("  Location: line {}, column {}", loc.line, loc.column);
        }
    });

    parser4.write("valid link here\n").unwrap();
    parser4.write("(unclosed parenthesis\n").unwrap();

    match parser4.finish() {
        Ok(_) => println!("Unexpectedly succeeded"),
        Err(e) => println!("  (Error was also returned as expected: {})\n", e),
    }

    // Example 5: Simulating TCP stream processing
    println!("Example 5: Simulating TCP stream processing");
    println!("--------------------------------------------");

    let mut parser5 = StreamParser::new();
    let received_links = Arc::new(Mutex::new(Vec::new()));
    let links_clone = Arc::clone(&received_links);

    parser5.on_link(move |link| {
        let mut links = links_clone.lock().unwrap();
        links.push(format!("{:?}", link));
        println!("Received link: {:?}", link);
    });

    // Simulate receiving network packets with partial data
    let packets = vec![
        "(user: alice",
        ") (action: ",
        "login)\n(user",
        ": bob) (act",
        "ion: logout)\n",
    ];

    println!("Processing packets...");
    for packet in packets {
        parser5.write(packet).unwrap();
    }

    parser5.finish().unwrap();
    let final_count = received_links.lock().unwrap().len();
    println!("\nProcessed {} links from stream\n", final_count);

    // Example 6: Memory-efficient processing of large data
    println!("Example 6: Memory-efficient processing");
    println!("---------------------------------------");

    let mut parser6 = StreamParser::new();
    let processed_count = Arc::new(Mutex::new(0));
    let count_clone = Arc::clone(&processed_count);

    parser6.on_link(move |_link| {
        let mut count = count_clone.lock().unwrap();
        *count += 1;

        // Simulate processing (e.g., database insert, validation, etc.)
        if *count % 1000 == 0 {
            println!("Processed {} links...", *count);
        }
    });

    // Simulate processing a large file in chunks
    let large_data: String = (0..5000)
        .map(|i| format!("(item: {})\n", i))
        .collect::<Vec<_>>()
        .join("");

    // Process in 1KB chunks
    let chunk_size = 1024;
    let bytes = large_data.as_bytes();
    for chunk in bytes.chunks(chunk_size) {
        if let Ok(chunk_str) = std::str::from_utf8(chunk) {
            parser6.write(chunk_str).unwrap();
        }
    }

    parser6.finish().unwrap();
    let final_count = *processed_count.lock().unwrap();
    println!("Final count: {} links processed\n", final_count);

    // Example 7: Position tracking
    println!("Example 7: Position tracking");
    println!("-----------------------------");

    let parser7 = StreamParser::new();
    let pos = parser7.position();
    println!("Initial position: line {}, column {}", pos.line, pos.column);
    println!();

    println!("=== All examples completed successfully! ===");
}
