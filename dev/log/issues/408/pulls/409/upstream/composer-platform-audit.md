Composer 2.11.2 treats a valid empty lock as a missing installation when the only requirements are platform packages. This blocks uniform `composer audit --locked` automation and recommends passing `--locked` even though it was supplied.

Minimal reproduction (PHP 8.5.11, Composer 2.11.2):

```sh
mkdir platform-audit && cd platform-audit
printf '%s\n' '{"name":"example/platform-audit","require":{"php":">=8.4"}}' > composer.json
composer update --no-install --no-interaction
composer audit --locked
```

Actual: exit 1, `No installed packages found. Please run "composer install" before running "audit" or pass "--locked" to audit the lock file.` Both `packages` and `packages-dev` in the native generated lock are empty. There is no third-party package to audit.

Expected: exit 0 and the existing `No packages - skipping audit.` message for a valid platform-only graph. Invalid/missing locks should still fail. Dependencies filtered out by `--direct` are a separate case.

Cause: `AuditCommand::execute()` checks whether `getRequires()` / `getDevRequires()` are nonempty before distinguishing platform links from installed packages. `php` (and `ext-*`) makes that condition true despite there being no auditable requirement.

Suggested fix: when checking for required installable packages, filter platform requirements via `PlatformRepository::isPlatformPackage()`. Keep a regression for `require: {php: ...}`, extension-only requirements, and their `require-dev` / `--no-dev` variants; retain the failure for an uninstalled third-party requirement.

Local workaround in link-foundation/links-notation PR 409: inspect the native lock graph, run `composer validate --strict` for an empty graph, and audit every nonempty graph normally. An empty graph is recorded separately; the failed audit is never counted as passing. A finite executable reproduction is stored as `experiments/issue-408/composer-platform-audit.py` in that PR.

Searched existing issues with `audit empty locked`, `"audit" "No installed packages"`, and `audit platform requirements` on 2026-11-14; no matching report found.
