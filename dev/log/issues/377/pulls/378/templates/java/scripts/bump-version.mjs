#!/usr/bin/env node
/**
 * Version bumping utility for Maven projects.
 *
 * Bumps the version in pom.xml according to semantic versioning.
 *
 * Usage:
 *   bun scripts/bump-version.mjs --bump-type <major|minor|patch> [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Parse command line arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let bumpType = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bump-type' && args[i + 1]) {
      bumpType = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
    console.error('Usage: bump-version.mjs --bump-type <major|minor|patch> [--dry-run]');
    process.exit(1);
  }

  return { bumpType, dryRun };
}

/**
 * Read the current version from pom.xml.
 * @param {string} pomPath - Path to pom.xml
 * @returns {string} Current version
 */
function getCurrentVersion(pomPath) {
  const content = readFileSync(pomPath, 'utf-8');

  // Match the version tag in the project section (not in dependencies)
  const match = content.match(/<project[^>]*>[\s\S]*?<version>([^<]+)<\/version>/);
  if (!match) {
    throw new Error('Could not find version in pom.xml');
  }

  return match[1];
}

/**
 * Bump version according to semantic versioning.
 * @param {string} version - Current version (e.g., "1.2.3")
 * @param {string} bumpType - Type of bump: "major", "minor", or "patch"
 * @returns {string} New version
 */
function bumpVersion(version, bumpType) {
  const parts = version.split('.').map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }

  let [major, minor, patch] = parts;

  switch (bumpType) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
      patch++;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Update the version in pom.xml.
 * @param {string} pomPath - Path to pom.xml
 * @param {string} oldVersion - Current version
 * @param {string} newVersion - New version
 */
function updatePomVersion(pomPath, oldVersion, newVersion) {
  let content = readFileSync(pomPath, 'utf-8');

  // Replace the first occurrence of the version (project version, not dependencies)
  let replaced = false;
  content = content.replace(
    /(<project[^>]*>[\s\S]*?<version>)([^<]+)(<\/version>)/,
    (match, before, version, after) => {
      if (!replaced && version === oldVersion) {
        replaced = true;
        return `${before}${newVersion}${after}`;
      }
      return match;
    }
  );

  if (!replaced) {
    throw new Error('Could not update version in pom.xml');
  }

  writeFileSync(pomPath, content);
}

/**
 * Update the version constant in Java source.
 * @param {string} javaPath - Path to Java source file
 * @param {string} oldVersion - Current version
 * @param {string} newVersion - New version
 */
function updateJavaVersion(javaPath, oldVersion, newVersion) {
  try {
    let content = readFileSync(javaPath, 'utf-8');
    content = content.replace(
      new RegExp(`VERSION = "${oldVersion.replace('.', '\\.')}"`, 'g'),
      `VERSION = "${newVersion}"`
    );
    writeFileSync(javaPath, content);
    console.log(`Updated ${javaPath}`);
  } catch (err) {
    console.warn(`Warning: Could not update ${javaPath}: ${err.message}`);
  }
}

/**
 * Main function.
 */
function main() {
  const { bumpType, dryRun } = parseArgs();
  const projectRoot = process.cwd();
  const pomPath = join(projectRoot, 'pom.xml');
  const javaPath = join(
    projectRoot,
    'src/main/java/com/linkfoundation/mypackage/MyPackage.java'
  );

  const currentVersion = getCurrentVersion(pomPath);
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`Current version: ${currentVersion}`);
  console.log(`New version: ${newVersion} (${bumpType} bump)`);

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  updatePomVersion(pomPath, currentVersion, newVersion);
  console.log(`Updated pom.xml`);

  updateJavaVersion(javaPath, currentVersion, newVersion);

  console.log('\nVersion bump complete!');

  // Set GitHub Actions output if running in CI
  if (process.env.GITHUB_OUTPUT) {
    const fs = await import('fs');
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `new_version=${newVersion}\n`
    );
  }
}

main();
