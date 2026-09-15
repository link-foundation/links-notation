# Requirements — issue #292

Every requirement stated in
[#292](https://github.com/link-foundation/links-notation/issues/292), with what was done and how it
was checked.

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 1 | Update every dependency in every language | done | see [VERIFICATION.md](VERIFICATION.md); `registry-latest.txt` shows each declared version equals the registry's current release |
| 2 | Take the major bumps deliberately | done | phpunit 10→13, php_codesniffer 3→4, xunit 2→xunit.v3 4, `maven.compiler.release` 11→21, go 1.21→1.24, net8→net10, php 8.1→8.4; each suite run before the bump was kept |
| 3 | Bump peggy and Pegasus carefully, verifying against the conformance fixtures | done | peggy and Pegasus were already at the current release (5.1.0 / 4.1.0); regenerating `js/src/parser-generated.js` produced a byte-identical file and all 204 JS tests pass |
| 4 | Publish every language at the same version | partly | all seven declarations are 0.16.0 and `scripts/version-consistency.mjs` now enforces it; whether Maven Central and Packagist actually receive it depends on credentials this pull request cannot supply — see below |
| 5 | CI that fails when the languages disagree, or when a version is ahead of what is published | done | `scripts/version-consistency.mjs` (hard failure, every pull request) and `scripts/release-audit.mjs` (warning) — see the note on why the second one warns |
| 6 | Automated dependency updates across all ecosystems | done | `.github/dependabot.yml` gained `maven`, `composer` and `gomod`; `cargo`, `npm`, `pip` and `github-actions` were already there |

## Requirement 4 — what this pull request cannot do

The issue asks for the languages to be released together. Five of the seven already are: js, python,
rust, csharp and go each match their registry. java and php have **never** published — Maven Central
holds nothing under `io.github.link-foundation:links-notation` and Packagist holds nothing under
`link-foundation/links-notation`. That is not a version-declaration problem, so bumping a file cannot
fix it; it needs the Maven Central and Packagist credentials to be configured on the repository,
which is tracked separately in
[#192](https://github.com/link-foundation/links-notation/issues/192).

What this pull request can do, and does, is make the disagreement impossible to reintroduce silently:
`version-consistency.mjs` fails the build the moment the seven declarations diverge, and the release
audit keeps annotating the two languages whose registry has nothing.

## Requirement 5 — why one check fails and the other warns

The two checks answer different questions and deserve different severities.

`version-consistency.mjs` reads only the working tree. If `java/pom.xml` says 0.16.0 and
`go/VERSION` says 0.15.0, that is true of the commit and will still be true tomorrow — there is no
transient explanation, so it fails.

`release-audit.mjs` asks seven registries what they serve. A declared version being ahead of a
published one is the *normal* state between the bump and the release that publishes it: this very
pull request declares 0.16.0 while every registry still serves 0.15.0. Failing on that would mean
every release-preparing pull request is red by construction. It annotates instead, which is the
behaviour introduced in #290 and deliberately left alone.
