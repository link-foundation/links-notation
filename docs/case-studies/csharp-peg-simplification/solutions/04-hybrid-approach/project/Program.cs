// This program demonstrates the SUCCESSFUL hybrid approach
// Explicit PEG rules for N=1,2 + procedural for N>=3

using System;

namespace TestHybrid
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Test: Hybrid Approach (WORKING SOLUTION) ===");
            Console.WriteLine();
            Console.WriteLine("Strategy:");
            Console.WriteLine("  - N=1 (single quotes): Explicit PEG rules for disambiguation");
            Console.WriteLine("  - N=2 (double quotes): Explicit PEG rules for escape handling");
            Console.WriteLine("  - N>=3 (triple+): Procedural parsing for unlimited support");
            Console.WriteLine();

            var parser = new QuoteParser();

            // Test cases for all quote levels
            var testCases = new (string input, string[] expected)[]
            {
                // N=1 (single quote)
                ("\"hello\"", new[] { "hello" }),
                ("'world'", new[] { "world" }),
                ("`backtick`", new[] { "backtick" }),

                // N=1 with escape
                ("\"with \"\" escape\"", new[] { "with \" escape" }),

                // N=2 (double quote)
                ("\"\"double\"\"", new[] { "double" }),
                ("''single''", new[] { "single" }),
                ("``tick``", new[] { "tick" }),

                // N=2 with escape
                ("\"\"with \"\"\"\" escape\"\"", new[] { "with \"\" escape" }),

                // N=3 (triple quote) - procedural
                ("\"\"\"triple\"\"\"", new[] { "triple" }),
                ("'''triple'''", new[] { "triple" }),
                ("```triple```", new[] { "triple" }),

                // N=3 with escape
                ("\"\"\"with \"\"\"\"\"\" escape\"\"\"", new[] { "with \"\"\" escape" }),

                // N=4 (quadruple) - procedural
                ("\"\"\"\"quad\"\"\"\"", new[] { "quad" }),

                // N=5 (quintuple) - procedural
                ("\"\"\"\"\"quint\"\"\"\"\"", new[] { "quint" }),

                // Multiple strings on same line (disambiguation test)
                ("\"first\" \"second\"", new[] { "first", "second" }),
                ("\"\"a\"\" \"\"b\"\"", new[] { "a", "b" }),

                // Mixed quote types
                ("\"double\" 'single' `backtick`", new[] { "double", "single", "backtick" }),

                // High quotes with content
                ("\"\"\"JSON: {\"key\": \"value\"}\"\"\"", new[] { "JSON: {\"key\": \"value\"}" }),
            };

            int passed = 0, failed = 0;
            foreach (var (input, expected) in testCases)
            {
                try
                {
                    var result = parser.Parse(input);
                    if (result.Count == expected.Length)
                    {
                        bool match = true;
                        for (int i = 0; i < expected.Length; i++)
                        {
                            if (result[i] != expected[i])
                            {
                                match = false;
                                break;
                            }
                        }
                        if (match)
                        {
                            var display = string.Join(", ", result.Select(s => $"\"{s}\""));
                            Console.WriteLine($"✓ {input}");
                            Console.WriteLine($"  → [{display}]");
                            passed++;
                            continue;
                        }
                    }
                    var actualDisplay = string.Join(", ", result.Select(s => $"\"{s}\""));
                    var expectedDisplay = string.Join(", ", expected.Select(s => $"\"{s}\""));
                    Console.WriteLine($"✗ {input}");
                    Console.WriteLine($"  Got: [{actualDisplay}]");
                    Console.WriteLine($"  Expected: [{expectedDisplay}]");
                    failed++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"✗ {input}");
                    Console.WriteLine($"  Error: {ex.Message}");
                    failed++;
                }
            }

            Console.WriteLine();
            Console.WriteLine($"=== Summary ===");
            Console.WriteLine($"Passed: {passed}");
            Console.WriteLine($"Failed: {failed}");
            Console.WriteLine();
            if (failed == 0)
            {
                Console.WriteLine("✓ All tests passed!");
                Console.WriteLine();
                Console.WriteLine("CONCLUSION: The hybrid approach successfully handles:");
                Console.WriteLine("  - All three quote types (\", ', `)");
                Console.WriteLine("  - Any number of quotes (N = 1, 2, 3, ... unlimited)");
                Console.WriteLine("  - Proper escape sequences (2×N quotes → N quotes)");
                Console.WriteLine("  - Multiple quoted strings on the same line");
            }
        }
    }
}
