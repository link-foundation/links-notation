# Issue 325 investigation

The shared format adopts link-cli's packet grammar and marker-point mapping
from commit `6417179b0ce7669f482e50268f4a8bdb506bb034` (Unlicense).
The 96 original vectors are unchanged. Queue framing remains a transport
concern; links-queue's legacy inline-literal encoding is a different format.

`fetch-upstream.py` downloads the pinned source through authenticated `gh api`.
The two `port-*.py` scripts record the **initial** adaptation, before integration
fixes. Run them from the repository root in a scratch checkout of the base
commit. They refuse to overwrite the finished implementation. They are not
generators for the maintained codecs. Downloaded sources and validation logs
belong in the locally ignored `research/` directory.

The tests were added before the codecs: Rust initially failed to compile
because `links_notation::binary` did not exist. After the initial port, the
comment-reference test reproduced a data-loss bug: formatting `#` produced
a comment and parsing returned an empty document. The new Unicode whitespace
test also returned an empty document for a non-breaking space. Quoting leading
`#` and recognizing only grammar whitespace fixes these cases in both ports.

Further tests reproduced missing validation of in-memory packet widths,
arities and external-reference flags, missing compact-address overflow checks,
and missing limits on repeated decoded strings. The finished codecs validate
the same wire constraints for byte and model input, and count the total UTF-8
size of references and ids in expanded output. Each bounded reproducer now
passes in both ports. Depth probes construct only 65 model levels or 74 packet
links; expansion probes use tiny configured budgets rather than host-sized
allocations.

A boundary test also found that decoding an id at the deepest accepted model
level incorrectly added one nesting level. IDs now use their containing link's
depth, so all twelve encoder option combinations round trip the boundary model.

The branch's initial security run `37295270122` failed its JS and website npm
audits. The preserved log identifies `brace-expansion@5.0.9` at lines 2190–2195
and 4064–4069. Updating that transitive dependency to 5.0.12 in both npm locks
and the JS Bun lock removes the advisories without changing direct dependencies.

The first completed feature run `37299445325` passed all 34 benchmark tests
but failed the generated-output drift check at log line 1089. Regenerating
with `cargo run -p links-notation-benchmark --release` changed only the report's
parser version from 0.22.0 to 0.23.0. Its `--check` mode then passed; the
datasets, generated documents and measured results were already current.

The next benchmark run `37299899525` passed regeneration and six language
checks, but Java failed dependency resolution at log lines 2045–2047: its
benchmark still requested 0.22.0 while CI installed the new 0.23.0 library.
The version-consistency check now also checks Java and Rust benchmark parser
dependencies. It failed on the stale Java dependency before updating it to
0.23.0, then passed after the update.

Validation commands:

```sh
(cd rust && cargo fmt --all -- --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test)
(cd csharp && dotnet format --verify-no-changes && dotnet build -c Release && dotnet test -c Release --no-build)
bash examples/binary/run-interop.sh
node scripts/create-test-case-comparison.mjs --check
node scripts/version-consistency.mjs
```

Both codec suites consume the shared vectors. The interoperability example
compares bytes and decoded text for six documents across all twelve option
combinations (72 cases), and runs in C# CI. Edits to the shared spec or vectors
trigger both language workflows. The other language suites, website build and
lint, comparison generation, and dependency audits are checked for the
synchronized 0.23.0 release preparation.

## Continuation checks

Before the five new ports, their binary tests fail on the missing exported
codec/module/class. The new shared-vector tests reproduce that missing API,
then require all 96 canonical packets byte for byte. Native-model tests encode
the normal text parser result under all twelve option combinations, preserving
semantic group/identifier/reference equality.

Rust's `codec_encoder_uses_configured_limits` and C#'s
`EncoderUsesConfiguredLimits` failed because encoding ignored the codec's limits.
They now reject each exceeded budget and successfully round trip depth 70 when
configured for depth 80. All deliberate depth probes are bounded to 70 groups.

Run `python3 experiments/issue-325/test_dependency_check.py` for offline tests
of stable-version selection, active manifest scope, targeted edits, Maven
properties and visible registry errors. Run
`python3 scripts/ci/check-dependencies.py` for fresh registry checks. Add
`--update` to update direct manifest floors, then refresh lockfiles and run tests.
`node scripts/ci/check-npm-locks.mjs` checks compatible transitive npm updates
and validates both committed JavaScript locks. These commands preserve failure
logs in `ci-logs/dependencies/`.

`FormatterProbe.java` reproduces the google-java-format 1.37.0 / Spotless 3.10.3
adapter incompatibility when both libraries are on its classpath: the adapter
calls the removed `JavaFormatterOptions.Style.valueOf(String)` method.
`java/format.sh` invokes the latest formatter CLI directly and keeps the
formatter out of the published library's dependencies.

The freshness policy covers active packages, benchmarks, documentation tools,
examples, CI tooling, pre-commit hooks and GitHub Actions. Archived experiments,
case studies and `dev/log` snapshots retain their historical dependencies.
Direct dependencies use the latest stable release (including major upgrades).
Third-party transitive dependencies use their newest upstream-compatible
versions; forcing incompatible majors through upstream constraints is outside
this policy. Python 3.9 source installs use the newest compatible setuptools,
while modern Python builds use the current release. Registry errors fail CI.
Daily Dependabot checks propose updates for every supported ecosystem and active
directory. The freshness workflow runs on every PR and daily; branch protection
must require its check to enforce this policy before merging.

The first continuation CI runs failed during action download, before any PHP
tests: `binary-interop-37446166924.log:30` and `php-37446166638.log:512` could not
resolve `shivammathur/setup-php@v2.37.2`. Its actual stable tag is `2.37.2`.
The checker now preserves exact registry tag spelling, checks it in addition to
the numeric version, and has an offline regression for this case.

Review also found that all seven decoders built an entire string before checking
its remaining UTF-8 budget. A two-link packet encodes `a`, `b`, then an invalid
scalar; with a one-byte string budget it previously reached the third scalar
instead of stopping at `b`. The new tests fail before the fix and now require an
early limit error. String builders check each scalar's byte count before append,
and preallocation respects the remaining budget.

The shared corpus also checks parsing the formatted result. It reproduces data
loss for Python's U+001C–U+001F whitespace and JavaScript's U+FEFF whitespace
when they are emitted bare. Every formatter now quotes the union of the native
grammars' whitespace characters. All seven programs preserve the text model
and compare identical bytes and canonical text in 300 option/corpus cases.
