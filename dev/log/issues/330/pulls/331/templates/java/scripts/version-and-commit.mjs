#!/usr/bin/env node
/**
 * Version and commit script for CI/CD releases.
 *
 * This script handles the complete release workflow:
 * 1. Collects changelog from changesets
 * 2. Determines version bump from changesets (or uses provided bump type)
 * 3. Bumps version in pom.xml and Java source
 * 4. Commits changes
 * 5. Creates a git tag
 * 6. Pushes to remote
 *
 * Usage:
 *   # Changeset mode (auto-determines bump type from changesets)
 *   bun scripts/version-and-commit.mjs --mode changeset
 *
 *   # Instant mode (manual bump type)
 *   bun scripts/version-and-commit.mjs --mode instant --bump-type <major|minor|patch>
 *
 *   # Legacy mode (same as instant)
 *   bun scripts/version-and-commit.mjs --bump-type <major|minor|patch>
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Package name - update this when forking the template
const PACKAGE_NAME = 'my-package';

// Bump type priority (higher number = higher priority)
const BUMP_PRIORITY = {
  patch: 1,
  minor: 2,
  major: 3,
};

/**
 * Parse command line arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let mode = 'instant';
  let bumpType = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1];
      i++;
    } else if (args[i] === '--bump-type' && args[i + 1]) {
      bumpType = args[i + 1];
      i++;
    }
  }

  // Legacy mode support: if bump-type is provided without mode, use instant mode
  if (bumpType && !args.includes('--mode')) {
    mode = 'instant';
  }

  return { mode, bumpType };
}

/**
 * Execute a shell command.
 * @param {string} command - Command to execute
 * @param {object} options - execSync options
 * @returns {string} Command output
 */
function exec(command, options = {}) {
  console.log(`$ ${command}`);
  return execSync(command, { encoding: 'utf-8', ...options }).trim();
}

/**
 * Get the current version from pom.xml.
 * @param {string} pomPath - Path to pom.xml
 * @returns {string} Current version
 */
function getCurrentVersion(pomPath) {
  const content = readFileSync(pomPath, 'utf-8');
  const match = content.match(/<project[^>]*>[\s\S]*?<version>([^<]+)<\/version>/);
  if (!match) {
    throw new Error('Could not find version in pom.xml');
  }
  return match[1];
}

/**
 * Find changeset files.
 * @param {string} changesetDir - Path to .changeset directory
 * @returns {string[]} Array of changeset file paths
 */
function findChangesets(changesetDir) {
  if (!existsSync(changesetDir)) {
    return [];
  }

  return readdirSync(changesetDir)
    .filter((file) =>
      file.endsWith('.md') &&
      file !== 'README.md'
    )
    .map((file) => join(changesetDir, file));
}

/**
 * Determine bump type from changesets.
 * @param {string[]} changesetPaths - Array of changeset file paths
 * @returns {string|null} Highest priority bump type or null if no valid changesets
 */
function determineBumpType(changesetPaths) {
  let highestType = null;

  for (const filePath of changesetPaths) {
    const content = readFileSync(filePath, 'utf-8');

    // Match frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) continue;

    const frontmatter = frontmatterMatch[1];

    // Extract bump type
    const versionTypeRegex = new RegExp(
      `^['"]${PACKAGE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]:\\s+(major|minor|patch)`,
      'm'
    );
    const versionTypeMatch = frontmatter.match(versionTypeRegex);

    if (versionTypeMatch) {
      const type = versionTypeMatch[1];
      if (!highestType || BUMP_PRIORITY[type] > BUMP_PRIORITY[highestType]) {
        highestType = type;
      }
    }
  }

  return highestType;
}

/**
 * Bump version according to semantic versioning.
 * @param {string} version - Current version
 * @param {string} bumpType - Type of bump
 * @returns {string} New version
 */
function bumpVersion(version, bumpType) {
  const parts = version.split('.').map(Number);
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
 * Update version in pom.xml.
 * @param {string} pomPath - Path to pom.xml
 * @param {string} oldVersion - Current version
 * @param {string} newVersion - New version
 */
function updatePomVersion(pomPath, oldVersion, newVersion) {
  let content = readFileSync(pomPath, 'utf-8');

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

  writeFileSync(pomPath, content);
  console.log(`Updated pom.xml: ${oldVersion} -> ${newVersion}`);
}

/**
 * Update version in Java source file.
 * @param {string} javaPath - Path to Java file
 * @param {string} oldVersion - Current version
 * @param {string} newVersion - New version
 */
function updateJavaVersion(javaPath, oldVersion, newVersion) {
  if (!existsSync(javaPath)) {
    console.log(`Java source file not found: ${javaPath}`);
    return;
  }

  let content = readFileSync(javaPath, 'utf-8');
  content = content.replace(
    new RegExp(`VERSION = "${oldVersion.replace(/\./g, '\\.')}"`, 'g'),
    `VERSION = "${newVersion}"`
  );
  writeFileSync(javaPath, content);
  console.log(`Updated Java source: ${oldVersion} -> ${newVersion}`);
}

/**
 * Check if a git tag exists.
 * @param {string} tag - Tag name
 * @returns {boolean} True if tag exists
 */
function tagExists(tag) {
  try {
    exec(`git rev-parse ${tag}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Set GitHub Actions output.
 * @param {string} name - Output name
 * @param {string} value - Output value
 */
function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
    console.log(`Set output: ${name}=${value}`);
  }
}

/**
 * Main function.
 */
async function main() {
  const { mode, bumpType: providedBumpType } = parseArgs();
  const projectRoot = process.cwd();
  const pomPath = join(projectRoot, 'pom.xml');
  const changesetDir = join(projectRoot, '.changeset');
  const javaPath = join(
    projectRoot,
    'src/main/java/com/linkfoundation/mypackage/MyPackage.java'
  );

  let bumpType = providedBumpType;

  // In changeset mode, determine bump type from changesets
  if (mode === 'changeset') {
    const changesets = findChangesets(changesetDir);

    if (changesets.length === 0) {
      console.log('No changesets found. Nothing to release.');
      setOutput('released', 'false');
      setOutput('already_released', 'true');
      return;
    }

    console.log(`Found ${changesets.length} changeset(s)`);

    bumpType = determineBumpType(changesets);
    if (!bumpType) {
      console.error('Error: Could not determine bump type from changesets');
      process.exit(1);
    }

    console.log(`Determined bump type: ${bumpType}`);
  }

  // Validate bump type
  if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
    console.error('Usage: version-and-commit.mjs --bump-type <major|minor|patch>');
    console.error('   or: version-and-commit.mjs --mode changeset');
    process.exit(1);
  }

  // Get current and new versions
  const currentVersion = getCurrentVersion(pomPath);
  const newVersion = bumpVersion(currentVersion, bumpType);
  const tag = `v${newVersion}`;

  console.log(`\nVersion bump: ${currentVersion} -> ${newVersion} (${bumpType})`);

  // Check if this version was already released
  if (tagExists(tag)) {
    console.log(`Tag ${tag} already exists. Skipping release.`);
    setOutput('released', 'false');
    setOutput('already_released', 'true');
    setOutput('new_version', newVersion);
    return;
  }

  // First bump version (before collecting changelog, so version is correct)
  updatePomVersion(pomPath, currentVersion, newVersion);
  updateJavaVersion(javaPath, currentVersion, newVersion);

  // Collect changelog (which will delete changesets)
  const collectScript = join(projectRoot, 'scripts/collect-changelog.mjs');
  if (existsSync(collectScript)) {
    try {
      exec(`node ${collectScript} --version ${newVersion}`);
    } catch (err) {
      console.log('No changesets to collect or collection failed');
    }
  }

  // Configure git
  exec('git config user.name "github-actions[bot]"');
  exec('git config user.email "github-actions[bot]@users.noreply.github.com"');

  // Stage changes
  exec('git add pom.xml CHANGELOG.md .changeset/');
  exec(`git add "${javaPath}" || true`);

  // Commit
  const commitMessage = `chore: release v${newVersion}`;
  exec(`git commit -m "${commitMessage}" || echo "Nothing to commit"`);

  // Create tag
  exec(`git tag -a ${tag} -m "Release ${newVersion}"`);
  console.log(`Created tag: ${tag}`);

  // Push changes and tags
  exec('git push');
  exec('git push --tags');
  console.log('Pushed changes and tags to remote');

  // Set outputs
  setOutput('released', 'true');
  setOutput('new_version', newVersion);
  setOutput('bump_type', bumpType);

  console.log(`\nRelease ${newVersion} complete!`);
}

main();
