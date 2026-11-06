#!/usr/bin/env node
// Exact, immutable publication evidence. Directory listings are not evidence
// of namespace ownership or artifact delivery.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const group = 'io.github.link-foundation';
const base = 'https://repo1.maven.org/maven2/io/github/link-foundation/';
const root = 'links-notation-kotlin';
const fingerprint = '75CE1DB5A7CB47FFCF2D39581FA0DD27D01D0D2C';
const platforms = {
  android: ['androidJvm', 'java-api', 'java-runtime'],
  jvm: ['jvm', 'java-api', 'java-runtime'],
  iosarm64: ['native', 'kotlin-api', 'kotlin-metadata'],
  iossimulatorarm64: ['native', 'kotlin-api', 'kotlin-metadata'],
  iosx64: ['native', 'kotlin-api', 'kotlin-metadata'],
  js: ['js', 'kotlin-api', 'kotlin-runtime'],
  'wasm-js': ['wasm', 'kotlin-api', 'kotlin-runtime'],
};

export function verifyMavenSignature(bytes, signature, url) {
  const temp = mkdtempSync(join(tmpdir(), 'lino-maven-'));
  try {
    const keyring = join(temp, 'public.gpg');
    const key = fileURLToPath(new URL('./maven-signing-key.asc', import.meta.url));
    const dearmor = spawnSync('gpg', ['--no-options', '--batch', '--homedir', temp, '--dearmor', '--output', keyring, key]);
    if (dearmor.status !== 0) throw new Error('Cannot load the pinned Maven public key');
    writeFileSync(join(temp, 'artifact'), bytes);
    writeFileSync(join(temp, 'signature'), signature);
    const result = spawnSync('gpgv', ['--homedir', temp, '--status-fd', '1', '--keyring', keyring,
      join(temp, 'signature'), join(temp, 'artifact')], { encoding: 'utf8' });
    // VALIDSIG includes the signing fingerprint and, for a subkey, its primary
    // fingerprint. Require our pinned primary in addition to gpgv success.
    if (result.status !== 0 || !result.stdout?.split('\n').some((line) =>
      line.startsWith('[GNUPG:] VALIDSIG ') && line.split(' ').includes(fingerprint)))
      throw new Error(`Signature verification failed for ${url}`);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

// Read direct project children, never a dependency's coordinates. Deliberately
// reject entity declarations; publication POMs carry literal coordinates.
export function pomCoordinates(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsupported POM entity declaration');
  const stack = [], coordinates = {};
  for (const token of xml.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) ?? []) {
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (token.startsWith('</')) {
      const name = token.slice(2, -1).trim().split(':').at(-1);
      if (stack.pop() !== name) throw new Error('Malformed POM XML');
    } else if (token.startsWith('<')) {
      const name = token.slice(1).split(/[\s/>]/)[0].split(':').at(-1);
      if (!token.endsWith('/>')) stack.push(name);
    } else if (stack.length === 2 && stack[0] === 'project' &&
      ['groupId', 'artifactId', 'version'].includes(stack[1])) {
      const name = stack[1];
      if (coordinates[name] !== undefined) throw new Error('Duplicate POM coordinate');
      coordinates[name] = token.trim();
    }
  }
  if (stack.length) throw new Error('Unbalanced POM XML');
  return coordinates;
}

export async function verifyCentral({ artifact, version, fetcher = fetch,
  verifySignature = verifyMavenSignature, requests = [], verbose = false, log = console.log }) {
  if (!['links-notation', root].includes(artifact) || !/^\d+\.\d+\.\d+$/.test(version))
    throw new Error('Unsupported Maven coordinate');
  const directory = (module) => `${base}${module}/${version}/`;
  const prefix = (module) => `${directory(module)}${module}-${version}`;
  const stats = { present: true, coordinates: 0, files: 0, signatures: 0 };
  const get = async (url, rootPom = false) => {
    const response = await fetcher(url, { headers: { 'user-agent': 'links-notation-release-audit' }, signal: AbortSignal.timeout(30000) });
    requests.push({ url, status: response.status });
    if (verbose) log(`GET ${url} -> ${response.status}`);
    if (!response.ok) {
      await response.body?.cancel();
      if (rootPom && response.status === 404) return null;
      const error = new Error(`${response.status === 404 ? 'Incomplete Maven publication: ' : ''}GET ${url}: HTTP ${response.status}`);
      error.propagating = response.status === 404;
      throw error;
    }
    return Buffer.from(await response.arrayBuffer());
  };
  const signed = async (url, bytes) => {
    bytes ??= await get(url);
    await verifySignature(bytes, await get(`${url}.asc`), url);
    stats.signatures++;
    return bytes;
  };
  const pom = async (module, bytes) => {
    const url = `${prefix(module)}.pom`;
    const content = await signed(url, bytes);
    const coordinates = pomCoordinates(content.toString('utf8'));
    if (coordinates.groupId !== group || coordinates.artifactId !== module || coordinates.version !== version)
      throw new Error(`Unexpected POM coordinates at ${url}`);
    stats.coordinates++;
  };
  const first = await get(`${prefix(artifact)}.pom`, true);
  if (first === null) return { ...stats, present: false };
  await pom(artifact, first);
  if (artifact === 'links-notation') {
    for (const suffix of ['', '-sources', '-javadoc']) {
      const url = `${prefix(artifact)}${suffix}.jar`;
      const bytes = await signed(url);
      const checksum = (await get(`${url}.sha256`)).toString('utf8').trim().split(/\s+/)[0];
      if (!/^[a-f0-9]{64}$/i.test(checksum) || createHash('sha256').update(bytes).digest('hex') !== checksum.toLowerCase())
        throw new Error(`SHA-256 mismatch at ${url}`);
      stats.files++;
    }
    return stats;
  }
  const expectedModules = [root, ...Object.keys(platforms).map((suffix) => `${root}-${suffix}`)];
  const allFiles = new Map();
  for (const module of expectedModules) {
    if (module !== root) await pom(module);
    const moduleUrl = `${prefix(module)}.module`;
    const metadata = JSON.parse((await signed(moduleUrl)).toString('utf8'));
    // Gradle target metadata deliberately names the root component. The
    // target coordinate is the available-at.module STRING and its own POM.
    if (metadata.component?.group !== group || metadata.component.module !== root || metadata.component.version !== version ||
      !Array.isArray(metadata.variants) || !metadata.variants.length)
      throw new Error(`Unexpected Gradle component/variants at ${moduleUrl}`);
    const remote = new Map();
    for (const variant of metadata.variants) {
      const at = variant['available-at'];
      if (at) {
        if (module !== root || at.group !== group || at.version !== version ||
          !expectedModules.slice(1).includes(at.module) || typeof at.url !== 'string' ||
          new URL(at.url, moduleUrl).href !== `${prefix(at.module)}.module`)
          throw new Error(`Invalid available-at coordinate at ${moduleUrl}`);
        if (!remote.has(at.module)) remote.set(at.module, []);
        remote.get(at.module).push(variant);
      } else {
        if (!Array.isArray(variant.files) || !variant.files.length)
          throw new Error(`Missing variant files at ${moduleUrl}`);
        for (const file of variant.files) {
          const fileUrl = new URL(file.url, moduleUrl).href;
          if (!fileUrl.startsWith(directory(module)) || new URL(fileUrl).search || new URL(fileUrl).hash ||
            typeof file.url !== 'string' || !Number.isSafeInteger(file.size) || file.size < 0 ||
            !/^[a-f0-9]{64}$/i.test(file.sha256 ?? ''))
            throw new Error(`Invalid variant file/hash at ${moduleUrl}`);
          if (allFiles.has(fileUrl) && JSON.stringify(allFiles.get(fileUrl)) !== JSON.stringify(file))
            throw new Error(`Conflicting variant file metadata at ${fileUrl}`);
          allFiles.set(fileUrl, file);
        }
      }
    }
    const requireVariants = (variants, [type, ...usages], label) => {
      for (const usage of [...usages, 'sources']) {
        if (!variants.some(({ attributes: attrs }) => attrs?.['org.jetbrains.kotlin.platform.type'] === type &&
          (usage === 'sources' ? attrs['org.gradle.docstype'] === 'sources' : attrs['org.gradle.usage'] === usage)))
          throw new Error(`Missing ${label} ${usage} variant`);
      }
    };
    if (module === root) {
      requireVariants(metadata.variants.filter((v) => !v['available-at']), ['common', 'kotlin-metadata'], 'common');
      for (const [suffix, contract] of Object.entries(platforms))
        requireVariants(remote.get(`${root}-${suffix}`) ?? [], contract, suffix);
    } else requireVariants(metadata.variants, platforms[module.slice(root.length + 1)], module);
  }
  for (const [url, file] of allFiles) {
    const bytes = await signed(url);
    if (bytes.length !== file.size) throw new Error(`Size mismatch at ${url}`);
    for (const algorithm of ['sha256', 'sha512']) {
      if (file[algorithm] && createHash(algorithm).update(bytes).digest('hex') !== file[algorithm].toLowerCase())
        throw new Error(`${algorithm} mismatch at ${url}`);
    }
    stats.files++;
  }
  return stats;
}

export async function waitForCentral(options, { attempts = 30, delay = 30000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), log = console.log } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await verifyCentral(options);
      if (result.present) {
        log(`Verified ${options.artifact}@${options.version}: ${result.coordinates} coordinates, ${result.files} files, ${result.signatures} signatures`);
        return result;
      }
    } catch (error) {
      // Only definite propagation (404) can safely be polled. Auth, service,
      // transport and content failures remain unknown/failures, not absence.
      if (!error.propagating) throw error;
    }
    if (attempt < attempts) { log(`Maven publication incomplete (${attempt}/${attempts}); waiting for exact artifacts.`); await sleep(delay); }
  }
  throw new Error(`Maven publication incomplete after ${attempts} attempts`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await waitForCentral({ artifact: process.env.PACKAGE_ARTIFACT, version: process.env.PACKAGE_VERSION }); }
  catch (error) { console.error(`::error::${error.message}`); process.exitCode = 1; }
}
