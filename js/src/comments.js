/**
 * Comments, and the rule that decides where one starts.
 *
 * `#` starts a comment when it opens a token: at the start of the document or
 * after a space, a tab or a line break. A `#` written inside a token
 * (`issue#1047`) or inside a delimited reference (`"# not a comment"`) is an
 * ordinary character.
 *
 * {@link stripComments} replaces every character of every comment with a space
 * rather than removing it, so every later character keeps the offset it had in
 * the document the caller wrote, and a parse error still points at the position
 * the reader can see.
 */

import { DelimitedReferences, QUOTES, readReference } from './quotes.js';
import { referenceLiteralEnd } from './ReferenceLiteral.js';

/** The character that starts a comment. */
export const COMMENT = '#';

/**
 * What ends a bare reference. A token starts after one of these, at the start
 * of the document, and right after a delimited reference or a versioned
 * literal: the places the grammar reads a reference from.
 */
const SEPARATORS = [' ', '\t', '\n', '\r', '(', ':', ')'];

/** What a comment may start after. */
const BEFORE_COMMENT = [' ', '\t', '\n', '\r'];

/**
 * The document with every comment blanked out.
 *
 * The document is read token by token, the way the grammar reads it, so a `#`
 * inside a delimited reference that starts right after a group, another
 * reference or a literal is content, as it is in one that starts after a
 * space. References are read in the document as written, as the grammar
 * reads them.
 * @param {string} document - The document to read
 * @returns {string} The document, of the same length, without its comments
 * @example
 * stripComments('a: b # why\n'); // 'a: b      \n'
 * stripComments('"# kept"\n'); // '"# kept"\n'
 * stripComments('(a)" #kept"\n'); // '(a)" #kept"\n'
 * stripComments('issue#1047\n'); // 'issue#1047\n'
 */
export function stripComments(document) {
  // Split into UTF-16 units, the units the positions here and the positions a
  // parse error reports are both counted in.
  let blanked = null;
  let position = 0;
  // Whether a token may start at `position`.
  let tokenStart = true;
  const references = new DelimitedReferences(document);

  while (position < document.length) {
    const character = document[position];

    if (character === COMMENT && follows(document, position, BEFORE_COMMENT)) {
      blanked = blanked ?? document.split('');
      while (
        position < document.length &&
        document[position] !== '\n' &&
        document[position] !== '\r'
      ) {
        blanked[position] = ' ';
        position++;
      }
      continue;
    }

    if (SEPARATORS.includes(character)) {
      tokenStart = true;
      position++;
      continue;
    }

    if (tokenStart) {
      const end = delimitedTokenEnd(document, position, references);
      if (end !== null) {
        position = end;
        continue;
      }
    }

    // Anything else is part of a bare reference, which runs to a separator.
    tokenStart = false;
    position++;
  }

  return blanked === null ? document : blanked.join('');
}

/**
 * The position just past the delimited reference or versioned literal that
 * starts the token at `start`, or `null` when the token there is a bare
 * reference: a delimiter run that never closes is read as one, as the grammar
 * reads it.
 * @param {string} document - The document being read
 * @param {number} start - Position where a token starts
 * @param {DelimitedReferences} references - The references of the document
 * @returns {number|null} The position just past the token
 */
export function delimitedTokenEnd(document, start, references) {
  const literal = referenceLiteralEnd(document, start);
  if (literal !== -1) {
    return literal;
  }
  return QUOTES.includes(document[start]) ? references.endAt(start) : null;
}

/**
 * Whether the character before the given position is one the caller allows,
 * the start of the document counting as allowed.
 * @param {string} document - The document being read
 * @param {number} position - Position of the character being judged
 * @param {string[]} allowed - The characters that may stand before it
 * @returns {boolean} True when the position opens a token
 */
function follows(document, position, allowed) {
  return position === 0 || allowed.includes(document[position - 1]);
}

/**
 * The position just past the delimited reference that starts at `start`, or
 * `null` when nothing there opens one.
 *
 * This follows the same rules as the `parseQuotedStringAt` of the grammar: a
 * run of N delimiters closes at the next run of exactly N, a run of 2N is that
 * delimiter escaped, and an even run that encloses nothing substantive is the
 * empty reference.
 * @param {string} document - The document being read
 * @param {number} start - Position of the opening delimiter
 * @returns {number|null} The position just past the reference
 */
export function quotedReferenceEnd(document, start) {
  const reading = readReference(document, start);
  return reading === null ? null : start + reading.length;
}
