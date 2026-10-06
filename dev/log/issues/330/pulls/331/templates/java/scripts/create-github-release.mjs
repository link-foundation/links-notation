#!/usr/bin/env node
/**
 * GitHub release creation script.
 *
 * Creates a GitHub release with changelog content for a specific version.
 *
 * Usage:
 *   bun scripts/create-github-release.mjs --release-version <version> --repository <owner/repo>
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Parse command line arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let releaseVersion = null;
  let repository = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--release-version' && args[i + 1]) {
      releaseVersion = args[i + 1];
      i++;
    } else if (args[i] === '--repository' && args[i + 1]) {
      repository = args[i + 1];
      i++;
    }
  }

  if (!releaseVersion) {
    console.error('Usage: create-github-release.mjs --release-version <version> --repository <owner/repo>');
    process.exit(1);
  }

  return { releaseVersion, repository };
}

/**
 * Extract changelog content for a specific version.
 * @param {string} changelogPath - Path to CHANGELOG.md
 * @param {string} version - Version to extract
 * @returns {string} Changelog content for the version
 */
function extractChangelogContent(changelogPath, version) {
  if (!existsSync(changelogPath)) {
    return `Release ${version}`;
  }

  const changelog = readFileSync(changelogPath, 'utf-8');

  // Find the section for this version
  const versionHeader = `## [${version}]`;
  const startIndex = changelog.indexOf(versionHeader);

  if (startIndex === -1) {
    return `Release ${version}`;
  }

  // Find the end of this version's section (next version header or end of file)
  const contentStart = changelog.indexOf('\n', startIndex) + 1;
  const nextVersionMatch = changelog.slice(contentStart).match(/\n## \[/);
  const endIndex = nextVersionMatch
    ? contentStart + nextVersionMatch.index
    : changelog.length;

  let content = changelog.slice(contentStart, endIndex).trim();

  return content;
}

/**
 * Create GitHub release using gh CLI.
 * @param {string} version - Version tag
 * @param {string} content - Release notes content
 * @param {string|null} repository - Repository in owner/repo format
 */
function createRelease(version, content, repository) {
  const tag = `v${version}`;
  const title = `Release ${version}`;

  const repoArg = repository ? `--repo ${repository}` : '';

  // Check if release already exists
  try {
    execSync(`gh release view ${tag} ${repoArg}`, { stdio: 'ignore' });
    console.log(`Release ${tag} already exists, skipping.`);
    return;
  } catch {
    // Release doesn't exist, continue with creation
  }

  // Create the release using stdin for body to avoid escaping issues
  const command = `gh release create ${tag} --title "${title}" --notes-file - ${repoArg}`;

  try {
    execSync(command, {
      input: content,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    console.log(`Created release ${tag}`);
  } catch (error) {
    console.error(`Failed to create release: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main function.
 */
function main() {
  const { releaseVersion, repository } = parseArgs();
  const projectRoot = process.cwd();
  const changelogPath = join(projectRoot, 'CHANGELOG.md');

  console.log(`Creating GitHub release for version ${releaseVersion}...`);

  const content = extractChangelogContent(changelogPath, releaseVersion);
  createRelease(releaseVersion, content, repository);

  console.log('\nGitHub release creation complete!');
}

main();
