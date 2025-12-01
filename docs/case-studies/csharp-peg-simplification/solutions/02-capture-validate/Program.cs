using System;
using CSharpPegTest;

/// <summary>
/// Test program for the capture-then-validate approach.
/// Demonstrates what works and what fails.
/// </summary>
class Program
{
    static void Main()
    {
        var parser = new CaptureValidateParser();

        // Test cases that WORK (isolated strings)
        var isolatedTests = new[]
        {
            ("\"hello\"", "hello"),
            ("\"\"world\"\"", "world"),
            ("\"\"\"foo\"\"\"", "foo"),
            ("\"\"\"\"quad\"\"\"\"", "quad"),
            ("'text'", "text"),
            ("''escaped''", "escaped"),
            ("'''triple'''", "triple"),
            ("`backtick`", "backtick"),
            ("``double``", "double"),
            // Escape sequences
            ("\"has \"\"escaped\"\" quotes\"", "has \"escaped\" quotes"),
            ("''text with '''' inside''", "text with '' inside"),
        };

        Console.WriteLine("=== Isolated String Tests (Should ALL Pass) ===\n");
        int passed = 0;
        int failed = 0;

        foreach (var (input, expected) in isolatedTests)
        {
            try
            {
                var result = parser.Parse(input);
                if (result == expected)
                {
                    Console.WriteLine($"✓ PASS: {input}");
                    Console.WriteLine($"        → \"{result}\"");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"✗ FAIL: {input}");
                    Console.WriteLine($"        Expected: \"{expected}\"");
                    Console.WriteLine($"        Got:      \"{result}\"");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ ERROR: {input}");
                Console.WriteLine($"         {ex.Message}");
                failed++;
            }
            Console.WriteLine();
        }

        Console.WriteLine($"Isolated tests: {passed} passed, {failed} failed\n");

        // Test cases that FAIL (multiple strings - disambiguation problem)
        var multipleTests = new[]
        {
            "\"first\" \"second\"",
            "\"a\" \"b\" \"c\"",
            "'one' 'two'",
        };

        Console.WriteLine("=== Multiple String Tests (Expected to FAIL) ===\n");

        foreach (var input in multipleTests)
        {
            Console.WriteLine($"Input: {input}");
            try
            {
                var result = parser.Parse(input);
                Console.WriteLine($"  Result: \"{result}\"");
                Console.WriteLine($"  Problem: Should have parsed two separate strings!");
                Console.WriteLine($"  Cause: Greedy PEG pattern captured entire input");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  Parse failed: {ex.Message}");
                Console.WriteLine($"  Cause: Captured text didn't validate as single string");
            }
            Console.WriteLine();
        }

        Console.WriteLine("=== Conclusion ===");
        Console.WriteLine("Capture-then-validate works for ISOLATED strings only.");
        Console.WriteLine("It FAILS when multiple quoted strings appear in sequence.");
        Console.WriteLine("This is due to PEG's greedy matching behavior.");
    }
}
