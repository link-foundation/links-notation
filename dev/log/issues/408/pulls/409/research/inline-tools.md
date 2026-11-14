# Workflow-installed tools and browser images

Fresh registry metadata collected 2026-11-14 UTC. These selections supplement
the manifest, Cargo tool and runtime tables. Before values come from the initial
issue SHA; repeated alternatives in one installer share its original selection.
The two workflow-only snapshots lack package manifests; their browser installs
use exact current releases. Both complete JS snapshots instead use native npm
locks for browser tooling. Image sources link to the saved registry response:
the OCI API requires content negotiation and returns 404 to ordinary browser
requests. The saved response includes its URL, headers, digest and manifest.

| Location | Dependency | Before | After | Registry current | Source |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/benchmarks.yml:223` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `.github/workflows/js.yml:174` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `.github/workflows/publish-csharp.yml:149` | docfx | latest (unbounded) | 2.81.0 | 2.81.0 | [Registry](https://api.nuget.org/v3-flatcontainer/docfx/index.json) |
| `.github/workflows/publish-js.yml:63` | npm | 12.2.2 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `.github/workflows/python.yml:41` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `.github/workflows/python.yml:79` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/docs.yml:57` | docfx | latest (unbounded) | 2.81.0 | 2.81.0 | [Registry](https://api.nuget.org/v3-flatcontainer/docfx/index.json) |
| `dev/log/issues/290/pulls/291/templates/go/.github/workflows/release.yml:138` | staticcheck | latest | 2026.2.2 | 2026.2.2 | [Registry](https://github.com/dominikh/go-tools/releases/tag/2026.2.2) |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml:231` | Playwright image | 1.59.1-noble | 1.65.1-noble | 1.65.1-noble | [Registry](playwright-image.json) |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml:258` | browser-commander | 0.8.1 | 0.34.1 | 0.34.1 | [Registry](https://registry.npmjs.org/browser-commander/latest) |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml:258` | playwright | 1.59.1 | 1.65.1 | 1.65.1 | [Registry](https://registry.npmjs.org/playwright/latest) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/docs.yml:55` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:161` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:253` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:333` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:334` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:334` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:399` | scriv | latest (unbounded) | 1.8.1 | 1.8.1 | [Registry](https://pypi.org/pypi/scriv/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:536` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:537` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:537` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:660` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:661` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:661` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml:661` | scriv | latest (unbounded) | 1.8.1 | 1.8.1 | [Registry](https://pypi.org/pypi/scriv/json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/csharp.yml:275` | docfx | latest (unbounded) | 2.81.0 | 2.81.0 | [Registry](https://api.nuget.org/v3-flatcontainer/docfx/index.json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml:65` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml:89` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml:90` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml:90` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml:111` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml:112` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml:112` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/298/pulls/299/templates/csharp/docs.yml:57` | docfx | latest (unbounded) | 2.81.0 | 2.81.0 | [Registry](https://api.nuget.org/v3-flatcontainer/docfx/index.json) |
| `dev/log/issues/298/pulls/299/templates/go/release.yml:138` | staticcheck | latest | 2026.2.2 | 2026.2.2 | [Registry](https://github.com/dominikh/go-tools/releases/tag/2026.2.2) |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml:232` | Playwright image | 1.59.1-noble | 1.65.1-noble | 1.65.1-noble | [Registry](playwright-image.json) |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml:264` | browser-commander | 0.8.1 | 0.34.1 | 0.34.1 | [Registry](https://registry.npmjs.org/browser-commander/latest) |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml:264` | playwright | 1.59.1 | 1.65.1 | 1.65.1 | [Registry](https://registry.npmjs.org/playwright/latest) |
| `dev/log/issues/298/pulls/299/templates/python/docs.yml:55` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:164` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:256` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:336` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:337` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:337` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:402` | scriv | latest (unbounded) | 1.8.1 | 1.8.1 | [Registry](https://pypi.org/pypi/scriv/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:538` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:539` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:539` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:661` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:662` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:662` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/298/pulls/299/templates/python/release.yml:662` | scriv | latest (unbounded) | 1.8.1 | 1.8.1 | [Registry](https://pypi.org/pypi/scriv/json) |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/docs.yml:59` | docfx | latest (unbounded) | 2.81.0 | 2.81.0 | [Registry](https://api.nuget.org/v3-flatcontainer/docfx/index.json) |
| `dev/log/issues/330/pulls/331/templates/go/.github/workflows/release.yml:142` | staticcheck | latest | 2026.2.2 | 2026.2.2 | [Registry](https://github.com/dominikh/go-tools/releases/tag/2026.2.2) |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml:243` | Playwright image | 1.59.1-noble | 1.65.1-noble | 1.65.1-noble | [Registry](playwright-image.json) |
| `dev/log/issues/330/pulls/331/templates/js/scripts/setup-npm.mjs:100` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/330/pulls/331/templates/js/scripts/setup-npm.mjs:127` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/330/pulls/331/templates/js/scripts/setup-npm.mjs:127` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/330/pulls/331/templates/js/scripts/setup-npm.mjs:132` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/330/pulls/331/templates/js/scripts/setup-npm.mjs:175` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/docs.yml:61` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:167` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:330` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:412` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:413` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:413` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:479` | scriv | latest (unbounded) | 1.8.1 | 1.8.1 | [Registry](https://pypi.org/pypi/scriv/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:627` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:628` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:628` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:760` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:761` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:761` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml:761` | scriv | latest (unbounded) | 1.8.1 | 1.8.1 | [Registry](https://pypi.org/pypi/scriv/json) |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/docs.yml:62` | docfx | latest (unbounded) | 2.81.0 | 2.81.0 | [Registry](https://api.nuget.org/v3-flatcontainer/docfx/index.json) |
| `dev/log/issues/377/pulls/378/templates/go/.github/workflows/release.yml:142` | staticcheck | 2026.2.1 | 2026.2.2 | 2026.2.2 | [Registry](https://github.com/dominikh/go-tools/releases/tag/2026.2.2) |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/example-app.yml:292` | Playwright image | 1.59.1-noble | 1.65.1-noble | 1.65.1-noble | [Registry](playwright-image.json) |
| `dev/log/issues/377/pulls/378/templates/js/scripts/setup-npm.mjs:100` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/377/pulls/378/templates/js/scripts/setup-npm.mjs:127` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/377/pulls/378/templates/js/scripts/setup-npm.mjs:127` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/377/pulls/378/templates/js/scripts/setup-npm.mjs:132` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/377/pulls/378/templates/js/scripts/setup-npm.mjs:175` | npm | 11 | 12.2.2 | 12.2.2 | [Registry](https://registry.npmjs.org/npm/latest) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/docs.yml:66` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:170` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:334` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:417` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:418` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:418` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:604` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:605` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:605` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:730` | pip | latest (unbounded) | 26.3 | 26.3 | [Registry](https://pypi.org/pypi/pip/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:731` | build | latest (unbounded) | 1.6.1 | 1.6.1 | [Registry](https://pypi.org/pypi/build/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:731` | twine | latest (unbounded) | 7.0.0 | 7.0.0 | [Registry](https://pypi.org/pypi/twine/json) |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml:731` | scriv | latest (unbounded) | 1.8.1 | 1.8.1 | [Registry](https://pypi.org/pypi/scriv/json) |
