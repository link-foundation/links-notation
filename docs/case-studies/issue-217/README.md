# Case Study: Issue #217 - Broken Links

**Issue**: [#217 - Broken links](https://github.com/link-foundation/links-notation/issues/217)
**Author**: konard
**Date Reported**: 2026-02-27
**Status**: Root cause identified, full CI/CD fix implemented

## Summary

Two broken links were reported in the project documentation:

1. `https://github.com/link-foundation/links-notation/blob/main/FEATURE_COMPARISON.md`
   - **Status**: File does not exist in the repository
2. `https://link-foundation.github.io/links-notation/csharp/Link.Foundation.Links.Notation.pdf`
   - **Status**: File does not exist on GitHub Pages

Both links are present in `README.md`, `README.ru.md`, and `docs/website/index.html`.

---

## Broken Link 1: FEATURE_COMPARISON.md

### Current State

The file `FEATURE_COMPARISON.md` does not exist in the repository. References remain in:

- `README.ru.md`: `- [Сравнение возможностей](FEATURE_COMPARISON.md) - Анализ возможностей LINO`

Note: `README.md` does NOT reference `FEATURE_COMPARISON.md` currently — that reference was replaced
in commit `1ee4eca` with `TEST_CASE_COMPARISON.md`. Only `README.ru.md` still has the dead link.

### Root Cause

**Primary Cause**: Accidental omission when synchronizing the Russian README during file deletion.

**Timeline of Events**:

| Date | Commit | Action |
|------|--------|--------|
| 2025-09-10 | `a3ea131` (konard) | `FEATURE_COMPARISON.md` created (225 lines, YAML/XML/JSON/LINO comparison) |
| 2025-09-28 | `9f555b9` (konard) | Minor whitespace fixes to `FEATURE_COMPARISON.md` |
| 2025-10-12 | `b8bfb4b` (konard) | Updated link in `FEATURE_COMPARISON.md` from `linksplatform` to `link-foundation` |
| 2025-11-16 | `1ee4eca` (Claude) | **File deleted** — "Remove redundant analysis files" |

The deletion commit (`1ee4eca`) removed `FEATURE_COMPARISON.md` and updated `README.md` to point
to `TEST_CASE_COMPARISON.md` instead. However, the corresponding update to `README.ru.md` was
missed — `README.ru.md` still points to the deleted `FEATURE_COMPARISON.md`.

### File Content (Last Known State Before Deletion)

The file contained a feature comparison of data serialization formats: YAML vs XML vs JSON vs LINO,
focused on cyclic reference support. It was 225 lines and addressed
[issue #55](https://github.com/link-foundation/links-notation/issues/55).

The content is preserved in git history at commit `b8bfb4b:FEATURE_COMPARISON.md`.

### Fix

Remove the dead link from `README.ru.md`. Since `README.md` (English version) was correctly updated
to point to `TEST_CASE_COMPARISON.md`, the Russian README should be updated consistently.

---

## Broken Link 2: Link.Foundation.Links.Notation.pdf

### Current State

The URL `https://link-foundation.github.io/links-notation/csharp/Link.Foundation.Links.Notation.pdf`
returns 404. The GitHub Pages (`gh-pages` branch) contains only two PDF files:

- `csharp/Platform.Communication.Protocol.Lino.pdf` (last updated 2022-01-24)
- `csharp/Platform.Protocols.Lino.pdf` (last updated 2022-01-31)

Neither matches `Link.Foundation.Links.Notation.pdf`.

### Root Cause

**Three compounding problems**:

#### Problem 1: Wrong PDF filename in documentation links

| Date | Commit | Action |
|------|--------|--------|
| Before 2022-01-31 | Legacy state | PDF generated as `Platform.Communication.Protocol.Lino.pdf` |
| 2022-01-31 | `6970453` (Deploy) | PDF renamed to `Platform.Protocols.Lino.pdf` on gh-pages |
| 2025-10-12 | `b8bfb4b` (konard) | README PDF link changed from `Platform.Protocols.Lino.pdf` to `LinkFoundation.LinksNotation.pdf` |
| 2025-10-18 | `d3b635d` (konard) | README PDF link updated from `LinkFoundation.LinksNotation.pdf` to `Link.Foundation.Links.Notation.pdf` |

The link in `README.md` was updated twice to reflect namespace migrations, but the **actual PDF file
on `gh-pages` was never regenerated or renamed**. The last PDF deployment was in **January 2022**
(commit `6e15be0`), before the repository was migrated from `linksplatform/Protocols.Lino` to
`link-foundation/links-notation`.

#### Problem 2: PDF generation script uses wrong filename

The `generatePdfWithCode` CI job (in `.github/workflows/csharp.yml`) runs the script
`generate-csharp-pdf.sh` from the `linksplatform/Scripts` repository. That script generates
the PDF as:

```bash
cp document.pdf "_site/Platform.$REPOSITORY_NAME.pdf"
```

Where `REPOSITORY_NAME=$(basename ${{ github.repository }})` = `links-notation`.

So the generated PDF would be named `Platform.links-notation.pdf` — not `Link.Foundation.Links.Notation.pdf`.

The script also looks for a directory `csharp/Platform.links-notation/` which doesn't exist
(evidence from CI logs):

```
find: './csharp/Platform.links-notation/obj': No such file or directory
find: './csharp/Platform.links-notation.Tests/obj': No such file or directory
find: './csharp/Platform.links-notation': No such file or directory
find: './csharp/Platform.links-notation.Tests': No such file or directory
```

This means the `generatePdfWithCode` job runs successfully (exit code 0) but produces an empty
or minimal PDF, and never integrates with the documentation deployment.

#### Problem 3: PDF artifact not shared between CI jobs

The `generatePdfWithCode` job and `publishDocumentation` job are separate GitHub Actions jobs
with no artifact sharing between them. Even if `generatePdfWithCode` produced a correctly named
PDF, `publishDocumentation` would not include it in the deployed documentation.

The `publishDocumentation` job runs DocFX which generates API documentation, but there is no
step to copy the PDF from `generatePdfWithCode` into the DocFX `_site` output.

### CI Logs Evidence

CI log from run `20053077913` (2025-12-09, push to main):
- `generatePdfWithCode` shows `find: './csharp/Platform.links-notation': No such file or directory`
- `publishDocumentation` never references any PDF file
- The deployed gh-pages only contains HTML/CSS/JS API docs with no PDF

Full log saved to: `ci-logs/csharp-push-20053077913.log`

### Fix (Implemented)

**Full fix** — fixing the PDF generation pipeline in `csharp.yml`:

1. **Fixed paths in `format-csharp-document.sh`**: Patched `Platform.$REPOSITORY_NAME` references
   to use `Link.Foundation.Links.Notation` (the actual C# project directory name).
2. **Fixed PDF filename in `generate-csharp-pdf.sh`**: Patched the `cp` command to produce
   `_site/Link.Foundation.Links.Notation.pdf` instead of `_site/Platform.links-notation.pdf`.
3. **Added artifact upload**: After PDF generation, uploads the PDF as a GitHub Actions artifact
   (`csharp-pdf`) using `actions/upload-artifact@v4`.
4. **Added artifact download**: `publishDocumentation` job downloads the PDF artifact before
   running the documentation script.
5. **Added PDF copy into `_site/`**: After DocFX runs and generates `_site/`, the PDF is copied
   in so it gets included in the deployment to gh-pages.
6. **Restored PDF links**: All documentation files (`README.md`, `README.ru.md`,
   `docs/website/index.html`, `docs/website/dist/index.html`) have their PDF links restored
   to point to `Link.Foundation.Links.Notation.pdf`.

---

## Affected Files

| File | Broken Link | Status |
|------|-------------|--------|
| `README.md` | PDF link | Fixed (CI/CD pipeline fixed to generate PDF) |
| `README.ru.md` | `FEATURE_COMPARISON.md` | Fixed (updated to point to `TEST_CASE_COMPARISON.md`) |
| `README.ru.md` | PDF link | Fixed (CI/CD pipeline fixed to generate PDF) |
| `docs/website/index.html` | PDF link | Fixed (CI/CD pipeline fixed to generate PDF) |
| `docs/website/dist/index.html` | PDF link | Fixed (CI/CD pipeline fixed to generate PDF) |
| `.github/workflows/csharp.yml` | N/A | Fixed (generatePdfWithCode + publishDocumentation pipeline) |

---

## Proposed Solutions

### For FEATURE_COMPARISON.md reference in README.ru.md

**Option 1** (Recommended): Update `README.ru.md` to match `README.md` — replace the
`FEATURE_COMPARISON.md` link with a link to `TEST_CASE_COMPARISON.md` (which exists).

**Option 2**: Restore `FEATURE_COMPARISON.md` from git history (commit `b8bfb4b:FEATURE_COMPARISON.md`).
However, this file was intentionally deleted as "redundant", so restoration is not recommended
without deliberate intent.

### For the PDF link

**Implemented (Full fix)**: Fix the CI pipeline to correctly generate and deploy the PDF:
- Patched `format-csharp-document.sh` to use `Link.Foundation.Links.Notation` directory paths
- Patched `generate-csharp-pdf.sh` to produce `Link.Foundation.Links.Notation.pdf` as output
- Added artifact upload/download between `generatePdfWithCode` and `publishDocumentation` jobs
- Added PDF copy into DocFX `_site/` output before deployment

### Known Libraries/Tools for PDF Documentation Generation

For generating PDF documentation from .NET/C# code:
- **DocFX** (already in use): Can generate PDF via `docfx pdf` command. See
  [DocFX PDF documentation](https://dotnet.github.io/docfx/docs/pdf.html)
- **wkhtmltopdf**: Convert HTML documentation to PDF
- **Pandoc**: Convert Markdown to PDF
- **LaTeX/dvipdf**: Currently used approach (via `generate-csharp-pdf.sh`), but requires
  fixing the filename mismatch

---

## References

- [Issue #217](https://github.com/link-foundation/links-notation/issues/217)
- [PR #218](https://github.com/link-foundation/links-notation/pull/218)
- Commit `a3ea131`: FEATURE_COMPARISON.md created
- Commit `1ee4eca`: FEATURE_COMPARISON.md deleted
- Commit `b8bfb4b`: PDF link first renamed (linksplatform → link-foundation)
- Commit `d3b635d`: PDF link namespace updated (LinkFoundation.LinksNotation → Link.Foundation.Links.Notation)
- CI Run `20053077913`: Evidence of broken PDF generation (2025-12-09)
- [linksplatform/Scripts generate-csharp-pdf.sh](https://raw.githubusercontent.com/linksplatform/Scripts/main/MultiProjectRepository/generate-csharp-pdf.sh)
