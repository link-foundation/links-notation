//! What a document costs: tokens, characters and bytes.
//!
//! Tokens are the measure the issue asks for - what a document costs in a
//! model's context - and they are counted with the same byte-pair encodings the
//! models use, not estimated from character counts. Two encodings are reported:
//!
//! * `o200k_base`, used by GPT-5, GPT-4.1 and GPT-4o, is the headline number;
//! * `cl100k_base`, used by GPT-4 and GPT-3.5, shows whether a result depends
//!   on one tokenizer's vocabulary.
//!
//! Characters are Unicode scalar values of the UTF-8 text, which is the count
//! the issue asks for, and bytes are its UTF-8 length.

use serde::Serialize;
use std::sync::OnceLock;
use tiktoken_rs::CoreBPE;

/// The cost of one document in one format.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
pub struct Metrics {
    /// Tokens under `o200k_base` (GPT-5, GPT-4.1, GPT-4o).
    pub tokens_o200k: usize,
    /// Tokens under `cl100k_base` (GPT-4, GPT-3.5).
    pub tokens_cl100k: usize,
    /// Unicode scalar values in the UTF-8 text.
    pub chars: usize,
    /// Length of the UTF-8 text in bytes.
    pub bytes: usize,
}

fn o200k() -> &'static CoreBPE {
    static ENCODER: OnceLock<CoreBPE> = OnceLock::new();
    ENCODER.get_or_init(|| tiktoken_rs::o200k_base().expect("o200k_base ships with tiktoken-rs"))
}

fn cl100k() -> &'static CoreBPE {
    static ENCODER: OnceLock<CoreBPE> = OnceLock::new();
    ENCODER.get_or_init(|| tiktoken_rs::cl100k_base().expect("cl100k_base ships with tiktoken-rs"))
}

/// Measure one document.
pub fn measure(text: &str) -> Metrics {
    Metrics {
        // `encode_ordinary` treats every byte as text: a document that happens
        // to contain something looking like `<|endoftext|>` is data, not a
        // control token, and counting it as one would understate its cost.
        tokens_o200k: o200k().encode_ordinary(text).len(),
        tokens_cl100k: cl100k().encode_ordinary(text).len(),
        chars: text.chars().count(),
        bytes: text.len(),
    }
}

/// How much smaller `candidate` is than `baseline`, in percent.
/// A positive number means the candidate costs less.
pub fn savings(candidate: usize, baseline: usize) -> f64 {
    if baseline == 0 {
        return 0.0;
    }
    (baseline as f64 - candidate as f64) / baseline as f64 * 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_characters_not_bytes() {
        let measured = measure("naïve ✓");
        assert_eq!(measured.chars, 7);
        assert_eq!(measured.bytes, 10);
    }

    #[test]
    fn counts_tokens_with_both_encodings() {
        let measured = measure("hello world");
        assert!(measured.tokens_o200k > 0);
        assert!(measured.tokens_cl100k > 0);
    }

    #[test]
    fn reports_savings_as_a_percentage() {
        assert_eq!(savings(50, 100), 50.0);
        assert_eq!(savings(100, 100), 0.0);
        assert_eq!(savings(150, 100), -50.0);
        assert_eq!(savings(1, 0), 0.0);
    }
}
