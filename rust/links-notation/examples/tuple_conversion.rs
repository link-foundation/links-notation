use links_notation::{format_links, LiNo};

fn main() {
    println!("=== Rust Tuple Conversion Examples ===\n");

    // Example 1: Basic 2-tuple conversion
    println!("1. Basic 2-tuple conversion:");
    let link: LiNo<String> = ("papa", "mama").into();
    println!("   Input: (\"papa\", \"mama\")");
    println!("   Output: {}\n", link);

    // Example 2: 3-tuple conversion
    println!("2. 3-tuple conversion:");
    let link: LiNo<String> = ("papa", "loves", "mama").into();
    println!("   Input: (\"papa\", \"loves\", \"mama\")");
    println!("   Output: {}\n", link);

    // Example 3: 4-tuple conversion
    println!("3. 4-tuple conversion:");
    let link: LiNo<String> = ("parent", "child1", "child2", "child3").into();
    println!("   Input: (\"parent\", \"child1\", \"child2\", \"child3\")");
    println!("   Output: {}\n", link);

    // Example 4: Mixed tuple with LiNo
    println!("4. Mixed tuple with LiNo:");
    let child = LiNo::Ref("child".to_string());
    let link: LiNo<String> = ("parent", child).into();
    println!("   Input: (\"parent\", LiNo::Ref(\"child\"))");
    println!("   Output: {}\n", link);

    // Example 5: Anonymous link from LiNo tuples
    println!("5. Anonymous link from LiNo tuples:");
    let a = LiNo::Ref("a".to_string());
    let b = LiNo::Ref("b".to_string());
    let link: LiNo<String> = (a, b).into();
    println!("   Input: (LiNo::Ref(\"a\"), LiNo::Ref(\"b\"))");
    println!("   Output: {}\n", link);

    // Example 6: Complex nested structure
    println!("6. Complex nested structure:");
    let loves_mama: LiNo<String> = ("lovesMama", "loves", "mama").into();
    let papa: LiNo<String> = ("papa", loves_mama).into();
    let son: LiNo<String> = ("son", "lovesMama").into();
    let daughter: LiNo<String> = ("daughter", "lovesMama").into();

    let love_ref = LiNo::Ref("love".to_string());
    let mama_ref = LiNo::Ref("mama".to_string());
    let love_mama: LiNo<String> = (love_ref, mama_ref).into();
    let all: LiNo<String> = ("all", love_mama).into();

    let links = vec![papa, son, daughter, all];
    let result = format_links(&links);
    println!("   Output:");
    for line in result.lines() {
        println!("   {}", line);
    }
    println!();

    // Example 7: Creating links collection ergonomically
    println!("7. Creating links collection ergonomically:");
    let links: Vec<LiNo<String>> = vec![
        ("papa", "mama").into(),
        ("son", "daughter").into(),
        ("loves", "family").into(),
    ];
    println!("   Vec of tuples converted to links:");
    for link in &links {
        println!("   {}", link);
    }
    println!();

    // Example 8: Owned String tuples
    println!("8. Owned String tuples:");
    let id = "parent".to_string();
    let val = "child".to_string();
    let link: LiNo<String> = (id, val).into();
    println!("   Input: (String::from(\"parent\"), String::from(\"child\"))");
    println!("   Output: {}\n", link);

    println!("=== All examples completed successfully! ===");
}
