# pre-commit/pre-commit-hooks v6.0.0

Source: https://github.com/pre-commit/pre-commit-hooks/releases/tag/v6.0.0

## Fixes
- `check-shebang-scripts-are-executable`: improve error message.
    - #1115 PR by @homebysix.

## Migrating
- now requires python >= 3.9.
    - #1098 PR by @asottile.
- `file-contents-sorter`: disallow `--unique` and `--ignore-case` at the same
  time.
    - #1095 PR by @nemacysts.
    - #794 issue by @teksturi.
- Removed `check-byte-order-marker` and `fix-encoding-pragma`.
    - `check-byte-order-marker`: migrate to `fix-byte-order-marker`.
    - `fix-encoding-pragma`: migrate to `pyupgrade`.
    - #1034 PR by @mxr.
    - #1032 issue by @mxr.
    - #522 PR by @jgowdy.


