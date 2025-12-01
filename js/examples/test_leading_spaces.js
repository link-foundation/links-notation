import { Parser } from '../src/Parser.js';

const parser = new Parser();

// Example with 2 leading spaces
const withLeading = `  A: a
  B: b`;

// Example without leading spaces
const withoutLeading = `A: a
B: b`;

console.log('=== With Leading Spaces ===');
try {
  const result = parser.parse(withLeading);
  console.log(`Parsed ${result.length} links:`);
  result.forEach((link, i) => {
    console.log(`  Link ${i}: ${link.toString()}`);
  });
} catch (e) {
  console.log('Error:', e.message);
}

console.log('\n=== Without Leading Spaces ===');
try {
  const result = parser.parse(withoutLeading);
  console.log(`Parsed ${result.length} links:`);
  result.forEach((link, i) => {
    console.log(`  Link ${i}: ${link.toString()}`);
  });
} catch (e) {
  console.log('Error:', e.message);
}
