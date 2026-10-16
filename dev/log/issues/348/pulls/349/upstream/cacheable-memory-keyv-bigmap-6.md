# @cacheable/memory: move to keyv 6 / @keyv/bigmap 6

`@cacheable/memory` 2.2.0, the latest release, depends on `@keyv/bigmap` `^1.3.1` and `keyv` `^5.6.0`. Two other releases are already out:

- `@keyv/bigmap` 6.0.0 was published on 2026-08-04, and 6.1.0 is the latest (peer `keyv ^6.1.0`, `engines.node >= 22.19.0`);
- keyv 6.1.0 is the latest keyv, and jaredwray/keyv#1834 says v5 now gets only maintenance and security fixes.

The `main` branch of this repository still has `"@keyv/bigmap": "^1.3.1"` in `packages/memory/package.json`.

## Reproduction

```console
$ npm init -y >/dev/null && npm i @cacheable/memory@2.2.0
$ npm ls @keyv/bigmap keyv
`-- @cacheable/memory@2.2.0
  +-- @cacheable/utils@2.5.0
  | `-- keyv@5.6.0 deduped
  +-- @keyv/bigmap@1.3.1
  | `-- keyv@5.6.0 deduped
  `-- keyv@5.6.0
```

(Node 26.11.1, npm 11.20.0.) ESLint 10.13.0 pulls this in through `file-entry-cache` 11.1.5 → `flat-cache` 6.1.23 → `cacheable` 2.5.0 → `@cacheable/memory` 2.2.0. So every ESLint user carries `@keyv/bigmap` 1.3.1 and `keyv` 5.

## Impact downstream

link-foundation/links-notation#348 updates every dependency, including transitive lockfile entries, to the latest release. `@keyv/bigmap` and `keyv` are the entries in `js/package-lock.json` that no consumer-side change can move. The workaround is to leave them at 1.3.1 and 5.6.0 and record why, in link-foundation/links-notation#349.

## Suggested fix

Follow the [keyv v5 → v6 migration guide](https://keyv.org/docs/v5-to-v6/) in `@cacheable/memory`, `@cacheable/utils` and `cacheable`. Then raise `@keyv/bigmap` to `^6.1.0` and `keyv` to `^6.1.0`. The `node >= 22.19.0` floor of bigmap 6 would become the floor of `@cacheable/memory`, so this is probably a major release. Is a keyv 6 migration already planned for the cacheable packages? If so, a link to it would be enough to close this.
