#!/usr/bin/env node
// Reports, for every language implementation in this repository, the version
// declared in the source tree next to the version actually available on that
// language's registry.
//
// This exists because the release jobs used to gate on
// `needs.<publishJob>.result == 'success'`, which is also what a job reports
// when its publish step did nothing. That produced green runs and GitHub
// releases for packages that were never pushed, and nothing noticed the drift.
// Run it locally with `node scripts/release-audit.mjs`; CI runs it from
// .github/workflows/release-audit.yml and annotates every mismatch.

import { declaredVersions, match, read } from './declared-versions.mjs';

const verbose = process.env.CI_VERBOSE === 'true';

// On a pull request no publish job runs, so a bumped version being ahead of
// the registry is the expected state and not drift worth annotating. The
// workflow sets this to 'false' there and leaves it unset (meaning true)
// everywhere else.
const expectPublished = process.env.AUDIT_EXPECT_PUBLISHED !== 'false';

// `::warning::` on a run where being ahead is expected is a false positive, so
// the same finding is reported at the severity the context actually warrants.
const report = (message) => console.log(expectPublished ? `::warning::${message}` : `::notice::${message}`);

async function head(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'links-notation-release-audit' } });
  if (verbose) console.log(`  GET ${url} -> ${response.status}`);
  return response;
}

const languages = [
  {
    name: 'js',
    registry: 'npm',
    declared: declaredVersions.js,
    published: async () => {
      const name = JSON.parse(read('js/package.json')).name;
      const r = await head(`https://registry.npmjs.org/${name}`);
      if (!r.ok) return null;
      return (await r.json())['dist-tags']?.latest ?? null;
    },
  },
  {
    name: 'python',
    registry: 'PyPI',
    declared: declaredVersions.python,
    published: async () => {
      const name = match(read('python/pyproject.toml'), /^name\s*=\s*"([^"]+)"/m, 'python name');
      const r = await head(`https://pypi.org/pypi/${name}/json`);
      if (!r.ok) return null;
      return (await r.json()).info.version;
    },
  },
  {
    name: 'rust',
    registry: 'crates.io',
    declared: declaredVersions.rust,
    published: async () => {
      const r = await head('https://crates.io/api/v1/crates/links-notation');
      if (!r.ok) return null;
      return (await r.json()).crate.max_version;
    },
  },
  {
    name: 'csharp',
    registry: 'NuGet.org',
    declared: declaredVersions.csharp,
    published: async () => {
      const r = await head('https://api.nuget.org/v3-flatcontainer/link.foundation.links.notation/index.json');
      if (!r.ok) return null;
      const versions = (await r.json()).versions;
      return versions[versions.length - 1] ?? null;
    },
  },
  {
    name: 'go',
    registry: 'proxy.golang.org',
    declared: declaredVersions.go,
    published: async () => {
      const r = await head('https://proxy.golang.org/github.com/link-foundation/links-notation/go/@latest');
      if (!r.ok) return null;
      return (await r.json()).Version.replace(/^v/, '');
    },
  },
  {
    name: 'java',
    registry: 'Maven Central',
    declared: declaredVersions.java,
    published: async () => {
      const r = await head(
        'https://repo1.maven.org/maven2/io/github/link-foundation/links-notation/maven-metadata.xml',
      );
      if (!r.ok) return null;
      const xml = await r.text();
      return xml.match(/<latest>([^<]+)<\/latest>/)?.[1] ?? null;
    },
  },
  {
    name: 'php',
    registry: 'Packagist',
    declared: declaredVersions.php,
    published: async () => {
      const r = await head('https://repo.packagist.org/p2/link-foundation/links-notation.json');
      if (!r.ok) return null;
      const body = await r.json();
      const versions = body.packages?.['link-foundation/links-notation'];
      if (!Array.isArray(versions) || versions.length === 0) return null;
      return versions[0].version.replace(/^v/, '');
    },
  },
];

let drift = 0;

for (const language of languages) {
  let declared;
  try {
    declared = language.declared();
  } catch (error) {
    console.log(`::error::${language.name}: ${error.message}`);
    drift += 1;
    continue;
  }

  let published;
  try {
    published = await language.published();
  } catch (error) {
    console.log(`::warning::${language.name}: could not query ${language.registry}: ${error.message}`);
    continue;
  }

  if (published === null) {
    report(
      `${language.name}: declared ${declared}, but nothing is published on ${language.registry}. ` +
        `The publish job for this language has never successfully released anything.`,
    );
    drift += 1;
  } else if (published !== declared) {
    report(`${language.name}: declared ${declared}, latest on ${language.registry} is ${published}.`);
    drift += 1;
  } else {
    console.log(`${language.name}: ${declared} (in sync with ${language.registry})`);
  }
}

if (drift === 0) {
  console.log('\nAll implementations are in sync with their registries.');
} else if (expectPublished) {
  console.log(`\n${drift} implementation(s) drifted.`);
} else {
  console.log(`\n${drift} implementation(s) are ahead of their registries, which is expected before the release runs.`);
}
// Drift is reported, not enforced: a version bump legitimately precedes the
// release that publishes it.
process.exit(0);
