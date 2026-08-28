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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const verbose = process.env.CI_VERBOSE === 'true';

const match = (text, re, what) => {
  const m = text.match(re);
  if (!m) throw new Error(`could not read ${what}`);
  return m[1].trim();
};

async function head(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'links-notation-release-audit' } });
  if (verbose) console.log(`  GET ${url} -> ${response.status}`);
  return response;
}

const languages = [
  {
    name: 'js',
    registry: 'npm',
    declared: () => JSON.parse(read('js/package.json')).version,
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
    declared: () => match(read('python/pyproject.toml'), /^version\s*=\s*"([^"]+)"/m, 'python version'),
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
    declared: () => match(read('rust/links-notation/Cargo.toml'), /^version\s*=\s*"([^"]+)"/m, 'rust version'),
    published: async () => {
      const r = await head('https://crates.io/api/v1/crates/links-notation');
      if (!r.ok) return null;
      return (await r.json()).crate.max_version;
    },
  },
  {
    name: 'csharp',
    registry: 'NuGet.org',
    declared: () =>
      match(
        read('csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj'),
        /<VersionPrefix>([^<]+)<\/VersionPrefix>/,
        'csharp version',
      ),
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
    declared: () => read('go/VERSION').trim(),
    published: async () => {
      const r = await head('https://proxy.golang.org/github.com/link-foundation/links-notation/go/@latest');
      if (!r.ok) return null;
      return (await r.json()).Version.replace(/^v/, '');
    },
  },
  {
    name: 'java',
    registry: 'Maven Central',
    declared: () => match(read('java/pom.xml'), /<artifactId>links-notation<\/artifactId>\s*<version>([^<]+)<\/version>/, 'java version'),
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
    declared: () => JSON.parse(read('php/composer.json')).version,
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
    console.log(
      `::warning::${language.name}: declared ${declared}, but nothing is published on ${language.registry}. ` +
        `The publish job for this language has never successfully released anything.`,
    );
    drift += 1;
  } else if (published !== declared) {
    console.log(
      `::warning::${language.name}: declared ${declared}, latest on ${language.registry} is ${published}.`,
    );
    drift += 1;
  } else {
    console.log(`${language.name}: ${declared} (in sync with ${language.registry})`);
  }
}

console.log(drift === 0 ? '\nAll implementations are in sync with their registries.' : `\n${drift} implementation(s) drifted.`);
// Drift is reported, not enforced: a version bump legitimately precedes the
// release that publishes it.
process.exit(0);
