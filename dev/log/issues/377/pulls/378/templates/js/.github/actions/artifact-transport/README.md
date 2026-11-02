# Artifact SDK compatibility

This action keeps the official `@actions/artifact` client for authentication,
immutable artifact IDs, digests and transport. Scoped npm overrides pin the
SDK's original `unzip-stream` 0.3.4 and replace `archiver-utils`' deprecated
glob 10.5.0 with glob 13.0.6, which preserves the only API it uses,
`glob.sync`.

Downloads use the SDK's documented `skipDecompress` option and pass the digest
recorded at upload time as `expectedHash`, so the SDK still verifies every
downloaded archive. `zip.js` 2.24.0 then extracts it. The SDK's own reader,
unzip-stream, constructs deprecated `Buffer` instances; zip.js has no runtime
dependencies and supports ZIP64 and streamed decompression.

## Adapter inventory

`extract.mjs` implements the download/extraction adapter. All behavior used by
this action is implemented and tested:

| Contract                                  | Implementation and verification                                                                                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SDK transport, retries and digest results | Raw download into an owned temporary directory; reject missing/extra files and digest mismatches. `scripts/artifact-transport.mjs` retries transient failures. The hosted roundtrip exercises the actual SDK.                        |
| Complete extraction before success        | Await each file's streamed writer; return the destination only after extraction. The probe checks bytes immediately after return.                                                                                                    |
| Bounded memory and ZIP64                  | Read a disk-backed Blob; decompress one entry at a time without workers or whole-archive buffering. The probe uses real ZIP64 metadata with small files.                                                                             |
| Names and safety                          | Preserve binary, empty, nested and dot-prefixed files. Refuse traversal in either slash spelling, absolute and drive paths, and pre-existing destination links. Archive symlinks stay ordinary data files, as with the SDK's reader. |
| Corruption and cleanup                    | Verify CRC32; propagate malformed archive, filesystem and transport errors. Remove only the owned download directory on success and failure.                                                                                         |

Password-protected or split archives are not produced by this action and are
outside its contract. Concurrent untrusted modification of the destination is
not supported; jobs own their output directories.

Run `npm ci --prefix .github/actions/artifact-transport --ignore-scripts`, then
`node --pending-deprecation --throw-deprecation scripts/check-artifact-archive.mjs`.
The probe exercises the real archive dependencies, glob exclusions, ZIP64,
binary/empty/nested files, traversal, CRC failure, symlinks and cleanup. The
`Artifact Transport Regression` job in `workflows.yml` additionally uploads and
downloads bytes and a Pages tar file through GitHub. Deprecations fail these
checks instead of being suppressed.

Remove the glob override when its consumer ships a maintained compatible
dependency. Remove the extraction adapter and reader pin when the official SDK
provides a reader without runtime deprecations. Keep the local and hosted
assertions when updating versions. All three npm locks are audited on every PR
and on the weekly security schedule.

## Pages dependency adapter

`punycode.mjs` is a Node 24 module resolution hook scoped to the Pages
deployment step's process. Its CommonJS `punycode` / `node:punycode` imports
resolve to the pinned userland implementation 2.3.1; all other resolution is
unchanged. This follows the library's documented replacement for the
deprecated built-in module. Node's other warnings stay enabled, and
`--throw-deprecation` makes any runtime deprecation fail the deployment step.
No warning filter remains.

`scripts/check-pages-punycode.mjs` covers encode/decode, domain conversion,
UCS-2, invalid-input errors and unrelated module loading. It then runs the
unmodified upstream bundle at the immutable revision
368f82528645a54fb793d4d04e342629a3f51346: it reproduces the original warning
without the hook, then checks clean startup and the existing OIDC refusal with
it. The child process gets no credentials or OIDC endpoint, so the probe
cannot publish a deployment. Production deployment permissions and
preconditions are unchanged. Remove this adapter when the upstream bundle
stops importing the built-in module; keep the startup and warning assertions.

Sources: [known upstream defect](https://github.com/actions/deploy-pages/issues/413),
[userland import instructions](https://github.com/mathiasbynens/punycode.js#installation),
[Node module hooks](https://nodejs.org/docs/latest-v24.x/api/module.html#moduleregisterhooksoptions).
