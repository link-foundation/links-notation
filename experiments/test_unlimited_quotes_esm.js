#!/usr/bin/env node
import { Parser } from '../js/src/Parser.js';
const parser = new Parser();

console.log('Testing unlimited N-quote strings with universal grammar:\n');

// Test a simple 6-quote case first
const simple6 = '""""""hello""""""';
console.log('Simple 6 quotes input:', simple6);
try {
  const result = parser.parse(simple6);
  console.log('Simple 6 quotes result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('Simple 6 quotes error:', e.message);
}

// Test 6 quotes with embedded 5 quotes
const sixQuotes = '""""""hello with """"" five quotes inside""""""';
console.log('\n6 quotes with embedded 5 quotes input:', sixQuotes);
try {
  const result = parser.parse(sixQuotes);
  console.log('6 quotes result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('6 quotes error:', e.message);
}

// Test 10 quotes
const tenQuotes = '""""""""""very deeply quoted""""""""""';
console.log('\n10 quotes input:', tenQuotes);
try {
  const result = parser.parse(tenQuotes);
  console.log('10 quotes result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('10 quotes error:', e.message);
}

// Test escaping with 6 quotes (12 quotes become 6)
const sixQuotesEscape = '""""""text with """""""""""" escaped""""""';
console.log('\n6 quotes with escaping (12 quotes = escape) input:', sixQuotesEscape);
try {
  const result = parser.parse(sixQuotesEscape);
  console.log('6 quotes escape result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('6 quotes escape error:', e.message);
}

// Test 7 quotes with backticks
const sevenBackticks = '```````code with 6 backticks `````` inside```````';
console.log('\n7 backticks with 6 embedded input:', sevenBackticks);
try {
  const result = parser.parse(sevenBackticks);
  console.log('7 backticks result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('7 backticks error:', e.message);
}

// Test single quotes at various levels
console.log('\n--- Single quote variations ---');
const singleTests = [
  { input: `"hello"`, desc: '1 quote' },
  { input: `""hello""`, desc: '2 quotes' },
  { input: `"""hello"""`, desc: '3 quotes' },
  { input: `""""hello""""`, desc: '4 quotes' },
  { input: `"""""hello"""""`, desc: '5 quotes' },
  { input: `""""""hello""""""`, desc: '6 quotes' },
  { input: `"""""""hello"""""""`, desc: '7 quotes' },
  { input: `""""""""hello""""""""`, desc: '8 quotes' },
];

for (const test of singleTests) {
  try {
    const result = parser.parse(test.input);
    console.log(`✅ ${test.desc}: ${test.input} -> "${result[0].id}"`);
  } catch (e) {
    console.log(`❌ ${test.desc}: ${test.input} -> ERROR: ${e.message}`);
  }
}

console.log('\n--- All tests completed ---');
