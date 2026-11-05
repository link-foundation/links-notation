// Bounded check of the contract in issue 379: every link that reads back from
// format() must also read back from format(true) and from FormatOptions.
// Enumerates every tree up to depth 2 with at most 2 values per link, over the
// ids null, a plain one and one that needs quotes. Usage: bun <this file>
import { Parser, FormatOptions, Link } from '../../js/src/index.js';

const ids = [null, 'a', 'x y'];
function shapes(depth) {
  const result = ids.map((id) => new Link(id, []));
  if (depth === 0) return result;
  const smaller = shapes(depth - 1);
  for (const id of ids) {
    for (const one of smaller) result.push(new Link(id, [one]));
    for (const one of smaller) for (const two of smaller) result.push(new Link(id, [one, two]));
  }
  return result;
}
const parser = new Parser();
const reads = (link, text) => {
  try {
    const links = parser.parse(text);
    return links.length === 1 && links[0].equals(link);
  } catch {
    return false;
  }
};
const options = new FormatOptions({ lessParentheses: true });
const seen = shapes(2);
let defaultOk = 0;
const broken = [];
for (const link of seen) {
  if (!reads(link, link.format())) continue;
  defaultOk += 1;
  for (const text of [link.format(true), link.format(options)])
    if (!reads(link, text)) broken.push([link.format(), text]);
}
console.log(`${seen.length} shapes, ${defaultOk} read back from format(), ${broken.length} lost under lessParentheses`);
for (const [a, b] of broken.slice(0, 20)) console.log(' ', a, '->', b);
process.exitCode = broken.length ? 1 : 0;
