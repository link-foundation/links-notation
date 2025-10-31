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

            var resultWith = new Parser().Parse(withLeading);
            var resultWithout = new Parser().Parse(withoutLeading);

            // Compare the entire formatted output (complete round trip test)
            Assert.Equal(resultWithout.Format(), resultWith.Format());
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

            var resultTwo = new Parser().Parse(twoSpaces);
            var resultFour = new Parser().Parse(fourSpaces);

            // Compare the entire formatted output (complete round trip test)
            Assert.Equal(resultFour.Format(), resultTwo.Format());
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

            var resultTwo = new Parser().Parse(twoSpaces);
            var resultFour = new Parser().Parse(fourSpaces);

            // Compare the entire formatted output (complete round trip test)
            Assert.Equal(resultFour.Format(), resultTwo.Format());
        }
    }
}
