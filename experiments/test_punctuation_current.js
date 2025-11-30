/**
 * Experiment to understand current behavior with punctuation and math symbols
 */
import { Parser } from '../js/src/Parser.js';
import { formatLinks } from '../js/src/Link.js';

const parser = new Parser();

// Test cases from the issue
const testCases = [
  // Punctuation tests
  '1, 2 and 3',
  '1,2,3',
  '1. 2. 3.',
  '1.2.3',
  'hello, world',

  // Math symbol tests
  '1+1',
  '1 + 1',
  '1+1,1/1,1*1',
  '1 + 1 , 1 / 1 , 1 * 1',
  'x+y=z',
  'a-b',

  // Other punctuation
  'hello;world',
  'hello!world',
  'hello?world',

  // Already quoted versions
  '"1,"',
  '"1."',
  '"1,2,3"',
];

console.log('=== Current Parsing Behavior ===\n');

for (const input of testCases) {
  try {
    const links = parser.parse(input);
    const formatted = formatLinks(links);
    console.log(`Input:     "${input}"`);
    console.log(`Parsed:    ${JSON.stringify(links, null, 2)}`);
    console.log(`Formatted: "${formatted}"`);
    console.log(`Values:    ${links[0]?.values?.map(v => v.id).join(' | ') || 'none'}`);
    console.log('---');
  } catch (e) {
    console.log(`Input:     "${input}"`);
    console.log(`Error:     ${e.message}`);
    console.log('---');
  }
}
