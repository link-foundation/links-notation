# Issue 392 requirements and verification

Scope: [issue 392](https://github.com/link-foundation/links-notation/issues/392),
implemented in [PR 393](https://github.com/link-foundation/links-notation/pull/393).
The issue has no comments or required sub-issues, and the initial PR has no
conversation comments, inline comments or reviews (checked 2026-11-06).

## Work plan

- [x] Read repository guidance, the complete issue and PR feedback, and recent
  release work (PRs 388 and 391). Check the validated release SHA and logs.
- [x] Write failing JavaScript regressions for current Warehouse 422 bodies,
  strict authentication classification, both exchange stages and redaction.
- [x] Implement bounded safe diagnostics and controlled fallback while retaining
  OIDC first, artifact validation/hashes and attestations.
- [x] Prepare the next synchronized patch release without changing immutable
  0.31.2 tags, and document recovery and the actual publisher identity.
- [ ] Run focused release-helper checks and default JS checks; inspect all
  completed failures for the latest SHA, save/read logs, then push one batch
  after active runs finish. Review the full PR diff and mark it ready.
- [ ] Verify/configure the saved PyPI publisher and demonstrate successful OIDC
  publication for owner `link-foundation`, repository `links-notation`, caller
  `js.yml`, with no GitHub environment (the current publishing job has none).
- [ ] Recover 0.31.2 from validated source
  `42a3249129edcb1eafd2a7cd71c994aa9cbb3d17` / main run `42166559496`;
  verify exact public wheel/sdist, provenance, installed consumer,
  `python_0.31.2` release and the final ten-distribution audit.

## Evidence and limits

The previous helper recognizes only HTTP 400 for `invalid-publisher` and
`invalid-token`. Warehouse's pinned
[implementation](https://github.com/pypi/warehouse/blob/0fac80550625bdc75baab04c303eddf249b93ab0/warehouse/oidc/views.py)
returns 422 with `{message, errors: [{code, description}]}`. Protocol errors
include `invalid-payload`, `not-enabled`, `invalid-pending-publisher`,
`invalid-reuse-token` and `rate-limited`; these must never trigger fallback.
Neither arbitrary response descriptions nor arbitrary error codes are safe to
print. Logs belong in `ci-logs/`.

Warehouse's [publisher lookup](https://github.com/pypi/warehouse/blob/0fac80550625bdc75baab04c303eddf249b93ab0/warehouse/oidc/models/github.py)
matches `job_workflow_ref`. The old nested job therefore presents
`publish-python.yml`, which does not match the requested saved `js.yml`
publisher. Python publishing now runs directly in `js.yml`, requests
`id-token: write`, and sets no environment. Both publishing paths still wait for
all ten native stages; the final audit also waits for Python publication and
its GitHub release. Static guard regressions failed before this move and pass
afterward. This finding does not identify the old live 422 endpoint or code.

`PYPI_TOKEN` is configured as a repository secret; there is no
`PYPI_TRUSTED_PUBLISHING` repository override. Secret presence does not prove
validity. Visiting the actual PyPI project publishing settings redirects this
session to login. No authenticated PyPI session is available to read or change
the saved publisher. This operational criterion remains unfinished.

The fresh exact-version audit found nine verified public 0.31.2 package/release
pairs and a PyPI 404, with no verification errors. Historical attempt 2's Python
log identifies package 0.31.2 at line 580 and undifferentiated 422 at line 599.
Its audit then had eight pairs; C# has since recovered. The original run's old
helper and callee identity prevent a rerun from applying this repair. Public
wheel/sdist, provenance, installed consumer, `python_0.31.2`, successful OIDC and
the complete ten-distribution audit remain unverified and unfinished.

Local verification: 368 default JS tests, 147 release-helper tests, 27 CI gate
contracts, 38 parity/audit/PHP contracts, workflow lint (actionlint with shellcheck
and pyflakes), zizmor, version consistency, parity coverage, test-comparison
inventory and benchmark regeneration checks pass. Detailed command logs are
kept under ignored `ci-logs/`; CI repeats the required contracts on the PR SHA.
