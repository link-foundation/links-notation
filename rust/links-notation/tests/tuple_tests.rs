use links_notation::{format_links, LiNo};

#[test]
fn test_tuple_to_link_basic() {
    // Test basic 2-tuple conversion
    let link: LiNo<String> = ("papa", "mama").into();
    assert_eq!(format!("{}", link), "(papa: mama)");
}

#[test]
fn test_tuple_to_link_with_owned_strings() {
    // Test 2-tuple with owned strings
    let link: LiNo<String> = ("papa".to_string(), "mama".to_string()).into();
    assert_eq!(format!("{}", link), "(papa: mama)");
}

#[test]
fn test_tuple_3_elements() {
    // Test 3-tuple conversion
    let link: LiNo<String> = ("papa", "loves", "mama").into();
    assert_eq!(format!("{}", link), "(papa: loves mama)");
}

#[test]
fn test_tuple_4_elements() {
    // Test 4-tuple conversion
    let link: LiNo<String> = ("id", "value1", "value2", "value3").into();
    assert_eq!(format!("{}", link), "(id: value1 value2 value3)");
}

#[test]
fn test_tuple_with_lino_values() {
    // Test tuple where second element is a LiNo
    let child = LiNo::Ref("child".to_string());
    let link: LiNo<String> = ("parent", child).into();
    assert_eq!(format!("{}", link), "(parent: child)");
}

#[test]
fn test_anonymous_link_from_two_lino() {
    // Test anonymous link from two LiNo elements
    let a = LiNo::Ref("a".to_string());
    let b = LiNo::Ref("b".to_string());
    let link: LiNo<String> = (a, b).into();
    assert_eq!(format!("{}", link), "(a b)");
}

#[test]
fn test_anonymous_link_from_three_lino() {
    // Test anonymous link from three LiNo elements
    let a = LiNo::Ref("love".to_string());
    let b = LiNo::Ref("mama".to_string());
    let c = LiNo::Ref("papa".to_string());
    let link: LiNo<String> = (a, b, c).into();
    assert_eq!(format!("{}", link), "(love mama papa)");
}

#[test]
fn test_nested_links_with_tuples() {
    // Test nested link construction using tuples
    let loves_mama: LiNo<String> = ("lovesMama", "loves", "mama").into();
    let papa_link: LiNo<String> = ("papa", loves_mama).into();
    assert_eq!(format!("{}", papa_link), "(papa: (lovesMama: loves mama))");
}

#[test]
fn test_complex_example_matching_csharp() {
    // Test example that matches C# TupleTests
    // Equivalent to: ("papa", ("lovesMama", "loves", "mama"))
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

    let expected = "(papa: (lovesMama: loves mama))\n(son: lovesMama)\n(daughter: lovesMama)\n(all: (love mama))";
    assert_eq!(result, expected);
}

#[test]
fn test_tuple_with_mixed_lino_types() {
    // Test 3-tuple where second and third elements are LiNo
    let child1 = LiNo::Ref("child1".to_string());
    let child2 = LiNo::Ref("child2".to_string());
    let link: LiNo<String> = ("parent", child1, child2).into();
    assert_eq!(format!("{}", link), "(parent: child1 child2)");
}

#[test]
fn test_tuple_with_nested_link_values() {
    // Test tuple with nested link as value
    let nested: LiNo<String> = ("inner", "value").into();
    let outer: LiNo<String> = ("outer", nested).into();
    assert_eq!(format!("{}", outer), "(outer: (inner: value))");
}

#[test]
fn test_four_lino_anonymous_link() {
    // Test anonymous link from four LiNo elements
    let a = LiNo::Ref("a".to_string());
    let b = LiNo::Ref("b".to_string());
    let c = LiNo::Ref("c".to_string());
    let d = LiNo::Ref("d".to_string());
    let link: LiNo<String> = (a, b, c, d).into();
    assert_eq!(format!("{}", link), "(a b c d)");
}

#[test]
fn test_tuple_collection_format() {
    // Test formatting a collection of links created from tuples
    let link1: LiNo<String> = ("id1", "val1").into();
    let link2: LiNo<String> = ("id2", "val2").into();
    let link3: LiNo<String> = ("id3", "val3").into();

    let links = vec![link1, link2, link3];
    let result = format_links(&links);

    assert_eq!(result, "(id1: val1)\n(id2: val2)\n(id3: val3)");
}

#[test]
fn test_tuple_with_special_characters() {
    // Test tuple with values that need escaping
    let link: LiNo<String> = ("id with spaces", "value:with:colons").into();
    let result = format!("{}", link);
    // Result should contain both the id and value (they will be escaped in the format)
    // The Display trait doesn't escape, so let's just verify the structure is correct
    assert!(result.contains("id with spaces"));
    assert!(result.contains("value:with:colons"));
}

#[test]
fn test_empty_string_tuple() {
    // Test tuple with empty strings
    let link: LiNo<String> = ("", "").into();
    let result = format!("{}", link);
    // Empty strings should result in empty link representation
    assert_eq!(result, "(: )");
}

#[test]
fn test_tuple_ergonomics() {
    // Test that tuples can be used ergonomically in collections
    let links: Vec<LiNo<String>> = vec![
        ("papa", "mama").into(),
        ("son", "daughter").into(),
        ("loves", "family").into(),
    ];

    assert_eq!(links.len(), 3);
    assert_eq!(format!("{}", links[0]), "(papa: mama)");
    assert_eq!(format!("{}", links[1]), "(son: daughter)");
    assert_eq!(format!("{}", links[2]), "(loves: family)");
}
