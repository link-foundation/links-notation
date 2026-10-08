import { QUOTES, readReference } from './quotes.js';

/**
 * Quote one reference. Minimal mode allows ordinary single-space prose on a
 * document line; token formatting still quotes spaces by default.
 * @param {string|null|undefined} reference
 * @param {{minimal?: boolean}} options
 * @returns {string}
 */
export function escapeReference(reference, { minimal = false } = {}) {
  if (reference === null || reference === undefined) return '';
  if (typeof reference !== 'string') {
    throw new TypeError('Reference must be a string');
  }
  if (reference === '') return '""';

  const needsQuoting =
    /[:()'"`\t\n\r]/.test(reference) ||
    (minimal
      ? /(^ | $| {2,}|(^| )#)/.test(reference)
      : reference.includes(' ') || reference.startsWith('#'));
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
  if (!QUOTES.includes(reference[0])) return reference;
  const reading = readReference(reference, 0);
  if (reading === null || reading.length !== reference.length) {
    throw new SyntaxError('Expected one complete quoted reference');
  }
  return reading.value;
}
