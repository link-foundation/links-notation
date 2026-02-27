# Case Study: Issue #217 - Broken Links

**Issue**: [#217 - Broken links](https://github.com/link-foundation/links-notation/issues/217)
**Author**: konard
**Date Reported**: 2026-02-27
**Status**: Root cause identified, fixes applied

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

### Fix

Two approaches:

**Approach A (Quick fix)**: Remove the broken PDF link from all documentation files since the PDF
pipeline is broken and would require significant work to fix. The C# API documentation is still
accessible at `https://link-foundation.github.io/links-notation/csharp/api/Link.Foundation.Links.Notation.html`.

**Approach B (Full fix)**: Fix the PDF generation pipeline:
1. Update `csharp.yml` to override `REPOSITORY_NAME` in the PDF generation script to use the
   correct C# namespace (e.g., `Link.Foundation.Links.Notation`)
2. Add an artifact upload step after `generatePdfWithCode` to share the PDF
3. Add an artifact download step in `publishDocumentation` before DocFX runs
4. Copy the PDF into the DocFX `_site` output directory

---

## Affected Files

| File | Broken Link | Status |
|------|-------------|--------|
| `README.md` | PDF link | Broken (file never existed) |
| `README.ru.md` | `FEATURE_COMPARISON.md` | Broken (file deleted Nov 2025) |
| `README.ru.md` | PDF link | Broken (file never existed) |
| `docs/website/index.html` | PDF link | Broken (file never existed) |
| `docs/website/dist/index.html` | PDF link | Broken (file never existed) |

---

## Proposed Solutions

### For FEATURE_COMPARISON.md reference in README.ru.md

**Option 1** (Recommended): Update `README.ru.md` to match `README.md` — replace the
`FEATURE_COMPARISON.md` link with a link to `TEST_CASE_COMPARISON.md` (which exists).

**Option 2**: Restore `FEATURE_COMPARISON.md` from git history (commit `b8bfb4b:FEATURE_COMPARISON.md`).
However, this file was intentionally deleted as "redundant", so restoration is not recommended
without deliberate intent.

### For the PDF link

**Option 1** (Recommended short-term): Remove the PDF links from all documentation until the PDF
generation pipeline is fixed. Reference the existing HTML API docs instead.

**Option 2** (Recommended long-term): Fix the CI pipeline to correctly generate and deploy the PDF:
- The `linksplatform/Scripts` repository's `generate-csharp-pdf.sh` script needs to support
  custom repository names (not just `Platform.$REPOSITORY_NAME`)
- Alternatively, inline the PDF generation in `csharp.yml` with the correct filename
- Add artifact sharing between `generatePdfWithCode` and `publishDocumentation` jobs

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
