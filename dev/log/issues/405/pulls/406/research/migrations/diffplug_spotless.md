# diffplug/spotless maven/3.11.0

Source: https://github.com/diffplug/spotless/releases/tag/maven/3.11.0

### Added
- Add `<cleanup>false</cleanup>` to `<googleJavaFormat>` to disable google-java-format's non-whitespace cleanups. ([#3157](https://github.com/diffplug/spotless/pull/3157))
- Add a `<maxLineLength>` parameter to `<googleJavaFormat>`. ([#3151](https://github.com/diffplug/spotless/issues/3151))  
  Overrides the 100-column limit prescribed by the GOOGLE and AOSP styles; requires `google-java-format` `2.0.0` or later.
### Changes
- Bump default `google-java-format` version `1.36.1` -> `2.0.0`.  ([#3157](https://github.com/diffplug/spotless/pull/3157))  
  This version applies some small non-whitespace cleanups by default (removing redundant semicolons, empty annotation parentheses, and parentheses around single lambda parameters), which can be disabled with `<cleanup>false</cleanup>`.
