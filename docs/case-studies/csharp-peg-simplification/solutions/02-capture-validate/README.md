# Solution 2: Capture-then-Validate Approach

## Concept

Capture a greedy PEG pattern that matches quoted strings, then use a semantic predicate to validate and parse the captured text procedurally.

## How It Works

1. **Capture Phase**: Use greedy PEG patterns to capture text that looks like a quoted string
2. **Validate Phase**: Use a semantic predicate `&{ }` to parse the captured text
3. **Return Phase**: Return the parsed value stored in a member field

## Implementation

### Grammar (test_capture_validate.peg)

```
@namespace CSharpPegTest
@classname CaptureValidateParser
@using System.Linq

@members
{
    private string _parsedValue;

    /// <summary>
    /// Parse captured text as an N-quote string.
    /// The captured text should include opening and closing quotes.
    /// </summary>
    private bool TryParseQuotedString(string capturedText, char quoteChar)
    {
        _parsedValue = null;
        if (string.IsNullOrEmpty(capturedText) || capturedText[0] != quoteChar)
            return false;

        // Count opening quotes
        int quoteCount = 0;
        int pos = 0;
        while (pos < capturedText.Length && capturedText[pos] == quoteChar)
        {
            quoteCount++;
            pos++;
        }

        string closeSeq = new string(quoteChar, quoteCount);
        string escapeSeq = new string(quoteChar, quoteCount * 2);
        var content = new System.Text.StringBuilder();

        while (pos < capturedText.Length)
        {
            // Check for escape sequence (2*N quotes)
            if (pos + escapeSeq.Length <= capturedText.Length &&
                capturedText.Substring(pos, escapeSeq.Length) == escapeSeq)
            {
                content.Append(closeSeq);
                pos += escapeSeq.Length;
                continue;
            }

            // Check for closing sequence
            if (pos + quoteCount <= capturedText.Length &&
                capturedText.Substring(pos, quoteCount) == closeSeq)
            {
                int afterClose = pos + quoteCount;
                if (afterClose >= capturedText.Length || capturedText[afterClose] != quoteChar)
                {
                    // Valid closing - check if we consumed entire captured text
                    if (afterClose == capturedText.Length)
                    {
                        _parsedValue = content.ToString();
                        return true;
                    }
                    // Captured more than one quoted string (disambiguation problem)
                    return false;
                }
            }

            content.Append(capturedText[pos]);
            pos++;
        }
        return false;
    }
}

document <string> = q:quoted { q }

// Try to parse quoted strings using capture-then-validate
quoted <string> = doubleQuoted / singleQuoted / backtickQuoted

// Double quotes: capture greedy pattern, then validate
doubleQuoted <string> = raw:doubleQuoteCaptureRaw &{ TryParseQuotedString(raw, '"') } { _parsedValue }

// Capture pattern for double quotes
// Matches: one or more ", then content, then one or more "
doubleQuoteCaptureRaw <string> = "" ('"'+ doubleQuoteContent* '"'+)
doubleQuoteContent = [^"] / '"'+ &[^"]

// Single quotes: same pattern
singleQuoted <string> = raw:singleQuoteCaptureRaw &{ TryParseQuotedString(raw, '\'') } { _parsedValue }
singleQuoteCaptureRaw <string> = "" ("'"+ singleQuoteContent* "'"+)
singleQuoteContent = [^'] / "'"+ &[^']

// Backticks: same pattern
backtickQuoted <string> = raw:backtickCaptureRaw &{ TryParseQuotedString(raw, '`') } { _parsedValue }
backtickCaptureRaw <string> = "" ('`'+ backtickContent* '`'+)
backtickContent = [^`] / '`'+ &[^`]
```

### Test Program (Program.cs)

```csharp
using System;
using CSharpPegTest;

class Program
{
    static void Main()
    {
        var parser = new CaptureValidateParser();

        // Test cases that WORK (isolated strings)
        var testCases = new[]
        {
            ("\"hello\"", "hello"),
            ("\"\"world\"\"", "world"),
            ("\"\"\"foo\"\"\"", "foo"),
            ("'text'", "text"),
            ("''escaped''", "escaped"),
            ("`backtick`", "backtick"),
        };

        Console.WriteLine("=== Isolated String Tests ===");
        foreach (var (input, expected) in testCases)
        {
            var result = parser.Parse(input);
            var status = result == expected ? "✓" : "✗";
            Console.WriteLine($"{status} {input} → {result} (expected: {expected})");
        }

        // Test case that FAILS (multiple strings)
        Console.WriteLine("\n=== Multiple String Tests (Disambiguation) ===");
        try
        {
            var multiInput = "\"first\" \"second\"";
            var result = parser.Parse(multiInput);
            Console.WriteLine($"✗ {multiInput} → {result} (should parse two separate strings!)");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Parse failed: {ex.Message}");
        }
    }
}
```

## Results

### Isolated Strings - SUCCESS ✓

```
=== Isolated String Tests ===
✓ "hello" → hello (expected: hello)
✓ ""world"" → world (expected: world)
✓ """foo""" → foo (expected: foo)
✓ 'text' → text (expected: text)
✓ ''escaped'' → escaped (expected: escaped)
✓ `backtick` → backtick (expected: backtick)
```

### Multiple Strings - FAILURE ✗

```
=== Multiple String Tests (Disambiguation) ===
Input: "first" "second"
Expected: Parse two separate strings
Actual: Greedy pattern captures from first " to last " → ONE string
```

## Problem Analysis

### Why Isolated Strings Work

For input `"hello"`:
1. `'"'+` matches the opening `"`
2. `doubleQuoteContent*` matches `hello`
3. `'"'+` matches the closing `"`
4. `TryParseQuotedString` validates: exactly 1 quote open/close, content is "hello"
5. Success!

### Why Multiple Strings Fail

For input `"first" "second"`:
1. `'"'+` matches the first `"`
2. `doubleQuoteContent*` matches `first" "second` (everything until last `"`)
3. `'"'+` matches the final `"`
4. Captured text is `"first" "second"` - the ENTIRE input
5. `TryParseQuotedString` tries to validate, finds that closing quotes don't match
6. Fails!

### Root Cause: PEG Greedy Operators

PEG's `+` and `*` operators are **greedy** - they match as much as possible.

The pattern `'"'+ content* '"'+` will always:
- Start at the first `"`
- End at the LAST `"`
- Include everything in between

There's no way in PEG to say "match the smallest valid quoted string".

## Conclusion

**Status**: ⚠️ PARTIAL SUCCESS

This approach works for:
- Isolated quoted strings
- Strings at end of input
- Strings followed by non-quote characters

This approach fails for:
- Multiple quoted strings on the same line
- Quoted strings in complex expressions

## When This Approach Can Be Used

If your grammar guarantees that quoted strings are always:
- At the end of a line
- Followed by non-quote characters
- Or isolated

Then this approach works fine. The current C# implementation uses this for 6+ quote strings (high quotes) where:
1. A lookahead `&('""""""' / "''''''" / '``````')` ensures we're looking at 6+ quotes
2. The captured pattern is then validated
3. Disambiguation with 1-5 quote strings is handled by explicit rules

## Alternative: Explicit Rules for Disambiguation

The hybrid approach uses explicit rules for 1-5 quotes which provide proper PEG disambiguation, and only uses capture-then-validate for 6+ quotes (rare case).
