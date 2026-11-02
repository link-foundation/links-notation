#!/usr/bin/env node
/**
 * Changeset merge script.
 *
 * Merges multiple pending changesets into a single changeset,
 * using the highest priority bump type (major > minor > patch).
 *
 * Usage:
 *   bun scripts/merge-changesets.mjs [--dry-run]
 */

import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { printUntrusted } from './github-actions-log.mjs';

// Package name - update this when forking the template
const PACKAGE_NAME = 'my-package';

// Bump type priority (higher number = higher priority)
const BUMP_PRIORITY = {
  patch: 1,
  minor: 2,
  major: 3,
};

// Word lists for generating random changeset names
const ADJECTIVES = [
  'afraid', 'ancient', 'angry', 'average', 'big', 'brave', 'bright', 'calm',
  'clever', 'cold', 'cuddly', 'dangerous', 'early', 'fast', 'friendly', 'funny',
  'gentle', 'giant', 'good', 'great', 'happy', 'helpful', 'honest', 'hungry',
  'jolly', 'kind', 'large', 'lazy', 'light', 'little', 'lively', 'long',
  'loud', 'lovely', 'lucky', 'mean', 'mighty', 'modern', 'neat', 'nervous',
  'nice', 'odd', 'old', 'polite', 'popular', 'pretty', 'proud', 'quick',
  'quiet', 'rare', 'real', 'rich', 'sad', 'scary', 'serious', 'sharp',
  'short', 'shy', 'silly', 'slow', 'small', 'smart', 'soft', 'strange',
  'strong', 'sweet', 'swift', 'tall', 'tame', 'tasty', 'tender', 'thick',
  'thin', 'tidy', 'tiny', 'tough', 'tricky', 'wild', 'witty', 'young',
];

const NOUNS = [
  'actors', 'apples', 'baboons', 'badgers', 'bags', 'bananas', 'beans', 'bears',
  'bees', 'berries', 'birds', 'bottles', 'brooms', 'camels', 'candles', 'carrots',
  'cats', 'chairs', 'cheetahs', 'cherries', 'clouds', 'cobras', 'coins', 'cows',
  'crabs', 'dancers', 'donkeys', 'doors', 'dragons', 'drums', 'ducks', 'eagles',
  'eels', 'eggs', 'elephants', 'fans', 'fishes', 'flies', 'flowers', 'foxes',
  'frogs', 'games', 'geese', 'ghosts', 'goats', 'grapes', 'guitars', 'hats',
  'heroes', 'hornets', 'horses', 'hotels', 'houses', 'islands', 'jeans', 'kangaroos',
  'kings', 'kittens', 'knives', 'lemons', 'lions', 'lizards', 'mangoes', 'melons',
  'mice', 'monkeys', 'moons', 'moose', 'needles', 'onions', 'oranges', 'otters',
  'owls', 'pandas', 'parrots', 'pears', 'peas', 'penguins', 'pigs', 'planes',
  'planets', 'plants', 'plums', 'poems', 'queens', 'rabbits', 'ravens', 'rivers',
  'rocks', 'rockets', 'roses', 'rules', 'seals', 'sheep', 'shirts', 'shoes',
  'singers', 'snails', 'snakes', 'spiders', 'squids', 'stars', 'suns', 'tables',
  'teams', 'tigers', 'tomatoes', 'trains', 'trees', 'turkeys', 'turtles', 'waves',
  'weeks', 'windows', 'wolves', 'zebras',
];

/**
 * Parse command line arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { dryRun };
}

/**
 * Find all changeset files in the .changeset directory.
 * @param {string} changesetDir - Path to .changeset directory
 * @returns {Array<{path: string, mtime: Date}>} Array of changeset files with modification times
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
    .map((file) => {
      const filePath = join(changesetDir, file);
      const stats = statSync(filePath);
      return { path: filePath, mtime: stats.mtime };
    })
    .sort((a, b) => a.mtime - b.mtime); // Sort by modification time (oldest first)
}

/**
 * Parse a changeset file.
 * @param {string} filePath - Path to changeset file
 * @returns {object|null} Parsed changeset { type, description } or null if invalid
 */
function parseChangeset(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Match frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      console.warn('Warning: Invalid changeset format in:');
      printUntrusted(basename(filePath));
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const description = frontmatterMatch[2].trim();

    // Extract bump type
    const versionTypeRegex = new RegExp(
      `^['"]${PACKAGE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]:\\s+(major|minor|patch)`,
      'm'
    );
    const versionTypeMatch = frontmatter.match(versionTypeRegex);

    if (!versionTypeMatch) {
      console.warn('Warning: No valid bump type in:');
      printUntrusted(basename(filePath));
      return null;
    }

    return {
      type: versionTypeMatch[1],
      description,
    };
  } catch (error) {
    console.warn('Warning: Failed to read changeset:');
    printUntrusted(`${basename(filePath)}: ${error.message}`);
    return null;
  }
}

/**
 * Get the highest priority bump type from a list of types.
 * @param {string[]} types - Array of bump types
 * @returns {string} Highest priority type
 */
function getHighestBumpType(types) {
  let highest = 'patch';
  for (const type of types) {
    if (BUMP_PRIORITY[type] > BUMP_PRIORITY[highest]) {
      highest = type;
    }
  }
  return highest;
}

/**
 * Generate a random changeset name.
 * @returns {string} Random name like "merged-happy-tigers"
 */
function generateMergedName() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `merged-${adjective}-${noun}`;
}

/**
 * Main function.
 */
function main() {
  const { dryRun } = parseArgs();
  const projectRoot = process.cwd();
  const changesetDir = join(projectRoot, '.changeset');

  console.log('Checking for changesets to merge...\n');

  const changesetFiles = findChangesets(changesetDir);

  if (changesetFiles.length === 0) {
    console.log('No changesets found.');
    return;
  }

  if (changesetFiles.length === 1) {
    console.log('Only 1 changeset found. No merge needed.');
    return;
  }

  console.log(`Found ${changesetFiles.length} changesets to merge.\n`);

  // Parse all changesets
  const changesets = [];
  for (const { path } of changesetFiles) {
    const parsed = parseChangeset(path);
    if (parsed) {
      changesets.push({ ...parsed, path });
      console.log(`  ${parsed.type} changeset:`);
      printUntrusted(basename(path));
    }
  }

  if (changesets.length === 0) {
    console.log('No valid changesets to merge.');
    return;
  }

  // Determine highest bump type
  const bumpTypes = changesets.map((c) => c.type);
  const highestType = getHighestBumpType(bumpTypes);
  console.log(`\nHighest bump type: ${highestType}`);

  // Combine descriptions (in chronological order)
  const combinedDescription = changesets
    .map((c) => c.description)
    .join('\n\n');

  // Generate merged changeset content
  const mergedContent = `---
'${PACKAGE_NAME}': ${highestType}
---

${combinedDescription}
`;

  if (dryRun) {
    console.log('\n[DRY RUN] Would create merged changeset:');
    printUntrusted(mergedContent);
    console.log(`[DRY RUN] Would delete ${changesets.length} individual changesets`);
    return;
  }

  // Write merged changeset
  const mergedName = generateMergedName();
  const mergedPath = join(changesetDir, `${mergedName}.md`);
  writeFileSync(mergedPath, mergedContent);
  console.log(`\nCreated merged changeset: ${mergedName}.md`);

  // Delete individual changesets
  for (const { path } of changesets) {
    unlinkSync(path);
    console.log('Deleted changeset:');
    printUntrusted(basename(path));
  }

  console.log('\nChangeset merge complete!');
}

main();
