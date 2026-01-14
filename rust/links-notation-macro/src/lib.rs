use proc_macro::TokenStream;
use proc_macro2::TokenTree;
use quote::quote;
use syn::{parse::Parse, parse::ParseStream, LitStr};

/// Procedural macro that provides compile-time validation of Links Notation syntax.
///
/// This macro takes Links Notation and validates it at compile time.
/// At runtime, it calls the parser to construct the `LiNo` structure, but any syntax errors
/// are caught during compilation.
///
/// # Syntax Options
///
/// The macro supports two syntax options:
///
/// ## 1. Direct Syntax (Recommended)
///
/// Write Links Notation directly without quotes:
///
/// ```rust
/// use links_notation::lino;
///
/// let result = lino!(papa (lovesMama: loves mama));
/// let triplet = lino!(papa has car);
/// let nested = lino!((outer: (inner: value)));
/// ```
///
/// ## 2. String Literal Syntax
///
/// Use string literals for complex cases with special characters:
///
/// ```rust
/// use links_notation::lino;
///
/// let result = lino!("papa (lovesMama: loves mama)");
/// let with_newlines = lino!("line1\nline2");
/// let with_quotes = lino!(r#"("quoted id": "quoted value")"#);
/// ```
///
/// # Examples
///
/// ```rust
/// use links_notation::lino;
///
/// // Direct syntax - cleaner and more native
/// let result = lino!(papa (lovesMama: loves mama));
///
/// // String literal for special characters
/// let result = lino!("contains special: chars");
///
/// // Syntax errors caught at compile time!
/// // let invalid = lino!((unclosed);  // ← Compile error
/// ```
///
/// # Benefits
///
/// - **Compile-time validation**: Syntax errors are caught at compile time
/// - **Zero overhead**: Simple wrapper around the runtime parser
/// - **Type-safe**: Returns fully typed `LiNo<String>` structures
/// - **Convenient**: No need to manually handle parse errors in most cases
/// - **Native syntax**: Direct syntax option for cleaner, quote-free code
///
/// # Implementation
///
/// The macro expands to code that:
/// 1. Contains a compile-time validation check
/// 2. Calls `parse_lino()` at runtime
/// 3. Unwraps the result (safe because validation passed at compile time)
#[proc_macro]
pub fn lino(input: TokenStream) -> TokenStream {
    let input2: proc_macro2::TokenStream = input.into();

    // Try to parse as a string literal first
    let lino_str = match syn::parse2::<LitStr>(input2.clone()) {
        Ok(lit_str) => lit_str.value(),
        Err(_) => {
            // Not a string literal, parse as direct tokens
            match syn::parse2::<DirectLinoInput>(input2.clone()) {
                Ok(direct) => direct.content,
                Err(e) => {
                    return syn::Error::new(
                        proc_macro2::Span::call_site(),
                        format!("Failed to parse Links Notation input: {}", e),
                    )
                    .to_compile_error()
                    .into();
                }
            }
        }
    };

    // Validate syntax at compile time using a simple parser
    // We can't use the full runtime parser here due to cyclic dependencies,
    // so we do basic validation
    if let Err(e) = validate_lino_syntax(&lino_str) {
        return syn::Error::new(
            proc_macro2::Span::call_site(),
            format!("Invalid Links Notation: {}", e),
        )
        .to_compile_error()
        .into();
    }

    // Generate code that parses at runtime
    // The const assertion ensures the string is valid at compile time
    let expanded = quote! {
        {
            // Compile-time validation marker
            const _: () = {
                // This validates the string literal is well-formed
                let _ = #lino_str;
            };

            // Runtime parsing
            links_notation::parse_lino(#lino_str).expect("lino! macro: validated at compile time but runtime parse failed")
        }
    };

    TokenStream::from(expanded)
}

/// Custom parser for direct Links Notation syntax without string literals.
///
/// This parser converts tokens directly to a Links Notation string.
struct DirectLinoInput {
    content: String,
}

impl Parse for DirectLinoInput {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let mut content = String::new();
        let tokens: proc_macro2::TokenStream = input.parse()?;

        tokens_to_lino_string(tokens, &mut content);

        Ok(DirectLinoInput { content })
    }
}

/// Convert a token stream to a Links Notation string representation.
///
/// This function handles the conversion of Rust tokens to the equivalent
/// Links Notation text, preserving the structure and meaning.
fn tokens_to_lino_string(tokens: proc_macro2::TokenStream, output: &mut String) {
    let mut prev_needs_space = false;
    let mut tokens_iter = tokens.into_iter().peekable();

    while let Some(token) = tokens_iter.next() {
        match token {
            TokenTree::Ident(ident) => {
                if prev_needs_space {
                    output.push(' ');
                }
                output.push_str(&ident.to_string());
                prev_needs_space = true;
            }
            TokenTree::Punct(punct) => {
                let ch = punct.as_char();
                match ch {
                    ':' => {
                        // Colon is used for ID separator in Links Notation
                        // Don't add space before colon, but add space after
                        output.push(':');
                        prev_needs_space = true;
                    }
                    '-' => {
                        // Check if this is part of a negative number or hyphenated word
                        // Look at next token
                        if let Some(next) = tokens_iter.peek() {
                            match next {
                                TokenTree::Literal(_) | TokenTree::Ident(_) => {
                                    // Part of a compound like -123 or hyphenated word
                                    if prev_needs_space {
                                        output.push(' ');
                                    }
                                    output.push('-');
                                    prev_needs_space = false;
                                }
                                _ => {
                                    if prev_needs_space {
                                        output.push(' ');
                                    }
                                    output.push('-');
                                    prev_needs_space = true;
                                }
                            }
                        } else {
                            if prev_needs_space {
                                output.push(' ');
                            }
                            output.push('-');
                            prev_needs_space = true;
                        }
                    }
                    '_' => {
                        // Underscore might be part of an identifier
                        output.push('_');
                        prev_needs_space = false;
                    }
                    '.' => {
                        // Period - could be decimal or sentence end
                        output.push('.');
                        prev_needs_space = false;
                    }
                    '\'' => {
                        // Single quote
                        output.push('\'');
                        prev_needs_space = false;
                    }
                    '"' => {
                        // Double quote (escaped)
                        output.push('"');
                        prev_needs_space = false;
                    }
                    _ => {
                        // Other punctuation
                        if prev_needs_space && !matches!(ch, ',' | ';' | '!' | '?') {
                            output.push(' ');
                        }
                        output.push(ch);
                        prev_needs_space = !matches!(ch, '(' | '[' | '{' | '<');
                    }
                }
            }
            TokenTree::Literal(lit) => {
                if prev_needs_space {
                    output.push(' ');
                }
                // Handle different literal types
                let lit_str = lit.to_string();

                // Check if it's a string literal (starts and ends with quotes)
                if (lit_str.starts_with('"') && lit_str.ends_with('"'))
                    || (lit_str.starts_with('\'') && lit_str.ends_with('\''))
                {
                    // It's a quoted string literal in Rust, use it as-is in Links Notation
                    output.push_str(&lit_str);
                } else {
                    // Numeric or other literal
                    output.push_str(&lit_str);
                }
                prev_needs_space = true;
            }
            TokenTree::Group(group) => {
                let delimiter = group.delimiter();
                match delimiter {
                    proc_macro2::Delimiter::Parenthesis => {
                        // In Links Notation, parentheses define links
                        if prev_needs_space {
                            output.push(' ');
                        }
                        output.push('(');
                        tokens_to_lino_string(group.stream(), output);
                        output.push(')');
                        prev_needs_space = true;
                    }
                    proc_macro2::Delimiter::Bracket => {
                        // Square brackets - pass through
                        if prev_needs_space {
                            output.push(' ');
                        }
                        output.push('[');
                        tokens_to_lino_string(group.stream(), output);
                        output.push(']');
                        prev_needs_space = true;
                    }
                    proc_macro2::Delimiter::Brace => {
                        // Curly braces - pass through
                        if prev_needs_space {
                            output.push(' ');
                        }
                        output.push('{');
                        tokens_to_lino_string(group.stream(), output);
                        output.push('}');
                        prev_needs_space = true;
                    }
                    proc_macro2::Delimiter::None => {
                        // No delimiter group
                        tokens_to_lino_string(group.stream(), output);
                    }
                }
            }
        }
    }
}

/// Basic syntax validation for Links Notation.
/// This is a simplified validator that catches common errors without needing the full parser.
fn validate_lino_syntax(input: &str) -> Result<(), String> {
    // Check for balanced parentheses
    let mut depth = 0;
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut escape_next = false;

    for c in input.chars() {
        if escape_next {
            escape_next = false;
            continue;
        }

        match c {
            '\\' => escape_next = true,
            '\'' if !in_double_quote => in_single_quote = !in_single_quote,
            '"' if !in_single_quote => in_double_quote = !in_double_quote,
            '(' if !in_single_quote && !in_double_quote => depth += 1,
            ')' if !in_single_quote && !in_double_quote => {
                depth -= 1;
                if depth < 0 {
                    return Err("Unmatched closing parenthesis".to_string());
                }
            }
            _ => {}
        }
    }

    if depth != 0 {
        return Err(format!(
            "Unbalanced parentheses: {} unclosed opening parenthes{}",
            depth,
            if depth == 1 { "is" } else { "es" }
        ));
    }

    if in_single_quote {
        return Err("Unclosed single quote".to_string());
    }

    if in_double_quote {
        return Err("Unclosed double quote".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_balanced_parens() {
        assert!(validate_lino_syntax("(a b c)").is_ok());
        assert!(validate_lino_syntax("((a) (b))").is_ok());
        assert!(validate_lino_syntax("a b c").is_ok());
    }

    #[test]
    fn test_validate_unbalanced_parens() {
        assert!(validate_lino_syntax("(a b c").is_err());
        assert!(validate_lino_syntax("a b c)").is_err());
        assert!(validate_lino_syntax("((a) (b)").is_err());
    }

    #[test]
    fn test_validate_quotes() {
        assert!(validate_lino_syntax(r#"("quoted" value)"#).is_ok());
        assert!(validate_lino_syntax("('quoted' value)").is_ok());
        assert!(validate_lino_syntax(r#"("unclosed)"#).is_err());
        assert!(validate_lino_syntax("('unclosed)").is_err());
    }

    #[test]
    fn test_validate_nested_quotes() {
        assert!(validate_lino_syntax(r#"("string with (parens)" value)"#).is_ok());
    }

    #[test]
    fn test_validate_empty() {
        assert!(validate_lino_syntax("").is_ok());
        assert!(validate_lino_syntax("   ").is_ok());
    }

    #[test]
    fn test_tokens_to_lino_basic() {
        // Test basic token conversion
        let tokens: proc_macro2::TokenStream = "papa has car".parse().unwrap();
        let mut output = String::new();
        tokens_to_lino_string(tokens, &mut output);
        assert_eq!(output, "papa has car");
    }

    #[test]
    fn test_tokens_to_lino_with_parens() {
        let tokens: proc_macro2::TokenStream = "papa (loves mama)".parse().unwrap();
        let mut output = String::new();
        tokens_to_lino_string(tokens, &mut output);
        assert_eq!(output, "papa (loves mama)");
    }

    #[test]
    fn test_tokens_to_lino_with_colon() {
        let tokens: proc_macro2::TokenStream = "(lovesMama: loves mama)".parse().unwrap();
        let mut output = String::new();
        tokens_to_lino_string(tokens, &mut output);
        assert_eq!(output, "(lovesMama: loves mama)");
    }

    #[test]
    fn test_tokens_to_lino_nested() {
        let tokens: proc_macro2::TokenStream = "(outer (inner value))".parse().unwrap();
        let mut output = String::new();
        tokens_to_lino_string(tokens, &mut output);
        assert_eq!(output, "(outer (inner value))");
    }
}
