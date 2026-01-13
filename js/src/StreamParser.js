import { Link } from './Link.js';
import * as parserModule from './parser-generated.js';

/**
 * ParseError with detailed location information
 */
export class ParseError extends Error {
  /**
   * Create a new ParseError with location info
   * @param {string} message - Error message
   * @param {number} line - Line number (1-based)
   * @param {number} column - Column number (1-based)
   * @param {number} offset - Byte offset in the input
   */
  constructor(message, line = null, column = null, offset = null) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
    this.offset = offset;
  }

  /**
   * Create a formatted error message with location
   * @returns {string} Formatted error string
   */
  toString() {
    if (this.line !== null && this.column !== null) {
      return `ParseError at line ${this.line}, column ${this.column}: ${this.message}`;
    }
    return `ParseError: ${this.message}`;
  }
}

/**
 * Streaming parser for Links Notation (Lino)
 *
 * Allows processing data incrementally and emitting parsed links
 * as they become available, without loading the entire input into memory.
 *
 * @example
 * const parser = new StreamParser();
 *
 * parser.on('link', (link) => {
 *   console.log('Parsed link:', link);
 * });
 *
 * parser.on('error', (error) => {
 *   console.error(`Error at line ${error.line}: ${error.message}`);
 * });
 *
 * parser.write(chunk1);
 * parser.write(chunk2);
 * const links = parser.end();
 */
export class StreamParser {
  /**
   * Create a new StreamParser instance
   * @param {Object} options - Parser options
   * @param {number} options.maxInputSize - Maximum total input size in bytes (default: 10MB)
   * @param {number} options.maxDepth - Maximum nesting depth (default: 1000)
   */
  constructor(options = {}) {
    this.maxInputSize = options.maxInputSize || 10 * 1024 * 1024; // 10MB default
    this.maxDepth = options.maxDepth || 1000;

    // Buffer for incomplete input
    this._buffer = '';
    this._totalBytesReceived = 0;

    // Position tracking for error reporting
    this._currentLine = 1;
    this._currentColumn = 1;
    this._lineOffsets = [0]; // Byte offset where each line starts

    // Event handlers
    this._handlers = {
      link: [],
      error: [],
      end: []
    };

    // Parsed links
    this._links = [];

    // State
    this._ended = false;
  }

  /**
   * Register an event handler
   * @param {string} event - Event name ('link', 'error', or 'end')
   * @param {Function} handler - Handler function
   * @returns {StreamParser} This instance for chaining
   */
  on(event, handler) {
    if (this._handlers[event]) {
      this._handlers[event].push(handler);
    }
    return this;
  }

  /**
   * Remove an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler function to remove
   * @returns {StreamParser} This instance for chaining
   */
  off(event, handler) {
    if (this._handlers[event]) {
      const index = this._handlers[event].indexOf(handler);
      if (index !== -1) {
        this._handlers[event].splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Emit an event to all registered handlers
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  _emit(event, data) {
    if (this._handlers[event]) {
      for (const handler of this._handlers[event]) {
        try {
          handler(data);
        } catch (e) {
          // Handler errors shouldn't break the parser
          if (event !== 'error') {
            this._emit('error', new ParseError(`Handler error: ${e.message}`));
          }
        }
      }
    }
  }

  /**
   * Update position tracking based on processed text
   * @param {string} text - Text that was processed
   * @private
   */
  _updatePosition(text) {
    for (const char of text) {
      if (char === '\n') {
        this._currentLine++;
        this._currentColumn = 1;
        this._lineOffsets.push(this._totalBytesReceived);
      } else {
        this._currentColumn++;
      }
      this._totalBytesReceived++;
    }
  }

  /**
   * Calculate line and column from byte offset
   * @param {number} offset - Byte offset
   * @returns {{line: number, column: number}} Position
   * @private
   */
  _getPositionFromOffset(offset) {
    let line = 1;
    for (let i = 0; i < this._lineOffsets.length; i++) {
      if (this._lineOffsets[i] > offset) {
        break;
      }
      line = i + 1;
    }
    const lineStart = this._lineOffsets[line - 1] || 0;
    const column = offset - lineStart + 1;
    return { line, column };
  }

  /**
   * Write a chunk of data to the parser
   * @param {string} chunk - Data chunk to process
   * @returns {StreamParser} This instance for chaining
   * @throws {Error} If parser has ended or input exceeds max size
   */
  write(chunk) {
    if (this._ended) {
      throw new Error('Cannot write to a parser that has ended');
    }

    if (typeof chunk !== 'string') {
      throw new TypeError('Chunk must be a string');
    }

    // Check total size
    if (this._buffer.length + chunk.length > this.maxInputSize) {
      const error = new ParseError(
        `Input size exceeds maximum allowed size of ${this.maxInputSize} bytes`,
        this._currentLine,
        this._currentColumn
      );
      this._emit('error', error);
      throw error;
    }

    this._buffer += chunk;

    // Try to parse complete lines/elements
    this._processBuffer();

    return this;
  }

  /**
   * Process buffered data and emit links for complete elements
   * @private
   */
  _processBuffer() {
    // For streaming, we need to identify complete top-level elements
    // A complete element is one where we have seen the end of the line
    // and any subsequent lines are at a lower or equal indentation level

    // Find the last position where we can safely parse
    // This is tricky because we need to handle:
    // 1. Multiline parenthesized elements: (...)
    // 2. Indented elements: id:\n  value1\n  value2
    // 3. Single-line elements: id: value1 value2

    const safePoint = this._findSafeParsePoint();

    if (safePoint > 0) {
      const toParse = this._buffer.slice(0, safePoint);
      this._buffer = this._buffer.slice(safePoint);

      this._parseAndEmit(toParse);
    }
  }

  /**
   * Find the last safe point to parse (end of a complete top-level element)
   * @returns {number} Byte offset where we can safely parse up to
   * @private
   */
  _findSafeParsePoint() {
    const buffer = this._buffer;

    // We can't parse incomplete data
    if (buffer.length === 0) {
      return 0;
    }

    // Look for complete lines that form complete top-level elements
    // A top-level element ends when:
    // 1. We see a line at base indentation (or start of new top-level element)
    // 2. We have a complete parenthesized expression

    let lastSafePoint = 0;
    let i = 0;
    let inParentheses = 0;
    let baseIndentation = null;
    let currentIndentation = 0;
    let lineStart = 0;
    let inQuote = false;
    let quoteChar = null;
    let quoteCount = 0;

    while (i < buffer.length) {
      const char = buffer[i];

      // Track quote state for proper parsing
      if (!inQuote && (char === '"' || char === "'" || char === '`')) {
        // Count consecutive quotes
        quoteChar = char;
        quoteCount = 0;
        let j = i;
        while (j < buffer.length && buffer[j] === quoteChar) {
          quoteCount++;
          j++;
        }
        if (quoteCount > 0) {
          inQuote = true;
          i = j;
          continue;
        }
      } else if (inQuote && char === quoteChar) {
        // Check for closing quotes
        let count = 0;
        let j = i;
        while (j < buffer.length && buffer[j] === quoteChar) {
          count++;
          j++;
        }
        // Check if this is an escape (2*N) or close (N)
        if (count === quoteCount * 2) {
          // Escape sequence - skip
          i = j;
          continue;
        } else if (count >= quoteCount) {
          // Closing quote
          inQuote = false;
          quoteChar = null;
          i += quoteCount;
          continue;
        }
      }

      if (inQuote) {
        i++;
        continue;
      }

      // Track parentheses
      if (char === '(') {
        inParentheses++;
      } else if (char === ')') {
        inParentheses--;
      }

      // Track line boundaries and indentation
      if (char === '\n') {
        // Check if this ends a complete top-level element
        if (inParentheses === 0) {
          // Check indentation of next line
          let nextIndent = 0;
          let j = i + 1;
          while (j < buffer.length && buffer[j] === ' ') {
            nextIndent++;
            j++;
          }

          // Check if we have content on next line
          if (j < buffer.length && buffer[j] !== '\n' && buffer[j] !== '\r') {
            // First non-empty line sets base indentation
            if (baseIndentation === null && lineStart === 0) {
              // Find first content line's indentation
              let firstContentIndent = 0;
              let k = 0;
              while (k < buffer.length && buffer[k] === ' ') {
                firstContentIndent++;
                k++;
              }
              baseIndentation = firstContentIndent;
            }

            // If next line is at base indentation and we're not waiting for indented children
            // this could be a new top-level element
            const normalizedNext = baseIndentation !== null ? Math.max(0, nextIndent - baseIndentation) : nextIndent;

            if (normalizedNext === 0) {
              // This line boundary is a safe parse point
              lastSafePoint = i + 1;
            }
          }
        }

        lineStart = i + 1;
        currentIndentation = 0;
      } else if (i === lineStart && char === ' ') {
        currentIndentation++;
      }

      i++;
    }

    // If buffer ends with newline and no unclosed parens, it's safe
    if (buffer.endsWith('\n') && inParentheses === 0 && !inQuote) {
      lastSafePoint = buffer.length;
    }

    return lastSafePoint;
  }

  /**
   * Parse text and emit resulting links
   * @param {string} text - Text to parse
   * @private
   */
  _parseAndEmit(text) {
    if (!text.trim()) {
      this._updatePosition(text);
      return;
    }

    try {
      const rawResult = parserModule.parse(text);
      const links = this._transformResult(rawResult);

      for (const link of links) {
        this._links.push(link);
        this._emit('link', link);
      }
    } catch (error) {
      // Extract location from Peggy error
      let line = this._currentLine;
      let column = this._currentColumn;
      let offset = null;

      if (error.location) {
        line = this._currentLine + error.location.start.line - 1;
        column = error.location.start.line === 1
          ? this._currentColumn + error.location.start.column - 1
          : error.location.start.column;
        offset = error.location.start.offset;
      }

      const parseError = new ParseError(error.message, line, column, offset);
      parseError.cause = error;
      this._emit('error', parseError);
    }

    this._updatePosition(text);
  }

  /**
   * Transform raw parse result into Link objects
   * @param {*} rawResult - Raw parser output
   * @returns {Link[]} Array of Link objects
   * @private
   */
  _transformResult(rawResult) {
    const links = [];
    const items = Array.isArray(rawResult) ? rawResult : [rawResult];

    for (const item of items) {
      if (item !== null && item !== undefined) {
        this._collectLinks(item, [], links);
      }
    }
    return links;
  }

  /**
   * Collect links from parse tree
   * @private
   */
  _collectLinks(item, parentPath, result) {
    if (item === null || item === undefined) return;

    if (item.children && item.children.length > 0) {
      if (item.id && (!item.values || item.values.length === 0)) {
        const childValues = item.children.map((child) => {
          if (child.values && child.values.length === 1) {
            return this._transformLink(child.values[0]);
          }
          return this._transformLink(child);
        });
        const linkWithChildren = {
          id: item.id,
          values: childValues,
        };
        const currentLink = this._transformLink(linkWithChildren);

        if (parentPath.length === 0) {
          result.push(currentLink);
        } else {
          result.push(this._combinePathElements(parentPath, currentLink));
        }
      } else {
        const currentLink = this._transformLink(item);

        if (parentPath.length === 0) {
          result.push(currentLink);
        } else {
          result.push(this._combinePathElements(parentPath, currentLink));
        }

        const newPath = [...parentPath, currentLink];

        for (const child of item.children) {
          this._collectLinks(child, newPath, result);
        }
      }
    } else {
      const currentLink = this._transformLink(item);

      if (parentPath.length === 0) {
        result.push(currentLink);
      } else {
        result.push(this._combinePathElements(parentPath, currentLink));
      }
    }
  }

  /**
   * Combine path elements with current link
   * @private
   */
  _combinePathElements(pathElements, current) {
    if (pathElements.length === 0) return current;
    if (pathElements.length === 1) {
      const combined = new Link(null, [pathElements[0], current]);
      combined._isFromPathCombination = true;
      return combined;
    }

    const parentPath = pathElements.slice(0, -1);
    const lastElement = pathElements[pathElements.length - 1];
    let parent = this._combinePathElements(parentPath, lastElement);
    const combined = new Link(null, [parent, current]);
    combined._isFromPathCombination = true;
    return combined;
  }

  /**
   * Transform a parsed item into a Link object
   * @private
   */
  _transformLink(item) {
    if (item === null || item === undefined) return null;

    if (item instanceof Link) {
      return item;
    }

    if (item.id !== undefined && !item.values && !item.children) {
      return new Link(item.id);
    }

    if (item.values && Array.isArray(item.values)) {
      const link = new Link(item.id || null, []);
      link.values = item.values.map((v) => this._transformLink(v));
      return link;
    }

    return new Link(item.id || null, []);
  }

  /**
   * Signal end of input and finish parsing
   * @returns {Link[]} All parsed links
   * @throws {ParseError} If there's remaining unparseable content
   */
  end() {
    if (this._ended) {
      return this._links;
    }

    this._ended = true;

    // Parse any remaining buffered content
    if (this._buffer.trim()) {
      this._parseAndEmit(this._buffer);
      this._buffer = '';
    }

    this._emit('end', this._links);

    return this._links;
  }

  /**
   * Reset the parser for reuse
   * @returns {StreamParser} This instance for chaining
   */
  reset() {
    this._buffer = '';
    this._totalBytesReceived = 0;
    this._currentLine = 1;
    this._currentColumn = 1;
    this._lineOffsets = [0];
    this._links = [];
    this._ended = false;
    return this;
  }

  /**
   * Get all links parsed so far
   * @returns {Link[]} Array of parsed links
   */
  getLinks() {
    return this._links.slice();
  }

  /**
   * Get current parser position
   * @returns {{line: number, column: number, offset: number}} Current position
   */
  getPosition() {
    return {
      line: this._currentLine,
      column: this._currentColumn,
      offset: this._totalBytesReceived
    };
  }

  /**
   * Check if the parser has ended
   * @returns {boolean} True if ended
   */
  isEnded() {
    return this._ended;
  }
}
