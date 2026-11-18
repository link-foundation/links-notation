`glob-parent@7.0.0` pins `minimatch` to 10.2.6. That version is inside the affected range of [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

To reproduce in an empty directory with Node.js 26 and npm 12:

```sh
npm init -y
npm install --save-exact glob-parent@7.0.0
npm ls minimatch
npm audit
```

The dependency tree contains `glob-parent@7.0.0 → minimatch@10.2.6`. The registry audit reports the moderate advisory through that dependency.

Please update the manifest to a patched minimatch release, such as `^11.0.9`, and run the glob-parent suite against it. The current implementation imports `Minimatch` and reads its parsed `set`. We used an npm override scoped to `glob-parent` and verified that the two artifact-search consumers still handle recursive directories, exclusions and re-inclusions, home paths, and hidden and symlink policy. We can remove that override once a patched release is available.

Downstream: https://github.com/link-foundation/links-notation/pull/423
