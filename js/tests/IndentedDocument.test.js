import { readFileSync } from 'node:fs';
import { test, expect } from 'bun:test';
import * as lino from '../src/index.js';

const { Link, LinksGroup, Parser, ParseError } = lino;

test('mixed quotes round-trip through the existing Link formatter', () => {
  const text = 'He said "it\'s ready"';
  const formatted = new Link(text).toString();
  expect(new Parser().parse(formatted)[0].values[0].id).toBe(text);
  expect(formatted).not.toContain("\\'");
  expect(lino.escapeReference(text, { minimal: true })).toBe(
    "'He said \"it''s ready\"'"
  );
});

test('minimal escaping leaves ordinary prose unquoted', () => {
  expect(
    Link.escapeReference('What is your experience?', { minimal: true })
  ).toBe('What is your experience?');
  expect(Link.escapeReference('What is your experience?')).toBe(
    "'What is your experience?'"
  );
});

test('public groups preserve immediate children and deeper indentation', () => {
  const groups = new Parser().parseGroups(
    'What is your experience?\n  JavaScript\n  Python\n    Django\nOther question\n  Answer'
  );
  expect(groups).toHaveLength(2);
  expect(groups[0]).toBeInstanceOf(LinksGroup);
  expect(groups[0].element.values.map((value) => value.id)).toEqual([
    'What',
    'is',
    'your',
    'experience?',
  ]);
  expect(groups[0].children).toHaveLength(2);
  expect(groups[0].children[1].children[0].element.values[0].id).toBe('Django');
  expect(groups[1].children[0].element.values[0].id).toBe('Answer');
});

test('groups retain named and nested links and share parser diagnostics', () => {
  const parser = new Parser();
  const [root] = parser.parseGroups(
    'root:\n  child: (one two)\n  branch\n    leaf'
  );
  expect(root.element.id).toBe('root');
  expect(root.element.values).toEqual([]);
  expect(root.children[0].element.toString()).toBe('(child: (one two))');
  expect(root.children[1].children).toHaveLength(1);
  expect(() => parser.parseGroups('root: child: value')).toThrow(ParseError);
  expect(() =>
    new Parser({ maxDepth: 0 }).parseGroups('root\n  child')
  ).toThrow(ParseError);
  expect(() => new Parser({ maxInputSize: 2 }).parseGroups('root')).toThrow(
    'Input size exceeds'
  );
  expect(() => parser.parseGroups(null)).toThrow(TypeError);
});

test('parse the issue document without inspecting private path flags', () => {
  const input = `What is your experience?
  I have worked with JavaScript
'Question with "quotes": and colon'
  Answer
`;
  expect(lino.parseIndentedDocument(input)).toEqual(
    new Map([
      ['What is your experience?', 'I have worked with JavaScript'],
      ['Question with "quotes": and colon', 'Answer'],
    ])
  );
});

test('multiple child lines have explicit array or joined-text behavior', () => {
  const input = 'Skills\n  JavaScript\n  Python\nUnanswered\nSkills\n  Go';
  expect(lino.parseIndentedDocument(input)).toEqual(
    new Map([
      ['Skills', ['JavaScript', 'Python', 'Go']],
      ['Unanswered', []],
    ])
  );
  expect(lino.parseIndentedDocument(input, { multipleValues: 'join' })).toEqual(
    new Map([
      ['Skills', 'JavaScript\nPython\nGo'],
      ['Unanswered', []],
    ])
  );
  expect(() =>
    lino.parseIndentedDocument(input, { multipleValues: 'guess' })
  ).toThrow(TypeError);
});

test('format the issue document with two-space indentation and a final newline', () => {
  const entries = new Map([
    ['What is your experience?', 'I have worked with JavaScript'],
    ['Skills', ['JavaScript', 'Python']],
  ]);
  expect(lino.formatIndentedDocument(entries)).toBe(
    'What is your experience?\n  I have worked with JavaScript\nSkills\n  JavaScript\n  Python\n'
  );
  expect(
    lino.parseIndentedDocument(lino.formatIndentedDocument(entries))
  ).toEqual(entries);
  expect(lino.formatIndentedDocument(new Map())).toBe('');
  expect(lino.parseIndentedDocument('')).toEqual(new Map());
});

test('empty text, exact whitespace, comments, quotes, and multiline text survive', () => {
  const references = [
    '',
    ' ',
    '  leading',
    'trailing  ',
    'two  spaces',
    'a\tb',
    '# question',
    'text # literal',
    'issue#333',
    'Question: (details)',
    '`backticks`',
    '"double" and \'single\'',
    '\'starts with both "quotes"',
    "\"starts with both 'quotes'",
    'ends with both \'"',
    'repeated \'\'\' and """',
    "literal \\n and \\'",
    'line one\n  line two',
    'carriage\rreturn',
    'Windows\r\nline',
    'Привет 🌍',
  ];
  for (const text of references) {
    const escaped = lino.escapeReference(text, { minimal: true });
    expect(lino.unescapeReference(escaped)).toBe(text);
    expect(Link.unescapeReference(escaped)).toBe(text);
    const entries = new Map([[text, text]]);
    expect(
      lino.parseIndentedDocument(lino.formatIndentedDocument(entries))
    ).toEqual(entries);
  }
});

test('unescaping uses the grammar and never decodes already parsed IDs again', () => {
  expect(lino.unescapeReference('"He said ""hello"""')).toBe('He said "hello"');
  expect(lino.unescapeReference("'it''s ready'")).toBe("it's ready");
  expect(lino.unescapeReference('``text with ` inside``')).toBe(
    'text with ` inside'
  );
  expect(lino.unescapeReference('plain text')).toBe('plain text');
  expect(lino.unescapeReference('literal \\n')).toBe('literal \\n');
  expect(() => lino.unescapeReference('"unfinished')).toThrow(SyntaxError);
  expect(() => lino.unescapeReference('"value" extra')).toThrow(SyntaxError);
  expect(lino.parseIndentedDocument('Question\n  "two \'\' quotes"')).toEqual(
    new Map([['Question', "two '' quotes"]])
  );
});

test('document helpers reject deeper or named value structures instead of losing data', () => {
  expect(() =>
    lino.parseIndentedDocument('Question\n  Answer\n    Detail')
  ).toThrow(TypeError);
  expect(() => lino.parseIndentedDocument('Question\n  answer: value')).toThrow(
    TypeError
  );
  expect(() =>
    lino.formatIndentedDocument(new Map([['Question', 42]]))
  ).toThrow(TypeError);
  expect(() => lino.formatIndentedDocument(new Map([[42, 'Answer']]))).toThrow(
    TypeError
  );
  expect(() =>
    lino.formatIndentedDocument(new Map([['Question', ['ok', null]]]))
  ).toThrow(TypeError);
});

test('document parsing respects comments and existing parser options', () => {
  expect(
    lino.parseIndentedDocument('# comment\nQuestion\n  Answer # comment')
  ).toEqual(new Map([['Question', 'Answer']]));
  expect(
    lino.parseIndentedDocument('# question\n  Answer', { comments: false })
  ).toEqual(new Map([['# question', 'Answer']]));
});

test('one-element arrays normalize to strings and unanswered parents remain distinct', () => {
  const entries = new Map([
    ['One option', ['only']],
    ['No options', []],
    ['Empty answer', ''],
  ]);
  expect(
    lino.parseIndentedDocument(lino.formatIndentedDocument(entries))
  ).toEqual(
    new Map([
      ['One option', 'only'],
      ['No options', []],
      ['Empty answer', ''],
    ])
  );
  expect(() =>
    lino.formatIndentedDocument(new Map([['Question', Array(1)]]))
  ).toThrow(TypeError);
});

test('document helpers preserve the shared Unicode reference corpus and reserved prefixes', () => {
  const references = readFileSync(
    new globalThis.URL(
      '../../docs/protocol/reference-literals.txt',
      import.meta.url
    ),
    'utf8'
  )
    .trim()
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .map((hex) =>
      hex === '-' ? '' : Buffer.from(hex, 'hex').toString('utf8')
    );
  for (const text of [
    ...references,
    '~1{61}',
    '~2{00}',
    '~1{invalid}',
    'text ~1{61} after',
    'text ~2{00}',
    'text ~1{invalid}',
  ]) {
    expect(lino.escapeReference(text)).toBe(lino.formatBinaryReference(text));
    expect(lino.unescapeReference(lino.escapeReference(text))).toBe(text);
    expect(
      lino.unescapeReference(lino.escapeReference(text, { minimal: true }))
    ).toBe(text);
    const entries = new Map([[text, text]]);
    expect(
      lino.parseIndentedDocument(lino.formatIndentedDocument(entries))
    ).toEqual(entries);
  }
});

test('unescaping decodes versioned literals without decoding parsed document IDs twice', () => {
  expect(lino.unescapeReference('~1{}')).toBe('');
  expect(Link.unescapeReference('~1{00}')).toBe('\0');
  expect(lino.unescapeReference('~1{C3A9}')).toBe('é');
  for (const literal of ['~2{61}', '~1{0}', '~1{gg}', '~1{ff}']) {
    expect(() => lino.unescapeReference(literal)).toThrow();
  }
  const entries = new Map([['~1{61}', '~1{62}']]);
  expect(
    lino.parseIndentedDocument(lino.formatIndentedDocument(entries))
  ).toEqual(entries);
  expect(() => lino.escapeReference('\ud800', { minimal: true })).toThrow(
    TypeError
  );
});
