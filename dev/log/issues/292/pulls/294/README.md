# Investigation log — issue #292 / pull request #294

Evidence and analysis collected while working on
[link-foundation/links-notation#292](https://github.com/link-foundation/links-notation/issues/292).

`dev/log/` is gitignored (`.gitignore` line 25, `[Ll]og/`), so only the written analysis is
committed, with `git add -f`.

## Reading order

1. [`analysis/REQUIREMENTS.md`](analysis/REQUIREMENTS.md) — the six requirements the issue states,
   each mapped to what was done, and the one that cannot be finished here.
2. [`analysis/VERIFICATION.md`](analysis/VERIFICATION.md) — what was actually run, what each major
   bump forced, and the negative test of the new consistency check.

## Supporting evidence

| File | What it is |
| --- | --- |
| `analysis/registry-latest.txt` | what each registry currently serves for every dependency this repository declares |
| `analysis/maven-plugin-versions.txt` | the last three published versions of each Maven plugin, showing which newest artefacts are betas |
| `analysis/release-audit-after-bump.txt` | `scripts/release-audit.mjs` with 0.16.0 declared and 0.15.0 everywhere published |
| `issue/issue-292.json`, `issue/issue-292-comments.json` | the issue as read (the comments array is empty) |
| `pr/pr-294.json` | the pull request as it stood before the description was rewritten |

The registry snapshot is reproducible: `node experiments/issue-292/registry-latest.mjs`.
