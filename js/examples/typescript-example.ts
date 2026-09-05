/**
 * TypeScript example demonstrating usage of links-notation with type checking
 */

import {
  Parser,
  Link,
  FormatOptions,
  FormatConfig,
  formatLinks,
} from '../index.js';

// Example 1: Basic parsing
const parser = new Parser();
const input = '(index: source target)';
const links: Link[] = parser.parse(input);

// Example 2: Creating links programmatically
const link1 = new Link('parent', [new Link('child1'), new Link('child2')]);

console.log(link1.toString());

// Example 3: Working with link properties
const link2 = new Link('id', [new Link('value1'), new Link('value2')]);
console.log('ID:', link2.id);
console.log('Values:', link2.values);

// Example 4: Link methods
const link3 = new Link('source');
const link4 = new Link('target');
const combined = link3.combine(link4);
console.log('Combined:', combined.toString());

// Example 5: FormatOptions
const formatOptions = new FormatOptions({
  lessParentheses: true,
  maxLineLength: 80,
  indentLongLines: true,
  maxInlineRefs: 3,
  groupConsecutive: false,
  indentString: '  ',
  preferInline: true,
});

// Example 6: Formatting with options
const formattedLink = link2.format(formatOptions);
console.log('Formatted:', formattedLink);

// Example 7: FormatConfig (alias for FormatOptions)
const formatConfig = new FormatConfig({
  lessParentheses: false,
  maxInlineRefs: 2,
});

// Example 8: Format multiple links
const multipleLinks = [
  new Link('link1', [new Link('a'), new Link('b')]),
  new Link('link2', [new Link('c'), new Link('d')]),
];

const formatted = formatLinks(multipleLinks, formatConfig);
console.log('Formatted links:\n', formatted);

// Example 9: Parser with options
const customParser = new Parser({
  maxInputSize: 5 * 1024 * 1024, // 5MB
  maxDepth: 500,
});

// Example 10: Complex parsing
const complexInput = `
parent
  child1
  child2
    grandchild
`;

const complexLinks = customParser.parse(complexInput);
complexLinks.forEach((link) => {
  console.log(link.format(true));
});

// Example 11: Link equality
const linkA = new Link('id', [new Link('value')]);
const linkB = new Link('id', [new Link('value')]);
console.log('Equal:', linkA.equals(linkB));

// Example 12: Link simplification
const complexLink = new Link(null, [new Link('single')]);
const simplified = complexLink.simplify();
console.log('Simplified:', simplified.toString());

// Example 13: Working with quoted references
const quotedLink = new Link('quoted id', [new Link('value with spaces')]);
console.log('Escaped:', Link.escapeReference('needs:quoting'));
