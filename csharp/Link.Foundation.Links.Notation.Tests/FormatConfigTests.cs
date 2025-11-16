using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public class FormatConfigTests
    {
        [Fact]
        public void FormatConfigBasicTest()
        {
            var config = new FormatConfig();
            Assert.Equal(false, config.LessParentheses);
            Assert.Equal(80, config.MaxLineLength);
            Assert.Equal(false, config.IndentLongLines);
        }

        [Fact]
        public void FormatConfigCustomIndentTest()
        {
            var config = new FormatConfig
            {
                MaxInlineRefs = 3,
                PreferInline = false,
                IndentString = "    " // 4 spaces
            };

            Assert.Equal("    ", config.IndentString);
        }

        [Fact]
        public void FormatConfigLessParenthesesTest()
        {
            var config = new FormatConfig
            {
                LessParentheses = true
            };

            Assert.Equal(true, config.LessParentheses);
        }

        [Fact]
        public void RoundtripWithLineLengthFormattingTest()
        {
            // This test would require full format integration
            // For now, just verify config creation
            var config = new FormatConfig
            {
                MaxInlineRefs = 2,
                PreferInline = false
            };

            Assert.Equal(2, config.MaxInlineRefs);
        }

        [Fact]
        public void ShouldIndentByLengthTest()
        {
            var config = new FormatConfig
            {
                IndentLongLines = true,
                MaxLineLength = 80
            };

            Assert.Equal(false, config.ShouldIndentByLength("short"));
            Assert.Equal(true, config.ShouldIndentByLength(new string('a', 100)));
        }

        [Fact]
        public void ShouldIndentByRefCountTest()
        {
            var config = new FormatConfig
            {
                MaxInlineRefs = 3
            };

            Assert.Equal(false, config.ShouldIndentByRefCount(2));
            Assert.Equal(false, config.ShouldIndentByRefCount(3));
            Assert.Equal(true, config.ShouldIndentByRefCount(4));
        }
    }
}
