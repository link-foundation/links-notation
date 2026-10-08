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
