//! Which bare references the links-notation parser accepts.
//!
//! The minimal-quoting encoder may only leave a value unquoted if the notation's
//! own parser reads it as one reference. Run with:
//! `cargo run --manifest-path rust/Cargo.toml --example bare_reference_probe`
fn main() {
    let candidates = [
        "ORD-2026-1000",
        "2026-01-01T00:00:00Z",
        "customer813@example.com",
        "SKU-81258",
        "73.46",
        "delivered",
        "a_b",
        "a.b",
        "a:b",
        "a-b",
        "a@b",
        "a/b",
        "a+b",
        "a,b",
        "a;b",
        "a#b",
        "a=b",
        "a*b",
        "a%b",
        "a!b",
        "a?b",
        "a[b",
        "a{b",
        "a<b",
        "a|b",
        "a\\b",
        "a$b",
        "a&b",
        "a~b",
        "a^b",
    ];
    for candidate in candidates {
        let document = format!("(key {candidate})");
        match links_notation::parse_lino(&document) {
            Ok(_) => println!("ok    {candidate}"),
            Err(error) => println!("FAIL  {candidate}  ({error})"),
        }
    }
}
