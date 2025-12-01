// This program demonstrates the MINIMIZED hybrid approach
// Only N=1,2 explicit + N>=3 procedural (current production implementation)

using System;

namespace TestMinimizedHybrid
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Test: Minimized Hybrid Approach (PRODUCTION) ===");
            Console.WriteLine();
            Console.WriteLine("This is the CURRENT production implementation.");
            Console.WriteLine();
            Console.WriteLine("Compared to Solution 04 (explicit 1-5 + procedural 6+):");
            Console.WriteLine("  - Solution 04: 30 explicit rules (5 levels × 3 types × 2)");
            Console.WriteLine("  - Solution 05: 12 explicit rules (2 levels × 3 types × 2)");
            Console.WriteLine("  - Reduction: 60% fewer explicit rules!");
            Console.WriteLine();
            Console.WriteLine("Why this works:");
            Console.WriteLine("  - N=1: Must be explicit for disambiguation (\"a\" \"b\")");
            Console.WriteLine("  - N=2: Must be explicit for escape handling (\"\"\"\"=\"\"\")");
            Console.WriteLine("  - N>=3: Content pattern can handle escapes correctly");
            Console.WriteLine();

            var parser = new QuoteParser();

            // Comprehensive test cases
            var testCases = new (string input, string[] expected)[]
            {
                // N=1 basic
                ("\"hello\"", new[] { "hello" }),
                ("'world'", new[] { "world" }),
                ("`backtick`", new[] { "backtick" }),

                // N=1 with escape
                ("\"with \"\" escape\"", new[] { "with \" escape" }),
                ("'with '' escape'", new[] { "with ' escape" }),
                ("`with `` escape`", new[] { "with ` escape" }),

                // N=1 disambiguation (critical test)
                ("\"a\" \"b\"", new[] { "a", "b" }),
                ("'x' 'y' 'z'", new[] { "x", "y", "z" }),

                // N=2 basic
                ("\"\"double\"\"", new[] { "double" }),
                ("''single''", new[] { "single" }),
                ("``tick``", new[] { "tick" }),

                // N=2 with escape
                ("\"\"with \"\"\"\" escape\"\"", new[] { "with \"\" escape" }),
                ("''with '''' escape''", new[] { "with '' escape" }),

                // N=3 (procedural)
                ("\"\"\"triple\"\"\"", new[] { "triple" }),
                ("'''triple'''", new[] { "triple" }),
                ("```triple```", new[] { "triple" }),

                // N=3 with escape
                ("\"\"\"with \"\"\"\"\"\" escape\"\"\"", new[] { "with \"\"\" escape" }),

                // N=4, N=5, N=6 (all procedural)
                ("\"\"\"\"quad\"\"\"\"", new[] { "quad" }),
                ("\"\"\"\"\"quint\"\"\"\"\"", new[] { "quint" }),
                ("\"\"\"\"\"\"sext\"\"\"\"\"\"", new[] { "sext" }),

                // N=10 (high quote - procedural)
                ("\"\"\"\"\"\"\"\"\"\"ten\"\"\"\"\"\"\"\"\"\"", new[] { "ten" }),

                // Mixed quote types
                ("\"double\" 'single' `tick`", new[] { "double", "single", "tick" }),

                // Real-world use case: JSON in triple quotes
                ("\"\"\"{ \"key\": \"value\" }\"\"\"", new[] { "{ \"key\": \"value\" }" }),

                // Real-world use case: Code in triple backticks
                ("```console.log(\"hello\");```", new[] { "console.log(\"hello\");" }),
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
                            Console.WriteLine($"✓ {Truncate(input, 50)}");
                            passed++;
                            continue;
                        }
                    }
                    Console.WriteLine($"✗ {Truncate(input, 50)}");
                    Console.WriteLine($"  Got: {Format(result)}");
                    Console.WriteLine($"  Expected: {Format(expected)}");
                    failed++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"✗ {Truncate(input, 50)}");
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
                Console.WriteLine("The minimized hybrid approach is the OPTIMAL solution:");
                Console.WriteLine("  - Minimal explicit rules (only N=1 and N=2)");
                Console.WriteLine("  - Universal procedural parsing for N>=3");
                Console.WriteLine("  - Full feature support with reduced grammar size");
            }
        }

        static string Truncate(string s, int max) =>
            s.Length <= max ? s : s.Substring(0, max - 3) + "...";

        static string Format(IEnumerable<string> items) =>
            "[" + string.Join(", ", items.Select(i => $"\"{i}\"")) + "]";
    }
}
