// This program demonstrates the capture-then-validate approach
// It shows both SUCCESS (isolated strings) and FAILURE (disambiguation)

using System;

namespace TestCaptureValidate
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Test: Capture-then-Validate Approach ===");
            Console.WriteLine();

            var parser = new QuoteParser();

            // Test cases that WORK (isolated strings)
            var successCases = new (string input, string expected)[]
            {
                ("\"hello\"", "hello"),
                ("\"\"world\"\"", "world"),
                ("\"\"\"foo\"\"\"", "foo"),
                ("'text'", "text"),
                ("''escaped''", "escaped"),
                ("`backtick`", "backtick"),
                ("\"\"with \"\"\"\" escape\"\"", "with \"\" escape"),
            };

            Console.WriteLine("=== Isolated String Tests (Expected: SUCCESS) ===");
            int passed = 0, failed = 0;
            foreach (var (input, expected) in successCases)
            {
                try
                {
                    var result = parser.Parse(input);
                    if (result == expected)
                    {
                        Console.WriteLine($"✓ {input} → \"{result}\"");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine($"✗ {input} → \"{result}\" (expected: \"{expected}\")");
                        failed++;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"✗ {input} → Error: {ex.Message}");
                    failed++;
                }
            }

            Console.WriteLine();
            Console.WriteLine("=== Multiple String Tests (Expected: FAILURE) ===");
            Console.WriteLine("These tests demonstrate the disambiguation problem:");
            Console.WriteLine();

            // Test case that FAILS due to greedy disambiguation
            var multiInput = "\"first\" \"second\"";
            try
            {
                var result = parser.Parse(multiInput);
                Console.WriteLine($"Input: {multiInput}");
                Console.WriteLine($"Result: \"{result}\"");
                Console.WriteLine("PROBLEM: Greedy pattern captured from first \" to last \"");
                Console.WriteLine("Expected: Two separate strings \"first\" and \"second\"");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Input: {multiInput}");
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine("This failure is expected - greedy patterns can't disambiguate");
            }

            Console.WriteLine();
            Console.WriteLine($"=== Summary ===");
            Console.WriteLine($"Isolated strings: {passed} passed, {failed} failed");
            Console.WriteLine();
            Console.WriteLine("CONCLUSION: Capture-then-validate works for isolated strings");
            Console.WriteLine("but FAILS for disambiguation of multiple quoted strings.");
        }
    }
}
