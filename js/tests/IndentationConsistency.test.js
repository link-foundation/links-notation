import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

describe('Indentation Consistency Tests (Issue #135)', () => {
  let parser;

  beforeEach(() => {
    parser = new Parser();
  });

  test('Leading spaces vs no leading spaces', () => {
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

    // Compare the entire formatted output (complete round trip test)
    expect(formatLinks(resultWith)).toBe(formatLinks(resultWithout));
  });

  test('two spaces vs four spaces indentation', () => {
    // Example with 2 spaces per level
    const twoSpaces = `TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
TELEGRAM_ALLOWED_CHATS:
  -1002975819706
  -1002861722681
TELEGRAM_HIVE_OVERRIDES:
  --all-issues
  --once
  --auto-fork
  --skip-issues-with-prs
  --attach-logs
  --verbose
  --no-tool-check
TELEGRAM_SOLVE_OVERRIDES:
  --auto-fork
  --auto-continue
  --attach-logs
  --verbose
  --no-tool-check
TELEGRAM_BOT_VERBOSE: true`;

    // Example with 4 spaces per level
    const fourSpaces = `TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
TELEGRAM_ALLOWED_CHATS:
    -1002975819706
    -1002861722681
TELEGRAM_HIVE_OVERRIDES:
    --all-issues
    --once
    --auto-fork
    --skip-issues-with-prs
    --attach-logs
    --verbose
    --no-tool-check
TELEGRAM_SOLVE_OVERRIDES:
    --auto-fork
    --auto-continue
    --attach-logs
    --verbose
    --no-tool-check
TELEGRAM_BOT_VERBOSE: true`;

    const resultTwo = parser.parse(twoSpaces);
    const resultFour = parser.parse(fourSpaces);

    // Compare the entire formatted output (complete round trip test)
    expect(formatLinks(resultTwo)).toBe(formatLinks(resultFour));
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

    // Compare the entire formatted output (complete round trip test)
    expect(formatLinks(resultTwo)).toBe(formatLinks(resultFour));
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

    // Compare the entire formatted output (complete round trip test)
    expect(formatLinks(resultTwo)).toBe(formatLinks(resultFour));
  });
});
