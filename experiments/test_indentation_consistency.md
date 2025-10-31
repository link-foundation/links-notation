# Indentation Consistency Test

This document contains test cases for issue #135: Any indentation as long as it is the same on single level should not change parser semantics.

## Test Case 1: Two spaces vs Four spaces

Both of these examples should parse to exactly the same result:

### Example with 2 spaces per level:
```
  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
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
  TELEGRAM_BOT_VERBOSE: true
```

### Example with 4 spaces per level:
```
TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
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
TELEGRAM_BOT_VERBOSE: true
```

## Expected Behavior

The parser should only care about:
1. **Relative indentation** - what matters is whether a line is indented more or less than its parent
2. **Consistency** - all children at the same level should have the same indentation

The parser should NOT care about:
1. **Absolute indentation amount** - whether it's 2 spaces, 4 spaces, 8 spaces, or even tabs
