import { test, expect } from "bun:test";
import { Parser } from "../src/Parser.js";
import { formatLinks } from "../src/Link.js";

const parser = new Parser();

test("Basic indented ID syntax", () => {
  const indentedSyntax = `3:
  papa
  loves
  mama`;

  const inlineSyntax = "(3: papa loves mama)";

  const indentedResult = parser.parse(indentedSyntax);
  const inlineResult = parser.parse(inlineSyntax);

  // Both should produce identical structures
  expect(indentedResult).toEqual(inlineResult);

  // Both should format to the same inline syntax
  expect(formatLinks(indentedResult)).toBe("(3: papa loves mama)");
  expect(formatLinks(inlineResult)).toBe("(3: papa loves mama)");
});

test("Indented ID syntax with single value", () => {
  const input = `greeting:
  hello`;

  const result = parser.parse(input);
  const formatted = formatLinks(result);

  expect(formatted).toBe("(greeting: hello)");
  expect(result.length).toBe(1);
  expect(result[0].id).toBe("greeting");
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe("hello");
});

test("Indented ID syntax with multiple values", () => {
  const input = `action:
  run
  fast
  now`;

  const result = parser.parse(input);
  const formatted = formatLinks(result);

  expect(formatted).toBe("(action: run fast now)");
  expect(result.length).toBe(1);
  expect(result[0].id).toBe("action");
  expect(result[0].values.length).toBe(3);
});

test("Indented ID syntax with numeric ID", () => {
  const input = `42:
  answer
  to
  everything`;

  const result = parser.parse(input);
  const formatted = formatLinks(result);

  expect(formatted).toBe("(42: answer to everything)");
});

test("Indented ID syntax with quoted ID", () => {
  const input = `"complex id":
  value1
  value2`;

  const result = parser.parse(input);
  const formatted = formatLinks(result);

  expect(formatted).toBe("('complex id': value1 value2)");
});

test("Multiple indented ID links", () => {
  const input = `first:
  a
  b
second:
  c
  d`;

  const result = parser.parse(input);
  const formatted = formatLinks(result);

  expect(result.length).toBe(2);
  expect(formatted).toBe("(first: a b)\n(second: c d)");
});

test("Mixed indented and regular syntax", () => {
  const input = `first:
  a
  b
(second: c d)
third value`;

  const result = parser.parse(input);
  expect(result.length).toBe(3);

  const formatted = formatLinks(result);
  expect(formatted).toContain("(first: a b)");
  expect(formatted).toContain("(second: c d)");
  expect(formatted).toContain("third value");
});

test("Unsupported colon-only syntax should fail", () => {
  const input = `:
  papa
  loves
  mama`;

  expect(() => {
    parser.parse(input);
  }).toThrow();
});

test("Indented ID with deeper nesting", () => {
  const input = `root:
  child1
  child2
    grandchild`;

  // This should work but the grandchild will be processed as a separate nested structure
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);

  // The root should have child1 and child2 as values
  const rootLink = result[0];
  expect(rootLink.id).toBe("root");
  expect(rootLink.values.length).toBe(2);
});

test("Empty indented ID should work", () => {
  const input = "empty:";

  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe("empty");
  expect(result[0].values.length).toBe(0);

  const formatted = formatLinks(result);
  expect(formatted).toBe("(empty)");
});

test("Equivalence test comprehensive", () => {
  const testCases = [
    {
      indented: "test:\n  one",
      inline: "(test: one)",
    },
    {
      indented: "x:\n  a\n  b\n  c",
      inline: "(x: a b c)",
    },
    {
      indented: '"quoted":\n  value',
      inline: '("quoted": value)',
    },
  ];

  for (const testCase of testCases) {
    const indentedResult = parser.parse(testCase.indented);
    const inlineResult = parser.parse(testCase.inline);

    expect(indentedResult).toEqual(inlineResult);
    expect(formatLinks(indentedResult)).toBe(formatLinks(inlineResult));
  }
});
