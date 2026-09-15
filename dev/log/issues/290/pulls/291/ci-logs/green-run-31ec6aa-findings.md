# Evidence extracted from the green runs on 31ec6aa (2026-08-28)

Both findings below appear only in step output. Neither produced a check-run annotation, and
both runs are green.

## go 33157870713 — Upload coverage (step outcome: success)
```
2026-08-28T09:05:36.9539428Z ==> Running upload-coverage
2026-08-28T09:05:36.9550053Z       ./codecov  upload-coverage --git-service github --sha 31ec6aabd26f439b599e0cc6ed3c30013b1900e8 --file go/coverage.out --flag go --gcov-executable gcov
2026-08-28T09:05:37.2922871Z info - 2026-08-28 09:05:37,291 -- ci service found: github-actions
2026-08-28T09:05:37.2989946Z warning - 2026-08-28 09:05:37,298 -- No config file could be found. Ignoring config.
2026-08-28T09:05:37.3261851Z warning - 2026-08-28 09:05:37,325 -- xcrun is not installed or can't be found.
2026-08-28T09:05:37.3323661Z warning - 2026-08-28 09:05:37,332 -- No gcov data found.
2026-08-28T09:05:37.3326766Z warning - 2026-08-28 09:05:37,332 -- coverage.py is not installed or can't be found.
2026-08-28T09:05:37.3572099Z info - 2026-08-28 09:05:37,356 -- Found 2 coverage files to report
2026-08-28T09:05:37.3573598Z info - 2026-08-28 09:05:37,357 -- > /home/runner/work/links-notation/links-notation/experiments/test_coverage_data.json
2026-08-28T09:05:37.3574967Z info - 2026-08-28 09:05:37,357 -- > /home/runner/work/links-notation/links-notation/go/coverage.out
2026-08-28T09:05:37.8373846Z info - 2026-08-28 09:05:37,837 -- Upload queued for processing complete
2026-08-28T09:05:37.8375275Z error - 2026-08-28 09:05:37,837 -- Upload queued for processing failed: {"message":"Token required - not valid tokenless upload"}
2026-08-28T09:05:38.0187431Z ##[end-action id=__codecov_codecov-action.__run_8;outcome=success;conclusion=success;duration_ms=2270]
```

## pages 33157870661 — Build website
```
2026-08-28T09:05:00.0943507Z (!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
2026-08-28T09:05:00.0944486Z   - ESM syntax in a file loaded as CommonJS (vite.config.js:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
2026-08-28T09:05:00.0945246Z Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```
