/** The number of characters a quoted line is cut down to. */
const QUOTED_LINE_WIDTH = 80;

/** What a message writes in place of the part of a long line it left out. */
const ELLIPSIS = '...';

/**
 * The error thrown when a document does not parse, carrying the position the
 * parser stopped at.
 *
 * The generated parser reports that position, but only on the error object; the
 * message it writes says what it expected without saying where. This error puts
 * the line and the column in the message as well, and quotes the offending line
 * with a caret under it, the way the Rust and C# ports do.
 */
export class ParseError extends Error {
  /**
   * @param {string} input - The document that failed to parse
   * @param {Error} error - The error the generated parser threw
   */
  constructor(input, error) {
    const start = error?.location?.start ?? { offset: 0, line: 1, column: 1 };
    const lineText = lineAt(input, start.offset);
    const summary = `line ${start.line}, column ${start.column}: ${error.message}`;
    const snippet = quote(start.line, lineText, start.column);
    super(`Syntax error at ${summary}\n${snippet}`);

    this.name = 'ParseError';
    /** @type {Error} The error the generated parser threw */
    this.cause = error;
    /** @type {{start: {offset: number, line: number, column: number}}} */
    this.location = error.location;
    /** @type {number} Offset of the offending position from the start of the document */
    this.offset = start.offset;
    /** @type {number} Line the offending position is on, counted from 1 */
    this.line = start.line;
    /** @type {number} Column the offending position is at, counted from 1 */
    this.column = start.column;
    /** @type {string|null} The character found instead, or null at the end of the document */
    this.found = error.found ?? null;
    /** @type {string} The offending line, as written, without its line ending */
    this.lineText = lineText;
    /** @type {string} The offending line with a caret under the offending column */
    this.snippet = snippet;
  }
}

/**
 * The line the given offset falls on, without its line ending.
 * @param {string} input - The document being parsed
 * @param {number} offset - Offset of the offending position
 * @returns {string} The offending line
 */
function lineAt(input, offset) {
  const at = Math.max(0, Math.min(offset, input.length));
  const start = input.lastIndexOf('\n', at - 1) + 1;
  const end = input.indexOf('\n', start);
  const line = input.slice(start, end === -1 ? input.length : end);
  return line.endsWith('\r') ? line.slice(0, -1) : line;
}

/**
 * The offending line with a caret under the offending column, quoted the way a
 * compiler quotes source. A long line is shown as a window around the caret, so
 * the message stays the same size whether the document has ten lines or fifteen
 * hundred.
 * @param {number} number - The line number, counted from 1
 * @param {string} lineText - The offending line
 * @param {number} column - The offending column, counted from 1
 * @returns {string} The quoted line and the caret under it
 */
function quote(number, lineText, column) {
  const [quoted, at] = windowAround(lineText, column);
  const gutter = ' '.repeat(String(number).length);
  return `${number} | ${quoted}\n${gutter} | ${' '.repeat(at - 1)}^`;
}

/**
 * Cuts a line down to a window around the given column, and says which column
 * the offending character sits at in that window. Both columns count from 1.
 * @param {string} lineText - The offending line
 * @param {number} column - The offending column, counted from 1
 * @returns {[string, number]} The window and the column within it
 */
function windowAround(lineText, column) {
  if (lineText.length <= QUOTED_LINE_WIDTH) {
    return [lineText, column];
  }

  const target = column - 1;
  const lastStart = lineText.length - QUOTED_LINE_WIDTH;
  const start = Math.min(
    Math.max(target - Math.floor(QUOTED_LINE_WIDTH / 2), 0),
    lastStart
  );
  const end = start + QUOTED_LINE_WIDTH;

  const quoted =
    (start > 0 ? ELLIPSIS : '') +
    lineText.slice(start, end) +
    (end < lineText.length ? ELLIPSIS : '');
  const shift = start > 0 ? ELLIPSIS.length : 0;
  return [quoted, target - start + shift + 1];
}
