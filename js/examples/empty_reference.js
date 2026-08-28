// A document written for an object with empty keys, the case that motivated
// https://github.com/link-foundation/links-notation/issues/288
//
// `{"": {"": 1}}` is written as `(o: ("" (o: ("" 1))))`. Every reference in it
// reads back as itself, so encoders that produce empty keys round trip.
//
// Usage: node js/examples/empty_reference.js

import { Parser, formatLinks } from '../src/index.js';

const parser = new Parser();

const source = '(o: ("" (o: ("" 1))))';

console.log('Source:      ', source);

const links = parser.parse(source);

// Show every reference between angle brackets, so an empty one stays visible.
function render(node) {
  if (!node.values || node.values.length === 0) {
    return `<${node.id ?? ''}>`;
  }
  const head = node.id === null || node.id === undefined ? '' : `<${node.id}>: `;
  return `(${head}${node.values.map(render).join(' ')})`;
}

console.log('Parsed as:   ', links.map(render).join('\n'));

const formatted = formatLinks(links);
console.log('Formatted:   ', formatted);
console.log('Round trips: ', formatLinks(parser.parse(formatted)) === formatted);

// A bare delimiter pair is one empty reference, and two in a row stay separate.
for (const example of ['(a "" b)', '(a "" "" b)', '(a " " b)', '(a ""x"" b)']) {
  console.log(`${example.padEnd(14)} => ${parser.parse(example).map(render).join(' ')}`);
}
