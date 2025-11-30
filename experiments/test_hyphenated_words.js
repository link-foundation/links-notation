/**
 * Test hyphenated words are preserved in parsing
 */
import { Parser } from '../js/src/Parser.js';
import { formatLinks } from '../js/src/Link.js';

const parser = new Parser();

const testCases = [
  // Hyphenated names
  'Jean-Luc Picard',
  'conan-center-index',
  'a-b-c-d',

  // Math between digits (should tokenize)
  '1-2',
  '10-20',
  'a1-b2', // Mixed - should not tokenize because there's a letter on each side

  // Variable-like names
  'my-var-name',
  'test-case-1',
];

console.log('=== Hyphenated Word Tests ===\n');

for (const input of testCases) {
  const links = parser.parse(input);
  const formatted = formatLinks(links);
  console.log(`Input:     "${input}"`);
  console.log(`Values:    ${links[0]?.values?.map(v => v.id).join(' | ') || 'none'}`);
  console.log(`Formatted: "${formatted}"`);
  console.log('---');
}
