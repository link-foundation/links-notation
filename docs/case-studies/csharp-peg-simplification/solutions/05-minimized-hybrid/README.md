# Solution 5: Minimized Hybrid Approach (N=1,2 explicit + N>=3 procedural)

## Status: SUCCESS

This solution successfully reduces the number of explicit PEG rules while maintaining full functionality.

## Approach

Instead of having explicit rules for N=1 through N=5, this approach uses:

1. **Explicit PEG rules for N=1** - Required for disambiguation
2. **Explicit PEG rules for N=2** - Required for escape handling
3. **Procedural parsing for N>=3** - Handles unlimited quotes

## Key Findings

### N=1 Must Be Explicit
Multiple single-quoted strings on the same line (e.g., `"a" "b"`) require explicit PEG rules because:
- PEG's greedy operators will capture from first quote to last quote
- Explicit rules with specific opening/closing patterns ensure proper boundaries

### N=2 Must Be Explicit
Escape sequences in N=2 strings cannot be handled by generic content patterns:
- For `""text with """" escaped""`, the content `""""` (escape) starts with `""`
- A generic pattern like `!'""' c:.` stops at ANY `""`, including escapes
- Explicit rules can use `'""""' { "\"\"" }` to specifically match the escape

### N>=3 Can Be Procedural
For N>=3, the content pattern `'"'+ &[^"]` works because:
- Quote sequences followed by non-quote are captured as content
- The procedural validator identifies the correct N from the raw capture
- Escape sequences (2×N quotes) are followed by content, so they're captured correctly

## Grammar Reduction

| Metric | Original | Optimized | Improvement |
|--------|----------|-----------|-------------|
| Total lines | 188 | 155 | -33 lines |
| Explicit quote rules | 30 rules (5 levels × 3 types × 2 rules) | 12 rules (2 levels × 3 types × 2 rules) | -60% |
| Procedural threshold | N >= 6 | N >= 3 | Covers more cases |

## Test Results

All tests pass:
- C#: 180 tests
- JS: 188 tests
- Python: 176 tests
- Rust: 39 tests

## Code

See `../../csharp/Link.Foundation.Links.Notation/Parser.peg` for the complete implementation.
