import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { expect, test } from 'bun:test';
import { Parser, StreamParser, formatLinks } from '../src/index.js';

const fixtures = JSON.parse(
  readFileSync(
    new URL('../../parity/text-fixtures.json', import.meta.url),
    'utf8'
  )
);
const tree = (links) =>
  links.map((link) => ({ id: link.id, values: tree(link.values) }));

for (const fixture of fixtures) {
  test(`shared text parity: ${fixture.id}`, () => {
    const parsed = new Parser().parse(fixture.input);
    expect(tree(parsed)).toEqual(fixture.expected);
    expect(formatLinks(parsed)).toBe(fixture.format);
    expect(tree(new Parser().parse(fixture.format))).toEqual(fixture.expected);
    const stream = new StreamParser();
    for (const character of fixture.input) stream.write(character);
    expect(tree(stream.end())).toEqual(fixture.expected);
  });
}
