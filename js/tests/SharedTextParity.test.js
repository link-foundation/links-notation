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

test('shared text parity', () => {
  for (const fixture of fixtures) {
    const parsed = new Parser().parse(fixture.input);
    expect(tree(parsed), fixture.id).toEqual(fixture.expected);
    expect(formatLinks(parsed), fixture.id).toBe(fixture.format);
    expect(tree(new Parser().parse(fixture.format)), fixture.id).toEqual(
      fixture.expected
    );
    const stream = new StreamParser();
    for (const character of fixture.input) stream.write(character);
    expect(tree(stream.end()), fixture.id).toEqual(fixture.expected);
  }
});
