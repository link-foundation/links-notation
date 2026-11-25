import { QUOTES, readReference } from './quotes.js';
import {
  decodeReferenceLiteral,
  formatReference,
  hasReferenceLiteralPrefix,
} from './ReferenceLiteral.js';

/**
 * Quote one reference. Minimal mode allows ordinary single-space prose on a
 * document line; token formatting still quotes spaces by default.
 * @param {string|null|undefined} reference
 * @param {{minimal?: boolean}} options
 * @returns {string}
 */
export function escapeReference(reference, { minimal = false } = {}) {
  if (reference === null || reference === undefined) return '';
  if (typeof reference !== 'string' || !reference.isWellFormed()) {
    throw new TypeError('Reference must be well-formed Unicode text');
  }
  // Keep ordinary Link formatting identical to binary text formatting. The
  // versioned literal also preserves empty strings and control characters in
  // minimal document lines, including exact line endings.
  if (!minimal || !reference || /[\u0000-\u001f\u007f]/u.test(reference)) {
    return formatReference(reference);
  }

  const needsQuoting =
    /(^| )~[0-9]+\{/.test(reference) ||
    /[:()'"`]|(?! )[\p{White_Space}\ufeff]/u.test(reference) ||
    /(^ | $| {2,}|(^| )#)/.test(reference);
  if (!needsQuoting) return reference;

  const singleQuotes = reference.split("'").length - 1;
  const doubleQuotes = reference.split('"').length - 1;
  let quote = singleQuotes <= doubleQuotes ? "'" : '"';

  // The opening delimiter must be a run of exactly one quote. Choosing the
  // other wrapper keeps a leading content quote from extending that run.
  if (reference.startsWith(quote)) quote = quote === "'" ? '"' : "'";
  return quote + reference.replaceAll(quote, quote + quote) + quote;
}

/**
 * Decode a complete, escaped reference using the parser's delimiter rules.
 * Plain text is returned unchanged. Parsed Link IDs are already decoded and
 * should not be passed through this function a second time.
 * @param {string} reference
 * @returns {string}
 */
export function unescapeReference(reference) {
  if (typeof reference !== 'string') {
    throw new TypeError('Reference must be a string');
  }
  if (hasReferenceLiteralPrefix(reference)) {
    return decodeReferenceLiteral(reference);
  }
  if (!QUOTES.includes(reference[0])) return reference;
  const reading = readReference(reference, 0);
  if (reading === null || reading.length !== reference.length) {
    throw new SyntaxError('Expected one complete quoted reference');
  }
  return reading.value;
}

/**
 * The delimiter a reference was written between, read from the reference as it
 * was written: `'`, `"` or `` ` `` for a quoted reference (however many of them
 * open it), and null for a bare reference, a versioned literal, or no text.
 * @param {string|null|undefined} raw - One reference exactly as written
 * @returns {string|null} The delimiter character, or null
 * @example
 * referenceQuote("'1'"); // "'"
 * referenceQuote('""a b""'); // '"'
 * referenceQuote('1'); // null
 * referenceQuote("'unclosed"); // null: a bare reference that starts with '
 */
export function referenceQuote(raw) {
  if (typeof raw !== 'string' || !QUOTES.includes(raw[0])) return null;
  const reading = readReference(raw, 0);
  return reading !== null && reading.length === raw.length ? raw[0] : null;
}

/**
 * Write one reference so that a parser reads it back as exactly this text, in
 * the ID or value position of any link: the name `escapeReference` gives the
 * same function to code that thinks in quoting rather than escaping. Text that
 * needs no delimiters is returned as it is; anything else is quoted, or written
 * as a versioned literal when it is empty or holds a control character.
 *
 * The answer is deliberately conservative, so the text also reads back with
 * releases older than the one that made bare `12:30` and `tag #release` legal
 * (issue #444): a colon, a whitespace character, a parenthesis, a quote, and a
 * `#` that starts the text still ask for quotes.
 * @param {string|null|undefined} reference - The text of one reference
 * @param {{minimal?: boolean}} [options] - As for {@link escapeReference}
 * @returns {string} The reference as it should be written
 * @example
 * quoteReference('plain'); // 'plain'
 * quoteReference('has space'); // "'has space'"
 * quoteReference('#release'); // "'#release'"
 * quoteReference(''); // '~1{}'
 */
export function quoteReference(reference, options = {}) {
  return escapeReference(reference, options);
}

/**
 * Whether one reference has to be quoted (or written as a versioned literal) to
 * read back as exactly this text, that is whether {@link quoteReference}
 * changes it.
 * @param {string} reference - The text of one reference
 * @param {{minimal?: boolean}} [options] - As for {@link escapeReference}
 * @returns {boolean} True when the text cannot be written bare
 * @example
 * needsQuoting('plain'); // false
 * needsQuoting('12:30'); // true
 * needsQuoting(''); // true
 */
export function needsQuoting(reference, options = {}) {
  if (typeof reference !== 'string') {
    throw new TypeError('Reference must be a string');
  }
  return quoteReference(reference, options) !== reference;
}
