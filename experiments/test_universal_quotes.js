#!/usr/bin/env node
/**
 * Experiment: Test universal N-quote grammar using global variables and semantic predicates
 *
 * This tests whether we can simplify the PEG grammar to use a single universal rule
 * for any number of quotes, rather than separate rules for 1-5 quotes.
 */

import peggy from 'peggy';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and compile the grammar
const grammarPath = path.join(__dirname, 'test_universal_quotes_grammar_v8.pegjs');
const grammarSource = fs.readFileSync(grammarPath, 'utf8');

let parser;
try {
  parser = peggy.generate(grammarSource);
  console.log('✅ Grammar compiled successfully!\n');
} catch (e) {
  console.error('❌ Grammar compilation failed:', e.message);
  process.exit(1);
}

// Test cases
const testCases = [
  // Single quotes (1 quote char)
  { input: '"hello"', expected: 'hello', desc: 'single double quote' },
  { input: "'hello'", expected: 'hello', desc: 'single single quote' },
  { input: '`hello`', expected: 'hello', desc: 'single backtick' },

  // Escape sequences in single quotes
  { input: '"say ""hi"""', expected: 'say "hi"', desc: 'escape in double quote' },
  { input: "'''hello'''", expected: 'hello', desc: 'triple single quote' },

  // Double quotes (2 quote chars)
  { input: '""hello""', expected: 'hello', desc: 'double double quote' },
  { input: "''hello''", expected: 'hello', desc: 'double single quote' },
  { input: '``hello``', expected: 'hello', desc: 'double backtick' },

  // Triple quotes (3 quote chars)
  { input: '"""hello"""', expected: 'hello', desc: 'triple double quote' },
  { input: "'''hello'''", expected: 'hello', desc: 'triple single quote' },
  { input: '```hello```', expected: 'hello', desc: 'triple backtick' },

  // Escape in triple quotes (6 quotes = 2*3 becomes 3 quotes in output)
  { input: '"""has """""" inside"""', expected: 'has """ inside', desc: 'escape in triple double' },

  // 4 quotes
  { input: '""""hello""""', expected: 'hello', desc: '4 double quotes' },

  // 5 quotes
  { input: '"""""hello"""""', expected: 'hello', desc: '5 double quotes' },

  // 6 quotes (should work with universal parser)
  { input: '""""""hello""""""', expected: 'hello', desc: '6 double quotes' },

  // 7 quotes
  { input: '"""""""hello"""""""', expected: 'hello', desc: '7 double quotes' },

  // Embedded quotes - content with quotes that don't form closing sequence
  { input: '"""hello "world" there"""', expected: 'hello "world" there', desc: 'triple with embedded single' },
  { input: '"""hello ""world"" there"""', expected: 'hello ""world"" there', desc: 'triple with embedded double' },
];

console.log('Testing universal quote grammar:\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  try {
    const result = parser.parse(tc.input);
    const actual = Array.isArray(result) ? result[0] : result;

    if (actual === tc.expected) {
      console.log(`✅ ${tc.desc}`);
      console.log(`   Input:    ${tc.input}`);
      console.log(`   Expected: ${tc.expected}`);
      console.log(`   Got:      ${actual}`);
      passed++;
    } else {
      console.log(`❌ ${tc.desc}`);
      console.log(`   Input:    ${tc.input}`);
      console.log(`   Expected: ${tc.expected}`);
      console.log(`   Got:      ${actual}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${tc.desc} - PARSE ERROR`);
    console.log(`   Input:    ${tc.input}`);
    console.log(`   Expected: ${tc.expected}`);
    console.log(`   Error:    ${e.message}`);
    failed++;
  }
  console.log();
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed > 0) {
  process.exit(1);
}
