// This program demonstrates the semantic predicate limitation
// We show what we WANT to do vs what we CAN do

using System;

namespace TestSemanticPredicates
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Test: Semantic Predicates Limitation ===");
            Console.WriteLine();
            Console.WriteLine("In JavaScript (Peggy.js), we can write:");
            Console.WriteLine("  doubleQuoted = &'\"' &{");
            Console.WriteLine("    const pos = offset();");
            Console.WriteLine("    const result = parseQuotedStringAt(input, pos, '\"');");
            Console.WriteLine("    return result != null;");
            Console.WriteLine("  }");
            Console.WriteLine();
            Console.WriteLine("In C# (Pegasus), we WANT to write:");
            Console.WriteLine("  doubleQuoted = &'\"' &{ ParseQuotedStringAt(subject, state.Location, '\"') }");
            Console.WriteLine();
            Console.WriteLine("But this FAILS because:");
            Console.WriteLine("  - 'subject' is not accessible in semantic predicates");
            Console.WriteLine("  - Predicates only receive 'state' (Cursor) with 'Location'");
            Console.WriteLine("  - There's no way to access the input string");
            Console.WriteLine();
            Console.WriteLine("Compilation errors we would get:");
            Console.WriteLine("  error CS0103: The name 'subject' does not exist in the current context");
            Console.WriteLine("  error CS0119: 'Cursor' is a type, which is not valid in the given context");
            Console.WriteLine();

            // The grammar compiles, but only because we use fallback explicit rules
            var parser = new QuoteParser();

            Console.WriteLine("=== Running with Fallback Explicit Rules ===");
            var testCases = new (string input, string expected)[]
            {
                ("\"hello\"", "hello"),
                ("'text'", "text"),
                ("`backtick`", "backtick"),
                ("\"with \"\" escape\"", "with \" escape"),
            };

            foreach (var (input, expected) in testCases)
            {
                try
                {
                    var result = parser.Parse(input);
                    var status = result == expected ? "✓" : "✗";
                    Console.WriteLine($"{status} {input} → \"{result}\"");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"✗ {input} → Error: {ex.Message}");
                }
            }

            Console.WriteLine();
            Console.WriteLine("CONCLUSION: Semantic predicates in Pegasus cannot access");
            Console.WriteLine("the input string (subject), so universal parsing like");
            Console.WriteLine("JavaScript's Peggy.js is NOT possible.");
        }
    }
}
