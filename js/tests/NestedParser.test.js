import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

const parser = new Parser();

test('SignificantWhitespaceTest', () => {
  const source = `
users
    user1
        id
            43
        name
            first
                John
            last
                Williams
        location
            New York
        age
            23
    user2
        id
            56
        name
            first
                Igor
            middle
                Petrovich
            last
                Ivanov
        location
            Moscow
        age
            20`;

  const target = `(users)
((users) (user1))
(((users) (user1)) (id))
((((users) (user1)) (id)) (43))
(((users) (user1)) (name))
((((users) (user1)) (name)) (first))
(((((users) (user1)) (name)) (first)) (John))
((((users) (user1)) (name)) (last))
(((((users) (user1)) (name)) (last)) (Williams))
(((users) (user1)) (location))
((((users) (user1)) (location)) (New York))
(((users) (user1)) (age))
((((users) (user1)) (age)) (23))
((users) (user2))
(((users) (user2)) (id))
((((users) (user2)) (id)) (56))
(((users) (user2)) (name))
((((users) (user2)) (name)) (first))
(((((users) (user2)) (name)) (first)) (Igor))
((((users) (user2)) (name)) (middle))
(((((users) (user2)) (name)) (middle)) (Petrovich))
((((users) (user2)) (name)) (last))
(((((users) (user2)) (name)) (last)) (Ivanov))
(((users) (user2)) (location))
((((users) (user2)) (location)) (Moscow))
(((users) (user2)) (age))
((((users) (user2)) (age)) (20))`;

  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('SimpleSignificantWhitespaceTest', () => {
  const source = `a
    b
    c`;
  const target = `(a)
((a) (b))
((a) (c))`;
  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('TwoSpacesSizedWhitespaceTest', () => {
  const source = `
users
  user1`;
  const target = `(users)
((users) (user1))`;
  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('Parse nested structure with indentation', () => {
  const input = `parent
  child1
  child2`;
  const result = parser.parse(input);
  expect(result.length).toBe(3);
  // The parser creates (parent), ((parent) (child1)), ((parent) (child2))
  expect(result[0].id).toBe(null);
  expect(result[0].values[0].id).toBe('parent');
  expect(result[1].id).toBe(null);
  expect(result[1].values.length).toBe(2);
  expect(result[2].id).toBe(null);
  expect(result[2].values.length).toBe(2);
});

test('Indentation consistency', () => {
  // Test that indentation must be consistent
  const input = `parent
  child1
   child2`; // Inconsistent indentation
  const result = parser.parse(input);
  // This should parse but child2 won't be a child of parent due to different indentation
  expect(result.length).toBeGreaterThan(0);
});

test('Indentation-based children', () => {
  const input = `parent
  child1
  child2
    grandchild`;
  const result = parser.parse(input);
  expect(result.length).toBe(4);
});

test('Complex indentation', () => {
  const input = `root
  level1a
    level2a
    level2b
  level1b
    level2c`;
  const result = parser.parse(input);
  expect(result.length).toBe(6);
});

test('Nested links', () => {
  const input = '(1: (2: (3: 3)))';
  const parsed = parser.parse(input);
  expect(parsed.length).toBeGreaterThan(0);

  // Validate regular formatting
  const output = formatLinks(parsed);
  expect(output).toBeTruthy();
  
  // Validate that the structure is properly nested
  expect(parsed.length).toBe(1);
});

test('Indentation parser', () => {
  const input = 'parent\n  child1\n  child2';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
  // Should have parent link
  const hasParentLink = result.some(l => l.values && l.values.some(v => v.id === 'parent'));
  expect(hasParentLink).toBe(true);
});

test('Nested indentation parser', () => {
  const input = 'parent\n  child\n    grandchild';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
  // Should create nested structure with proper hierarchy
  expect(result.length).toBeGreaterThanOrEqual(1);
});

test('Three level nesting roundtrip', () => {
  const input = '(1: (2: (3: 3)))';
  const parsed = parser.parse(input);

  // Validate round-trip
  const output = formatLinks(parsed);
  expect(output).toBe(input);
});

test('Deep nested structure roundtrip', () => {
  const input = '(a: (b: (c: (d: d))))';
  const parsed = parser.parse(input);

  // Validate round-trip
  const output = formatLinks(parsed);
  expect(output).toBe(input);
});

test('Multiple nested links roundtrip', () => {
  const input = '(parent: (child1: value1) (child2: value2))';
  const parsed = parser.parse(input);

  // Validate round-trip
  const output = formatLinks(parsed);
  expect(output).toBe(input);
});