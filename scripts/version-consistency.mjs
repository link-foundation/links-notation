#!/usr/bin/env node
// Fails when the language implementations do not all declare the same version.
//
// The point of shipping the same grammar in seven languages is that a document
// written by one reads identically in the others, which only holds while they
// are the same release. They had drifted to js/python/rust/csharp/go 0.15.0,
// java 0.3.0 and php 0.2.0 before this check existed, and nothing failed.
//
// Run it locally with `node scripts/version-consistency.mjs`; CI runs it from
// .github/workflows/release-audit.yml on every pull request. Unlike the
// registry audit, this one is a hard failure: it reads only the working tree,
// so it is deterministic and a disagreement is always a defect.

import { declaredVersions, read, match } from './declared-versions.mjs';

// Versions typed by hand into installation snippets. A reader copies these
// verbatim, so a stale one hands out a release sixteen minors old, which is
// exactly what both Java READMEs (0.1.0) and both PHP ones ("^0.1") did while
// every implementation declared 0.17.0. Checked here rather than corrected once
// because a literal that nothing verifies drifts again on the next release.
const documentedVersions = [
  {
    of: 'java',
    file: 'java/README.md',
    what: 'the Maven snippet',
    re: /<artifactId>links-notation<\/artifactId>\s*<version>([^<]+)<\/version>/,
  },
  {
    of: 'java',
    file: 'java/README.md',
    what: 'the Gradle snippet',
    re: /io\.github\.link-foundation:links-notation:([^']+)'/,
  },
  {
    of: 'java',
    file: 'java/README.ru.md',
    what: 'the Maven snippet',
    re: /<artifactId>links-notation<\/artifactId>\s*<version>([^<]+)<\/version>/,
  },
  {
    of: 'java',
    file: 'java/README.ru.md',
    what: 'the Gradle snippet',
    re: /io\.github\.link-foundation:links-notation:([^']+)'/,
  },
  {
    of: 'php',
    file: 'php/README.md',
    what: 'the composer.json snippet',
    re: /"link-foundation\/links-notation":\s*"\^([^"]+)"/,
    // A caret constraint pins major.minor, so it tracks 0.17.0 as "0.17".
    expected: (version) => version.split('.').slice(0, 2).join('.'),
  },
  {
    of: 'php',
    file: 'php/README.ru.md',
    what: 'the composer.json snippet',
    re: /"link-foundation\/links-notation":\s*"\^([^"]+)"/,
    expected: (version) => version.split('.').slice(0, 2).join('.'),
  },
];

const declared = new Map();
let failed = false;

for (const [name, read] of Object.entries(declaredVersions)) {
  try {
    declared.set(name, read());
  } catch (error) {
    console.log(`::error::${name}: ${error.message}`);
    failed = true;
  }
}

const byVersion = new Map();
for (const [name, version] of declared) {
  if (!byVersion.has(version)) byVersion.set(version, []);
  byVersion.get(version).push(name);
}

for (const [name, version] of declared) console.log(`${name}: ${version}`);

if (byVersion.size > 1) {
  const groups = [...byVersion.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([version, names]) => `${version} (${names.join(', ')})`)
    .join('; ');
  console.log(`::error::the implementations declare different versions: ${groups}`);
  failed = true;
} else if (!failed) {
  console.log(`\nAll ${declared.size} implementations declare ${[...byVersion.keys()][0]}.`);
}

for (const { of, file, what, re, expected } of documentedVersions) {
  const version = declared.get(of);
  if (version === undefined) continue; // its declared version already failed above
  const want = expected ? expected(version) : version;
  let found;
  try {
    found = match(read(file), re, `${what} in ${file}`);
  } catch (error) {
    console.log(`::error::${error.message}`);
    failed = true;
    continue;
  }
  if (found !== want) {
    console.log(`::error::${file}: ${what} installs ${found}, but ${of} declares ${version}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
