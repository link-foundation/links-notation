import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { expect, test } from 'bun:test';
import { Parser, StreamParser } from '../src/index.js';

const read = (name) =>
  JSON.parse(
    readFileSync(new URL(`../../parity/${name}`, import.meta.url), 'utf8')
  );
const syntaxFixtures = read('syntax-fixtures.json');
const textFixtures = read('text-fixtures.json');
const tree = (links) =>
  links.map((link) => ({
    id: link.id,
    raw: link.rawId,
    quote: link.quote,
    values: tree(link.values),
  }));

test('shared syntax parity: raw references and concrete syntax trees', () => {
  for (const fixture of syntaxFixtures) {
    const parser = new Parser();
    expect(tree(parser.parse(fixture.input)), fixture.id).toEqual(
      fixture.links
    );
    const cst = parser.parseCst(fixture.input);
    expect(cst.toSExpression(), fixture.id).toBe(fixture.cst);
    expect(cst.toString(), fixture.id).toBe(fixture.input);
    const stream = new StreamParser();
    for (const character of fixture.input) stream.write(character);
    expect(tree(stream.end()), fixture.id).toEqual(fixture.links);
  }
});

test('every shared input is recovered exactly from its concrete syntax tree', () => {
  for (const { id, input } of [...textFixtures, ...syntaxFixtures]) {
    const cst = new Parser().parseCst(input);
    expect(cst.toString(), id).toBe(input);
    expect(
      cst
        .tokens()
        .map((token) => token.text)
        .join(''),
      id
    ).toBe(input);
  }
});
