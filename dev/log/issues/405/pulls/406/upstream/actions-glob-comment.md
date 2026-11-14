Confirmed this at runtime while updating link-foundation/links-notation#406 on Node 26.13.0, `@actions/glob@0.7.0`, and `minimatch@11.0.8`.

Minimal reproduction:

```sh
npm init -y
npm install @actions/glob@0.7.0
npm pkg set overrides.minimatch=11.0.8
npm install
mkdir -p fixture/nested
printf sample > fixture/nested/file.txt
node --input-type=module -e "import * as glob from '@actions/glob'; console.log(await (await glob.create('fixture/**/*')).glob())"
```

This throws `TypeError: this.minimatch.matchOne is not a function` from `Pattern.partialMatch`. Without the override, `npm audit` reports GHSA-g3hv-75wg-m249. Thus a blanket minimatch override can make an audit pass while breaking actual artifact file discovery.

Our temporary workaround is to replace the direct `@actions/glob` dependency in the two affected archived action templates with `glob@14.0.6` plus `glob-parent@6.0.2`, and verify nested files, excluded patterns, hidden files, symlinks, search roots and empty evidence with an actual filesystem regression test. Artifact transport still uses `@actions/artifact`.

Suggested upstream change: move the dependency to minimatch 11 and replace the removed private traversal primitive with the supported `Minimatch#match(path, true)` partial matching API, preserving the existing Windows/root-path tests. Then consumers can return to the official SDK without a compatibility adapter.


The filesystem migration regression also covers implicit descendants for both
positive and negative directory patterns, ordered exclusions/re-inclusions,
multiple negation signs, comment lines and current-user tilde expansion. A
native glob ignore of `excluded-directory` alone still includes its children;
the adapter must expand descendants and preserve order rather than merge all
negative patterns globally. The five bounded tests for both action copies are
[here](https://github.com/link-foundation/links-notation/blob/issue-405-e18bfd98e937/experiments/issue-405/artifact-files.test.mjs).
