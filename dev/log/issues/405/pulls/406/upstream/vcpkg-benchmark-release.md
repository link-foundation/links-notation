The current vcpkg master baseline `414b5330a184ea5fbc6ca29f7960b189f6b0392f` contains benchmark 1.9.5, while google/benchmark has released v1.10.0.

Reproduction:

```json
{
  "name": "benchmark-version-repro",
  "version-string": "0.1.0",
  "builtin-baseline": "414b5330a184ea5fbc6ca29f7960b189f6b0392f",
  "dependencies": ["benchmark"]
}
```

Resolving this manifest selects 1.9.5. The upstream release is https://github.com/google/benchmark/releases/tag/v1.10.0 .

Would you update the benchmark port and version database to 1.10.0, including its source hash and platform checks? In link-foundation/links-notation#406 we update the archived template to the current official baseline and document the registry lag, retaining the supported port rather than introducing an unreviewed local overlay.
