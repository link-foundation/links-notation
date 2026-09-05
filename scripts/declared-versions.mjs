// The version each language implementation declares in its own source tree.
//
// Kept in one place because two checks need it: scripts/version-consistency.mjs
// (do the implementations agree with each other?) and scripts/release-audit.mjs
// (does each one agree with its registry?).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
export const read = (p) => readFileSync(join(root, p), 'utf8');

export const match = (text, re, what) => {
  const m = text.match(re);
  if (!m) throw new Error(`could not read ${what}`);
  return m[1].trim();
};

export const declaredVersions = {
  js: () => JSON.parse(read('js/package.json')).version,
  python: () => match(read('python/pyproject.toml'), /^version\s*=\s*"([^"]+)"/m, 'python version'),
  rust: () => match(read('rust/links-notation/Cargo.toml'), /^version\s*=\s*"([^"]+)"/m, 'rust version'),
  csharp: () =>
    match(
      read('csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj'),
      /<VersionPrefix>([^<]+)<\/VersionPrefix>/,
      'csharp version',
    ),
  go: () => read('go/VERSION').trim(),
  java: () =>
    match(
      read('java/pom.xml'),
      /<artifactId>links-notation<\/artifactId>\s*<version>([^<]+)<\/version>/,
      'java version',
    ),
  php: () => JSON.parse(read('php/composer.json')).version,
};
