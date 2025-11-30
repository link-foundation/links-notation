using System;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class MultiQuoteParserTests
    {
        // Helper to extract single reference ID
        private static string? GetSingleRefId(System.Collections.Generic.IList<Link<string>> result)
        {
            if (result.Count == 1 && result[0].Id == null && result[0].Values?.Count == 1)
            {
                return result[0].Values[0].Id;
            }
            return result.Count == 1 ? result[0].Id : null;
        }

        // ============================================================================
        // Backtick Quote Tests (Single Backtick)
        // ============================================================================

        [Fact]
        public static void TestBacktickQuotedReference()
        {
            var parser = new Parser();
            var result = parser.Parse("`backtick quoted`");
            Assert.Equal("backtick quoted", GetSingleRefId(result));
        }

        [Fact]
        public static void TestBacktickQuotedWithSpaces()
        {
            var parser = new Parser();
            var result = parser.Parse("`text with spaces`");
            Assert.Equal("text with spaces", GetSingleRefId(result));
        }

        [Fact]
        public static void TestBacktickQuotedMultiline()
        {
            var parser = new Parser();
            var result = parser.Parse("(`line1\nline2`)");
            Assert.Single(result);
            Assert.NotNull(result[0].Values);
            Assert.Single(result[0].Values);
            Assert.Equal("line1\nline2", result[0].Values![0].Id);
        }

        [Fact]
        public static void TestBacktickQuotedWithEscapedBacktick()
        {
            var parser = new Parser();
            var result = parser.Parse("`text with `` escaped backtick`");
            Assert.Equal("text with ` escaped backtick", GetSingleRefId(result));
        }

        // ============================================================================
        // Single Quote Tests (with escaping)
        // ============================================================================

        [Fact]
        public static void TestSingleQuoteWithEscapedSingleQuote()
        {
            var parser = new Parser();
            var result = parser.Parse("'text with '' escaped quote'");
            Assert.Equal("text with ' escaped quote", GetSingleRefId(result));
        }

        // ============================================================================
        // Double Quote Tests (with escaping)
        // ============================================================================

        [Fact]
        public static void TestDoubleQuoteWithEscapedDoubleQuote()
        {
            var parser = new Parser();
            var result = parser.Parse("\"text with \"\" escaped quote\"");
            Assert.Equal("text with \" escaped quote", GetSingleRefId(result));
        }

        // ============================================================================
        // Double Quotes (2 quote chars) Tests
        // ============================================================================

        [Fact]
        public static void TestDoubleDoubleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"double double quotes\"\"");
            Assert.Equal("double double quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleDoubleQuotesWithSingleQuoteInside()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"text with \" inside\"\"");
            Assert.Equal("text with \" inside", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleDoubleQuotesWithEscape()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"text with \"\"\"\" escaped double\"\"");
            Assert.Equal("text with \"\" escaped double", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleSingleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("''double single quotes''");
            Assert.Equal("double single quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleSingleQuotesWithSingleQuoteInside()
        {
            var parser = new Parser();
            var result = parser.Parse("''text with ' inside''");
            Assert.Equal("text with ' inside", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleSingleQuotesWithEscape()
        {
            var parser = new Parser();
            var result = parser.Parse("''text with '''' escaped single''");
            Assert.Equal("text with '' escaped single", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleBacktickQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("``double backtick quotes``");
            Assert.Equal("double backtick quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleBacktickQuotesWithBacktickInside()
        {
            var parser = new Parser();
            var result = parser.Parse("``text with ` inside``");
            Assert.Equal("text with ` inside", GetSingleRefId(result));
        }

        [Fact]
        public static void TestDoubleBacktickQuotesWithEscape()
        {
            var parser = new Parser();
            var result = parser.Parse("``text with ```` escaped backtick``");
            Assert.Equal("text with `` escaped backtick", GetSingleRefId(result));
        }

        // ============================================================================
        // Triple Quotes (3 quote chars) Tests
        // ============================================================================

        [Fact]
        public static void TestTripleDoubleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"\"triple double quotes\"\"\"");
            Assert.Equal("triple double quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestTripleDoubleQuotesWithDoubleQuoteInside()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"\"text with \"\" inside\"\"\"");
            Assert.Equal("text with \"\" inside", GetSingleRefId(result));
        }

        [Fact]
        public static void TestTripleDoubleQuotesWithEscape()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"\"text with \"\"\"\"\"\" escaped triple\"\"\"");
            Assert.Equal("text with \"\"\" escaped triple", GetSingleRefId(result));
        }

        [Fact]
        public static void TestTripleSingleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("'''triple single quotes'''");
            Assert.Equal("triple single quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestTripleBacktickQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("```triple backtick quotes```");
            Assert.Equal("triple backtick quotes", GetSingleRefId(result));
        }

        // ============================================================================
        // Quadruple Quotes (4 quote chars) Tests
        // ============================================================================

        [Fact]
        public static void TestQuadrupleDoubleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"\"\"quadruple double quotes\"\"\"\"");
            Assert.Equal("quadruple double quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestQuadrupleSingleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("''''quadruple single quotes''''");
            Assert.Equal("quadruple single quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestQuadrupleBacktickQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("````quadruple backtick quotes````");
            Assert.Equal("quadruple backtick quotes", GetSingleRefId(result));
        }

        // ============================================================================
        // Quintuple Quotes (5 quote chars) Tests
        // ============================================================================

        [Fact]
        public static void TestQuintupleDoubleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"\"\"\"quintuple double quotes\"\"\"\"\"");
            Assert.Equal("quintuple double quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestQuintupleSingleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("'''''quintuple single quotes'''''");
            Assert.Equal("quintuple single quotes", GetSingleRefId(result));
        }

        [Fact]
        public static void TestQuintupleBacktickQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("`````quintuple backtick quotes`````");
            Assert.Equal("quintuple backtick quotes", GetSingleRefId(result));
        }

        // ============================================================================
        // Complex Scenarios Tests
        // ============================================================================

        [Fact]
        public static void TestMixedQuotesInLink()
        {
            var parser = new Parser();
            var result = parser.Parse("(\"double\" 'single' `backtick`)");
            Assert.Single(result);
            Assert.NotNull(result[0].Values);
            Assert.Equal(3, result[0].Values!.Count);
            Assert.Equal("double", result[0].Values[0].Id);
            Assert.Equal("single", result[0].Values[1].Id);
            Assert.Equal("backtick", result[0].Values[2].Id);
        }

        [Fact]
        public static void TestBacktickAsIdInLink()
        {
            var parser = new Parser();
            var result = parser.Parse("(`myId`: value1 value2)");
            Assert.Single(result);
            Assert.Equal("myId", result[0].Id);
            Assert.NotNull(result[0].Values);
            Assert.Equal(2, result[0].Values!.Count);
        }

        [Fact]
        public static void TestCodeBlockLikeContent()
        {
            var parser = new Parser();
            var result = parser.Parse("```const x = 1;```");
            Assert.Equal("const x = 1;", GetSingleRefId(result));
        }

        [Fact]
        public static void TestNestedQuotesInMarkdown()
        {
            var parser = new Parser();
            var result = parser.Parse("``Use `code` in markdown``");
            Assert.Equal("Use `code` in markdown", GetSingleRefId(result));
        }

        [Fact]
        public static void TestJsonStringWithQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("\"\"{ \"key\": \"value\"}\"\"");
            Assert.Equal("{ \"key\": \"value\"}", GetSingleRefId(result));
        }

        // ============================================================================
        // Edge Cases
        // ============================================================================

        [Fact]
        public static void TestWhitespacePreservedInQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("\"  spaces  \"");
            Assert.Equal("  spaces  ", GetSingleRefId(result));
        }

        [Fact]
        public static void TestMultilineInDoubleDoubleQuotes()
        {
            var parser = new Parser();
            var result = parser.Parse("(\"\"line1\nline2\"\")");
            Assert.Single(result);
            Assert.NotNull(result[0].Values);
            Assert.Single(result[0].Values);
            Assert.Equal("line1\nline2", result[0].Values![0].Id);
        }
    }
}
