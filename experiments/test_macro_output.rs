use links_notation::{lino, parse_lino};

fn main() {
    // Test simple input
    let result1 = lino!("papa (lovesMama: loves mama)");
    println!("Macro result for 'papa (lovesMama: loves mama)':");
    println!("{:#?}", result1);
    println!();

    // Compare with runtime parse
    let result2 = parse_lino("papa (lovesMama: loves mama)").unwrap();
    println!("Runtime parse result:");
    println!("{:#?}", result2);
    println!();

    // Test triplet
    let result3 = lino!("papa has car");
    println!("Macro result for 'papa has car':");
    println!("{:#?}", result3);
    println!();

    // Test nested
    let result4 = lino!("(outer (inner value))");
    println!("Macro result for '(outer (inner value))':");
    println!("{:#?}", result4);
}
