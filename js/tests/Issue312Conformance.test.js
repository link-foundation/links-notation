import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';

const parser = new Parser();

function render(node) {
  if (!node.values || node.values.length === 0) {
    return `<${node.id ?? ''}>`;
  }
  const head =
    node.id === null || node.id === undefined ? '' : `<${node.id}>: `;
  return `(${head}${node.values.map(render).join(' ')})`;
}

function parsesAs(source) {
  return parser.parse(source).map(render).join('\n');
}

test('CR is a line break', () => {
  expect(parsesAs('a\rb')).toBe('(<a>)\n(<b>)');
  expect(parsesAs('a\r\nb')).toBe('(<a>)\n(<b>)');
});

test('only grammar whitespace makes an empty document', () => {
  expect(parsesAs(' \t\n\r')).toBe('');
  for (const character of ['\u0085', '\u00a0', '\u2028', '\u3000', '\ufeff']) {
    expect(parsesAs(character)).toBe(`(<${character}>)`);
  }
});

test('Unicode spaces are substantive even quote bodies', () => {
  for (const character of ['\u0085', '\u00a0', '\u2028', '\u3000', '\ufeff']) {
    expect(parsesAs(`''${character}''`)).toBe(`(<${character}>)`);
  }
});

test('trailing indentation is document whitespace', () => {
  expect(parsesAs('a\n  ')).toBe('(<a>)');
  expect(parsesAs('a\n  \t')).toBe('(<a>)');
});

test('a single reference is a link value at every depth', () => {
  expect(parsesAs('1')).toBe('(<1>)');
  expect(parsesAs('(1)')).toBe('(<1>)');
  expect(parsesAs('((1))')).toBe('((<1>))');
});
