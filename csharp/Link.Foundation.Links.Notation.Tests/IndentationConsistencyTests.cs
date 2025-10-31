using Xunit;
using System.Collections.Generic;

namespace Link.Foundation.Links.Notation.Tests
{
    public class IndentationConsistencyTests
    {
        [Fact]
        public void LeadingSpacesVsNoLeadingSpacesShouldProduceSameResult()
        {
            // Example with 2 leading spaces (from issue #135)
            var withLeading = @"  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
  TELEGRAM_ALLOWED_CHATS:
    -1002975819706
    -1002861722681
  TELEGRAM_HIVE_OVERRIDES:
    --all-issues
    --once
  TELEGRAM_BOT_VERBOSE: true";

            // Example without leading spaces (from issue #135)
            var withoutLeading = @"TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
TELEGRAM_ALLOWED_CHATS:
  -1002975819706
  -1002861722681
TELEGRAM_HIVE_OVERRIDES:
  --all-issues
  --once
TELEGRAM_BOT_VERBOSE: true";

            var resultWith = Parser.Parse(withLeading);
            var resultWithout = Parser.Parse(withoutLeading);

            // Both should produce the same number of links
            Assert.Equal(resultWithout.Count, resultWith.Count);

            // Both should have the same structure when formatted
            for (int i = 0; i < resultWith.Count; i++)
            {
                Assert.Equal(resultWithout[i].ToString(), resultWith[i].ToString());
            }
        }

        [Fact]
        public void SimpleTwoVsFourSpacesIndentation()
        {
            // Simple example with 2 spaces
            var twoSpaces = @"parent:
  child1
  child2";

            // Simple example with 4 spaces
            var fourSpaces = @"parent:
    child1
    child2";

            var resultTwo = Parser.Parse(twoSpaces);
            var resultFour = Parser.Parse(fourSpaces);

            Assert.Equal(resultFour.Count, resultTwo.Count);
            Assert.Equal(resultFour[0].ToString(), resultTwo[0].ToString());
        }

        [Fact]
        public void ThreeLevelNestingWithDifferentIndentation()
        {
            // Three levels with 2 spaces
            var twoSpaces = @"level1:
  level2:
    level3a
    level3b
  level2b";

            // Three levels with 4 spaces
            var fourSpaces = @"level1:
    level2:
        level3a
        level3b
    level2b";

            var resultTwo = Parser.Parse(twoSpaces);
            var resultFour = Parser.Parse(fourSpaces);

            Assert.Equal(resultFour.Count, resultTwo.Count);

            for (int i = 0; i < resultTwo.Count; i++)
            {
                Assert.Equal(resultFour[i].ToString(), resultTwo[i].ToString());
            }
        }
    }
}
