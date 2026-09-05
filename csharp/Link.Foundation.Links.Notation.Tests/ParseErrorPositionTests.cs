using System;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// A parse error has to say where the document stopped making sense.
    /// </summary>
    /// <remarks>
    /// The positions asserted here are the ones the JavaScript and Rust ports report for
    /// the same input, so the implementations can be held to the same contract
    /// (https://github.com/link-foundation/links-notation/issues/302).
    /// </remarks>
    public static class ParseErrorPositionTests
    {
        private static ParseException SyntaxError(string document) =>
            Assert.Throws<ParseException>(() => new Parser().Parse(document));

        [Fact]
        public static void ReportsTheLineAndColumnOfTheDefectTest()
        {
            // The example from the issue: the defect is the second colon on line 2,
            // and the two lines after it are fine.
            var error = SyntaxError("ci_gate x\nstage: rust: nextest\nnext stage\n  clippy");

            Assert.Equal(2, error.Line);
            Assert.Equal(12, error.Column);
            Assert.Equal(':', error.Found);
        }

        [Fact]
        public static void OffsetAgreesWithTheOtherImplementationsTest()
        {
            // JavaScript and Rust report offset 21, line 2, column 12 for this document.
            var error = SyntaxError("ci_gate x\nstage: rust: nextest\n");

            Assert.Equal(21, error.Offset);
            Assert.Equal(2, error.Line);
            Assert.Equal(12, error.Column);
        }

        [Fact]
        public static void ReportsTheLineALateDefectIsOnTest()
        {
            var error = SyntaxError("a\nb\nc\nd\ne: f: g\nh\n");

            Assert.Equal(5, error.Line);
            Assert.Equal(5, error.Column);
            Assert.Equal("e: f: g", error.LineText);
        }

        [Fact]
        public static void ReportsTheEndOfTheDocumentWhenAGroupIsNeverClosedTest()
        {
            var error = SyntaxError("a (b\n");

            Assert.Equal(5, error.Offset);
            Assert.Equal(2, error.Line);
            Assert.Equal(1, error.Column);
            Assert.Null(error.Found);
            Assert.Contains("end of input", error.Message);
        }

        [Fact]
        public static void ReportsAnUnmatchedClosingParenthesisTest()
        {
            var error = SyntaxError("a b)\n");

            Assert.Equal(3, error.Offset);
            Assert.Equal(1, error.Line);
            Assert.Equal(4, error.Column);
            Assert.Equal(')', error.Found);
        }

        [Fact]
        public static void MessagePointsACaretAtTheOffendingCharacterTest()
        {
            var error = SyntaxError("ci_gate x\nstage: rust: nextest\n");

            Assert.Equal("line 2, column 12: unexpected \":\"", error.Summary);
            Assert.Equal("2 | stage: rust: nextest\n  |            ^", error.Snippet);
            Assert.Equal(
                "Syntax error at line 2, column 12: unexpected \":\"\n2 | stage: rust: nextest\n  |            ^",
                error.Message);
        }

        [Fact]
        public static void MessageQuotesOneLineRatherThanTheRestOfTheDocumentTest()
        {
            var document = "ci_gate x\nstage: rust: nextest\n"
                + string.Concat(System.Linq.Enumerable.Repeat("trailing line\n", 500));

            var error = SyntaxError(document);

            Assert.Contains("line 2, column 12", error.Message);
            Assert.DoesNotContain("trailing line", error.Message);
            Assert.True(error.Message.Length < 200, $"message is {error.Message.Length} characters");
        }

        [Fact]
        public static void MessageOfALongLineStaysAMessageTest()
        {
            var document = new string('a', 400) + ": " + new string('b', 400) + ": c";

            var error = SyntaxError(document);

            Assert.Equal(1, error.Line);
            Assert.Equal(803, error.Column);
            Assert.Contains("...", error.Message);
            Assert.True(error.Message.Length < 300, $"message is {error.Message.Length} characters");
        }

        [Fact]
        public static void KeepsCatchingCodeThatExpectsAFormatExceptionWorkingTest()
        {
            // The generated parser used to raise a bare FormatException; code that catches
            // it keeps working, and now reads a position off the exception it catches.
            var error = Assert.Throws<ParseException>(() => new Parser().Parse("a: b: c"));

            Assert.IsAssignableFrom<FormatException>(error);
            Assert.Equal(4, error.Offset);
        }

        [Fact]
        public static void DoesNotMentionTheGrammarInternalsTest()
        {
            var error = SyntaxError("a: b: c");

            Assert.DoesNotContain("Failed to parse", error.Message);
            Assert.DoesNotContain("document", error.Message);
        }

        [Fact]
        public static void ADocumentThatParsesReportsNothingTest()
        {
            var links = new Parser().Parse("a: b\n  c: d\n");

            Assert.Equal(2, links.Count);
        }
    }
}
