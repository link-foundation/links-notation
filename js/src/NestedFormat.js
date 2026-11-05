import { Link } from './Link.js';

const isAtom = (link) => link.id !== null && link.values.length === 0;
const canNest = (link) =>
  !isAtom(link) &&
  !(link.id === null && link.values.length === 1 && !isAtom(link.values[0]));
const lineHolds = (link, count) =>
  link.id !== null || count >= 2 || (count === 1 && isAtom(link.values[0]));

function nestedLines(link, pad, indent, underName = false) {
  if (
    !lineHolds(link, link.values.length) ||
    (underName && link.id === null && link.values.length === 1)
  ) {
    return [pad + link.format()];
  }
  // Only move a trailing run: moving a link past a later atom changes order.
  let count = link.values.length;
  while (count > 0 && canNest(link.values[count - 1])) count--;
  while (count < link.values.length && !lineHolds(link, count)) count++;
  const values = link.values
    .slice(0, count)
    .map((value) =>
      isAtom(value) ? Link.escapeReference(value.id) : value.format()
    );
  if (link.id !== null) values.unshift(`${Link.escapeReference(link.id)}:`);
  return [
    pad + values.join(' '),
    ...link.values
      .slice(count)
      .flatMap((value) =>
        nestedLines(
          value,
          pad + indent,
          indent,
          underName || (link.id !== null && count === 0)
        )
      ),
  ];
}

/**
 * Write recursively nested lines. Read with Parser.parseGroups(), appending
 * each group's children to its element's values. Ordinary parse() retains
 * its path-expansion semantics. No final newline is added.
 * @param {Link[]} links - Links in document order
 * @param {string} [indent='  '] - Nonempty spaces for one indentation level
 * @returns {string} Nested Links Notation
 */
export function formatNested(links, indent = '  ') {
  if (typeof indent !== 'string' || !/^ +$/.test(indent)) {
    throw new TypeError('indent must contain only spaces and be nonempty');
  }
  return links.flatMap((link) => nestedLines(link, '', indent)).join('\n');
}
