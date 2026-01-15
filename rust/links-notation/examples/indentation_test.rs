use links_notation::parse_lino_to_links;

fn main() {
    // Example with 2 spaces
    let two_spaces = "parent:\n  child1\n  child2";
    // Example with 4 spaces
    let four_spaces = "parent:\n    child1\n    child2";

    println!("=== Two Spaces ===");
    match parse_lino_to_links(two_spaces) {
        Ok(links) => {
            println!("Parsed {} links:", links.len());
            for (i, link) in links.iter().enumerate() {
                println!("  Link {}: {:?}", i, link);
            }
        }
        Err(e) => println!("Error: {:?}", e),
    }

    println!("\n=== Four Spaces ===");
    match parse_lino_to_links(four_spaces) {
        Ok(links) => {
            println!("Parsed {} links:", links.len());
            for (i, link) in links.iter().enumerate() {
                println!("  Link {}: {:?}", i, link);
            }
        }
        Err(e) => println!("Error: {:?}", e),
    }
}
