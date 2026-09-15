// Asks each registry what the current release of every dependency this
// repository declares is, so the bumps in #292 can be checked against the
// registries rather than against the (already stale) tables in the issue.
//
//   node experiments/issue-292/registry-latest.mjs

const npm = async (name) =>
  (await (await fetch(`https://registry.npmjs.org/${name}/latest`)).json()).version;

const pypi = async (name) =>
  (await (await fetch(`https://pypi.org/pypi/${name}/json`)).json()).info.version;

const crates = async (name) =>
  (await (await fetch(`https://crates.io/api/v1/crates/${name}`, {
    headers: { 'User-Agent': 'links-notation-dependency-audit' },
  })).json()).crate.max_stable_version;

const nuget = async (name) => {
  const id = name.toLowerCase();
  const { versions } = await (
    await fetch(`https://api.nuget.org/v3-flatcontainer/${id}/index.json`)
  ).json();
  return versions.filter((v) => !v.includes('-')).at(-1);
};

// search.maven.org's solr index answered with 5.12.2 for junit-bom while
// repo1 already served 6.1.3, so read the repository's own metadata instead.
const maven = async (coordinates) => {
  const path = coordinates.replace(/[.:]/g, '/');
  const metadata = await (
    await fetch(`https://repo1.maven.org/maven2/${path}/maven-metadata.xml`)
  ).text();
  return metadata.match(/<latest>([^<]+)<\/latest>/)[1];
};

const packagist = async (name) => {
  const { packages } = await (
    await fetch(`https://repo.packagist.org/p2/${name}.json`)
  ).json();
  return packages[name].find((r) => !/-(alpha|beta|RC)/i.test(r.version)).version;
};

const DEPENDENCIES = [
  ['js', 'bun-types', npm],
  ['js', 'eslint', npm],
  ['js', 'peggy', npm],
  ['js', 'prettier', npm],
  ['js', 'typescript', npm],
  ['python', 'pytest', pypi],
  ['python', 'pytest-timeout', pypi],
  ['python', 'black', pypi],
  ['python', 'isort', pypi],
  ['python', 'flake8', pypi],
  ['rust', 'nom', crates],
  ['rust', 'syn', crates],
  ['rust', 'quote', crates],
  ['rust', 'proc-macro2', crates],
  ['csharp', 'xunit.v3', nuget],
  ['csharp', 'Pegasus', nuget],
  ['csharp', 'Platform.Collections', nuget],
  ['csharp', 'Microsoft.SourceLink.GitHub', nuget],
  ['java', 'org.junit:junit-bom', maven],
  ['java', 'com.diffplug.spotless:spotless-maven-plugin', maven],
  ['java', 'com.google.googlejavaformat:google-java-format', maven],
  ['php', 'phpunit/phpunit', packagist],
  ['php', 'squizlabs/php_codesniffer', packagist],
];

const results = await Promise.all(
  DEPENDENCIES.map(async ([language, name, lookup]) => {
    try {
      return [language, name, await lookup(name)];
    } catch (error) {
      return [language, name, `error: ${error.message}`];
    }
  }),
);

for (const [language, name, version] of results) {
  console.log(`${language}\t${name}\t${version}`);
}
