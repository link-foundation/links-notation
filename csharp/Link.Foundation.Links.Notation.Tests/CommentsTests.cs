using System.Linq;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Conformance tests for line comments.
    ///
    /// https://github.com/link-foundation/links-notation/issues/301
    ///
    /// <c>#</c> starts a comment that runs to the end of the line, unless it sits
    /// inside a token or inside a delimited reference. Parsers read comments by
    /// default and can be told to treat <c>#</c> as an ordinary character again.
    /// The table below is shared with the Rust, JavaScript, Python, Go, Java and
    /// PHP suites, so a document written by one implementation reads the same in
    /// all of them.
    /// </summary>
    public static class CommentsTests
    {
        /// <summary>
        /// Renders a parsed node unambiguously: every reference is wrapped in
        /// angle brackets.
        /// </summary>
        private static string Render(Link<string> node)
        {
            if (node.Values == null || node.Values.Count == 0)
            {
                return "<" + (node.Id ?? "") + ">";
            }
            var head = node.Id == null ? "" : "<" + node.Id + ">: ";
            return "(" + head + string.Join(" ", node.Values.Select(Render)) + ")";
        }

        private static string RenderedWith(Parser parser, string source) =>
            string.Join("\n", parser.Parse(source).Select(Render));

        private static string Rendered(string source) => RenderedWith(new Parser(), source);

        private static void AssertParsesAs(string source, string expected)
        {
            Assert.Equal(expected, Rendered(source));
        }

        [Fact]
        public static void ALineThatStartsWithAHashIsAComment()
        {
            AssertParsesAs("# a b\n", "");
        }

        [Fact]
        public static void ACommentMayHoldAColon()
        {
            // The document from #301: prose with a colon used to be rejected.
            AssertParsesAs("# a: b\n", "");
        }

        [Fact]
        public static void ACommentMayHoldAnythingAtAll()
        {
            AssertParsesAs("# ) : ( \" ' ` #\n", "");
        }

        [Fact]
        public static void ACommentEndsAtTheEndOfItsLine()
        {
            AssertParsesAs("# note\na: b\n", "(<a>: <b>)");
        }

        [Fact]
        public static void ACommentMayFollowALink()
        {
            AssertParsesAs("a: b # why\n", "(<a>: <b>)");
        }

        [Fact]
        public static void ACommentMayFollowAGroup()
        {
            AssertParsesAs("(a b) # why\n", "(<a> <b>)");
        }

        [Fact]
        public static void ACommentNeedsNoClosingNewline()
        {
            AssertParsesAs("a: b # why", "(<a>: <b>)");
        }

        [Fact]
        public static void ACommentLineInsideAnIndentedBlockIsSkipped()
        {
            Assert.Equal(
                Rendered("parent\n  child\n"),
                Rendered("parent\n  # what the child is for\n  child\n"));
        }

        [Fact]
        public static void ACommentLineInsideAGroupIsSkipped()
        {
            Assert.Equal(
                Rendered("(\n  a\n  b\n)\n"),
                Rendered("(\n  a\n  # why\n  b\n)\n"));
        }

        [Fact]
        public static void ALineOfSpacesSeparatesLinksTheWayAnEmptyLineDoes()
        {
            // Blanking a comment leaves a line of spaces behind, so such a line
            // has to read the way an empty line does.
            Assert.Equal(Rendered("a\n\nb\n"), Rendered("a\n   \nb\n"));
        }

        [Fact]
        public static void ADocumentOfCommentsAloneHoldsNoLinks()
        {
            AssertParsesAs("# one\n# two\n", "");
        }

        [Fact]
        public static void AHashInsideATokenIsAnOrdinaryCharacter()
        {
            AssertParsesAs("issue#1047\n", "(<issue#1047>)");
        }

        [Fact]
        public static void AHashThatOpensATokenIsAnOrdinaryCharacter()
        {
            AssertParsesAs("a: b#c\n", "(<a>: <b#c>)");
        }

        [Fact]
        public static void AHashInsideADelimitedReferenceIsContent()
        {
            AssertParsesAs("\"# not a comment\" a\n", "(<# not a comment> <a>)");
        }

        [Fact]
        public static void ACommentMayFollowADelimitedReference()
        {
            AssertParsesAs("\"a\" # why\n", "(<a>)");
        }

        [Fact]
        public static void AHashInsideAMultiLineDelimitedReferenceIsContent()
        {
            AssertParsesAs("\"a # b\nc\" d\n", "(<a # b\nc> <d>)");
        }

        [Fact]
        public static void CommentsAreOnByDefault()
        {
            Assert.True(new Parser().Comments);
            AssertParsesAs("# a b\n", "");
        }

        [Fact]
        public static void AParserWithoutCommentsKeepsTheHash()
        {
            Assert.Equal("(<#> <a> <b>)", RenderedWith(new Parser(comments: false), "# a b\n"));
        }

        [Fact]
        public static void BlankingACommentKeepsTheLengthOfTheDocument()
        {
            Assert.Equal("a: b      \n", Comments.StripComments("a: b # why\n"));
            Assert.Equal("\"# kept\"\n", Comments.StripComments("\"# kept\"\n"));
            Assert.Equal("issue#1047\n", Comments.StripComments("issue#1047\n"));
            Assert.Equal("     \n", Comments.StripComments("# why\n"));
        }

        [Fact]
        public static void ACommentDoesNotMoveThePositionALaterErrorIsReportedAt()
        {
            var error = Assert.Throws<ParseException>(
                () => new Parser().Parse("# a comment\nstage: rust: nextest\n"));

            Assert.Equal(2, error.Line);
            Assert.Equal(12, error.Column);
        }

        [Fact]
        public static void AReferenceThatBeginsWithAHashIsWrittenQuoted()
        {
            // Without the quotes the document would read as `a` followed by a comment.
            var document = new Link<string>(new Link<string>("a"), new Link<string>("#tag")).ToString();

            Assert.Equal("(a '#tag')", document);
            Assert.Equal("(<a> <#tag>)", Rendered(document));
        }

        [Fact]
        public static void AHashThatCannotOpenACommentIsLeftUnquoted()
        {
            Assert.Equal("issue#1047", Link<string>.EscapeReference("issue#1047"));
            Assert.Equal("'#'", Link<string>.EscapeReference("#"));
            Assert.Equal("'#ff0000'", Link<string>.EscapeReference("#ff0000"));
        }

        // Issue #377: the comment reader and the grammar must agree on where every
        // delimited reference starts and how far it reaches, or a comment is blanked
        // inside what the grammar then reads as a reference.

        [Fact]
        public static void AHashInsideAReferenceThatFollowsAGroupIsContent()
        {
            AssertParsesAs("(a)\" #b\"\n", "((<a>) < #b>)");
        }

        [Fact]
        public static void AHashInsideAReferenceThatFollowsAnotherReferenceIsContent()
        {
            AssertParsesAs("\"x\"' #y'\n", "(<x> < #y>)");
            AssertParsesAs("```q```\"\" #c\n\"\"\"\n", "(<q> < #c\n\">)");
        }

        [Fact]
        public static void AHashInsideAReferenceThatFollowsALiteralIsContent()
        {
            AssertParsesAs("~1{62}\" #b\"\n", "(<b> < #b>)");
        }

        [Fact]
        public static void AReferenceIsReadInTheDocumentAsWrittenCommentsIncluded()
        {
            // The body of the first `""` straddles a parenthesis, so it is the empty
            // reference and the `#` after it opens a comment. Blanking that comment must
            // not turn the `""` into a reference that holds the blanked text.
            AssertParsesAs("\"\" a #)b\n\"\"\n", "(<> <a>)\n(<>)");
        }

        [Fact]
        public static void TheCommentReaderSkipsTheReferencesTheGrammarReads()
        {
            Assert.Equal("(a)\" #b\"\n", Comments.StripComments("(a)\" #b\"\n"));
            Assert.Equal("\"x\"' #y'\n", Comments.StripComments("\"x\"' #y'\n"));
            Assert.Equal("~1{62}\" #b\"\n", Comments.StripComments("~1{62}\" #b\"\n"));
            Assert.Equal("a\"b    \n", Comments.StripComments("a\"b #c\"\n"));
        }
    }
}
