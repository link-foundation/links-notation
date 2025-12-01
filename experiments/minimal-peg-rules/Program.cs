using System;
using System.Collections.Generic;
using TestMinimalRules;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("=== Testing Minimal PEG Rules (N=1 explicit only) ===\n");

        var testCases = new List<(string input, string[] expected, string description)>
        {
            // Single quoted strings (isolated)
            ("\"hello\"", new[] { "hello" }, "Simple single double quotes"),
            ("'world'", new[] { "world" }, "Simple single single quotes"),
            ("`test`", new[] { "test" }, "Simple single backticks"),

            // Multiple quoted strings on same line - THE CRITICAL TEST
            ("\"a\" \"b\"", new[] { "a", "b" }, "Two double-quoted strings"),
            ("'x' 'y'", new[] { "x", "y" }, "Two single-quoted strings"),
            ("`p` `q`", new[] { "p", "q" }, "Two backtick strings"),

            // Multi-quote (2)
            ("\"\"hello\"\"", new[] { "hello" }, "Double quotes (2)"),
            ("''world''", new[] { "world" }, "Single quotes (2)"),

            // Multi-quote (3)
            ("\"\"\"text\"\"\"", new[] { "text" }, "Triple double quotes"),
            ("'''text'''", new[] { "text" }, "Triple single quotes"),

            // Multiple multi-quoted strings - This is problematic with minimal rules
            ("\"\"a\"\" \"\"b\"\"", new[] { "a", "b" }, "Two double-double quoted strings"),

            // Escaping
            ("\"say \"\"hello\"\"\"", new[] { "say \"hello\"" }, "Escape with double quotes"),
            ("'it''s'", new[] { "it's" }, "Escape with single quotes"),

            // Mixed quote types
            ("\"a\" 'b' `c`", new[] { "a", "b", "c" }, "Mixed quote types"),

            // Higher quote levels
            ("\"\"\"\"text\"\"\"\"", new[] { "text" }, "Quadruple double quotes"),
            ("'''''text'''''", new[] { "text" }, "Quintuple single quotes"),
            ("``````text``````", new[] { "text" }, "Sextuple backticks"),
        };

        // Test both parsers
        TestParser("Universal Parser (fails disambiguation)", input => new QuoteParser().Parse(input), testCases);
        Console.WriteLine("\n" + new string('=', 60) + "\n");
        TestParser("Minimal Rules Parser (N=1 explicit)", input => new QuoteParserMinimal().Parse(input), testCases);
    }

    static void TestParser(string parserName, Func<string, IList<string>> parseFunc, List<(string input, string[] expected, string description)> testCases)
    {
        Console.WriteLine($"=== {parserName} ===\n");

        int passed = 0;
        int failed = 0;

        foreach (var (input, expected, description) in testCases)
        {
            Console.WriteLine($"Test: {description}");
            Console.WriteLine($"  Input: {input}");

            try
            {
                var result = parseFunc(input);

                bool matches = result.Count == expected.Length;
                if (matches)
                {
                    for (int i = 0; i < expected.Length; i++)
                    {
                        if (result[i] != expected[i])
                        {
                            matches = false;
                            break;
                        }
                    }
                }

                if (matches)
                {
                    Console.WriteLine($"  Result: [{string.Join(", ", result)}] - PASS");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  Expected: [{string.Join(", ", expected)}]");
                    Console.WriteLine($"  Got: [{string.Join(", ", result)}] - FAIL");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  Error: {ex.Message} - FAIL");
                failed++;
            }

            Console.WriteLine();
        }

        Console.WriteLine($"=== {parserName}: {passed} passed, {failed} failed ===");
    }
}
