import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { registryTargets } from '../../scripts/release-audit.mjs';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const name = 'links-notation';

test('primary package manifests use links-notation with only required registry namespaces', () => {
  assert.equal(JSON.parse(read('js/package.json')).name, name);
  assert.match(read('python/pyproject.toml'), /^name = "links-notation"$/m);
  assert.match(read('rust/links-notation/Cargo.toml'), /^name = "links-notation"$/m);
  assert.match(read('csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj'), /<PackageId>links-notation<\/PackageId>/);
  assert.match(read('java/pom.xml'), /<artifactId>links-notation<\/artifactId>/);
  assert.match(read('kotlin/build.gradle.kts'), /coordinates\("io\.github\.link-foundation\.kotlin", "links-notation",/);
  assert.match(read('Package.swift'), /Package\(\s*name: "links-notation",/);
  assert.equal(JSON.parse(read('composer.json')).name, 'link-foundation/links-notation');
});

test('release verification uses the canonical NuGet name and distinct Java/Kotlin groups', () => {
  const targets = registryTargets(Object.fromEntries(['js', 'python', 'rust', 'csharp', 'java', 'kotlin', 'go', 'php', 'cpp', 'swift'].map((key) => [key, '1.2.3'])));
  const target = (binding) => targets.find((entry) => entry.name === binding);
  assert.ok(target('csharp').urls.every((url) => url.includes('/links-notation/')));
  assert.equal(target('java').artifact, name);
  assert.equal(target('kotlin').artifact, name);
  assert.equal(target('java').group, 'io.github.link-foundation');
  assert.equal(target('kotlin').group, 'io.github.link-foundation.kotlin');
  for (const workflow of ['csharp.yml', 'publish-csharp.yml']) {
    assert.match(read(`.github/workflows/${workflow}`), /PACKAGE_ID: links-notation\n/);
  }
  assert.match(read('.github/workflows/publish-kotlin.yml'), /PACKAGE_GROUP=io\.github\.link-foundation\.kotlin\n\s+PACKAGE_ARTIFACT=links-notation\n/);
});
