import { test, expect } from 'bun:test';
import { Link } from '../src/Link.js';

test('Link constructor with id only', () => {
  const link = new Link('test');
  expect(link.id).toBe('test');
  expect(link.values).toEqual([]);
});

test('Link constructor with id and values', () => {
  const link = new Link('parent', [new Link('child1'), new Link('child2')]);
  expect(link.id).toBe('parent');
  expect(link.values.length).toBe(2);
  expect(link.values[0].id).toBe('child1');
  expect(link.values[1].id).toBe('child2');
});

test('Link toString with id only', () => {
  const link = new Link('test');
  expect(link.toString()).toBe('(test)');
});

test('Link toString with values only', () => {
  const link = new Link(null, [new Link('value1'), new Link('value2')]);
  expect(link.toString()).toBe('(value1 value2)');
});

test('Link toString with id and values', () => {
  const link = new Link('parent', [new Link('child1'), new Link('child2')]);
  expect(link.toString()).toBe('(parent: child1 child2)');
});

test('Link escapeReference simple', () => {
  expect(Link.escapeReference('simple')).toBe('simple');
});

test('Link escapeReference with special characters', () => {
  expect(Link.escapeReference('has:colon')).toBe("'has:colon'");
  expect(Link.escapeReference('has space')).toBe("'has space'");
  expect(Link.escapeReference('has(paren)')).toBe("'has(paren)'");
  expect(Link.escapeReference('has"quote')).toBe('\'has"quote\'');
  expect(Link.escapeReference("has'quote")).toBe('"has\'quote"');
});

test('Link simplify', () => {
  const link = new Link(null, [new Link('single')]);
  const simplified = link.simplify();
  expect(simplified.id).toBe('single');
  expect(simplified.values).toEqual([]);
});

test('Link combine', () => {
  const link1 = new Link('first');
  const link2 = new Link('second');
  const combined = link1.combine(link2);
  expect(combined.id).toBe(null);
  expect(combined.values.length).toBe(2);
  expect(combined.values[0].id).toBe('first');
  expect(combined.values[1].id).toBe('second');
});

test('Link equals', () => {
  const link1 = new Link('test', [new Link('child')]);
  const link2 = new Link('test', [new Link('child')]);
  const link3 = new Link('different', [new Link('child')]);

  expect(link1.equals(link2)).toBe(true);
  expect(link1.equals(link3)).toBe(false);
});
