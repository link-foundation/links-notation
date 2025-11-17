# Git Hooks

This directory contains git hooks for the Links Notation project to ensure code quality and consistency.

## Installation

To install the git hooks, run:

```bash
bash .githooks/install-hooks.sh
```

Or configure git to use this directory for hooks:

```bash
git config core.hooksPath .githooks
```

## Available Hooks

### pre-commit

Automatically regenerates `TEST_CASE_COMPARISON.md` when test files are modified.

**Triggers when:**
- Any Python test file (`*/tests/*.py`) is staged
- Any JavaScript test file (`*/tests/*.js`) is staged
- Any Rust test file (`*/tests/*.rs`) is staged
- Any C# test file (`*/tests/*.cs`) is staged

**What it does:**
1. Detects that test files have been modified
2. Runs `node scripts/create-test-case-comparison.mjs` to regenerate the comparison document
3. If `TEST_CASE_COMPARISON.md` changed, automatically stages it for the commit
4. Fails the commit if regeneration fails (with instructions to fix)

**Why this is important:**
The test comparison document provides a comprehensive overview of test parity across all language implementations. Keeping it up-to-date ensures developers can always see the current state of test coverage.

## Bypassing Hooks

If you need to bypass the hooks for a specific commit (not recommended), use:

```bash
git commit --no-verify
```

## Troubleshooting

### Hook not running

Make sure the hooks are executable:

```bash
chmod +x .githooks/*
```

### Regeneration fails

If the comparison script fails:

1. Check that Node.js is installed
2. Run the script manually: `node scripts/create-test-case-comparison.mjs`
3. Review any error messages
4. Fix any issues and try committing again

## Adding New Hooks

To add a new hook:

1. Create the hook file in `.githooks/`
2. Make it executable: `chmod +x .githooks/your-hook`
3. Update this README to document it
4. Run the install script or notify team members to reinstall hooks
