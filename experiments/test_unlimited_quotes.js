const { Parser } = require('../js/src/Parser.js');
const parser = new Parser();

// Test a simple 6-quote case first
const simple6 = '""""""hello""""""';
console.log('Simple 6 quotes input:', simple6);
try {
  const result = parser.parse(simple6);
  console.log('Simple 6 quotes result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('Simple 6 quotes error:', e.message);
}

// Test 6 quotes
const sixQuotes = '""""""hello with """"" five quotes inside""""""';
console.log('\n6 quotes input:', sixQuotes);
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
console.log('\n6 quotes with escaping input:', sixQuotesEscape);
try {
  const result = parser.parse(sixQuotesEscape);
  console.log('6 quotes escape result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('6 quotes escape error:', e.message);
}
