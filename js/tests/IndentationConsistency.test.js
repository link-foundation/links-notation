import { Parser } from '../src/Parser.js';

describe('Indentation Consistency Tests (Issue #135)', () => {
  let parser;

  beforeEach(() => {
    parser = new Parser();
  });

  test('leading spaces vs no leading spaces should produce same result', () => {
    // Example with 2 leading spaces (from issue #135)
    const withLeading = `  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
  TELEGRAM_ALLOWED_CHATS:
    -1002975819706
    -1002861722681
  TELEGRAM_HIVE_OVERRIDES:
    --all-issues
    --once
  TELEGRAM_BOT_VERBOSE: true`;

    // Example without leading spaces (from issue #135)
    const withoutLeading = `TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
TELEGRAM_ALLOWED_CHATS:
  -1002975819706
  -1002861722681
TELEGRAM_HIVE_OVERRIDES:
  --all-issues
  --once
TELEGRAM_BOT_VERBOSE: true`;

    const resultWith = parser.parse(withLeading);
    const resultWithout = parser.parse(withoutLeading);

    // Both should produce the same number of links
    expect(resultWith.length).toBe(resultWithout.length);

    // Both should have the same structure when formatted
    for (let i = 0; i < resultWith.length; i++) {
      expect(resultWith[i].toString()).toBe(resultWithout[i].toString());
    }
  });

  test('simple two vs four spaces indentation', () => {
    // Simple example with 2 spaces
    const twoSpaces = `parent:
  child1
  child2`;

    // Simple example with 4 spaces
    const fourSpaces = `parent:
    child1
    child2`;

    const resultTwo = parser.parse(twoSpaces);
    const resultFour = parser.parse(fourSpaces);

    expect(resultTwo.length).toBe(resultFour.length);
    expect(resultTwo[0].toString()).toBe(resultFour[0].toString());
  });

  test('three level nesting with different indentation', () => {
    // Three levels with 2 spaces
    const twoSpaces = `level1:
  level2:
    level3a
    level3b
  level2b`;

    // Three levels with 4 spaces
    const fourSpaces = `level1:
    level2:
        level3a
        level3b
    level2b`;

    const resultTwo = parser.parse(twoSpaces);
    const resultFour = parser.parse(fourSpaces);

    expect(resultTwo.length).toBe(resultFour.length);

    for (let i = 0; i < resultTwo.length; i++) {
      expect(resultTwo[i].toString()).toBe(resultFour[i].toString());
    }
  });
});
