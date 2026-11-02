/**
 * The concrete syntax tree of a Links Notation document.
 *
 * Every character of a document belongs to exactly one token, so the text of
 * the tree is the document itself, comments, blank lines, indentation, quotes
 * and line endings included. A document is a list of `line` nodes; a line holds
 * the tokens up to and including its line ending, and a parenthesized `group`
 * node holds its own parentheses and the lines written between them. A group is
 * part of the line it opens on, however many lines it spans.
 *
 * The tree records how a document was written; `Parser.parse()` reads what it
 * means. They agree because a document is parsed before its tree is built, and
 * the tokens are read with the same rules the grammar uses: comments are found
 * by {@link stripComments}, delimited references by {@link DelimitedReferences}
 * and versioned literals by the same pattern.
 */

import { stripComments } from './comments.js';
import { DelimitedReferences, QUOTES } from './quotes.js';
import { decodeReferenceLiteral } from './ReferenceLiteral.js';

/** The kinds of nodes and tokens of a concrete syntax tree. */
export const CstKind = Object.freeze({
  /** The whole document: its lines. */
  DOCUMENT: 'document',
  /** One line: its tokens and groups, up to and including its line ending. */
  LINE: 'line',
  /** A parenthesized group: `(`, the lines inside it, and `)`. */
  GROUP: 'group',
  /** A run of spaces and tabs. */
  WHITESPACE: 'whitespace',
  /** One line ending: `\n`, `\r\n` or `\r`. */
  NEWLINE: 'newline',
  /** A comment, from `#` up to the line ending. */
  COMMENT: 'comment',
  /** `(` */
  OPEN_PAREN: 'open_paren',
  /** `)` */
  CLOSE_PAREN: 'close_paren',
  /** `:` */
  COLON: 'colon',
  /** A bare, quoted or versioned literal reference. */
  REFERENCE: 'reference',
});

const NODE_KINDS = new Set([CstKind.DOCUMENT, CstKind.LINE, CstKind.GROUP]);

/** One node or token of a concrete syntax tree. */
export class CstNode {
  #text;

  /**
   * @param {string} kind - One of {@link CstKind}
   * @param {Object} parts - The token's text, or the node's children
   * @param {string} [parts.text] - A token's text exactly as written
   * @param {CstNode[]} [parts.children] - A node's children
   * @param {string|null} [parts.value] - What a reference token means
   * @param {string|null} [parts.quote] - The delimiter of a quoted reference
   */
  constructor(
    kind,
    { text = '', children = [], value = null, quote = null } = {}
  ) {
    /** One of {@link CstKind}. */
    this.kind = kind;
    /** The children of a node, in document order; empty for a token. */
    this.children = children;
    /**
     * What a reference token means, its delimiters and escapes resolved (the
     * ID a parsed link has); null for every other node and token.
     */
    this.value = value;
    /**
     * The delimiter a quoted reference token was written between (`'`, `"` or
     * `` ` ``); null for a bare or literal reference and every other kind.
     */
    this.quote = quote;
    this.#text = text;
  }

  /** Whether this is a token rather than a node with children. */
  get isToken() {
    return !NODE_KINDS.has(this.kind);
  }

  /** The exact text this node or token was read from. */
  get text() {
    if (this.isToken) return this.#text;
    return this.children.map((child) => child.text).join('');
  }

  /** The exact text this node or token was read from. */
  toString() {
    return this.text;
  }

  /**
   * Every token of this subtree, in document order.
   * @returns {CstNode[]}
   */
  tokens() {
    if (this.isToken) return [this];
    return this.children.flatMap((child) => child.tokens());
  }

  /**
   * The tree as an S-expression: `(kind child ...)` for a node and
   * `kind:"text"` for a token, the text escaped as a JSON string would escape
   * `\`, `"`, line feeds, carriage returns and tabs. Two trees are the same
   * exactly when their S-expressions are.
   * @returns {string}
   * @example
   * new Parser().parseCst("a '1'").toSExpression();
   * // (document (line reference:"a" whitespace:" " reference:"'1'"))
   */
  toSExpression() {
    if (this.isToken) return `${this.kind}:${quoteText(this.#text)}`;
    return `(${[this.kind, ...this.children.map((child) => child.toSExpression())].join(' ')})`;
  }
}

const ESCAPES = {
  '\\': '\\\\',
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

function quoteText(text) {
  return `"${text.replace(/[\\"\n\r\t]/g, (character) => ESCAPES[character])}"`;
}

/** What a versioned literal's payload cannot contain. */
const LITERAL_PAYLOAD_END = new Set(['}', ' ', '\t', '\r', '\n', '(', ')']);

/**
 * Where the versioned literal `~<digits>{<payload>}` that starts at `start`
 * ends, or -1 if none starts there. A single forward scan, so it stays linear
 * on any input (a regular expression here was flagged as a ReDoS risk).
 */
function literalEnd(text, start) {
  if (text[start] !== '~') return -1;
  let index = start + 1;
  while (index < text.length && text[index] >= '0' && text[index] <= '9') {
    index++;
  }
  if (index === start + 1 || text[index] !== '{') return -1;
  index++;
  while (index < text.length && !LITERAL_PAYLOAD_END.has(text[index])) {
    index++;
  }
  return text[index] === '}' ? index + 1 : -1;
}

/** What ends a bare reference. */
const BARE_REFERENCE_END = new Set([' ', '\t', '\r', '\n', '(', ':', ')']);

/**
 * The concrete syntax tree of a document that has already been parsed.
 * @param {string} input - The document as written
 * @param {Object} options
 * @param {boolean} [options.comments=true] - Whether `#` starts a comment
 * @returns {CstNode} The `document` node
 */
export function buildCst(input, { comments = true } = {}) {
  // References are read in the document the grammar reads: the one with its
  // comments blanked, which keeps every position of the one written.
  const prepared = comments ? stripComments(input) : input;
  const references = new DelimitedReferences(prepared);
  const document = new CstNode(CstKind.DOCUMENT);
  // The open containers, innermost last, each with the line being filled.
  const containers = [{ node: document, line: null }];

  const add = (token) => {
    const container = containers[containers.length - 1];
    if (container.line === null) {
      container.line = new CstNode(CstKind.LINE);
      container.node.children.push(container.line);
    }
    container.line.children.push(token);
  };
  const token = (kind, start, end, parts = {}) =>
    new CstNode(kind, { text: input.slice(start, end), ...parts });

  let position = 0;
  while (position < input.length) {
    const character = input[position];
    let end = position + 1;

    if (comments && character === '#' && prepared[position] !== '#') {
      // A blanked `#` opens a comment, which runs to the line ending.
      while (end < input.length && input[end] !== '\n' && input[end] !== '\r') {
        end++;
      }
      add(token(CstKind.COMMENT, position, end));
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && input[end] === '\n') end++;
      add(token(CstKind.NEWLINE, position, end));
      containers[containers.length - 1].line = null;
    } else if (character === ' ' || character === '\t') {
      while (
        end < input.length &&
        (input[end] === ' ' || input[end] === '\t')
      ) {
        end++;
      }
      add(token(CstKind.WHITESPACE, position, end));
    } else if (character === '(') {
      const group = new CstNode(CstKind.GROUP, {
        children: [token(CstKind.OPEN_PAREN, position, end)],
      });
      add(group);
      containers.push({ node: group, line: null });
    } else if (character === ')') {
      if (containers.length === 1) {
        throw new SyntaxError(`Unbalanced ")" at offset ${position}`);
      }
      containers
        .pop()
        .node.children.push(token(CstKind.CLOSE_PAREN, position, end));
    } else if (character === ':') {
      add(token(CstKind.COLON, position, end));
    } else {
      end = referenceEnd(prepared, position, references);
      const text = input.slice(position, end);
      const quoted = QUOTES.includes(character) && references.readAt(position);
      add(
        token(CstKind.REFERENCE, position, end, {
          value: quoted
            ? quoted.value
            : character === '~' && isLiteral(prepared, position, end)
              ? decodeReferenceLiteral(text)
              : text,
          quote: quoted ? character : null,
        })
      );
    }
    position = end;
  }

  if (containers.length !== 1) {
    throw new SyntaxError('Unbalanced "(" at the end of the document');
  }
  return document;
}

/** Where the reference that starts at `start` ends, read as the grammar reads it. */
function referenceEnd(prepared, start, references) {
  const literal = literalEnd(prepared, start);
  if (literal !== -1) return literal;
  if (QUOTES.includes(prepared[start])) {
    const end = references.endAt(start);
    if (end !== null) return end;
  }
  let end = start + 1;
  while (end < prepared.length && !BARE_REFERENCE_END.has(prepared[end])) end++;
  return end;
}

function isLiteral(prepared, start, end) {
  return literalEnd(prepared, start) === end;
}
