import { createHash } from 'node:crypto';

const suffixes = ['android', 'iosarm64', 'iossimulatorarm64', 'iosx64', 'js', 'jvm', 'wasm-js'];
const type = (suffix) => suffix === 'android' ? 'androidJvm' : suffix.startsWith('ios') ? 'native' : suffix === 'wasm-js' ? 'wasm' : suffix;
const usages = (suffix) => ['android', 'jvm'].includes(suffix) ? ['java-api', 'java-runtime'] : suffix.startsWith('ios') ? ['kotlin-api', 'kotlin-metadata'] : ['kotlin-api', 'kotlin-runtime'];
const attributes = (suffix, usage) => ({
  'org.jetbrains.kotlin.platform.type': suffix ? type(suffix) : 'common',
  ...(usage === 'sources' ? { 'org.gradle.category': 'documentation', 'org.gradle.docstype': 'sources' }
    : { 'org.gradle.category': 'library', 'org.gradle.usage': usage }),
});

export function mavenResponse(url, version = '1.2.3') {
  if (!url.includes('repo1.maven.org')) return null;
  const filename = url.split('/').at(-1);
  if (!filename) return new Response('', { status: 404 });
  if (url.endsWith('.asc')) return new Response('test-detached-signature');
  if (url.endsWith('.sha256')) return new Response(createHash('sha256').update('test-artifact').digest('hex'));
  const module = url.split('/').at(-3);
  if (url.endsWith('.pom')) return new Response(`<project><groupId>io.github.link-foundation</groupId><artifactId>${module}</artifactId><version>${version}</version></project>`);
  if (url.endsWith('.module')) {
    const root = 'links-notation-kotlin';
    const suffix = module === root ? '' : module.slice(root.length + 1);
    const file = { name: `${module}-${version}.jar`, url: `${module}-${version}.jar`, size: 13,
      sha256: createHash('sha256').update('test-artifact').digest('hex') };
    const variants = (suffix ? [...usages(suffix), 'sources'] : ['kotlin-metadata', 'sources']).map((usage) => ({
      name: usage, attributes: attributes(suffix, usage), files: [file],
    }));
    if (!suffix) for (const platform of suffixes) for (const usage of [...usages(platform), 'sources']) {
      variants.push({ name: `${platform}-${usage}`, attributes: attributes(platform, usage), 'available-at': {
        group: 'io.github.link-foundation', module: `${root}-${platform}`, version,
        url: `../../${root}-${platform}/${version}/${root}-${platform}-${version}.module`,
      } });
    }
    return new Response(JSON.stringify({ formatVersion: '1.1', component: { group: 'io.github.link-foundation', module: root, version }, variants }));
  }
  return new Response('test-artifact');
}
