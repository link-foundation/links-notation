#!/usr/bin/env node
/**
 * Manual changeset creation script.
 *
 * Creates a new changeset file in the JS changesets format.
 *
 * Usage:
 *   bun scripts/create-manual-changeset.mjs --bump-type <patch|minor|major> --description "Description"
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { printUntrusted } from './github-actions-log.mjs';

// Package name - update this when forking the template
const PACKAGE_NAME = 'my-package';

// Word lists for generating random changeset names (like changesets does)
const ADJECTIVES = [
  'afraid', 'ancient', 'angry', 'average', 'bad', 'big', 'bitter', 'black',
  'blue', 'brave', 'breezy', 'bright', 'brown', 'calm', 'chatty', 'chilly',
  'clever', 'cold', 'cowardly', 'cuddly', 'curly', 'curvy', 'dangerous', 'dry',
  'dull', 'early', 'empty', 'evil', 'famous', 'fancy', 'fast', 'fluffy',
  'four', 'fresh', 'friendly', 'funny', 'fuzzy', 'gentle', 'giant', 'gold',
  'good', 'great', 'green', 'grumpy', 'happy', 'heavy', 'helpful', 'hip',
  'honest', 'hot', 'hungry', 'itchy', 'jolly', 'kind', 'large', 'late',
  'lazy', 'light', 'little', 'lively', 'long', 'loud', 'lovely', 'lucky',
  'mean', 'mighty', 'modern', 'moody', 'nasty', 'neat', 'nervous', 'new',
  'nice', 'odd', 'old', 'orange', 'pink', 'polite', 'popular', 'pretty',
  'proud', 'purple', 'quick', 'quiet', 'rare', 'real', 'red', 'rich',
  'rotten', 'rude', 'sad', 'scary', 'selfish', 'serious', 'seven', 'shaggy',
  'sharp', 'short', 'shy', 'silent', 'silly', 'six', 'slow', 'small',
  'smart', 'soft', 'sour', 'spicy', 'spotty', 'stale', 'strange', 'strong',
  'stupid', 'sweet', 'swift', 'tall', 'tame', 'tasty', 'ten', 'tender',
  'thick', 'thin', 'tidy', 'tiny', 'tough', 'tricky', 'twelve', 'twenty',
  'wet', 'wicked', 'wide', 'wild', 'witty', 'yellow', 'young',
];

const NOUNS = [
  'actors', 'apples', 'baboons', 'badgers', 'bags', 'bananas', 'beans', 'bears',
  'bees', 'berries', 'birds', 'bottles', 'brooms', 'buckets', 'camels', 'candles',
  'carrots', 'cats', 'chairs', 'cheetahs', 'cherries', 'clouds', 'cobras', 'coins',
  'cows', 'crabs', 'dancers', 'deserts', 'donkeys', 'doors', 'dragons', 'drums',
  'ducks', 'eagles', 'eels', 'eggs', 'elephants', 'fans', 'fishes', 'flies',
  'flowers', 'foxes', 'frogs', 'games', 'geese', 'ghosts', 'goats', 'grapes',
  'guitars', 'hats', 'heroes', 'hornets', 'horses', 'hotels', 'houses', 'islands',
  'jeans', 'kangaroos', 'kings', 'kittens', 'knives', 'lemons', 'lions', 'lizards',
  'mangoes', 'melons', 'mice', 'monkeys', 'moons', 'moose', 'needles', 'news',
  'onions', 'oranges', 'otters', 'owls', 'pandas', 'parrots', 'paws', 'pears',
  'peas', 'penguins', 'pigs', 'planes', 'planets', 'plants', 'plums', 'poems',
  'points', 'porcupines', 'pumpkins', 'queens', 'rabbits', 'radios', 'ravens', 'rivers',
  'rocks', 'rockets', 'roses', 'rules', 'seals', 'sheep', 'shirts', 'shoes',
  'shrimps', 'singers', 'snails', 'snakes', 'spiders', 'spies', 'squids', 'stars',
  'suns', 'tables', 'teams', 'tigers', 'tomatoes', 'trains', 'trees', 'turkeys',
  'turtles', 'waves', 'weeks', 'windows', 'wolves', 'zebras',
];

/**
 * Parse command line arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let bumpType = 'patch';
  let description = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bump-type' && args[i + 1]) {
      bumpType = args[i + 1];
      i++;
    } else if (args[i] === '--description' && args[i + 1]) {
      description = args[i + 1];
      i++;
    }
  }

  if (!['major', 'minor', 'patch'].includes(bumpType)) {
    console.error('Error: --bump-type must be one of: major, minor, patch');
    process.exit(1);
  }

  if (!description) {
    console.error('Error: --description is required');
    process.exit(1);
  }

  return { bumpType, description };
}

/**
 * Generate a random changeset name (adjective-noun pattern).
 * @returns {string} Random name like "happy-tigers"
 */
function generateChangesetName() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective}-${noun}`;
}

/**
 * Generate the changeset content in JS changesets format.
 * @param {string} bumpType - Version bump type
 * @param {string} description - Change description
 * @returns {string} Changeset content
 */
function generateContent(bumpType, description) {
  return `---
'${PACKAGE_NAME}': ${bumpType}
---

${description}
`;
}

/**
 * Main function.
 */
function main() {
  const { bumpType, description } = parseArgs();
  const projectRoot = process.cwd();
  const changesetDir = join(projectRoot, '.changeset');

  // Ensure .changeset directory exists
  if (!existsSync(changesetDir)) {
    mkdirSync(changesetDir, { recursive: true });
    console.log('Created .changeset directory');
  }

  // Generate filename
  const name = generateChangesetName();
  const filename = `${name}.md`;
  const filePath = join(changesetDir, filename);

  // Write changeset file
  const content = generateContent(bumpType, description);
  writeFileSync(filePath, content);

  console.log(`Created changeset: .changeset/${filename}`);
  console.log(`  Bump type: ${bumpType}`);
  console.log('  Description:');
  printUntrusted(description);
}

main();
