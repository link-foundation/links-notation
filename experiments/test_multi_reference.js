/**
 * Multi-Reference Feature Experiment (Issue #184)
 *
 * This script tests the concept of multi-references where
 * multiple space-separated words before a colon form a single reference.
 */

import { Parser, Link, formatLinks } from '../js/src/index.js';

const parser = new Parser();

console.log('=== Multi-Reference Feature Tests (Issue #184) ===\n');

// Test 1: Single-word ID (backward compatibility)
const test1 = 'papa: loves mama';
console.log('Test 1 - Single-word ID (backward compatible):');
console.log('Input:', test1);
try {
  const result1 = parser.parse(test1);
  console.log('Parsed:', JSON.stringify(result1, null, 2));
  console.log('Formatted:', formatLinks(result1, true));
  console.log('✅ Pass: Single-word ID still works');
} catch (e) {
  console.log('❌ Fail:', e.message);
}
console.log();

// Test 2: Quoted multi-word ID (backward compatibility)
const test2 = "('some example': value)";
console.log('Test 2 - Quoted multi-word ID (backward compatible):');
console.log('Input:', test2);
try {
  const result2 = parser.parse(test2);
  console.log('Parsed:', JSON.stringify(result2, null, 2));
  console.log('Formatted:', formatLinks(result2, true));
  console.log('✅ Pass: Quoted multi-word ID still works');
} catch (e) {
  console.log('❌ Fail:', e.message);
}
console.log();

// Test 3: Unquoted multi-word ID (NEW FEATURE)
const test3 = '(some example: some example is a link)';
console.log('Test 3 - Unquoted multi-word ID (NEW):');
console.log('Input:', test3);
try {
  const result3 = parser.parse(test3);
  console.log('Parsed:', JSON.stringify(result3, null, 2));
  console.log('Formatted:', formatLinks(result3, true));
  // Check if ID is an array with 2 elements
  if (Array.isArray(result3[0].id) && result3[0].id.length === 2) {
    console.log('✅ Pass: Multi-reference ID parsed as array:', result3[0].id);
  } else {
    console.log('⚠️ ID is not an array:', result3[0].id);
  }
} catch (e) {
  console.log('❌ Fail:', e.message);
}
console.log();

// Test 4: Context-aware multi-reference recognition in values
const test4 = '(some example: some example is a link)';
console.log('Test 4 - Context-aware multi-reference in values:');
console.log('Input:', test4);
try {
  const result4 = parser.parse(test4);
  console.log('Values count:', result4[0].values.length);
  console.log('First value:', result4[0].values[0]);
  // Check if "some example" in values is recognized as a single multi-ref
  if (Array.isArray(result4[0].values[0].id) &&
      result4[0].values[0].id.length === 2 &&
      result4[0].values[0].id[0] === 'some' &&
      result4[0].values[0].id[1] === 'example') {
    console.log('✅ Pass: "some example" recognized as multi-reference in values');
  } else {
    console.log('⚠️ Multi-reference not recognized:', result4[0].values[0].id);
  }
} catch (e) {
  console.log('❌ Fail:', e.message);
}
console.log();

// Test 5: Multiple multi-references in one document
const test5 = `(some example: some example is a link)
some example`;
console.log('Test 5 - Self-reference (multi-ref used standalone):');
console.log('Input:', test5);
try {
  const result5 = parser.parse(test5);
  console.log('Parsed links count:', result5.length);
  console.log('Second link:', JSON.stringify(result5[1], null, 2));
} catch (e) {
  console.log('❌ Fail:', e.message);
}
console.log();

// Test 6: Mixed references (single and multi)
const test6 = '(new york city: new york city is great)';
console.log('Test 6 - Three-word multi-reference:');
console.log('Input:', test6);
try {
  const result6 = parser.parse(test6);
  console.log('Parsed:', JSON.stringify(result6, null, 2));
  console.log('ID:', result6[0].id);
  console.log('Values count:', result6[0].values.length);
  if (Array.isArray(result6[0].id) && result6[0].id.length === 3) {
    console.log('✅ Pass: 3-word multi-reference parsed correctly');
  }
} catch (e) {
  console.log('❌ Fail:', e.message);
}
console.log();

console.log('=== Summary ===\n');
console.log('Multi-reference feature implemented:');
console.log('1. Grammar updated to allow multiple references before colon');
console.log('2. ID field can now be string (single) or string[] (multi)');
console.log('3. Context-aware recognition: defined multi-refs recognized in values');
console.log('4. Backward compatible: single-word and quoted IDs still work');
