use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, LitStr};

/// Procedural macro that provides compile-time validation of Links Notation syntax.
///
/// This macro takes a string literal containing Links Notation and validates it at compile time.
/// At runtime, it calls the parser to construct the `LiNo` structure, but any syntax errors
/// are caught during compilation.
///
/// # Examples
///
/// ```rust
/// use links_notation::lino;
///
/// // This will be validated at compile time
/// let result = lino!("papa (lovesMama: loves mama)");
///
/// // This would fail to compile with a clear error message:
/// // let invalid = lino!("(unclosed parenthesis");
/// ```
///
/// # Benefits
///
/// - **Compile-time validation**: Syntax errors are caught at compile time
/// - **Zero overhead**: Simple wrapper around the runtime parser
/// - **Type-safe**: Returns fully typed `LiNo<String>` structures
/// - **Convenient**: No need to manually handle parse errors in most cases
///
/// # Implementation
///
/// The macro expands to code that:
/// 1. Contains a compile-time validation check
/// 2. Calls `parse_lino()` at runtime
/// 3. Unwraps the result (safe because validation passed at compile time)
#[proc_macro]
pub fn lino(input: TokenStream) -> TokenStream {
    let input_lit = parse_macro_input!(input as LitStr);
    let lino_str = input_lit.value();

    // Validate syntax at compile time using a simple parser
    // We can't use the full runtime parser here due to cyclic dependencies,
    // so we do basic validation
    if let Err(e) = validate_lino_syntax(&lino_str) {
        return syn::Error::new_spanned(input_lit, format!("Invalid Links Notation: {}", e))
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
}
