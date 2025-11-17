using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public class FormatConfigTests
    {
        [Fact]
        public void FormatConfigBasicTest()
        {
            var config = new FormatConfig();
            Assert.False(config.LessParentheses);
            Assert.Equal(80, config.MaxLineLength);
            Assert.False(config.IndentLongLines);
        }

        [Fact]
        public void FormatWithLineLengthLimitTest()
        {
            // Create a config with line length limit
            // The line would be 32+ chars, so use threshold of 30
            var config = new FormatConfig
            {
                IndentLongLines = true,
                MaxLineLength = 30,
                PreferInline = false
            };

            // Verify config is set correctly
            Assert.True(config.IndentLongLines);
            Assert.Equal(30, config.MaxLineLength);
            // Note: Full formatting integration would test actual output here
        }

        [Fact]
        public void FormatWithMaxInlineRefsTest()
        {
            // Create a config with MaxInlineRefs=3 (should trigger indentation with 4 refs)
            var config = new FormatConfig
            {
                MaxInlineRefs = 3,
                PreferInline = false
            };

            // Verify config is set correctly
            Assert.Equal(3, config.MaxInlineRefs);
            Assert.True(config.ShouldIndentByRefCount(4));
            // Note: Full formatting integration would test actual output here
        }

        [Fact]
        public void FormatWithConsecutiveGroupingTest()
        {
            // Create a config with consecutive grouping enabled
            var config = new FormatConfig
            {
                GroupConsecutive = true
            };

            // Verify config is set correctly
            Assert.True(config.GroupConsecutive);
            // Note: Full formatting integration would test grouping behavior here
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

            Assert.True(config.LessParentheses);
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

            Assert.False(config.ShouldIndentByLength("short"));
            Assert.True(config.ShouldIndentByLength(new string('a', 100)));
        }

        [Fact]
        public void ShouldIndentByRefCountTest()
        {
            var config = new FormatConfig
            {
                MaxInlineRefs = 3
            };

            Assert.False(config.ShouldIndentByRefCount(2));
            Assert.False(config.ShouldIndentByRefCount(3));
            Assert.True(config.ShouldIndentByRefCount(4));
        }
    }
}
