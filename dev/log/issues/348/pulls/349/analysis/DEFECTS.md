# Defects the update uncovered

Updating "everything" meant checking every claim the repository makes about versions: floors in
manifests and READMEs, pins in tool configs and images, and which manifests Dependabot watches.
Six of those claims were false or untested on `main` (`ef32b5b`, the base of this pull request).
Each entry gives the evidence, the root cause, the fix, and how to reproduce it.

## D1. The C++ test build did not configure on the CMake floor it declares

- **Claim:** `cmake_minimum_required(VERSION 3.16)` and `cpp/README.md` say CMake 3.16.
- **Fact:** `cpp/CMakeLists.txt` passed `DOWNLOAD_EXTRACT_TIMESTAMP TRUE` to `FetchContent_Declare`
  for GoogleTest. CMake added that keyword in 3.24. On 3.16-3.23 the GoogleTest sub-build gets it
  as part of the hash argument (`SHA256=…;DOWNLOAD_EXTRACT_TIMESTAMP;TRUE`) and configuring stops
  with `CMake Error … ExternalProject.cmake:2530` (`../ci-logs/deps/cpp-cmake-3.16.9-main.log`).
- **Root cause:** every runner ships CMake 4, so CI never ran the floor.
- **Fix (`86a88e4`):** `cmake_minimum_required(VERSION 3.16...4.4)` keeps the floor and turns on
  every policy up to 4.4, including CMP0135, which is what the keyword was setting. The keyword
  goes. The new `cmake-floor` job in `cpp.yml` builds, tests and consumes the sources with
  CMake 3.16.9 (archive checked by SHA-256). Locally 349/349 tests pass on both 3.16.9 and 4.4.4
  (`cpp-cmake-3.16.9-ctest.log`, `cpp-cmake-4.4.4.log`).
- **Reproduce:** `cmake -S cpp -B build` with CMake 3.16.9 on `main`.

## D2. The pre-commit `eslint` hook failed on every run, with an unpinned ESLint

- **Fact:** `.pre-commit-config.yaml` listed `additional_dependencies: [eslint]` with no version and
  ran the hook on every `.js`/`.ts` file from the repository root. There is no
  `eslint.config.*` at the root, so ESLint 10 exits with "ESLint couldn't find an
  eslint.config.* file" (`../ci-logs/deps/precommit-eslint-main.log`).
- **Root cause:** pre-commit builds a hook environment once per machine, so each contributor got
  whichever ESLint was newest when their environment was built. Nothing ran the hook in CI.
- **Fix (`0c26f7a`):** `eslint@10.13.0`, the same version as `js/` and `docs/website`, run on
  those two projects with their own configs (`precommit-eslint.log`: Passed). The freshness gate
  now reads `additional_dependencies`, rejects unpinned entries, and can bump them.
- **Reproduce:** `pre-commit run eslint --all-files` on `main`.

## D3. The Gitpod workspace could not build `csharp/`

- **Fact:** `.gitpod.Dockerfile` used `gitpod/workspace-dotnet:latest`. That tag was last pushed
  on 2025-11-26 and ships .NET SDK 8.0.100. `csharp/global.json` pins 10.0.402 and the projects
  target `net10.0`, so the SDK the workspace starts with cannot build them.
- **Fix (`bd93837`):** the image is pinned to its newest tag and digest, so the docker Dependabot
  entry can bump it. `dotnet-install.sh --jsonfile csharp/global.json` installs the SDK CI uses.
- **Evidence and its limits:** `../ci-logs/deps/gitpod-sdk-build.log` shows the pinned image
  pulled, `dotnet-install` installing 10.0.402 and `dotnet --version` printing `10.0.402`. That
  run used an earlier probe that did not copy the `docs/protocol` fixtures, so its
  `dotnet test` step failed on the missing fixture files. The Docker daemon then stopped, and it
  could not be restarted in this environment, so the final probe
  (`experiments/issue-348/gitpod-sdk.Dockerfile`, which copies them) has not been re-run. The
  same test suite passes on SDK 10.0.402 outside Docker (`csharp.log`). What remains unverified
  is the full suite *inside* the Gitpod image.
- **Reproduce:** `docker build -f experiments/issue-348/gitpod-sdk.Dockerfile .`

## D4. 35 committed manifests had no Dependabot entry

- **Fact:** `dependabot.yml` covered 19 directories in 8 ecosystems. The root `composer.json`,
  the examples, case studies, experiments, `js/bun.lock`, `csharp/global.json`,
  `.pre-commit-config.yaml` and `.gitpod.Dockerfile` were never offered an update.
- **Root cause:** entries were added by hand when a directory was created, and nothing checked
  them.
- **Fix (`07bb58b`, `1a0eef3`):** every directory is listed, the bun, dotnet-sdk, pre-commit
  and docker ecosystems are added, and `scripts/ci/check-dependabot.py` fails CI when a
  git-tracked manifest outside `dev/log` has no entry. It caught a file this pull request had
  added (`1a0eef3`).

## D5. `requires-python >=3.9` was a floor no one could test

- **Fact:** CI ran only Python 3.13. On Python 3.9.25 the library itself still worked (272 passed
  with an older pytest). But the project's own `test` extra could not be installed there:
  `pytest>=9.1.1` requires Python 3.10 or newer, so `pip install -e '.[test]'` has no solution
  (`../ci-logs/deps/python-3.9-main.log`). The floor had drifted below what the project's tooling
  supported.
- **Fix (`e452c16`):** `requires-python >=3.11`. 3.9 is end of life, and so is 3.10 since
  2026-10-01. CI now tests 3.11 and 3.15, and the 3.9 shims are removed. This is a deliberate
  break for users still on 3.9 or 3.10, both unsupported upstream. The changelog says so.

## D6. Maven was neither pinned nor given a true floor

- **Fact:** CI ran whatever Maven the runner image shipped (3.9.15 on ubuntu-26.04), local
  builds ran whatever was installed, and `java/README.md` said "Maven 3.6+". The build plugins
  need 3.6.3. With no minimum declared, `versions:display-plugin-updates` printed "Project does
  not define required minimum version of Maven" and proposed 2.x "updates" for every plugin.
- **Root cause:** the build tool was outside every inventory. Neither Dependabot (until
  dependabot-core#14812, still behind a rollout flag) nor the freshness gate read it.
- **Fix (`8f0b8c7`, `4b9b1c4`):** the Maven Wrapper (`java/mvnw`, only-script) pins Maven 3.10.0
  by SHA-256. Every workflow, script and README uses it, and the freshness gate tracks it.
  `maven-enforcer-plugin` declares 3.6.3, and the `maven-floor` job builds with it. Locally 3.6.3
  passes 185/185 tests and 3.6.2 stops with "requires Maven version 3.6.3"
  (`java-maven-3.6.3.log`, `java-maven-3.6.2.log`).
