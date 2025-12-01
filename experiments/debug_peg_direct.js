// Direct test of the generated parser
const parserModule = require('../js/src/parser-generated.js');

const simple6 = '""""""hello""""""';
console.log('Testing simple6:', simple6);
try {
  const result = parserModule.parse(simple6);
  console.log('Raw parse result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('Parse error:', e.message);
  console.log('Location:', JSON.stringify(e.location));
}
