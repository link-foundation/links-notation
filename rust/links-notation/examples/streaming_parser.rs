//! Incremental parsing with callbacks and the native iterator adapter.

use links_notation::StreamParser;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let document = "first loves data\nprofile:\n  name Ada\nlast sees first";

    // Disabling collection retains only the unresolved top-level record.
    let count = Arc::new(AtomicUsize::new(0));
    let callback_count = Arc::clone(&count);
    let mut stream = StreamParser::new();
    stream.set_collect(false).on_link(move |link| {
        callback_count.fetch_add(1, Ordering::Relaxed);
        println!("callback: {link}");
    });

    // Chunk boundaries are arbitrary: this writes one Unicode scalar at a time.
    let mut encoded = [0; 4];
    for symbol in document.chars() {
        stream.write(symbol.encode_utf8(&mut encoded))?;
    }
    stream.finish()?;
    println!("parsed {} links", count.load(Ordering::Relaxed));

    // Iteration is lazy and automatically disables collection.
    let chunks = ["one link\npro", "file:\n  name Ada\n", "two link"];
    for link in StreamParser::parse_chunks(chunks) {
        println!("iterator: {}", link?);
    }

    Ok(())
}
