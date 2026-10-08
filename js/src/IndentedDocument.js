import { Parser } from './Parser.js';
import { escapeReference } from './references.js';

// A text line can be a single quoted reference or a flat list of words. Named
// links and nested values have more structure than this document format holds.
function lineText(link) {
  if (link.id !== null && link.values.length === 0) return link.id;
  if (
    link.id === null &&
    link.values.length > 0 &&
    link.values.every((value) => value.id !== null && value.values.length === 0)
  ) {
    return link.values.map((value) => value.id).join(' ');
  }
  throw new TypeError(
    'Indented document lines must contain only text references'
  );
}

/**
 * Read text parents and their immediate text children into a Map. Repeated
 * parents accumulate children in document order. Zero children yields [], one
 * yields a string, and multiple yield an array (or joined text when requested).
 * @param {string} input
 * @param {Object} options - Parser options plus multipleValues: 'array' | 'join'
 * @returns {Map<string, string|string[]>}
 */
export function parseIndentedDocument(input, options = {}) {
  const { multipleValues = 'array' } = options;
  if (multipleValues !== 'array' && multipleValues !== 'join') {
    throw new TypeError('multipleValues must be "array" or "join"');
  }
  const groups = new Parser(options).parseGroups(input);
  const collected = new Map();
  for (const group of groups) {
    const parent = lineText(group.element);
    const values = collected.get(parent) ?? [];
    for (const child of group.children) {
      if (child.children.length > 0) {
        throw new TypeError(
          'Indented documents support only immediate children'
        );
      }
      values.push(lineText(child.element));
    }
    collected.set(parent, values);
  }
  return new Map(
    [...collected].map(([parent, values]) => [
      parent,
      values.length === 1
        ? values[0]
        : values.length > 1 && multipleValues === 'join'
          ? values.join('\n')
          : values,
    ])
  );
}

/**
 * Write a text Map using minimal quoting and two-space child indentation.
 * Multiline strings are encoded as one reference; array entries are separate
 * children. Nonempty output ends with a newline.
 * @param {Map<string, string|string[]>} entries
 * @returns {string}
 */
export function formatIndentedDocument(entries) {
  if (!(entries instanceof Map)) {
    throw new TypeError('Indented document entries must be a Map');
  }
  const lines = [];
  for (const [parent, value] of entries) {
    if (typeof parent !== 'string') {
      throw new TypeError('Indented document parents must be strings');
    }
    const values = Array.isArray(value) ? value : [value];
    for (const child of values) {
      if (typeof child !== 'string') {
        throw new TypeError('Indented document children must be strings');
      }
    }
    lines.push(escapeReference(parent, { minimal: true }));
    for (const child of values) {
      lines.push('  ' + escapeReference(child, { minimal: true }));
    }
  }
  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}
