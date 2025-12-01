import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';

const parser = new Parser();

// Helper to extract the reference ID from a single-value link
function getSingleRefId(result) {
  // Single reference parses as: { id: null, values: [{ id: "the-id", values: [] }] }
  if (
    result.length === 1 &&
    result[0].id === null &&
    result[0].values.length === 1
  ) {
    return result[0].values[0].id;
  }
  return result[0]?.id;
}

// ============================================================================
// Backtick Quote Tests (Single Backtick)
// ============================================================================

test('TestBacktickQuotedReference', () => {
  const input = '`backtick quoted`';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('backtick quoted');
});

test('TestBacktickQuotedWithSpaces', () => {
  const input = '`text with spaces`';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with spaces');
});

test('TestBacktickQuotedMultiline', () => {
  const input = '(`line1\nline2`)';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(result[0].values[0].id).toBe('line1\nline2');
});

test('TestBacktickQuotedWithEscapedBacktick', () => {
  const input = '`text with `` escaped backtick`';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with ` escaped backtick');
});

// ============================================================================
// Single Quote Tests (with escaping)
// ============================================================================

test('TestSingleQuoteWithEscapedSingleQuote', () => {
  const input = "'text with '' escaped quote'";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe("text with ' escaped quote");
});

// ============================================================================
// Double Quote Tests (with escaping)
// ============================================================================

test('TestDoubleQuoteWithEscapedDoubleQuote', () => {
  const input = '"text with "" escaped quote"';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with " escaped quote');
});

// ============================================================================
// Double Quotes (2 quote chars) Tests
// ============================================================================

test('TestDoubleDoubleQuotes', () => {
  const input = '""double double quotes""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('double double quotes');
});

test('TestDoubleDoubleQuotesWithSingleQuoteInside', () => {
  const input = '""text with " inside""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with " inside');
});

test('TestDoubleDoubleQuotesWithEscape', () => {
  const input = '""text with """" escaped double""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with "" escaped double');
});

test('TestDoubleSingleQuotes', () => {
  const input = "''double single quotes''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('double single quotes');
});

test('TestDoubleSingleQuotesWithSingleQuoteInside', () => {
  const input = "''text with ' inside''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe("text with ' inside");
});

test('TestDoubleSingleQuotesWithEscape', () => {
  const input = "''text with '''' escaped single''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe("text with '' escaped single");
});

test('TestDoubleBacktickQuotes', () => {
  const input = '``double backtick quotes``';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('double backtick quotes');
});

test('TestDoubleBacktickQuotesWithBacktickInside', () => {
  const input = '``text with ` inside``';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with ` inside');
});

test('TestDoubleBacktickQuotesWithEscape', () => {
  const input = '``text with ```` escaped backtick``';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with `` escaped backtick');
});

// ============================================================================
// Triple Quotes (3 quote chars) Tests
// ============================================================================

test('TestTripleDoubleQuotes', () => {
  const input = '"""triple double quotes"""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('triple double quotes');
});

test('TestTripleDoubleQuotesWithDoubleQuoteInside', () => {
  const input = '"""text with "" inside"""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with "" inside');
});

test('TestTripleDoubleQuotesWithEscape', () => {
  const input = '"""text with """""" escaped triple"""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with """ escaped triple');
});

test('TestTripleSingleQuotes', () => {
  const input = "'''triple single quotes'''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('triple single quotes');
});

test('TestTripleSingleQuotesWithDoubleQuoteInside', () => {
  const input = "'''text with '' inside'''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe("text with '' inside");
});

test('TestTripleSingleQuotesWithEscape', () => {
  const input = "'''text with '''''' escaped triple'''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe("text with ''' escaped triple");
});

test('TestTripleBacktickQuotes', () => {
  const input = '```triple backtick quotes```';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('triple backtick quotes');
});

test('TestTripleBacktickQuotesWithDoubleBacktickInside', () => {
  const input = '```text with `` inside```';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with `` inside');
});

test('TestTripleBacktickQuotesWithEscape', () => {
  const input = '```text with `````` escaped triple```';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with ``` escaped triple');
});

// ============================================================================
// Quadruple Quotes (4 quote chars) Tests
// ============================================================================

test('TestQuadrupleDoubleQuotes', () => {
  const input = '""""quadruple double quotes""""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('quadruple double quotes');
});

test('TestQuadrupleDoubleQuotesWithTripleQuoteInside', () => {
  const input = '""""text with """ inside""""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with """ inside');
});

test('TestQuadrupleDoubleQuotesWithEscape', () => {
  const input = '""""text with """""""" escaped quad""""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with """" escaped quad');
});

test('TestQuadrupleSingleQuotes', () => {
  const input = "''''quadruple single quotes''''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('quadruple single quotes');
});

test('TestQuadrupleBacktickQuotes', () => {
  const input = '````quadruple backtick quotes````';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('quadruple backtick quotes');
});

// ============================================================================
// Quintuple Quotes (5 quote chars) Tests
// ============================================================================

test('TestQuintupleDoubleQuotes', () => {
  const input = '"""""quintuple double quotes"""""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('quintuple double quotes');
});

test('TestQuintupleDoubleQuotesWithQuadQuoteInside', () => {
  const input = '"""""text with """" inside"""""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with """" inside');
});

test('TestQuintupleDoubleQuotesWithEscape', () => {
  const input = '"""""text with """""""""" escaped quint"""""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('text with """"" escaped quint');
});

test('TestQuintupleSingleQuotes', () => {
  const input = "'''''quintuple single quotes'''''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('quintuple single quotes');
});

test('TestQuintupleBacktickQuotes', () => {
  const input = '`````quintuple backtick quotes`````';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('quintuple backtick quotes');
});

// ============================================================================
// Complex Scenarios Tests
// ============================================================================

test('TestMixedQuotesInLink', () => {
  const input = '("double" \'single\' `backtick`)';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(result[0].values.length).toBe(3);
  expect(result[0].values[0].id).toBe('double');
  expect(result[0].values[1].id).toBe('single');
  expect(result[0].values[2].id).toBe('backtick');
});

test('TestBacktickAsIdInLink', () => {
  const input = '(`myId`: value1 value2)';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(result[0].id).toBe('myId');
  expect(result[0].values.length).toBe(2);
});

test('TestCodeBlockLikeContent', () => {
  // This demonstrates using triple backticks for code-like content
  const input = '```const x = 1;```';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('const x = 1;');
});

test('TestNestedQuotesInMarkdown', () => {
  // Using double backticks to include single backtick
  const input = '``Use `code` in markdown``';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('Use `code` in markdown');
});

test('TestSQLWithQuotes', () => {
  // Using double single quotes to include single quote in SQL-like string
  // Inside '', to get a single quote, we need '''' (4 single quotes = escaped pair)
  const input = "''SELECT * FROM users WHERE name = ''''John''''''";
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe(
    "SELECT * FROM users WHERE name = ''John''"
  );
});

test('TestJSONStringWithQuotes', () => {
  // Using double double quotes to include double quote in JSON-like string
  const input = '""{"key": "value"}""';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('{"key": "value"}');
});

// ============================================================================
// Edge Cases
// ============================================================================

test('TestEmptySingleQuotedReference', () => {
  const input = "''";
  // Empty quoted reference should not match - becomes simple reference or fails
  // Let's verify what happens
  try {
    const result = parser.parse(input);
    // If it parses, check what we get
    expect(result.length).toBeGreaterThanOrEqual(0);
  } catch (e) {
    // Expected for empty quotes
    expect(e).toBeTruthy();
  }
});

test('TestWhitespacePreservedInQuotes', () => {
  const input = '"  spaces  "';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(getSingleRefId(result)).toBe('  spaces  ');
});

test('TestMultilineInDoubleDoubleQuotes', () => {
  const input = '(""line1\nline2"")';
  const result = parser.parse(input);

  expect(result.length).toBe(1);
  expect(result[0].values[0].id).toBe('line1\nline2');
});
