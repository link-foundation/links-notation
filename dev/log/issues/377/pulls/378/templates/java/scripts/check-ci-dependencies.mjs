#!/usr/bin/env node
/** Check workflow action refs and separately downloaded CI tools against stable releases. */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const stableVersion = /^v?\d+\.\d+\.\d+$/;

export function collectDependencies(directory) {
  const dependencies = [];
  for (const name of readdirSync(directory).filter(name => /\.ya?ml$/.test(name))) {
    const path = resolve(directory, name);
    const yaml = readFileSync(path, 'utf8');
    let bunActions = 0;
    let bunVersions = 0;
    for (const [, literal] of yaml.matchAll(/^[ \t]*(?:-[ \t]+)?uses:[ \t]*([^\s#]+)/gm)) {
      const reference = literal.replace(/^(['"])(.*)\1$/, '$2');
      if (reference.startsWith('./')) continue;
      if (reference.startsWith('docker://')) {
        const match = reference.match(/^docker:\/\/rhysd\/actionlint:(\d+\.\d+\.\d+)@sha256:([a-f0-9]{64})$/);
        if (!match) throw new Error(`${name}: pin Actionlint to a version and sha256 digest`);
        dependencies.push({ path, repo: 'rhysd/actionlint', version: `v${match[1]}`, digest: `sha256:${match[2]}` });
        continue;
      }
      const match = reference.match(/^([\w.-]+\/[\w.-]+)(?:\/[^@]+)?@(v\d+\.\d+\.\d+)$/);
      if (!match) throw new Error(`${name}: use an exact stable action version: ${reference}`);
      dependencies.push({ path, repo: match[1], version: match[2] });
      if (match[1] === 'oven-sh/setup-bun') bunActions++;
    }
    for (const [, version] of yaml.matchAll(/^[ \t]*(?:-[ \t]+)?bun-version:[ \t]*['"]?([^\s'"#]+)/gm)) {
      if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`${name}: pin bun-version to an exact stable version`);
      dependencies.push({ path, repo: 'oven-sh/bun', version: `bun-v${version}` });
      bunVersions++;
    }
    if (bunActions !== bunVersions) throw new Error(`${name}: every setup-bun action must pin bun-version`);
  }
  return dependencies;
}

function latestRelease(repo) {
  // gh provides authentication without logging the token.
  const release = JSON.parse(execFileSync('gh', ['api', `repos/${repo}/releases/latest`], { encoding: 'utf8' }));
  const version = release.tag_name;
  const normalized = repo === 'oven-sh/bun' ? version?.replace(/^bun-/, '') : version;
  if (!stableVersion.test(normalized) || release.draft || release.prerelease) {
    throw new Error(`${repo}: latest release did not identify a stable version`);
  }
  return version;
}

async function actionlintDigest(version) {
  const response = await fetch(`https://registry.hub.docker.com/v2/repositories/rhysd/actionlint/tags/${version.replace(/^v/, '')}`);
  if (!response.ok) throw new Error(`Docker Hub: HTTP ${response.status} for Actionlint ${version}`);
  const data = await response.json();
  if (!/^sha256:[a-f0-9]{64}$/.test(data.digest)) throw new Error('Docker Hub returned no valid image digest');
  return data.digest;
}

/** Cache upstream lookups; stale versions, mismatched digests, and registry errors fail CI. */
export async function checkDependencies(dependencies, latest = latestRelease, digest = actionlintDigest) {
  const releases = new Map();
  const digests = new Map();
  const errors = [];
  for (const dependency of dependencies) {
    const { path, repo, version } = dependency;
    if (!releases.has(repo)) releases.set(repo, await latest(repo));
    const current = releases.get(repo);
    if (version !== current) {
      errors.push(`${path}: ${repo} ${version} is outdated; latest stable is ${current}`);
    }
    if (dependency.digest) {
      if (!digests.has(version)) digests.set(version, await digest(version));
      if (dependency.digest !== digests.get(version)) {
        errors.push(`${path}: Actionlint ${version} image digest does not match Docker Hub`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const dependencies = collectDependencies(resolve(import.meta.dirname, '..', '.github', 'workflows'));
    const errors = await checkDependencies(dependencies);
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`All ${dependencies.length} CI dependency declarations match their latest stable releases.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
