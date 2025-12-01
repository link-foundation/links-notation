// This program demonstrates the #parse{} approach failure
// When you run 'dotnet build', you will see error PEG0011

using System;

namespace TestParseExpression
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Test: #parse{} Expression Approach ===");
            Console.WriteLine();
            Console.WriteLine("This test demonstrates that #parse{} expressions");
            Console.WriteLine("do NOT work with the <PegGrammar> MSBuild tag.");
            Console.WriteLine();
            Console.WriteLine("Expected build error:");
            Console.WriteLine("  error PEG0011: Unterminated code section.");
            Console.WriteLine();
            Console.WriteLine("If you see this message, the grammar compiled");
            Console.WriteLine("successfully, which means the bug may have been fixed!");
            Console.WriteLine();

            // This code won't execute because the project won't compile
            // var parser = new QuoteParser();
            // var result = parser.Parse("\"hello\"");
            // Console.WriteLine($"Parsed: {result}");
        }
    }
}
