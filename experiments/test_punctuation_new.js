/**
 * Experiment to test the new punctuation and math symbol tokenization behavior
 */
import { Parser } from '../js/src/Parser.js';
import { formatLinks } from '../js/src/Link.js';
import { FormatOptions } from '../js/src/FormatOptions.js';

// Create parsers with different settings
const parserWithTokenization = new Parser({ tokenizeSymbols: true });
const parserWithoutTokenization = new Parser({ tokenizeSymbols: false });

// Test cases from the issue
const testCases = [
  // From issue description
  '1, 2 and 3',
  '1,2,3',
  '1+1,1/1,1*1',

  // Additional punctuation tests
  'hello, world',
  '1. 2. 3.',
  '1.2.3',

  // Math tests
  '1+1',
  '1 + 1',
  'x+y=z',
  'a-b',

  // Quoted strings should preserve punctuation
  '"1,"',
  '"1."',
  '"1,2,3"',
  '"hello, world"',

  // Mixed
  'test "1,2,3" more',
];

console.log('=== New Parsing Behavior (with tokenization) ===\n');

for (const input of testCases) {
  try {
    const links = parserWithTokenization.parse(input);
    const formatted = formatLinks(links);
    const compactOptions = new FormatOptions({ compactSymbols: true });
    const compactFormatted = formatLinks(links, compactOptions);

    console.log(`Input:     "${input}"`);
    console.log(`Values:    ${links[0]?.values?.map(v => v.id).join(' | ') || 'none'}`);
    console.log(`Formatted: "${formatted}"`);
    console.log(`Compact:   "${compactFormatted}"`);
    console.log('---');
  } catch (e) {
    console.log(`Input:     "${input}"`);
    console.log(`Error:     ${e.message}`);
    console.log('---');
  }
}

console.log('\n=== Without Tokenization (backwards compatible) ===\n');

for (const input of ['1,2,3', '1+1', 'hello, world']) {
  try {
    const links = parserWithoutTokenization.parse(input);
    const formatted = formatLinks(links);

    console.log(`Input:     "${input}"`);
    console.log(`Values:    ${links[0]?.values?.map(v => v.id).join(' | ') || 'none'}`);
    console.log(`Formatted: "${formatted}"`);
    console.log('---');
  } catch (e) {
    console.log(`Input:     "${input}"`);
    console.log(`Error:     ${e.message}`);
    console.log('---');
  }
}
