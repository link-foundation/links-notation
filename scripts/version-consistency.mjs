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

import { declaredVersions } from './declared-versions.mjs';

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

process.exit(failed ? 1 : 0);
