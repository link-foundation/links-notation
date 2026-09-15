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

/** The character that starts a comment. */
export const COMMENT = '#';

/** The delimiters a reference can be written between. */
const QUOTES = ['"', "'", '`'];

/** What a delimited reference may start after. */
const BEFORE_REFERENCE = [' ', '\t', '\n', '\r', '(', ':'];

/** What a comment may start after. */
const BEFORE_COMMENT = [' ', '\t', '\n', '\r'];

/**
 * The document with every comment blanked out.
 * @param {string} document - The document to read
 * @returns {string} The document, of the same length, without its comments
 * @example
 * stripComments('a: b # why\n'); // 'a: b      \n'
 * stripComments('"# kept"\n'); // '"# kept"\n'
 * stripComments('issue#1047\n'); // 'issue#1047\n'
 */
export function stripComments(document) {
  // Split into UTF-16 units, the units the positions here and the positions a
  // parse error reports are both counted in.
  let blanked = null;
  let position = 0;

  while (position < document.length) {
    const character = document[position];

    if (
      QUOTES.includes(character) &&
      follows(document, position, BEFORE_REFERENCE)
    ) {
      const end = quotedReferenceEnd(document, position);
      position = end === null ? position + 1 : end;
      continue;
    }

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

    position++;
  }

  return blanked === null ? document : blanked.join('');
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
  const quote = document[start];
  if (!QUOTES.includes(quote)) {
    return null;
  }

  let position = start;
  while (position < document.length && document[position] === quote) {
    position++;
  }
  const count = position - start;
  const isEvenRun = count % 2 === 0;
  const emptyReference = isEvenRun ? start + count : null;

  const closing = quote.repeat(count);
  const escape = quote.repeat(count * 2);
  let content = '';

  while (position < document.length) {
    if (document.startsWith(escape, position)) {
      content += closing;
      position += escape.length;
      continue;
    }

    if (document.startsWith(closing, position)) {
      const afterClosing = position + count;
      if (afterClosing >= document.length || document[afterClosing] !== quote) {
        if (isEvenRun && !isSubstantiveBody(content)) {
          return emptyReference;
        }
        return afterClosing;
      }
    }

    content += document[position];
    position++;
  }

  return emptyReference;
}

/**
 * Whether a body written between an even run of delimiters carries something a
 * pair of delimiters enclosing nothing cannot.
 * @param {string} content - The body between the delimiters
 * @returns {boolean} True when the n-quote reading is the one to take
 */
function isSubstantiveBody(content) {
  let depth = 0;
  let hasVisible = false;

  for (const character of content) {
    if (character === '(') {
      depth++;
    } else if (character === ')') {
      depth--;
      if (depth < 0) {
        return false;
      }
    }
    if (!/\s/.test(character)) {
      hasVisible = true;
    }
  }

  return hasVisible && depth === 0;
}
