use links_notation::{lino, parse_lino};

fn main() {
    // Test simple
    let result1 = lino!("simple");
    println!("Macro result for 'simple':");
    println!("{:#?}", result1);
    println!();

    // Test parenthesized
    let result2 = lino!("(parent: child1 child2)");
    println!("Macro result for '(parent: child1 child2)':");
    println!("{:#?}", result2);
    println!();

    // Test quoted
    let result3 = lino!(r#"("quoted id": "quoted value")"#);
    println!("Macro result for '(\"quoted id\": \"quoted value\")':");
    println!("{:#?}", result3);
}
