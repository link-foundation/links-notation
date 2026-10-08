/* global TextEncoder, TextDecoder */

/** Detect the reserved versioned-literal prefix at a reference boundary. */
export function hasReferenceLiteralPrefix(text, start = 0) {
  return /^~[0-9]+\{/.test(text.slice(start));
}

/** Encode exact Unicode text as a version 1 UTF-8 hexadecimal reference. */
export function encodeReferenceLiteral(text) {
  if (typeof text !== 'string' || !text.isWellFormed()) {
    throw new TypeError('Reference must be well-formed Unicode text');
  }
  const hex = Array.from(new TextEncoder().encode(text), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  return `~1{${hex}}`;
}

/** Decode a complete versioned literal, rejecting malformed bytes and versions. */
export function decodeReferenceLiteral(literal) {
  const match = /^~([0-9]+)\{([0-9a-fA-F]*)\}$/.exec(literal);
  if (
    !match ||
    match[0] !== literal ||
    match[1] !== '1' ||
    match[2].length % 2 !== 0
  ) {
    throw new TypeError(
      'Invalid or unsupported reference literal (expected ~1{UTF-8 hex})'
    );
  }
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
    Uint8Array.from(match[2].match(/../g) ?? [], (hex) => parseInt(hex, 16))
  );
}

/** Use readable legacy quoting where possible and a literal for empty/control text. */
export function formatReference(text) {
  if (typeof text !== 'string' || !text.isWellFormed()) {
    throw new TypeError('Reference must be well-formed Unicode text');
  }
  if (!text || /[\u0000-\u001f\u007f]/u.test(text)) {
    return encodeReferenceLiteral(text);
  }
  if (
    !text.startsWith('#') &&
    !/^~[0-9]+\{/.test(text) &&
    !/[\p{White_Space}\ufeff():"'`]/u.test(text)
  ) {
    return text;
  }
  let choice = null;
  for (const quote of ["'", '"', '`']) {
    if (text.startsWith(quote)) continue;
    let longest = 0;
    let run = 0;
    for (const character of text) {
      run = character === quote ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    const count = (longest + 1) | 1;
    if (choice === null || count < choice.count) choice = { quote, count };
  }
  const delimiter = choice.quote.repeat(choice.count);
  return delimiter + text + delimiter;
}
