import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';

test('Nested self-referenced object in pair value', () => {
  // Test case from PARSER_BUG.md
  // This should parse a dict with two pairs, where the second pair's value
  // is itself a self-referenced dict definition (obj_1: dict ...)
  const notation =
    '(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))';

  const parser = new Parser();
  const links = parser.parse(notation);

  // Should parse exactly one top-level link
  expect(links.length).toBe(1);

  const link = links[0];

  // Top-level link should have ID "obj_0"
  expect(link.id).toBe('obj_0');

  // Should have: type marker + 2 pairs = 3 values
  expect(link.values.length).toBe(3);

  // First value is the type marker "dict"
  expect(link.values[0].id).toBe('dict');

  // Second and third values are the two pairs
  const pair1 = link.values[1];
  const pair2 = link.values[2];

  // Pair 1: ((str bmFtZQ==) (str ZGljdDE=))
  // This is a parenthesized expression containing two sub-expressions
  expect(pair1.id).toBe(null);
  expect(pair1.values.length).toBe(2);

  // First element of pair1: (str bmFtZQ==)
  expect(pair1.values[0].id).toBe(null);
  expect(pair1.values[0].values.length).toBe(2); // "str" and "bmFtZQ=="
  expect(pair1.values[0].values[0].id).toBe('str');
  expect(pair1.values[0].values[1].id).toBe('bmFtZQ==');

  // Second element of pair1: (str ZGljdDE=)
  expect(pair1.values[1].id).toBe(null);
  expect(pair1.values[1].values.length).toBe(2); // "str" and "ZGljdDE="
  expect(pair1.values[1].values[0].id).toBe('str');
  expect(pair1.values[1].values[1].id).toBe('ZGljdDE=');

  // Pair 2: ((str b3RoZXI=) (obj_1: dict ...))
  // This is the critical test - the second element should be a self-referenced dict
  expect(pair2.id).toBe(null);
  expect(pair2.values.length).toBe(2);

  // First element of pair2: (str b3RoZXI=)
  expect(pair2.values[0].id).toBe(null);
  expect(pair2.values[0].values.length).toBe(2);
  expect(pair2.values[0].values[0].id).toBe('str');
  expect(pair2.values[0].values[1].id).toBe('b3RoZXI=');

  // Second element of pair2: (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))
  // THIS IS THE KEY TEST - obj_1 should have its ID preserved
  const obj1 = pair2.values[1];
  expect(obj1.id).toBe('obj_1'); // This is the self-reference ID
  expect(obj1.values).toBeTruthy(); // Should have nested values (dict definition)
  expect(obj1.values.length).toBe(3); // type marker + 2 pairs

  // obj_1's type marker
  expect(obj1.values[0].id).toBe('dict');

  // obj_1's first pair: ((str bmFtZQ==) (str ZGljdDI=))
  const obj1_pair1 = obj1.values[1];
  expect(obj1_pair1.values.length).toBe(2);
  expect(obj1_pair1.values[0].values[0].id).toBe('str');
  expect(obj1_pair1.values[0].values[1].id).toBe('bmFtZQ==');
  expect(obj1_pair1.values[1].values[0].id).toBe('str');
  expect(obj1_pair1.values[1].values[1].id).toBe('ZGljdDI=');

  // obj_1's second pair: ((str b3RoZXI=) obj_0) - reference back to obj_0
  const obj1_pair2 = obj1.values[2];
  expect(obj1_pair2.values.length).toBe(2);
  expect(obj1_pair2.values[0].values[0].id).toBe('str');
  expect(obj1_pair2.values[0].values[1].id).toBe('b3RoZXI=');
  expect(obj1_pair2.values[1].id).toBe('obj_0'); // Reference to obj_0
  expect(obj1_pair2.values[1].values).toEqual([]); // Just a reference, no nested values
});

test('Self-reference as direct child works correctly', () => {
  // This pattern should work (and did work before)
  const notation =
    '(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))';

  const parser = new Parser();
  const links = parser.parse(notation);

  expect(links.length).toBe(1);
  expect(links[0].id).toBe('obj_0');
  expect(links[0].values.length).toBe(4); // list + 1 + 2 + obj_1

  // The fourth value should be obj_1 with a self-reference
  const obj1 = links[0].values[3];
  expect(obj1.id).toBe('obj_1');
  expect(obj1.values.length).toBe(4); // list + 3 + 4 + obj_0
  expect(obj1.values[3].id).toBe('obj_0'); // Reference back to obj_0
});
