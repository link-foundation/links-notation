use links_notation::parse_lino_to_links;

fn main() {
    // Example with 2 leading spaces (from issue)
    let with_leading = "  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n  TELEGRAM_ALLOWED_CHATS:\n    -1002975819706\n    -1002861722681";

    // Example without leading spaces (from issue)
    let without_leading = "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\nTELEGRAM_ALLOWED_CHATS:\n  -1002975819706\n  -1002861722681";

    println!("=== With Leading Spaces (2 spaces at root) ===");
    match parse_lino_to_links(with_leading) {
        Ok(links) => {
            println!("Parsed {} links:", links.len());
            for (i, link) in links.iter().enumerate() {
                println!("  Link {}: {:?}", i, link);
            }
        }
        Err(e) => println!("Error: {:?}", e),
    }

    println!("\n=== Without Leading Spaces (0 spaces at root) ===");
    match parse_lino_to_links(without_leading) {
        Ok(links) => {
            println!("Parsed {} links:", links.len());
            for (i, link) in links.iter().enumerate() {
                println!("  Link {}: {:?}", i, link);
            }
        }
        Err(e) => println!("Error: {:?}", e),
    }
}
